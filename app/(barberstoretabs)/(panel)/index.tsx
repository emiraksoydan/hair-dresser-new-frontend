import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Image, RefreshControl, Text, TouchableOpacity, View, ScrollView } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Icon, IconButton } from "react-native-paper";
import SearchBar from "../../components/common/searchbar";
import FormatListButton from "../../components/common/formatlistbutton";
import FilterButton from "../../components/common/filterbutton";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useBottomSheetRegistry, useSheet } from "../../context/bottomsheet";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { SkeletonComponent } from "../../components/common/skeleton";
import { LottieViewComponent } from "../../components/common/lottieview";
import { BarberStoreMineDto, FreeBarGetDto, FavoriteTargetType } from "../../types";
import { useGetAllCategoriesQuery, useGetMineStoresQuery, useGetMyFavoritesQuery } from "../../store/api";
import { FilterDrawer } from "../../components/common/filterdrawer";
import FormStoreUpdate from "../../components/store/formstoreupdate";
import { StoreMineCardComp } from "../../components/store/storeminecard";
import { EmptyState } from "../../components/common/emptystateresult";
import { FreeBarberCardInner } from "../../components/freebarber/freebarbercard";
import FreeBarberBookingContent from "../../components/freebarber/freebarberbooking";
import { useNearbyStoresControl } from "../../hook/useNearByFreeBarberForStore";
import { safeCoord } from "../../utils/location/geo";
import { ensureLocationGateWithUI } from "../../components/location/location-gate"; // Retry için eklendi
import { BarberMarker } from "../../components/freebarber/barbermarker";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";
import { filterFreeBarbers, filterStores } from "../../utils/filter/panel-filters";
import { usePanelFilters } from "../../hook/usePanelFilters";
import { CachedImage } from "../../components/common/CachedImage";

const Index = () => {
    // 30 saniyede bir otomatik yenileme - beğeniler ve yorumlar için
    // refetchOnMountOrArgChange: true ile her mount'ta ve invalidate edildiğinde refetch et
    const { data: stores = [], isLoading: storeLoading, refetch: refetchStores } = useGetMineStoresQuery(undefined, {
        pollingInterval: 30_000, // 30 saniye
        refetchOnMountOrArgChange: true, // Hard refresh: Her mount'ta ve invalidate edildiğinde refetch et
    });
    const {
        freeBarbers,
        isLoading: isFreeLoading,
        hasLocation,
        locationStatus,
        location,
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
    const { data: favorites = [], refetch: refetchFavorites } = useGetMyFavoritesQuery();
    const favoriteStoreIds = useMemo(() => {
        return new Set(
            (favorites ?? [])
                .filter((f: any) => f.targetType === FavoriteTargetType.Store)
                .map((f: any) => String(f.favoritedToId))
        );
    }, [favorites]);
    const favoriteFreeBarberIds = useMemo(() => {
        return new Set(
            (favorites ?? [])
                .filter((f: any) => f.targetType === FavoriteTargetType.FreeBarber)
                .map((f: any) => String(f.favoritedToId))
        );
    }, [favorites]);

    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<FreeBarGetDto | null>(null);

    const { present: presentMapDetail } = useSheet("mapDetail");
    const { present: updateStore } = useSheet("updateStoreMine");
    const { present: presentRatings } = useSheet("ratings");

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
        try {
            isRefreshingRef.current = true;
            setRefreshing(true);
            await Promise.all([
                refetchStores(),
                refetchFavorites(),
                manualFetch(),
            ]);
        } finally {
            setRefreshing(false);
            isRefreshingRef.current = false;
        }
    }, [manualFetch, refetchFavorites, refetchStores]);



    const [expandedStores, setExpandedStores] = useState(true);
    const [expandedFreeBarbers, setExpandedFreeBarbers] = useState(true);

    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);
    const [storeId, setStoreId] = useState<string>("");
    const [ratingsSheetOpen, setRatingsSheetOpen] = useState(false);
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

    // Önceki data'yı tutarak flicker'ı önle ve iç içe binmeyi engelle
    const [previousStores, setPreviousStores] = useState<BarberStoreMineDto[]>([]);
    const [previousFreeBarbers, setPreviousFreeBarbers] = useState<FreeBarGetDto[]>([]);

    // Data değiştiğinde önceki data'yı güncelle
    // DÜZELTME: dependency array'den previous state'ler kaldırıldı (stale closure önlendi)
    useEffect(() => {
        if (!storeLoading && stores && Array.isArray(stores)) {
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
    }, [stores, storeLoading]); // previousStores dependency'den kaldırıldı

    useEffect(() => {
        if (!isFreeLoading && freeBarbers && Array.isArray(freeBarbers)) {
            // Loading bittiğinde ve yeni data geçerliyse kaydet
            if (freeBarbers.length > 0) {
                // Yeni data varsa ve öncekinden farklıysa güncelle
                setPreviousFreeBarbers(prev => {
                    // Deep equality check yerine length ve ilk id kontrolü (performance için)
                    if (prev.length !== freeBarbers.length ||
                        (prev[0]?.id !== freeBarbers[0]?.id)) {
                        return freeBarbers;
                    }
                    return prev;
                });
            }
        }
    }, [freeBarbers, isFreeLoading]); // previousFreeBarbers dependency'den kaldırıldı

    // Display için: loading ise önceki data'yı göster (refresh sırasında flicker önlenir)
    // Loading değilse yeni data'yı göster
    const displayStores = storeLoading && previousStores.length > 0
        ? previousStores
        : (stores ?? []);
    const displayFreeBarbers = isFreeLoading && previousFreeBarbers.length > 0
        ? previousFreeBarbers
        : (freeBarbers ?? []);

    // Loading state'i: sadece ilk yükleme veya data yoksa true
    const isStoresLoading = storeLoading && previousStores.length === 0;
    const isFreeBarbersLoading = isFreeLoading && previousFreeBarbers.length === 0;

    const hasStores = displayStores.length > 0;
    const hasFreeBarbers = displayFreeBarbers.length > 0;

    const handlePressUpdateStore = useCallback(
        (store: BarberStoreMineDto) => {
            setStoreId(store.id);
            updateStore();
        },
        [updateStore]
    );

    const handleMarkerPress = useCallback(
        (item: FreeBarGetDto) => {
            setSelectedMapItem(item);
            presentMapDetail();
        },
        [presentMapDetail]
    );

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

    // Kendi dükkanlarını filtrele (client-side)
    const filteredStores = useMemo(() => {
        const shouldShowStores = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Dükkan";
        if (!shouldShowStores) return [];

        return filterStores(displayStores, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById,
            favoriteIds: favoriteStoreIds,
        });
    }, [displayStores, searchQuery, appliedFilters, categoryNameById, favoriteStoreIds]);

    // API'den gelen filtrelenmiş veriyi kullan, yoksa normal veriyi göster
    const filteredFreeBarbers = useMemo(() => {
        const shouldShowFreeBarbers = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Serbest Berber";
        if (!shouldShowFreeBarbers || appliedFilters.userType === "Dükkan") return [];

        return filterFreeBarbers(displayFreeBarbers, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById,
            favoriteIds: favoriteFreeBarberIds,
        });
    }, [displayFreeBarbers, searchQuery, appliedFilters, categoryNameById, favoriteFreeBarberIds]);

    const renderStoreItem = useCallback(
        ({ item }: { item: BarberStoreMineDto }) => (
            <StoreMineCardComp
                store={item}
                isList={isList}
                expanded={expandedStores}
                cardWidthStore={cardWidthStore}
                onPressUpdate={handlePressUpdateStore}
                onPressRatings={handlePressRatings}
            />
        ),
        [isList, expandedStores, cardWidthStore, handlePressUpdateStore, handlePressRatings]
    );

    const renderFreeBarberItem = useCallback(
        ({ item }: { item: FreeBarGetDto }) => (
            <FreeBarberCardInner
                freeBarber={item}
                isList={isList}
                expanded={expandedFreeBarbers}
                cardWidthFreeBarber={cardWidthFreeBarber}
                mode="barbershop"
                onPressRatings={handlePressRatings}
                onCallFreeBarber={() => manualFetch()}
                storeId={stores?.[0]?.id}
            />
        ),
        [isList, expandedFreeBarbers, cardWidthFreeBarber, handlePressRatings, manualFetch, stores]
    );

    // FlatList için tüm item'ları birleştir
    // Refresh sırasında verilerin iç içe binmemesi için loading state'ini kontrol ediyoruz
    const listData = useMemo(() => {
        const items: Array<{ id: string; type: 'stores-header' | 'store' | 'stores-empty' | 'stores-loading' | 'stores-content-horizontal' | 'freebarbers-header' | 'freebarber' | 'freebarbers-empty' | 'freebarbers-loading' | 'freebarbers-content-horizontal'; data?: any }> = [];

        // Stores section - kullanıcı türü filtresi "Dükkan" veya "Hepsi" ise göster
        const shouldShowStores = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Dükkan";
        if (shouldShowStores) {
            items.push({ id: 'stores-header', type: 'stores-header' });
            if (isStoresLoading) {
                items.push({ id: 'stores-loading', type: 'stores-loading' });
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

            const avatarUrl = store?.imageList?.[0]?.imageUrl;
            const bg = store.type == 0 ? "#2563eb" : store.type == 1 ? "#db2777" : "#16a34a";
            const iconName = store.type == 2 ? "store" : store.type == 0 ? "face-man" : "face-woman";
            return <Marker
                key={store.id}
                coordinate={{ latitude: c.lat, longitude: c.lon }}
                title={store.storeName}
                description={store.addressDescription}
                tracksViewChanges={false}
                onPress={() => handlePressUpdateStore(store)}
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
                        <CachedImage uri={avatarUrl} className="w-full h-full rounded-full" resizeMode="cover" />
                    ) : (
                        <Icon source={iconName} color="white" size={20} />
                    )}
                </View>
            </Marker>;
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
                                    <Text className="font-ibm-plex-sans-regular text-xl text-white">İşletmelerim</Text>
                                    {hasStores && <MotiViewExpand expanded={expandedStores} onPress={() => toggleExpand(expandedStores, setExpandedStores)} />}
                                </View>
                            );
                        }
                        if (item.type === 'stores-loading') {
                            return (
                                <View className="pt-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonComponent key={i} />)}</View>
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
                                    <Text className="font-ibm-plex-sans-regular text-xl text-white">Serbest Berberler</Text>
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
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                ref={(inst) => setRef("updateStoreMine", inst)}
                onChange={(index) => setIsUpdateSheetOpen(index >= 0)}
                snapPoints={isMapMode ? ["75%", "100%"] : ["100%"]}
                enableOverDrag={isMapMode}
                enablePanDownToClose={isMapMode}
            >
                <BottomSheetView className="h-full pt-2">
                    <FormStoreUpdate
                        storeId={storeId}
                        enabled={isUpdateSheetOpen}

                    />
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
                    {selectedMapItem && <FreeBarberBookingContent barberId={(selectedMapItem as any).id} isBottomSheet={true} isBarberMode={true} storeId={storeId || stores?.[0]?.id} />}
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
                        setRatingsSheetOpen(false);
                        setSelectedRatingsTarget(null);
                    }
                }}
            >
                {selectedRatingsTarget && (
                    <RatingsBottomSheet
                        targetId={selectedRatingsTarget.targetId}
                        targetName={selectedRatingsTarget.targetName}
                        onClose={() => {
                            setRatingsSheetOpen(false);
                            setSelectedRatingsTarget(null);
                        }}
                    />
                )}
            </BottomSheetModal>
        </View>
    );
};

export default Index;




