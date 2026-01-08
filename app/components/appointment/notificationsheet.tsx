import { PricingType } from "../../types/store";
import { useAuth } from "../../hook/useAuth";
import { useGetAllNotificationsQuery, useMarkNotificationReadMutation, useDeleteNotificationMutation, useDeleteAllNotificationsMutation, useStoreDecisionMutation, useFreeBarberDecisionMutation, useCustomerDecisionMutation, api } from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import React, { useCallback, useRef, useState } from "react";
import { AppointmentStatus, DecisionStatus, NotificationDto, StoreSelectionType, UserType } from "../../types";
import { Alert, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Icon } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationItem } from "./notificationdetail";
import { useRouter } from "expo-router";

// ---------------------------------------------------------------------------
// 2. Ana NotificationsSheet Bileşeni
// ---------------------------------------------------------------------------
export function NotificationsSheet({
    onClose,
    onOpenAppointmentDecision,
    autoOpenFirstUnread = false,
    onDeleteSuccess,
    onDeleteInfo,
    onDeleteError,
}: {
    onClose?: () => void;
    onOpenAppointmentDecision?: (appointmentId: string, notificationId: string) => void;
    autoOpenFirstUnread?: boolean;
    onDeleteSuccess?: (message: string) => void;
    onDeleteInfo?: (message: string) => void;
    onDeleteError?: (message: string) => void;
}) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { data, isFetching, refetch } = useGetAllNotificationsQuery();
    const [markRead] = useMarkNotificationReadMutation();
    const [deleteNotification, { isLoading: isDeletingNotification }] = useDeleteNotificationMutation();
    const [deleteAllNotifications, { isLoading: isDeletingAllNotifications }] = useDeleteAllNotificationsMutation();
    const { userType } = useAuth();
    const [storeDecision, { isLoading: isStoreDeciding }] = useStoreDecisionMutation();
    const [freeBarberDecision, { isLoading: isFreeBarberDeciding }] = useFreeBarberDecisionMutation();
    const [customerDecision, { isLoading: isCustomerDeciding }] = useCustomerDecisionMutation();

    // FreeBarber için "Dükkan Ekle" butonu handler
    const handleAddStore = useCallback((appointmentId: string) => {
        if (onClose) {
            onClose();
        }

        setTimeout(() => {
            try {
                router.push({
                    pathname: "/(freebarbertabs)/(panel)",
                    params: {
                        mode: "add-store",
                        appointmentId: appointmentId
                    },
                });
            } catch (error) {
                Alert.alert("Hata", "Yönlendirme başarısız oldu.");
            }
        }, 300);
    }, [router, onClose]);

    const handleMarkRead = useCallback(async (n: NotificationDto) => {
        if (!n.isRead) {
            dispatch(api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                const found = draft?.find((x) => x.id === n.id);
                if (found) found.isRead = true;
            }));
            try { await markRead(n.id).unwrap(); } catch {
                // RTK Query optimistic update zaten yapıldı, hata durumunda cache'i geri alacak
            }
        }
    }, [dispatch, markRead]);

    // --- Anlık UI Güncellemesi İçin Geliştirilmiş HandleDecision ---
    const handleDecision = useCallback(async (notification: NotificationDto, approve: boolean) => {
        if (!notification.appointmentId) return;

        let parsedPayload: any = null;
        try {
            if (notification.payloadJson && notification.payloadJson.trim() !== '' && notification.payloadJson !== '{}') {
                parsedPayload = JSON.parse(notification.payloadJson);
            }
        } catch {
            parsedPayload = null;
        }

        const isStoreSelection = parsedPayload?.storeSelectionType === StoreSelectionType.StoreSelection;
        const decisionValue = approve ? DecisionStatus.Approved : DecisionStatus.Rejected;
        const shouldUpdateStatus =
            !isStoreSelection ||
            (userType === UserType.Customer && approve) ||
            (userType === UserType.FreeBarber && !approve);

        if (
            userType === UserType.FreeBarber &&
            isStoreSelection &&
            (parsedPayload?.customerDecision === DecisionStatus.Approved ||
                parsedPayload?.status === AppointmentStatus.Approved)
        ) {
            Alert.alert("Bilgi", "Müşteri onayı verildiği için bu randevu artık reddedilemez.");
            return;
        }

        // Optimistic update: Notification'ın status/decision alanlarını hemen güncelle
        const patchResult = dispatch(api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
            if (!draft) return;
            const found = draft.find((n) => n.id === notification.id);
            if (found && found.payloadJson && found.payloadJson.trim() !== '' && found.payloadJson !== '{}') {
                try {
                    const payload = JSON.parse(found.payloadJson);
                    if (payload && typeof payload === 'object') {
                        if (userType === UserType.BarberStore) {
                            payload.storeDecision = decisionValue;
                        } else if (userType === UserType.FreeBarber) {
                            payload.freeBarberDecision = decisionValue;
                        } else if (userType === UserType.Customer) {
                            payload.customerDecision = decisionValue;
                        }

                        if (shouldUpdateStatus) {
                            payload.status = approve ? AppointmentStatus.Approved : AppointmentStatus.Rejected;
                        }
                        found.payloadJson = JSON.stringify(payload);
                    }
                } catch {
                    // Parse hatası durumunda devam et
                }
            }
        }));

        try {
            let result;
            if (userType === UserType.BarberStore) {
                result = await storeDecision({ appointmentId: notification.appointmentId, approve }).unwrap();
            } else if (userType === UserType.FreeBarber) {
                result = await freeBarberDecision({ appointmentId: notification.appointmentId, approve }).unwrap();
            } else if (userType === UserType.Customer) {
                result = await customerDecision({ appointmentId: notification.appointmentId, approve }).unwrap();
            } else {
                // userType yoksa optimistic update'i geri al
                patchResult.undo();
                return;
            }

            if (result.success) {
                const successMessage = (() => {
                    if (isStoreSelection && userType === UserType.BarberStore) {
                        return approve ? "Dükkan onayı gönderildi." : "Dükkan reddedildi.";
                    }
                    if (isStoreSelection && userType === UserType.Customer) {
                        return approve ? "Randevu onaylandı." : "Dükkan reddedildi.";
                    }
                    return approve ? "Randevu onaylandı." : "Randevu reddedildi.";
                })();

                // Bildirimi okundu olarak işaretle (otomatik)
                if (!notification.isRead) {
                    dispatch(api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                        const found = draft?.find((x) => x.id === notification.id);
                        if (found) found.isRead = true;
                    }));
                    try {
                        await markRead(notification.id).unwrap();
                    } catch {
                        // Okundu işaretleme hatası önemsiz, devam et
                    }
                }

                // Badge count backend'den badge.updated event'i ile otomatik güncelleniyor
                // Notification listesi zaten updateQueryData ile güncellendi

                Alert.alert("Başarılı", successMessage);
            } else {
                // Hata durumunda optimistic update'i geri al
                patchResult.undo();
                Alert.alert("Hata", result.message || "İşlem başarısız.");
            }
        } catch (error: any) {
            // Hata durumunda optimistic update'i geri al
            patchResult.undo();
            Alert.alert("Hata", error?.data?.message || error?.message || "İşlem başarısız.");
        }
    }, [userType, storeDecision, freeBarberDecision, customerDecision, dispatch]);

    const handleDelete = useCallback(async (notification: NotificationDto) => {
        Alert.alert(
            "Bildirimi Sil",
            "Bu bildirimi silmek istediğinize emin misiniz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteNotification(notification.id).unwrap();
                            if (onDeleteSuccess) {
                                onDeleteSuccess("Bildirim başarıyla silindi.");
                            }
                        } catch (error: any) {
                            const errorMessage = error?.data?.message || error?.message || "Bildirim silinemedi.";
                            if (onDeleteError) {
                                onDeleteError(errorMessage);
                            } else {
                                Alert.alert("Hata", errorMessage);
                            }
                        }
                    },
                },
            ]
        );
    }, [deleteNotification, onDeleteSuccess, onDeleteError]);

    const handleDeleteAll = useCallback(async () => {
        Alert.alert(
            "Tüm Bildirimleri Sil",
            "Silinebilir tüm bildirimleri silmek istediğinize emin misiniz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteAllNotifications().unwrap();
                            if (onDeleteSuccess) {
                                onDeleteSuccess("Bildirimler başarıyla silindi.");
                            }
                        } catch (error: any) {
                            const errorMessage = error?.data?.message || error?.message || "Bildirimler silinemedi.";
                            if (onDeleteError) {
                                onDeleteError(errorMessage);
                            } else {
                                Alert.alert("Hata", errorMessage);
                            }
                        }
                    },
                },
            ]
        );
    }, [deleteAllNotifications, onDeleteSuccess, onDeleteError]);

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
                onDelete={handleDelete}
                isProcessing={isStoreDeciding || isFreeBarberDeciding || isCustomerDeciding}
                isDeleting={isDeletingNotification}
                formatDate={formatDate}
                formatTime={formatTime}
                formatPricingPolicy={formatPricingPolicy}
                formatRating={formatRating}
                onAddStore={handleAddStore}
            />
        );
    }, [userType, handleMarkRead, handleDecision, handleDelete, isStoreDeciding, isFreeBarberDeciding, isCustomerDeciding, isDeletingNotification, formatDate, formatTime, formatPricingPolicy, formatRating, handleAddStore]);


    return (
        <View className="flex-1 px-3">
            <View className="flex-row justify-between items-center my-3">
                <Text className="text-white text-lg font-bold">Bildirimler</Text>
                <View className="flex-row items-center gap-3">
                    {data && data.length > 0 && (
                        <TouchableOpacity
                            onPress={handleDeleteAll}
                            disabled={isDeletingAllNotifications}
                            className={`bg-red-600 rounded-lg px-3 py-2 flex-row items-center gap-1.5 ${isDeletingAllNotifications ? 'opacity-60' : ''}`}
                        >
                            {isDeletingAllNotifications ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Icon source="delete-sweep" size={18} color="white" />
                            )}
                            <Text className="text-white font-semibold text-sm">Tümünü Sil</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={onClose}>
                        <Text className="text-[#f05e23] font-semibold">Kapat</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <BottomSheetFlatList
                data={data ?? []}
                keyExtractor={(x: NotificationDto) => x.id}
                refreshing={isFetching}
                onRefresh={refetch}
                style={{ flex: 1, }}
                contentContainerStyle={{
                    flexGrow: 1 // Liste boş olsa bile kaydırma davranışını korur
                }}
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
