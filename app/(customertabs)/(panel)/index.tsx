import { Text, View, Dimensions, FlatList, TouchableOpacity, Image } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useNearbyStores } from "../../hook/useNearByStore";
import { useNearbyFreeBarber } from "../../hook/useNearByFreeBarber";
import { SkeletonComponent } from "../../components/common/skeleton";
import SearchBar from "../../components/common/searchbar";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { useBottomSheetRegistry, useSheet } from "../../context/bottomsheet";
import { useToggleList } from "../../utils/common/service-toggle";
import { BarberStoreGetDto, FreeBarGetDto } from "../../types";
import { StoreCardInner } from "../../components/store/storecard";
import FormatListButton from "../../components/common/formatlistbutton";
import FilterButton from "../../components/common/filterbutton";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { FilterBottomSheet } from "../../components/common/filterbottomsheet";
import { FreeBarberCardInner } from "../../components/freebarber/freebarbercard";
import { EmptyState } from "../../components/common/emptystateresult";
import { useRouter } from "expo-router";
import { Icon, IconButton } from "react-native-paper";
import MapView, { Marker } from "react-native-maps"; // Harita importları
import { safeCoord } from "../../utils/location/geo"; // Geo yardımcı fonksiyon
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import StoreBookingContent from "../../components/store/storebooking";
import FreeBarberBookingContent from "../../components/freebarber/freebarberbooking";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";

const Index = () => {
    const { stores, loading, locationStatus, hasLocation, fetchedOnce } = useNearbyStores(true);
    const {
        freeBarbers,
        loading: freeLoading,
        locationStatus: freeStatus,
        hasLocation: freeHasLocation,
        fetchedOnce: freeFetchedOnce
    } = useNearbyFreeBarber(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [expanded, setExpanded] = useState(true);
    const [expandedFreeBarber, setExpandedFreeBarber] = useState(false);
    const [isList, setIsList] = useState(true);
    const { present } = useSheet("addFilter");
    const { present: presentMapDetail } = useSheet("mapDetail"); // ✅ Harita Detay Sheet'i
    const { setRef, makeBackdrop } = useBottomSheetRegistry();

    const [selectedType, setSelectedType] = useState<string>("Hepsi");
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");
    const { list: selectedServices, toggle: toggleService, has: hasService } = useToggleList<string>([]);

    const screenWidth = Dimensions.get("window").width;
    const cardWidthStore = useMemo(() => (expanded ? screenWidth * 0.92 : screenWidth * 0.94), [expanded, screenWidth]);
    const cardWidthFreeBarber = useMemo(() => (expandedFreeBarber ? screenWidth * 0.92 : screenWidth * 0.94), [expandedFreeBarber, screenWidth]);

    const hasStores = (stores ?? []).length > 0;
    const hasFreeBarbers = (freeBarbers ?? []).length > 0;
    const router = useRouter();

    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<{ type: 'store' | 'freeBarber', data: any } | null>(null);
    const { present: presentRatings } = useSheet("ratings");
    const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{ targetId: string; targetName: string } | null>(null);

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        router.push({
            pathname: "/store/[storeId]",
            params: { storeId: store.id, mode: "customer" },
        });
    }, [router]);

    const goFreeBarberDetail = useCallback((freeBarber: FreeBarGetDto) => {
        router.push({
            pathname: "/freebarber/[freeBarberId]",
            params: { freeBarber: freeBarber.id },
        });
    }, [router]);

    const handleMapItemPress = useCallback((item: any, type: 'store' | 'freeBarber') => {
        setSelectedMapItem({ type, data: item });
        presentMapDetail(); // Sheet'i aç
    }, [presentMapDetail]);

    const handlePressRatings = useCallback((targetId: string, targetName: string) => {
        setSelectedRatingsTarget({ targetId, targetName });
        presentRatings();
    }, [presentRatings]);

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
                    onPress={() => handleMapItemPress(store, 'store')}
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
    }, [stores, hasStores, goStoreDetail]);

    const freeBarberMarkers = useMemo(() => {
        if (!hasFreeBarbers) return null;
        return freeBarbers.map((barber) => {
            const c = safeCoord((barber as any).latitude, (barber as any).longitude);
            if (!c) return null;

            const avatarUrl = (barber as any)?.imageList?.[0]?.imageUrl;
            const bg = (barber as any).type == 0 ? "#db2777" : "#16a34a";

            const iconName = (barber as any).type == 0 ? "face-man-profile" : "face-woman-profile";

            return (
                <Marker
                    key={`fb-${(barber as any).id}`}
                    coordinate={{ latitude: c.lat, longitude: c.lon }}
                    title={(barber as any).fullName}
                    tracksViewChanges={false}
                    onPress={() => handleMapItemPress(barber, 'freeBarber')}
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
                            <Icon source={iconName} color="white" size={18} />
                        )}
                    </View>
                </Marker >
            );
        });
    }, [freeBarbers, hasFreeBarbers, goFreeBarberDetail]);

    const renderStoreItem = useCallback(({ item }: { item: BarberStoreGetDto }) => (
        <StoreCardInner
            store={item}
            isList={isList}
            expanded={expanded}
            cardWidthStore={cardWidthStore}
            onPressUpdate={goStoreDetail}
            onPressRatings={handlePressRatings}
        />
    ), [isList, expanded, cardWidthStore, goStoreDetail, handlePressRatings]);

    const renderFreeBarberItem = useCallback(({ item }: { item: FreeBarGetDto }) => (
        <FreeBarberCardInner
            freeBarber={item}
            isList={isList}
            expanded={expandedFreeBarber}
            cardWidthFreeBarber={cardWidthFreeBarber}
            onPressUpdate={goFreeBarberDetail}
            onPressRatings={handlePressRatings}
        />
    ), [isList, expandedFreeBarber, cardWidthFreeBarber, goFreeBarberDetail, handlePressRatings]);

    return (
        <View className="flex flex-1 pl-4 pr-2 bg-[#151618]">
            <View className={isMapMode ? "absolute top-0 left-0 right-0 z-10 px-4 pt-0 pb-2 bg-transparent " : ""}>
                <View className="flex flex-row items-center gap-2 mt-2">
                    <View className="flex flex-1">
                        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    </View>
                    <FormatListButton isList={isList} setIsList={setIsList} />
                    <FilterButton onPress={present} />
                </View>
            </View>

            {isMapMode ? (
                <View className="absolute inset-0 z-0">
                    <MapView style={{ flex: 1 }} userInterfaceStyle="dark" showsUserLocation={true}>
                        {storeMarkers}
                        {freeBarberMarkers}
                    </MapView>
                </View>
            ) : (

                <FlatList
                    data={[]}
                    keyExtractor={() => "dummy"}
                    renderItem={() => null}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    ListHeaderComponent={
                        <>

                            <View className="flex flex-row justify-between items-center mt-4">
                                <Text className="font-ibm-plex-sans-regular text-xl text-white">İşletmeler</Text>
                                {hasStores && (
                                    <MotiViewExpand
                                        expanded={expanded}
                                        onPress={() => toggleExpand(expanded, setExpanded)}
                                    />
                                )}
                            </View>

                            {loading ? (
                                <View className="flex-1 pt-4">
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
                                    contentContainerStyle={{ gap: 12, paddingTop: hasStores ? 8 : 0 }}
                                    ListEmptyComponent={
                                        <EmptyState
                                            loading={loading}
                                            locationStatus={locationStatus}
                                            hasLocation={hasLocation}
                                            fetchedOnce={fetchedOnce}
                                            hasData={hasStores}
                                            noResultText="Yakınında şu an listelenecek işletme bulunamadı"
                                        />
                                    }
                                />
                            )}

                            <View className="flex flex-row justify-between items-center mt-4">
                                <Text className="font-ibm-plex-sans-regular text-xl text-white">Serbest Berberler</Text>
                                {hasFreeBarbers && (
                                    <MotiViewExpand
                                        expanded={expandedFreeBarber}
                                        onPress={() => toggleExpand(expandedFreeBarber, setExpandedFreeBarber)}
                                    />
                                )}
                            </View>

                            {freeLoading ? (
                                <View className="flex-1 pt-4">
                                    {Array.from({ length: 2 }).map((_, i) => (
                                        <SkeletonComponent key={i} />
                                    ))}
                                </View>
                            ) : (
                                <FlatList
                                    key="freeBarbersList"
                                    data={freeBarbers}
                                    keyExtractor={(item, idx) => item?.id ?? `fb-${idx}`}
                                    renderItem={renderFreeBarberItem}
                                    horizontal={!expandedFreeBarber}
                                    nestedScrollEnabled
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ gap: 12, paddingTop: hasFreeBarbers ? 8 : 0, paddingBottom: 8 }}
                                    ListEmptyComponent={
                                        <EmptyState
                                            loading={freeLoading}
                                            locationStatus={freeStatus}
                                            hasLocation={freeHasLocation}
                                            fetchedOnce={freeFetchedOnce}
                                            hasData={hasFreeBarbers}
                                            noResultText="Yakınında şu an listelenecek serbest berber bulunamadı"
                                        />
                                    }
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
                sheetKey="addFilter"
                selectedType={selectedType}
                onChangeType={setSelectedType}
                selectedRating={selectedRating}
                onChangeRating={setSelectedRating}
                selectedServices={selectedServices}
                hasService={hasService}
                toggleService={toggleService}
            />
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
    );
};

export default Index;