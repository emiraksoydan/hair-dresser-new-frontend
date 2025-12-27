import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Image, ActivityIndicator, ScrollView, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconButton } from 'react-native-paper';
import { useGetFreeBarberForUsersQuery, useCreateCustomerToFreeBarberAppointmentMutation, useCreateStoreAppointmentMutation } from '../../store/api';
import FilterChip from '../common/filter-chip';
import { getBarberTypeName } from '../../utils/store/barber-type';
import { SkeletonComponent } from '../common/skeleton';
import { LottieViewComponent } from '../common/lottieview';
import { useAuth } from '../../hook/useAuth';
import { UserType, FreeBarGetDto, BarberStoreGetDto, StoreSelectionType } from '../../types';
import { MESSAGES } from '../../constants/messages';
import { APPOINTMENT_CONSTANTS } from '../../constants/appointment';
import { useNearbyStores } from '../../hook/useNearByStore';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useBottomSheetRegistry } from '../../context/bottomsheet';
import StoreBookingContent from '../store/storebooking';
import { StoreCardInner } from '../store/storecard';
import { EmptyState } from '../common/emptystateresult';
import MapView, { Marker } from 'react-native-maps';
import { safeCoord } from '../../utils/location/geo';
import { toggleExpand } from '../../utils/common/expand-toggle';
import MotiViewExpand from '../common/motiviewexpand';
import { getCurrentLocationSafe } from '../../utils/location/location-helper';

interface Props {
    barberId: string;
    isBottomSheet?: boolean;
    isBarberMode?: boolean;
    mode?: "add-store";
    appointmentId?: string;
    storeId?: string;
    onStoreSelected?: (storeId: string) => void; // Dükkan seçildiğinde çağrılacak callback
}

const FreeBarberBookingContent = ({ barberId, isBottomSheet = false, isBarberMode = false, onStoreSelected, mode, appointmentId, storeId }: Props) => {
    const router = useRouter();
    const isAddStoreMode = mode === "add-store";
    const { data: freeBarberData, isLoading } = useGetFreeBarberForUsersQuery(barberId, { skip: !barberId || isAddStoreMode });
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const { userType: currentUserType } = useAuth();
    const [storeSelectionType, setStoreSelectionType] = useState<StoreSelectionType | null>(null);
    // Not alani sadece StoreSelection senaryosunda kullanilir
    const [note, setNote] = useState<string>('');
    const [createCustomerToFreeBarberAppointment, { isLoading: isCreating }] = useCreateCustomerToFreeBarberAppointmentMutation();
    const [createStoreAppointment, { isLoading: isCreatingStore }] = useCreateStoreAppointmentMutation();
    const freeBarberUserId = freeBarberData?.freeBarberUserId ?? (freeBarberData as any)?.userId ?? barberId;

    // Dükkan seçimi için
    const { stores, loading: storesLoading, locationStatus, hasLocation, fetchedOnce } = useNearbyStores(isAddStoreMode);
    const storeSelectionSheetRef = useRef<BottomSheetModal>(null);
    const storeBookingSheetRef = useRef<BottomSheetModal>(null);
    const { setRef: setStoreSelectionRef, makeBackdrop } = useBottomSheetRegistry();
    const { setRef: setStoreBookingRef } = useBottomSheetRegistry();
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const [isMapMode, setIsMapMode] = useState(false);
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        if (!isAddStoreMode) return;
        const timer = setTimeout(() => {
            storeSelectionSheetRef.current?.present();
        }, 150);
        return () => clearTimeout(timer);
    }, [isAddStoreMode]);

    const screenWidth = Dimensions.get("window").width;
    const cardWidthStore = useMemo(() => (expanded ? screenWidth * 0.92 : screenWidth * 0.94), [expanded, screenWidth]);
    const hasStores = (stores ?? []).length > 0;

    const toggleService = useCallback((id: string) => {
        setSelectedServices(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    }, []);

    const totalPrice = useMemo(() => {
        const servicesTotal = (freeBarberData?.offerings ?? [])
            .filter(x => selectedServices.includes(x.id))
            .reduce((sum, x) => sum + Number(x.price ?? 0), 0);
        return Number(servicesTotal.toFixed(APPOINTMENT_CONSTANTS.DECIMAL_PLACES));
    }, [freeBarberData?.offerings, selectedServices]);

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        setSelectedStoreId(store.id);
        storeSelectionSheetRef.current?.dismiss();
        setTimeout(() => {
            storeBookingSheetRef.current?.present();
        }, 300);
    }, []);

    const handleMapItemPress = useCallback((store: BarberStoreGetDto) => {
        setSelectedStoreId(store.id);
        storeSelectionSheetRef.current?.dismiss();
        setTimeout(() => {
            storeBookingSheetRef.current?.present();
        }, 300);
    }, []);

    const storeMarkers = useMemo(() => {
        if (!hasStores) return null;
        return stores.map((store) => {
            const c = safeCoord(store.latitude, store.longitude);
            if (!c) return null;

            const avatarUrl = store?.imageList?.[0]?.imageUrl;
            const bg = store.type == 0 ? "#2563e" : store.type == 1 ? "#db2777" : "#16a34a";
            const iconName = store.type == 2 ? "store" : store.type == 0 ? "face-man" : "face-woman";

            return (
                <Marker
                    key={`store-${store.id}`}
                    coordinate={{ latitude: c.lat, longitude: c.lon }}
                    title={store.storeName}
                    description={store.addressDescription}
                    tracksViewChanges={false}
                    onPress={() => handleMapItemPress(store)}
                >
                    <View
                        className="items-center justify-center w-9 h-9 rounded-full"
                        style={{
                            elevation: 4,
                            borderWidth: avatarUrl ? 0 : 1,
                            borderColor: "white",
                            backgroundColor: bg,
                        }}
                    >
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} className="w-full h-full rounded-full" resizeMode="cover" />
                        ) : (
                            <Icon source={iconName} color="white" size={20} />
                        )}
                    </View>
                </Marker>
            );
        });
    }, [stores, hasStores, handleMapItemPress]);

    const renderStoreItem = useCallback(({ item }: { item: BarberStoreGetDto }) => (
        <StoreCardInner
            store={item}
            isList={true}
            expanded={expanded}
            cardWidthStore={cardWidthStore}
            onPressUpdate={goStoreDetail}
        />
    ), [expanded, cardWidthStore, goStoreDetail]);

    // Loading
    if (!isAddStoreMode && isLoading) {
        return (
            <View className="flex-1 pt-4">
                {Array.from({ length: 1 }).map((_, i) => <SkeletonComponent key={i} />)}
            </View>
        );
    }

    // No Data
    if (!isAddStoreMode && !freeBarberData) {
        return (
            <LottieViewComponent message={"Berber bulunamadı"} />
        );
    }

    const borderRadiusClass = isBottomSheet ? 'rounded-t-sm' : '';

    return (
        <View className="flex-1 bg-[#151618] w-full">
            {!isAddStoreMode && (
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

            )}
            {isAddStoreMode && (
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-white font-ibm-plex-sans-bold text-lg">Dükkan Seçin</Text>
                    <Text className="text-gray-400 text-sm mt-1">Randevu için uygun işletmeyi seçin.</Text>
                    <TouchableOpacity
                        onPress={() => storeSelectionSheetRef.current?.present()}
                        className="mt-4 py-3 flex-row justify-center gap-2 rounded-xl items-center bg-[#3b82f6]"
                    >
                        <Icon source="store" size={18} color="white" />
                        <Text className="text-white font-ibm-plex-sans-bold text-base">Dükkan Listesi</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView nestedScrollEnabled className="p-4 gap-3">
                {currentUserType === UserType.BarberStore && isBarberMode && !isAddStoreMode && (
                    <View className="gap-3 mt-4">
                        <Text className="text-white font-ibm-plex-sans-bold text-lg">Serbest Berber Çağır</Text>
                        <Text className="text-gray-300 text-sm">Tarih ve saat seçmeden çağrı gönderebilirsiniz.</Text>
                        <TouchableOpacity
                            disabled={isCreatingStore || !freeBarberData?.isAvailable}
                            className={`py-4 flex-row justify-center gap-2 rounded-xl items-center ${(!freeBarberData?.isAvailable || isCreatingStore) ? "bg-[#4b5563]" : "bg-[#3b82f6]"}`}
                            style={{ opacity: (!freeBarberData?.isAvailable || isCreatingStore) ? 0.7 : 1 }}
                            onPress={async () => {
                                try {
                                    if (!storeId) {
                                        Alert.alert("Uyarı", "Dükkan bulunamadı.");
                                        return;
                                    }

                                    if (!freeBarberData?.isAvailable) {
                                        Alert.alert("Uyarı", "Bu berber şu anda müsait değil.");
                                        return;
                                    }

                                    const payload = {
                                        storeId,
                                        freeBarberUserId: freeBarberUserId,
                                        serviceOfferingIds: [], // ✅ Backend List<Guid> bekliyor
                                    } as any;

                                    const result = await createStoreAppointment(payload).unwrap();

                                    if (result.success) {
                                        Alert.alert("Başarılı", "Çağrı gönderildi.", [
                                            { text: "Tamam", onPress: () => router.back() }
                                        ]);
                                    } else {
                                        Alert.alert("Hata", result.message ?? "Çağrı gönderilemedi.");
                                    }
                                } catch (error: any) {
                                    Alert.alert("Hata", error?.data?.message || "Çağrı gönderilemedi.");
                                }
                            }}
                        >
                            {isCreatingStore ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Icon source="account-arrow-right" size={20} color="white" />
                                    <Text className="text-white font-ibm-plex-sans-bold text-base">Çağrı Gönder</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                {/* İsteğime Göre se�ilmediyse normal hizmet se�imi g�ster */}
                {currentUserType === UserType.Customer && !isBarberMode && !isAddStoreMode && !storeSelectionType && (
                    <View className="gap-3 mt-4">
                        <Text className="text-white font-ibm-plex-sans-bold text-lg">Randevu Tipi Seçin</Text>
                        <TouchableOpacity
                            disabled={!freeBarberData?.isAvailable}
                            className={`py-4 flex-row justify-center gap-2 rounded-xl items-center ${!freeBarberData?.isAvailable ? "bg-[#4b5563]" : "bg-[#3b82f6]"}`}
                            style={{ opacity: !freeBarberData?.isAvailable ? 0.7 : 1 }}
                            onPress={() => {
                                if (!freeBarberData?.isAvailable) {
                                    Alert.alert("Uyarı", "Bu berber şu anda müsait değil.");
                                    return;
                                }
                                setStoreSelectionType(StoreSelectionType.CustomRequest);
                            }}
                        >
                            <Icon source="lightbulb-on" size={20} color="white" />
                            <Text className="text-white font-ibm-plex-sans-bold text-base">İsteğime Göre</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={!freeBarberData?.isAvailable}
                            className={`py-4 flex-row justify-center gap-2 rounded-xl items-center ${!freeBarberData?.isAvailable ? "bg-[#4b5563]" : "bg-[#22c55e]"}`}
                            style={{ opacity: !freeBarberData?.isAvailable ? 0.7 : 1 }}
                            onPress={() => {
                                if (!freeBarberData?.isAvailable) {
                                    Alert.alert("Uyarı", "Bu berber şu anda müsait değil.");
                                    return;
                                }
                                setStoreSelectionType(StoreSelectionType.StoreSelection);
                            }}
                        >
                            <Icon source="store" size={20} color="white" />
                            <Text className="text-white font-ibm-plex-sans-bold text-base">Dükkan Seç</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* İsteğime Göre Form */}
                {currentUserType === UserType.Customer && !isBarberMode && !isAddStoreMode && storeSelectionType === StoreSelectionType.CustomRequest && (
                    <View className="gap-4 mt-4">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-white font-ibm-plex-sans-bold text-lg">Randevu Detayları</Text>
                            <TouchableOpacity onPress={() => setStoreSelectionType(null)}>
                                <Icon source="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Hizmetler (Se�ilebilir) */}
                        <View>
                            <View className="flex-row items-center gap-2 mb-2">
                                <Text className="text-white font-ibm-plex-sans-medium text-base">Berberin Hizmetleri</Text>
                                <Text className="text-[#a3e635] font-ibm-plex-sans-bold text-base">
                                    {totalPrice} ₺
                                </Text>
                            </View>
                            <FlatList
                                data={freeBarberData?.offerings ?? []}
                                keyExtractor={(item) => item.id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
                                renderItem={({ item }) => {
                                    const isSelected = selectedServices.includes(item.id);
                                    return (
                                        <FilterChip
                                            itemKey={item.id}
                                            selected={isSelected}
                                            onPress={() => toggleService(item.id)}
                                            className={`rounded-xl px-4 py-2 ${isSelected ? "bg-green-500" : "bg-gray-800"}`}
                                        >
                                            <Text style={{ color: isSelected ? "white" : "#d1d5db", fontSize: 14 }}>
                                                {item.serviceName} - {item.price} ₺
                                            </Text>
                                        </FilterChip>
                                    );
                                }}
                            />
                        </View>

                        {/* Bilgilendirme Mesajlari */}
                        <View className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4 gap-2" style={{ display: 'none' }}>
                            <View className="flex-row items-start gap-2">
                                <Icon source="information" size={20} color="#60a5fa" />
                                <View className="flex-1">
                                    <Text className="text-blue-300 font-ibm-plex-sans-medium text-sm">
                                        İstek gönderip free barber ile mesajlaşmaya başlayabilirsiniz.
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row items-start gap-2 mt-1">
                                <Icon source="clock-alert-outline" size={20} color="#fbbf24" />
                                <View className="flex-1">
                                    <Text className="text-yellow-300 font-ibm-plex-sans-medium text-sm">
                                        5 dakika içinde cevap gelmezse randevu cevapsıza düşecek ve yeni randevu arayabilirsiniz.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Randevu G�nder Butonu */}
                        <TouchableOpacity
                            disabled={isCreating}
                            className={`py-4 flex-row justify-center gap-2 rounded-xl items-center ${isCreating ? "bg-[#4b5563]" : "bg-[#22c55e]"}`}
                            style={{ opacity: isCreating ? 0.7 : 1 }}
                            onPress={async () => {
                                try {
                                    if (selectedServices.length === 0) {
                                        Alert.alert("Uyarı", "Lütfen en az bir hizmet seçin.");
                                        return;
                                    }

                                    const locationResult = await getCurrentLocationSafe();
                                    if (!locationResult.ok) {
                                        Alert.alert("Hata", "Konum bilgisi alınamadı..");
                                        return;
                                    }

                                    const payload = {
                                        freeBarberUserId: freeBarberUserId,
                                        storeSelectionType: StoreSelectionType.CustomRequest,
                                        requestLatitude: locationResult.lat,
                                        requestLongitude: locationResult.lon,
                                        serviceOfferingIds: selectedServices, // ✅ Sadece ID'leri gönder
                                    } as any;

                                    await createCustomerToFreeBarberAppointment(payload).unwrap();

                                    Alert.alert("Başarılı", "Randevu talebiniz gönderildi. Free barber ile mesajlaşmaya başlayabilirsiniz.", [
                                        { text: "Tamam", onPress: () => router.back() }
                                    ]);
                                } catch (error: any) {
                                    Alert.alert("Hata", error?.data?.message || "Randevu oluşturulamadı..");
                                }
                            }}
                        >
                            {isCreating ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Icon source="send" size={20} color="white" />
                                    <Text className="text-white font-ibm-plex-sans-bold text-base">Randevu Talebi Gönder</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                {currentUserType === UserType.Customer && !isBarberMode && !isAddStoreMode && storeSelectionType === StoreSelectionType.StoreSelection && (
                    <View className="gap-4 mt-4">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-white font-ibm-plex-sans-bold text-lg">Randevu Detayları</Text>
                            <TouchableOpacity onPress={() => setStoreSelectionType(null)}>
                                <Icon source="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        <View>
                            <Text className="text-white font-ibm-plex-sans-medium text-base mb-2">Berberin Hizmetleri</Text>
                            <FlatList
                                data={freeBarberData?.offerings ?? []}
                                keyExtractor={(item) => item.id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
                                renderItem={({ item }) => (
                                    <FilterChip
                                        itemKey={item.id}
                                        selected={false}
                                        isDisabled
                                        className="rounded-xl px-4 py-2 bg-gray-800"
                                    >
                                        <Text style={{ color: "#d1d5db", fontSize: 14 }}>
                                            {item.serviceName}
                                        </Text>
                                    </FilterChip>
                                )}
                            />
                        </View>

                        <View>
                            <Text className="text-white font-ibm-plex-sans-medium mb-2">Randevu Notu</Text>
                            <TextInput
                                value={note}
                                onChangeText={setNote}
                                placeholder="Hizmetler, fiyatlar, saat bilgisi yazabilirsiniz..."
                                placeholderTextColor="#9ca3af"
                                multiline
                                numberOfLines={3}
                                className="bg-gray-800 rounded-xl px-4 py-3 text-white"
                                style={{ textAlignVertical: 'top', minHeight: 80 }}
                            />
                        </View>

                        <TouchableOpacity
                            disabled={isCreating}
                            className={`py-4 flex-row justify-center gap-2 rounded-xl items-center ${isCreating ? "bg-[#4b5563]" : "bg-[#22c55e]"}`}
                            style={{ opacity: isCreating ? 0.7 : 1 }}
                            onPress={async () => {
                                try {
                                    const trimmedNote = note.trim();
                                    if (!trimmedNote) {
                                        Alert.alert("Uyarı", "Randevu notu zorunludur.");
                                        return;
                                    }

                                    const locationResult = await getCurrentLocationSafe();
                                    if (!locationResult.ok) {
                                        Alert.alert("Konum gerekli", locationResult.message ?? "Konum bilgisi alınamadı..");
                                        return;
                                    }

                                    const payload = {
                                        freeBarberUserId: freeBarberUserId,
                                        storeSelectionType: StoreSelectionType.StoreSelection,
                                        requestLatitude: locationResult.lat,
                                        requestLongitude: locationResult.lon,
                                        note: trimmedNote,
                                        serviceOfferingIds: [], // ✅ Backend List<Guid> bekliyor
                                    } as any;

                                    await createCustomerToFreeBarberAppointment(payload).unwrap();

                                    Alert.alert("Başarılı", "Randevu talebiniz gönderildi.", [
                                        { text: "Tamam", onPress: () => router.back() }
                                    ]);
                                } catch (error: any) {
                                    Alert.alert("Hata", error?.data?.message || "Randevu oluşturulamadı..");
                                }
                            }}
                        >
                            {isCreating ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Icon source="send" size={20} color="white" />
                                    <Text className="text-white font-ibm-plex-sans-bold text-base">Randevu Talebi Gönder</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Dükkan Seçimi Bottom Sheet - Customer Panel Yapısı */}
            {isAddStoreMode && (
                <BottomSheetModal
                    ref={(ref) => {
                        storeSelectionSheetRef.current = ref;
                        setStoreSelectionRef('freeBarberStoreSelection', ref);
                    }}
                    index={0}
                    snapPoints={isMapMode ? ["75%", "100%"] : ["100%"]}
                    enableOverDrag={isMapMode}
                    enablePanDownToClose={isMapMode}
                    handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                    backgroundStyle={{ backgroundColor: "#151618" }}
                    backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })}
                    onDismiss={() => {
                        // Kapatildiginda iptal
                        setSelectedStoreId(null);
                    }}
                >
                    <BottomSheetView style={{ flex: 1, padding: 0, margin: 0 }}>
                        <View className="flex flex-1 pl-4 pr-2 bg-[#151618]">
                            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-700">
                                <Text className="text-white font-ibm-plex-sans-bold text-xl">Dükkan Seçin</Text>
                                <IconButton
                                    icon="close"
                                    iconColor="white"
                                    size={24}
                                    onPress={() => {
                                        storeSelectionSheetRef.current?.dismiss();
                                    }}
                                />
                            </View>
                            <View className="px-4 py-2 gap-3">
                                <Text className="text-gray-400 text-sm">
                                    Serbest berber randevusu için bir dükkan seçmeniz gerekmektedir.
                                </Text>
                                {/* Randevu Notu */}
                                <View style={isAddStoreMode ? { display: 'none' } : undefined}>
                                    <Text className="text-white font-ibm-plex-sans-medium mb-2">Randevu Notu</Text>
                                    <TextInput
                                        value={note}
                                        onChangeText={setNote}
                                        placeholder="Hizmetler, fiyatlar, saat bilgisi vb. yazabilirsiniz..."
                                        placeholderTextColor="#9ca3af"
                                        multiline
                                        numberOfLines={3}
                                        className="bg-gray-800 rounded-xl px-4 py-3 text-white"
                                        style={{ textAlignVertical: 'top', minHeight: 80 }}
                                    />
                                </View>
                            </View>

                            {isMapMode ? (
                                <View className="flex-1">
                                    <MapView style={{ flex: 1 }} userInterfaceStyle="dark" showsUserLocation={true}>
                                        {storeMarkers}
                                    </MapView>
                                    <TouchableOpacity
                                        onPress={() => setIsMapMode(false)}
                                        className="absolute right-4 bottom-6 w-14 h-14 bg-[#38393b] rounded-full items-center justify-center z-20 shadow-lg border border-[#47494e]"
                                        style={{ elevation: 8 }}
                                    >
                                        <IconButton icon="format-list-bulleted" iconColor="#f05e23" size={28} style={{ margin: 0 }} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <View className="flex flex-row justify-between items-center mt-4 px-4">
                                        <Text className="font-ibm-plex-sans-regular text-xl text-white">İşletmeler</Text>
                                        {hasStores && (
                                            <MotiViewExpand
                                                expanded={expanded}
                                                onPress={() => toggleExpand(expanded, setExpanded)}
                                            />
                                        )}
                                    </View>

                                    {storesLoading ? (
                                        <View className="flex-1 pt-4 px-4">
                                            {Array.from({ length: 2 }).map((_, i) => (
                                                <SkeletonComponent key={i} />
                                            ))}
                                        </View>
                                    ) : (
                                        <FlatList
                                            key="storesList"
                                            data={stores}
                                            keyExtractor={(item) => item.id}
                                            renderItem={renderStoreItem}
                                            horizontal={!expanded}
                                            nestedScrollEnabled
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ gap: 12, paddingTop: hasStores ? 8 : 0, paddingHorizontal: 16 }}
                                            ListEmptyComponent={
                                                <EmptyState
                                                    loading={storesLoading}
                                                    locationStatus={locationStatus}
                                                    hasLocation={hasLocation}
                                                    fetchedOnce={fetchedOnce}
                                                    hasData={hasStores}
                                                    noResultText="Yakininda su an listelenecek isletme bulunamadi" />
                                            }
                                        />
                                    )}

                                    <TouchableOpacity
                                        onPress={() => setIsMapMode(true)}
                                        className="absolute right-4 bottom-6 w-14 h-14 bg-[#38393b] rounded-full items-center justify-center z-20 shadow-lg border border-[#47494e]"
                                        style={{ elevation: 8 }}
                                    >
                                        <IconButton icon="map" iconColor="#f05e23" size={28} style={{ margin: 0 }} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </BottomSheetView>
                </BottomSheetModal>
            )}


            {isAddStoreMode && selectedStoreId && (
                <BottomSheetModal
                    ref={(ref) => {
                        storeBookingSheetRef.current = ref;
                        setStoreBookingRef('freeBarberStoreBooking', ref);
                    }}
                    index={0}
                    snapPoints={['90%']}
                    backgroundStyle={{ backgroundColor: '#151618' }}
                >
                    <BottomSheetView className="flex-1">
                        <StoreBookingContent
                            storeId={selectedStoreId}
                            isBottomSheet={true}
                            isFreeBarber={true}
                            mode="add-store"
                            appointmentId={appointmentId}
                        />
                    </BottomSheetView>
                </BottomSheetModal>
            )}
        </View>
    );
};

export default FreeBarberBookingContent;



















