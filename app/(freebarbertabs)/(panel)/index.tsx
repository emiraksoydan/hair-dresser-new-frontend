import { Dimensions, FlatList, Image, Text, TouchableOpacity, View, ScrollView } from 'react-native'
import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { useBottomSheetRegistry, useSheet } from '../../context/bottomsheet';
import SearchBar from '../../components/common/searchbar';
import FormatListButton from '../../components/common/formatlistbutton';
import FilterButton from '../../components/common/filterbutton';
import { SkeletonComponent } from '../../components/common/skeleton';
import { LottieViewComponent } from '../../components/common/lottieview';
import MotiViewExpand from '../../components/common/motiviewexpand';
import { toggleExpand } from '../../utils/common/expand-toggle';
import { FilterDrawer } from '../../components/common/filterdrawer';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { FormFreeBarberOperation } from '../../components/freebarber/formfreebarberoper';
import { resolveApiErrorMessage } from '../../utils/common/error';
import { StoreCardInner } from '../../components/store/storecard';
import { useNearbyStores } from '../../hook/useNearByStore';
import { BarberStoreGetDto, FavoriteTargetType, AppointmentStatus, StoreSelectionType } from '../../types';
import { FreeBarberPanelSection } from '../../components/freebarber/freebarberpanelsection';
import { EmptyState } from '../../components/common/emptystateresult';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Icon, IconButton } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import { safeCoord } from '../../utils/location/geo';
import StoreBookingContent from '../../components/store/storebooking';
import { useGetAllCategoriesQuery, useGetFreeBarberMinePanelQuery, useGetMyFavoritesQuery, useGetAllNotificationsQuery } from '../../store/api';
import { useTrackFreeBarberLocation } from '../../hook/useTrackFreeBarberLocation';
import { RatingsBottomSheet } from '../../components/rating/ratingsbottomsheet';
import { filterStores } from "../../utils/filter/panel-filters";
import { usePanelFilters } from "../../hook/usePanelFilters";

const Index = () => {
    const router = useRouter();

    // Notification'lardan aktif StoreSelection randevusunu otomatik algıla
    const { data: notifications = [] } = useGetAllNotificationsQuery();
    const activeStoreSelectionAppointment = useMemo(() => {
        // Notification'ların payload'larını kontrol et
        for (const notification of notifications) {
            if (!notification.payloadJson || notification.payloadJson === '{}') continue;

            try {
                const payload = JSON.parse(notification.payloadJson);
                let expiresAt: Date | null = null;
                if (payload?.pendingExpiresAt) {
                    let dateStr = payload.pendingExpiresAt;
                    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
                        dateStr += 'Z';
                    }
                    expiresAt = new Date(dateStr);
                } else if (notification.createdAt) {
                    let createdStr = notification.createdAt;
                    if (typeof createdStr === 'string' && !createdStr.endsWith('Z') && !createdStr.includes('+')) {
                        createdStr += 'Z';
                    }
                    const createdAt = new Date(createdStr);
                    expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
                }
                const isExpired = expiresAt ? new Date().getTime() > expiresAt.getTime() : false;

                // StoreSelection randevusu mu ve henüz dükkan seçilmemiş mi?
                if (
                    payload.storeSelectionType === StoreSelectionType.StoreSelection &&
                    payload.status === AppointmentStatus.Pending &&
                    !payload.store &&
                    notification.appointmentId &&
                    !isExpired
                ) {
                    return {
                        id: notification.appointmentId,
                        payload: payload
                    };
                }
            } catch {
                continue;
            }
        }
        return null;
    }, [notifications]);

    // URL'den gelen mode veya otomatik algılanan randevu varsa add-store modu
    const effectiveAppointmentId = activeStoreSelectionAppointment?.id;

    console.log(effectiveAppointmentId);


    const { stores, loading, error: storeError, locationStatus, locationMessage, hasLocation, fetchedOnce, location } = useNearbyStores(true);
    const { data: allCategories = [] } = useGetAllCategoriesQuery();
    const categoryNameById = useMemo(() => {
        const map = new Map<string, string>();
        (allCategories ?? []).forEach((c: any) => {
            if (c?.id && c?.name) map.set(String(c.id), String(c.name));
        });
        return map;
    }, [allCategories]);
    const { data: favorites = [] } = useGetMyFavoritesQuery();
    const favoriteStoreIds = useMemo(() => {
        return new Set(
            (favorites ?? [])
                .filter((f: any) => f.targetType === FavoriteTargetType.Store)
                .map((f: any) => String(f.favoritedToId))
        );
    }, [favorites]);

    // useTrackFreeBarberLocation zaten hard refresh yapıyor (30 saniyede bir) ve updateFreeBarberLocation mutation'ı MineFreeBarberPanel tag'ini invalidate ediyor
    // Bu yüzden ayrı polling interval'a gerek yok
    const { data: freeBarber, isLoading, isError, error } = useGetFreeBarberMinePanelQuery(undefined, {
        skip: !hasLocation,
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [isList, setIsList] = useState(true);

    // Filter drawer state
    const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

    const {
        selectedUserType,
        setSelectedUserType,
        selectedMainCategory,
        setSelectedMainCategory,
        selectedServices,
        setSelectedServices,
        priceSort,
        setPriceSort,
        minPrice,
        setMinPrice,
        maxPrice,
        setMaxPrice,
        selectedPricingType,
        setSelectedPricingType,
        availabilityFilter,
        setAvailabilityFilter,
        selectedRating,
        setSelectedRating,
        showFavoritesOnly,
        setShowFavoritesOnly,
        appliedFilters,
        applyFilters,
        clearFilters,
    } = usePanelFilters();


    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<BarberStoreGetDto | null>(null);
    const { present: presentMapDetail } = useSheet("mapDetail");

    const [expandedStoreBarber, setExpandedStoreBarber] = useState(true);
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: freeBarberPanel } = useSheet('freeBarberMinePanel');
    const { present: presentRatings } = useSheet('ratings');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{ targetId: string; targetName: string } | null>(null);

    const [freeBarberId, setFreeBarberId] = useState<string | null>(null);

    const screenWidth = Dimensions.get('window').width;

    const cardWidthStores = useMemo(
        () => (expandedStoreBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedStoreBarber, screenWidth]
    );

    // Önceki data'yı tutarak flicker'ı önle ve iç içe binmeyi engelle
    const [previousStores, setPreviousStores] = useState<BarberStoreGetDto[]>([]);

    // Data değiştiğinde önceki data'yı güncelle
    // DÜZELTME: dependency array'den previousStores kaldırıldı (stale closure önlendi)
    useEffect(() => {
        if (!loading && stores && Array.isArray(stores)) {
            // Loading bittiğinde ve yeni data geçerliyse kaydet
            if (stores.length > 0) {
                // Yeni data varsa ve öncekinden farklıysa güncelle
                setPreviousStores(prev => {
                    // Deep equality check yerine length ve ilk id kontrolü (performance için)
                    if (prev.length !== stores.length ||
                        (prev[0]?.id !== stores[0]?.id)) {
                        return stores;
                    }
                    return prev;
                });
            }
        }
    }, [stores, loading]); // previousStores dependency'den kaldırıldı

    // Display için: loading ise önceki data'yı göster (refresh sırasında flicker önlenir)
    // Loading değilse yeni data'yı göster
    const displayStores = loading && previousStores.length > 0
        ? previousStores
        : (stores ?? []);

    // Loading state'i: sadece ilk yükleme veya data yoksa true
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

    // Filter fonksiyonları
    const handleApplyFilters = useCallback(() => {
        applyFilters();
        setFilterDrawerVisible(false);
    }, [applyFilters]);

    const handleClearFilters = useCallback(() => {
        clearFilters();
        setFilterDrawerVisible(false);
    }, [clearFilters]);

    // API'den gelen filtrelenmiş veriyi kullan, yoksa normal veriyi göster
    const filteredStores = useMemo(() => {
        const shouldShowStores = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Dükkan";
        if (!shouldShowStores || appliedFilters.userType === "Serbest Berber") return [];

        return filterStores(displayStores, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById,
            favoriteIds: favoriteStoreIds,
        });
    }, [displayStores, searchQuery, appliedFilters, categoryNameById, favoriteStoreIds]);

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        const params: any = { 
            storeId: store.id, 
            mode: effectiveAppointmentId ? "add-store" : "free-barber"
        };
        
        if (effectiveAppointmentId) {
            params.appointmentId = effectiveAppointmentId;
        }
        
        router.push({
            pathname: "/store/[storeId]",
            params,
        });
    }, [router, effectiveAppointmentId]);

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

    // FlatList için tüm item'ları birleştir
    // Refresh sırasında verilerin iç içe binmemesi için loading state'ini kontrol ediyoruz
    const listData = useMemo(() => {
        const items: Array<{ id: string; type: 'freebarber-section' | 'stores-header' | 'store' | 'stores-empty' | 'stores-loading' | 'stores-error' | 'stores-content-horizontal'; data?: any }> = [];

        // FreeBarberPanelSection - kullanıcı türü filtresi "Serbest Berber" veya "Hepsi" ise göster
        const shouldShowFreeBarberPanel = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Serbest Berber";
        if (shouldShowFreeBarberPanel) {
            items.push({ id: 'freebarber-section', type: 'freebarber-section' });
        }

        // Stores section - kullanıcı türü filtresi "Dükkan" veya "Hepsi" ise göster
        const shouldShowStores = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Dükkan";
        if (shouldShowStores) {
            items.push({ id: 'stores-header', type: 'stores-header' });
            if (isStoresLoading) {
                items.push({ id: 'stores-loading', type: 'stores-loading' });
            } else if (storeError) {
                items.push({ id: 'stores-error', type: 'stores-error' });
            } else {
                // Filtrelenmiş store'ları kullan
                const storesToDisplay = filteredStores;
                const hasStoresToShow = storesToDisplay.length > 0;

                if (hasStoresToShow) {
                    if (expandedStoreBarber) {
                        storesToDisplay.forEach((store) => {
                            items.push({ id: `store-${store.id}`, type: 'store', data: store });
                        });
                    } else {
                        items.push({ id: 'stores-content-horizontal', type: 'stores-content-horizontal', data: storesToDisplay });
                    }
                } else {
                    items.push({ id: 'stores-empty', type: 'stores-empty' });
                }
            }
        }

        return items;
    }, [isStoresLoading, storeError, filteredStores, expandedStoreBarber, appliedFilters.userType]);

    const handleMarkerPress = useCallback(
        (item: BarberStoreGetDto) => {
            setSelectedMapItem(item);
            presentMapDetail();
        },
        [presentMapDetail]
    );

    const storeMarkers = useMemo(() => {
        if (!hasStoreBarbers) return null;
        return filteredStores.map((store) => {
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
    }, [filteredStores, hasStoreBarbers, handleMarkerPress]);

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
                <FilterButton onPress={() => setFilterDrawerVisible(true)}></FilterButton>
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
                    data={listData}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    // Performance optimizations - removeClippedSubviews kaldırıldı (overlap sorununa neden oluyordu)
                    removeClippedSubviews={false}
                    maxToRenderPerBatch={5}
                    updateCellsBatchingPeriod={100}
                    initialNumToRender={5}
                    windowSize={3}
                    renderItem={({ item }) => {
                        if (item.type === 'freebarber-section') {
                            return (
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
                            );
                        }
                        if (item.type === 'stores-header') {
                            return (
                                <View className="flex flex-row justify-between items-center mt-4">
                                    <Text className="font-ibm-plex-sans-regular text-xl text-white">
                                        Çevremdeki Berber Dükkanları
                                    </Text>
                                    {hasStoreBarbers && (
                                        <MotiViewExpand
                                            expanded={expandedStoreBarber}
                                            onPress={() => toggleExpand(expandedStoreBarber, setExpandedStoreBarber)}
                                        />
                                    )}
                                </View>
                            );
                        }
                        if (item.type === 'stores-loading') {
                            return (
                                <View className="pt-4">
                                    {Array.from({ length: 2 }).map((_, i) => (
                                        <SkeletonComponent key={i} />
                                    ))}
                                </View>
                            );
                        }
                        if (item.type === 'stores-error') {
                            return (
                                <View style={{ minHeight: 200, maxHeight: 400 }}>
                                    <LottieViewComponent animationSource={require('../../../assets/animations/error.json')} message={resolveApiErrorMessage(storeError)} />
                                </View>
                            );
                        }
                        if (item.type === 'stores-empty') {
                            // Filtre veya search aktif mi kontrol et
                            const hasActiveFilters = appliedFilters.mainCategory !== "Hepsi" ||
                                appliedFilters.services.length > 0 ||
                                appliedFilters.priceSort !== 'none' ||
                                appliedFilters.minPrice !== '' ||
                                appliedFilters.maxPrice !== '' ||
                                appliedFilters.pricingType !== 'Hepsi' ||
                                appliedFilters.availability !== 'all' ||
                                appliedFilters.rating > 0 ||
                                appliedFilters.favoritesOnly;

                            const isFiltering = searchQuery || hasActiveFilters;

                            return (
                                <View style={{ minHeight: 200, maxHeight: 400 }}>
                                    {isFiltering ? (
                                        <LottieViewComponent
                                            animationSource={require('../../../assets/animations/empty.json')}
                                            message="Filtreleme kriterlerine uygun sonuç bulunamadı"
                                        />
                                    ) : (
                                        <EmptyState
                                            loading={isStoresLoading}
                                            hasLocation={hasLocation}
                                            locationStatus={locationStatus}
                                            fetchedOnce={fetchedOnce}
                                            hasData={hasStoreBarbers}
                                            noResultText="Yakınınızda dükkan bulunamadı"
                                        />
                                    )}
                                </View>
                            );
                        }
                        if (item.type === 'store') {
                            return (
                                <StoreCardInner
                                    store={item.data}
                                    isList={isList}
                                    expanded={expandedStoreBarber}
                                    cardWidthStore={cardWidthStores}
                                    isViewerFromFreeBr={true}
                                    onPressUpdate={goStoreDetail}
                                    onPressRatings={handlePressRatings}
                                />
                            );
                        }
                        if (item.type === 'stores-content-horizontal') {
                            return (
                                <View style={{ overflow: 'hidden', minHeight: 200 }}>
                                    <FlatList
                                        data={filteredStores}
                                        keyExtractor={(store) => store.id}
                                        renderItem={renderItem}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
                                    />
                                </View>
                            );
                        }
                        return null;
                    }}
                />
            )}



            <TouchableOpacity
                onPress={() => setIsMapMode(!isMapMode)}
                className="absolute right-4 bottom-6 w-14 h-14 bg-[#38393b] rounded-full items-center justify-center z-20 shadow-lg border border-[#47494e]"
                style={{ elevation: 8 }}
            >
                <IconButton icon={isMapMode ? "format-list-bulleted" : "map"} iconColor="#f05e23" size={28} style={{ margin: 0 }} />
            </TouchableOpacity>

            <FilterDrawer
                visible={filterDrawerVisible}
                onClose={() => setFilterDrawerVisible(false)}
                selectedUserType={selectedUserType}
                onChangeUserType={setSelectedUserType}
                showUserTypeFilter={true}
                selectedMainCategory={selectedMainCategory}
                onChangeMainCategory={setSelectedMainCategory}
                selectedServices={selectedServices}
                onChangeServices={setSelectedServices}
                priceSort={priceSort}
                onChangePriceSort={setPriceSort}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onChangeMinPrice={setMinPrice}
                onChangeMaxPrice={setMaxPrice}
                selectedPricingType={selectedPricingType}
                onChangePricingType={setSelectedPricingType}
                showPricingType={true}
                availabilityFilter={availabilityFilter}
                onChangeAvailability={setAvailabilityFilter}
                selectedRating={selectedRating}
                onChangeRating={setSelectedRating}
                showFavoritesOnly={showFavoritesOnly}
                onChangeFavoritesOnly={setShowFavoritesOnly}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
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
                    {selectedMapItem && (
                        <StoreBookingContent
                            storeId={(selectedMapItem as any).id}
                            isBottomSheet={true}
                            isFreeBarber={true}
                            mode={effectiveAppointmentId ? "add-store" : undefined}
                            appointmentId={effectiveAppointmentId}
                        />
                    )}
                </BottomSheetView>
            </BottomSheetModal>

            {/* Yorumlar Bottom Sheet */}
            <BottomSheetModal
                ref={(inst) => setRef("ratings", inst)}
                snapPoints={["50%", "85%"]}
                enablePanDownToClose={true}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })}
                onChange={(index) => {
                    if (index < 0) {
                        setSelectedRatingsTarget(null);
                    }
                }}
            >
                {selectedRatingsTarget && (
                    <RatingsBottomSheet
                        targetId={selectedRatingsTarget.targetId}
                        targetName={selectedRatingsTarget.targetName}
                        onClose={() => {
                            setSelectedRatingsTarget(null);
                        }}
                    />
                )}
            </BottomSheetModal>
        </View>
    )
}

export default Index



