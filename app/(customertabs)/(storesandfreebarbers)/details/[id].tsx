import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, FlatList, Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Icon } from "react-native-paper";

import { useGetAvailabilityQuery, useGetStoreForUsersQuery } from "../../../store/api"; // store detail endpoint'in yoksa kaldır
import { ChairSlotDto } from "../../../types";

// --- helpers ---
const fmtDateOnly = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const build7Days = () => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        return d;
    });
};

export default function StoreDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const storeId = String(id);

    // --- store header info (varsa) ---
    const { data: storeData } = useGetStoreForUsersQuery(storeId, { skip: !id }); // yoksa kaldır

    // --- day selection ---
    const days = useMemo(() => build7Days(), []);
    const [selectedDateOnly, setSelectedDateOnly] = useState(() => fmtDateOnly(days[0]));
    const onChangeDay = useCallback((d: string) => {
        setSelectedDateOnly(d);
        setSelectedChairId(null);
        setSelectedSlotId(null);
    }, []);

    // --- selection ---
    const [selectedChairId, setSelectedChairId] = useState<string | null>(null);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

    // --- availability query (1 day) ---
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

    // slot reset (gün/koltuk değişince)
    useEffect(() => {
        setSelectedSlotId(null);
    }, [selectedDateOnly, selectedChairId]);

    const canSubmit = !!selectedChairId && !!selectedSlotId;

    return (
        <View className="flex-1 bg-[#151618]">
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            {/* HEADER (BarberCardDetailScreen vibe) */}
            <View className="relative">
                <Image
                    source={{
                        uri:
                            storeData?.imageList?.[0]?.imageUrl ||
                            "https://picsum.photos/900/600",
                    }}
                    className="w-full h-[250px]"
                    resizeMode="cover"
                />
                <View className="absolute top-0 left-0 right-0 bottom-0 bg-black opacity-50" />

                <View className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-shrink flex-wrap gap-2 flex-row">
                            <Text
                                className="font-ibm-plex-sans-regular text-white"
                                numberOfLines={1}
                                style={{ fontSize: 24 }}
                            >
                                {storeData?.storeName ?? "İşletme"}
                            </Text>
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
                        <Text
                            className="font-ibm-plex-sans-regular flex-shrink text-white"
                            numberOfLines={1}
                            style={{ fontSize: 15 }}
                        >
                            {storeData?.addressDescription ?? "Adres"}
                        </Text>
                    </View>

                    <View className="flex-row items-center justify-between mt-2">
                        <Text className="text-white font-ibm-plex-sans-regular" style={{ fontSize: 16 }}>
                            Randevu Al
                        </Text>

                        <TouchableOpacity onPress={() => refetch()}>
                            <Text className="text-white underline">Yenile</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-9 left-5 z-10 rounded-[40px] p-3"
                    style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                >
                    <Icon source="chevron-left" size={25} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView>
                <View className="p-4 gap-3">
                    {/* Gün seçimi (chip style) */}
                    <View className="bg-[#202123] rounded-2xl p-3">
                        <Text className="text-white mb-2 font-ibm-plex-sans-regular">Gün Seç</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View className="flex-row gap-3">
                                {days.map((d) => {
                                    const key = fmtDateOnly(d);
                                    const active = key === selectedDateOnly;

                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            onPress={() => onChangeDay(key)}
                                            className={`px-3 py-2 rounded-xl ${active ? "bg-green-500" : "bg-gray-800"}`}
                                        >
                                            <Text className={`text-sm ${active ? "text-white" : "text-gray-300"}`}>{key}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Loading */}
                    {(isLoading || (isFetching && !data)) && (
                        <View className="py-10">
                            <ActivityIndicator />
                        </View>
                    )}

                    {/* Koltuklar (chip/cards) */}
                    <View className="bg-[#202123] rounded-2xl p-3">
                        <Text className="text-white mb-2 font-ibm-plex-sans-regular">Koltuklar</Text>

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
                                    const title = c.chairName ?? "Koltuk";
                                    const name = c.barberName ?? "—";
                                    const rating =
                                        c.barberRating != null ? Number(c.barberRating).toFixed(1) : "Yeni";

                                    return (
                                        <TouchableOpacity
                                            onPress={() => setSelectedChairId(c.chairId)}
                                            className={`rounded-xl px-3 py-2 w-[150px] ${isSelected ? "bg-green-500" : "bg-gray-800"
                                                }`}
                                        >
                                            <View className="items-center gap-1">
                                                <Icon source="seat" size={26} color="white" />
                                                <Text className="text-white font-ibm-plex-sans-regular" numberOfLines={1}>
                                                    {title}
                                                </Text>
                                                <Text className="text-white text-xs" numberOfLines={1}>
                                                    {name}
                                                </Text>
                                                <View className="flex-row items-center gap-1">
                                                    <Icon size={14} source="star" color={isSelected ? "white" : "orange"} />
                                                    <Text className="text-white text-xs">{rating}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>

                    {/* Slotlar (chip style) */}
                    <View className="bg-[#202123] rounded-2xl p-3">
                        <Text className="text-white mb-2 font-ibm-plex-sans-regular">Saat Seç</Text>

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
                                    const isSelected = selectedSlotId === s.slotId;
                                    const disabled = isBooked || isPast;

                                    return (
                                        <TouchableOpacity
                                            disabled={disabled}
                                            onPress={() => setSelectedSlotId(s.slotId)}
                                            className={`flex-row items-center gap-2 px-3 py-2 rounded-xl ${isBooked
                                                ? "bg-red-500 opacity-60"
                                                : isPast
                                                    ? "bg-gray-800 opacity-50"
                                                    : isSelected
                                                        ? "bg-green-500"
                                                        : "bg-gray-800"
                                                }`}
                                        >
                                            <Icon source="clock-outline" size={18} color="white" />
                                            <View>
                                                <Text className="text-white">
                                                    {s.start} - {s.end}
                                                </Text>
                                                {isBooked ? (
                                                    <Text className="text-white text-xs">DOLU</Text>
                                                ) : isPast ? (
                                                    <Text className="text-white text-xs">GEÇTİ</Text>
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        disabled={!canSubmit}
                        className={`py-3 flex-row justify-center gap-2 rounded-xl mt-1 items-center ${canSubmit ? "bg-[#22c55e] opacity-100" : "bg-[#4b5563] opacity-60"
                            }`}
                        onPress={() => {
                            if (!selectedChair || !selectedSlotId) return;
                            const slot = selectedChair.slots.find((x) => x.slotId === selectedSlotId);
                            if (!slot) return;
                        }}
                    >
                        <Icon source="location-enter" size={18} color="white" />
                        <Text className="text-white font-ibm-plex-sans-regular" style={{ fontSize: 16 }}>
                            Devam Et
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
