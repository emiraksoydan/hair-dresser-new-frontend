import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Icon } from "react-native-paper";
import type { NotificationDto, NotificationPayload } from "../../types";
import { NotificationType, AppointmentStatus } from "../../types";
import { UserType, BarberType } from "../../types";
import { getBarberTypeName } from "../../utils/store/barber-type";
import React from "react";
import { useIsFavoriteQuery } from "../../store/api";
import { useAuth } from "../../hook/useAuth";

// ---------------------------------------------------------------------------
// 1. NotificationItem Bileşeni
// ---------------------------------------------------------------------------
export const NotificationItem = React.memo(({
    item,
    userType,
    onMarkRead,
    onDecision,
    isProcessing,
    formatDate,
    formatTime,
    formatPricingPolicy,
    formatRating
}: {
    item: NotificationDto;
    userType: number | null;
    onMarkRead: (n: NotificationDto) => void;
    onDecision: (n: NotificationDto, approve: boolean) => void;
    isProcessing: boolean;
    formatDate: (d: string) => string;
    formatTime: (t?: string) => string;
    formatPricingPolicy: (t?: number, v?: number) => any;
    formatRating: (r?: number) => any;
}) => {
    const unread = !item.isRead;
    const { isAuthenticated } = useAuth();
    let payload: NotificationPayload | null = null;
    try {
        if (item.payloadJson && item.payloadJson.trim() !== '' && item.payloadJson !== '{}') {
            payload = JSON.parse(item.payloadJson);
        }
    } catch { }

    // Favori durumlarını query'den al (payload'daki değerler güncellenmeyebilir)
    const storeId = payload?.store?.storeId;
    const freeBarberId = payload?.freeBarber?.userId;
    const customerId = payload?.customer?.userId;

    const { data: isStoreFavorite } = useIsFavoriteQuery(storeId || '', { skip: !isAuthenticated || !storeId });
    const { data: isFreeBarberFavorite } = useIsFavoriteQuery(freeBarberId || '', { skip: !isAuthenticated || !freeBarberId });
    const { data: isCustomerFavorite } = useIsFavoriteQuery(customerId || '', { skip: !isAuthenticated || !customerId });

    // Favori durumlarını belirle (query'den gelen değerler öncelikli, yoksa payload'dan)
    const isStoreInFavorites = isStoreFavorite !== undefined ? isStoreFavorite : (payload?.store?.isInFavorites || payload?.isStoreInFavorites);
    const isFreeBarberInFavorites = isFreeBarberFavorite !== undefined ? isFreeBarberFavorite : (payload?.freeBarber?.isInFavorites || payload?.isFreeBarberInFavorites);
    const isCustomerInFavorites = isCustomerFavorite !== undefined ? isCustomerFavorite : (payload?.customer?.isInFavorites || payload?.isCustomerInFavorites);

    // Payload'dan status al, eğer yoksa varsayılan olarak Pending
    // item.payloadJson değiştiğinde component yeniden render olmalı
    const status = React.useMemo(() => {
        if (payload?.status !== undefined) {
            return payload.status as AppointmentStatus;
        }
        return AppointmentStatus.Pending;
    }, [item.payloadJson]); // payload?.status yerine item.payloadJson kullan
    const recipientRole = payload?.recipientRole;
    const hasStore = !!payload?.store;
    const hasFreeBarber = !!payload?.freeBarber;

    // Buton gösterme kuralları
    // ÖNEMLİ: AppointmentUnanswered notification'ında da buton gösterilmemeli (status Unanswered olduğu için)
    // Approved, Rejected, Cancelled, Completed durumlarında butonlar gösterilmemeli (decision zaten verilmiş veya randevu sonlandırılmış)
    const isApproved = status === AppointmentStatus.Approved;
    const isRejected = status === AppointmentStatus.Rejected;
    const isCancelled = status === AppointmentStatus.Cancelled;
    const isCompleted = status === AppointmentStatus.Completed;
    const isUnanswered = status === AppointmentStatus.Unanswered;

    // Decision butonları sadece Pending durumunda ve kullanıcı karar verebilecek durumda gösterilmeli
    const showDecisionButtons = (item.type === NotificationType.AppointmentCreated || item.type === NotificationType.AppointmentUnanswered) &&
        status === AppointmentStatus.Pending &&
        !isApproved &&
        !isRejected &&
        !isCancelled &&
        !isCompleted &&
        !isUnanswered &&
        userType !== null &&
        ((userType === UserType.BarberStore && (recipientRole === 'store' || (hasStore && !hasFreeBarber))) ||
            (userType === UserType.FreeBarber && (recipientRole === 'freebarber' || (hasFreeBarber && !hasStore))));

    // Süre (Expires) Hesaplama
    let expiresAt: Date | null = null;
    if (payload?.pendingExpiresAt) {
        let dateStr = payload.pendingExpiresAt;
        if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
            dateStr += 'Z';
        }
        expiresAt = new Date(dateStr);
    } else {
        let createdStr = item.createdAt;
        if (typeof createdStr === 'string' && !createdStr.endsWith('Z') && !createdStr.includes('+')) {
            createdStr += 'Z';
        }
        const createdAt = new Date(createdStr);
        expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000);
    }

    const now = new Date();
    const isExpired = expiresAt ? now.getTime() > expiresAt.getTime() : false;

    // Durum gösterimi: Approved, Rejected, Cancelled, Completed, Unanswered durumlarında durum gösterilmeli
    const showDecisionStatus = (isApproved || isRejected || isCancelled || isCompleted || isUnanswered) &&
        (item.type === NotificationType.AppointmentCreated ||
            item.type === NotificationType.AppointmentCancelled ||
            item.type === NotificationType.AppointmentCompleted ||
            item.type === NotificationType.AppointmentUnanswered);

    // Karar verilmesi gereken (Pending) bir bildirim mi?
    const isCreatedType = (item.type === NotificationType.AppointmentCreated && status === AppointmentStatus.Pending) ||
        (item.type === NotificationType.AppointmentUnanswered && status === AppointmentStatus.Pending);

    // Butonlar sadece Pending durumunda VE durum gösterilmediğinde gösterilmeli
    // Cancelled, Completed veya Unanswered durumunda butonlar gösterilmemeli
    const shouldShowButtons = showDecisionButtons && !showDecisionStatus && !isCancelled && !isCompleted && !isUnanswered;

    const serviceOfferings = payload?.serviceOfferings || [];

    // [DEĞİŞİKLİK 1] Otomatik okundu yapma (useEffect) TAMAMEN KALDIRILDI.
    // Kullanıcı görmeden 'okundu' olmasını istemiyoruz.

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
                // [DEĞİŞİKLİK 2] Tıklama Mantığı:
                // Eğer normal bir bildirimse (!isCreatedType) VEYA süre dolmuşsa (isExpired)
                // tıklayınca okundu işaretlemesine izin ver.
                if ((!isCreatedType || isExpired) && unread) {
                    onMarkRead(item);
                }
            }}
            // [DEĞİŞİKLİK 3] Disabled Mantığı:
            // Sadece "Karar Bekleyen (CreatedType)" VE "Süresi Dolmamış (!isExpired)" ise tıklamayı kapat.
            // Süresi dolmuşsa tıklanabilir olsun ki kullanıcı okundu yapabilsin.
            disabled={isCreatedType && !isExpired}
        >
            <View className={`p-4 rounded-xl mb-3 border ${unread ? "bg-[#1c1d20] border-[#2a2c30]" : "bg-[#151618] border-[#1f2023]"}`}>

                {/* Header */}
                <View className="flex-row items-center mb-2">
                    {unread && <View className="w-2 h-2 rounded-full bg-[#f05e23] mr-2" />}
                    <Text className={`text-white flex-1 text-base ${unread ? "font-bold" : "font-medium"}`}>
                        {item.title}
                    </Text>
                    <Text className="text-[#8b8c90] text-xs">
                        {formatDate(item.createdAt)}
                    </Text>
                </View>

                {payload && (
                    <View className="mt-2 pt-3 border-t border-[#2a2c30]">

                        {/* Tarih ve Saat */}
                        {payload.date && payload.startTime && payload.endTime && (
                            <View className="flex-row justify-end items-center mb-3">
                                <Icon source="calendar" size={16} color="#6b7280" />
                                <Text className="text-[#9ca3af] text-sm ml-1.5">{formatDate(payload.date)}</Text>
                                <Text className="text-[#6b7280] mx-1.5">•</Text>
                                <Icon source="clock-outline" size={14} color="#6b7280" />
                                <Text className="text-[#9ca3af] text-sm ml-1">{formatTime(payload.startTime)} - {formatTime(payload.endTime)}</Text>
                            </View>
                        )}

                        {/* ROL BAZLI GÖRÜNÜMLER (Aynı kalıyor) */}
                        <View className="mb-3">
                            {recipientRole === 'store' && (
                                <View className="flex-row gap-3">
                                    {payload.customer && (
                                        <View className="flex-1 flex-row items-center">
                                            {payload.customer.avatarUrl ? (
                                                <Image source={{ uri: payload.customer.avatarUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                                            ) : (
                                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="account" size={24} color="#6b7280" /></View>
                                            )}
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs">Müşteri</Text>
                                                <Text className="text-white text-sm font-semibold">{payload.customer?.displayName || 'Müşteri'}</Text>
                                                {isCustomerInFavorites && <View className="flex-row items-center mt-0.5"><Icon source="heart" size={12} color="#f05e23" /><Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text></View>}
                                            </View>
                                        </View>
                                    )}
                                    <View className="flex-1">
                                        {payload.freeBarber ? (
                                            <View className="flex-row items-center">
                                                {payload.freeBarber.avatarUrl ? <Image source={{ uri: payload.freeBarber.avatarUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" /> : <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="account-supervisor" size={24} color="#6b7280" /></View>}
                                                <View className="flex-1">
                                                    <Text className="text-[#9ca3af] text-xs">Traş Edecek</Text>
                                                    <Text className="text-white text-sm font-semibold">{payload.freeBarber?.displayName || 'Serbest Berber'}</Text>
                                                    {isFreeBarberInFavorites && <View className="flex-row items-center mt-0.5"><Icon source="heart" size={12} color="#f05e23" /><Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text></View>}
                                                </View>
                                            </View>
                                        ) : payload.chair?.manuelBarberId ? (
                                            <View className="flex-row items-center">
                                                {payload.chair.manuelBarberImageUrl ? <Image source={{ uri: payload.chair.manuelBarberImageUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" /> : <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="account" size={24} color="#6b7280" /></View>}
                                                <View className="flex-1">
                                                    <Text className="text-[#9ca3af] text-xs">Dükkan Berberi</Text>
                                                    <Text className="text-white text-sm font-semibold">{payload.chair.manuelBarberName}</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <View className="flex-row items-center">
                                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="seat" size={24} color="#6b7280" /></View>
                                                <View className="flex-1">
                                                    <Text className="text-white text-sm font-semibold">{payload.chair?.chairName}</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {recipientRole === 'freebarber' && (
                                <View>
                                    {payload.store && (
                                        <View className="flex-row items-center mb-2">
                                            {payload.store.imageUrl ? <Image source={{ uri: payload.store.imageUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" /> : <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="store" size={24} color="#6b7280" /></View>}
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs">Berber Dükkanı</Text>
                                                <Text className="text-white text-sm font-semibold">{payload.store.storeName}</Text>
                                                {isStoreInFavorites && <View className="flex-row items-center mt-0.5"><Icon source="heart" size={12} color="#f05e23" /><Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text></View>}
                                            </View>
                                        </View>
                                    )}
                                    {formatPricingPolicy(payload.store?.pricingType, payload.store?.pricingValue) && (
                                        <View className="bg-[#2a2c30] rounded-lg p-2 mb-2"><Text className="text-[#9ca3af] text-xs">{formatPricingPolicy(payload.store?.pricingType, payload.store?.pricingValue)}</Text></View>
                                    )}
                                    {payload.customer && (
                                        <View className="flex-row items-center">
                                            {payload.customer.avatarUrl ? <Image source={{ uri: payload.customer.avatarUrl }} className="w-10 h-10 rounded-full mr-2" resizeMode="cover" /> : <View className="w-10 h-10 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="account" size={20} color="#6b7280" /></View>}
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs">Müşteri</Text>
                                                <Text className="text-white text-sm font-semibold">{payload.customer?.displayName || 'Müşteri'}</Text>
                                                {isCustomerInFavorites && <View className="flex-row items-center mt-0.5"><Icon source="heart" size={12} color="#f05e23" /><Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text></View>}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {recipientRole === 'customer' && (
                                <View className="flex-row gap-3">
                                    {payload.store && (
                                        <View className="flex-1 flex-row items-center">
                                            {payload.store.imageUrl ? (
                                                <Image source={{ uri: payload.store.imageUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                                            ) : (
                                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="store" size={24} color="#6b7280" /></View>
                                            )}
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs">Berber Dükkanı</Text>
                                                <Text className="text-white text-sm font-semibold">{payload.store.storeName}</Text>
                                                {payload.store.type !== undefined && <Text className="text-[#9ca3af] text-xs mt-0.5">{getBarberTypeName(payload.store.type as BarberType)}</Text>}
                                                {payload.store.rating !== undefined && (
                                                    <View className="flex-row items-center mt-0.5">
                                                        <Icon source="star" size={12} color="#fbbf24" />
                                                        <Text className="text-[#fbbf24] text-xs ml-1">{formatRating(payload.store.rating)}</Text>
                                                    </View>
                                                )}
                                                {isStoreInFavorites && <View className="flex-row items-center mt-0.5"><Icon source="heart" size={12} color="#f05e23" /><Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text></View>}
                                            </View>
                                        </View>
                                    )}

                                    <View className="flex-1">
                                        {payload.freeBarber ? (
                                            <View className="flex-row items-center">
                                                {payload.freeBarber.avatarUrl ? <Image source={{ uri: payload.freeBarber.avatarUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" /> : <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="account-supervisor" size={24} color="#6b7280" /></View>}
                                                <View className="flex-1">
                                                    <Text className="text-[#9ca3af] text-xs">Traş Edecek</Text>
                                                    <Text className="text-white text-sm font-semibold">{payload.freeBarber?.displayName || 'Serbest Berber'}</Text>
                                                    {payload.freeBarber?.rating !== undefined && <View className="flex-row items-center mt-0.5"><Icon source="star" size={12} color="#fbbf24" /><Text className="text-[#fbbf24] text-xs ml-1">{formatRating(payload.freeBarber.rating)}</Text></View>}
                                                    {isFreeBarberInFavorites && <View className="flex-row items-center mt-0.5"><Icon source="heart" size={12} color="#f05e23" /><Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text></View>}
                                                </View>
                                            </View>
                                        ) : payload.chair?.manuelBarberId ? (
                                            <View className="flex-row items-center">
                                                {payload.chair.manuelBarberImageUrl ? <Image source={{ uri: payload.chair.manuelBarberImageUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" /> : <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="account" size={24} color="#6b7280" /></View>}
                                                <View className="flex-1">
                                                    <Text className="text-[#9ca3af] text-xs">Manuel Berber</Text>
                                                    <Text className="text-white text-sm font-semibold">{payload.chair.manuelBarberName}</Text>
                                                    {payload.chair.manuelBarberRating !== undefined && <View className="flex-row items-center mt-0.5"><Icon source="star" size={12} color="#fbbf24" /><Text className="text-[#fbbf24] text-xs ml-1">{formatRating(payload.chair.manuelBarberRating)}</Text></View>}
                                                </View>
                                            </View>
                                        ) : (
                                            <View className="flex-row items-center">
                                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center"><Icon source="seat" size={24} color="#6b7280" /></View>
                                                <View className="flex-1">
                                                    <Text className="text-white text-sm font-semibold">{payload.chair?.chairName}</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Hizmetler */}
                        {serviceOfferings.length > 0 && (
                            <View className="mb-2 mt-2 flex-row items-center">
                                <Text className="text-[#9ca3af] text-xs mb-1 font-semibold">Hizmetler:</Text>
                                <ScrollView className="gap-1.5" horizontal showsHorizontalScrollIndicator={false}>
                                    {serviceOfferings.map((service) => (
                                        <View key={service.id} className="bg-[#2a2c30] rounded-lg px-2 py-1">
                                            <Text className="text-white text-sm">{service.serviceName} ₺{Number(service.price).toFixed(0)}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* DURUM ALANI (Kabul Edildi / Reddedildi / İptal Edildi / Tamamlandı) */}
                        {showDecisionStatus && (
                            <View className="mt-3 pt-3 border-t border-[#2a2c30]">
                                <View className={`p-3 rounded-lg border ${isApproved ? 'bg-green-900/20 border-green-800/30' :
                                    isRejected ? 'bg-red-900/20 border-red-800/30' :
                                        isCancelled ? 'bg-orange-900/20 border-orange-800/30' :
                                            isCompleted ? 'bg-blue-900/20 border-blue-800/30' :
                                                isUnanswered ? 'bg-yellow-900/20 border-yellow-800/30' :
                                                    'bg-gray-900/20 border-gray-800/30'
                                    }`}>
                                    <View className="flex-row items-center justify-center">
                                        <Icon
                                            source={
                                                isApproved ? "check-circle" :
                                                    isRejected ? "close-circle" :
                                                        isCancelled ? "cancel" :
                                                            isCompleted ? "check-all" :
                                                                isUnanswered ? "clock-alert" :
                                                                    "information"
                                            }
                                            size={20}
                                            color={
                                                isApproved ? "#10b981" :
                                                    isRejected ? "#ef4444" :
                                                        isCancelled ? "#f97316" :
                                                            isCompleted ? "#3b82f6" :
                                                                isUnanswered ? "#fbbf24" :
                                                                    "#9ca3af"
                                            }
                                        />
                                        <Text className={`text-xs text-center font-semibold ml-2 ${isApproved ? 'text-green-400' :
                                            isRejected ? 'text-red-400' :
                                                isCancelled ? 'text-orange-400' :
                                                    isCompleted ? 'text-blue-400' :
                                                        isUnanswered ? 'text-yellow-400' :
                                                            'text-gray-400'
                                            }`}>
                                            {isApproved ? "Kabul edildi" :
                                                isRejected ? "Reddedildi" :
                                                    isCancelled ? "İptal edildi" :
                                                        isCompleted ? "Tamamlandı" :
                                                            isUnanswered ? "Cevaplanmadı" :
                                                                "Bilinmeyen durum"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* BUTONLAR - Sadece Pending durumunda ve durum gösterilmediğinde */}
                        {shouldShowButtons && !isExpired && (
                            <View className="mt-3 pt-3 border-t border-[#2a2c30]">
                                <View className="flex-row gap-2">
                                    <TouchableOpacity onPress={() => onDecision(item, false)} disabled={isProcessing} className={`flex-1 bg-red-600 rounded-xl py-2.5 items-center justify-center ${isProcessing ? "opacity-60" : "opacity-100"}`}>
                                        {isProcessing ? <ActivityIndicator color="white" size="small" /> : (
                                            <View className="items-center"><Icon source="close-circle" size={20} color="white" /><Text className="text-white text-xs font-semibold mt-1">Reddet</Text></View>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onDecision(item, true)} disabled={isProcessing} className={`flex-1 bg-green-600 rounded-xl py-2.5 items-center justify-center ${isProcessing ? "opacity-60" : "opacity-100"}`}>
                                        {isProcessing ? <ActivityIndicator color="white" size="small" /> : (
                                            <View className="items-center"><Icon source="check-circle" size={20} color="white" /><Text className="text-white text-xs font-semibold mt-1">Onayla</Text></View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* SÜRE DOLDU - Sadece Unanswered durumunda göster */}
                        {isUnanswered && (
                            <View className="mt-3 pt-3 border-t border-[#2a2c30]">
                                <View className="p-3 bg-red-900/20 rounded-lg border border-red-800/30">
                                    <Text className="text-red-400 text-xs text-center font-semibold">⏰ Süre Doldu</Text>
                                    <Text className="text-[#9ca3af] text-xs text-center mt-1">Randevu kararı için süre dolmuş.</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});
