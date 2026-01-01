import { Text, View, Dimensions, TouchableOpacity, Image, RefreshControl, FlatList, ScrollView, ActivityIndicator } from "react-native";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useNearbyStores } from "../../hook/useNearByStore";
import { useNearbyFreeBarber } from "../../hook/useNearByFreeBarber";
import SearchBar from "../../components/common/searchbar";
import { useBottomSheetRegistry, useSheet } from "../../context/bottomsheet";
import { BarberStoreGetDto, FreeBarGetDto, FavoriteTargetType } from "../../types";
import { useGetAllCategoriesQuery, useGetMyFavoritesQuery } from "../../store/api";
import { StoreCardInner } from "../../components/store/storecard";
import FormatListButton from "../../components/common/formatlistbutton";
import FilterButton from "../../components/common/filterbutton";
import { FilterDrawer } from "../../components/common/filterdrawer";
import { FreeBarberCardInner } from "../../components/freebarber/freebarbercard";
import { useRouter } from "expo-router";
import { Icon, IconButton } from "react-native-paper";
import MapView, { Marker } from "react-native-maps";
import { safeCoord } from "../../utils/location/geo";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import StoreBookingContent from "../../components/store/storebooking";
import FreeBarberBookingContent from "../../components/freebarber/freebarberbooking";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { SkeletonComponent } from "../../components/common/skeleton";
import { EmptyState } from "../../components/common/emptystateresult";
import { StoresSection, FreeBarbersSection } from '../../components/panel/PanelSections';
import { filterFreeBarbers, filterStores } from "../../utils/filter/panel-filters";
import { usePanelFilters } from "../../hook/usePanelFilters";
import { StoreMarker } from "../../components/common/storemarker";
import { BarberMarker } from "../../components/freebarber/barbermarker";

// ✅ Main Component
const Index = () => {
    const router = useRouter();

    // ✅ RTK Query ile data çekme - keepUnusedDataFor ile cache süresi ayarlanır
    const {
        stores = [],
        loading: storesLoading,
        locationStatus: storesLocationStatus,
        hasLocation: storesHasLocation,
        location: storesLocation,
        fetchedOnce: storesFetchedOnce,
        manualFetch: manualFetchStores
    } = useNearbyStores(true);

    const {
        freeBarbers = [],
        loading: freeBarbersLoading,
        locationStatus: freeBarbersLocationStatus,
        hasLocation: freeBarbersHasLocation,
        location: freeBarbersLocation,
        fetchedOnce: freeBarbersFetchedOnce,
        manualFetch: manualFetchFreeBarbers
    } = useNearbyFreeBarber(true);

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
    const favoriteFreeBarberIds = useMemo(() => {
        return new Set(
            (favorites ?? [])
                .filter((f: any) => f.targetType === FavoriteTargetType.FreeBarber)
                .map((f: any) => String(f.favoritedToId))
        );
    }, [favorites]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isList, setIsList] = useState(true);
    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<{ type: 'store' | 'freeBarber', data: any } | null>(null);
    const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{ targetId: string; targetName: string } | null>(null);

    const { present: presentMapDetail } = useSheet("mapDetail");
    const { present: presentRatings } = useSheet("ratings");
    const { setRef, makeBackdrop } = useBottomSheetRegistry();

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


    // ✅ Refresh handler - her iki list'i de yenile (concurrency guarded)
    // Hard refresh: Cache'i bypass ederek fresh data çek
    const [refreshing, setRefreshing] = useState(false);
    const isRefreshingRef = useRef(false);
    const onRefresh = useCallback(async () => {
        if (isRefreshingRef.current) return;
        try {
            isRefreshingRef.current = true;
            setRefreshing(true);
            // Hard refresh: Cache'i bypass ederek fresh data çek
            await Promise.all([
                manualFetchStores(),
                manualFetchFreeBarbers()
            ]);
        } finally {
            setRefreshing(false);
            isRefreshingRef.current = false;
        }
    }, [manualFetchStores, manualFetchFreeBarbers]);

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        router.push({
            pathname: "/store/[storeId]",
            params: { storeId: store.id, mode: "customer" },
        });
    }, [router]);

    const goFreeBarberDetail = useCallback((freeBarber: FreeBarGetDto) => {
        router.push({
            pathname: "/freebarber/[freeBarberId]",
            params: { freeBarberId: freeBarber.id },
        });
    }, [router]);

    const handleMapItemPress = useCallback((item: any, type: 'store' | 'freeBarber') => {
        setSelectedMapItem({ type, data: item });
        presentMapDetail();
    }, [presentMapDetail]);

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
        if (!shouldShowStores) return [];

        return filterStores(stores, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById,
            favoriteIds: favoriteStoreIds,
        });
    }, [stores, searchQuery, appliedFilters, categoryNameById, favoriteStoreIds]);

    const filteredFreeBarbers = useMemo(() => {
        const shouldShowFreeBarbers = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Serbest Berber";
        if (!shouldShowFreeBarbers) return [];

        return filterFreeBarbers(freeBarbers, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById,
            favoriteIds: favoriteFreeBarberIds,
        });
    }, [freeBarbers, searchQuery, appliedFilters, categoryNameById, favoriteFreeBarberIds]);

    // ✅ Map markers (filtrelenmiş data kullan)
    const storeMarkers = useMemo(() => {
        return filteredStores.map((store) => {
            const c = safeCoord(store.latitude, store.longitude);
            if (!c) return null;

            return (
                <StoreMarker
                    key={`store-${store.id}`}
                    storeId={store.id}
                    coordinate={{ latitude: c.lat, longitude: c.lon }}
                    title={store.storeName}
                    description={store.addressDescription}
                    imageUrl={store?.imageList?.[0]?.imageUrl}
                    storeType={store.type}
                    onPress={() => handleMapItemPress(store, 'store')}
                />
            );
        });
    }, [filteredStores, handleMapItemPress]);

    const freeBarberMarkers = useMemo(() => {
        return filteredFreeBarbers.map((barber) => {
            return (
                <BarberMarker
                    key={`fb-${(barber as any).id}`}
                    barber={barber}
                    onPress={() => handleMapItemPress(barber, 'freeBarber')}
                />
            );
        });
    }, [filteredFreeBarbers, handleMapItemPress]);

    return (
        <View className="flex flex-1 pl-4 pr-2 bg-[#151618]">
            {/* Search Bar */}
            <View className={isMapMode ? "absolute top-0 left-0 right-0 z-10 px-4 pt-0 pb-2 bg-transparent" : ""}>
                <View className="flex flex-row items-center gap-2 mt-2">
                    <View className="flex flex-1">
                        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    </View>
                    <FormatListButton isList={isList} setIsList={setIsList} />
                    <FilterButton onPress={() => setFilterDrawerVisible(true)} />
                </View>
            </View>

            {/* Map or List View */}
            {isMapMode ? (
                <View className="absolute inset-0 z-0">
                    <MapView style={{ flex: 1 }} userInterfaceStyle="dark" showsUserLocation={true}>
                        {storeMarkers}
                        {freeBarberMarkers}
                    </MapView>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#f05e23"
                        />
                    }
                >
                    <StoresSection
                        stores={filteredStores}
                        loading={storesLoading}
                        hasLocation={storesHasLocation}
                        locationStatus={storesLocationStatus}
                        fetchedOnce={storesFetchedOnce}
                        isList={isList}
                        onPressStore={goStoreDetail}
                        onPressRatings={handlePressRatings}
                        searchQuery={searchQuery}
                        appliedFilters={appliedFilters}
                    />

                    <FreeBarbersSection
                        freeBarbers={filteredFreeBarbers}
                        loading={freeBarbersLoading}
                        hasLocation={freeBarbersHasLocation}
                        locationStatus={freeBarbersLocationStatus}
                        fetchedOnce={freeBarbersFetchedOnce}
                        isList={isList}
                        onPressFreeBarber={goFreeBarberDetail}
                        onPressRatings={handlePressRatings}
                        searchQuery={searchQuery}
                        appliedFilters={appliedFilters}
                    />
                </ScrollView>
            )}

            {/* Map Toggle Button */}
            <TouchableOpacity
                onPress={() => setIsMapMode(!isMapMode)}
                className="absolute right-4 bottom-6 w-14 h-14 bg-[#38393b] rounded-full items-center justify-center z-20 shadow-lg border border-[#47494e]"
                style={{ elevation: 8 }}
            >
                <IconButton icon={isMapMode ? "format-list-bulleted" : "map"} iconColor="#f05e23" size={28} style={{ margin: 0 }} />
            </TouchableOpacity>

            {/* Filter Drawer */}
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

            {/* Bottom Sheets */}

            <BottomSheetModal
                ref={(inst) => setRef("mapDetail", inst)}
                snapPoints={isMapMode ? ["75%", "100%"] : ["100%"]}
                enableOverDrag={isMapMode}
                enablePanDownToClose={isMapMode}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })}
            >
                <BottomSheetView style={{ flex: 1, padding: 0, margin: 0 }}>
                    {selectedMapItem?.type === 'store' && (
                        <StoreBookingContent isCustomer={true} storeId={selectedMapItem.data.id} isBottomSheet={true} />
                    )}
                    {selectedMapItem?.type === 'freeBarber' && (
                        <FreeBarberBookingContent barberId={selectedMapItem.data.id} isBottomSheet={true} />
                    )}
                </BottomSheetView>
            </BottomSheetModal>

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
                        onClose={() => setSelectedRatingsTarget(null)}
                    />
                )}
            </BottomSheetModal>
        </View>
    );
};

export default Index;





