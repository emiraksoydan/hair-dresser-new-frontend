import { Dimensions, FlatList, ScrollView, Text, View } from 'react-native'
import SearchBar from '../../components/searchbar'
import { useCallback, useMemo, useState } from 'react';
import FormatListButton from '../../components/formatlistbutton';
import FilterButton from '../../components/filterbutton';
import {
    BottomSheetModal, BottomSheetView
} from '@gorhom/bottom-sheet';

import { useToggleList } from '../../utils/service-toggle';
import { useBottomSheetRegistry, useSheet } from '../../context/bottomsheet';
import MotiViewExpand from '../../components/motiviewexpand';
import { toggleExpand } from '../../utils/expand-toggle';
import { SkeletonComponent } from '../../components/skeleton';
import { LottieViewComponent } from '../../components/lottieview';
import { BarberStoreMineDto } from '../../types';
import { useGetMineStoresQuery } from '../../store/api';
import { useFocusEffect } from 'expo-router';
import { FilterBottomSheet } from '../../components/filterbottomsheet';
import FormStoreUpdate from '../../components/formstoreupdate';
import { StoreMineCardComp } from '../../components/storeminecard';
import { getCurrentLocationSafe, useCurrentLocationSafe } from '../../utils/location-helper';

const Index = () => {
    const { status: locationStatus, coords, message: locationMessage, retry } = useCurrentLocationSafe(true);

    const { data: stores = [], isLoading, refetch } = useGetMineStoresQuery(undefined, { skip: locationStatus == 'error' });

    const [searchQuery, setSearchQuery] = useState('');
    const [isList, setIsList] = useState(true);
    const { present } = useSheet('filter');
    const [selectedType, setSelectedType] = useState<string>('Hepsi');
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");
    const [expanded, setExpanded] = useState(true);
    const [expandedFreeBarber, setExpandedFreeBarber] = useState(true);
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: updateStore } = useSheet('updateStoreMine');
    const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);

    const {
        list: selectedServices,
        toggle: toggleService,
        clear: clearServices,
        has: hasService,
    } = useToggleList<string>([]);

    const [storeId, setStoreId] = useState<string>("");
    const screenWidth = Dimensions.get('window').width;
    const cardWidthStore = useMemo(
        () => (expanded ? screenWidth * 0.92 : screenWidth * 0.94),
        [expanded, screenWidth]
    );
    const cardWidthFreeBarber = useMemo(
        () => (expandedFreeBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedFreeBarber, screenWidth]
    );

    const handlePressUpdateStore = useCallback(
        (store: BarberStoreMineDto) => {
            setStoreId(store.id)
            updateStore();
        },
        [updateStore]
    );

    const hasStores = !isLoading && stores.length > 0;
    const hasFreeBarbers = !isLoading && stores.length > 0;

    const renderItem = useCallback(
        ({ item }: { item: BarberStoreMineDto }) => (
            <StoreMineCardComp
                store={item}
                isList={isList}
                expanded={expanded}
                cardWidthStore={cardWidthStore}
                onPressUpdate={handlePressUpdateStore}
            />
        ),
        [isList, expanded, cardWidthStore, handlePressUpdateStore]
    );

    const renderItemFreeBarber = useCallback(
        ({ item }: { item: BarberStoreMineDto }) => (
            <StoreMineCardComp
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
                            {hasStores && (

                                <MotiViewExpand
                                    expanded={expanded}
                                    onPress={() => toggleExpand(expanded, setExpanded)}
                                />
                            )}
                        </View>
                        {isLoading ? (
                            <View className="flex-1 pt-4">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <SkeletonComponent key={i} />
                                ))}
                            </View>
                        ) : !hasStores ? (
                            <LottieViewComponent message='Henüz eklediğiniz berber dükkanı bulunmuyor.' ></LottieViewComponent>
                        ) : locationStatus === 'error' ? (<LottieViewComponent animationSource={require('../../../assets/animations/Location.json')} message={locationMessage} ></LottieViewComponent>) : undefined}

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
                        {isLoading ? (
                            <View className="flex-1 pt-4">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <SkeletonComponent key={i} />
                                ))}
                            </View>
                        ) : !hasFreeBarbers ? (
                            <LottieViewComponent message='Yakınında şu an listelenecek serbest berber bulunamadı.' ></LottieViewComponent>
                        ) : locationStatus === 'error' ? (<LottieViewComponent animationSource={require('../../../assets/animations/Location.json')} message={locationMessage} ></LottieViewComponent>) : undefined}
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
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: 'close' })}
                handleIndicatorStyle={{ backgroundColor: '#47494e' }}
                backgroundStyle={{ backgroundColor: '#151618' }}
                ref={(inst) => setRef('updateStoreMine', inst)}
                onChange={(index) => {
                    setIsUpdateSheetOpen(index >= 0);
                }}
                snapPoints={['100%']} enableOverDrag={false} enablePanDownToClose={false}>
                <BottomSheetView className='h-full pt-2'>
                    <FormStoreUpdate storeId={storeId} enabled={isUpdateSheetOpen} />

                </BottomSheetView>
            </BottomSheetModal>
        </View>
    )
}

export default Index
