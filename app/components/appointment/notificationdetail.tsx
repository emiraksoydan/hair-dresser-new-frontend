import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Icon } from "react-native-paper";
import type { NotificationDto, NotificationPayload } from "../../types";
import { NotificationType, AppointmentStatus, DecisionStatus, StoreSelectionType } from "../../types";
import { UserType, BarberType } from "../../types";
import { getBarberTypeName } from "../../utils/store/barber-type";
import React from "react";
import { useIsFavoriteQuery } from "../../store/api";
import { useAuth } from "../../hook/useAuth";
import { NotificationParticipantView } from "./NotificationParticipantView";

// ---------------------------------------------------------------------------
// 1. NotificationItem Bileşeni
// ---------------------------------------------------------------------------
export const NotificationItem = React.memo(({
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
    onAddStore
}: {
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
    const isStoreInFavorites: boolean = isStoreFavorite !== undefined ? isStoreFavorite : !!(payload?.store?.isInFavorites || payload?.isStoreInFavorites);
    const isFreeBarberInFavorites: boolean = isFreeBarberFavorite !== undefined ? isFreeBarberFavorite : !!(payload?.freeBarber?.isInFavorites || payload?.isFreeBarberInFavorites);
    const isCustomerInFavorites: boolean = isCustomerFavorite !== undefined ? isCustomerFavorite : !!(payload?.customer?.isInFavorites || payload?.isCustomerInFavorites);

    // Payload'dan status al, eğer yoksa varsayılan olarak Pending
    // item.payloadJson değiştiğinde component yeniden render olmalı
    const status = React.useMemo(() => {
        if (payload?.status !== undefined) {
            return payload.status as AppointmentStatus;
        }
        // Eğer notification type AppointmentUnanswered ise, status Unanswered olmalı
        if (item.type === NotificationType.AppointmentUnanswered) {
            return AppointmentStatus.Unanswered;
        }
        return AppointmentStatus.Pending;
    }, [item.payloadJson, item.type]); // item.type da dependency'ye eklendi
    const recipientRole = payload?.recipientRole;
    // Store kontrolü: store objesi var mı ve içinde storeId veya storeOwnerUserId var mı?
    // FreeBarber kontrolü: freeBarber objesi var mı ve içinde userId var mı?

    // Status durumları
    const isPending = status === AppointmentStatus.Pending;
    const isApproved = status === AppointmentStatus.Approved;
    const isRejected = status === AppointmentStatus.Rejected;
    const isCancelled = status === AppointmentStatus.Cancelled;
    const isCompleted = status === AppointmentStatus.Completed;
    const isUnanswered = status === AppointmentStatus.Unanswered;

    // Decision verilip verilmediğini kontrol et (payload'daki decision'lara göre)
    // ÖNEMLİ: Backend'den decision'lar bazen boolean (true/false) bazen number (0,1,2,3) olarak gelebilir
    // DecisionStatus: 0=Pending, 1=Approved, 2=Rejected, 3=NoAnswer
    // Boolean değerler backend bug'ı olabilir, bu durumda decision verilmemiş sayıyoruz

    // Decision değerini normalize et: sadece geçerli number değerlerini kabul et
    const normalizeDecision = (v: any): DecisionStatus | null | undefined => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        if (typeof v === 'boolean') return undefined;
        if (typeof v === 'number') return v as DecisionStatus;
        return undefined;
    };

    const storeDecision = normalizeDecision(payload?.storeDecision);
    const freeBarberDecision = normalizeDecision(payload?.freeBarberDecision);
    const customerDecision = normalizeDecision(payload?.customerDecision);

    // Butonları göstermek için decision kontrolü:
    // - Decision undefined veya null ise → butonlar gösterilir (henüz decision eklenmemiş)
    // - Decision Pending (0) ise → butonlar gösterilir (karar bekleniyor)
    // - Decision Approved (1), Rejected (2) veya NoAnswer (3) ise → butonlar gösterilmez
    const canShowStoreButtons =
        storeDecision === undefined ||
        storeDecision === null ||
        storeDecision === DecisionStatus.Pending;

    const canShowFreeBarberButtons =
        freeBarberDecision === undefined ||
        freeBarberDecision === null ||
        freeBarberDecision === DecisionStatus.Pending;

    const canShowCustomerButtons =
        customerDecision === undefined ||
        customerDecision === null ||
        customerDecision === DecisionStatus.Pending;

    // Süre (Expires) Hesaplama - Decision butonları için kritik
    const resolvePendingTimeoutMinutes = () => {
        if (payload?.storeSelectionType !== StoreSelectionType.StoreSelection) {
            return 5;
        }

        // StoreSelection akışı:
        // - FreeBarber, henüz dükkan seçmemişse 30 dk
        // - Store/Customer kararları için 5 dk
        const isFreeBarberRecipient = userType === UserType.FreeBarber || recipientRole === 'freebarber';
        if (isFreeBarberRecipient && !payload?.store) {
            return 30;
        }

        return 5;
    };

    let expiresAt: Date | null = null;
    if (payload?.pendingExpiresAt) {
        let dateStr = payload.pendingExpiresAt;
        if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
            dateStr += 'Z';
        }
        expiresAt = new Date(dateStr);
    } else if (isPending) {
        // Eğer pendingExpiresAt yoksa ama status Pending ise
        let createdStr = item.createdAt;
        if (typeof createdStr === 'string' && !createdStr.endsWith('Z') && !createdStr.includes('+')) {
            createdStr += 'Z';
        }
        const createdAt = new Date(createdStr);
        // StoreSelectionType.StoreSelection durumunda 30 dakika, diğer durumlarda 5 dakika
        const timeoutMinutes = resolvePendingTimeoutMinutes();
        expiresAt = new Date(createdAt.getTime() + timeoutMinutes * 60 * 1000);
    }

    const now = new Date();
    const isExpired = expiresAt ? now.getTime() > expiresAt.getTime() : false;

    // Decision butonları için özel kontroller (3'lü sistem)

    // FreeBarber için RED butonu (Dükkan Seç senaryosunda müşteriden gelen ilk istek)
    const showFreeBarberRejectButton =
        userType === UserType.FreeBarber &&
        payload?.storeSelectionType === StoreSelectionType.StoreSelection &&
        item.type === NotificationType.AppointmentCreated &&
        isPending &&
        !isExpired &&
        canShowFreeBarberButtons &&
        customerDecision !== DecisionStatus.Approved &&
        !payload?.store; // Henüz dükkan seçilmemişse

    // Store için ONAY/RED butonları
    const showStoreDecisionButtons =
        userType === UserType.BarberStore &&
        item.type === NotificationType.AppointmentCreated &&
        isPending &&
        !isExpired &&
        canShowStoreButtons;

    // Müşteri için ONAY/RED butonları (Store onayladıktan sonra, 3'lü sistemde)
    const showCustomerFinalDecisionButtons =
        userType === UserType.Customer &&
        payload?.storeSelectionType === StoreSelectionType.StoreSelection &&
        (item.type === NotificationType.StoreApprovedSelection ||
            item.type === NotificationType.AppointmentCreated) &&
        isPending &&
        !isExpired &&
        canShowCustomerButtons &&
        storeDecision === DecisionStatus.Approved; // Store onaylamış olmalı

    // Genel decision butonları (diğer senaryolar için: İsteğime Göre, normal randevular)
    const showGeneralDecisionButtons =
        item.type === NotificationType.AppointmentCreated &&
        isPending &&
        !isExpired &&
        userType !== null &&
        !showFreeBarberRejectButton &&
        !showStoreDecisionButtons &&
        !showCustomerFinalDecisionButtons &&
        ((userType === UserType.BarberStore && canShowStoreButtons) ||
            (userType === UserType.FreeBarber && canShowFreeBarberButtons) ||
            (userType === UserType.Customer && canShowCustomerButtons));

    const showDecisionButtons = showGeneralDecisionButtons ||
        showStoreDecisionButtons ||
        showCustomerFinalDecisionButtons ||
        showFreeBarberRejectButton; // FreeBarber red butonu da dahil


    // Durum gösterimi:
    // - Approved/Rejected/Cancelled/Completed/Unanswered statülerinde gösterilir
    // - Ayrıca AppointmentCreated (aksiyon bildirimi) Pending olsa bile, ilgili kullanıcının kararı verilmişse sonucu gösterir
    const resolvedRecipientRole =
        recipientRole ??
        (userType === UserType.BarberStore ? 'store' :
            userType === UserType.FreeBarber ? 'freebarber' :
                userType === UserType.Customer ? 'customer' : null);

    const decisionForRecipient =
        resolvedRecipientRole === 'store' ? storeDecision :
            resolvedRecipientRole === 'freebarber' ? freeBarberDecision :
                resolvedRecipientRole === 'customer' ? customerDecision :
                    undefined;

    const decisionOutcomeKind: 'approved' | 'rejected' | 'unanswered' | 'unknown' | null =
        item.type === NotificationType.AppointmentCreated &&
            isPending &&
            decisionForRecipient !== undefined &&
            decisionForRecipient !== null &&
            decisionForRecipient !== DecisionStatus.Pending
            ? (decisionForRecipient === DecisionStatus.Approved ? 'approved' :
                decisionForRecipient === DecisionStatus.Rejected ? 'rejected' :
                    decisionForRecipient === DecisionStatus.NoAnswer ? 'unanswered' :
                        'unknown')
            : null;

    const displayStatusKind: 'approved' | 'rejected' | 'cancelled' | 'completed' | 'unanswered' | 'unknown' | null =
        isApproved || (isStatusNotificationType && item.type === NotificationType.AppointmentApproved) ? 'approved' :
            isRejected || (isStatusNotificationType && item.type === NotificationType.AppointmentRejected) ? 'rejected' :
                isCancelled || (isStatusNotificationType && item.type === NotificationType.AppointmentCancelled) ? 'cancelled' :
                    isCompleted || (isStatusNotificationType && item.type === NotificationType.AppointmentCompleted) ? 'completed' :
                        isUnanswered ? 'unanswered' :
                            decisionOutcomeKind;

    // Status notification type'larında veya status Rejected/Approved/Cancelled/Completed ise durum göster
    const showDecisionStatus = !!displayStatusKind || isStatusNotificationType;

    const displayApproved = displayStatusKind === 'approved';
    const displayRejected = displayStatusKind === 'rejected';
    const displayCancelled = displayStatusKind === 'cancelled';
    const displayCompleted = displayStatusKind === 'completed';
    const displayUnanswered = displayStatusKind === 'unanswered';

    // Karar verilmesi gereken (Pending) bir bildirim mi?
    // AppointmentCreated notification'ında ve status Pending ise karar bekleniyor demektir
    const isCreatedType = item.type === NotificationType.AppointmentCreated && isPending;

    // Status notification type'ları: bu tür bildirimlerde butonlar gösterilmemeli
    const isStatusNotificationType = item.type === NotificationType.AppointmentRejected || 
                                     item.type === NotificationType.AppointmentCancelled || 
                                     item.type === NotificationType.AppointmentCompleted ||
                                     item.type === NotificationType.AppointmentApproved;
    
    // Butonlar gösterilme koşulları:
    // 1. showDecisionButtons true olmalı (yukarıdaki tüm koşullar sağlanmalı)
    // 2. Durum gösterilmemeli (Rejected/Approved/Cancelled/Completed durumunda butonlar gösterilmez)
    // 3. Status Pending olmalı VE decision verilmemiş olmalı
    // 4. Status notification type'ı değilse (AppointmentRejected, AppointmentCancelled, AppointmentCompleted, AppointmentApproved)
    const shouldShowButtons = showDecisionButtons && !showDecisionStatus && isPending && !isStatusNotificationType;

    // FreeBarber için "Dükkan Ekle" butonu KALDIRILDI
    // Otomatik algılama: Panel index'te aktif StoreSelection randevusu varsa otomatik mode=add-store
    const canShowAddStoreButton = false;

    const serviceOfferings = Array.isArray(payload?.serviceOfferings) ? payload.serviceOfferings : [];
    const isStoreRecipient = recipientRole === 'store' || userType === UserType.BarberStore;
    const shouldShowNote = !!payload?.note && !(isStoreRecipient && payload?.storeSelectionType === StoreSelectionType.StoreSelection);

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
                    <View className="flex-row items-center gap-2">
                        {onDelete && (
                            <TouchableOpacity
                                onPress={() => onDelete(item)}
                                disabled={isDeleting}
                                className={`p-1 ${isDeleting ? 'opacity-60' : ''}`}
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

                {payload && (
                    <View className="mt-2 pt-3 border-t border-[#2a2c30]">
                        {/* Tarih ve Saat */}
                        {payload.date && payload.startTime && payload.endTime && (
                            <View className="flex-row justify-end items-center mb-3">
                                <Icon source="calendar" size={16} color="#6b7280" />
                                <Text className="text-[#9ca3af] text-sm ml-1.5">{formatDate(payload.date)}</Text>
                                <Text className="text-[#6b7280] mx-1.5">-</Text>
                                <Icon source="clock-outline" size={14} color="#6b7280" />
                                <Text className="text-[#9ca3af] text-sm ml-1">{formatTime(payload.startTime)} - {formatTime(payload.endTime)}</Text>
                            </View>
                        )}

                        {/* ROL BAZLI GÖRÜNÜMLER */}
                        <View className="mb-3">
                            <NotificationParticipantView
                                payload={payload}
                                recipientRole={recipientRole}
                                isStoreInFavorites={isStoreInFavorites}
                                isFreeBarberInFavorites={isFreeBarberInFavorites}
                                isCustomerInFavorites={isCustomerInFavorites}
                                formatRating={formatRating}
                            />
                            {recipientRole === 'freebarber' && formatPricingPolicy(payload.store?.pricingType, payload.store?.pricingValue) && (
                                <View className="bg-[#2a2c30] rounded-lg p-2 mb-2 mt-2">
                                    <Text className="text-[#9ca3af] text-xs">{formatPricingPolicy(payload.store?.pricingType, payload.store?.pricingValue)}</Text>
                                </View>
                            )}
                        </View>

                        {/* Hizmetler */}
                        {serviceOfferings.length > 0 && (
                            <View className="mb-2 mt-2  flex-row items-center">
                                <Text className="text-[#9ca3af] text-xs mb-1 font-semibold">Hizmetler:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {serviceOfferings.map((service) => (
                                        <View key={service.id} className="bg-[#2a2c30] rounded-lg px-2 ml-1  py-1">
                                            <Text className="text-white text-sm">{service.serviceName} ₺{Number(service.price).toFixed(0)}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* DURUM ALANI (Kabul Edildi / Reddedildi / İptal Edildi / Tamamlandı) */}
                        {shouldShowNote ? (
                            <View className="mb-2 mt-2">
                                <Text className="text-[#9ca3af] text-xs mb-1 font-semibold">Not:</Text>
                                <View className="bg-[#2a2c30] rounded-lg px-2 py-2">
                                    <Text className="text-white text-sm">{payload.note}</Text>
                                </View>
                            </View>
                        ) : null}

                        {showDecisionStatus && (
                            <View className="mt-3 pt-3 border-t border-[#2a2c30]">
                                <View className={`p-3 rounded-lg border ${displayApproved ? 'bg-green-900/20 border-green-800/30' :
                                    displayRejected ? 'bg-red-900/20 border-red-800/30' :
                                        displayCancelled ? 'bg-orange-900/20 border-orange-800/30' :
                                            displayCompleted ? 'bg-blue-900/20 border-blue-800/30' :
                                                displayUnanswered ? 'bg-yellow-900/20 border-yellow-800/30' :
                                                    'bg-gray-900/20 border-gray-800/30'
                                    }`}>
                                    <View className="flex-row items-center justify-center">
                                        <Icon
                                            source={
                                                displayApproved ? "check-circle" :
                                                    displayRejected ? "close-circle" :
                                                        displayCancelled ? "cancel" :
                                                            displayCompleted ? "check-all" :
                                                                displayUnanswered ? "clock-alert" :
                                                                    "information"
                                            }
                                            size={20}
                                            color={
                                                displayApproved ? "#10b981" :
                                                    displayRejected ? "#ef4444" :
                                                        displayCancelled ? "#f97316" :
                                                            displayCompleted ? "#3b82f6" :
                                                                displayUnanswered ? "#fbbf24" :
                                                                    "#9ca3af"
                                            }
                                        />
                                        <Text className={`text-xs text-center font-semibold ml-2 ${displayApproved ? 'text-green-400' :
                                            displayRejected ? 'text-red-400' :
                                                displayCancelled ? 'text-orange-400' :
                                                    displayCompleted ? 'text-blue-400' :
                                                        displayUnanswered ? 'text-yellow-400' :
                                                            'text-gray-400'
                                            }`}>
                                            {displayApproved ? "Kabul edildi" :
                                                displayRejected ? "Reddedildi" :
                                                    displayCancelled ? "İptal edildi" :
                                                        displayCompleted ? "Tamamlandı" :
                                                            displayUnanswered ? "Cevaplanmadı" :
                                                                "Bilinmeyen durum"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* BUTONLAR */}
                        {shouldShowButtons && (
                            <View className="mt-3 pt-3 border-t border-[#2a2c30]">
                                {/* FreeBarber için sadece REDDET butonu (Dükkan Seç senaryosunda) */}
                                {showFreeBarberRejectButton ? (
                                    <TouchableOpacity
                                        onPress={() => onDecision(item, false)}
                                        disabled={isProcessing}
                                        className={`bg-red-600 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : "opacity-100"}`}
                                    >
                                        {isProcessing ? <ActivityIndicator color="white" size="small" /> : (
                                            <View className="flex-row items-center gap-2">
                                                <Icon source="close-circle" size={18} color="white" />
                                                <Text className="text-white text-sm font-semibold">Reddet</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ) : (
                                    /* Diğer kullanıcılar için ONAY/RED butonları */
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={() => onDecision(item, false)}
                                            disabled={isProcessing}
                                            className={`flex-1 bg-red-600 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : "opacity-100"}`}
                                        >
                                            {isProcessing ? <ActivityIndicator color="white" size="small" /> : (
                                                <View className="flex-row items-center gap-2">
                                                    <Icon source="close-circle" size={18} color="white" />
                                                    <Text className="text-white text-sm font-semibold">Reddet</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => onDecision(item, true)}
                                            disabled={isProcessing}
                                            className={`flex-1 bg-green-600 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : "opacity-100"}`}
                                        >
                                            {isProcessing ? <ActivityIndicator color="white" size="small" /> : (
                                                <View className="flex-row items-center gap-2">
                                                    <Icon source="check-circle" size={18} color="white" />
                                                    <Text className="text-white text-sm font-semibold">Onayla</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}



                        {/* UNANSWERED DURUMU - Status Unanswered ise (süre dolmuş ve backend tarafından Unanswered'a geçirilmiş) */}
                        {isUnanswered && (
                            <View className="mt-3 pt-3 border-t border-[#2a2c30]">
                                <View className="p-3 bg-red-900/20 rounded-lg border border-red-800/30">
                                    <Text className="text-red-400 text-xs text-center font-semibold">⏰ Cevaplanmadı</Text>
                                    <Text className="text-[#9ca3af] text-xs text-center mt-1">Randevu kararı için süre doldu ve cevaplanmadı olarak işaretlendi.</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

