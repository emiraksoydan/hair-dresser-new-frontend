import { Dimensions, FlatList, Image, Text, TouchableOpacity, View, ScrollView, RefreshControl } from 'react-native'
import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { useBottomSheetRegistry, useSheet } from '../../context/bottomsheet';
import { useToggleList } from '../../utils/common/service-toggle';
import SearchBar from '../../components/common/searchbar';
import FormatListButton from '../../components/common/formatlistbutton';
import FilterButton from '../../components/common/filterbutton';
import { SkeletonComponent } from '../../components/common/skeleton';
import { LottieViewComponent } from '../../components/common/lottieview';
import MotiViewExpand from '../../components/common/motiviewexpand';
import { toggleExpand } from '../../utils/common/expand-toggle';
import { FilterBottomSheet } from '../../components/common/filterbottomsheet';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { FormFreeBarberOperation } from '../../components/freebarber/formfreebarberoper';
import { resolveApiErrorMessage } from '../../utils/common/error';
import { StoreCardInner } from '../../components/store/storecard';
import { useNearbyStores } from '../../hook/useNearByStore';
import { BarberStoreGetDto } from '../../types';
import { FreeBarberPanelSection } from '../../components/freebarber/freebarberpanelsection';
import { EmptyState } from '../../components/common/emptystateresult';
import { useRouter } from 'expo-router';
import { Icon, IconButton } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import { safeCoord } from '../../utils/location/geo';
import StoreBookingContent from '../../components/store/storebooking';
import { useGetFreeBarberMinePanelQuery } from '../../store/api';
import { useTrackFreeBarberLocation } from '../../hook/useTrackFreeBarberLocation';
import { RatingsBottomSheet } from '../../components/rating/ratingsbottomsheet';

const Index = () => {
    const { stores, loading, error: storeError, locationStatus, locationMessage, hasLocation, fetchedOnce, manualFetch: manualFetchStores } = useNearbyStores(true);

    const { data: freeBarber, isLoading, isError, error } = useGetFreeBarberMinePanelQuery(undefined, { skip: !hasLocation });

    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const isRefreshingRef = React.useRef(false);
    const onRefresh = useCallback(async () => {
        if (isRefreshingRef.current) return;
        try {
            isRefreshingRef.current = true;
            setRefreshing(true);
            if (manualFetchStores) await manualFetchStores();
        } finally {
            setRefreshing(false);
            isRefreshingRef.current = false;
        }
    }, [manualFetchStores]);

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
    const { present: presentRatings } = useSheet('ratings');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{ targetId: string; targetName: string } | null>(null);

    const { list: selectedServices, toggle: toggleService, has: hasService, } = useToggleList<string>([]);
    const [freeBarberId, setFreeBarberId] = useState<string | null>(null);

    const screenWidth = Dimensions.get('window').width;

    const cardWidthStores = useMemo(
        () => (expandedStoreBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedStoreBarber, screenWidth]
    );

    const [previousStores, setPreviousStores] = useState<BarberStoreGetDto[]>([]);

    useEffect(() => {
        if (stores && stores.length > 0) {
            setPreviousStores(stores);
        }
    }, [stores]);

    const displayStores = loading && previousStores.length > 0 ? previousStores : (stores ?? []);
    const isStoresLoading = loading && previousStores.length === 0;
    const hasStoreBarbers = displayStores.length > 0;

    const handleOpenPanel = useCallback((id: string | null) => {
        setFreeBarberId(id);
        freeBarberPanel();
    }, [freeBarberPanel]);

    const handlePressRatings = useCallback((targetId: string, targetName: string) => {
        setSelectedRatingsTarget({ targetId, targetName });
        presentRatings();
    }, [presentRatings]);

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        router.push({ pathname: "/store/[storeId]", params: { storeId: store.id, mode: "free-barber" } });
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
                onPressRatings={handlePressRatings}
            />
        ),
        [isList, expandedStoreBarber, cardWidthStores, goStoreDetail, handlePressRatings]
    );

    const handleMarkerPress = useCallback((item: BarberStoreGetDto) => {
        setSelectedMapItem(item);
        presentMapDetail();
    }, [presentMapDetail]);

    const storeMarkers = useMemo(() => {
        if (!hasStoreBarbers) return null;
        return displayStores.map((store) => {
            const c = safeCoord(store.latitude, store.longitude);
            if (!c) return null;

            const avatarUrl = store?.imageList?.[0]?.imageUrl;
            const bg = store.type == 0 ? "#2563eb" : store.type == 1 ? "#db2777" : "#16a34a";
            const iconName = store.type == 2 ? "store" : store.type == 0 ? "face-man" : "face-woman";
            return (
                <Marker
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
                </Marker>
            );
        });
    }, [displayStores, hasStoreBarbers, handleMarkerPress]);

    const myPanelMarker = useMemo(() => {
        const c = safeCoord(freeBarber?.latitude, freeBarber?.longitude);
        if (!c) return null;

        const avatarUrl = freeBarber?.imageList?.[0]?.imageUrl;
        const bg = freeBarber?.type == 0 ? "#2563eb" : freeBarber?.type == 1 ? "#db2777" : "#16a34a";
        const iconName = freeBarber?.type == 0 ? "face-man" : "face-woman";
        return (
            <Marker
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
            </Marker>
        );
    }, [freeBarber, handleOpenPanel]);

    const { isTracking, isUpdating } = useTrackFreeBarberLocation(true, freeBarber?.id ?? null);

    return (
        <View className='flex flex-1 pl-4 pr-2 bg-[#151618]'>
            <View className='flex flex-row items-center gap-2 mt-4'>
                <View className=' flex flex-1'>
                    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                </View>
                <FormatListButton isList={isList} setIsList={setIsList} />
                <FilterButton onPress={present} />
            </View>

            {isMapMode ? (
                <View className="absolute inset-0 z-0">
                    <MapView style={{ flex: 1 }} userInterfaceStyle="dark">
                        {storeMarkers}
                        {myPanelMarker}
                    </MapView>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f05e23" />}
                >
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
                        <Text className="font-ibm-plex-sans-regular text-xl text-white">Çevremdeki Berber Dükkanları</Text>
                        {hasStoreBarbers && (
                            <MotiViewExpand expanded={expandedStoreBarber} onPress={() => toggleExpand(expandedStoreBarber, setExpandedStoreBarber)} />
                        )}
                    </View>

                    {isStoresLoading ? (
                        <View className="pt-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonComponent key={i} />)}</View>
                    ) : storeError ? (
                        <View style={{ minHeight: 200, maxHeight: 400 }}>
                            <LottieViewComponent animationSource={require('../../../assets/animations/error.json')} message={resolveApiErrorMessage(storeError)} />
                        </View>
                    ) : hasStoreBarbers ? (
                        expandedStoreBarber ? (
                            <View style={{ gap: 12, paddingTop: 8 }}>
                                {displayStores.map((store) => (
                                    <StoreCardInner key={store.id} store={store} isList={isList} expanded={expandedStoreBarber} cardWidthStore={cardWidthStores} isViewerFromFreeBr={true} onPressUpdate={goStoreDetail} onPressRatings={handlePressRatings} />
                                ))}
                            </View>
                        ) : (
                            <View style={{ overflow: 'hidden', minHeight: 200 }}>
                                <FlatList data={displayStores} keyExtractor={(store) => store.id} renderItem={renderItem} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 8, paddingBottom: 8 }} />
                            </View>
                        )
                    ) : (
                        <View style={{ minHeight: 200, maxHeight: 400 }}>
                            <EmptyState loading={isStoresLoading} hasLocation={hasLocation} locationStatus={locationStatus} fetchedOnce={fetchedOnce} hasData={hasStoreBarbers} noResultText="Yakınınızda dükkan bulunamadı" />
                        </View>
                    )}
                </ScrollView>
            )}

            <TouchableOpacity onPress={() => setIsMapMode(!isMapMode)} className="absolute right-4 bottom-6 w-14 h-14 bg-[#38393b] rounded-full items-center justify-center z-20 shadow-lg border border-[#47494e]" style={{ elevation: 8 }}>
                <IconButton icon={isMapMode ? "format-list-bulleted" : "map"} iconColor="#f05e23" size={28} style={{ margin: 0 }} />
            </TouchableOpacity>

            <FilterBottomSheet sheetKey="freeBarberFilter" selectedType={selectedType} onChangeType={setSelectedType} selectedRating={selectedRating} onChangeRating={setSelectedRating} selectedServices={selectedServices} hasService={hasService} toggleService={toggleService} />

            <BottomSheetModal backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: 'close' })} handleIndicatorStyle={{ backgroundColor: '#47494e' }} backgroundStyle={{ backgroundColor: '#151618' }} ref={(inst) => setRef('freeBarberMinePanel', inst)} onChange={(index) => { setIsSheetOpen(index >= 0); }} snapPoints={isMapMode ? ["75%", "100%"] : ["100%"]} enableOverDrag={isMapMode} enablePanDownToClose={isMapMode}>
                <BottomSheetView className='h-full pt-2'>
                    <FormFreeBarberOperation freeBarberId={freeBarberId} enabled={isSheetOpen} />
                </BottomSheetView>
            </BottomSheetModal>

            <BottomSheetModal ref={(inst) => setRef("mapDetail", inst)} snapPoints={["65%"]} enablePanDownToClose={true} handleIndicatorStyle={{ backgroundColor: "#47494e" }} backgroundStyle={{ backgroundColor: "#151618" }} backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })}>
                <BottomSheetView style={{ flex: 1, padding: 0, margin: 0 }}>
                    {selectedMapItem && <StoreBookingContent storeId={(selectedMapItem as any).id} isBottomSheet={true} isFreeBarber={true} />}
                </BottomSheetView>
            </BottomSheetModal>

            <BottomSheetModal ref={(inst) => setRef("ratings", inst)} snapPoints={["50%", "85%"]} enablePanDownToClose={true} handleIndicatorStyle={{ backgroundColor: "#47494e" }} backgroundStyle={{ backgroundColor: "#151618" }} backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })} onChange={(index) => { if (index < 0) { setSelectedRatingsTarget(null); } }}>
                {selectedRatingsTarget && (
                    <RatingsBottomSheet targetId={selectedRatingsTarget.targetId} targetName={selectedRatingsTarget.targetName} onClose={() => { setSelectedRatingsTarget(null); }} />
                )}
            </BottomSheetModal>
        </View>
    )
}

export default Index
