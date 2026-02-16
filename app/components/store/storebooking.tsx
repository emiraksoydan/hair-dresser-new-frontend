import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../common/Text";
import { ActivityIndicator, Icon } from "react-native-paper";
import { useLanguage } from "../../hook/useLanguage";
import {
  useGetAvailabilityQuery,
  useGetStoreForUsersQuery,
  useGetWorkingHoursByTargetQuery,
  useCreateCustomerAppointmentMutation,
  useCreateFreeBarberAppointmentMutation,
  useCreateStoreAppointmentMutation,
  useAddStoreToAppointmentMutation,
} from "../../store/api";
import { APPOINTMENT_CONSTANTS } from "../../constants/appointment";
import {
  ChairSlotDto,
  UserType,
  PricingType,
  StoreSelectionType,
} from "../../types";
import { getBarberTypeName } from "../../utils/store/barber-type";
import FilterChip from "../common/filter-chip";
import {
  fmtDateOnly,
  build7Days,
  normalizeTime,
  addMinutesToHHmm,
  getDayInfo,
} from "../../utils/time/time-helper";
import { useAuth } from "../../hook/useAuth";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { useAppointmentBooking } from "../../hook/useAppointmentBooking";
import { useAppointmentPricing } from "../../hook/useAppointmentPricing";
import { getErrorMessage } from "../../utils/errorHandler";
import { ImageCarousel } from "../common/imagecarousel";
import { useCanPerformAction } from "../../hook/useCanPerformAction";
import { useAlert } from "../../hook/useAlert";

const toLocalIso = (dateStr: string, hhmm: string) =>
  `${dateStr}T${normalizeTime(hhmm)}:00`;
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

const StoreBookingContent = ({
  storeId,
  isBottomSheet = false,
  isFreeBarber = false,
  isCustomer = false,
  freeBarberUserId,
  preselectedServices,
  note,
  storeSelectionType,
  mode,
  appointmentId,
}: Props) => {
  // store header info
  const { data: storeData } = useGetStoreForUsersQuery(storeId, {
    skip: !storeId,
  });
  const { data: workingHours } = useGetWorkingHoursByTargetQuery(storeId, {
    skip: !storeId,
  });
  const router = useRouter();
  const { t } = useLanguage();
  const isAddStoreMode = mode === "add-store";
  const [createCustomerAppointment, { isLoading: isCreatingCustomer }] =
    useCreateCustomerAppointmentMutation();
  const [createFreeBarberAppointment, { isLoading: isCreatingFreeBarber }] =
    useCreateFreeBarberAppointmentMutation();
  const [createStoreAppointment, { isLoading: isCreatingStore }] =
    useCreateStoreAppointmentMutation();
  const [addStoreToAppointment, { isLoading: isAddingStore }] =
    useAddStoreToAppointmentMutation();

  const { userType: currentUserType } = useAuth();

  // FreeBarber seçimi artık koltuk seçiminde gösteriliyor (barberId koltuğa atanmışsa)

  // day selection
  const days = useMemo(() => build7Days(), []);
  const [selectedDateOnly, setSelectedDateOnly] = useState(() =>
    fmtDateOnly(days[0]),
  );

  const normalizeDow = (dow: number) => {
    if (dow === 7) return 0;
    return dow;
  };

  const closedByDow = useMemo(() => {
    const map = new Map<number, boolean>();
    (workingHours ?? []).forEach((w) => {
      const dow = normalizeDow(Number(w.dayOfWeek));
      map.set(dow, !!w.isClosed);
    });
    return map;
  }, [workingHours]);

  const isDayClosed = (d: Date) => {
    const jsDow = d.getDay();
    return closedByDow.get(jsDow) === true;
  };

  const {
    data,
    isFetching,
    isLoading,
    refetch,
    error: availabilityError,
  } = useGetAvailabilityQuery(
    {
      storeId,
      dateOnly: selectedDateOnly,
    },
    {
      skip: !storeId || !selectedDateOnly,
    },
  );

  // Action kontrolü: Error durumunda işlem yapılamaz
  const { checkAndAlert: checkCanPerformAction } = useCanPerformAction(
    availabilityError,
    undefined, // Store booking'te location kontrolü zaten getCurrentLocationSafe ile yapılıyor
    undefined,
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
      const currentChairExists =
        selectedChairId && chairs.some((c) => c.chairId === selectedChairId);
      if (!currentChairExists) {
        setSelectedChairId(chairs[0].chairId);
      }
    } else {
      setSelectedChairId(null);
    }
  }, [chairs, selectedDateOnly, selectedChairId, setSelectedChairId]);

  // Day change handler
  const onChangeDay = useCallback(
    (d: string) => {
      setSelectedDateOnly(d);
      setSelectedChairId(null);
      setSelectedSlotKeys([]);
    },
    [setSelectedChairId, setSelectedSlotKeys],
  );

  // Use custom hook for pricing calculations
  const {
    pricingTypeKey,
    isHourlyFree,
    isPercentFree,
    totalPrice,
    servicePriceTotal,
    slotPriceTotal,
    pricingValue,
  } = useAppointmentPricing({
    pricingType: storeData?.pricingType,
    pricingValue: storeData?.pricingValue,
    serviceOfferings: storeData?.serviceOfferings,
    selectedServices,
    selectedSlotKeys,
    isFreeBarber: isFreeBarber || isAddStoreMode,
  });
  console.log(isCustomer);

  const { alert, alertSuccess, alertError } = useAlert();

  const canSubmit = useMemo(() => {
    const baseReady = !!selectedChairId && selectedSlotKeys.length > 0;

    // Servis seçimi zorunlu olduğu durumlar:
    // 1. isAddStoreMode=true (FreeBarber dükkan ekliyor)
    // 2. isFreeBarber=true VE pricingType=percent (yüzdelik sistem, servis fiyatına göre hesaplanır)
    // 3. isCustomer=true (müşteri dükkandan randevu alıyor - her zaman servis seçmeli)
    //
    // Servis seçimi zorunlu OLMAYAN durumlar:
    // 1. isFreeBarber=true VE pricingType=rent (saatlik kiralama - isHourlyFree=true)
    const requireServices = isAddStoreMode || isCustomer || (isFreeBarber && !isHourlyFree);

    return baseReady && (requireServices ? selectedServices.length > 0 : true);
  }, [
    selectedChairId,
    selectedSlotKeys.length,
    selectedServices.length,
    isHourlyFree,
    isAddStoreMode,
    isCustomer,
    isFreeBarber,
  ]);

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
              <Text
                className="font-century-gothic text-white"
                numberOfLines={1}
                style={{ fontSize: 24 }}
              >
                {storeData?.storeName ?? "İşletme"}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Icon
                  size={20}
                  color={storeData?.type === 0 ? "#60a5fa" : "#f472b6"}
                  source={storeData?.type === 0 ? "face-man" : "face-woman"}
                />
                <Text
                  className="text-white font-century-gothic"
                  style={{ fontSize: 15 }}
                >
                  - {getBarberTypeName(storeData?.type!)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mt-2 gap-1">
              <Icon size={20} color="#FFA500" source="star" />
              <Text
                className="font-century-gothic text-white"
                style={{ fontSize: 15 }}
              >
                {Number(storeData?.rating ?? 0).toFixed(1)}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2 mt-2">
            <Icon size={20} color="#FFA500" source="map-marker" />
            <Text
              className="font-century-gothic flex-shrink text-white"
              numberOfLines={1}
              style={{ fontSize: 15 }}
            >
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
            <Text className="text-white font-century-gothic mt-3 text-xl">
              Randevu Al
            </Text>
          </View>

          {/* DAYS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View className="flex-row gap-2 items-center">
              <View className="items-center justify-center rounded-2xl px-2 py-2.5 min-w-[52px] bg-[#0f172a] border border-[#334155]">
                <Icon source="calendar-month" size={24} color="#60a5fa" />
              </View>
              {days.map((d) => {
                const key = fmtDateOnly(d);
                const active = key === selectedDateOnly;
                const disabled = isDayClosed(d);
                const info = getDayInfo(d);
                return (
                  <TouchableOpacity
                    key={key}
                    disabled={disabled}
                    onPress={() => onChangeDay(key)}
                    activeOpacity={0.7}
                    className={`items-center rounded-2xl px-3 py-2.5 min-w-[68px] border ${
                      disabled
                        ? "bg-[#1e1e1e] border-[#2a2a2a] opacity-40"
                        : active
                          ? "bg-[#16a34a] border-[#22c55e]"
                          : "bg-[#1e293b] border-[#334155]"
                    }`}
                  >
                    <Text
                      className={`text-xs font-century-gothic ${
                        disabled ? "text-gray-600" : active ? "text-green-100" : "text-gray-400"
                      }`}
                    >
                      {info.isToday ? "Bugün" : info.dayShort}
                    </Text>
                    <Text
                      className={`text-2xl font-century-gothic-bold my-0.5 ${
                        disabled ? "text-gray-600" : active ? "text-white" : "text-white"
                      }`}
                    >
                      {info.dayNum}
                    </Text>
                    <Text
                      className={`text-xs font-century-gothic ${
                        disabled ? "text-gray-600" : active ? "text-green-100" : "text-gray-400"
                      }`}
                    >
                      {info.monthShort}
                    </Text>
                    {disabled && (
                      <View className="mt-1 bg-red-900/50 px-1.5 py-0.5 rounded">
                        <Text className="text-red-400 text-[10px]">Kapalı</Text>
                      </View>
                    )}
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
            <View className="bg-[#1e293b] rounded-xl p-4 items-center">
              <Icon source="seat-outline" size={28} color="#6b7280" />
              <Text className="text-gray-400 mt-2">
                Bu gün için koltuk/slot bulunamadı.
              </Text>
            </View>
          ) : (
            <View>
              <Text className="text-gray-400 text-xs font-century-gothic mb-2">
                Koltuk Seçin
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
              >
                <View className="flex-row gap-2">
                  {chairs.map((c) => {
                    const isSelected = c.chairId === selectedChairId;
                    const hasBarber = c.barberId != null && c.barberName != null;
                    const chairName = c.chairName ?? "Koltuk";
                    const barberName = c.barberName ?? "";
                    const rating =
                      c.barberRating != null
                        ? Number(c.barberRating).toFixed(1)
                        : null;

                    return (
                      <TouchableOpacity
                        key={c.chairId}
                        onPress={() => setSelectedChairId(c.chairId)}
                        activeOpacity={0.7}
                        className={`items-center min-w-[110px] px-3 py-3 rounded-2xl border ${
                          isSelected
                            ? "bg-[#16a34a] border-[#22c55e]"
                            : "bg-[#1e293b] border-[#334155]"
                        }`}
                      >
                        <View className={`rounded-full p-2 mb-1.5 ${isSelected ? "bg-white/20" : "bg-[#334155]"}`}>
                          <Icon source="seat" size={22} color={isSelected ? "white" : "#94a3b8"} />
                        </View>
                        <Text
                          className={`font-century-gothic-bold text-sm ${isSelected ? "text-white" : "text-gray-200"}`}
                          numberOfLines={1}
                        >
                          {chairName}
                        </Text>
                        {hasBarber && (
                          <Text
                            className={`font-century-gothic text-xs mt-0.5 ${isSelected ? "text-green-100" : "text-gray-400"}`}
                            numberOfLines={1}
                          >
                            {barberName}
                          </Text>
                        )}
                        {rating != null && (
                          <View className="flex-row items-center gap-1 mt-1">
                            <Icon
                              size={12}
                              source="star"
                              color={isSelected ? "#fde047" : "#FFA500"}
                            />
                            <Text className={`text-xs ${isSelected ? "text-white" : "text-gray-300"}`}>
                              {rating}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {!selectedChair ? (
            <View className="bg-[#1e293b] rounded-xl p-4 items-center">
              <Icon source="clock-outline" size={28} color="#6b7280" />
              <Text className="text-gray-400 mt-2">{t("form.selectChairFirst")}</Text>
            </View>
          ) : (
            <View>
              <Text className="text-gray-400 text-xs font-century-gothic mb-2">
                Saat Seçin
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {selectedChair.slots.map((s) => {
                  const isBooked = s.isBooked;
                  const isPast = s.isPast;
                  const key = normalizeTime(s.start);
                  const isSelected = selectedSlotKeys.includes(key);
                  const isDisabled = isBooked || isPast;
                  return (
                    <TouchableOpacity
                      key={String(s.slotId)}
                      disabled={isDisabled}
                      onPress={() => onToggleSlot(s, isBooked, isPast)}
                      activeOpacity={0.7}
                      className={`items-center px-3 py-2.5 rounded-xl border ${
                        isBooked
                          ? "bg-red-900/40 border-red-800/50 opacity-60"
                          : isPast
                            ? "bg-[#1e1e1e] border-[#2a2a2a] opacity-40"
                            : isSelected
                              ? "bg-[#16a34a] border-[#22c55e]"
                              : "bg-[#1e293b] border-[#334155]"
                      }`}
                    >
                      <Text
                        className={`text-sm font-century-gothic-bold ${
                          isBooked || isPast ? "text-gray-500" : isSelected ? "text-white" : "text-gray-200"
                        }`}
                      >
                        {normalizeTime(s.start)}
                      </Text>
                      <Text
                        className={`text-[10px] font-century-gothic ${
                          isBooked || isPast ? "text-gray-600" : isSelected ? "text-green-200" : "text-gray-500"
                        }`}
                      >
                        {normalizeTime(s.end)}
                      </Text>
                      {isBooked && (
                        <View className="mt-0.5">
                          <Icon source="close-circle" size={12} color="#ef4444" />
                        </View>
                      )}
                      {isPast && (
                        <View className="mt-0.5">
                          <Icon source="clock-alert" size={12} color="#6b7280" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
          {!!startHHmm && !!endHHmm && (
            <View className="bg-[#0f1b2d] border border-[#1e3a5f] rounded-2xl p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="bg-[#16a34a] rounded-full p-2">
                  <Icon source="clock-check" size={20} color="white" />
                </View>
                <View>
                  <Text className="text-gray-400 text-xs font-century-gothic">Seçilen Saat</Text>
                  <Text className="text-white font-century-gothic-bold text-base">
                    {startHHmm} - {endHHmm}
                  </Text>
                </View>
              </View>
              <View className="items-end gap-1">
                <View className="bg-[#1e293b] px-3 py-1.5 rounded-lg">
                  <Text className="text-[#60a5fa] font-century-gothic-bold text-sm">
                    {selectedSlotKeys.length} saat
                  </Text>
                </View>
                {isHourlyFree && slotPriceTotal > 0 && (
                  <Text className="text-[#a3e635] font-century-gothic-bold text-sm">
                    {slotPriceTotal} {t("card.currencySymbol")}
                  </Text>
                )}
              </View>
            </View>
          )}
          <View className="h-px bg-[#334155] my-3" />
          <View>
            {isFreeBarber && (
              <View className="bg-gray-800 px-3 py-2 rounded-lg mb-2">
                <Text className="text-white text-base font-century-gothic">
                  {storeData?.pricingType!.toLowerCase() === "percent"
                    ? `ℹ️ ${t("card.pricingPercent", { value: storeData?.pricingValue })}`
                    : storeData?.pricingType!.toLowerCase() === "rent"
                      ? `ℹ️ ${t("card.pricingRent", { value: storeData?.pricingValue })}`
                      : ""}
                </Text>
              </View>
            )}
            {(isAddStoreMode || isFreeBarber || isCustomer) && (
              <View>
                <View className="flex-row items-center justify-between mb-3 mt-2 px-1">
                  <Text className="text-white font-century-gothic-bold text-lg">
                    {t("common.services")}
                  </Text>
                  <View className="bg-[#1e293b] px-3 py-1.5 rounded-lg">
                    <Text className="text-[#a3e635] font-century-gothic-bold text-lg">
                      {servicePriceTotal} {t("card.currencySymbol")}
                    </Text>
                  </View>
                </View>
                <FlatList
                  data={storeData?.serviceOfferings ?? []}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  nestedScrollEnabled
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item }) => {
                    const isSelected = selectedServices.includes(item.id);
                    return (
                      <TouchableOpacity
                        onPress={() => toggleService(item.id)}
                        activeOpacity={0.7}
                        className={`flex-row items-center justify-between px-4 py-3 rounded-xl border ${isSelected ? "bg-[#14532d] border-[#22c55e]" : "bg-[#1e293b] border-[#334155]"}`}
                      >
                        <View className="flex-row items-center flex-1 mr-2">
                          <Icon
                            source={isSelected ? "check-circle" : "circle-outline"}
                            size={22}
                            color={isSelected ? "#22c55e" : "#6b7280"}
                          />
                          <Text
                            className="ml-3 text-sm flex-1"
                            style={{ color: isSelected ? "#e2e8f0" : "#d1d5db" }}
                            numberOfLines={1}
                          >
                            {item.serviceName}
                          </Text>
                        </View>
                        <Text
                          className="text-sm font-century-gothic-bold"
                          style={{ color: isSelected ? "#a3e635" : "#9ca3af" }}
                        >
                          {item.price} {t("card.currencySymbol")}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}
          </View>

          <TouchableOpacity
            disabled={
              !canSubmit ||
              isCreatingCustomer ||
              isCreatingFreeBarber ||
              isCreatingStore ||
              isAddingStore
            }
            className={`py-4 flex-row justify-center gap-2 rounded-2xl mt-2 items-center ${!canSubmit ? "bg-[#4b5563] opacity-60" : "bg-[#16a34a] opacity-100"}`}
            style={canSubmit ? { elevation: 6, shadowColor: '#22c55e', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 } : undefined}
            onPress={async () => {
              try {
                // Error kontrolü: Sunucu çalışmıyorsa işlem yapılamaz
                if (!checkCanPerformAction()) {
                  return;
                }

                if (!selectedChair || selectedSlotKeys.length === 0) return;

                // Duplicate request önleme: buton disabled yap
                if (
                  isCreatingCustomer ||
                  isCreatingFreeBarber ||
                  isCreatingStore ||
                  isAddingStore
                ) {
                  return;
                }

                // 1 saatlik ardışık slot kontrolü kaldırıldı - artık herhangi bir slot seçilebilir

                // Seçilen slotların hala müsait olduğunu kontrol et
                const sorted = [...selectedSlotKeys].sort();
                const start = sorted[0];
                const end = addMinutesToHHmm(
                  start,
                  sorted.length * APPOINTMENT_CONSTANTS.SLOT_DURATION_MINUTES,
                );

                // Güncel availability'yi kontrol et
                const currentChair = chairs.find(
                  (c) => c.chairId === selectedChair.chairId,
                );
                if (currentChair) {
                  const selectedSlots = sorted.map((key) => {
                    const slot = currentChair.slots.find(
                      (s) => normalizeTime(s.start) === key,
                    );
                    return slot;
                  });

                  const hasBookedSlot = selectedSlots.some(
                    (slot) => slot?.isBooked === true,
                  );
                  if (hasBookedSlot) {
                    alert(
                      t("booking.warning"),
                      t("booking.slotTakenByOther"),
                      undefined,
                      "warning",
                    );
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
                    alertError(
                      t("common.error"),
                      t("booking.appointmentNotFound"),
                    );
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

                  const addStoreResult = await addStoreToAppointment({
                    appointmentId,
                    body: addStorePayload,
                  });

                  if ("error" in addStoreResult) {
                    alertError(
                      t("common.error"),
                      getErrorMessage(addStoreResult.error),
                    );
                    return;
                  }
                  const result = addStoreResult.data;
                  if (result?.success) {
                    alertSuccess(t("common.success"), t("booking.storeAdded"), [
                      { text: t("common.ok"), onPress: () => router.back() },
                    ]);
                  } else {
                    alertError(
                      t("common.error"),
                      result?.message ?? t("common.operationFailed"),
                    );
                  }
                  return;
                }

                // Müşteri için konum al
                const isCustomerFlow =
                  isCustomer || currentUserType === UserType.Customer;
                let customerLat: number | null = null;
                let customerLon: number | null = null;
                if (isCustomerFlow) {
                  const locationResult = await getCurrentLocationSafe();
                  if (!locationResult.ok) {
                    alertError(
                      t("booking.locationRequired"),
                      locationResult.message ??
                      t("booking.locationPermissionRequired"),
                    );
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
                  freeBarberUserId: isCustomerFlow
                    ? null
                    : freeBarberUserId || null,
                  requestLatitude: isCustomerFlow
                    ? customerLat
                    : (storeData?.latitude ?? null),
                  requestLongitude: isCustomerFlow
                    ? customerLon
                    : (storeData?.longitude ?? null),
                  note: note || null,
                  storeSelectionType: storeSelectionType || null,
                };

                let result;
                if (isCustomerFlow) {
                  const customerResult =
                    await createCustomerAppointment(appointmentData);
                  if ("error" in customerResult) {
                    throw customerResult.error;
                  }
                  result = customerResult.data;
                } else if (
                  isFreeBarber ||
                  currentUserType === UserType.FreeBarber
                ) {
                  const freeBarberResult =
                    await createFreeBarberAppointment(appointmentData);
                  if ("error" in freeBarberResult) {
                    throw freeBarberResult.error;
                  }
                  result = freeBarberResult.data;
                } else if (currentUserType === UserType.BarberStore) {
                  const storeResult =
                    await createStoreAppointment(appointmentData);
                  if ("error" in storeResult) {
                    throw storeResult.error;
                  }
                  result = storeResult.data;
                } else {
                  alertError(
                    t("common.error"),
                    t("booking.userTypeNotDetermined"),
                  );
                  return;
                }

                if (result?.success) {
                  alertSuccess(
                    t("common.success"),
                    t("booking.appointmentCreated"),
                    [{ text: t("common.ok"), onPress: () => router.back() }],
                  );
                } else {
                  alertError(
                    t("common.error"),
                    result?.message ?? t("booking.appointmentCreationFailed"),
                  );
                }
              } catch (error: unknown) {
                const errorMessage = getErrorMessage(error);
                // Abort hatası veya boş mesaj durumunda alert gösterme
                if (errorMessage) {
                  alertError(t("common.error"), errorMessage);
                }
              }
            }}
          >
            {isCreatingCustomer ||
              isCreatingFreeBarber ||
              isCreatingStore ||
              isAddingStore ? (
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
  );
};

export default StoreBookingContent;
