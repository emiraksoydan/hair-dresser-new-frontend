import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, FlatList, Image, Text, TouchableOpacity, View, ScrollView } from "react-native";
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
import { BarberStoreMineDto, FreeBarGetDto, BarberType } from "../../types";
import { useGetMineStoresQuery, useGetFilteredFreeBarbersMutation } from "../../store/api";
import { FilterDrawer } from "../../components/common/filterdrawer";
import { FilterRequestDto } from "../../types/filter";
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

const Index = () => {
    // 30 saniyede bir otomatik yenileme - beğeniler ve yorumlar için
    // refetchOnMountOrArgChange: true ile her mount'ta ve invalidate edildiğinde refetch et
    const { data: stores = [], isLoading: storeLoading } = useGetMineStoresQuery(undefined, {
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

    // API Filtreleme Mutation
    const [triggerFilterFreeBarbers, { data: filteredFreeBarbersData, isLoading: isFilteringFreeBarbers }] = useGetFilteredFreeBarbersMutation();

    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<FreeBarGetDto | null>(null);

    const { present: presentMapDetail } = useSheet("mapDetail");
    const { present: updateStore } = useSheet("updateStoreMine");
    const { present: presentRatings } = useSheet("ratings");

    const [searchQuery, setSearchQuery] = useState("");
    const [isList, setIsList] = useState(true);

    // Filter drawer state
    const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

    // Filter states
    const [selectedUserType, setSelectedUserType] = useState<string>("Serbest Berber");
    const [selectedMainCategory, setSelectedMainCategory] = useState<string>("Hepsi");
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none');
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [selectedPricingType, setSelectedPricingType] = useState<string>('Hepsi');
    const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
    const [selectedRating, setSelectedRating] = useState<number>(0);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

    // Applied filters
    const [appliedFilters, setAppliedFilters] = useState({
        userType: "Serbest Berber",
        mainCategory: "Hepsi",
        services: [] as string[],
        priceSort: 'none' as 'none' | 'asc' | 'desc',
        minPrice: '',
        maxPrice: '',
        pricingType: 'Hepsi',
        availability: 'all' as 'all' | 'available' | 'unavailable',
        rating: 0,
        favoritesOnly: false,
    });

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
    const handleApplyFilters = useCallback(async () => {
        // Ana kategori enum'a çevir
        const getCategoryEnum = (category: string): BarberType | undefined => {
            switch (category) {
                case "Erkek Berber": return BarberType.MaleHairdresser;
                case "Bayan Kuaför": return BarberType.FemaleHairdresser;
                case "Güzellik Salonu": return BarberType.BeautySalon;
                default: return undefined;
            }
        };

        const filter: FilterRequestDto = {
            latitude: location?.latitude,
            longitude: location?.longitude,
            distance: 1.0,
            searchQuery: searchQuery || undefined,
            mainCategory: selectedMainCategory === "Hepsi" ? undefined : getCategoryEnum(selectedMainCategory),
            serviceIds: selectedServices.length > 0 ? selectedServices : undefined,
            priceSort: priceSort === 'none' ? undefined : priceSort,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            pricingType: selectedPricingType === 'Hepsi' ? undefined : selectedPricingType.toLowerCase(),
            isAvailable: availabilityFilter === 'all' ? undefined : availabilityFilter === 'available',
            minRating: selectedRating > 0 ? selectedRating : undefined,
            favoritesOnly: showFavoritesOnly || undefined,
        };

        await triggerFilterFreeBarbers(filter);
        
        setAppliedFilters({
            userType: selectedUserType,
            mainCategory: selectedMainCategory,
            services: selectedServices,
            priceSort,
            minPrice,
            maxPrice,
            pricingType: selectedPricingType,
            availability: availabilityFilter,
            rating: selectedRating,
            favoritesOnly: showFavoritesOnly,
        });
        setFilterDrawerVisible(false);
    }, [selectedUserType, selectedMainCategory, selectedServices, priceSort, minPrice, maxPrice, selectedPricingType, availabilityFilter, selectedRating, showFavoritesOnly, searchQuery, location, triggerFilterFreeBarbers]);

    const handleClearFilters = useCallback(() => {
        setSelectedUserType("Serbest Berber");
        setSelectedMainCategory("Hepsi");
        setSelectedServices([]);
        setPriceSort('none');
        setMinPrice('');
        setMaxPrice('');
        setSelectedPricingType('Hepsi');
        setAvailabilityFilter('all');
        setSelectedRating(0);
        setShowFavoritesOnly(false);
        setAppliedFilters({
            userType: "Serbest Berber",
            mainCategory: "Hepsi",
            services: [],
            priceSort: 'none',
            minPrice: '',
            maxPrice: '',
            pricingType: 'Hepsi',
            availability: 'all',
            rating: 0,
            favoritesOnly: false,
        });
        setFilterDrawerVisible(false);
    }, []);

    // API'den gelen filtrelenmiş veriyi kullan, yoksa normal veriyi göster
    const filteredFreeBarbers = useMemo(() => {
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
        
        // Eğer search query var veya filtre uygulandıysa ve API'den sonuç geldiyse onu kullan
        if ((searchQuery || hasActiveFilters) && filteredFreeBarbersData !== undefined) {
            return filteredFreeBarbersData;
        }
        // Değilse normal veriyi göster
        return displayFreeBarbers;
    }, [filteredFreeBarbersData, displayFreeBarbers, searchQuery, appliedFilters]);

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
            />
        ),
        [isList, expandedFreeBarbers, cardWidthFreeBarber, handlePressRatings]
    );

    // FlatList için tüm item'ları birleştir
    // Refresh sırasında verilerin iç içe binmemesi için loading state'ini kontrol ediyoruz
    const listData = useMemo(() => {
        const items: Array<{ id: string; type: 'stores-header' | 'store' | 'stores-empty' | 'stores-loading' | 'stores-content-horizontal' | 'freebarbers-header' | 'freebarber' | 'freebarbers-empty' | 'freebarbers-loading' | 'freebarbers-content-horizontal'; data?: any }> = [];

        // Stores section
        items.push({ id: 'stores-header', type: 'stores-header' });
        if (isStoresLoading) {
            items.push({ id: 'stores-loading', type: 'stores-loading' });
        } else {
            // Normal displayStores kullan (kendi dükkanları için filtreleme gerekmez)
            const storesToDisplay = displayStores;
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

        // FreeBarbers section - filtrelenmiş data kullan
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

        return items;
    }, [isStoresLoading, isFreeBarbersLoading, displayStores, filteredFreeBarbers, expandedStores, expandedFreeBarbers]);

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
        if (!hasStores) return null;
        return displayStores.map((store) => {
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
                        <Image source={{ uri: avatarUrl }} className="w-full h-full rounded-full" resizeMode="cover" />
                    ) : (
                        <Icon source={iconName} color="white" size={20} />
                    )}
                </View>
            </Marker>;
        });
    }, [displayStores, hasStores, handlePressUpdateStore]);

    // Search query değiştiğinde filtreleri uygula veya temizle
    useEffect(() => {
        const hasActiveFilters = appliedFilters.mainCategory !== "Hepsi" || 
                                  appliedFilters.services.length > 0 || 
                                  appliedFilters.priceSort !== 'none' ||
                                  appliedFilters.minPrice !== '' ||
                                  appliedFilters.maxPrice !== '' ||
                                  appliedFilters.pricingType !== 'Hepsi' ||
                                  appliedFilters.availability !== 'all' ||
                                  appliedFilters.rating > 0 ||
                                  appliedFilters.favoritesOnly;
        
        if (searchQuery || hasActiveFilters) {
            // Filtre varsa veya arama yapılıyorsa uygula
            handleApplyFilters();
        }
        // Search query boş ve filtre yoksa hiçbir şey yapma (normal data gösterilecek)
    }, [searchQuery]);

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
                    contentContainerStyle={{ paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                    // Performance optimizations
                    removeClippedSubviews={true} // Görünmeyenleri kaldır
                    maxToRenderPerBatch={10} // Batch başına max render
                    updateCellsBatchingPeriod={50} // Batch güncelleme periyodu
                    initialNumToRender={10} // İlk render sayısı
                    windowSize={5} // Viewport window size
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
                            return (
                                <View style={{ minHeight: 200, maxHeight: 400 }}>
                                    <EmptyState
                                        loading={isStoresLoading}
                                        hasLocation={hasLocation}
                                        locationStatus={locationStatus}
                                        fetchedOnce={true}
                                        hasData={hasStores}
                                        noResultText="Eklenmiş berber dükkanınız bulunmuyor."
                                    />
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
                showUserTypeFilter={false}
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
                showUserTypeFilter={true}
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
                    {selectedMapItem && <FreeBarberBookingContent barberId={(selectedMapItem as any).id} isBottomSheet={true} isBarberMode={true} />}
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