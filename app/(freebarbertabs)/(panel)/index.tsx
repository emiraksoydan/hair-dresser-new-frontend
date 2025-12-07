import { Dimensions, FlatList, Image, Text, TouchableOpacity, View } from 'react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { useBottomSheetRegistry, useSheet } from '../../context/bottomsheet';
import { useToggleList } from '../../utils/service-toggle';
import SearchBar from '../../components/searchbar';
import FormatListButton from '../../components/formatlistbutton';
import FilterButton from '../../components/filterbutton';
import { SkeletonComponent } from '../../components/skeleton';
import { LottieViewComponent } from '../../components/lottieview';
import MotiViewExpand from '../../components/motiviewexpand';
import { toggleExpand } from '../../utils/expand-toggle';
import { FilterBottomSheet } from '../../components/filterbottomsheet';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { FormFreeBarberOperation } from '../../components/formfreebarberoper';
import { resolveApiErrorMessage } from '../../utils/error';
import { StoreCardInner } from '../../components/storecard';
import { useNearbyStores } from '../../hook/useNearByStore';
import { BarberStoreGetDto } from '../../types';
import { FreeBarberPanelSection } from '../../components/freebarberpanelsection';
import { EmptyState } from '../../components/emptystateresult';
import { useRouter } from 'expo-router';
import { Icon, IconButton } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import { safeCoord } from '../../utils/geo';
import StoreBookingContent from '../../components/storebooking';
import { useGetFreeBarberMinePanelQuery } from '../../store/api';
import { useTrackFreeBarberLocation } from '../../hook/useTrackFreeBarberLocation';

const Index = () => {

    const { stores, loading, error: storeError, locationStatus, locationMessage, hasLocation, fetchedOnce } = useNearbyStores(true);
    const { data: freeBarber, isLoading, isError, error } = useGetFreeBarberMinePanelQuery(undefined, {
        skip: !hasLocation
    });

    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isList, setIsList] = useState(true);
    const { present } = useSheet('freeBarberFilter');
    const [selectedType, setSelectedType] = useState<string>('Hepsi');
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");

    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<BarberStoreGetDto | null>(null);
    const { present: presentMapDetail } = useSheet("mapDetail");

    const [expandedStoreBarber, setExpandedStoreBarber] = useState(true);
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: freeBarberPanel } = useSheet('freeBarberMinePanel');
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const { list: selectedServices, toggle: toggleService, has: hasService, } = useToggleList<string>([]);
    const [freeBarberId, setFreeBarberId] = useState<string | null>(null);

    const screenWidth = Dimensions.get('window').width;

    const cardWidthStores = useMemo(
        () => (expandedStoreBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedStoreBarber, screenWidth]
    );

    const hasStoreBarbers = !loading && stores.length > 0;

    const handleOpenPanel = useCallback((id: string | null) => {
        setFreeBarberId(id);
        freeBarberPanel();
    }, [freeBarberPanel]);

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        router.push({
            pathname: "/store/[storeId]",
            params: { storeId: store.id, mode: "free-barber" },
        });
    }, [router]);

    const renderItem = useCallback(
        ({ item }: { item: BarberStoreGetDto }) => (
            <StoreCardInner
                store={item}
                isList={isList}
                expanded={expandedStoreBarber}
                cardWidthStore={cardWidthStores}
                isViewerFromFreeBr={true}
                onPressUpdate={goStoreDetail}
            />
        ),
        [isList, expandedStoreBarber, cardWidthStores]
    );

    const handleMarkerPress = useCallback(
        (item: BarberStoreGetDto) => {
            setSelectedMapItem(item);
            presentMapDetail();
        },
        [presentMapDetail]
    );

    const storeMarkers = useMemo(() => {
        if (!hasStoreBarbers) return null;
        return stores.map((store) => {
            const c = safeCoord(store.latitude, store.longitude);
            if (!c) return null;

            const avatarUrl = store?.imageList?.[0]?.imageUrl;
            const bg = store.type == 0 ? "#2563eb" : store.type == 1 ? "#db2777" : "#16a34a";
            const iconName = store.type == 2 ? "store" : store.type == 0 ? "face-man" : "face-woman";
            return <Marker
                key={store.id}
                coordinate={{ latitude: c.lat, longitude: c.lon }}
                title={store.storeName}
                description={store.addressDescription}
                tracksViewChanges={false}
                onPress={() => handleMarkerPress(store)}
            >
                <View
                    className="items-center justify-center w-8 h-8 rounded-full"
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
            </Marker>;
        });
    }, [stores, hasStoreBarbers, handleMarkerPress]);

    const myPanelMarker = useMemo(() => {
        const c = safeCoord(freeBarber?.latitude, freeBarber?.longitude);
        if (!c) return null;

        const avatarUrl = freeBarber?.imageList?.[0]?.imageUrl;
        const bg = freeBarber?.type == 0 ? "#2563eb" : freeBarber?.type == 1 ? "#db2777" : "#16a34a";
        const iconName = freeBarber?.type == 0 ? "face-man" : "face-woman";
        return <Marker
            key={freeBarber?.id}
            coordinate={{ latitude: c.lat, longitude: c.lon }}
            title={freeBarber?.fullName}
            tracksViewChanges={false}
            onPress={() => handleOpenPanel(freeBarber?.id!)}
        >
            <View
                className="items-center justify-center w-8 h-8 rounded-full"
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
        </Marker>;
    }, [freeBarber, handleOpenPanel]);

    const { isTracking, isUpdating } = useTrackFreeBarberLocation(
        true,
        freeBarber?.id ?? null
    );

    return (
        <View className='flex flex-1 pl-4 pr-2 bg-[#151618]'>
            <View className='flex flex-row items-center gap-2 mt-4'>
                <View className=' flex flex-1'>
                    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery}></SearchBar>
                </View>
                <FormatListButton isList={isList} setIsList={setIsList}></FormatListButton>
                <FilterButton onPress={present}></FilterButton>
            </View>

            {isMapMode ? (
                <View className="absolute inset-0 z-0">
                    <MapView style={{ flex: 1 }} userInterfaceStyle="dark">
                        {storeMarkers}
                        {myPanelMarker}
                    </MapView>
                </View>
            ) : (
                <FlatList
                    data={[]}
                    keyExtractor={() => 'dummy'}
                    renderItem={() => null}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    ListHeaderComponent={
                        <>
                            <FreeBarberPanelSection
                                isList={isList}
                                locationStatus={locationStatus}
                                locationMessage={locationMessage}
                                onOpenPanel={handleOpenPanel}
                                screenWidth={screenWidth}
                                freeBarber={freeBarber}
                                isLoading={isLoading}
                                isError={isError}
                                error={error}
                                isUpdating={isUpdating}
                                isTracking={isTracking}
                            />
                            <View className="flex flex-row justify-between items-center mt-4">
                                <Text className="font-ibm-plex-sans-regular text-xl text-white">
                                    Çevremdeki Berber Dükkanları
                                </Text>
                                {stores && stores.length !== 0 && (
                                    <MotiViewExpand
                                        expanded={expandedStoreBarber}
                                        onPress={() => toggleExpand(expandedStoreBarber, setExpandedStoreBarber)}
                                    />
                                )}
                            </View>

                            {loading ? (
                                <View className="flex-1 pt-4">
                                    {Array.from({ length: 2 }).map((_, i) => (
                                        <SkeletonComponent key={i} />
                                    ))}
                                </View>
                            ) : storeError ? (
                                <LottieViewComponent animationSource={require('../../../assets/animations/error.json')} message={resolveApiErrorMessage(storeError)} ></LottieViewComponent>
                            ) : (
                                <FlatList
                                    key="barberStoreList"
                                    data={hasStoreBarbers ? stores : []}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderItem}
                                    horizontal={!expandedStoreBarber}
                                    nestedScrollEnabled
                                    initialNumToRender={6}
                                    maxToRenderPerBatch={6}
                                    updateCellsBatchingPeriod={16}
                                    windowSize={7}
                                    removeClippedSubviews
                                    showsHorizontalScrollIndicator={false}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{
                                        gap: 12,
                                        paddingTop: hasStoreBarbers ? 8 : 0,
                                        paddingBottom: 8,
                                    }}
                                    ListEmptyComponent={() => (
                                        <EmptyState loading={loading} hasLocation={hasLocation} locationStatus={locationStatus} fetchedOnce={fetchedOnce} hasData={hasStoreBarbers} noResultText="Yakınınızda dükkan bulunamadı" ></EmptyState>
                                    )}
                                />
                            )}
                        </>
                    }
                />
            )}



            <TouchableOpacity
                onPress={() => setIsMapMode(!isMapMode)}
                className="absolute right-4 bottom-6 w-14 h-14 bg-[#38393b] rounded-full items-center justify-center z-20 shadow-lg border border-[#47494e]"
                style={{ elevation: 8 }}
            >
                <IconButton icon={isMapMode ? "format-list-bulleted" : "map"} iconColor="#f05e23" size={28} style={{ margin: 0 }} />
            </TouchableOpacity>

            <FilterBottomSheet
                sheetKey="freeBarberFilter"
                selectedType={selectedType}
                onChangeType={setSelectedType}
                selectedRating={selectedRating}
                onChangeRating={setSelectedRating}
                selectedServices={selectedServices}
                hasService={hasService}
                toggleService={toggleService}
            />

            <BottomSheetModal
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: 'close' })}
                handleIndicatorStyle={{ backgroundColor: '#47494e' }}
                backgroundStyle={{ backgroundColor: '#151618' }}
                ref={(inst) => setRef('freeBarberMinePanel', inst)}
                onChange={(index) => { setIsSheetOpen(index >= 0); }}
                snapPoints={isMapMode ? ["75%", "100%"] : ["100%"]}
                enableOverDrag={isMapMode}
                enablePanDownToClose={isMapMode}
            >
                <BottomSheetView className='h-full pt-2'>
                    <FormFreeBarberOperation freeBarberId={freeBarberId} enabled={isSheetOpen} />
                </BottomSheetView>
            </BottomSheetModal>

            <BottomSheetModal
                ref={(inst) => setRef("mapDetail", inst)}
                snapPoints={["65%"]}
                enablePanDownToClose={true}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })}
            >
                <BottomSheetView style={{ flex: 1, padding: 0, margin: 0 }}>
                    {selectedMapItem && <StoreBookingContent storeId={(selectedMapItem as any).id} isBottomSheet={true} isFreeBarber={true} />}
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    )
}

export default Index