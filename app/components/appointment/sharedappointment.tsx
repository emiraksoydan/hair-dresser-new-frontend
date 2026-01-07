import React, { useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, RefreshControl, ActivityIndicator, ScrollView } from "react-native";
import { LegendList } from '@legendapp/list';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { StarRatingDisplay } from "react-native-star-rating-widget";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import {
    useGetAllAppointmentByFilterQuery,
    useCancelAppointmentMutation,
    useCompleteAppointmentMutation,
    useToggleFavoriteMutation,
    useDeleteAppointmentMutation,
    useDeleteAllAppointmentsMutation
} from "../../store/api";
import { AppointmentStatus, AppointmentFilter, AppointmentGetDto, AppointmentRequester } from "../../types/appointment";
import { useAuth } from "../../hook/useAuth";
import { BarberType, UserType, PricingType, ImageOwnerType } from "../../types";
import FilterChip from "../common/filter-chip";
import { getBarberTypeName } from "../../utils/store/barber-type";
import { RatingBottomSheet } from "./ratingbottomsheet";
import { getAppointmentStatusColor, getAppointmentStatusText } from "../../utils/appointment/appointment-helpers";
import { OwnerAvatar } from "../common/owneravatar";
import { LottieViewComponent } from "../common/lottieview";
import { resolveApiErrorMessage } from "../../utils/common/error";
import { useBottomSheet } from "../../hook/useBottomSheet";

export default function SharedAppointmentScreen() {
    const { userId, userType } = useAuth();
    const insets = useSafeAreaInsets();
    const [activeFilter, setActiveFilter] = useState<AppointmentFilter>(AppointmentFilter.Active);
    const ratingSheet = useBottomSheet({
        snapPoints: ['60%', '100%'],
        enablePanDownToClose: true,
    });
    const [selectedRatingTarget, setSelectedRatingTarget] = useState<{
        appointmentId: string;
        targetId: string;
        targetName: string;
        targetType: 'store' | 'freeBarber' | 'manuelBarber' | 'customer';
        targetImage?: string;
    } | null>(null);

    // --- API ---
    const { data: appointments, isLoading, refetch, isFetching, error, isError } = useGetAllAppointmentByFilterQuery(activeFilter);

    const filteredAppointments = useMemo(() => {
        const items = appointments ?? [];

        if (activeFilter === AppointmentFilter.Active) {
            return items.filter((item) => item.status === AppointmentStatus.Approved);
        }

        if (activeFilter === AppointmentFilter.Completed) {
            return items.filter((item) => item.status === AppointmentStatus.Completed);
        }

        if (activeFilter === AppointmentFilter.Cancelled) {
            return items.filter((item) =>
                item.status === AppointmentStatus.Cancelled ||
                item.status === AppointmentStatus.Rejected ||
                item.status === AppointmentStatus.Unanswered
            );
        }

        return items;
    }, [appointments, activeFilter]);

    const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
    const [completeAppointment, { isLoading: isCompleting }] = useCompleteAppointmentMutation();
    const [toggleFavorite, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();
    const [deleteAppointment, { isLoading: isDeletingAppointment }] = useDeleteAppointmentMutation();
    const [deleteAllAppointments, { isLoading: isDeletingAllAppointments }] = useDeleteAllAppointmentsMutation();

    // --- Helper Functions ---
    const formatPricingPolicy = useCallback((pricingType?: number, pricingValue?: number) => {
        if (pricingType === undefined || pricingValue === undefined) return null;
        if (pricingType === PricingType.Percent) return `Yapılan işlemlerin toplamının %${pricingValue} alınır`;
        if (pricingType === PricingType.Rent) return `Koltuk Kiralama (Saatlik ${pricingValue} TL)`;
        return null;
    }, []);

    const formatRating = useCallback((rating?: number) => rating?.toFixed(1) ?? null, []);

    // --- Zaman Kontrolü ---
    const isTimePassed = useCallback((dateStr?: string | null, endTimeStr?: string | null) => {
        if (!dateStr || !endTimeStr) return false;
        try {
            const timePart = endTimeStr.length === 5 ? endTimeStr + ":00" : endTimeStr;
            const appointmentEnd = new Date(`${dateStr}T${timePart}`);
            const now = new Date();
            return now > appointmentEnd;
        } catch { return false; }
    }, []);

    // Rating yapılabilir mi kontrolü (randevu durumu)
    const canRate = useCallback((item: AppointmentGetDto) => {
        return item.status === AppointmentStatus.Completed || item.status === AppointmentStatus.Cancelled || item.status === AppointmentStatus.Unanswered;
    }, []);

    // Belirli bir kişiye yorum yapılabilir mi kontrolü
    const canRateTarget = useCallback((
        item: AppointmentGetDto,
        targetType: 'store' | 'freeBarber' | 'manuelBarber' | 'customer'
    ): boolean => {
        // Sadece Completed veya Cancelled randevularda yorum yapılabilir
        if (!canRate(item)) return false;

        // ManuelBarber bir kullanıcı tipi değil, sadece entity

        // Customer: Store, FreeBarber, ManuelBarber'a yorum yapabilir (randevuda varsa)
        if (userType === UserType.Customer) {
            if (targetType === 'store' && item.barberStoreId) return true;
            if (targetType === 'freeBarber' && item.freeBarberId) return true;
            if (targetType === 'manuelBarber' && item.manuelBarberId) return true; // ManuelBarber'a rating yapılabilir
            return false;
        }

        // BarberStore: Customer, FreeBarber'a yorum yapabilir
        // Not: BarberStore manuel barber'a yorum yapamaz (manuel barber dükkanın kendi çalışanı)
        if (userType === UserType.BarberStore) {
            if (targetType === 'customer' && item.customerUserId) return true;
            if (targetType === 'freeBarber' && item.freeBarberId) return true;
            return false;
        }

        // FreeBarber: Customer, Store'a yorum yapabilir
        // Not: FreeBarber manuel barber'a yorum yapamaz (manuel barber dükkanın çalışanı, free barber ile direkt ilişkisi yok)
        if (userType === UserType.FreeBarber) {
            if (targetType === 'customer' && item.customerUserId) return true;
            if (targetType === 'store' && item.barberStoreId) return true;
            return false;
        }

        return false;
    }, [userType, canRate]);

    // Rating bottom sheet aç
    const openRatingSheet = useCallback((appointmentId: string, targetId: string, targetName: string, targetType: 'store' | 'freeBarber' | 'manuelBarber' | 'customer', targetImage?: string) => {
        setSelectedRatingTarget({ appointmentId, targetId, targetName, targetType, targetImage });
        // Sheet'i açmak için küçük bir gecikme ekle
        setTimeout(() => {
            ratingSheet.present();
        }, 100);
    }, [ratingSheet]);

    // Favori toggle
    const handleToggleFavorite = useCallback(async (targetId: string, appointmentId?: string) => {
        try {
            await toggleFavorite({
                targetId,
                appointmentId: appointmentId || null,
            }).unwrap();


        } catch (error: any) {
            Alert.alert('Hata', error?.data?.message || error?.message || 'Favori işlemi başarısız.');
        }
    }, [toggleFavorite]);

    // --- İşlemler ---
    const handleCancel = async (id: string) => {
        Alert.alert("Randevu İptali", "Randevuyu iptal etmek istiyor musunuz?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "İptal Et",
                style: "destructive",
                onPress: async () => {
                    try {
                        await cancelAppointment(id).unwrap();
                        Alert.alert("Bilgi", "Randevu iptal edildi.");
                    } catch (error: any) {
                        Alert.alert("Hata", error?.data?.message || "İptal edilemedi.");
                    }
                }
            }
        ]);
    };

    const handleComplete = async (id: string) => {
        Alert.alert("Randevu Tamamla", "Hizmet tamamlandı olarak işaretlensin mi?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Tamamla",
                style: "default",
                onPress: async () => {
                    try {
                        await completeAppointment(id).unwrap();
                        Alert.alert("Başarılı", "Randevu tamamlandı.");
                    } catch (error: any) {
                        Alert.alert("Hata", error?.data?.message || "İşlem başarısız.");
                    }
                }
            }
        ]);
    };

    const handleDelete = useCallback(async (appointmentId: string) => {
        Alert.alert(
            "Randevuyu Sil",
            "Bu randevuyu silmek istediğinize emin misiniz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteAppointment(appointmentId).unwrap();
                            Alert.alert("Başarılı", "Randevu başarıyla silindi.");
                        } catch (error: any) {
                            const errorMessage = error?.data?.message || error?.message || "Randevu silinemedi.";
                            Alert.alert("Hata", errorMessage);
                        }
                    },
                },
            ]
        );
    }, [deleteAppointment]);

    const handleDeleteAll = useCallback(async () => {
        Alert.alert(
            "Tüm Randevuları Sil",
            "Silinebilir tüm randevuları silmek istediğinize emin misiniz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteAllAppointments().unwrap();
                            Alert.alert("Başarılı", "Randevular başarıyla silindi.");
                        } catch (error: any) {
                            const errorMessage = error?.data?.message || error?.message || "Randevular silinemedi.";
                            Alert.alert("Hata", errorMessage);
                        }
                    },
                },
            ]
        );
    }, [deleteAllAppointments]);

    // Rating Component - Ortalama rating ve kullanıcının rating'i göster
    const RatingDisplay = ({
        myRating,
        myComment,
        averageRating,
        canRateNow,
        onRatePress
    }: {
        myRating?: number;
        myComment?: string;
        averageRating?: number;
        canRateNow: boolean;
        onRatePress: () => void;
    }) => {
        return (
            <View className="mt-3">
                {/* Ortalama Rating - Her zaman göster (eğer varsa) */}
                {averageRating !== undefined && averageRating !== null && (
                    <View className="flex-row items-center mb-2">
                        <Icon source="star" size={14} color="#fbbf24" />
                        <Text className="text-[#fbbf24] text-xs font-semibold ml-1">{formatRating(averageRating)}</Text>
                        <Text className="text-[#6b7280] text-xs ml-1">(Ortalama)</Text>
                    </View>
                )}

                {/* Kullanıcının Rating'i - Eğer yapmışsa göster */}
                {myRating !== undefined && myRating !== null && myRating > 0 && (
                    <View className="mb-2">
                        <View className="flex-row items-center mb-2">
                            <StarRatingDisplay
                                rating={myRating}
                                starSize={14}
                                starStyle={{ marginHorizontal: 1 }}
                            />
                            <Text className="text-[#fbbf24] text-xs font-semibold ml-2">{formatRating(myRating)}</Text>
                            <Text className="text-[#6b7280] text-xs ml-1">(Sizin yorumunuz)</Text>
                        </View>
                        {myComment && (
                            <View className="bg-[#1f2023] border border-[#2a2c30] rounded-lg p-3 mt-1">
                                <Text className="text-[#d1d5db] text-xs leading-4" numberOfLines={3} ellipsizeMode="tail">
                                    "{myComment}"
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Rating Yap Butonu - Eğer yapmamışsa ve yorum yapılabilir durumda ise göster */}
                {canRateNow && (myRating === null || myRating === undefined || myRating === 0) && (
                    <TouchableOpacity
                        onPress={onRatePress}
                        className="flex-row items-center justify-center bg-[#1f2023] border border-[#f05e23]/30 rounded-lg px-3 py-2.5 mt-1"
                    >
                        <Icon source="star-outline" size={16} color="#f05e23" />
                        <Text className="text-[#f05e23] text-xs font-semibold ml-2">Yorum Yap</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // --- RENDER ITEM ---
    const renderItem = ({ item }: { item: AppointmentGetDto }) => {
        const hasSchedule = !!item.appointmentDate && !!item.startTime && !!item.endTime;
        const passed = hasSchedule ? isTimePassed(item.appointmentDate, item.endTime) : false;
        const isApproved = item.status === AppointmentStatus.Approved;
        const isUnanswered = item.status === AppointmentStatus.Unanswered;
        const isStoreCallWithoutSchedule =
            item.appointmentRequester === AppointmentRequester.Store && !hasSchedule;

        let showCompleteButton = false;
        let showCancelButton = false;
        let showDeleteButton = false;

        if (activeFilter === AppointmentFilter.Active) {
            // Active tab'ında Pending/Approved randevular görünür
            // Dükkan randevusunu dükkan tamamlar
            if (isApproved && userType === UserType.BarberStore && (passed || isStoreCallWithoutSchedule)) {
                showCompleteButton = true;
            }
            // İsteğime Göre randevusunu free barber tamamlar (store yoksa veya CustomRequest ise)
            // Müşteri-free barber arasında isteğe göre randevu onaylandıysa free barber tamamlama hakkına sahip
            if (isApproved && userType === UserType.FreeBarber && !item.barberStoreId) {
                showCompleteButton = true;
            }

            // Active tab'ında sadece Approved durumunda iptal butonu göster
            if (isApproved) {
                showCancelButton = true;
            }
        }

        // Delete butonu - Sadece Completed ve Cancelled tablarında gösterilir, Pending ve Approved durumunda gösterilmez
        if ((activeFilter === AppointmentFilter.Completed || activeFilter === AppointmentFilter.Cancelled) &&
            item.status !== AppointmentStatus.Pending && item.status !== AppointmentStatus.Approved) {
            showDeleteButton = true;
        }

        // Tamamlanan/iptal durumlarında kart tasarımını iyileştir
        const isCompletedOrCancelled = activeFilter === AppointmentFilter.Completed || activeFilter === AppointmentFilter.Cancelled;

        // Durum badge'i için
        const statusColor = getAppointmentStatusColor(item.status);
        const statusText = getAppointmentStatusText(item.status);


        return (
            <View className={`bg-[#151618] rounded-xl p-4 mb-4 border ${isCompletedOrCancelled ? 'border-[#2a2c30]' : 'border-[#1f2023]'}`}>

                {/* Durum Badge'i - Active tab'ında ve tamamlanan/iptal durumlarında göster */}
                {(activeFilter === AppointmentFilter.Active || isCompletedOrCancelled) && (
                    <View className="mb-3 pb-3 border-b border-[#2a2c30]">
                        <View className="flex-row items-center gap-2 justify-between">
                            <View className="flex-row items-center gap-2">
                                <Icon
                                    source={
                                        isApproved ? "check-circle" :
                                            item.status === AppointmentStatus.Pending ? "clock-outline" :
                                                isUnanswered ? "clock-alert" :
                                                    item.status === AppointmentStatus.Rejected ? "close-circle" :
                                                        item.status === AppointmentStatus.Cancelled ? "cancel" :
                                                            item.status === AppointmentStatus.Completed ? "check-all" :
                                                                "information"
                                    }
                                    size={16}
                                    color={statusColor}
                                />
                                <Text className={`text-sm font-semibold`} style={{ color: statusColor }}>
                                    {statusText}
                                </Text>
                                {/* Zaman geçmişse uyarı göster - Active tab'ında sadece Approved randevular var */}
                                {passed && isApproved && (
                                    <View className="flex-row items-center ml-2">
                                        <Icon source="alert-circle" size={14} color="#f59e0b" />
                                        <Text className="text-[#f59e0b] text-xs ml-1">Zaman Geçti</Text>
                                    </View>
                                )}
                            </View>
                            {item.appointmentRequester != AppointmentRequester.Store && userType != UserType.FreeBarber && item.startTime && item.endTime && (
                                <View className="flex-row items-center">
                                    <Icon source="calendar" size={14} color="#6b7280" />
                                    <Text className="text-[#9ca3af] text-xs ml-1.5">
                                        {new Date(item.appointmentDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                    </Text>
                                    <Text className="text-[#6b7280] mx-1.5">•</Text>
                                    <Icon source="clock-outline" size={14} color="#6b7280" />
                                    <Text className="text-[#9ca3af] text-xs ml-1">
                                        {item.startTime.substring(0, 5)} - {item.endTime.substring(0, 5)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
                <View className="mb-4">
                    <View className="flex-row gap-2 items-center justify-end flex-wrap">
                        {showCompleteButton && (
                            <TouchableOpacity
                                onPress={() => handleComplete(item.id)}
                                disabled={isCompleting}
                                className="bg-green-600 px-3 py-2 rounded-xl flex-row items-center justify-center"
                            >
                                {isCompleting ? <ActivityIndicator color="white" size="small" /> : (
                                    <>
                                        <Icon source="check-all" size={15} color="white" />
                                        <Text className="text-white text-sm ml-2">Tamamla</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        {showCancelButton && (
                            <TouchableOpacity
                                onPress={() => handleCancel(item.id)}
                                disabled={isCancelling}
                                className="bg-[#2a2c30] border border-red-900/40 px-3 py-2 rounded-xl flex-row items-center justify-center"
                            >
                                {isCancelling ? <ActivityIndicator color="#ef4444" size="small" /> : (
                                    <>
                                        <Icon source="close-circle-outline" size={15} color="#ef4444" />
                                        <Text className="text-[#ef4444] text-sm ml-2">İptal Et</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        {showDeleteButton && (
                            <TouchableOpacity
                                onPress={() => handleDelete(item.id)}
                                disabled={isDeletingAppointment}
                                className={`bg-[#2a2c30] border border-red-900/40 px-3 py-2 rounded-xl flex-row items-center justify-center ${isDeletingAppointment ? 'opacity-60' : ''}`}
                            >
                                {isDeletingAppointment ? (
                                    <ActivityIndicator color="#ef4444" size="small" />
                                ) : (
                                    <>
                                        <Icon source="delete-outline" size={15} color="#ef4444" />
                                        <Text className="text-[#ef4444] text-sm ml-2">Sil</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View className="mb-0">
                    {userType === UserType.BarberStore && (
                        <View className="flex-row gap-4">
                            {item.customerUserId && (
                                <View className="flex-1">
                                    <View className="flex-row items-start mb-2">
                                        <OwnerAvatar
                                            ownerId={item.customerUserId}
                                            ownerType={ImageOwnerType.User}
                                            fallbackUrl={item.customerImage}
                                            imageClassName="w-12 h-12 rounded-full mr-3"
                                            iconSource="account"
                                            iconSize={24}
                                            iconColor="#6b7280"
                                        />
                                        <View className="flex-1">
                                            <Text className="text-[#9ca3af] text-xs mb-0.5">Müşterisi</Text>
                                            <Text className="text-white text-sm font-semibold mb-1" numberOfLines={1} ellipsizeMode="tail">
                                                {item.customerName}
                                            </Text>
                                            {item.customerNumber && (
                                                <Text className="text-[#6b7280] text-xs">Müşteri No: {item.customerNumber}</Text>
                                            )}
                                        </View>
                                    </View>
                                    {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                        <View className="mb-3">
                                            <TouchableOpacity
                                                onPress={() => item.customerUserId && handleToggleFavorite(item.customerUserId, item.id)}
                                                disabled={isTogglingFavorite}
                                                className="flex-row items-center self-start bg-[#1f2023] border border-[#2a2c30] rounded-lg px-3 py-1.5"
                                            >
                                                <Icon source={item.isCustomerFavorite ? "heart" : "heart-outline"} size={14} color={item.isCustomerFavorite ? "#ef4444" : "#6b7280"} />
                                                <Text className={`text-xs ml-1.5 ${item.isCustomerFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                    {item.isCustomerFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <RatingDisplay
                                        myRating={item.myRatingForCustomer}
                                        myComment={item.myCommentForCustomer}
                                        averageRating={item.customerAverageRating}
                                        canRateNow={canRateTarget(item, 'customer')}
                                        onRatePress={() => item.customerUserId && openRatingSheet(item.id, item.customerUserId, item.customerName || 'Müşteri', 'customer', item.customerImage)}
                                    />
                                </View>
                            )}
                            <View className="flex-1">
                                {item.freeBarberId ? (
                                    <View>
                                        <View className="flex-row items-start mb-2">
                                            <OwnerAvatar
                                                ownerId={item.freeBarberId}
                                                ownerType={ImageOwnerType.FreeBarber}
                                                fallbackUrl={item.freeBarberImage}
                                                imageClassName="w-12 h-12 rounded-full mr-3"
                                                iconSource="account-supervisor"
                                                iconSize={24}
                                                iconColor="#6b7280"
                                            />
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs mb-0.5">Kiralayan Berber</Text>
                                                <Text className="text-white text-sm font-semibold mb-1" numberOfLines={1} ellipsizeMode="tail">
                                                    {item.freeBarberName || 'Serbest Berber'}
                                                </Text>
                                            </View>
                                        </View>
                                        {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                            <View className="mb-3">
                                                <TouchableOpacity
                                                    onPress={() => item.freeBarberId && handleToggleFavorite(item.freeBarberId, item.id)}
                                                    disabled={isTogglingFavorite}
                                                    className="flex-row items-center self-start bg-[#1f2023] border border-[#2a2c30] rounded-lg px-3 py-1.5"
                                                >
                                                    <Icon source={item.isFreeBarberFavorite ? "heart" : "heart-outline"} size={14} color={item.isFreeBarberFavorite ? "#ef4444" : "#6b7280"} />
                                                    <Text className={`text-xs ml-1.5 ${item.isFreeBarberFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                        {item.isFreeBarberFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <RatingDisplay
                                            myRating={item.myRatingForFreeBarber}
                                            myComment={item.myCommentForFreeBarber}
                                            averageRating={item.freeBarberAverageRating}
                                            canRateNow={canRateTarget(item, 'freeBarber')}
                                            onRatePress={() => item.freeBarberId && openRatingSheet(item.id, item.freeBarberId, item.freeBarberName || 'Serbest Berber', 'freeBarber', item.freeBarberImage)}
                                        />
                                    </View>
                                ) : item.manuelBarberId ? (
                                    <View>
                                        <View className="flex-row items-start mb-2">
                                            <OwnerAvatar
                                                ownerId={item.manuelBarberId}
                                                ownerType={ImageOwnerType.ManuelBarber}
                                                fallbackUrl={item.manuelBarberImage}
                                                imageClassName="w-12 h-12 rounded-full mr-3"
                                                iconSource="account"
                                                iconSize={24}
                                                iconColor="#6b7280"
                                            />
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs mb-0.5">Dükkan Berberi</Text>
                                                <Text className="text-white text-sm font-semibold mb-1" numberOfLines={1} ellipsizeMode="tail">
                                                    {item.manuelBarberName}
                                                </Text>
                                            </View>
                                        </View>
                                        {/* Manuel barber için rating yapılabilir (sadece Customer) */}
                                        <RatingDisplay
                                            myRating={item.myRatingForManuelBarber}
                                            myComment={item.myCommentForManuelBarber}
                                            averageRating={item.manuelBarberAverageRating}
                                            canRateNow={canRateTarget(item, 'manuelBarber')}
                                            onRatePress={() => item.manuelBarberId && openRatingSheet(item.id, item.manuelBarberId, item.manuelBarberName || 'Manuel Berber', 'manuelBarber', item.manuelBarberImage)}
                                        />
                                    </View>
                                ) : (
                                    <View className="flex-row items-center">
                                        <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-3 items-center justify-center">
                                            <Icon source="seat" size={24} color="#6b7280" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white text-sm font-semibold" numberOfLines={1} ellipsizeMode="tail">
                                                {item.chairName}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {userType === UserType.FreeBarber && (
                        <View>
                            {item.barberStoreId && (
                                <View className="mb-4">
                                    <View className="flex-row items-start mb-2">
                                        <OwnerAvatar
                                            ownerId={item.barberStoreId}
                                            ownerType={ImageOwnerType.Store}
                                            fallbackUrl={item.storeImage}
                                            imageClassName="w-12 h-12 rounded-full mr-3"
                                            iconSource="store"
                                            iconSize={24}
                                            iconColor="#6b7280"
                                        />
                                        <View className="flex-1">
                                            <Text className="text-[#9ca3af] text-xs mb-0.5">Dükkan Adı</Text>
                                            <Text className="text-white text-sm font-semibold mb-1" numberOfLines={1} ellipsizeMode="tail">
                                                {item.storeName}
                                            </Text>
                                            {item.storeType !== undefined && (
                                                <Text className="text-[#9ca3af] text-xs">
                                                    {getBarberTypeName(item.storeType as BarberType)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                        <View className="mb-3">
                                            <TouchableOpacity
                                                onPress={() => item.barberStoreId && handleToggleFavorite(item.barberStoreId, item.id)}
                                                disabled={isTogglingFavorite}
                                                className="flex-row items-center self-start bg-[#1f2023] border border-[#2a2c30] rounded-lg px-3 py-1.5"
                                            >
                                                <Icon source={item.isStoreFavorite ? "heart" : "heart-outline"} size={14} color={item.isStoreFavorite ? "#ef4444" : "#6b7280"} />
                                                <Text className={`text-xs ml-1.5 ${item.isStoreFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                    {item.isStoreFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <RatingDisplay
                                        myRating={item.myRatingForStore}
                                        myComment={item.myCommentForStore}
                                        averageRating={item.storeAverageRating}
                                        canRateNow={canRateTarget(item, 'store')}
                                        onRatePress={() => item.barberStoreId && openRatingSheet(item.id, item.barberStoreId, item.storeName || 'Dükkan', 'store', item.storeImage)}
                                    />
                                </View>
                            )}
                            {item.freeBarberId && item.barberStoreId && formatPricingPolicy(item.pricingType, item.pricingValue) && (
                                <View className="bg-[#2a2c30] rounded-lg p-3 mb-4">
                                    <Text className="text-[#9ca3af] text-xs leading-4">
                                        {formatPricingPolicy(item.pricingType, item.pricingValue)}
                                    </Text>
                                </View>
                            )}
                            {item.customerUserId && (
                                <View className="mb-4">
                                    <View className="flex-row items-start mb-2">
                                        <OwnerAvatar
                                            ownerId={item.customerUserId}
                                            ownerType={ImageOwnerType.User}
                                            fallbackUrl={item.customerImage}
                                            imageClassName="w-12 h-12 rounded-full mr-3"
                                            iconSource="account"
                                            iconSize={24}
                                            iconColor="#6b7280"
                                        />
                                        <View className="flex-1">
                                            <Text className="text-[#9ca3af] text-xs mb-0.5">Müşterisi</Text>
                                            <Text className="text-white text-sm font-semibold mb-1" numberOfLines={1} ellipsizeMode="tail">
                                                {item.customerName || 'Müşteri'}
                                            </Text>
                                            {item.customerNumber && (
                                                <Text className="text-[#6b7280] text-xs">Müşteri No: {item.customerNumber}</Text>
                                            )}
                                        </View>
                                    </View>
                                    {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                        <View className="mb-3">
                                            <TouchableOpacity
                                                onPress={() => item.customerUserId && handleToggleFavorite(item.customerUserId, item.id)}
                                                disabled={isTogglingFavorite}
                                                className="flex-row items-center self-start bg-[#1f2023] border border-[#2a2c30] rounded-lg px-3 py-1.5"
                                            >
                                                <Icon source={item.isCustomerFavorite ? "heart" : "heart-outline"} size={14} color={item.isCustomerFavorite ? "#ef4444" : "#6b7280"} />
                                                <Text className={`text-xs ml-1.5 ${item.isCustomerFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                    {item.isCustomerFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <RatingDisplay
                                        myRating={item.myRatingForCustomer}
                                        myComment={item.myCommentForCustomer}
                                        averageRating={item.customerAverageRating}
                                        canRateNow={canRateTarget(item, 'customer')}
                                        onRatePress={() => item.customerUserId && openRatingSheet(item.id, item.customerUserId, item.customerName || 'Müşteri', 'customer', item.customerImage)}
                                    />
                                </View>
                            )}
                        </View>
                    )}

                    {userType === UserType.Customer && (
                        <View className="flex-row gap-4">
                            {item.barberStoreId && (
                                <View className="flex-1">
                                    <View className="flex-row items-start mb-2">
                                        <OwnerAvatar
                                            ownerId={item.barberStoreId}
                                            ownerType={ImageOwnerType.Store}
                                            fallbackUrl={item.storeImage}
                                            imageClassName="w-12 h-12 rounded-full mr-3"
                                            iconSource="store"
                                            iconSize={24}
                                            iconColor="#6b7280"
                                        />
                                        <View className="flex-1">
                                            <Text className="text-[#9ca3af] text-xs mb-0.5">Dükkan Adı</Text>
                                            <Text className="text-white text-sm font-semibold mb-1" numberOfLines={1} ellipsizeMode="tail">
                                                {item.storeName}
                                            </Text>
                                            {item.storeType !== undefined && (
                                                <Text className="text-[#9ca3af] text-xs">
                                                    {getBarberTypeName(item.storeType as BarberType)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                        <View className="mb-3">
                                            <TouchableOpacity
                                                onPress={() => item.barberStoreId && handleToggleFavorite(item.barberStoreId, item.id)}
                                                disabled={isTogglingFavorite}
                                                className="flex-row items-center self-start bg-[#1f2023] border border-[#2a2c30] rounded-lg px-3 py-1.5"
                                            >
                                                <Icon source={item.isStoreFavorite ? "heart" : "heart-outline"} size={14} color={item.isStoreFavorite ? "#ef4444" : "#6b7280"} />
                                                <Text className={`text-xs ml-1.5 ${item.isStoreFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                    {item.isStoreFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <RatingDisplay
                                        myRating={item.myRatingForStore}
                                        myComment={item.myCommentForStore}
                                        averageRating={item.storeAverageRating}
                                        canRateNow={canRateTarget(item, 'store')}
                                        onRatePress={() => item.barberStoreId && openRatingSheet(item.id, item.barberStoreId, item.storeName || 'Dükkan', 'store', item.storeImage)}
                                    />
                                </View>
                            )}

                            <View className="flex-1">
                                {item.freeBarberId ? (
                                    <View>
                                        <View className="flex-row items-start mb-2">
                                            <OwnerAvatar
                                                ownerId={item.freeBarberId}
                                                ownerType={ImageOwnerType.FreeBarber}
                                                fallbackUrl={item.freeBarberImage}
                                                imageClassName="w-12 h-12 rounded-full mr-3"
                                                iconSource="account-supervisor"
                                                iconSize={24}
                                                iconColor="#6b7280"
                                            />
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs mb-0.5">İşlemi Yapan</Text>
                                                <Text className="text-white text-sm font-semibold mb-1" numberOfLines={1} ellipsizeMode="tail">
                                                    {item.freeBarberName || 'Serbest Berber'}
                                                </Text>
                                                <Text className="text-[#9ca3af] text-xs">Serbest Berber</Text>
                                            </View>
                                        </View>
                                        {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                            <View className="mb-3">
                                                <TouchableOpacity
                                                    onPress={() => item.freeBarberId && handleToggleFavorite(item.freeBarberId, item.id)}
                                                    disabled={isTogglingFavorite}
                                                    className="flex-row items-center self-start bg-[#1f2023] border border-[#2a2c30] rounded-lg px-3 py-1.5"
                                                >
                                                    <Icon source={item.isFreeBarberFavorite ? "heart" : "heart-outline"} size={14} color={item.isFreeBarberFavorite ? "#ef4444" : "#6b7280"} />
                                                    <Text className={`text-xs ml-1.5 ${item.isFreeBarberFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                        {item.isFreeBarberFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <RatingDisplay
                                            myRating={item.myRatingForFreeBarber}
                                            myComment={item.myCommentForFreeBarber}
                                            averageRating={item.freeBarberAverageRating}
                                            canRateNow={canRateTarget(item, 'freeBarber')}
                                            onRatePress={() => item.freeBarberId && openRatingSheet(item.id, item.freeBarberId, item.freeBarberName || 'Serbest Berber', 'freeBarber', item.freeBarberImage)}
                                        />
                                    </View>
                                ) : item.manuelBarberId ? (
                                    <View>
                                        <View className="flex-row items-start mb-2">
                                            <OwnerAvatar
                                                ownerId={item.manuelBarberId}
                                                ownerType={ImageOwnerType.ManuelBarber}
                                                fallbackUrl={item.manuelBarberImage}
                                                imageClassName="w-12 h-12 rounded-full mr-3"
                                                iconSource="account"
                                                iconSize={24}
                                                iconColor="#6b7280"
                                            />
                                            <View className="flex-1">
                                                <Text className="text-[#9ca3af] text-xs mb-0.5">İşlemi Yapan</Text>
                                                <Text className="text-white text-sm font-semibold mb-1" numberOfLines={1} ellipsizeMode="tail">
                                                    {item.manuelBarberName}
                                                </Text>
                                                <Text className="text-[#9ca3af] text-xs">Dükkan Çalışanı</Text>
                                            </View>
                                        </View>
                                        {/* Manuel barber için rating yapılabilir (sadece Customer) */}
                                        <RatingDisplay
                                            myRating={item.myRatingForManuelBarber}
                                            myComment={item.myCommentForManuelBarber}
                                            averageRating={item.manuelBarberAverageRating}
                                            canRateNow={canRateTarget(item, 'manuelBarber')}
                                            onRatePress={() => item.manuelBarberId && openRatingSheet(item.id, item.manuelBarberId, item.manuelBarberName || 'Manuel Berber', 'manuelBarber', item.manuelBarberImage)}
                                        />
                                    </View>
                                ) : (
                                    <View className="flex-row items-center">
                                        <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-3 items-center justify-center">
                                            <Icon source="seat" size={24} color="#6b7280" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white text-sm font-semibold" numberOfLines={1} ellipsizeMode="tail">
                                                {item.chairName}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* Fiyatlandırma Bilgisi - Sadece FreeBarber ve Dükkan varsa göster */}
                {item.freeBarberId && item.barberStoreId && formatPricingPolicy(item.pricingType, item.pricingValue) && (
                    <View className="bg-[#1f2023] border border-[#2a2c30] rounded-lg p-3 mt-3 mb-3">
                        <View className="flex-row items-center mb-1">
                            <Icon source="cash" size={14} color="#f05e23" />
                            <Text className="text-[#9ca3af] text-xs ml-1.5 font-semibold">Fiyatlandırma:</Text>
                        </View>
                        <Text className="text-[#d1d5db] text-xs leading-4 ml-5">
                            {formatPricingPolicy(item.pricingType, item.pricingValue)}
                        </Text>
                    </View>
                )}

                {item.storeAddressDescription && (
                    <View className="mt-0 mb-3">
                        <View className="flex-row items-center mb-1">
                            <Icon source="map-marker" size={14} color="#6b7280" />
                            <Text className="text-[#9ca3af] text-xs ml-1.5 font-semibold">Adres:</Text>
                        </View>
                        <Text className="text-[#6b7280] text-xs leading-4 ml-5" numberOfLines={2} ellipsizeMode="tail">
                            {item.storeAddressDescription}
                        </Text>
                    </View>
                )}

                {/* Hizmetler */}
                {item.services.length > 0 && (
                    <View className="mt-3 mb-2">
                        <View className="flex-row items-center mb-2">
                            <Icon source="scissors-cutting" size={14} color="#6b7280" />
                            <Text className="text-[#9ca3af] text-xs ml-1.5 font-semibold">
                                {userType === UserType.Customer ? 'İşlemlerim:' : 'Hizmetler:'}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} >
                                {item.services.map((service) => (
                                    <View key={service.serviceId} className="bg-[#2a2c30] rounded-lg px-3 py-2 ml-2 flex-row items-center">
                                        <Text className="text-white text-xs font-medium" numberOfLines={1} ellipsizeMode="tail">
                                            {service.serviceName} :
                                        </Text>
                                        <Text className="text-[#22c55e] text-xs font-semibold">
                                            ₺{Number(service.price).toFixed(0)}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                    </View>
                )}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-[#0D0D0D]" style={{ paddingTop: insets.top }}>
            <View className="pt-0 pb-2">
                <View className="px-4 mb-2 flex-row gap-2">
                    <FilterChip
                        itemKey="active"
                        selected={activeFilter === AppointmentFilter.Active}
                        onPress={() => setActiveFilter(AppointmentFilter.Active)}
                    >
                        Aktif
                    </FilterChip>
                    <FilterChip
                        itemKey="completed"
                        selected={activeFilter === AppointmentFilter.Completed}
                        onPress={() => setActiveFilter(AppointmentFilter.Completed)}
                    >
                        Tamamlanan
                    </FilterChip>
                    <FilterChip
                        itemKey="cancelled"
                        selected={activeFilter === AppointmentFilter.Cancelled}
                        onPress={() => setActiveFilter(AppointmentFilter.Cancelled)}
                    >
                        İptal / Geçmiş
                    </FilterChip>
                </View>
                {(activeFilter === AppointmentFilter.Completed || activeFilter === AppointmentFilter.Cancelled) &&
                    filteredAppointments && filteredAppointments.length > 0 && (
                        <View className="px-4 mb-2">
                            <TouchableOpacity
                                onPress={handleDeleteAll}
                                disabled={isDeletingAllAppointments}
                                className={`bg-red-600 rounded-lg px-3 py-2 flex-row items-center gap-1.5 self-start ${isDeletingAllAppointments ? 'opacity-60' : ''}`}
                            >
                                {isDeletingAllAppointments ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Icon source="delete-sweep" size={18} color="white" />
                                )}
                                <Text className="text-white font-semibold text-sm">Tümünü Sil</Text>
                            </TouchableOpacity>
                        </View>
                    )}
            </View>

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#f05e23" />
                </View>
            ) : isError && error ? (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isFetching && !isLoading}
                            onRefresh={refetch}
                            tintColor="#f05e23"
                        />
                    }
                >
                    <LottieViewComponent
                        animationSource={require('../../../assets/animations/error.json')}
                        message={resolveApiErrorMessage(error)}
                    />
                </ScrollView>
            ) : (
                <LegendList
                    data={filteredAppointments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    estimatedItemSize={250}

                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 10 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isFetching && !isLoading}
                            onRefresh={refetch}
                            tintColor="#f05e23"
                            progressViewOffset={0}
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center mt-20 p-5">
                            <Icon source="calendar-blank" size={32} color="#2a2c30" />
                            <Text className="text-[#6b7280] mt-2">Bu kategoride randevu bulunamadı.</Text>
                        </View>
                    }
                />
            )}

            {/* Rating Bottom Sheet */}
            <BottomSheetModal
                ref={ratingSheet.ref}
                snapPoints={ratingSheet.snapPoints}
                enablePanDownToClose={ratingSheet.enablePanDownToClose}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: '#151618' }}
                backdropComponent={ratingSheet.makeBackdrop()}
                onChange={(index) => {
                    ratingSheet.handleChange(index);
                    if (index < 0) {
                        setSelectedRatingTarget(null);
                    }
                }}
            >
                <BottomSheetView className="h-full pt-2">
                    {selectedRatingTarget && (
                        <RatingBottomSheet
                            appointmentId={selectedRatingTarget.appointmentId}
                            targetId={selectedRatingTarget.targetId}
                            targetName={selectedRatingTarget.targetName}
                            targetType={selectedRatingTarget.targetType}
                            targetImage={selectedRatingTarget.targetImage}
                            onClose={() => {
                                setSelectedRatingTarget(null);
                                ratingSheet.dismiss();
                            }}
                        />
                    )}
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    );
}
