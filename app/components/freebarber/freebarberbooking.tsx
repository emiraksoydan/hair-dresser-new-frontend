import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useGetFreeBarberForUsersQuery, useCreateCustomerAppointmentMutation, useCreateStoreAppointmentMutation } from '../../store/api';
import FilterChip from '../common/filter-chip';
import { getBarberTypeName } from '../../utils/store/barber-type';
import { SkeletonComponent } from '../common/skeleton';
import { LottieViewComponent } from '../common/lottieview';
import { useAuth } from '../../hook/useAuth';
import { UserType, FreeBarGetDto } from '../../types';
import { MESSAGES } from '../../constants/messages';
import { APPOINTMENT_CONSTANTS } from '../../constants/appointment';

interface Props {
    barberId: string;
    isBottomSheet?: boolean;
    isBarberMode?: boolean;
}

const FreeBarberBookingContent = ({ barberId, isBottomSheet = false, isBarberMode = false }: Props) => {
    const router = useRouter();
    const { data: freeBarberData, isLoading } = useGetFreeBarberForUsersQuery(barberId, { skip: !barberId });
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [createCustomerAppointment, { isLoading: isCreatingCustomer }] = useCreateCustomerAppointmentMutation();
    const [createStoreAppointment, { isLoading: isCreatingStore }] = useCreateStoreAppointmentMutation();

    const { userType: currentUserType } = useAuth();

    const toggleService = useCallback((id: string) => {
        setSelectedServices(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    }, []);

    const totalPrice = useMemo(() => {
        const servicesTotal = (freeBarberData?.offerings ?? [])
            .filter(x => selectedServices.includes(x.id))
            .reduce((sum, x) => sum + Number(x.price ?? 0), 0);
        return Number(servicesTotal.toFixed(APPOINTMENT_CONSTANTS.DECIMAL_PLACES));
    }, [freeBarberData?.offerings, selectedServices]);

    // Loading
    if (isLoading) {
        return (
            <View className="flex-1 pt-4">
                {Array.from({ length: 1 }).map((_, i) => <SkeletonComponent key={i} />)}
            </View>
        );
    }

    // No Data
    if (!freeBarberData) {
        return (
            <LottieViewComponent message={"Berber bulunamadı"} />
        );
    }

    const borderRadiusClass = isBottomSheet ? 'rounded-t-sm' : '';

    return (

        <View className="flex-1 bg-[#151618] w-full">

            {/* HEADER (RESİM) */}
            <View className={`relative w-full h-[250px]`}>
                <Image
                    source={{ uri: freeBarberData?.imageList?.[0]?.imageUrl || "https://picsum.photos/900/600" }}
                    className={`w-full h-full ${borderRadiusClass}`}
                    resizeMode="cover"
                />
                <View className={`absolute bottom-0 left-0 right-0 px-4 pb-3 bg-black/50 ${borderRadiusClass} justify-end h-full`}>
                    <View className="flex-row justify-between items-end">
                        <View className="flex-1 mr-2">
                            <Text className="font-ibm-plex-sans-bold text-white shadow-md" numberOfLines={1} style={{ fontSize: isBottomSheet ? 22 : 26 }}>
                                {freeBarberData?.fullName ?? "Serbest Berber"}
                            </Text>
                            <View className="flex-row items-center gap-2 mt-1">
                                <Icon size={18} color={freeBarberData?.type === 0 ? "#60a5fa" : "#f472b6"} source={freeBarberData?.type === 0 ? "face-man" : "face-woman"} />
                                <Text className="text-white font-ibm-plex-sans-medium" style={{ fontSize: 14 }}>
                                    - {getBarberTypeName(freeBarberData?.type!)}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center gap-1 bg-black/30 px-2 py-1 rounded-lg">
                            <Icon size={16} color="#FFA500" source="star" />
                            <Text className="font-ibm-plex-sans-bold text-white" style={{ fontSize: 14 }}>
                                {Number(freeBarberData?.rating ?? 0).toFixed(1)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>


            <View className="p-4 gap-3">
                <Text className="text-white font-ibm-plex-sans-bold mt-1 text-xl">{isBarberMode ? 'Hizmetler' : 'Hizmet Seçiniz'}</Text>

                <View>
                    <FlatList
                        data={freeBarberData?.offerings ?? []}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 10, paddingHorizontal: 4, alignItems: 'center' }}
                        style={{ flexGrow: 0 }} // Listeyi sıkıştırma
                        ListEmptyComponent={() => (
                            <Text className="text-gray-400 mt-2">Bu berber için hizmet tanımlanmamış.</Text>
                        )}
                        renderItem={({ item }) => {
                            const isSelected = selectedServices.includes(item.id);
                            return (
                                <FilterChip
                                    itemKey={item.id}
                                    selected={!isBarberMode && isSelected}
                                    onPress={() => !isBarberMode && toggleService(item.id)}
                                    className={`rounded-xl px-4 py-2 ${isSelected ? "bg-green-500" : "bg-gray-800"}`}
                                >
                                    <Text style={{ color: isSelected ? "white" : "#d1d5db", fontSize: 14, fontWeight: '600' }}>
                                        {item.serviceName} - {item.price} ₺
                                    </Text>
                                </FilterChip>
                            );
                        }}
                    />
                </View>
                <TouchableOpacity
                    disabled={!freeBarberData?.isAvailable || isCreatingCustomer || isCreatingStore || selectedServices.length === 0}
                    className={`py-3 flex-row justify-center gap-2 rounded-xl mt-2 items-center ${(!freeBarberData?.isAvailable || selectedServices.length === 0) ? "bg-[#4b5563]" : "bg-[#22c55e]"}`}
                    style={{ opacity: (!freeBarberData?.isAvailable || selectedServices.length === 0) ? 0.7 : 1 }}
                    onPress={async () => {
                        if (selectedServices.length === 0) {
                            Alert.alert("Uyarı", "Lütfen en az bir hizmet seçiniz.");
                            return;
                        }

                        if (!freeBarberData?.isAvailable) {
                            Alert.alert("Uyarı", "Bu berber şu anda müsait değil.");
                            return;
                        }

                        try {
                            // FreeBarber için storeId gerekli değil, ama backend'de storeId zorunlu görünüyor
                            // Bu durumda storeId'yi null veya boş string olarak gönderebiliriz
                            // Ya da backend'de freebarber appointment için storeId opsiyonel yapılmalı
                            const appointmentData = {
                                storeId: '', // FreeBarber appointment için storeId gerekli değil
                                appointmentDate: new Date().toISOString().split('T')[0], // Bugünün tarihi
                                serviceOfferingIds: selectedServices,
                                freeBarberUserId: barberId,
                                requestLatitude: freeBarberData?.latitude ?? null,
                                requestLongitude: freeBarberData?.longitude ?? null,
                            };

                            let result;
                            if (currentUserType === UserType.Customer) {
                                result = await createCustomerAppointment(appointmentData).unwrap();
                            } else if (currentUserType === UserType.BarberStore) {
                                result = await createStoreAppointment(appointmentData).unwrap();
                            } else {
                                Alert.alert("Hata", "Bu işlem için uygun kullanıcı tipi değilsiniz.");
                                return;
                            }

                            if (result.success) {
                                Alert.alert("Başarılı", "Randevu talebiniz oluşturuldu!", [
                                    { text: "Tamam", onPress: () => router.back() }
                                ]);
                            } else {
                                Alert.alert("Hata", result.message ?? "Randevu oluşturulamadı.");
                            }
                        } catch (e: unknown) {
                            const error = e as { data?: { message?: string }; message?: string };
                            Alert.alert(MESSAGES.ALERTS.ERROR, error?.data?.message ?? error?.message ?? MESSAGES.ALERT_MESSAGES.OPERATION_FAILED);
                        }
                    }}
                >
                    {(isCreatingCustomer || isCreatingStore) ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Icon source="calendar-check" size={20} color="white" />
                    )}
                    <Text className="text-white font-ibm-plex-sans-bold text-base">
                        {!freeBarberData?.isAvailable ? "Müsait Değil" : isBarberMode ? 'Berberi çağır' : `Randevu Al (${totalPrice} TL)`}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default FreeBarberBookingContent;