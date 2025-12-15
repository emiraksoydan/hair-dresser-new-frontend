import React, { useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, RefreshControl, Image, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { StarRatingDisplay } from "react-native-star-rating-widget";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
    useGetAllAppointmentByFilterQuery,
    useCancelAppointmentMutation,
    useCompleteAppointmentMutation,
    useCreateRatingMutation,
    useToggleFavoriteMutation
} from "../../store/api";
import { AppointmentStatus, AppointmentFilter, AppointmentGetDto, AppointmentRequester } from "../../types/appointment";
import { useAuth } from "../../hook/useAuth";
import { BarberType, UserType, PricingType } from "../../types";
import FilterChip from "../common/filter-chip";
import { getBarberTypeName } from "../../utils/store/barber-type";
import { RatingBottomSheet } from "./ratingbottomsheet";

export default function SharedAppointmentScreen() {
    const { userId, userType } = useAuth();
    const insets = useSafeAreaInsets();
    const [activeFilter, setActiveFilter] = useState<AppointmentFilter>(AppointmentFilter.Active);
    const ratingBottomSheetRef = useRef<BottomSheetModal>(null);
    const [selectedRatingTarget, setSelectedRatingTarget] = useState<{
        appointmentId: string;
        targetId: string;
        targetName: string;
    } | null>(null);

    // --- API ---
    const { data: appointments, isLoading, refetch, isFetching } = useGetAllAppointmentByFilterQuery(activeFilter, {
        refetchOnMountOrArgChange: true,
    });

    const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
    const [completeAppointment, { isLoading: isCompleting }] = useCompleteAppointmentMutation();
    const [toggleFavorite, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();

    // --- Helper Functions ---
    const formatPricingPolicy = useCallback((pricingType?: number, pricingValue?: number) => {
        if (pricingType === undefined || pricingValue === undefined) return null;
        if (pricingType === PricingType.Percent) return `Fiyatlandırma: Yapılan işlemlerin toplamının %${pricingValue} alınır`;
        if (pricingType === PricingType.Rent) return `Fiyatlandırma: Koltuk kirası (Saatlik: ${pricingValue}₺/saat)`;
        return null;
    }, []);

    const formatRating = useCallback((rating?: number) => rating?.toFixed(1) ?? null, []);

    // --- Zaman Kontrolü ---
    const isTimePassed = useCallback((dateStr: string, endTimeStr: string) => {
        try {
            const timePart = endTimeStr.length === 5 ? endTimeStr + ":00" : endTimeStr;
            const appointmentEnd = new Date(`${dateStr}T${timePart}`);
            const now = new Date();
            return now > appointmentEnd;
        } catch { return false; }
    }, []);

    // Rating yapılabilir mi kontrolü
    const canRate = useCallback((item: AppointmentGetDto) => {
        return item.status === AppointmentStatus.Completed || item.status === AppointmentStatus.Cancelled;
    }, []);

    // Rating bottom sheet aç
    const openRatingSheet = useCallback((appointmentId: string, targetId: string, targetName: string) => {
        setSelectedRatingTarget({ appointmentId, targetId, targetName });
        ratingBottomSheetRef.current?.present();
    }, []);

    // Favori toggle
    const handleToggleFavorite = useCallback(async (targetId: string, appointmentId?: string) => {
        try {
            await toggleFavorite({
                targetId,
                appointmentId: appointmentId || null,
            }).unwrap();

            // Listeyi yenile - cache invalidation otomatik olarak yapılacak
            refetch();
        } catch (error: any) {
            Alert.alert('Hata', error?.data?.message || error?.message || 'Favori işlemi başarısız.');
        }
    }, [toggleFavorite, refetch]);

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
        // Rating gösterimi: Tamamlanan/iptal durumlarında her zaman gösterilmeli
        // Ortalama rating her zaman gösterilmeli (eğer varsa)
        // Kullanıcının kendi rating'i de her zaman gösterilmeli (eğer varsa)
        const hasAnyRating = (averageRating !== undefined && averageRating !== null) ||
            (myRating !== undefined && myRating > 0);

        return (
            <View className="mt-1">
                {/* Ortalama Rating - Her zaman göster (eğer varsa) */}
                {averageRating !== undefined && averageRating !== null && (
                    <View className="flex-row items-center mb-1">
                        <Icon source="star" size={12} color="#fbbf24" />
                        <Text className="text-[#fbbf24] text-xs ml-1">{formatRating(averageRating)}</Text>
                        <Text className="text-[#6b7280] text-xs ml-1">(Ortalama)</Text>
                    </View>
                )}

                {/* Kullanıcının Rating'i - Eğer yapmışsa göster */}
                {myRating !== undefined && myRating > 0 && (
                    <View className="mt-1">
                        <View className="flex-row items-center mb-1">
                            <StarRatingDisplay
                                rating={myRating}
                                starSize={12}
                                starStyle={{ marginHorizontal: 0 }}
                            />
                            <Text className="text-[#fbbf24] text-xs ml-1">{formatRating(myRating)}</Text>
                            <Text className="text-[#6b7280] text-xs ml-1">(Sizin değerlendirmeniz)</Text>
                        </View>
                        {myComment && (
                            <Text className="text-[#9ca3af] text-xs mt-0.5 italic">"{myComment}"</Text>
                        )}
                    </View>
                )}

                {/* Rating Yap Butonu - Eğer yapmamışsa ve Completed/Cancelled ise göster */}
                {canRateNow && myRating === undefined && (
                    <TouchableOpacity
                        onPress={onRatePress}
                        className="flex-row items-center mt-1"
                    >
                        <Icon source="star-outline" size={14} color="#f05e23" />
                        <Text className="text-[#f05e23] text-xs ml-1">Değerlendirme Yap</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // --- RENDER ITEM ---
    const renderItem = ({ item }: { item: AppointmentGetDto }) => {
        const passed = isTimePassed(item.appointmentDate, item.endTime);
        const isApproved = item.status === AppointmentStatus.Approved;
        const canRateNow = canRate(item);

        let showCompleteButton = false;
        let showCancelButton = false;

        if (activeFilter === AppointmentFilter.Active) {
            if (isApproved && passed && userType == UserType.BarberStore) {
                showCompleteButton = true;
            }
            showCancelButton = true;
        }

        // Tamamlanan/iptal durumlarında kart tasarımını iyileştir
        const isCompletedOrCancelled = activeFilter === AppointmentFilter.Completed || activeFilter === AppointmentFilter.Cancelled;
        
        return (
            <View className={`bg-[#151618] rounded-xl p-4 mb-3 border ${isCompletedOrCancelled ? 'border-[#2a2c30]' : 'border-[#1f2023]'}`}>
                {isCompletedOrCancelled && (
                    <View className="mb-3 pb-3 border-b border-[#2a2c30]">
                        <View className="flex-row items-center gap-2">
                            <Icon 
                                source={activeFilter === AppointmentFilter.Completed ? "check-circle" : "close-circle"} 
                                size={16} 
                                color={activeFilter === AppointmentFilter.Completed ? "#22c55e" : "#ef4444"} 
                            />
                            <Text className={`text-sm font-semibold ${activeFilter === AppointmentFilter.Completed ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                                {activeFilter === AppointmentFilter.Completed ? 'Tamamlandı' : 'İptal Edildi'}
                            </Text>
                        </View>
                    </View>
                )}
                <View className="flex-row justify-between items-start mb-3">
                    {item.appointmentRequester != AppointmentRequester.Store && userType != UserType.FreeBarber && (
                        <View className="flex-row items-center mb-3">
                            <Icon source="calendar" size={16} color="#6b7280" />
                            <Text className="text-[#9ca3af] text-sm ml-1.5">
                                {new Date(item.appointmentDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                            </Text>
                            <Text className="text-[#6b7280] mx-1.5">•</Text>
                            <Icon source="clock-outline" size={14} color="#6b7280" />
                            <Text className="text-[#9ca3af] text-sm ml-1">
                                {item.startTime.substring(0, 5)} - {item.endTime.substring(0, 5)}
                            </Text>
                        </View>
                    )}

                    <View className="flex-row gap-2 mb-3 items-center">
                        {showCompleteButton && (
                            <TouchableOpacity
                                onPress={() => handleComplete(item.id)}
                                disabled={isCompleting}
                                className=" bg-green-600 p-1 rounded-xl flex-row items-center justify-center"
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
                                className=" bg-[#2a2c30] border border-red-900/40 p-1 rounded-xl flex-row items-center justify-center"
                            >
                                {isCancelling ? <ActivityIndicator color="#ef4444" size="small" /> : (
                                    <>
                                        <Icon source="close-circle-outline" size={15} color="#ef4444" />
                                        <Text className="text-[#ef4444] text-sm ml-2">İptal Et</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View className="mb-3">
                    {userType === UserType.BarberStore && (
                        <View className="flex-row gap-3">
                            {item.customerUserId && (
                                <View className="flex-1 flex-row items-center">
                                    {item.customerImage ? (
                                        <Image source={{ uri: item.customerImage }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                                    ) : (
                                        <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                            <Icon source="account" size={24} color="#6b7280" />
                                        </View>
                                    )}
                                    <View className="flex-1">
                                        <Text className="text-[#9ca3af] text-xs">Müşteri</Text>
                                        <Text className="text-white text-sm font-semibold">{item.customerName}</Text>
                                        {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                            <View className="flex-row items-center gap-2 mt-1">
                                                <TouchableOpacity
                                                    onPress={() => item.customerUserId && handleToggleFavorite(item.customerUserId, item.id)}
                                                    disabled={isTogglingFavorite}
                                                    className="flex-row items-center"
                                                >
                                                    <Icon source={item.isCustomerFavorite ? "heart" : "heart-outline"} size={16} color={item.isCustomerFavorite ? "#ef4444" : "#6b7280"} />
                                                    <Text className={`text-xs ml-1 ${item.isCustomerFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                        {item.isCustomerFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <RatingDisplay
                                            myRating={item.myRatingForCustomer}
                                            myComment={item.myCommentForCustomer}
                                            averageRating={item.customerAverageRating}
                                            canRateNow={canRateNow}
                                            onRatePress={() => item.customerUserId && openRatingSheet(item.id, item.customerUserId, item.customerName || 'Müşteri')}
                                        />
                                    </View>
                                </View>
                            )}
                            <View className="flex-1">
                                {item.freeBarberId ? (
                                    <View className="flex-row items-center">
                                        {item.freeBarberImage ? (
                                            <Image source={{ uri: item.freeBarberImage }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                                        ) : (
                                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                <Icon source="account-supervisor" size={24} color="#6b7280" />
                                            </View>
                                        )}
                                        <View className="flex-1">
                                            <Text className="text-[#9ca3af] text-xs">Traş Edecek</Text>
                                            <Text className="text-white text-sm font-semibold">{item.freeBarberName || 'Serbest Berber'}</Text>
                                            {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                                <TouchableOpacity
                                                    onPress={() => item.freeBarberId && handleToggleFavorite(item.freeBarberId, item.id)}
                                                    disabled={isTogglingFavorite}
                                                    className="flex-row items-center mt-0.5"
                                                >
                                                    <Icon source={item.isFreeBarberFavorite ? "heart" : "heart-outline"} size={14} color={item.isFreeBarberFavorite ? "red" : "gray"} />
                                                </TouchableOpacity>
                                            )}
                                            <RatingDisplay
                                                myRating={item.myRatingForFreeBarber}
                                                myComment={item.myCommentForFreeBarber}
                                                averageRating={item.freeBarberAverageRating}
                                                canRateNow={canRateNow}
                                                onRatePress={() => item.freeBarberId && openRatingSheet(item.id, item.freeBarberId, item.freeBarberName || 'Serbest Berber')}
                                            />
                                        </View>
                                    </View>
                                ) : item.manuelBarberId ? (
                                    <View className="flex-row items-center">
                                        {item.manuelBarberImage ? (
                                            <Image source={{ uri: item.manuelBarberImage }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                                        ) : (
                                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                <Icon source="account" size={24} color="#6b7280" />
                                            </View>
                                        )}
                                        <View className="flex-1">
                                            <Text className="text-[#9ca3af] text-xs">Dükkan Berberi</Text>
                                            <Text className="text-white text-sm font-semibold">{item.manuelBarberName}</Text>
                                            {/* Manuel barber için like durumu yok */}
                                            <RatingDisplay
                                                myRating={item.myRatingForManuelBarber}
                                                myComment={item.myCommentForManuelBarber}
                                                averageRating={item.manuelBarberAverageRating}
                                                canRateNow={canRateNow}
                                                onRatePress={() => item.manuelBarberId && openRatingSheet(item.id, item.manuelBarberId, item.manuelBarberName || 'Manuel Berber')}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <View className="flex-row items-center">
                                        <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                            <Icon source="seat" size={24} color="#6b7280" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white text-sm font-semibold">{item.chairName}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {userType === UserType.FreeBarber && (
                        <View>
                            {item.barberStoreId && (
                                <View className="flex-row items-center mb-2">
                                    {item.storeImage ? (
                                        <Image source={{ uri: item.storeImage }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                                    ) : (
                                        <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                            <Icon source="store" size={24} color="#6b7280" />
                                        </View>
                                    )}
                                    <View className="flex-1">
                                        <Text className="text-[#9ca3af] text-xs">Berber Dükkanı</Text>
                                        <Text className="text-white text-sm font-semibold">{item.storeName}</Text>
                                        {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                            <View className="flex-row items-center gap-2 mt-1">
                                                <TouchableOpacity
                                                    onPress={() => item.barberStoreId && handleToggleFavorite(item.barberStoreId, item.id)}
                                                    disabled={isTogglingFavorite}
                                                    className="flex-row items-center"
                                                >
                                                    <Icon source={item.isStoreFavorite ? "heart" : "heart-outline"} size={16} color={item.isStoreFavorite ? "#ef4444" : "#6b7280"} />
                                                    <Text className={`text-xs ml-1 ${item.isStoreFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                        {item.isStoreFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <RatingDisplay
                                            myRating={item.myRatingForStore}
                                            myComment={item.myCommentForStore}
                                            averageRating={item.storeAverageRating}
                                            canRateNow={canRateNow}
                                            onRatePress={() => item.barberStoreId && openRatingSheet(item.id, item.barberStoreId, item.storeName || 'Dükkan')}
                                        />
                                    </View>
                                </View>
                            )}
                            {formatPricingPolicy(item.pricingType, item.pricingValue) && (
                                <View className="bg-[#2a2c30] rounded-lg p-2 mb-2">
                                    <Text className="text-[#9ca3af] text-xs">
                                        {formatPricingPolicy(item.pricingType, item.pricingValue)}
                                    </Text>
                                </View>
                            )}
                            {item.customerUserId && (
                                <View className="flex-row items-center">
                                    {item.customerImage ? (
                                        <Image source={{ uri: item.customerImage }} className="w-10 h-10 rounded-full mr-2" resizeMode="cover" />
                                    ) : (
                                        <View className="w-10 h-10 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                            <Icon source="account" size={20} color="#6b7280" />
                                        </View>
                                    )}
                                    <View className="flex-1">
                                        <Text className="text-[#9ca3af] text-xs">Müşteri</Text>
                                        <Text className="text-white text-sm font-semibold">{item.customerName || 'Müşteri'}</Text>
                                        {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                            <View className="flex-row items-center gap-2 mt-1">
                                                <TouchableOpacity
                                                    onPress={() => item.customerUserId && handleToggleFavorite(item.customerUserId, item.id)}
                                                    disabled={isTogglingFavorite}
                                                    className="flex-row items-center"
                                                >
                                                    <Icon source={item.isCustomerFavorite ? "heart" : "heart-outline"} size={16} color={item.isCustomerFavorite ? "#ef4444" : "#6b7280"} />
                                                    <Text className={`text-xs ml-1 ${item.isCustomerFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                        {item.isCustomerFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <RatingDisplay
                                            myRating={item.myRatingForCustomer}
                                            myComment={item.myCommentForCustomer}
                                            averageRating={item.customerAverageRating}
                                            canRateNow={canRateNow}
                                            onRatePress={() => item.customerUserId && openRatingSheet(item.id, item.customerUserId, item.customerName || 'Müşteri')}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {userType === UserType.Customer && (
                        <View className="flex-row gap-3">
                            {item.barberStoreId && (
                                <View className="flex-1 flex-row items-center">
                                    {item.storeImage ? (
                                        <Image source={{ uri: item.storeImage }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                                    ) : (
                                        <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                            <Icon source="store" size={24} color="#6b7280" />
                                        </View>
                                    )}
                                    <View className="flex-1">
                                        <Text className="text-[#9ca3af] text-xs">Berber Dükkanı</Text>
                                        <Text className="text-white text-sm font-semibold">{item.storeName}</Text>
                                        {item.storeType !== undefined && (
                                            <Text className="text-[#9ca3af] text-xs mt-0.5">
                                                {getBarberTypeName(item.storeType as BarberType)}
                                            </Text>
                                        )}
                                        {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                            <View className="flex-row items-center gap-2 mt-1">
                                                <TouchableOpacity
                                                    onPress={() => item.barberStoreId && handleToggleFavorite(item.barberStoreId, item.id)}
                                                    disabled={isTogglingFavorite}
                                                    className="flex-row items-center"
                                                >
                                                    <Icon source={item.isStoreFavorite ? "heart" : "heart-outline"} size={16} color={item.isStoreFavorite ? "#ef4444" : "#6b7280"} />
                                                    <Text className={`text-xs ml-1 ${item.isStoreFavorite ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                                                        {item.isStoreFavorite ? 'Favorilerinizde' : 'Favorilere Ekle'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <RatingDisplay
                                            myRating={item.myRatingForStore}
                                            myComment={item.myCommentForStore}
                                            averageRating={item.storeAverageRating}
                                            canRateNow={canRateNow}
                                            onRatePress={() => item.barberStoreId && openRatingSheet(item.id, item.barberStoreId, item.storeName || 'Dükkan')}
                                        />
                                    </View>
                                </View>
                            )}

                            <View className="flex-1">
                                {item.freeBarberId ? (
                                    <View className="flex-row items-center">
                                        {item.freeBarberImage ? (
                                            <Image source={{ uri: item.freeBarberImage }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                                        ) : (
                                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                <Icon source="account-supervisor" size={24} color="#6b7280" />
                                            </View>
                                        )}
                                        <View className="flex-1">
                                            <Text className="text-[#9ca3af] text-xs">Traş Edecek</Text>
                                            <Text className="text-white text-sm font-semibold">{item.freeBarberName || 'Serbest Berber'}</Text>
                                            {(activeFilter === AppointmentFilter.Cancelled || activeFilter === AppointmentFilter.Completed) && (
                                                <TouchableOpacity
                                                    onPress={() => item.freeBarberId && handleToggleFavorite(item.freeBarberId, item.id)}
                                                    disabled={isTogglingFavorite}
                                                    className="flex-row items-center mt-0.5"
                                                >
                                                    <Icon source={item.isFreeBarberFavorite ? "heart" : "heart-outline"} size={14} color={item.isFreeBarberFavorite ? "red" : "gray"} />
                                                </TouchableOpacity>
                                            )}
                                            <RatingDisplay
                                                myRating={item.myRatingForFreeBarber}
                                                myComment={item.myCommentForFreeBarber}
                                                averageRating={item.freeBarberAverageRating}
                                                canRateNow={canRateNow}
                                                onRatePress={() => item.freeBarberId && openRatingSheet(item.id, item.freeBarberId, item.freeBarberName || 'Serbest Berber')}
                                            />
                                        </View>
                                    </View>
                                ) : item.manuelBarberId ? (
                                    <View className="flex-row items-center">
                                        {item.manuelBarberImage ? (
                                            <Image source={{ uri: item.manuelBarberImage }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                                        ) : (
                                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                                <Icon source="account" size={24} color="#6b7280" />
                                            </View>
                                        )}
                                        <View className="flex-1">
                                            <Text className="text-[#9ca3af] text-xs">Manuel Berber</Text>
                                            <Text className="text-white text-sm font-semibold">{item.manuelBarberName}</Text>
                                            {/* Manuel barber için like durumu yok */}
                                            <RatingDisplay
                                                myRating={item.myRatingForManuelBarber}
                                                myComment={item.myCommentForManuelBarber}
                                                averageRating={item.manuelBarberAverageRating}
                                                canRateNow={canRateNow}
                                                onRatePress={() => item.manuelBarberId && openRatingSheet(item.id, item.manuelBarberId, item.manuelBarberName || 'Manuel Berber')}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <View className="flex-row items-center">
                                        <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                            <Icon source="seat" size={24} color="#6b7280" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white text-sm font-semibold">{item.chairName}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* Hizmetler */}
                {item.services.length > 0 && (
                    <View className="mb-2 mt-2 flex-row items-center">
                        <Text className="text-[#9ca3af] text-xs mb-1 font-semibold">Hizmetler:</Text>
                        <ScrollView className="gap-1.5" horizontal showsHorizontalScrollIndicator={false}>
                            {item.services.map((service) => (
                                <View key={service.serviceId} className="bg-[#2a2c30] rounded-lg px-2 py-1">
                                    <Text className="text-white text-sm">
                                        {service.serviceName} ₺{Number(service.price).toFixed(0)}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
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
            </View>

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#f05e23" />
                </View>
            ) : (
                <FlatList
                    data={appointments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 10 }}
                    refreshControl={
                        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#f05e23" />
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
                ref={ratingBottomSheetRef}
                index={0}
                snapPoints={['60%']}
                enablePanDownToClose
                backgroundStyle={{ backgroundColor: '#151618' }}
            >
                {selectedRatingTarget && (
                    <RatingBottomSheet
                        appointmentId={selectedRatingTarget.appointmentId}
                        targetId={selectedRatingTarget.targetId}
                        targetName={selectedRatingTarget.targetName}
                        onClose={() => {
                            ratingBottomSheetRef.current?.dismiss();
                            setSelectedRatingTarget(null);
                        }}
                        onSuccess={() => {
                            refetch();
                        }}
                    />
                )}
            </BottomSheetModal>
        </View>
    );
}
