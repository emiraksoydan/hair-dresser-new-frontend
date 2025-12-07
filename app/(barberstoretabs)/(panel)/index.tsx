import { Dimensions, FlatList, Image, StatusBar, Text, TouchableOpacity, View } from "react-native";
import SearchBar from "../../components/searchbar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FormatListButton from "../../components/formatlistbutton";
import FilterButton from "../../components/filterbutton";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useToggleList } from "../../utils/service-toggle";
import { useBottomSheetRegistry, useSheet } from "../../context/bottomsheet";
import MotiViewExpand from "../../components/motiviewexpand";
import { toggleExpand } from "../../utils/expand-toggle";
import { SkeletonComponent } from "../../components/skeleton";
import { BarberStoreMineDto, BarberType, FreeBarGetDto } from "../../types";
import { useGetMineStoresQuery } from "../../store/api";
import { FilterBottomSheet } from "../../components/filterbottomsheet";
import FormStoreUpdate from "../../components/formstoreupdate";
import { StoreMineCardComp } from "../../components/storeminecard";
import { EmptyState } from "../../components/emptystateresult";
import { FreeBarberCardInner } from "../../components/freebarbercard";
import { Icon, IconButton } from "react-native-paper";
import MapView, { Marker } from "react-native-maps";
import FreeBarberBookingContent from "../../components/freebarberbooking";
import { useNearbyStoresControl } from "../../hook/useNearByFreeBarberForStore";

const Index = () => {

    const { data: stores = [], isLoading: storeLoading } = useGetMineStoresQuery();

    const {
        freeBarbers,
        loading: freeLoading,
        locationStatus,
        hasLocation,
        retryPermission,
        manualFetch,
        fetchedOnce
    } = useNearbyStoresControl({
        enabled: true,
        stores: stores,
        hardRefreshMs: 15000
    });



    const [isMapMode, setIsMapMode] = useState(false);
    const [selectedMapItem, setSelectedMapItem] = useState<FreeBarGetDto | null>(null);
    const { present: presentMapDetail } = useSheet("mapDetail");

    const [searchQuery, setSearchQuery] = useState("");
    const [isList, setIsList] = useState(true);
    const { present } = useSheet("filter");

    const [selectedType, setSelectedType] = useState<string>("Hepsi");
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");
    const { list: selectedServices, toggle: toggleService, has: hasService } = useToggleList<string>([]);

    const [expandedStores, setExpandedStores] = useState(true);
    const [expandedFreeBarbers, setExpandedFreeBarbers] = useState(true);

    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: updateStore } = useSheet("updateStoreMine");
    const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);
    const [storeId, setStoreId] = useState<string>("");
    const screenWidth = Dimensions.get("window").width;


    const cardWidthStore = useMemo(
        () => (expandedStores ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedStores, screenWidth]
    );

    const cardWidthFreeBarber = useMemo(
        () => (expandedFreeBarbers ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedFreeBarbers, screenWidth]
    );

    const handlePressUpdateStore = useCallback(
        (store: BarberStoreMineDto) => {
            setStoreId(store.id);
            updateStore();
        },
        [updateStore]
    );
    const hasStores = !storeLoading && stores.length > 0;
    const hasFreeBarbers = !freeLoading && (freeBarbers?.length ?? 0) > 0;
    const renderStoreItem = useCallback(
        ({ item }: { item: BarberStoreMineDto }) => (
            <StoreMineCardComp
                store={item}
                isList={isList}
                expanded={expandedStores}
                cardWidthStore={cardWidthStore}
                onPressUpdate={handlePressUpdateStore}
            />
        ),
        [isList, expandedStores, cardWidthStore, handlePressUpdateStore]
    );
    const renderFreeBarberItem = useCallback(
        ({ item }: { item: FreeBarGetDto }) => (
            <FreeBarberCardInner freeBarber={item} isList={isList} expanded={expandedFreeBarbers} cardWidthFreeBarber={cardWidthFreeBarber} mode="barbershop" />
        ),
        [isList, expandedFreeBarbers, cardWidthFreeBarber]
    );
    const handleMarkerPress = useCallback((item: any) => {
        setSelectedMapItem(item);
        presentMapDetail();
    }, [presentMapDetail]);


    return (
        <View className="flex flex-1 pl-4 pr-2 bg-[#151618]">
            <View
                className={`${isMapMode && 'absolute top-0 left-0 right-0 z-10 px-4 pt-0 pb-2 bg-transparent'}`}
            >
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
                    <MapView
                        showsUserLocation={false}
                        style={{ flex: 1 }}
                        userInterfaceStyle="dark"

                    >
                        {hasFreeBarbers && freeBarbers.map(barber => {
                            const isType = barber.type == 0 ? "Erkek" : "Kadın";
                            return (
                                <Marker
                                    key={barber.id}
                                    coordinate={{ latitude: barber.latitude, longitude: barber.longitude }}
                                    title={barber.fullName + "-" + isType}
                                    tracksViewChanges={false}
                                    onPress={() => handleMarkerPress(barber)}
                                >
                                    <View
                                        className={`items-center justify-center border-white w-8 h-8 rounded-full`}
                                        style={{
                                            elevation: 4,
                                            borderWidth: barber?.imageList[0]?.imageUrl ? 0 : 1,
                                            backgroundColor: barber.type == 0 ? '#2563eb' : '#db2777'
                                        }}
                                    >
                                        {barber?.imageList[0]?.imageUrl ? (
                                            <Image
                                                source={{ uri: barber?.imageList[0]?.imageUrl }}
                                                className="w-full h-full rounded-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Icon
                                                source={barber.type == 0 ? "face-man" : barber.type == 1 ? "face-woman" : "store"}
                                                color="white"
                                                size={20}
                                            />
                                        )}
                                    </View>
                                </Marker>
                            )
                        })}
                        {hasStores && stores.map(store => {
                            const isType = store.type == 0 ? "Erkek Berber" : store.type == 1 ? "Kadın Kuaför" : "Güzellik Salonu";
                            return (
                                <Marker
                                    key={store.id}
                                    coordinate={{ latitude: store.latitude ?? 0, longitude: store.longitude ?? 0 }}
                                    title={store.storeName + "-" + isType}
                                    description={store.addressDescription}
                                    tracksViewChanges={false}
                                    onPress={() => handlePressUpdateStore(store)}
                                >
                                    <View
                                        className={`items-center justify-center w-8 h-8  border-white rounded-full`}
                                        style={{
                                            elevation: 4,
                                            backgroundColor: store.type == 0 ? '#2563eb' : '#db2777', borderWidth: store?.imageList[0]?.imageUrl ? 0 : 1
                                        }}
                                    >
                                        {store?.imageList[0]?.imageUrl ? (
                                            <Image
                                                source={{ uri: store?.imageList[0]?.imageUrl }}
                                                className="w-full h-full rounded-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Icon
                                                source={store.type == 0 ? "face-man" : store.type == 1 ? "face-woman" : "store"}
                                                color="white"
                                                size={20}
                                            />
                                        )}
                                    </View>
                                </Marker>
                            )
                        })}
                    </MapView>
                </View>
            ) : (
                <FlatList
                    data={[{ key: "content" }]}
                    keyExtractor={(i) => i.key}
                    renderItem={() => null}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    ListHeaderComponent={
                        <>
                            <View className="flex flex-row justify-between items-center mt-4">
                                <Text className="font-ibm-plex-sans-regular text-xl text-white">İşletmelerim</Text>
                                {hasStores && (
                                    <MotiViewExpand expanded={expandedStores} onPress={() => toggleExpand(expandedStores, setExpandedStores)} />
                                )}
                            </View>

                            {storeLoading ? (
                                <View className="flex-1 pt-4">
                                    {Array.from({ length: 2 }).map((_, i) => <SkeletonComponent key={i} />)}
                                </View>
                            ) :
                                <FlatList
                                    key="storesMineList"
                                    data={hasStores ? stores : []}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderStoreItem}
                                    horizontal={!expandedStores}
                                    nestedScrollEnabled
                                    showsHorizontalScrollIndicator={false}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ gap: 12, paddingTop: hasStores ? 8 : 0 }}
                                    ListEmptyComponent={() => (
                                        <EmptyState loading={storeLoading} hasLocation={hasLocation} locationStatus={locationStatus} fetchedOnce={fetchedOnce} hasData={hasStores} noResultText="Eklenmiş berber dükkanınız bulunmuyor." ></EmptyState>
                                    )}
                                />
                            }

                            <View className="flex flex-row justify-between items-center mt-4">
                                <Text className="font-ibm-plex-sans-regular text-xl text-white">Serbest Berberler</Text>
                                {hasFreeBarbers && (
                                    <MotiViewExpand
                                        expanded={expandedFreeBarbers}
                                        onPress={() => toggleExpand(expandedFreeBarbers, setExpandedFreeBarbers)}
                                    />
                                )}
                            </View>

                            {freeLoading ? (
                                <View className="flex-1 pt-4">
                                    {Array.from({ length: 2 }).map((_, i) => <SkeletonComponent key={i} />)}
                                </View>
                            ) :
                                <FlatList
                                    key="freeBarbersList"
                                    data={hasFreeBarbers ? freeBarbers : []}
                                    keyExtractor={(item: FreeBarGetDto) => item.id}
                                    renderItem={renderFreeBarberItem}
                                    horizontal={!expandedFreeBarbers}
                                    nestedScrollEnabled
                                    showsHorizontalScrollIndicator={false}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ gap: 12, paddingTop: hasFreeBarbers ? 8 : 0 }}
                                    ListEmptyComponent={() => (
                                        <EmptyState loading={freeLoading} hasLocation={hasLocation} locationStatus={locationStatus} fetchedOnce={fetchedOnce} hasData={hasFreeBarbers} noResultText="Yakınınızda serbest berber bulunamadı" ></EmptyState>
                                    )}
                                />}


                        </>
                    }
                />
            )}
            <TouchableOpacity
                onPress={() => setIsMapMode(!isMapMode)}
                className="absolute right-4 bottom-6 w-14 h-14 bg-[#38393b] rounded-full items-center justify-center z-20 shadow-lg border border-[#47494e]"
                style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4.65,
                    elevation: 8,
                }}
            >
                <IconButton
                    icon={isMapMode ? "format-list-bulleted" : "map"}
                    iconColor="#f05e23"
                    size={28}
                    style={{ margin: 0 }}
                />
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
                enableOverDrag={isMapMode ? true : false}
                enablePanDownToClose={isMapMode ? true : false}
            >
                <BottomSheetView className="h-full pt-2">
                    <FormStoreUpdate storeId={storeId} enabled={isUpdateSheetOpen} />
                </BottomSheetView>
            </BottomSheetModal>

            <BottomSheetModal
                ref={(inst) => setRef("mapDetail", inst)}
                snapPoints={["65%"]} // İçerik sığsın diye biraz büyüttük
                enableOverDrag={false}
                enablePanDownToClose={true}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })}
            >
                <BottomSheetView style={{ flex: 1, padding: 0, margin: 0 }}>
                    {selectedMapItem && (
                        <FreeBarberBookingContent
                            barberId={selectedMapItem.id}
                            isBottomSheet={true}
                            isBarberMode={true}
                        />

                    )}
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    );
};

export default Index;
