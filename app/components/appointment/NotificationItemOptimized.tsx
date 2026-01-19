import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "../common/Text";
import { Icon } from "react-native-paper";
import type { NotificationDto, NotificationPayload } from "../../types";
import {
  NotificationType,
  AppointmentStatus,
  DecisionStatus,
  StoreSelectionType,
} from "../../types";
import { UserType } from "../../types";
import React from "react";
import { useIsFavoriteQuery } from "../../store/api";
import { useAuth } from "../../hook/useAuth";
import { useLanguage } from "../../hook/useLanguage";
import { NotificationParticipantView } from "./NotificationParticipantView";
import { mapBackendMessage } from "../../utils/errorHandler";

// ---------------------------------------------------------------------------
// Sadeleştirilmiş Notification Item Component
//
// Mantık:
// 1. Status gösterimi: Bildirim tipi status bildirimi ise VEYA kullanıcı karar verdiyse
// 2. Buton gösterimi: AppointmentCreated + pending + kullanıcı karar vermemişse
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  item: NotificationDto;
  userType: number | null;
  onMarkRead: (n: NotificationDto) => void;
  onDecision: (n: NotificationDto, approve: boolean) => void;
  onDelete?: (n: NotificationDto) => void;
  isProcessing: boolean;
  isDeleting?: boolean;
  formatDate: (d: string) => string;
  formatTime: (t?: string) => string;
  formatPricingPolicy: (t?: number, v?: number) => any;
  formatRating: (r?: number) => any;
  onAddStore?: (appointmentId: string) => void;
}

// Status tipi için yardımcı tip
type StatusKind =
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed"
  | "unanswered"
  | null;

// Status renkleri ve ikonları
const STATUS_CONFIG: Record<
  NonNullable<StatusKind>,
  { bg: string; border: string; text: string; icon: string; color: string }
> = {
  approved: {
    bg: "bg-green-900/20",
    border: "border-green-800/30",
    text: "text-green-400",
    icon: "check-circle",
    color: "#10b981",
  },
  rejected: {
    bg: "bg-red-900/20",
    border: "border-red-800/30",
    text: "text-red-400",
    icon: "close-circle",
    color: "#ef4444",
  },
  cancelled: {
    bg: "bg-orange-900/20",
    border: "border-orange-800/30",
    text: "text-orange-400",
    icon: "cancel",
    color: "#f97316",
  },
  completed: {
    bg: "bg-blue-900/20",
    border: "border-blue-800/30",
    text: "text-blue-400",
    icon: "check-all",
    color: "#3b82f6",
  },
  unanswered: {
    bg: "bg-yellow-900/20",
    border: "border-yellow-800/30",
    text: "text-yellow-400",
    icon: "clock-alert",
    color: "#fbbf24",
  },
};

// Decision değerini normalize et (backend'den number gelir)
const normalizeDecision = (v: any): DecisionStatus | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v as DecisionStatus;
  return null;
};

// Kullanıcının kendi kararını al
const getMyDecision = (
  userType: number | null,
  recipientRole: string | undefined,
  storeDecision: DecisionStatus | null,
  freeBarberDecision: DecisionStatus | null,
  customerDecision: DecisionStatus | null,
): DecisionStatus | null => {
  // Önce recipientRole'e bak (backend'den gelen), yoksa userType'a bak
  const role =
    recipientRole ??
    (userType === UserType.BarberStore
      ? "store"
      : userType === UserType.FreeBarber
        ? "freebarber"
        : userType === UserType.Customer
          ? "customer"
          : null);

  if (role === "store") return storeDecision;
  if (role === "freebarber") return freeBarberDecision;
  if (role === "customer") return customerDecision;
  return null;
};

// Custom comparison function for React.memo
const areEqual = (prev: NotificationItemProps, next: NotificationItemProps) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.isRead === next.item.isRead &&
    prev.item.payloadJson === next.item.payloadJson &&
    prev.isProcessing === next.isProcessing &&
    prev.isDeleting === next.isDeleting
  );
};

export const NotificationItemOptimized = React.memo<NotificationItemProps>(
  ({
    item,
    userType,
    onMarkRead,
    onDecision,
    onDelete,
    isProcessing,
    isDeleting,
    formatDate,
    formatTime,
    formatPricingPolicy,
    formatRating,
    onAddStore,
  }) => {
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();

    // ========== PAYLOAD PARSING ==========
    const payload = React.useMemo<NotificationPayload | null>(() => {
      try {
        if (
          item.payloadJson &&
          item.payloadJson.trim() !== "" &&
          item.payloadJson !== "{}"
        ) {
          return JSON.parse(item.payloadJson);
        }
      } catch {}
      return null;
    }, [item.payloadJson]);

    // ========== TEMEL DEĞİŞKENLER ==========
    const recipientRole = payload?.recipientRole;

    // Decision değerleri (backend'den number olarak gelir: 0=Pending, 1=Approved, 2=Rejected, 3=NoAnswer)
    const storeDecision = normalizeDecision(payload?.storeDecision);
    const freeBarberDecision = normalizeDecision(payload?.freeBarberDecision);
    const customerDecision = normalizeDecision(payload?.customerDecision);

    // Benim kararım
    const myDecision = getMyDecision(
      userType,
      recipientRole,
      storeDecision,
      freeBarberDecision,
      customerDecision,
    );

    // Karar verdim mi? (Pending=0 veya null değilse karar verilmiş demektir)
    const hasMyDecision =
      myDecision !== null && myDecision !== DecisionStatus.Pending;

    // Randevu durumu
    const appointmentStatus = React.useMemo(() => {
      if (payload?.status !== undefined)
        return payload.status as AppointmentStatus;
      if (item.type === NotificationType.AppointmentUnanswered)
        return AppointmentStatus.Unanswered;
      return AppointmentStatus.Pending;
    }, [payload?.status, item.type]);

    const isPending = appointmentStatus === AppointmentStatus.Pending;

    // ========== SÜRE KONTROLÜ ==========
    const isExpired = React.useMemo(() => {
      // pendingExpiresAt varsa onu kullan
      if (payload?.pendingExpiresAt) {
        let dateStr = payload.pendingExpiresAt;
        if (
          typeof dateStr === "string" &&
          !dateStr.endsWith("Z") &&
          !dateStr.includes("+")
        ) {
          dateStr += "Z";
        }
        return new Date().getTime() > new Date(dateStr).getTime();
      }

      // Yoksa createdAt + timeout hesapla
      if (isPending) {
        let createdStr = item.createdAt;
        if (
          typeof createdStr === "string" &&
          !createdStr.endsWith("Z") &&
          !createdStr.includes("+")
        ) {
          createdStr += "Z";
        }
        const createdAt = new Date(createdStr);

        // StoreSelection flow'da müşteri için 30dk, diğerleri için 5dk
        const isStoreSelectionFlow =
          payload?.storeSelectionType === StoreSelectionType.StoreSelection;
        const isCustomerWaitingForStore =
          isStoreSelectionFlow &&
          userType === UserType.Customer &&
          payload?.store &&
          storeDecision === DecisionStatus.Approved;

        const timeoutMinutes = isCustomerWaitingForStore ? 30 : 5;
        const expiresAt = new Date(
          createdAt.getTime() + timeoutMinutes * 60 * 1000,
        );

        return new Date().getTime() > expiresAt.getTime();
      }

      return false;
    }, [
      payload?.pendingExpiresAt,
      payload?.storeSelectionType,
      payload?.store,
      isPending,
      item.createdAt,
      userType,
      storeDecision,
    ]);

    // ========== STATUS GÖSTERİMİ ==========
    // Status bildirimi tipleri (bu tipler doğrudan status gösterir)
    const isStatusNotification = [
      NotificationType.AppointmentApproved,
      NotificationType.AppointmentRejected,
      NotificationType.AppointmentCancelled,
      NotificationType.AppointmentCompleted,
      NotificationType.AppointmentUnanswered,
    ].includes(item.type);

    // Status'u belirle
    const statusKind = React.useMemo<StatusKind>(() => {
      // 1. Randevu durumuna göre (payload.status)
      if (appointmentStatus === AppointmentStatus.Approved) return "approved";
      if (appointmentStatus === AppointmentStatus.Rejected) return "rejected";
      if (appointmentStatus === AppointmentStatus.Cancelled) return "cancelled";
      if (appointmentStatus === AppointmentStatus.Completed) return "completed";
      if (appointmentStatus === AppointmentStatus.Unanswered)
        return "unanswered";

      // 2. Status bildirim tipine göre
      if (item.type === NotificationType.AppointmentApproved) return "approved";
      if (item.type === NotificationType.AppointmentRejected) return "rejected";
      if (item.type === NotificationType.AppointmentCancelled)
        return "cancelled";
      if (item.type === NotificationType.AppointmentCompleted)
        return "completed";
      if (item.type === NotificationType.AppointmentUnanswered)
        return "unanswered";

      // 3. Kullanıcı karar verdiyse ve randevu hala pending ise (kendi kararını göster)
      if (isPending && hasMyDecision) {
        if (myDecision === DecisionStatus.Approved) return "approved";
        if (myDecision === DecisionStatus.Rejected) return "rejected";
        if (myDecision === DecisionStatus.NoAnswer) return "unanswered";
      }

      return null;
    }, [appointmentStatus, item.type, isPending, hasMyDecision, myDecision]);

    // Status gösterilecek mi?
    const showStatus = statusKind !== null || isStatusNotification;

    // ========== BUTON GÖSTERİMİ ==========
    // Butonlar sadece şu koşullarda gösterilir:
    // 1. AppointmentCreated veya StoreApprovedSelection tipi
    // 2. Randevu pending durumda
    // 3. Süre dolmamış
    // 4. Kullanıcı henüz karar vermemiş
    // 5. Status gösterilmiyor (yani final bir durum yok)

    const isActionableType =
      item.type === NotificationType.AppointmentCreated ||
      item.type === NotificationType.StoreApprovedSelection;

    const canShowButtons = React.useMemo(() => {
      // Temel kontroller
      if (!isActionableType) return false;
      if (!isPending) return false;
      if (isExpired) return false;
      if (hasMyDecision) return false;
      if (statusKind !== null) return false; // Final status varsa buton gösterme

      // Rol bazlı kontroller
      if (userType === UserType.BarberStore) {
        // Store her zaman onay/red verebilir (kendi kararını vermemişse)
        return (
          storeDecision === null || storeDecision === DecisionStatus.Pending
        );
      }

      if (userType === UserType.FreeBarber) {
        // FreeBarber: StoreSelection flow'da ve store seçilmemişse sadece RED
        // Diğer durumlarda normal onay/red
        return (
          freeBarberDecision === null ||
          freeBarberDecision === DecisionStatus.Pending
        );
      }

      if (userType === UserType.Customer) {
        // Customer: StoreSelection flow'da store onayladıysa karar verebilir
        if (payload?.storeSelectionType === StoreSelectionType.StoreSelection) {
          return (
            payload?.store &&
            storeDecision === DecisionStatus.Approved &&
            (customerDecision === null ||
              customerDecision === DecisionStatus.Pending)
          );
        }
        // Normal flow
        return (
          customerDecision === null ||
          customerDecision === DecisionStatus.Pending
        );
      }

      return false;
    }, [
      isActionableType,
      isPending,
      isExpired,
      hasMyDecision,
      statusKind,
      userType,
      storeDecision,
      freeBarberDecision,
      customerDecision,
      payload?.storeSelectionType,
      payload?.store,
    ]);

    // FreeBarber için özel durum: StoreSelection'da store seçilmemişse sadece RED butonu
    const showOnlyRejectButton =
      userType === UserType.FreeBarber &&
      payload?.storeSelectionType === StoreSelectionType.StoreSelection &&
      !payload?.store;

    // ========== FAVORİ KONTROLLARI ==========
    const storeId = payload?.store?.storeId;
    const freeBarberId = payload?.freeBarber?.userId;
    const customerId = payload?.customer?.userId;

    const { data: isStoreFavorite } = useIsFavoriteQuery(storeId || "", {
      skip: !isAuthenticated || !storeId,
    });
    const { data: isFreeBarberFavorite } = useIsFavoriteQuery(
      freeBarberId || "",
      {
        skip: !isAuthenticated || !freeBarberId,
      },
    );
    const { data: isCustomerFavorite } = useIsFavoriteQuery(customerId || "", {
      skip: !isAuthenticated || !customerId,
    });

    const isStoreInFavorites =
      isStoreFavorite ??
      payload?.store?.isInFavorites ??
      payload?.isStoreInFavorites ??
      false;
    const isFreeBarberInFavorites =
      isFreeBarberFavorite ??
      payload?.freeBarber?.isInFavorites ??
      payload?.isFreeBarberInFavorites ??
      false;
    const isCustomerInFavorites =
      isCustomerFavorite ??
      payload?.customer?.isInFavorites ??
      payload?.isCustomerInFavorites ??
      false;

    // ========== EVENT HANDLERS ==========
    const handleApprove = React.useCallback(
      () => onDecision(item, true),
      [item, onDecision],
    );
    const handleReject = React.useCallback(
      () => onDecision(item, false),
      [item, onDecision],
    );
    const handleDelete = React.useCallback(
      () => onDelete?.(item),
      [item, onDelete],
    );
    const handleAddStore = React.useCallback(() => {
      if (onAddStore && item.appointmentId) onAddStore(item.appointmentId);
    }, [item.appointmentId, onAddStore]);

    // Tıklama: Karar bekleyen ve süresi dolmamış bildirimlerde tıklama devre dışı
    const isAwaitingDecision =
      isActionableType && isPending && !isExpired && !hasMyDecision;
    const handlePress = React.useCallback(() => {
      if (!isAwaitingDecision && !item.isRead) {
        onMarkRead(item);
      }
    }, [isAwaitingDecision, item, onMarkRead]);

    const unread = !item.isRead;

    // ========== RENDER ==========
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isAwaitingDecision}
        className={`p-4 mb-3 rounded-xl border ${
          unread
            ? "bg-[#1c1d20] border-[#2a2c30]"
            : "bg-[#151618] border-[#1f2023]"
        }`}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View className="flex-row items-center mb-2">
          {unread && (
            <View className="w-2 h-2 rounded-full bg-[#f05e23] mr-2" />
          )}
          <Text
            className={`text-white flex-1 text-base ${unread ? "font-bold" : "font-medium"}`}
          >
            {mapBackendMessage(item.title)}
          </Text>
          <View className="flex-row items-center gap-2">
            {onDelete &&
              !isPending &&
              appointmentStatus !== AppointmentStatus.Approved && (
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={isDeleting}
                  className={`p-1 ${isDeleting ? "opacity-60" : ""}`}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Icon source="delete-outline" size={18} color="#ef4444" />
                  )}
                </TouchableOpacity>
              )}
            <Text className="text-[#8b8c90] text-xs">
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Payload Content */}
        {payload && (
          <View className="mt-2 pt-3 border-t border-[#2a2c30]">
            {/* Date and Time */}
            {payload.date && payload.startTime && payload.endTime && (
              <View className="flex-row justify-end items-center mb-3">
                <Icon source="calendar" size={16} color="#6b7280" />
                <Text className="text-[#9ca3af] text-sm ml-1.5">
                  {formatDate(payload.date)}
                </Text>
                <Text className="text-[#6b7280] mx-1.5">-</Text>
                <Icon source="clock-outline" size={14} color="#6b7280" />
                <Text className="text-[#9ca3af] text-sm ml-1">
                  {formatTime(payload.startTime)} -{" "}
                  {formatTime(payload.endTime)}
                </Text>
              </View>
            )}

            {/* Participants */}
            <View className="mb-3">
              <NotificationParticipantView
                payload={payload}
                recipientRole={recipientRole}
                isStoreInFavorites={isStoreInFavorites}
                isFreeBarberInFavorites={isFreeBarberInFavorites}
                isCustomerInFavorites={isCustomerInFavorites}
                formatRating={formatRating}
              />

              {/* Pricing Policy for FreeBarber */}
              {recipientRole === "freebarber" &&
                payload.store?.pricingType !== undefined &&
                payload.store?.pricingValue !== undefined && (
                  <View className="bg-[#2a2c30] rounded-lg p-2 mb-2 mt-2">
                    <Text className="text-[#9ca3af] text-xs">
                      {formatPricingPolicy(
                        payload.store.pricingType,
                        payload.store.pricingValue,
                      )}
                    </Text>
                  </View>
                )}
            </View>

            {/* Service Offerings */}
            {payload.serviceOfferings &&
              payload.serviceOfferings.length > 0 && (
                <View className="mb-2 mt-2">
                  <Text className="text-[#9ca3af] text-xs mb-1 font-semibold">
                    {t("card.services")}:
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {payload.serviceOfferings.map((service: any) => (
                      <View
                        key={service.id}
                        className="bg-[#2a2c30] rounded-lg px-2 py-1"
                      >
                        <Text className="text-white text-sm">
                          {service.serviceName} {t("card.currencySymbol")}
                          {Number(service.price).toFixed(0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

            {/* Note Section */}
            {payload.note &&
              !(
                (recipientRole === "store" ||
                  userType === UserType.BarberStore) &&
                payload.storeSelectionType === StoreSelectionType.StoreSelection
              ) && (
                <View className="mb-2 mt-2">
                  <Text className="text-[#9ca3af] text-xs mb-1 font-semibold">
                    {t("common.note")}:
                  </Text>
                  <View className="bg-[#2a2c30] rounded-lg px-2 py-2">
                    <Text className="text-white text-sm">{payload.note}</Text>
                  </View>
                </View>
              )}
          </View>
        )}

        {/* Status Display */}
        {showStatus && statusKind && (
          <View className="mt-3 pt-3 border-t border-[#2a2c30]">
            <View
              className={`p-3 rounded-lg border ${STATUS_CONFIG[statusKind].bg} ${STATUS_CONFIG[statusKind].border}`}
            >
              <View className="flex-row items-center justify-center">
                <Icon
                  source={STATUS_CONFIG[statusKind].icon}
                  size={20}
                  color={STATUS_CONFIG[statusKind].color}
                />
                <Text
                  className={`text-xs text-center font-semibold ml-2 ${STATUS_CONFIG[statusKind].text}`}
                >
                  {t(`status.${statusKind}`)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {canShowButtons && (
          <View className="mt-3 pt-3 border-t border-[#2a2c30]">
            {showOnlyRejectButton ? (
              // FreeBarber için sadece REDDET butonu
              <TouchableOpacity
                onPress={handleReject}
                disabled={isProcessing}
                className={`bg-red-600 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Icon source="close-circle" size={18} color="white" />
                    <Text className="text-white text-sm font-semibold">
                      {t("common.reject")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              // ONAY/RED butonları
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleReject}
                  disabled={isProcessing}
                  className={`flex-1 bg-red-600 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <Icon source="close-circle" size={18} color="white" />
                      <Text className="text-white text-sm font-semibold">
                        {t("common.reject")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApprove}
                  disabled={isProcessing}
                  className={`flex-1 bg-green-600 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <Icon source="check-circle" size={18} color="white" />
                      <Text className="text-white text-sm font-semibold">
                        {t("common.approve")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Add Store Button (FreeBarber in StoreSelection flow) */}
        {userType === UserType.FreeBarber &&
          payload?.storeSelectionType === StoreSelectionType.StoreSelection &&
          isPending &&
          !isExpired &&
          !payload?.store && (
            <TouchableOpacity
              onPress={handleAddStore}
              className="mt-3 bg-blue-600 py-3 px-4 rounded-xl flex-row items-center justify-center"
            >
              <Icon source="store-plus" size={18} color="white" />
              <Text className="text-white font-semibold ml-2">
                {t("notification.addStore")}
              </Text>
            </TouchableOpacity>
          )}
      </TouchableOpacity>
    );
  },
  areEqual,
);

NotificationItemOptimized.displayName = "NotificationItemOptimized";
