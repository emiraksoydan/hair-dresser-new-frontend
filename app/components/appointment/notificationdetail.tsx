import React, { useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Icon } from "react-native-paper";
import { useGetAllNotificationsQuery, useMarkNotificationReadMutation, useStoreDecisionMutation, useFreeBarberDecisionMutation, api } from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import type { NotificationDto, NotificationPayload } from "../../types";
import { NotificationType, AppointmentStatus } from "../../types";
import { useAuth } from "../../hook/useAuth";
import { UserType, BarberType } from "../../types";
import { getBarberTypeName } from "../../utils/store/barber-type";
import { PricingType } from "../../types/store";
import { logger } from "../../utils/common/logger";

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

    // Otomatik read yapılmıyor - bildirimler sadece kullanıcı aksiyonları ile read olacak

    const handleMarkRead = useCallback(
        async (n: NotificationDto) => {
            if (!n.isRead) {
                dispatch(
                    api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                        const found = draft?.find((x) => x.id === n.id);
                        if (found) found.isRead = true;
                    })
                );
                try {
                    await markRead(n.id).unwrap();
                } catch {
                    refetch();
                }
            }
        },
        [dispatch, markRead, refetch]
    );

    const handleDecision = useCallback(async (notification: NotificationDto, approve: boolean) => {
        if (!notification.appointmentId) return;

        let payload: NotificationPayload | null = null;
        try {
            if (notification.payloadJson && notification.payloadJson.trim() !== '' && notification.payloadJson !== '{}') {
                payload = JSON.parse(notification.payloadJson);
            }
        } catch { }

        // Backend zaten expires kontrolü yapıyor (EnsurePendingNotExpiredAndHandleAsync)
        // Burada sadece backend'e istek gönder, backend hata döndürürse göster
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
                dispatch(
                    api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                        const found = draft?.find((x) => x.id === notification.id);
                        if (found) found.isRead = true;
                    })
                );
                refetch();
                Alert.alert("Başarılı", approve ? "Randevu onaylandı." : "Randevu reddedildi.");
            } else {
                // Backend'den gelen hata mesajını göster (expires kontrolü dahil)
                Alert.alert("Hata", result.message || "İşlem başarısız.");
            }
        } catch (error: any) {
            // Backend'den gelen hata mesajını göster (expires kontrolü dahil)
            Alert.alert("Hata", error?.data?.message || error?.message || "İşlem başarısız.");
        }
    }, [userType, storeDecision, freeBarberDecision, dispatch, refetch]);

    const formatTime = useCallback((timeStr?: string) => {
        if (!timeStr) return "";
        try {
            // "HH:mm:ss" veya "HH:mm" formatından sadece saat:dakika al
            const parts = timeStr.split(":");
            return `${parts[0]}:${parts[1]}`;
        } catch {
            return timeStr;
        }
    }, []);

    const formatDate = useCallback((dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }, []);

    const formatPricingPolicy = useCallback((pricingType?: number, pricingValue?: number) => {
        if (pricingType === undefined || pricingValue === undefined) return null;
        if (pricingType === PricingType.Percent) {
            return `Fiyatlandırma: Yapılan işlemlerin toplamının %${pricingValue} alınır`;
        } else if (pricingType === PricingType.Rent) {
            return `Fiyatlandırma: Koltuk kirası (Saatlik: ${pricingValue}₺/saat)`;
        }
        return null;
    }, []);

    const formatRating = useCallback((rating?: number) => {
        if (rating === undefined || rating === null) return null;
        return rating.toFixed(1);
    }, []);

    const renderItem = useCallback(({ item }: { item: NotificationDto }) => {
        const unread = !item.isRead;
        let payload: NotificationPayload | null = null;
        try {
            if (item.payloadJson && item.payloadJson.trim() !== '' && item.payloadJson !== '{}') {
                payload = JSON.parse(item.payloadJson);
            }
        } catch { }

        logger.debug('Notification Payload:', payload);

        // AppointmentCreated türünde ve Pending durumunda butonları göster
        const status = (payload?.status as AppointmentStatus | undefined) ?? AppointmentStatus.Pending;
        const hasCustomer = !!payload?.customer;
        const hasStore = !!payload?.store;
        const hasFreeBarber = !!payload?.freeBarber;
        const recipientRole = payload?.recipientRole;
        const storeType = payload?.store?.type;

        // Sadece AppointmentCreated türünde bildirimlerde butonlar gösterilecek
        // Type kontrolü: storeType undefined olabilir veya 0, 1, 2 değerlerini alabilir
        // Type 0 (MaleHairdresser), 1 (FemaleHairdresser), 2 (BeautySalon) veya undefined olabilir
        // Decision butonları type'a bakılmaksızın gösterilmeli (type kontrolü sadece görsel gösterim için)
        const showDecisionButtons = item.type === NotificationType.AppointmentCreated &&
            status === AppointmentStatus.Pending &&
            ((userType === UserType.BarberStore && (recipientRole === 'store' || (hasStore && !hasFreeBarber))) ||
                (userType === UserType.FreeBarber && (recipientRole === 'freebarber' || (hasFreeBarber && !hasStore))));

        console.log(showDecisionButtons);


        // Expires kontrolü - Backend'den gelen pendingExpiresAt kullan (UTC formatında)
        let expiresAt: Date | null = null;
        if (payload?.pendingExpiresAt) {
            // UTC string'den Date'e çevir (backend UTC gönderiyor)
            expiresAt = new Date(payload.pendingExpiresAt);
        } else {
            // Fallback: createdAt + 5 dakika (UTC)
            const createdAt = new Date(item.createdAt);
            expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000);
        }

        // UTC tarihlerini direkt karşılaştır (her ikisi de UTC formatında)
        const nowUtc = new Date(); // JavaScript Date zaten UTC'de çalışıyor


        const isExpired = nowUtc > expiresAt;

        const serviceOfferings = payload?.serviceOfferings || [];

        // Created türündeki bildirimler için card'a tıklanınca read yapılmamalı
        // Sadece onay/red butonlarına tıklandığında read olacak
        const isCreatedType = item.type === NotificationType.AppointmentCreated && status === AppointmentStatus.Pending && showDecisionButtons;

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                    // Created türündeki bildirimler için tıklanınca read yapma
                    if (!isCreatedType && unread) {
                        handleMarkRead(item);
                    }
                }}
                disabled={isCreatedType}
            >
                <View
                    className={`p-4 rounded-xl mb-3 border ${unread ? "bg-[#1c1d20] border-[#2a2c30]" : "bg-[#151618] border-[#1f2023]"}`}
                >
                    <View className="flex-row items-center mb-2">
                        {unread && (
                            <View className="w-2 h-2 rounded-full bg-[#f05e23] mr-2" />
                        )}
                        <Text className={`text-white flex-1 text-base ${unread ? "font-bold" : "font-medium"}`}>
                            {item.title}
                        </Text>
                        <Text className="text-[#8b8c90] text-xs">
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>

                    {/* Detaylı Payload Bilgileri */}
                    {payload && (
                        <View className="mt-2 pt-3 border-t border-[#2a2c30]">
                            {/* Tarih ve Saat - Sadece free barber dükkan seçtiğinde veya müşteri istek attığında göster */}
                            {/* Dükkan free barberi çağırdıysa (randevu saati/tarihi yok) gösterilmez */}
                            {payload.date && payload.startTime && payload.endTime && (
                                <View className="flex-row justify-end items-center mb-3">
                                    <Icon source="calendar" size={16} color="#6b7280" />
                                    <Text className="text-[#9ca3af] text-sm ml-1.5">
                                        {formatDate(payload.date)}
                                    </Text>
                                    <Text className="text-[#6b7280] mx-1.5">•</Text>
                                    <Icon source="clock-outline" size={14} color="#6b7280" />
                                    <Text className="text-[#9ca3af] text-sm ml-1">
                                        {formatTime(payload.startTime)} - {formatTime(payload.endTime)}
                                    </Text>
                                </View>
                            )}

                            {/* Row Yapısı: Müşteri (sol) ve FreeBarber/ManuelBarber/Koltuk (sağ) */}
                            {/* Dükkan bildiriminde */}
                            {recipientRole === 'store' && (
                                <View className="flex-row gap-3 mb-3">
                                    {/* Sol: Müşteri */}
                                    {payload.customer && (
                                        <View className="flex-1">
                                            <View className="flex-row items-center mb-1">
                                                {payload.customer.avatarUrl ? (
                                                    <Image
                                                        source={{ uri: payload.customer.avatarUrl }}
                                                        className="w-12 h-12 rounded-full mr-2"
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                        <Icon source="account" size={24} color="#6b7280" />
                                                    </View>
                                                )}
                                                <View className="flex-1">
                                                    <Text className="text-[#9ca3af] text-xs">Müşteri</Text>
                                                    <Text className="text-white text-sm font-semibold">
                                                        {payload.customer.displayName || 'Müşteri'}
                                                    </Text>
                                                    {payload.isCustomerInFavorites && (
                                                        <Text className="text-[#f05e23] text-xs mt-0.5">⭐ Favorilerinizde</Text>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    {/* Sağ: FreeBarber veya ManuelBarber veya Koltuk */}
                                    <View className="flex-1">
                                        {payload.freeBarber ? (
                                            // FreeBarber varsa
                                            <View className="flex-row items-center mb-1">
                                                {payload.freeBarber.avatarUrl ? (
                                                    <Image
                                                        source={{ uri: payload.freeBarber.avatarUrl }}
                                                        className="w-12 h-12 rounded-full mr-2"
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                        <Icon source="account-supervisor" size={24} color="#6b7280" />
                                                    </View>
                                                )}
                                                <View className="flex-1">
                                                    <Text className="text-[#9ca3af] text-xs">Traş edecek kişi</Text>
                                                    <Text className="text-white text-sm font-semibold">
                                                        {payload.freeBarber.displayName}
                                                    </Text>
                                                    {payload.freeBarber.type !== undefined && (
                                                        <Text className="text-[#9ca3af] text-xs mt-0.5">
                                                            {getBarberTypeName(payload.freeBarber.type as BarberType)}
                                                        </Text>
                                                    )}
                                                    {payload.freeBarber.rating !== undefined && (
                                                        <View className="flex-row items-center mt-0.5">
                                                            <Icon source="star" size={12} color="#fbbf24" />
                                                            <Text className="text-[#fbbf24] text-xs ml-1">
                                                                {formatRating(payload.freeBarber.rating)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    {payload.isFreeBarberInFavorites && (
                                                        <Text className="text-[#f05e23] text-xs mt-0.5">⭐ Favorilerinizde</Text>
                                                    )}
                                                </View>
                                            </View>
                                        ) : payload.chair?.manuelBarberId ? (
                                            // ManuelBarber varsa
                                            <View className="flex-row items-center mb-1">
                                                {payload.chair.manuelBarberImageUrl ? (
                                                    <Image
                                                        source={{ uri: payload.chair.manuelBarberImageUrl }}
                                                        className="w-12 h-12 rounded-full mr-2"
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                        <Icon source="account" size={24} color="#6b7280" />
                                                    </View>
                                                )}
                                                <View className="flex-1">
                                                    <Text className="text-[#9ca3af] text-xs">Traş edecek kişi</Text>
                                                    <Text className="text-white text-sm font-semibold">
                                                        {payload.chair.manuelBarberName}
                                                    </Text>
                                                    {payload.chair.manuelBarberRating !== undefined && (
                                                        <View className="flex-row items-center mt-0.5">
                                                            <Icon source="star" size={12} color="#fbbf24" />
                                                            <Text className="text-[#fbbf24] text-xs ml-1">
                                                                {formatRating(payload.chair.manuelBarberRating)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ) : payload.chair?.chairName ? (
                                            // Sadece koltuk varsa
                                            <View className="flex-row items-center mb-1">
                                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                    <Icon source="seat" size={24} color="#6b7280" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-white text-sm font-semibold">
                                                        {payload.chair.chairName}
                                                    </Text>
                                                </View>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            )}

                            {/* FreeBarber bildiriminde */}
                            {recipientRole === 'freebarber' && (
                                <View className="mb-3">
                                    {/* Dükkan Bilgileri */}
                                    {payload.store && (
                                        <View className="flex-row items-center mb-2">
                                            {payload.store.imageUrl ? (
                                                <Image
                                                    source={{ uri: payload.store.imageUrl }}
                                                    className="w-12 h-12 rounded-full mr-2"
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                    <Icon source="store" size={24} color="#6b7280" />
                                                </View>
                                            )}
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs">Berber Dükkanı</Text>
                                                <Text className="text-white text-sm font-semibold">
                                                    {payload.store.storeName}
                                                </Text>
                                                {payload.store.type !== undefined && (
                                                    <Text className="text-[#9ca3af] text-xs mt-0.5">
                                                        {getBarberTypeName(payload.store.type as BarberType)}
                                                    </Text>
                                                )}
                                                {payload.store.rating !== undefined && (
                                                    <View className="flex-row items-center mt-0.5">
                                                        <Icon source="star" size={12} color="#fbbf24" />
                                                        <Text className="text-[#fbbf24] text-xs ml-1">
                                                            {formatRating(payload.store.rating)}
                                                        </Text>
                                                    </View>
                                                )}
                                                {payload.isStoreInFavorites && (
                                                    <Text className="text-[#f05e23] text-xs mt-0.5">⭐ Favorilerinizde</Text>
                                                )}
                                            </View>
                                        </View>
                                    )}

                                    {/* Fiyatlandırma Politikası */}
                                    {formatPricingPolicy(payload.store?.pricingType, payload.store?.pricingValue) && (
                                        <View className="bg-[#2a2c30] rounded-lg p-2 mb-2">
                                            <Text className="text-[#9ca3af] text-xs">
                                                {formatPricingPolicy(payload.store?.pricingType, payload.store?.pricingValue)}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Müşteri (varsa) */}
                                    {payload.customer && (
                                        <View className="flex-row items-center mt-2">
                                            {payload.customer.avatarUrl ? (
                                                <Image
                                                    source={{ uri: payload.customer.avatarUrl }}
                                                    className="w-10 h-10 rounded-full mr-2"
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View className="w-10 h-10 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                    <Icon source="account" size={20} color="#6b7280" />
                                                </View>
                                            )}
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs">Müşteri</Text>
                                                <Text className="text-white text-sm font-semibold">
                                                    {payload.customer.displayName || 'Müşteri'}
                                                </Text>
                                                {payload.isCustomerInFavorites && (
                                                    <Text className="text-[#f05e23] text-xs mt-0.5">⭐ Favorilerinizde</Text>
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* FreeBarber dükkan seçtiğinde dükkanda görülecek */}
                            {recipientRole === 'store' && payload.freeBarber && (
                                <View className="flex-row gap-3 mb-3">
                                    {/* FreeBarber */}
                                    <View className="flex-1">
                                        <View className="flex-row items-center mb-1">
                                            {payload.freeBarber.avatarUrl ? (
                                                <Image
                                                    source={{ uri: payload.freeBarber.avatarUrl }}
                                                    className="w-12 h-12 rounded-full mr-2"
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                    <Icon source="account-supervisor" size={24} color="#6b7280" />
                                                </View>
                                            )}
                                            <View className="flex-1">
                                                <Text className="text-white text-sm font-semibold">
                                                    {payload.freeBarber.displayName}
                                                </Text>
                                                {payload.freeBarber.type !== undefined && (
                                                    <Text className="text-[#9ca3af] text-xs mt-0.5">
                                                        {getBarberTypeName(payload.freeBarber.type as BarberType)}
                                                    </Text>
                                                )}
                                                {payload.freeBarber.rating !== undefined && (
                                                    <View className="flex-row items-center mt-0.5">
                                                        <Icon source="star" size={12} color="#fbbf24" />
                                                        <Text className="text-[#fbbf24] text-xs ml-1">
                                                            {formatRating(payload.freeBarber.rating)}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                                    {/* Koltuk */}
                                    {payload.chair?.chairName && (
                                        <View className="flex-1">
                                            <View className="flex-row items-center mb-1">
                                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                    <Icon source="seat" size={24} color="#6b7280" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-white text-sm font-semibold">
                                                        {payload.chair.chairName}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}


                            {/* Hizmetler */}
                            {serviceOfferings.length > 0 && (
                                <View className="mb-2 mt-2 flex-row items-center">
                                    <Text className="text-[#9ca3af] text-xs mb-1 font-semibold">
                                        Hizmetler:
                                    </Text>
                                    <ScrollView className="gap-1.5" horizontal showsHorizontalScrollIndicator={false}>
                                        {serviceOfferings.map((service) => (
                                            <View
                                                key={service.id}
                                                className="bg-[#2a2c30] rounded-lg px-2 py-1"
                                            >
                                                <Text className="text-white text-sm">
                                                    {service.serviceName} ₺{Number(service.price).toFixed(0)}
                                                </Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Pending durumunda onay/red butonları */}
                            {showDecisionButtons && (
                                <View className="mt-3 pt-3 border-t border-[#2a2c30]">
                                    {isExpired ? (
                                        <View className="p-3 bg-red-900/20 rounded-lg border border-red-800/30">
                                            <Text className="text-red-400 text-xs text-center font-semibold">
                                                ⏰ Süre Doldu
                                            </Text>
                                            <Text className="text-[#9ca3af] text-xs text-center mt-1">
                                                Randevu kararı için süre dolmuş.
                                            </Text>
                                        </View>
                                    ) : (
                                        <View className="flex-row gap-2">
                                            <TouchableOpacity
                                                onPress={() => handleDecision(item, false)}
                                                disabled={isStoreDeciding || isFreeBarberDeciding}
                                                className={`flex-1 bg-red-600 rounded-xl py-2.5 items-center justify-center ${(isStoreDeciding || isFreeBarberDeciding) ? "opacity-60" : "opacity-100"}`}
                                            >
                                                {isStoreDeciding || isFreeBarberDeciding ? (
                                                    <ActivityIndicator color="white" size="small" />
                                                ) : (
                                                    <View className="items-center">
                                                        <Icon source="close-circle" size={20} color="white" />
                                                        <Text className="text-white text-xs font-semibold mt-1">
                                                            Reddet
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDecision(item, true)}
                                                disabled={isStoreDeciding || isFreeBarberDeciding}
                                                className={`flex-1 bg-green-600 rounded-xl py-2.5 items-center justify-center ${(isStoreDeciding || isFreeBarberDeciding) ? "opacity-60" : "opacity-100"}`}
                                            >
                                                {isStoreDeciding || isFreeBarberDeciding ? (
                                                    <ActivityIndicator color="white" size="small" />
                                                ) : (
                                                    <View className="items-center">
                                                        <Icon source="check-circle" size={20} color="white" />
                                                        <Text className="text-white text-xs font-semibold mt-1">
                                                            Onayla
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Created türündeki bildirimler için "Okundu olarak işaretle" butonu gösterilmez
                    Çünkü sadece onay/red butonlarına tıklandığında read olacak */}
                    {/* Diğer bildirimler için card'a tıklanınca otomatik read yapılıyor, bu yüzden buton gerekmez */}
                </View>
            </TouchableOpacity>
        );
    }, [userType, handleMarkRead, handleDecision, isStoreDeciding, isFreeBarberDeciding, formatDate, formatTime]);

    return (
        <>
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
                    contentContainerStyle={{ paddingBottom: 18 }}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View className="p-4.5">
                            <Text className="text-[#8b8c90]">Bildirim yok</Text>
                        </View>
                    }
                />
            </View>
        </>
    );
}

