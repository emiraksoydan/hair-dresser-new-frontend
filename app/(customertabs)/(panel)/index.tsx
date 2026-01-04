import { Text, View, Dimensions, TouchableOpacity, Image, RefreshControl, FlatList, ScrollView, ActivityIndicator } from "react-native";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useNearbyStores } from "../../hook/useNearByStore";
import { useNearbyFreeBarber } from "../../hook/useNearByFreeBarber";
import SearchBar from "../../components/common/searchbar";
import { useBottomSheet } from "../../hook/useBottomSheet";
import { BarberStoreGetDto, FreeBarGetDto } from "../../types";
import { useGetAllCategoriesQuery } from "../../store/api";
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

const Index = () => {
    const router = useRouter();

    const {
        stores = [],
        loading: storesLoading,
        locationStatus: storesLocationStatus,
        hasLocation: storesHasLocation,
        location: storesLocation,
        fetchedOnce: storesFetchedOnce,
        error: storesError,
        manualFetch: manualFetchStores
    } = useNearbyStores(true);

    const {
        freeBarbers = [],
        loading: freeBarbersLoading,
        locationStatus: freeBarbersLocationStatus,
        hasLocation: freeBarbersHasLocation,
        location: freeBarbersLocation,
        fetchedOnce: freeBarbersFetchedOnce,
        error: freeBarbersError,
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

    const [searchQuery, setSearchQuery] = useState("");
    const [isList, setIsList] = useState(true);
    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<{ type: 'store' | 'freeBarber', data: any } | null>(null);
    const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{ targetId: string; targetName: string } | null>(null);

    // Bottom sheet hooks
    const mapDetailSheet = useBottomSheet({
        snapPoints: ["65%"],
        enablePanDownToClose: true,
    });
    const ratingsSheet = useBottomSheet({
        snapPoints: ["50%", "85%"],
        enablePanDownToClose: true,
    });

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


    // Refresh handler - her iki list'i de yenile (concurrency guarded)
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
        mapDetailSheet.present();
    }, [mapDetailSheet]);

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

    // API'den gelen filtrelenmiş veriyi kullan, yoksa normal veriyi göster
    const filteredStores = useMemo(() => {
        const shouldShowStores = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Dükkan";
        if (!shouldShowStores) return [];

        return filterStores(stores, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById,
        });
    }, [stores, searchQuery, appliedFilters, categoryNameById]);

    const filteredFreeBarbers = useMemo(() => {
        const shouldShowFreeBarbers = appliedFilters.userType === "Hepsi" || appliedFilters.userType === "Serbest Berber";
        if (!shouldShowFreeBarbers) return [];

        return filterFreeBarbers(freeBarbers, {
            searchQuery,
            filters: appliedFilters,
            categoryNameById,
        });
    }, [freeBarbers, searchQuery, appliedFilters, categoryNameById]);

    // Map markers (filtrelenmiş data kullan)
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
                        error={storesError}
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
                        error={freeBarbersError}
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
                className="absolute right-0 bottom-6 bg-[#38393b] rounded-full rounded-r-none items-center justify-center z-20 shadow-lg border border-[#47494e] px-2 py-1 flex-row gap-0"
                style={{ elevation: 8 }}
            >
                <IconButton icon={isMapMode ? "format-list-bulleted" : "map"} iconColor="#f05e23" size={24} style={{ margin: 0 }} />
                <Text className="text-white font-semibold text-sm">{isMapMode ? "Liste" : "Haritada Ara"}</Text>
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
                ref={mapDetailSheet.ref}
                snapPoints={mapDetailSheet.snapPoints}
                enableOverDrag={isMapMode}
                enablePanDownToClose={mapDetailSheet.enablePanDownToClose}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={mapDetailSheet.makeBackdrop()}
                onChange={mapDetailSheet.handleChange}
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





