import { PricingType } from "../../types/store";
import { useAuth } from "../../hook/useAuth";
import { useGetAllNotificationsQuery, useMarkNotificationReadMutation, useDeleteNotificationMutation, useDeleteAllNotificationsMutation, useStoreDecisionMutation, useFreeBarberDecisionMutation, useCustomerDecisionMutation, api } from "../../store/api";
import { useLanguage } from "../../hook/useLanguage";
import { useAppDispatch } from "../../store/hook";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import React, { useCallback, useRef, useState } from "react";
import { AppointmentStatus, DecisionStatus, NotificationDto, StoreSelectionType, UserType } from "../../types";
import { Alert, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Text } from "../common/Text";
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
    const { t } = useLanguage();
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
                Alert.alert(t('common.error'), t('notification.redirectFailed'));
            }
        }, 300);
    }, [router, onClose]);

    const handleMarkRead = useCallback(async (n: NotificationDto) => {
        if (!n.isRead) {
            // Optimistic update: Notification'ı okundu olarak işaretle
            dispatch(api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                const found = draft?.find((x) => x.id === n.id);
                if (found) found.isRead = true;
            }));

            // Optimistic badge count update: Badge count'u anlık olarak azalt
            dispatch(api.util.updateQueryData("getBadgeCounts", undefined, (draft) => {
                if (!draft) {
                    // Query henüz çalışmamışsa optimistic update yapma - query çalıştığında zaten doğru değeri alacak
                    return;
                }
                // Badge count'u azalt (minimum 0)
                draft.unreadNotifications = Math.max(0, (draft.unreadNotifications ?? 0) - 1);
                // Yeni referans oluştur ki React component'leri yeniden render olsun
                return { ...draft };
            }));

            try {
                await markRead(n.id).unwrap();
                // Backend'den badge.updated event'i gelecek ve doğru badge count'u güncelleyecek
            } catch {
                // Hata durumunda optimistic update'i geri al
                dispatch(api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                    const found = draft?.find((x) => x.id === n.id);
                    if (found) found.isRead = false;
                }));
                dispatch(api.util.updateQueryData("getBadgeCounts", undefined, (draft) => {
                    if (!draft) return;
                    draft.unreadNotifications = (draft.unreadNotifications ?? 0) + 1;
                }));
                // RTK Query invalidateTags ile de güncellenecek
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
            Alert.alert(t('notification.info'), t('notification.cannotRejectAfterCustomerApproval'));
            return;
        }

        // Optimistic update: Notification'ın status/decision alanlarını hemen güncelle
        const patchResult = dispatch(api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
            if (!draft) return;
            const foundIndex = draft.findIndex((n) => n.id === notification.id);
            if (foundIndex < 0) return;

            const found = draft[foundIndex];
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

                        // ÖNEMLİ: Yeni bir obje oluştur ki React component'leri yeniden render olsun
                        // Hem notification objesi hem de payload güncellenmeli
                        draft[foundIndex] = {
                            ...found,
                            payloadJson: JSON.stringify(payload),

                            isRead: true
                        };
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
                        return approve ? t('notification.storeApprovalSent') : t('notification.storeRejected');
                    }
                    if (isStoreSelection && userType === UserType.Customer) {
                        return approve ? t('notification.appointmentApproved') : t('notification.storeRejected');
                    }
                    return approve ? t('notification.appointmentApproved') : t('notification.appointmentRejected');
                })();

                // Bildirimi okundu olarak işaretle (otomatik) - Yeni obje referansı oluştur
                dispatch(api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                    const foundIndex = draft?.findIndex((x) => x.id === notification.id);
                    if (foundIndex >= 0) {
                        const found = draft[foundIndex];
                        // Yeni obje referansı oluştur ki React component'i yeniden render olsun
                        draft[foundIndex] = {
                            ...found,
                            isRead: true
                        };
                    }
                }));

                // Backend'e okundu olarak işaretle (async, hata önemsiz)
                if (!notification.isRead) {
                    try {
                        await markRead(notification.id).unwrap();
                    } catch {
                        // Okundu işaretleme hatası önemsiz, devam et
                    }
                }

                // Badge count backend'den badge.updated event'i ile otomatik güncelleniyor
                // Notification listesi zaten updateQueryData ile güncellendi

                Alert.alert(t('common.success'), successMessage);
            } else {
                // Hata durumunda optimistic update'i geri al
                patchResult.undo();
                Alert.alert(t('common.error'), result.message || t('common.operationFailed'));
            }
        } catch (error: any) {
            // Hata durumunda optimistic update'i geri al
            patchResult.undo();
            Alert.alert(t('common.error'), error?.data?.message || error?.message || t('common.operationFailed'));
        }
    }, [userType, storeDecision, freeBarberDecision, customerDecision, dispatch]);

    const handleDelete = useCallback(async (notification: NotificationDto) => {
        Alert.alert(
            t('notification.deleteNotification'),
            t('notification.deleteNotificationConfirm'),
            [
                { text: t('common.cancel'), style: "cancel" },
                {
                    text: t('common.delete'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteNotification(notification.id).unwrap();
                            if (onDeleteSuccess) {
                                onDeleteSuccess(t('notification.notificationDeleted'));
                            }
                        } catch (error: any) {
                            const errorMessage = error?.data?.message || error?.message || t('notification.notificationDeleteFailed');
                            if (onDeleteError) {
                                onDeleteError(errorMessage);
                            } else {
                                Alert.alert(t('common.error'), errorMessage);
                            }
                        }
                    },
                },
            ]
        );
    }, [deleteNotification, onDeleteSuccess, onDeleteError]);

    const handleDeleteAll = useCallback(async () => {
        Alert.alert(
            t('notification.deleteAllNotifications'),
            t('notification.deleteAllNotificationsConfirm'),
            [
                { text: t('common.cancel'), style: "cancel" },
                {
                    text: t('common.delete'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteAllNotifications().unwrap();
                            if (onDeleteSuccess) {
                                onDeleteSuccess(t('notification.notificationsDeleted'));
                            }
                        } catch (error: any) {
                            const errorMessage = error?.data?.message || error?.message || t('notification.notificationsDeleteFailed');
                            if (onDeleteError) {
                                onDeleteError(errorMessage);
                            } else {
                                Alert.alert(t('common.error'), errorMessage);
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
        if (pricingType === PricingType.Percent) return t('card.pricingPercent', { value: pricingValue });
        if (pricingType === PricingType.Rent) return t('card.pricingRent', { value: pricingValue });
        return null;
    }, [t]);

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
