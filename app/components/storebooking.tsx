import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, FlatList, Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Icon } from "react-native-paper";
import { useGetAvailabilityQuery, useGetStoreForUsersQuery, useGetWorkingHoursByTargetQuery } from "../store/api";
import { ChairSlotDto } from "../types";
import { getBarberTypeName } from "../utils/barber-type";
import FilterChip from "../components/filter-chip";
import { fmtDateOnly, build7Days, normalizeTime, addMinutesToHHmm, areHourlyContiguous } from "../utils/time-helper";

const toLocalIso = (dateStr: string, hhmm: string) => `${dateStr}T${normalizeTime(hhmm)}:00`;
interface Props {
    storeId: string;
    isBottomSheet?: boolean;
    isFreeBarber?: boolean;
    isCustomer?: boolean;
}

const StoreBookingContent = ({ storeId, isBottomSheet = false, isFreeBarber = false, isCustomer = false }: Props) => {
    // store header info
    const { data: storeData } = useGetStoreForUsersQuery(storeId, { skip: !storeId });
    const { data: workingHours } = useGetWorkingHoursByTargetQuery(storeId, { skip: !storeId });
    const router = useRouter();


    // day selection
    const days = useMemo(() => build7Days(), []);
    const [selectedDateOnly, setSelectedDateOnly] = useState(() => fmtDateOnly(days[0]));
    const onChangeDay = useCallback((d: string) => {
        setSelectedDateOnly(d);
        setSelectedChairId(null);
        setSelectedSlotKeys([]);
    }, []);

    const normalizeDow = (dow: number) => {
        if (dow === 7) return 0;
        return dow;
    };

    const closedByDow = useMemo(() => {
        const map = new Map<number, boolean>();
        (workingHours ?? []).forEach(w => {
            const dow = normalizeDow(Number(w.dayOfWeek));
            map.set(dow, !!w.isClosed);
        });
        return map;
    }, [workingHours]);

    const isDayClosed = (d: Date) => {
        const jsDow = d.getDay();
        return closedByDow.get(jsDow) === true;
    };

    const [selectedChairId, setSelectedChairId] = useState<string | null>(null);
    const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]); // "HH:mm"
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const toggleService = useCallback((id: string) => {
        setSelectedServices(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    }, []);
    const { data, isFetching, isLoading, refetch } = useGetAvailabilityQuery({
        storeId,
        dateOnly: selectedDateOnly,
    });

    const chairs: ChairSlotDto[] = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray((data as any).data)) return (data as any).data;
        return [];
    }, [data]);

    useEffect(() => {
        if (!selectedChairId && chairs.length > 0) setSelectedChairId(chairs[0].chairId);
    }, [chairs, selectedChairId]);

    const selectedChair = useMemo(
        () => chairs.find((c) => c.chairId === selectedChairId) ?? null,
        [chairs, selectedChairId]
    );

    useEffect(() => {
        setSelectedSlotKeys([]);
    }, [selectedChairId]);


    const onToggleSlot = useCallback((slot: { start: string }, isBooked: boolean, isPast: boolean) => {
        if (isBooked || isPast) return;
        const key = normalizeTime(slot.start); // "HH:mm"

        setSelectedSlotKeys((prev) => {
            if (prev.includes(key)) return prev.filter((k) => k !== key); // remove

            const next = [...prev, key];
            if (!areHourlyContiguous(next)) {
                Alert.alert("Uyarı", "Sadece art arda (boşluksuz) saatleri seçebilirsin.");
                return prev;
            }
            return next;
        });
    }, []);

    const startHHmm = useMemo(() => {
        if (selectedSlotKeys.length === 0) return null;
        return [...selectedSlotKeys].sort()[0];
    }, [selectedSlotKeys]);

    const endHHmm = useMemo(() => {
        if (!startHHmm) return null;
        return addMinutesToHHmm(startHHmm, selectedSlotKeys.length * 60);
    }, [startHHmm, selectedSlotKeys.length]);

    const pricingValue = useMemo(() => Number(storeData?.pricingValue ?? 0), [storeData?.pricingValue]);
    const pricingTypeKey = useMemo(() => {
        const pt: any = storeData?.pricingType;
        if (typeof pt === "string") return pt.toLowerCase();
        return "unknown";
    }, [storeData?.pricingType]);

    const isHourlyFree = isFreeBarber && pricingTypeKey === "rent";
    const isPercentFree = isFreeBarber && pricingTypeKey === "percent";

    const totalPrice = useMemo(() => {
        const servicesTotal =
            (storeData?.serviceOfferings ?? [])
                .filter(x => selectedServices.includes(x.id))
                .reduce((sum, x) => sum + Number(x.price ?? 0), 0);

        if (isHourlyFree) {
            return Number((pricingValue * selectedSlotKeys.length).toFixed(2));
        }
        if (isPercentFree) {
            return Number((servicesTotal * (pricingValue / 100)).toFixed(2));
        }
        return Number(servicesTotal.toFixed(2));
    }, [storeData?.serviceOfferings, selectedServices, isHourlyFree, isPercentFree, pricingValue, selectedSlotKeys.length,]);

    const canSubmit = useMemo(() => {
        const baseReady = !!selectedChairId && selectedSlotKeys.length > 0;

        if (isHourlyFree) return baseReady;

        return baseReady && selectedServices.length > 0;
    }, [selectedChairId, selectedSlotKeys.length, selectedServices.length, isHourlyFree]);

    return (
        <>
            <View className="relative">
                <Image
                    source={{ uri: storeData?.imageList?.[0]?.imageUrl || "https://picsum.photos/900/600" }}
                    className="w-full h-[250px]"
                    resizeMode="cover"
                />
                <View className="absolute top-0 left-0 right-0 bottom-0 bg-black opacity-50" />
                <View className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-shrink flex-wrap gap-2 flex-row">
                            <Text className="font-ibm-plex-sans-regular text-white" numberOfLines={1} style={{ fontSize: 24 }}>
                                {storeData?.storeName ?? "İşletme"}
                            </Text>
                            <View className="flex-row items-center gap-2 mt-1">
                                <Icon size={20} color={storeData?.type === 0 ? "#60a5fa" : "#f472b6"} source={storeData?.type === 0 ? "face-man" : "face-woman"} />
                                <Text className="text-white font-ibm-plex-sans-regular" style={{ fontSize: 15 }}>
                                    - {getBarberTypeName(storeData?.type!)}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center mt-2 gap-1">
                            <Icon size={20} color="#FFA500" source="star" />
                            <Text className="font-ibm-plex-sans-regular text-white" style={{ fontSize: 15 }}>
                                {Number(storeData?.rating ?? 0).toFixed(1)}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2 mt-2">
                        <Icon size={20} color="#FFA500" source="map-marker" />
                        <Text className="font-ibm-plex-sans-regular flex-shrink text-white" numberOfLines={1} style={{ fontSize: 15 }}>
                            {storeData?.addressDescription ?? "Adres"}
                        </Text>
                    </View>
                </View>
                {!isBottomSheet && (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="absolute top-9 left-5 z-10 rounded-[40px] p-3"
                        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                    >
                        <Icon source="chevron-left" size={25} color="white" />
                    </TouchableOpacity>
                )}

            </View>

            <ScrollView>
                <View className="p-4 z-0 gap-3">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-white font-ibm-plex-sans-regular mt-3 text-xl">Randevu Al</Text>
                    </View>

                    {/* DAYS */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-3">
                            {days.map((d) => {
                                const key = fmtDateOnly(d);
                                const active = key === selectedDateOnly;
                                const disabled = isDayClosed(d);
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        disabled={disabled}
                                        onPress={() => onChangeDay(key)}
                                        className={`px-3 py-2 rounded-xl ${disabled ? "bg-gray-800 opacity-40" : active ? "bg-green-500" : "bg-gray-800"}`}
                                    >
                                        <View className="flex-row gap-2">
                                            <Text className={`text-sm ${disabled ? "text-gray-500" : active ? "text-white" : "text-gray-300"}`}>{key}</Text>
                                            {disabled ? <Text className="text-xs text-gray-500 mt-1">Kapalı</Text> : null}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                    {(isLoading || (isFetching && !data)) && (
                        <View className="py-10">
                            <ActivityIndicator />
                        </View>
                    )}
                    {chairs.length === 0 ? (
                        <Text className="text-gray-400">Bu gün için koltuk/slot bulunamadı.</Text>
                    ) : (
                        <FlatList
                            horizontal
                            data={chairs}
                            keyExtractor={(c) => c.chairId}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 10 }}
                            renderItem={({ item: c }) => {
                                const isSelected = c.chairId === selectedChairId;
                                const title = c.barberId == null ? c.chairName : c.barberName;
                                const rating = c.barberRating != null ? Number(c.barberRating).toFixed(1) : "0.0";

                                return (
                                    <FilterChip
                                        itemKey={c.chairId}
                                        selected={isSelected}
                                        onPress={() => setSelectedChairId(c.chairId)}
                                        className={`items-center w-[120px] px-2 py-2 rounded-xl ${isSelected ? "bg-green-500" : "bg-gray-800"}`}
                                        icon={<Icon source="seat" size={30} color="white" />}
                                    >
                                        <View className="items-center">
                                            <Text className="text-white font-ibm-plex-sans-regular" numberOfLines={1}>
                                                {title ?? "Koltuk"}
                                            </Text>
                                            <View className="flex-row items-center gap-1">
                                                <Icon size={14} source="star" color={isSelected ? "white" : "orange"} />
                                                <Text className="text-white text-xs">{rating}</Text>
                                            </View>
                                        </View>
                                    </FilterChip>
                                );
                            }}
                        />
                    )}

                    {!selectedChair ? (
                        <Text className="text-gray-400">Önce koltuk seç.</Text>
                    ) : (
                        <FlatList
                            horizontal
                            data={selectedChair.slots}
                            keyExtractor={(s) => String(s.slotId)}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 10 }}
                            renderItem={({ item: s }) => {
                                const isBooked = s.isBooked;
                                const isPast = s.isPast;
                                const key = normalizeTime(s.start);
                                const isSelected = selectedSlotKeys.includes(key);
                                return (
                                    <FilterChip
                                        itemKey={String(s.slotId)}
                                        selected={isSelected}
                                        isDisabled={isBooked || isPast}
                                        onPress={() => onToggleSlot(s, isBooked, isPast)}
                                        className={`flex-row items-center gap-2 px-3 py-2 rounded-xl ${isBooked ? "bg-red-500 opacity-60"
                                            : isPast ? "bg-gray-800 opacity-50"
                                                : isSelected ? "bg-green-500"
                                                    : "bg-gray-800"
                                            }`}
                                        icon={<Icon source="clock-outline" size={18} color="white" />}
                                    >
                                        <View>
                                            <Text className="text-white">
                                                {normalizeTime(s.start)} - {normalizeTime(s.end)}
                                            </Text>
                                            {isBooked ? <Text className="text-white text-xs">DOLU</Text> : isPast ? <Text className="text-white text-xs">ZAMAN GEÇTİ</Text> : null}
                                        </View>
                                    </FilterChip>
                                );
                            }}
                        />
                    )}
                    {!!startHHmm && !!endHHmm && (
                        <View className="bg-gray-800 rounded-xl p-3">
                            <Text className="text-white">
                                Seçilen Saat: {startHHmm} - {endHHmm} ({selectedSlotKeys.length} saat)
                            </Text>
                        </View>
                    )}
                    <View className="mt-1">
                        {isFreeBarber && (
                            <View className='bg-gray-800 px-3 py-2 rounded-lg mb-2'>
                                <Text className='text-white text-base font-ibm-plex-sans-regular'>
                                    {storeData?.pricingType!.toLowerCase() === 'percent'
                                        ? `ℹ️ Fiyatlandırma: Toplam işlem tutarının %${storeData?.pricingValue} kadarı alınır.`
                                        : storeData?.pricingType!.toLowerCase() === 'rent'
                                            ? `ℹ️ Fiyatlandırma: Koltuk kirası uygulanır (${storeData?.pricingValue} ₺/saat).`
                                            : ''}
                                </Text>
                            </View>
                        )}
                        {isHourlyFree && (
                            <View className="flex-row items-center  px-3 pb-0 pt-2 rounded-lg mb-0">
                                <Text className="text-white font-ibm-plex-sans-medium">Saatlik Kiralama : </Text>
                                <Text className="text-[#a3e635] font-ibm-plex-sans-bold text-lg">({totalPrice} ₺)</Text>
                            </View>
                        )}
                        {!isHourlyFree && (isFreeBarber || isCustomer) && (
                            <View>
                                <View className="flex-row  items-center mb-2 mt-2 px-1">
                                    <Text className="text-white font-ibm-plex-sans-medium text-xl">
                                        Hizmetler :
                                    </Text>
                                    <View className="flex-row items-center  px-2 py-0">
                                        <Text className="text-[#a3e635] font-ibm-plex-sans-bold text-xl">
                                            {totalPrice} ₺
                                        </Text>
                                    </View>
                                </View>
                                <FlatList
                                    data={storeData?.serviceOfferings ?? []}
                                    keyExtractor={(item) => item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    removeClippedSubviews
                                    contentContainerStyle={{ gap: 8 }}
                                    renderItem={({ item }) => {
                                        const isSelected = selectedServices.includes(item.id);
                                        return (
                                            <FilterChip
                                                itemKey={item.id}
                                                selected={isSelected}
                                                onPress={() => toggleService(item.id)}
                                                className={`rounded-xl px-3 py-2  ${isSelected ? "bg-green-600 border-green-500" : "bg-gray-800"}`}
                                            >
                                                <View className="flex-row items-center gap-2">
                                                    <Text style={{ color: isSelected ? "white" : "#d1d5db", fontSize: 14, fontWeight: isSelected ? '600' : '400' }}>
                                                        {item.serviceName}
                                                    </Text>
                                                    <Text style={{ color: isSelected ? "white" : "#d1d5db", fontSize: 14 }}>
                                                        {item.price} ₺
                                                    </Text>
                                                </View>
                                            </FilterChip>
                                        );
                                    }}
                                />
                            </View>
                        )}
                    </View>


                    <TouchableOpacity
                        disabled={!canSubmit}
                        className={`py-3 flex-row justify-center gap-2 rounded-xl mt-0 items-center ${(!canSubmit) ? "bg-[#4b5563] opacity-60" : "bg-[#22c55e] opacity-100"}`}
                        onPress={async () => {
                            try {
                                if (!selectedChair || selectedSlotKeys.length === 0) return;

                                if (!areHourlyContiguous(selectedSlotKeys)) {
                                    Alert.alert("Uyarı", "Lütfen ardışık saatleri seçin (boşluk olamaz).");
                                    return;
                                }

                                const sorted = [...selectedSlotKeys].sort();
                                const start = sorted[0];
                                const end = addMinutesToHHmm(start, sorted.length * 60);

                                const startIso = toLocalIso(selectedDateOnly, start);
                                const endIso = toLocalIso(selectedDateOnly, end);



                                Alert.alert("Özet", `${startIso} → ${endIso}\nHizmet: ${selectedServices.length} adet\nTutar: ${totalPrice} TL`);
                            } catch (e: any) {
                                Alert.alert("Hata", e?.data?.message ?? e?.message ?? "İşlem başarısız.");
                            }
                        }}
                    >
                        <Icon source="location-enter" size={18} color="white" />
                        <Text className="text-white font-ibm-plex-sans-regular text-base">Randevu Al</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </>
    )
}

export default StoreBookingContent

