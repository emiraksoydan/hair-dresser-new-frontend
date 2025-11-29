import { Dimensions, FlatList, Text, View } from "react-native";
import SearchBar from "../../components/searchbar";
import { useCallback, useMemo, useState } from "react";
import FormatListButton from "../../components/formatlistbutton";
import FilterButton from "../../components/filterbutton";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useToggleList } from "../../utils/service-toggle";
import { useBottomSheetRegistry, useSheet } from "../../context/bottomsheet";
import MotiViewExpand from "../../components/motiviewexpand";
import { toggleExpand } from "../../utils/expand-toggle";
import { SkeletonComponent } from "../../components/skeleton";
import { BarberStoreMineDto, FreeBarGetDto } from "../../types";
import { useGetMineStoresQuery } from "../../store/api";
import { FilterBottomSheet } from "../../components/filterbottomsheet";
import FormStoreUpdate from "../../components/formstoreupdate";
import { StoreMineCardComp } from "../../components/storeminecard";
import { useNearbyFreeBarber } from "../../hook/useNearByFreeBarber";
import { EmptyState } from "../../components/emptystateresult";
import { FreeBarberCardInner } from "../../components/freebarbercard";

const Index = () => {

    const {
        freeBarbers,
        loading: freeLoading,
        locationStatus: freeLocationStatus,
        hasLocation: freeHasLocation,
        fetchedOnce: freeFetchedOnce,
        locationMessage: freeLocationMessage,
        retryPermission: freeRetryPermission,
    } = useNearbyFreeBarber(true);
    const { data: stores = [], isLoading: storeLoading, refetch } = useGetMineStoresQuery(undefined, { skip: !freeHasLocation });


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
            <FreeBarberCardInner freeBarber={item} isList={isList} expanded={expandedFreeBarbers} cardWidthFreeBarber={cardWidthFreeBarber} />
        ),
        [isList, expandedFreeBarbers, cardWidthFreeBarber]
    );

    return (
        <View className="flex flex-1 pl-4 pr-2 bg-[#151618]">
            <View className="flex flex-row items-center gap-2 mt-4">
                <View className="flex flex-1">
                    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                </View>
                <FormatListButton isList={isList} setIsList={setIsList} />
                <FilterButton onPress={present} />
            </View>

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

                        {storeLoading && (
                            <View className="flex-1 pt-4">
                                {Array.from({ length: 2 }).map((_, i) => <SkeletonComponent key={i} />)}
                            </View>
                        )}
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
                                <EmptyState loading={storeLoading} hasLocation={freeHasLocation} locationStatus={freeLocationStatus} fetchedOnce={true} hasData={hasStores} noResultText="Eklenmiş berber dükkanınız bulunmuyor." ></EmptyState>
                            )}
                        />
                        <View className="flex flex-row justify-between items-center mt-4">
                            <Text className="font-ibm-plex-sans-regular text-xl text-white">Serbest Berberler</Text>
                            {hasFreeBarbers && (
                                <MotiViewExpand
                                    expanded={expandedFreeBarbers}
                                    onPress={() => toggleExpand(expandedFreeBarbers, setExpandedFreeBarbers)}
                                />
                            )}
                        </View>

                        {freeLoading && (
                            <View className="flex-1 pt-4">
                                {Array.from({ length: 2 }).map((_, i) => <SkeletonComponent key={i} />)}
                            </View>
                        )}

                        <FlatList
                            key="freeBarbersList"
                            data={hasFreeBarbers ? freeBarbers : []}
                            keyExtractor={(item: FreeBarGetDto) => item.id}
                            renderItem={renderFreeBarberItem}
                            horizontal={!expandedFreeBarbers}
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12, paddingTop: hasFreeBarbers ? 8 : 0, paddingBottom: 8 }}
                            ListEmptyComponent={() => (
                                <EmptyState loading={freeLoading} hasLocation={freeHasLocation} locationStatus={freeLocationStatus} fetchedOnce={freeFetchedOnce} hasData={hasFreeBarbers} noResultText="Yakınınızda serbest berber bulunamadı" ></EmptyState>
                            )}
                        />
                    </>
                }
            />
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
                snapPoints={["100%"]}
                enableOverDrag={false}
                enablePanDownToClose={false}
            >
                <BottomSheetView className="h-full pt-2">
                    <FormStoreUpdate storeId={storeId} enabled={isUpdateSheetOpen} />
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    );
};

export default Index;
