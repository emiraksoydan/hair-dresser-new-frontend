import { Alert, FlatList, Text, ScrollView, TouchableOpacity, View, StatusBar, Image } from 'react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetFreeBarberForUsersQuery } from '../../store/api';
import { Icon } from 'react-native-paper';
import FilterChip from '../../components/filter-chip';
import { getBarberTypeName } from '../../utils/barber-type';

const FreeBarberDetail = () => {

    const router = useRouter();
    const { freeBarber } = useLocalSearchParams<{ freeBarber: string; }>();
    const frbId = String(freeBarber);

    // store header info
    const { data: freeBarberData } = useGetFreeBarberForUsersQuery(frbId, { skip: !freeBarber });
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const toggleService = useCallback((id: string) => {
        setSelectedServices(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    }, []);


    const totalPrice = useMemo(() => {
        const servicesTotal =
            (freeBarberData?.offerings ?? [])
                .filter(x => selectedServices.includes(x.id))
                .reduce((sum, x) => sum + Number(x.price ?? 0), 0);
        return Number(servicesTotal.toFixed(2));
    }, [freeBarberData?.offerings, selectedServices,]);
    return (
        <View className="flex-1 bg-[#151618]">
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <View className="relative">
                <Image
                    source={{ uri: freeBarberData?.imageList?.[0]?.imageUrl || "https://picsum.photos/900/600" }}
                    className="w-full h-[250px]"
                    resizeMode="cover"
                />
                <View className="absolute top-0 left-0 right-0 bottom-0 bg-black opacity-50" />
                <View className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-shrink flex-wrap gap-2 flex-row">
                            <Text className="font-ibm-plex-sans-regular text-white" numberOfLines={1} style={{ fontSize: 24 }}>
                                {freeBarberData?.fullName ?? "Serbest Berber"}
                            </Text>
                            <View className="flex-row items-center gap-2 mt-1">
                                <Icon size={20} color={freeBarberData?.type === 0 ? "#60a5fa" : "#f472b6"} source={freeBarberData?.type === 0 ? "face-man" : "face-woman"} />
                                <Text className="text-white font-ibm-plex-sans-regular" style={{ fontSize: 15 }}>
                                    - {getBarberTypeName(freeBarberData?.type!)}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center mt-2 gap-1">
                            <Icon size={20} color="#FFA500" source="star" />
                            <Text className="font-ibm-plex-sans-regular text-white" style={{ fontSize: 15 }}>
                                {Number(freeBarberData?.rating ?? 0).toFixed(1)}
                            </Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-9 left-5 z-10 rounded-[40px] p-3"
                    style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                >
                    <Icon source="chevron-left" size={25} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView>
                <View className="p-4 z-0 gap-3">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-white font-ibm-plex-sans-regular mt-3 text-xl">Randevu Al</Text>
                    </View>

                    {/* DAYS */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    </ScrollView>
                    <FlatList
                        data={freeBarberData?.offerings ?? []}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        removeClippedSubviews
                        contentContainerStyle={{ gap: 10 }}
                        renderItem={({ item }) => {
                            const isSelected = selectedServices.includes(item.id);
                            return (
                                <FilterChip
                                    itemKey={item.id}
                                    selected={isSelected}
                                    onPress={() => toggleService(item.id)}
                                    className={`rounded-xl p-2 mb-2 ${isSelected ? "bg-green-600" : "bg-gray-800"}`}
                                >
                                    <Text style={{ color: isSelected ? "white" : "#d1d5db", fontSize: 16 }}>
                                        {item.serviceName} - {item.price} ₺
                                    </Text>
                                </FilterChip>
                            );
                        }}
                    />
                    {/* SUBMIT */}
                    <TouchableOpacity
                        disabled={!freeBarberData?.isAvailable}
                        className={`py-3 flex-row justify-center gap-2 rounded-xl mt-1 items-center ${(!freeBarberData?.isAvailable) ? "bg-[#4b5563] opacity-60" : "bg-[#22c55e] opacity-100"}`}
                        onPress={async () => {
                            try {
                                Alert.alert("Özet", `\nHizmet: ${selectedServices.length} adet\nTutar: ${totalPrice} TL`);
                            } catch (e: any) {
                                Alert.alert("Hata", e?.data?.message ?? e?.message ?? "İşlem başarısız.");
                            }
                        }}
                    >
                        <Icon source="location-enter" size={18} color="white" />
                        <Text className="text-white font-ibm-plex-sans-regular text-base">{!freeBarberData?.isAvailable ? "Serbest berber müsait değil" : "Randevu Al"}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

export default FreeBarberDetail

