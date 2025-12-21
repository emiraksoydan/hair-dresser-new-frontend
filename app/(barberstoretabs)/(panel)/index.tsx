import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, FlatList, Image, Text, TouchableOpacity, View, ScrollView } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Icon, IconButton } from "react-native-paper";
import SearchBar from "../../components/common/searchbar";
import FormatListButton from "../../components/common/formatlistbutton";
import FilterButton from "../../components/common/filterbutton";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useToggleList } from "../../utils/common/service-toggle";
import { useBottomSheetRegistry, useSheet } from "../../context/bottomsheet";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { SkeletonComponent } from "../../components/common/skeleton";
import { BarberStoreMineDto, FreeBarGetDto } from "../../types";
import { useGetMineStoresQuery } from "../../store/api";
import { FilterBottomSheet } from "../../components/common/filterbottomsheet";
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
        manualFetch
    } = useNearbyStoresControl({
        enabled: true,
        stores,
        hardRefreshMs: 15000,
        radiusKm: 1,
    });

    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<FreeBarGetDto | null>(null);

    const { present: presentFilter } = useSheet("filter");
    const { present: presentMapDetail } = useSheet("mapDetail");
    const { present: updateStore } = useSheet("updateStoreMine");
    const { present: presentRatings } = useSheet("ratings");

    const [searchQuery, setSearchQuery] = useState("");
    const [isList, setIsList] = useState(true);

    const [selectedType, setSelectedType] = useState<string>("Hepsi");
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");
    const { list: selectedServices, toggle: toggleService, has: hasService } = useToggleList<string>([]);

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

    const hasStores = !storeLoading && stores.length > 0;
    const hasFreeBarbers = (freeBarbers?.length ?? 0) > 0;

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
    const listData = useMemo(() => {
        const items: Array<{ id: string; type: 'stores-header' | 'store' | 'stores-empty' | 'stores-loading' | 'stores-content-horizontal' | 'freebarbers-header' | 'freebarber' | 'freebarbers-empty' | 'freebarbers-loading' | 'freebarbers-content-horizontal'; data?: any }> = [];

        // Stores section
        items.push({ id: 'stores-header', type: 'stores-header' });
        if (storeLoading) {
            items.push({ id: 'stores-loading', type: 'stores-loading' });
        } else if (hasStores) {
            if (expandedStores) {
                // Vertical modda: her store'u ayrı item olarak ekle
                stores.forEach((store) => {
                    items.push({ id: `store-${store.id}`, type: 'store', data: store });
                });
            } else {
                // Horizontal modda: tek bir content item
                items.push({ id: 'stores-content-horizontal', type: 'stores-content-horizontal', data: stores });
            }
        } else {
            items.push({ id: 'stores-empty', type: 'stores-empty' });
        }

        // FreeBarbers section
        items.push({ id: 'freebarbers-header', type: 'freebarbers-header' });
        if (isFreeLoading && !hasFreeBarbers) {
            items.push({ id: 'freebarbers-loading', type: 'freebarbers-loading' });
        } else if (hasFreeBarbers) {
            if (expandedFreeBarbers) {
                // Vertical modda: her freebarber'ı ayrı item olarak ekle
                freeBarbers.forEach((fb) => {
                    items.push({ id: `freebarber-${fb.id}`, type: 'freebarber', data: fb });
                });
            } else {
                // Horizontal modda: tek bir content item
                items.push({ id: 'freebarbers-content-horizontal', type: 'freebarbers-content-horizontal', data: freeBarbers });
            }
        } else {
            items.push({ id: 'freebarbers-empty', type: 'freebarbers-empty' });
        }

        return items;
    }, [storeLoading, isFreeLoading, hasStores, hasFreeBarbers, stores, freeBarbers, expandedStores, expandedFreeBarbers]);

    const mapInitialRegion = useMemo(() => {
        const storeCandidate = stores
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
    }, [stores]);
    const freeBarberMarkers = useMemo(() => {
        return (freeBarbers ?? []).map((barber) => (
            <BarberMarker
                key={(barber as any).id}
                barber={barber}
                onPress={handleMarkerPress}
            />
        ));
    }, [freeBarbers, handleMarkerPress]); // Sadece liste değişirse render et

    const storeMarkers = useMemo(() => {
        if (!hasStores) return null;
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
    }, [stores, hasStores, handlePressUpdateStore]);

    return (
        <View className="flex flex-1 pl-4 pr-2 bg-[#151618]">
            <View className={isMapMode ? "absolute top-0 left-0 right-0 z-10 px-4 pt-0 pb-2 bg-transparent" : ""}>
                <View className="flex flex-row items-center gap-2 mt-2">
                    <View className="flex flex-1">
                        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    </View>
                    <FormatListButton isList={isList} setIsList={setIsList} />
                    <FilterButton onPress={presentFilter} />
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
                                        loading={storeLoading}
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
                            return (
                                <View style={{ minHeight: 200, maxHeight: 400 }}>
                                    <EmptyState
                                        loading={isFreeLoading}
                                        hasLocation={hasLocation}
                                        locationStatus={locationStatus}
                                        fetchedOnce={true}
                                        hasData={hasFreeBarbers}
                                        noResultText="Yakınınızda serbest berber bulunamadı"
                                    />
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

            <FilterBottomSheet
                sheetKey="filter"
                selectedType={selectedType}
                onChangeType={setSelectedType}
                selectedRating={selectedRating}
                onChangeRating={setSelectedRating}
                selectedServices={selectedServices}
                hasService={hasService}
                toggleService={toggleService}
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