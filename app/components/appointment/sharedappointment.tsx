import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, RefreshControl, Image, ActivityIndicator } from "react-native";
// SafeAreaView yerine useSafeAreaInsets kullanıyoruz (Hata Çözümü)
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";

// Store ve Tipler
import {
    useGetAllAppointmentByFilterQuery,
    useCancelAppointmentMutation,
    useCompleteAppointmentMutation
} from "../../store/api";
import { AppointmentStatus, AppointmentFilter, AppointmentGetDto } from "../../types/appointment";
import { useAuth } from "../../hook/useAuth";
import { UserType } from "../../types";
// Kendi Bileşenleriniz
import FilterChip from "../common/filter-chip";

export default function SharedAppointmentScreen() {
    const { userId, userType } = useAuth();
    // Güvenli alan boşluğunu hook ile alıyoruz
    const insets = useSafeAreaInsets();

    const [activeFilter, setActiveFilter] = useState<AppointmentFilter>(AppointmentFilter.Active);

    // --- API ---
    const { data: appointments, isLoading, refetch, isFetching } = useGetAllAppointmentByFilterQuery(activeFilter, {
        refetchOnMountOrArgChange: true,
    });

    const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
    const [completeAppointment, { isLoading: isCompleting }] = useCompleteAppointmentMutation();

    // --- Zaman Kontrolü ---
    const isTimePassed = useCallback((dateStr: string, endTimeStr: string) => {
        try {
            const timePart = endTimeStr.length === 5 ? endTimeStr + ":00" : endTimeStr;
            const appointmentEnd = new Date(`${dateStr}T${timePart}`);
            const now = new Date();
            return now > appointmentEnd;
        } catch { return false; }
    }, []);

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

    // --- RENDER ITEM ---
    const renderItem = ({ item }: { item: AppointmentGetDto }) => {
        const passed = isTimePassed(item.appointmentDate, item.endTime);
        const isApproved = item.status === AppointmentStatus.Approved;
        const isCustomerView = userType === UserType.Customer;

        let displayName = "";
        let displayImage = "";
        let displayRoleText = "";

        if (isCustomerView) {
            if (item.barberStoreId) {
                displayName = item.storeName || "Dükkan";
                displayImage = item.storeImage || "";
                displayRoleText = "Berber Dükkanı";
            } else if (item.freeBarberId) {
                displayName = item.freeBarberName || "Serbest Berber";
                displayImage = item.freeBarberImage || "";
                displayRoleText = "Serbest Berber";
            } else if (item.manuelBarberId) {
                displayName = item.manuelBarberName || "Manuel Berber";
                displayImage = item.manuelBarberImage || "";
                displayRoleText = "Manuel Berber";
            }
        } else {
            displayName = item.customerName || "Misafir Müşteri";
            displayImage = item.customerImage || "";
            displayRoleText = "Müşteri";
        }

        let showCompleteButton = false;
        let showCancelButton = false;

        if (activeFilter === AppointmentFilter.Active) {

            if (isApproved && passed && userType == UserType.BarberStore) {
                showCompleteButton = true;
            }
            showCancelButton = true;


        }

        return (
            <View className="bg-[#151618] rounded-xl p-4 mb-3 border border-[#1f2023]">
                <View className="flex-row justify-between items-start mb-3">
                    <View>
                        <View className="flex-row items-center mb-1">
                            <Icon source="calendar" size={16} color="#f05e23" />
                            <Text className="text-white font-bold text-base ml-1.5">
                                {new Date(item.appointmentDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <Icon source="clock-outline" size={16} color="#8b8c90" />
                            <Text className="text-[#8b8c90] text-sm ml-1.5">
                                {item.startTime.substring(0, 5)} - {item.endTime.substring(0, 5)}
                            </Text>
                        </View>
                    </View>
                    <View className={`px-2.5 py-1 rounded-lg border ${item.status === AppointmentStatus.Approved ? 'bg-green-900/20 border-green-800/30' :
                        item.status === AppointmentStatus.Pending ? 'bg-yellow-900/20 border-yellow-800/30' :
                            'bg-red-900/20 border-red-800/30'
                        }`}>
                        <Text className={`text-xs font-semibold ${item.status === AppointmentStatus.Approved ? 'text-green-400' :
                            item.status === AppointmentStatus.Pending ? 'text-yellow-400' :
                                'text-red-400'
                            }`}>
                            {item.status === AppointmentStatus.Approved ? 'Onaylandı' :
                                item.status === AppointmentStatus.Pending ? 'Bekliyor' :
                                    item.status === AppointmentStatus.Completed ? 'Tamamlandı' : 'İptal/Diğer'}
                        </Text>
                    </View>
                </View>

                <View className="border-t border-[#2a2c30] pt-3 mb-3">
                    <View className="flex-row items-center">
                        {displayImage ? (
                            <Image source={{ uri: displayImage }} className="w-10 h-10 rounded-full mr-3" />
                        ) : (
                            <View className="w-10 h-10 bg-[#2a2c30] rounded-full items-center justify-center mr-3">
                                <Icon source={isCustomerView ? "store" : "account"} size={20} color="#9ca3af" />
                            </View>
                        )}
                        <View>
                            <Text className="text-[#9ca3af] text-xs">{displayRoleText}</Text>
                            <Text className="text-white font-medium text-base">{displayName}</Text>
                        </View>
                    </View>
                </View>

                {item.services && item.services.length > 0 && (
                    <View className="bg-[#1c1d20] p-3 rounded-lg mb-3">
                        <Text className="text-[#9ca3af] text-xs mb-2 font-semibold">Hizmet Detayı:</Text>
                        {item.services.map((s, index) => (
                            <View key={index} className="flex-row justify-between mb-1">
                                <Text className=" text-xs text-gray-300">• {s.serviceName}</Text>
                                <Text className="text-white text-xs font-semibold">₺{s.price}</Text>
                            </View>
                        ))}
                        <View className="border-t border-[#2a2c30] mt-2 pt-2 flex-row justify-between">
                            <Text className="text-[#f05e23] font-bold text-sm">TOPLAM</Text>
                            <Text className="text-[#f05e23] font-bold text-sm">₺{item.totalPrice}</Text>
                        </View>
                    </View>
                )}

                <View className="flex-row gap-3 mt-1">
                    {showCompleteButton && (
                        <TouchableOpacity
                            onPress={() => handleComplete(item.id)}
                            disabled={isCompleting}
                            className="flex-1 bg-green-600 py-3 rounded-xl flex-row items-center justify-center"
                        >
                            {isCompleting ? <ActivityIndicator color="white" size="small" /> : (
                                <>
                                    <Icon source="check-all" size={20} color="white" />
                                    <Text className="text-white font-bold ml-2">Tamamla</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                    {showCancelButton && (
                        <TouchableOpacity
                            onPress={() => handleCancel(item.id)}
                            disabled={isCancelling}
                            className="flex-1 bg-[#2a2c30] border border-red-900/40 py-3 rounded-xl flex-row items-center justify-center"
                        >
                            {isCancelling ? <ActivityIndicator color="#ef4444" size="small" /> : (
                                <>
                                    <Icon source="close-circle-outline" size={20} color="#ef4444" />
                                    <Text className="text-[#ef4444] font-semibold ml-2">İptal Et</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        // DÜZELTME BURADA: SafeAreaView yerine normal View kullanıp insets ile padding verdik
        <View
            className="flex-1 bg-[#0D0D0D]"
            style={{ paddingTop: insets.top }}
        >
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
        </View>
    );
}