import React, { useCallback, useMemo, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Image, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconButton } from 'react-native-paper';
import { useGetFreeBarberForUsersQuery } from '../../store/api';
import FilterChip from '../common/filter-chip';
import { getBarberTypeName } from '../../utils/store/barber-type';
import { SkeletonComponent } from '../common/skeleton';
import { LottieViewComponent } from '../common/lottieview';
import { useAuth } from '../../hook/useAuth';
import { UserType, FreeBarGetDto, BarberStoreGetDto } from '../../types';
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

interface Props {
    barberId: string;
    isBottomSheet?: boolean;
    isBarberMode?: boolean;
    onStoreSelected?: (storeId: string) => void; // Dükkan seçildiğinde çağrılacak callback
}

const FreeBarberBookingContent = ({ barberId, isBottomSheet = false, isBarberMode = false, onStoreSelected }: Props) => {
    const router = useRouter();
    const { data: freeBarberData, isLoading } = useGetFreeBarberForUsersQuery(barberId, { skip: !barberId });
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const { userType: currentUserType } = useAuth();

    // Dükkan seçimi için
    const { stores, loading: storesLoading, locationStatus, hasLocation, fetchedOnce } = useNearbyStores(currentUserType === UserType.Customer);
    const storeSelectionSheetRef = useRef<BottomSheetModal>(null);
    const storeBookingSheetRef = useRef<BottomSheetModal>(null);
    const { setRef: setStoreSelectionRef, makeBackdrop } = useBottomSheetRegistry();
    const { setRef: setStoreBookingRef } = useBottomSheetRegistry();
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const [isMapMode, setIsMapMode] = useState(false);
    const [expanded, setExpanded] = useState(true);

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

            <ScrollView nestedScrollEnabled className="p-4 gap-3">
                <Text className="text-white font-ibm-plex-sans-bold mt-1 text-xl">{isBarberMode ? 'Hizmetler' : 'Hizmet Seçiniz'}</Text>

                <View>
                    <FlatList
                        data={freeBarberData?.offerings ?? []}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 10, paddingHorizontal: 4, alignItems: 'center' }}
                        style={{ flexGrow: 0 }}
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
                {currentUserType === UserType.Customer && !isBarberMode && (
                    <TouchableOpacity
                        disabled={!freeBarberData?.isAvailable || selectedServices.length === 0}
                        className={`py-3 flex-row justify-center gap-2 rounded-xl mt-2 items-center ${(!freeBarberData?.isAvailable || selectedServices.length === 0) ? "bg-[#4b5563]" : "bg-[#22c55e]"}`}
                        style={{ opacity: (!freeBarberData?.isAvailable || selectedServices.length === 0) ? 0.7 : 1 }}
                        onPress={() => {
                            if (selectedServices.length === 0) {
                                Alert.alert("Uyarı", "Lütfen en az bir hizmet seçiniz.");
                                return;
                            }

                            if (!freeBarberData?.isAvailable) {
                                Alert.alert("Uyarı", "Bu berber şu anda müsait değil.");
                                return;
                            }

                            // Dükkan seçimi bottom sheet'ini aç
                            storeSelectionSheetRef.current?.present();
                        }}
                    >
                        <Icon source="calendar-check" size={20} color="white" />
                        <Text className="text-white font-ibm-plex-sans-bold text-base">
                            {!freeBarberData?.isAvailable ? "Müsait Değil" : `Dükkan Seç ve Randevu Al (${totalPrice} TL)`}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Dükkan Seçimi Bottom Sheet - Customer Panel Yapısı */}
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
                    // Kapatıldığında iptal
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
                        <View className="px-4 py-2">
                            <Text className="text-gray-400 text-sm">
                                Serbest berber randevusu için bir dükkan seçmeniz gerekmektedir.
                            </Text>
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
                                                noResultText="Yakınında şu an listelenecek işletme bulunamadı"
                                            />
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

            {/* Store Booking Bottom Sheet */}
            {selectedStoreId && (
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
                            isCustomer={true}
                            freeBarberUserId={barberId}
                            preselectedServices={selectedServices}
                        />
                    </BottomSheetView>
                </BottomSheetModal>
            )}
        </View>
    );
};

export default FreeBarberBookingContent;
