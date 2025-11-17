import { Dimensions, FlatList, ScrollView, Text, View } from 'react-native'
import SearchBar from '../../components/searchbar'
import { useCallback, useMemo, useState } from 'react';
import FormatListButton from '../../components/formatlistbutton';
import FilterButton from '../../components/filterbutton';
import {
    BottomSheetModal, BottomSheetView, BottomSheetBackdrop
} from '@gorhom/bottom-sheet';
import { Chip, Divider, Icon } from 'react-native-paper';
import { catData, ratings } from '../../constants';
import { useToggleList } from '../../utils/service-toggle';
import { LegendList } from "@legendapp/list";
import { useBottomSheetRegistry, useSheet } from '../../context/bottomsheet';
import MotiViewExpand from '../../components/motiviewexpand';
import { toggleExpand } from '../../utils/expand-toggle';
import { SkeletonComponent } from '../../components/skeleton';
import { LottieViewComponent } from '../../components/lottieview';
import { StoreCardInner } from '../../components/storecard';
import { BarberStoreGetDto } from '../../types';
import { useGetMineStoresQuery } from '../../store/api';
import { useFocusEffect } from 'expo-router';
import { FilterBottomSheet } from '../../components/filterbottomsheet';

const Index = () => {
    const { data: stores = [], isLoading, refetch } = useGetMineStoresQuery();

    const [searchQuery, setSearchQuery] = useState('');
    const [isList, setIsList] = useState(true);
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present } = useSheet('filter');
    const [selectedType, setSelectedType] = useState<string>('Hepsi');
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");
    const [expanded, setExpanded] = useState(true);
    const [expandedFreeBarber, setExpandedFreeBarber] = useState(true);
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const {
        list: selectedServices,
        toggle: toggleService,
        clear: clearServices,
        has: hasService,
    } = useToggleList<string>([]);


    const screenWidth = Dimensions.get('window').width;
    const cardWidthStore = useMemo(
        () => (expanded ? screenWidth * 0.92 : screenWidth * 0.94),
        [expanded, screenWidth]
    );
    const cardWidthFreeBarber = useMemo(
        () => (expandedFreeBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedFreeBarber, screenWidth]
    );

    const hasStores = !isLoading && stores.length > 0;
    const hasFreeBarbers = !isLoading && stores.length > 0; // şimdilik aynı diziyi kullanıyorsun

    const renderItem = useCallback(
        ({ item }: { item: BarberStoreGetDto }) => (
            <StoreCardInner
                store={item}
                isList={isList}
                expanded={expanded}
                cardWidthStore={cardWidthStore}
            />
        ),
        [isList, expanded, cardWidthStore]
    );

    const renderItemFreeBarber = useCallback(
        ({ item }: { item: BarberStoreGetDto }) => (
            <StoreCardInner
                store={item}
                isList={isList}
                expanded={expandedFreeBarber}
                cardWidthStore={cardWidthFreeBarber}
            />
        ),
        [isList, expandedFreeBarber, cardWidthFreeBarber]
    );

    return (
        <View className='flex flex-1 pl-4 pr-2 bg-[#151618]'>
            <View className='flex flex-row items-center gap-2 mt-4'>
                <View className=' flex flex-1'>
                    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery}></SearchBar>
                </View>
                <FormatListButton isList={isList} setIsList={setIsList}></FormatListButton>
                <FilterButton onPress={present}></FilterButton>
            </View>
            <FlatList
                data={[]}
                keyExtractor={() => 'dummy'}
                renderItem={() => null}
                contentContainerStyle={{ paddingBottom: 16 }}
                ListHeaderComponent={
                    <>
                        <View className="flex flex-row justify-between items-center mt-4">
                            <Text className="font-ibm-plex-sans-regular text-xl text-white">
                                İşletmelerim
                            </Text>
                            {stores && stores.length !== 0 && (

                                <MotiViewExpand
                                    expanded={expanded}
                                    onPress={() => toggleExpand(expanded, setExpanded)}
                                />
                            )}
                        </View>
                        {isLoading && (
                            <View className="flex-1 pt-4">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <SkeletonComponent key={i} />
                                ))}
                            </View>
                        )}
                        <FlatList
                            key="storesMineList"
                            data={hasStores ? stores : []}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
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
                                !isLoading ? (
                                    <LottieViewComponent message='Henüz eklediğiniz berber dükkanı bulunmuyor.' ></LottieViewComponent>
                                ) : null
                            }
                        />
                        <View className="flex flex-row justify-between items-center mt-4">
                            <Text className="font-ibm-plex-sans-regular text-xl text-white">
                                Serbet Berberler
                            </Text>
                            {stores && stores.length !== 0 && (
                                <MotiViewExpand
                                    expanded={expandedFreeBarber}
                                    onPress={() => toggleExpand(expandedFreeBarber, setExpandedFreeBarber)}
                                />
                            )}
                        </View>
                        {isLoading && (
                            <View className="flex-1 pt-4">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <SkeletonComponent key={i} />
                                ))}
                            </View>
                        )}
                        <FlatList
                            key="freeBarbersList"
                            data={hasFreeBarbers ? stores : []}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItemFreeBarber}
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
                                !isLoading ? (
                                    <LottieViewComponent message='Yakınında şu an listelenecek serbest berber bulunamadı' ></LottieViewComponent>
                                ) : null
                            }
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

        </View>


    )
}

export default Index
