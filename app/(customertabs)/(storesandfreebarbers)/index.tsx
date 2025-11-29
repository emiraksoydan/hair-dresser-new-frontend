import { Text, View, Dimensions, FlatList } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useNearbyStores } from "../../hook/useNearByStore";
import { useNearbyFreeBarber } from "../../hook/useNearByFreeBarber";

import { SkeletonComponent } from "../../components/skeleton";
import SearchBar from "../../components/searchbar";
import { toggleExpand } from "../../utils/expand-toggle";
import { useSheet } from "../../context/bottomsheet";
import { useToggleList } from "../../utils/service-toggle";

import { BarberStoreGetDto, FreeBarGetDto } from "../../types";
import { StoreCardInner } from "../../components/storecard";
import FormatListButton from "../../components/formatlistbutton";
import FilterButton from "../../components/filterbutton";
import MotiViewExpand from "../../components/motiviewexpand";
import { LottieViewComponent } from "../../components/lottieview";
import { FilterBottomSheet } from "../../components/filterbottomsheet";
import { FreeBarberCardInner } from "../../components/freebarbercard";
import { EmptyState } from "../../components/emptystateresult";
import { useRouter } from "expo-router";

const Index = () => {
    const { stores, loading, locationStatus, hasLocation, fetchedOnce, } = useNearbyStores(true);
    const { freeBarbers, loading: freeLoading, locationStatus: freeStatus, hasLocation: freeHasLocation,
        fetchedOnce: freeFetchedOnce, } = useNearbyFreeBarber(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [expanded, setExpanded] = useState(true);
    const [expandedFreeBarber, setExpandedFreeBarber] = useState(false);
    const [isList, setIsList] = useState(true);
    const { present } = useSheet("addFilter");

    const [selectedType, setSelectedType] = useState<string>("Hepsi");
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");
    const { list: selectedServices, toggle: toggleService, has: hasService } =
        useToggleList<string>([]);
    const screenWidth = Dimensions.get("window").width;
    const cardWidthStore = useMemo(
        () => (expanded ? screenWidth * 0.92 : screenWidth * 0.94),
        [expanded, screenWidth]
    );
    const cardWidthFreeBarber = useMemo(
        () => (expandedFreeBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedFreeBarber, screenWidth]
    );
    const hasStores = (stores ?? []).length > 0;
    const hasFreeBarbers = (freeBarbers ?? []).length > 0;
    const router = useRouter();
    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        router.push({
            pathname: "/store/[storeId]",
            params: { storeId: store.id, },
        });
    }, [router]);

    const renderStoreItem = useCallback(
        ({ item }: { item: BarberStoreGetDto }) => (
            <StoreCardInner
                store={item}
                isList={isList}
                expanded={expanded}
                cardWidthStore={cardWidthStore}
                onPressUpdate={goStoreDetail}
            />
        ),
        [isList, expanded, cardWidthStore]
    );
    const renderFreeBarberItem = useCallback(
        ({ item }: { item: FreeBarGetDto }) => (
            <FreeBarberCardInner
                freeBarber={item}
                isList={isList}
                expanded={expandedFreeBarber}
                cardWidthFreeBarber={cardWidthFreeBarber}
            />
        ),
        [isList, expandedFreeBarber, cardWidthFreeBarber]
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
                                initialNumToRender={6}
                                maxToRenderPerBatch={6}
                                updateCellsBatchingPeriod={16}
                                windowSize={7}
                                removeClippedSubviews
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{
                                    gap: 12,
                                    paddingTop: hasStores ? 8 : 0,
                                }}
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

                        {/* --- SERBEST BERBERLER --- */}
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
                                initialNumToRender={6}
                                maxToRenderPerBatch={6}
                                updateCellsBatchingPeriod={16}
                                windowSize={7}
                                removeClippedSubviews
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{
                                    gap: 12,
                                    paddingTop: hasFreeBarbers ? 8 : 0,
                                    paddingBottom: 8,
                                }}
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
        </View>
    );
};

export default Index;
