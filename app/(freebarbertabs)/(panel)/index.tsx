import { Dimensions, FlatList, Text, View } from 'react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { useBottomSheetRegistry, useSheet } from '../../context/bottomsheet';
import { useToggleList } from '../../utils/service-toggle';
import SearchBar from '../../components/searchbar';
import FormatListButton from '../../components/formatlistbutton';
import FilterButton from '../../components/filterbutton';
import { SkeletonComponent } from '../../components/skeleton';
import { LottieViewComponent } from '../../components/lottieview';
import MotiViewExpand from '../../components/motiviewexpand';
import { toggleExpand } from '../../utils/expand-toggle';
import { FilterBottomSheet } from '../../components/filterbottomsheet';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

const Index = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isList, setIsList] = useState(true);
    const { present } = useSheet('freeBarberFilter');
    const [selectedType, setSelectedType] = useState<string>('Hepsi');
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");
    const [expandedMineStore, setExpandedMineStore] = useState(true);
    const [expandedStoreBarber, setExpandedStoreBarber] = useState(true);
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: freeBarberPanel } = useSheet('freeBarberMinePanel');
    const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);

    const { list: selectedServices, toggle: toggleService, clear: clearServices, has: hasService, } = useToggleList<string>([]);
    const [freeBarberId, setFreeBarberId] = useState<string>("");

    const screenWidth = Dimensions.get('window').width;

    const cardWidthStores = useMemo(
        () => (expandedMineStore ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedMineStore, screenWidth]
    );
    const cardWidthFreeBarber = useMemo(
        () => (expandedStoreBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [setExpandedStoreBarber, screenWidth]
    );

    // const hasMineStores = !loading && stores.length > 0;
    // const hasStoreBarbers = !loading && stores.length > 0;


    // const handlePressUpdatePanel = useCallback(
    //     (store: FreeBarberPanelDto) => {
    //         setFreeBarberId(store.id)
    //         updateStore();
    //     },
    //     [updateStore]
    // );


    return (
        <View className='flex flex-1 pl-4 pr-2 bg-[#151618]'>
            <View className='flex flex-row items-center gap-2 mt-4'>
                <View className=' flex flex-1'>
                    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery}></SearchBar>
                </View>
                <FormatListButton isList={isList} setIsList={setIsList}></FormatListButton>
                <FilterButton onPress={present}></FilterButton>
            </View>
            {/* <FlatList
                data={[]}
                keyExtractor={() => 'dummy'}
                renderItem={() => null}
                contentContainerStyle={{ paddingBottom: 16 }}
                ListHeaderComponent={
                    <>
                        <View className="flex flex-row justify-between items-center mt-4">
                            <Text className="font-ibm-plex-sans-regular text-xl text-white">
                                Panelim
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
                                {Array.from({ length: 1 }).map((_, i) => (
                                    <SkeletonComponent key={i} />
                                ))}
                            </View>
                        ) : !hasStores ? (
                            <LottieViewComponent message='Henüz eklediğiniz panel bulunmuyor.' ></LottieViewComponent>
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
                                Berber Dükkanları
                            </Text>
                            {stores && stores.length !== 0 && (
                                <MotiViewExpand
                                    expanded={expandedStoreBarber}
                                    onPress={() => toggleExpand(expandedStoreBarber, setExpandedStoreBarber)}
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
                            key="barberStoreList"
                            data={hasFreeBarbers ? stores : []}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItemFreeBarber}
                            horizontal={!expandedStoreBarber}
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
            /> */}
            <FilterBottomSheet
                sheetKey="freeBarberFilter"
                selectedType={selectedType}
                onChangeType={setSelectedType}
                selectedRating={selectedRating}
                onChangeRating={setSelectedRating}
                selectedServices={selectedServices}
                hasService={hasService}
                toggleService={toggleService}
            />
            {/* <BottomSheetModal
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: 'close' })}
                handleIndicatorStyle={{ backgroundColor: '#47494e' }}
                backgroundStyle={{ backgroundColor: '#151618' }}
                ref={(inst) => setRef('freeBarberMinePanel', inst)}
                onChange={(index) => {
                    setIsUpdateSheetOpen(index >= 0);
                }}
                snapPoints={['100%']} enableOverDrag={false} enablePanDownToClose={false}>
                <BottomSheetView className='h-full pt-2'>
                    <FormStoreUpdate storeId={storeId} enabled={isUpdateSheetOpen} />

                </BottomSheetView>
            </BottomSheetModal> */}
        </View>
    )
}


export default Index

