import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, FlatList, Image, ScrollView, StatusBar, TouchableOpacity, View } from "react-native";
import { Text } from "../common/Text";
import { ActivityIndicator, Icon } from "react-native-paper";
import { useLanguage } from "../../hook/useLanguage";
import { useGetAvailabilityQuery, useGetStoreForUsersQuery, useGetWorkingHoursByTargetQuery, useCreateCustomerAppointmentMutation, useCreateFreeBarberAppointmentMutation, useCreateStoreAppointmentMutation, useAddStoreToAppointmentMutation } from "../../store/api";
import { APPOINTMENT_CONSTANTS } from "../../constants/appointment";
import { ChairSlotDto, UserType, PricingType, StoreSelectionType } from "../../types";
import { getBarberTypeName } from "../../utils/store/barber-type";
import FilterChip from "../common/filter-chip";
import { fmtDateOnly, build7Days, normalizeTime, addMinutesToHHmm } from "../../utils/time/time-helper";
import { useAuth } from "../../hook/useAuth";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { useAppointmentBooking } from "../../hook/useAppointmentBooking";
import { useAppointmentPricing } from "../../hook/useAppointmentPricing";
import { getUserFriendlyErrorMessage, isDuplicateSlotError } from "../../utils/common/error";
import { ImageCarousel } from "../common/imagecarousel";
import { useCanPerformAction } from "../../hook/useCanPerformAction";

const toLocalIso = (dateStr: string, hhmm: string) => `${dateStr}T${normalizeTime(hhmm)}:00`;
interface Props {
    storeId: string;
    isBottomSheet?: boolean;
    isFreeBarber?: boolean;
    isCustomer?: boolean;
    mode?: "add-store";
    appointmentId?: string;
    freeBarberUserId?: string; // Serbest berber randevusu için
    preselectedServices?: string[]; // Önceden seçilmiş hizmetler (serbest berber randevusu için)
    note?: string; // Randevu notu (Customer -> FreeBarber + Store senaryosu için)
    storeSelectionType?: StoreSelectionType; // StoreSelectionType (Dükkan Seç senaryosu için)
}

const StoreBookingContent = ({ storeId, isBottomSheet = false, isFreeBarber = false, isCustomer = false, freeBarberUserId, preselectedServices, note, storeSelectionType, mode, appointmentId }: Props) => {
    // store header info
    const { data: storeData } = useGetStoreForUsersQuery(storeId, { skip: !storeId });
    const { data: workingHours } = useGetWorkingHoursByTargetQuery(storeId, { skip: !storeId });
    const router = useRouter();
    const { t } = useLanguage();
    const isAddStoreMode = mode === "add-store";
    const [createCustomerAppointment, { isLoading: isCreatingCustomer }] = useCreateCustomerAppointmentMutation();
    const [createFreeBarberAppointment, { isLoading: isCreatingFreeBarber }] = useCreateFreeBarberAppointmentMutation();
    const [createStoreAppointment, { isLoading: isCreatingStore }] = useCreateStoreAppointmentMutation();
    const [addStoreToAppointment, { isLoading: isAddingStore }] = useAddStoreToAppointmentMutation();

    const { userType: currentUserType } = useAuth();

    // FreeBarber seçimi artık koltuk seçiminde gösteriliyor (barberId koltuğa atanmışsa)


    // day selection
    const days = useMemo(() => build7Days(), []);
    const [selectedDateOnly, setSelectedDateOnly] = useState(() => fmtDateOnly(days[0]));

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

    const { data, isFetching, isLoading, refetch, error: availabilityError } = useGetAvailabilityQuery({
        storeId,
        dateOnly: selectedDateOnly,
    }, {
        skip: !storeId || !selectedDateOnly,
    });

    // Action kontrolü: Error durumunda işlem yapılamaz
    const { checkAndAlert: checkCanPerformAction } = useCanPerformAction(
        availabilityError,
        undefined, // Store booking'te location kontrolü zaten getCurrentLocationSafe ile yapılıyor
        undefined
    );

    const chairs: ChairSlotDto[] = useMemo(() => {
        if (!data) {
            return [];
        }
        if (Array.isArray(data)) {
            return data;
        }
        return [];
    }, [data]);

    // Use custom hooks for booking logic
    const {
        selectedChairId,
        setSelectedChairId,
        selectedSlotKeys,
        setSelectedSlotKeys,
        selectedServices,
        toggleService,
        selectedChair,
        onToggleSlot,
        startHHmm,
        endHHmm,
    } = useAppointmentBooking({ chairs, preselectedServices });

    // Update selectedChairId when date changes
    useEffect(() => {
        if (chairs.length > 0) {
            const currentChairExists = selectedChairId && chairs.some(c => c.chairId === selectedChairId);
            if (!currentChairExists) {
                setSelectedChairId(chairs[0].chairId);
            }
        } else {
            setSelectedChairId(null);
        }
    }, [chairs, selectedDateOnly, selectedChairId, setSelectedChairId]);

    // Day change handler
    const onChangeDay = useCallback((d: string) => {
        setSelectedDateOnly(d);
        setSelectedChairId(null);
        setSelectedSlotKeys([]);
    }, [setSelectedChairId, setSelectedSlotKeys]);

    // Use custom hook for pricing calculations
    const {
        pricingTypeKey,
        isHourlyFree,
        isPercentFree,
        totalPrice,
        pricingValue,
    } = useAppointmentPricing({
        pricingType: storeData?.pricingType,
        pricingValue: storeData?.pricingValue,
        serviceOfferings: storeData?.serviceOfferings,
        selectedServices,
        selectedSlotKeys,
        isFreeBarber: isFreeBarber || isAddStoreMode,
    });

    const canSubmit = useMemo(() => {
        const baseReady = !!selectedChairId && selectedSlotKeys.length > 0;
        const requireServices = isAddStoreMode ? true : !isHourlyFree;

        return baseReady && (requireServices ? selectedServices.length > 0 : true);
    }, [selectedChairId, selectedSlotKeys.length, selectedServices.length, isHourlyFree, isAddStoreMode]);

    return (
        <>
            <View className="relative">
                <ImageCarousel
                    images={storeData?.imageList ?? []}
                    mode={"default"}
                    height={250}
                />
                <View className="absolute top-0 left-0 right-0 bottom-0 bg-black opacity-50" />
                <View className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-shrink flex-wrap gap-2 flex-row">
                            <Text className="font-century-gothic text-white" numberOfLines={1} style={{ fontSize: 24 }}>
                                {storeData?.storeName ?? "İşletme"}
                            </Text>
                            <View className="flex-row items-center gap-2 mt-1">
                                <Icon size={20} color={storeData?.type === 0 ? "#60a5fa" : "#f472b6"} source={storeData?.type === 0 ? "face-man" : "face-woman"} />
                                <Text className="text-white font-century-gothic" style={{ fontSize: 15 }}>
                                    - {getBarberTypeName(storeData?.type!)}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center mt-2 gap-1">
                            <Icon size={20} color="#FFA500" source="star" />
                            <Text className="font-century-gothic text-white" style={{ fontSize: 15 }}>
                                {Number(storeData?.rating ?? 0).toFixed(1)}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2 mt-2">
                        <Icon size={20} color="#FFA500" source="map-marker" />
                        <Text className="font-century-gothic flex-shrink text-white" numberOfLines={1} style={{ fontSize: 15 }}>
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

            <ScrollView nestedScrollEnabled>
                <View className="p-4 z-0 gap-3">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-white font-century-gothic mt-3 text-xl">Randevu Al</Text>
                    </View>

                    {/* DAYS */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
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
                            nestedScrollEnabled
                            contentContainerStyle={{ gap: 10 }}
                            renderItem={({ item: c }) => {
                                const isSelected = c.chairId === selectedChairId;
                                const hasBarber = c.barberId != null && c.barberName != null;
                                const chairName = c.chairName ?? "Koltuk";
                                const barberName = c.barberName ?? "";
                                const rating = c.barberRating != null ? Number(c.barberRating).toFixed(1) : null;

                                return (
                                    <FilterChip
                                        itemKey={c.chairId}
                                        selected={isSelected}
                                        onPress={() => setSelectedChairId(c.chairId)}
                                        className={`items-center w-[140px] px-2 py-3 rounded-xl ${isSelected ? "bg-green-500" : "bg-gray-800"}`}
                                        icon={<Icon source="seat" size={24} color="white" />}
                                    >
                                        <View className="items-center gap-1">
                                            <Text className="text-white font-century-gothic text-sm" numberOfLines={1}>
                                                {chairName}
                                            </Text>
                                            {hasBarber && (
                                                <>
                                                    <Text className="text-white font-century-gothic text-xs" numberOfLines={1}>
                                                        {barberName}
                                                    </Text>
                                                    {rating != null && (
                                                        <View className="flex-row items-center gap-1">
                                                            <Icon size={12} source="star" color={isSelected ? "white" : "#FFA500"} />
                                                            <Text className="text-white text-xs">{rating}</Text>
                                                        </View>
                                                    )}
                                                </>
                                            )}
                                            {!hasBarber && rating != null && (
                                                <View className="flex-row items-center gap-1">
                                                    <Icon size={12} source="star" color={isSelected ? "white" : "#FFA500"} />
                                                    <Text className="text-white text-xs">{rating}</Text>
                                                </View>
                                            )}
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
                            nestedScrollEnabled
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
                                <Text className='text-white text-base font-century-gothic'>
                                    {storeData?.pricingType!.toLowerCase() === 'percent'
                                        ? `ℹ️ ${t('card.pricingPercent', { value: storeData?.pricingValue })}`
                                        : storeData?.pricingType!.toLowerCase() === 'rent'
                                            ? `ℹ️ ${t('card.pricingRent', { value: storeData?.pricingValue })}`
                                            : ''}
                                </Text>
                            </View>
                        )}
                        {isHourlyFree && (
                            <View className="flex-row items-center  px-3 pb-0 pt-2 rounded-lg mb-0">
                                <Text className="text-white font-century-gothic">Saatlik Kiralama : </Text>
                                <Text className="text-[#a3e635] font-century-gothic-bold text-lg">({totalPrice} {t('card.currencySymbol')})</Text>
                            </View>
                        )}
                        {(isAddStoreMode || (!isHourlyFree && (isFreeBarber || isCustomer))) && (
                            <View>
                                <View className="flex-row  items-center mb-2 mt-2 px-1">
                                    <Text className="text-white font-century-gothic text-xl">
                                        Hizmetler :
                                    </Text>
                                    <View className="flex-row items-center  px-2 py-0">
                                        <Text className="text-[#a3e635] font-century-gothic-bold text-xl">
                                            {totalPrice} {t('card.currencySymbol')}
                                        </Text>
                                    </View>
                                </View>
                                <FlatList
                                    data={storeData?.serviceOfferings ?? []}
                                    keyExtractor={(item) => item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    nestedScrollEnabled
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
                                                        {item.price} {t('card.currencySymbol')}
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
                        disabled={!canSubmit || isCreatingCustomer || isCreatingFreeBarber || isCreatingStore || isAddingStore}
                        className={`py-3 flex-row justify-center gap-2 rounded-xl mt-0 items-center ${(!canSubmit) ? "bg-[#4b5563] opacity-60" : "bg-[#22c55e] opacity-100"}`}
                        onPress={async () => {
                            try {
                                // Error kontrolü: Sunucu çalışmıyorsa işlem yapılamaz
                                if (!checkCanPerformAction()) {
                                    return;
                                }

                                if (!selectedChair || selectedSlotKeys.length === 0) return;

                                // Duplicate request önleme: buton disabled yap
                                if (isCreatingCustomer || isCreatingFreeBarber || isCreatingStore || isAddingStore) {
                                    return;
                                }

                                // 1 saatlik ardışık slot kontrolü kaldırıldı - artık herhangi bir slot seçilebilir

                                // Seçilen slotların hala müsait olduğunu kontrol et
                                const sorted = [...selectedSlotKeys].sort();
                                const start = sorted[0];
                                const end = addMinutesToHHmm(start, sorted.length * APPOINTMENT_CONSTANTS.SLOT_DURATION_MINUTES);

                                // Güncel availability'yi kontrol et
                                const currentChair = chairs.find(c => c.chairId === selectedChair.chairId);
                                if (currentChair) {
                                    const selectedSlots = sorted.map(key => {
                                        const slot = currentChair.slots.find(s => normalizeTime(s.start) === key);
                                        return slot;
                                    });

                                    const hasBookedSlot = selectedSlots.some(slot => slot?.isBooked === true);
                                    if (hasBookedSlot) {
                                        Alert.alert(t('booking.warning'), t('booking.slotTakenByOther'));
                                        // Availability'yi yenile
                                        refetch();
                                        return;
                                    }
                                }

                                // TimeSpan format: "HH:mm:ss"
                                const startTime = `${start}:00`;
                                const endTime = `${end}:00`;

                                if (appointmentId) {
                                    if (!appointmentId) {
                                        Alert.alert(t('common.error'), t('booking.appointmentNotFound'));
                                        return;
                                    }

                                    const addStorePayload = {
                                        storeId: storeId,
                                        chairId: selectedChair.chairId,
                                        appointmentDate: selectedDateOnly,
                                        startTime: startTime,
                                        endTime: endTime,
                                        serviceOfferingIds: selectedServices, // ✅ Sadece ID'leri gönder
                                    };

                                    const result = await addStoreToAppointment({
                                        appointmentId,
                                        body: addStorePayload,
                                    }).unwrap();

                                    if (result.success) {
                                        Alert.alert(t('common.success'), t('booking.storeAdded'), [
                                            { text: t('common.ok'), onPress: () => router.back() }
                                        ]);
                                    } else {
                                        Alert.alert(t('common.error'), result.message ?? t('common.operationFailed'));
                                    }
                                    return;
                                }

                                // Müşteri için konum al
                                const isCustomerFlow = isCustomer || currentUserType === UserType.Customer;
                                let customerLat: number | null = null;
                                let customerLon: number | null = null;
                                if (isCustomerFlow) {
                                    const locationResult = await getCurrentLocationSafe();
                                    if (!locationResult.ok) {
                                        Alert.alert(t('booking.locationRequired'), locationResult.message ?? t('booking.locationPermissionRequired'));
                                        return;
                                    }
                                    customerLat = locationResult.lat;
                                    customerLon = locationResult.lon;
                                }

                                const appointmentData = {
                                    storeId: storeId,
                                    chairId: selectedChair.chairId,
                                    appointmentDate: selectedDateOnly,
                                    startTime: startTime,
                                    endTime: endTime,
                                    serviceOfferingIds: selectedServices, // ✅ Sadece ID'leri gönder
                                    freeBarberUserId: isCustomerFlow ? null : (freeBarberUserId || null),
                                    requestLatitude: isCustomerFlow ? customerLat : (storeData?.latitude ?? null),
                                    requestLongitude: isCustomerFlow ? customerLon : (storeData?.longitude ?? null),
                                    note: note || null,
                                    storeSelectionType: storeSelectionType || null,
                                };

                                let result;
                                if (isCustomerFlow) {
                                    result = await createCustomerAppointment(appointmentData).unwrap();
                                } else if (isFreeBarber || currentUserType === UserType.FreeBarber) {
                                    result = await createFreeBarberAppointment(appointmentData).unwrap();
                                } else if (currentUserType === UserType.BarberStore) {
                                    result = await createStoreAppointment(appointmentData).unwrap();
                                } else {
                                    Alert.alert(t('common.error'), t('booking.userTypeNotDetermined'));
                                    return;
                                }

                                if (result.success) {
                                    Alert.alert(t('common.success'), t('booking.appointmentCreated'), [
                                        { text: t('common.ok'), onPress: () => router.back() }
                                    ]);
                                } else {
                                    Alert.alert(t('common.error'), result.message ?? t('booking.appointmentCreationFailed'));
                                }
                            } catch (error: unknown) {
                                const errorMessage = getUserFriendlyErrorMessage(error);

                                if (isDuplicateSlotError(error)) {
                                    Alert.alert(
                                        t('booking.warning'),
                                        errorMessage,
                                        [
                                            {
                                                text: t('common.refresh'),
                                                onPress: () => {
                                                    // Availability'yi yenile ve seçimleri temizle
                                                    refetch();
                                                    setSelectedSlotKeys([]);
                                                }
                                            },
                                            { text: t('common.ok') }
                                        ]
                                    );
                                } else {
                                    Alert.alert(t('common.error'), errorMessage);
                                }
                            }
                        }}
                    >
                        {(isCreatingCustomer || isCreatingFreeBarber || isCreatingStore || isAddingStore) ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Icon source="location-enter" size={18} color="white" />
                        )}
                        <Text className="text-white font-century-gothic text-base">
                            {appointmentId ? "Dukkanı Ekle" : "Randevu Al"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </>
    )
}

export default StoreBookingContent


