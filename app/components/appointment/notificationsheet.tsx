import { PricingType } from "../../types/store";
import { useAuth } from "../../hook/useAuth";
import { useGetAllNotificationsQuery, useMarkNotificationReadMutation, useStoreDecisionMutation, useFreeBarberDecisionMutation, api } from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import React, { useCallback } from "react";
import { AppointmentStatus, NotificationDto, UserType } from "../../types";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { NotificationItem } from "./notificationdetail";

// ---------------------------------------------------------------------------
// 2. Ana NotificationsSheet Bileşeni
// ---------------------------------------------------------------------------
export function NotificationsSheet({
    onClose,
    onOpenAppointmentDecision,
    autoOpenFirstUnread = false,
}: {
    onClose?: () => void;
    onOpenAppointmentDecision?: (appointmentId: string, notificationId: string) => void;
    autoOpenFirstUnread?: boolean;
}) {
    const dispatch = useAppDispatch();
    const { data, isFetching, refetch } = useGetAllNotificationsQuery();
    const [markRead] = useMarkNotificationReadMutation();
    const { userType } = useAuth();
    const [storeDecision, { isLoading: isStoreDeciding }] = useStoreDecisionMutation();
    const [freeBarberDecision, { isLoading: isFreeBarberDeciding }] = useFreeBarberDecisionMutation();

    const handleMarkRead = useCallback(async (n: NotificationDto) => {
        if (!n.isRead) {
            dispatch(api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                const found = draft?.find((x) => x.id === n.id);
                if (found) found.isRead = true;
            }));
            try { await markRead(n.id).unwrap(); } catch { refetch(); }
        }
    }, [dispatch, markRead, refetch]);

    // --- Anlık UI Güncellemesi İçin Geliştirilmiş HandleDecision ---
    const handleDecision = useCallback(async (notification: NotificationDto, approve: boolean) => {
        if (!notification.appointmentId) return;

        try {
            let result;
            if (userType === UserType.BarberStore) {
                result = await storeDecision({ appointmentId: notification.appointmentId, approve }).unwrap();
            } else if (userType === UserType.FreeBarber) {
                result = await freeBarberDecision({ appointmentId: notification.appointmentId, approve }).unwrap();
            } else {
                return;
            }

            if (result.success) {
                // Cache'i güncelle: Hem okundu yap, hem de JSON içindeki statüsü değiştir.
                dispatch(
                    api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                        const found = draft?.find((x) => x.id === notification.id);
                        if (found) {
                            found.isRead = true;
                            // Payload JSON'ı parse et, statüsü güncelle ve geri yaz
                            try {
                                if (found.payloadJson) {
                                    const p = JSON.parse(found.payloadJson);
                                    // Status'ü güncelle ki butonlar kaybolup yeşil/kırmızı kutu gelsin
                                    p.status = approve ? AppointmentStatus.Approved : AppointmentStatus.Rejected;
                                    found.payloadJson = JSON.stringify(p);
                                }
                            } catch (e) {
                                console.error("Payload update error", e);
                            }
                        }
                    })
                );

                Alert.alert("Başarılı", approve ? "Randevu onaylandı." : "Randevu reddedildi.");
            } else {
                Alert.alert("Hata", result.message || "İşlem başarısız.");
            }
        } catch (error: any) {
            Alert.alert("Hata", error?.data?.message || error?.message || "İşlem başarısız.");
        }
    }, [userType, storeDecision, freeBarberDecision, dispatch]);

    // Helper functions
    const formatTime = useCallback((timeStr?: string) => {
        if (!timeStr) return "";
        try { const parts = timeStr.split(":"); return `${parts[0]}:${parts[1]}`; } catch { return timeStr; }
    }, []);

    const formatDate = useCallback((dateStr: string) => {
        try { return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return dateStr; }
    }, []);

    const formatPricingPolicy = useCallback((pricingType?: number, pricingValue?: number) => {
        if (pricingType === undefined || pricingValue === undefined) return null;
        if (pricingType === PricingType.Percent) return `Fiyatlandırma: Yapılan işlemlerin toplamının %${pricingValue} alınır`;
        if (pricingType === PricingType.Rent) return `Fiyatlandırma: Koltuk kirası (Saatlik: ${pricingValue}₺/saat)`;
        return null;
    }, []);

    const formatRating = useCallback((rating?: number) => rating?.toFixed(1) ?? null, []);

    // renderItem artık sadece NotificationItem'ı çağırıyor
    const renderItem = useCallback(({ item }: { item: NotificationDto }) => {
        return (
            <NotificationItem
                item={item}
                userType={userType}
                onMarkRead={handleMarkRead}
                onDecision={handleDecision}
                isProcessing={isStoreDeciding || isFreeBarberDeciding}
                formatDate={formatDate}
                formatTime={formatTime}
                formatPricingPolicy={formatPricingPolicy}
                formatRating={formatRating}
            />
        );
    }, [userType, handleMarkRead, handleDecision, isStoreDeciding, isFreeBarberDeciding, formatDate, formatTime, formatPricingPolicy, formatRating]);

    return (
        <View className="flex-1 px-3">
            <View className="flex-row justify-between items-center mb-2.5">
                <Text className="text-white text-lg font-bold">Bildirimler</Text>
                <TouchableOpacity onPress={onClose}>
                    <Text className="text-[#f05e23] font-semibold">Kapat</Text>
                </TouchableOpacity>
            </View>

            <BottomSheetFlatList
                data={data ?? []}
                keyExtractor={(x: NotificationDto) => x.id}
                refreshing={isFetching}
                onRefresh={refetch}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
                renderItem={renderItem}
                ListEmptyComponent={
                    <View className="p-4.5">
                        <Text className="text-[#8b8c90]">Bildirim yok</Text>
                    </View>
                }
            />
        </View>
    );
}