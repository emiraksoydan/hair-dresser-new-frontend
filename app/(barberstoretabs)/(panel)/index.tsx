import React, { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Image, RefreshControl, TouchableOpacity, View, ScrollView } from "react-native";
import { Text } from "../../components/common/Text";
import MapView, { Marker } from "react-native-maps";
import { Icon, IconButton } from "react-native-paper";
import SearchBar from "../../components/common/searchbar";
import FormatListButton from "../../components/common/formatlistbutton";
import FilterButton from "../../components/common/filterbutton";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useBottomSheet } from "../../hook/useBottomSheet";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { SkeletonComponent } from "../../components/common/skeleton";
import { LottieViewComponent } from "../../components/common/lottieview";
import { BarberStoreMineDto, FreeBarGetDto } from "../../types";
import { useGetAllCategoriesQuery, useGetMineStoresQuery, useGetSettingQuery } from "../../store/api";
import { FilterDrawer } from "../../components/common/filterdrawer";
import FormStoreUpdate from "../../components/store/formstoreupdate";
import { StoreMineCardComp } from "../../components/store/storeminecard";
import { EmptyState } from "../../components/common/emptystateresult";
import { FreeBarberCardInner } from "../../components/freebarber/freebarbercard";
import FreeBarberBookingContent from "../../components/freebarber/freebarberbooking";
import { useNearbyStoresControl } from "../../hook/useNearByFreeBarberForStore";
import { safeCoord } from "../../utils/location/geo";
import { BarberMarker } from "../../components/freebarber/barbermarker";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";
import { filterFreeBarbers, filterStores } from "../../utils/filter/panel-filters";
import { usePanelFilters } from "../../hook/usePanelFilters";
import { StoreMarker } from "../../components/common/storemarker";
import { DeferredRender } from "../../components/common/deferredrender";
import { CrudSkeletonComponent } from "../../components/common/crudskeleton";
import { resolveApiErrorMessage } from "../../utils/common/error";

const Index = () => {
    const { data: stores = [], isLoading: storeLoading, refetch: refetchStores, error: storesError, isError: isStoresError } = useGetMineStoresQuery(undefined, {
        pollingInterval: 30_000,
        refetchOnMountOrArgChange: true,
    });
    const {
        freeBarbers,
        isLoading: isFreeLoading,
        hasLocation,
        locationStatus,
        location,
        error: freeBarbersError,
        manualFetch
    } = useNearbyStoresControl({
        enabled: true,
        stores,
        hardRefreshMs: 15000,
        radiusKm: 1,
    });

    const { data: allCategories = [] } = useGetAllCategoriesQuery();
    const categoryNameById = useMemo(() => {
        const map = new Map<string, string>();
        (allCategories ?? []).forEach((c: any) => {
            if (c?.id && c?.name) map.set(String(c.id), String(c.name));
        });
        return map;
    }, [allCategories]);

    // Ayarlar
    const { data: settingData } = useGetSettingQuery();

    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<FreeBarGetDto | null>(null);

    // Bottom sheet hooks
    const mapDetailSheet = useBottomSheet({
        snapPoints: ["65%"],
        enablePanDownToClose: true,
    });
    const updateStoreSnapPoints = useMemo(() => isMapMode ? ["75%", "100%"] : ["100%"], [isMapMode]);
    const updateStoreSheet = useBottomSheet({
        snapPoints: updateStoreSnapPoints,
        enablePanDownToClose: isMapMode,
        enableOverDrag: isMapMode,
    });
    const ratingsSheet = useBottomSheet({
        snapPoints: ["50%", "85%"],
        enablePanDownToClose: true,
    });

    const [searchQuery, setSearchQuery] = useState("");
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
    const [refreshing, setRefreshing] = useState(false);
    const isRefreshingRef = useRef(false);
    const onRefresh = useCallback(async () => {
        if (isRefreshingRef.current) return;
        // Error veya location denied durumunda hard refresh yapma
        if (storesError || freeBarbersError || locationStatus === 'denied') {
            return;
        }
        try {
            isRefreshingRef.current = true;
            setRefreshing(true);
            await Promise.all([
                refetchStores(),
                manualFetch(),
            ]);
        } finally {
            setRefreshing(false);
            isRefreshingRef.current = false;
        }
    }, [manualFetch, refetchStores, storesError, freeBarbersError, locationStatus]);



    const [expandedStores, setExpandedStores] = useState(true);
    const [expandedFreeBarbers, setExpandedFreeBarbers] = useState(true);

    const [storeId, setStoreId] = useState<string>("");
    const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{ targetId: string; targetName: string } | null>(null);

    const screenWidth = Dimensions.get("window").width;

    const cardWidthStore = useMemo(
        () => (expandedStores ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedStores, screenWidth]
    );
    const cardWidthFreeBarber = useMemo(
        () => (expandedFreeBarbers ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedFreeBarbers, screenWidth]
    );

    // RTK Query cache'i zaten data yönetimini yapıyor, previous state'lere gerek yok
    const displayStores = stores ?? [];
    const displayFreeBarbers = freeBarbers ?? [];

    // Loading state'leri direkt RTK Query'den geliyor
    const isStoresLoading = storeLoading;
    const isFreeBarbersLoading = isFreeLoading;

    const hasStores = displayStores.length > 0;
    const hasFreeBarbers = displayFreeBarbers.length > 0;

    const handlePressUpdateStore = useCallback(
        (store: BarberStoreMineDto) => {
            setStoreId(store.id);
            // Sheet'i açmak için küçük bir gecikme ekle
            setTimeout(() => {
                updateStoreSheet.present();
            }, 100);
        },
        [updateStoreSheet]
    );

    const handleMarkerPress = useCallback(
        (item: FreeBarGetDto) => {
            setSelectedMapItem(item);
            mapDetailSheet.present();
        },
        [mapDetailSheet]
    );

    const handlePressRatings = useCallback((targetId: string, targetName: string) => {
        setSelectedRatingsTarget({ targetId, targetName });
        // Sheet'i açmak için küçük bir gecikme ekle
        setTimeout(() => {
            ratingsSheet.present();
        }, 100);
    }, [ratingsSheet]);


    // Filter fonksiyonları
    const handleApplyFilters = useCallback(() => {
        applyFilters();
        setFilterDrawerVisible(false);
    }, [applyFilters]);

    const handleClearFilters = useCallback(() => {
        clearFilters();
        setFilterDrawerVisible(false);
    }, [clearFilters]);

    // Kendi dükkanlarını filtrele (client-side)
    const filteredStores = useMemo(() => {
        const shouldShowStores = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Dükkan";
        if (!shouldShowStores) return [];

        return filterStores(displayStores, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById,
        });
    }, [displayStores, searchQuery, appliedFilters, categoryNameById]);

    // API'den gelen filtrelenmiş veriyi kullan, yoksa normal veriyi göster
    const filteredFreeBarbers = useMemo(() => {
        const shouldShowFreeBarbers = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Serbest Berber";
        if (!shouldShowFreeBarbers || appliedFilters.userType === "Dükkan") return [];

        return filterFreeBarbers(displayFreeBarbers, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById,
        });
    }, [displayFreeBarbers, searchQuery, appliedFilters, categoryNameById]);

    const renderStoreItem = useCallback(
        ({ item }: { item: BarberStoreMineDto }) => (
            <StoreMineCardComp
                store={item}
                isList={isList}
                expanded={expandedStores}
                cardWidthStore={cardWidthStore}
                onPressUpdate={handlePressUpdateStore}
                onPressRatings={handlePressRatings}
                showImageAnimation={settingData?.data?.showImageAnimation ?? true}
            />
        ),
        [isList, expandedStores, cardWidthStore, handlePressUpdateStore, handlePressRatings, settingData]
    );

    // Performance: manualFetch'i useCallback ile sarmalayarak gereksiz re-render'ları önle
    const handleManualFetch = useCallback(() => {
        manualFetch();
    }, [manualFetch]);

    const renderFreeBarberItem = useCallback(
        ({ item }: { item: FreeBarGetDto }) => (
            <FreeBarberCardInner
                freeBarber={item}
                isList={isList}
                expanded={expandedFreeBarbers}
                cardWidthFreeBarber={cardWidthFreeBarber}
                mode="barbershop"
                onPressRatings={handlePressRatings}
                onCallFreeBarber={handleManualFetch}
                storeId={stores?.[0]?.id}
                showImageAnimation={settingData?.data?.showImageAnimation ?? true}
            />
        ),
        [isList, expandedFreeBarbers, cardWidthFreeBarber, handlePressRatings, handleManualFetch, stores, settingData]
    );

    // FlatList için tüm item'ları birleştir
    // Refresh sırasında verilerin iç içe binmemesi için loading state'ini kontrol ediyoruz
    const listData = useMemo(() => {
        const items: Array<{ id: string; type: 'stores-header' | 'store' | 'stores-empty' | 'stores-loading' | 'stores-content-horizontal' | 'stores-error' | 'freebarbers-header' | 'freebarber' | 'freebarbers-empty' | 'freebarbers-loading' | 'freebarbers-content-horizontal' | 'freebarbers-error'; data?: any }> = [];

        // Stores section - kullanıcı türü filtresi "Dükkan" veya "Hepsi" ise göster
        const shouldShowStores = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Dükkan";
        if (shouldShowStores) {
            items.push({ id: 'stores-header', type: 'stores-header' });
            if (isStoresLoading) {
                items.push({ id: 'stores-loading', type: 'stores-loading' });
            } else if (isStoresError && storesError) {
                items.push({ id: 'stores-error', type: 'stores-error' });
            } else {
                // Filtrelenmiş dükkanları kullan
                const storesToDisplay = filteredStores;
                const hasStoresToShow = storesToDisplay.length > 0;

                if (hasStoresToShow) {
                    if (expandedStores) {
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

        // FreeBarbers section - kullanıcı türü filtresi "Serbest Berber" veya "Hepsi" ise göster
        const shouldShowFreeBarbers = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Serbest Berber";
        if (shouldShowFreeBarbers) {
            items.push({ id: 'freebarbers-header', type: 'freebarbers-header' });
            if (isFreeBarbersLoading) {
                items.push({ id: 'freebarbers-loading', type: 'freebarbers-loading' });
            } else if (freeBarbersError) {
                items.push({ id: 'freebarbers-error', type: 'freebarbers-error' });
            } else {
                // Filtrelenmiş free barbers kullan
                const freeBarbersToDisplay = filteredFreeBarbers;
                const hasFreeBarbersToShow = freeBarbersToDisplay.length > 0;

                if (hasFreeBarbersToShow) {
                    if (expandedFreeBarbers) {
                        freeBarbersToDisplay.forEach((fb) => {
                            items.push({ id: `freebarber-${fb.id}`, type: 'freebarber', data: fb });
                        });
                    } else {
                        items.push({ id: 'freebarbers-content-horizontal', type: 'freebarbers-content-horizontal', data: freeBarbersToDisplay });
                    }
                } else {
                    items.push({ id: 'freebarbers-empty', type: 'freebarbers-empty' });
                }
            }
        }

        return items;
    }, [isStoresLoading, isFreeBarbersLoading, filteredStores, filteredFreeBarbers, expandedStores, expandedFreeBarbers, appliedFilters.userType]);

    const mapInitialRegion = useMemo(() => {
        const storeCandidate = displayStores
            .map((s) => safeCoord(s.latitude, s.longitude))
            .find(Boolean);

        if (storeCandidate) {
            return {
                latitude: storeCandidate.lat,
                longitude: storeCandidate.lon,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
            };
        }
        return {
            latitude: 41.0082,
            longitude: 28.9784,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
        };
    }, [displayStores]);
    const freeBarberMarkers = useMemo(() => {
        return filteredFreeBarbers.map((barber) => (
            <BarberMarker
                key={(barber as any).id}
                barber={barber}
                onPress={handleMarkerPress}
            />
        ));
    }, [filteredFreeBarbers, handleMarkerPress]); // Sadece liste değişirse render et

    const storeMarkers = useMemo(() => {
        if (filteredStores.length === 0) return null;
        return filteredStores.map((store) => {
            const c = safeCoord(store.latitude, store.longitude);
            if (!c) return null;

            return (
                <StoreMarker
                    key={store.id}
                    storeId={store.id}
                    coordinate={{ latitude: c.lat, longitude: c.lon }}
                    title={store.storeName}
                    description={store.addressDescription}
                    imageUrl={store?.imageList?.[0]?.imageUrl}
                    storeType={store.type}
                    onPress={() => handlePressUpdateStore(store)}
                />
            );
        });
    }, [filteredStores, handlePressUpdateStore]);

    return (
        <View className="flex flex-1 pl-4 pr-2 bg-[#151618]">
            <View className={isMapMode ? "absolute top-0 left-0 right-0 z-10 px-4 pt-0 pb-2 bg-transparent" : ""}>
                <View className="flex flex-row items-center gap-2 mt-2">
                    <View className="flex flex-1">
                        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    </View>
                    <FormatListButton isList={isList} setIsList={setIsList} />
                    <FilterButton onPress={() => setFilterDrawerVisible(true)} />
                </View>
            </View>

            {isMapMode ? (
                <View className="absolute inset-0 z-0">
                    <MapView style={{ flex: 1 }} userInterfaceStyle="dark" initialRegion={mapInitialRegion}>
                        {freeBarberMarkers}
                        {storeMarkers}
                    </MapView>
                </View>
            ) : (
                <FlatList
                    data={listData}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#f05e23"
                        />
                    }

                    // Performance optimizations - removeClippedSubviews kaldırıldı (overlap sorununa neden oluyordu)
                    removeClippedSubviews={false}
                    maxToRenderPerBatch={5}
                    updateCellsBatchingPeriod={100}
                    initialNumToRender={5}
                    windowSize={3}
                    renderItem={({ item }) => {
                        if (item.type === 'stores-header') {
                            return (
                                <View className="flex flex-row justify-between items-center mt-4">
                                    <Text className="font-century-gothic text-xl text-white">İşletmelerim</Text>
                                    {hasStores && <MotiViewExpand expanded={expandedStores} onPress={() => toggleExpand(expandedStores, setExpandedStores)} />}
                                </View>
                            );
                        }
                        if (item.type === 'stores-loading') {
                            return (
                                <View className="pt-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonComponent key={i} />)}</View>
                            );
                        }
                        if (item.type === 'stores-error') {
                            return (
                                <View style={{ minHeight: 200, maxHeight: 400 }}>
                                    <LottieViewComponent animationSource={require('../../../assets/animations/error.json')} message={resolveApiErrorMessage(storesError)} />
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
                                            message="Filtreleme kriterlerine uygun işletme bulunamadı"
                                        />
                                    ) : locationStatus === "denied" ? (
                                        <View style={{ minHeight: 200, maxHeight: 400 }}>
                                            <LottieViewComponent
                                                animationSource={require('../../../assets/animations/Location.json')}
                                                message="Konum izni verilmedi. Lütfen ayarlardan konum iznini açın."
                                            />
                                        </View>
                                    ) : (
                                        <EmptyState
                                            loading={isStoresLoading}
                                            hasLocation={hasLocation}
                                            locationStatus={locationStatus}
                                            fetchedOnce={true}
                                            hasData={hasStores}
                                            noResultText="Eklenmiş berber dükkanınız bulunmuyor."
                                        />
                                    )}
                                </View>
                            );
                        }
                        if (item.type === 'store') {
                            return (
                                <StoreMineCardComp
                                    store={item.data}
                                    isList={isList}
                                    expanded={expandedStores}
                                    cardWidthStore={cardWidthStore}
                                    onPressUpdate={handlePressUpdateStore}
                                    onPressRatings={handlePressRatings}
                                    showImageAnimation={settingData?.data?.showImageAnimation ?? true}
                                />
                            );
                        }
                        if (item.type === 'stores-content-horizontal') {
                            return (
                                <View style={{ overflow: 'hidden', minHeight: 200 }}>
                                    <FlatList
                                        data={item.data}
                                        keyExtractor={(store) => store.id}
                                        renderItem={renderStoreItem}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ gap: 12, paddingTop: 8 }}
                                    />
                                </View>
                            );
                        }
                        if (item.type === 'freebarbers-header') {
                            return (
                                <View className="flex flex-row justify-between items-center mt-4">
                                    <Text className="font-century-gothic text-xl text-white">Serbest Berberler</Text>
                                    {hasFreeBarbers && (
                                        <MotiViewExpand expanded={expandedFreeBarbers} onPress={() => toggleExpand(expandedFreeBarbers, setExpandedFreeBarbers)} />
                                    )}
                                </View>
                            );
                        }
                        if (item.type === 'freebarbers-loading') {
                            return (
                                <View className="pt-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonComponent key={i} />)}</View>
                            );
                        }
                        if (item.type === 'freebarbers-error') {
                            return (
                                <View style={{ minHeight: 200, maxHeight: 400 }}>
                                    <LottieViewComponent animationSource={require('../../../assets/animations/error.json')} message={resolveApiErrorMessage(freeBarbersError)} />
                                </View>
                            );
                        }
                        if (item.type === 'freebarbers-empty') {
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
                                    ) : locationStatus === "denied" ? (
                                        <View style={{ minHeight: 200, maxHeight: 400 }}>
                                            <LottieViewComponent
                                                animationSource={require('../../../assets/animations/Location.json')}
                                                message="Konum izni verilmedi. Lütfen ayarlardan konum iznini açın."
                                            />
                                        </View>
                                    ) : (
                                        <EmptyState
                                            loading={isFreeBarbersLoading}
                                            hasLocation={hasLocation}
                                            locationStatus={locationStatus}
                                            fetchedOnce={true}
                                            hasData={hasFreeBarbers}
                                            noResultText="Yakınınızda serbest berber bulunamadı"
                                        />
                                    )}
                                </View>
                            );
                        }
                        if (item.type === 'freebarber') {
                            return (
                                <FreeBarberCardInner
                                    freeBarber={item.data}
                                    isList={isList}
                                    expanded={expandedFreeBarbers}
                                    cardWidthFreeBarber={cardWidthFreeBarber}
                                    mode="barbershop"
                                    onPressRatings={handlePressRatings}
                                    onCallFreeBarber={() => manualFetch()}
                                    storeId={stores?.[0]?.id}
                                    showImageAnimation={settingData?.data?.showImageAnimation ?? true}
                                />
                            );
                        }
                        if (item.type === 'freebarbers-content-horizontal') {
                            return (
                                <View style={{ overflow: 'hidden', minHeight: 200 }}>
                                    <FlatList
                                        data={item.data}
                                        keyExtractor={(fb: FreeBarGetDto) => (fb as any).id}
                                        renderItem={renderFreeBarberItem}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ gap: 12, paddingTop: 8 }}
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
                className="absolute right-0 bottom-6 bg-[#38393b] rounded-full rounded-r-none items-center justify-center z-20 shadow-lg border border-[#47494e] px-2 py-1 flex-row gap-0"
                style={{ elevation: 8 }}
            >
                <IconButton icon={isMapMode ? "format-list-bulleted" : "map"} iconColor="#f05e23" size={24} style={{ margin: 0 }} />
                <Text className="text-white font-semibold text-sm">{isMapMode ? "Liste" : "Haritada Ara"}</Text>
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
                ref={updateStoreSheet.ref}
                backdropComponent={updateStoreSheet.makeBackdrop()}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                onChange={updateStoreSheet.handleChange}
                snapPoints={updateStoreSheet.snapPoints}
                enableOverDrag={updateStoreSheet.enableOverDrag}
                enablePanDownToClose={updateStoreSheet.enablePanDownToClose}
            >
                <BottomSheetView className="h-full pt-2">
                    <DeferredRender
                        active={updateStoreSheet.isOpen}
                        placeholder={
                            <View className="flex-1 pt-4">
                                <CrudSkeletonComponent />
                            </View>
                        }
                    >
                        <FormStoreUpdate
                            storeId={storeId}
                            enabled={updateStoreSheet.isOpen}
                            onClose={() => {
                                updateStoreSheet.dismiss();
                            }}
                            error={storesError || freeBarbersError}
                            locationStatus={locationStatus}
                        />
                    </DeferredRender>
                </BottomSheetView>
            </BottomSheetModal>

            <BottomSheetModal
                ref={mapDetailSheet.ref}
                onChange={mapDetailSheet.handleChange}
                snapPoints={mapDetailSheet.snapPoints}
                enablePanDownToClose={mapDetailSheet.enablePanDownToClose}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={mapDetailSheet.makeBackdrop()}
            >
                <BottomSheetView style={{ flex: 1, padding: 0, margin: 0 }}>
                    <DeferredRender
                        active={mapDetailSheet.isOpen && !!selectedMapItem}
                        placeholder={
                            <View className="flex-1 pt-4">
                                <SkeletonComponent />
                            </View>
                        }
                    >
                        {selectedMapItem && <FreeBarberBookingContent barberId={(selectedMapItem as any).id} isBottomSheet={true} isBarberMode={true} storeId={storeId || stores?.[0]?.id} />}
                    </DeferredRender>
                </BottomSheetView>
            </BottomSheetModal>

            {/* Yorumlar Bottom Sheet */}
            <BottomSheetModal
                ref={ratingsSheet.ref}
                snapPoints={ratingsSheet.snapPoints}
                enablePanDownToClose={ratingsSheet.enablePanDownToClose}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={ratingsSheet.makeBackdrop()}
                onChange={(index) => {
                    ratingsSheet.handleChange(index);
                    if (index < 0) {
                        setSelectedRatingsTarget(null);
                    }
                }}
            >
                {selectedRatingsTarget ? (
                    <RatingsBottomSheet
                        targetId={selectedRatingsTarget.targetId}
                        targetName={selectedRatingsTarget.targetName}
                        onClose={() => {
                            setSelectedRatingsTarget(null);
                            ratingsSheet.dismiss();
                        }}
                    />
                ) : (
                    <View className="flex-1 pt-4">
                        <SkeletonComponent />
                    </View>
                )}
            </BottomSheetModal>
        </View>
    );
};

export default Index;




