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
import { FormFreeBarberOperation } from '../../components/formfreebarberoper';
import { useCurrentLocationSafe } from '../../utils/location-helper';
import { useGetFreeBarberMinePanelQuery } from '../../store/api';
import { resolveApiErrorMessage } from '../../utils/error';
import { FreeBarberMineCardComp } from '../../components/freebarberminecard';
import { BarberStoreGetDto, FreeBarberMinePanelDto } from '../../types';
import { Button } from 'react-native-paper';
import { StoreCardInner } from '../../components/storecard';
import { useNearbyStores } from '../../hook/useNearByStore';

const Index = () => {

    const { status: locationStatus, message: locationMessage, retry } = useCurrentLocationSafe(true);

    const { data: freeBarber, isLoading, refetch, isError, error } = useGetFreeBarberMinePanelQuery(undefined, { skip: locationStatus == 'error' });
    const { stores, loading, error: storeError, retryPermission } = useNearbyStores(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [isList, setIsList] = useState(true);
    const { present } = useSheet('freeBarberFilter');
    const [selectedType, setSelectedType] = useState<string>('Hepsi');
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");
    const [expandedMineStore, setExpandedMineStore] = useState(true);
    const [expandedStoreBarber, setExpandedStoreBarber] = useState(true);
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: freeBarberPanel } = useSheet('freeBarberMinePanel');
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const { list: selectedServices, toggle: toggleService, clear: clearServices, has: hasService, } = useToggleList<string>([]);
    const [freeBarberId, setFreeBarberId] = useState<string | null>(null);

    const screenWidth = Dimensions.get('window').width;
    const cardWidthStores = useMemo(
        () => (expandedMineStore ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedMineStore, screenWidth]
    );
    const cardWidthFreeBarber = useMemo(
        () => (expandedStoreBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [setExpandedStoreBarber, screenWidth]
    );

    const hasMineFreeBarber = !isLoading && freeBarber?.fullName != null;
    const hasStoreBarbers = !loading && stores.length > 0;


    const handlePressUpdatePanel = useCallback(
        (freeBarber: FreeBarberMinePanelDto) => {
            setFreeBarberId(freeBarber.id)
            freeBarberPanel();
        },
        [freeBarberPanel]
    );
    const renderItem = useCallback(
        ({ item }: { item: BarberStoreGetDto }) => (
            <StoreCardInner
                store={item}
                isList={isList}
                expanded={expandedStoreBarber}
                cardWidthStore={cardWidthStores}
            />
        ),
        [isList, expandedStoreBarber, cardWidthStores]
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
                                Panelim
                            </Text>
                            {hasMineFreeBarber && (
                                <MotiViewExpand
                                    expanded={expandedMineStore}
                                    onPress={() => toggleExpand(expandedMineStore, setExpandedMineStore)}
                                />
                            )}
                        </View>
                        {isLoading ? (
                            <View className="flex-1 pt-4">
                                {Array.from({ length: 1 }).map((_, i) => (
                                    <SkeletonComponent key={i} />
                                ))}
                            </View>
                        ) :
                            !hasMineFreeBarber ?
                                (
                                    <>
                                        <LottieViewComponent message='Henüz eklediğiniz panel bulunmuyor.' ></LottieViewComponent>
                                        <Button style={{ marginTop: 10 }} buttonColor='#c2a523' mode='contained' icon={'plus'} onPress={() => freeBarberPanel()}>Lütfen Panel Ekleyin</Button>
                                    </>
                                ) :
                                locationStatus === 'error' ? (<LottieViewComponent animationSource={require('../../../assets/animations/Location.json')} message={locationMessage} ></LottieViewComponent>)
                                    : isError ? (<LottieViewComponent animationSource={require('../../../assets/animations/error.json')} message={resolveApiErrorMessage(error)} ></LottieViewComponent>) : hasMineFreeBarber && (
                                        <FreeBarberMineCardComp
                                            freeBarber={freeBarber}
                                            isList={isList}
                                            expanded={expandedMineStore}
                                            cardWidthFreeBarber={cardWidthFreeBarber}
                                            onPressUpdate={handlePressUpdatePanel}
                                        />
                                    )}


                        <View className="flex flex-row justify-between items-center mt-4">
                            <Text className="font-ibm-plex-sans-regular text-xl text-white">
                                Çevremdeki Berber Dükkanları
                            </Text>
                            {stores && stores.length !== 0 && (
                                <MotiViewExpand
                                    expanded={expandedStoreBarber}
                                    onPress={() => toggleExpand(expandedStoreBarber, setExpandedStoreBarber)}
                                />
                            )}
                        </View>
                        {loading ? (
                            <View className="flex-1 pt-4">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <SkeletonComponent key={i} />
                                ))}
                            </View>
                        ) : !hasStoreBarbers ? (
                            <LottieViewComponent message='Yakınında şu an listelenecek serbest berber bulunamadı.' ></LottieViewComponent>
                        ) : locationStatus === 'error' ? (<LottieViewComponent animationSource={require('../../../assets/animations/Location.json')} message={locationMessage} ></LottieViewComponent>) : storeError ? (<LottieViewComponent animationSource={require('../../../assets/animations/error.json')} message={resolveApiErrorMessage(error)} ></LottieViewComponent>) : hasMineFreeBarber && (
                            <FlatList
                                key="barberStoreList"
                                data={hasStoreBarbers ? stores : []}
                                keyExtractor={(item) => item.id}
                                renderItem={renderItem}
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
                                    paddingTop: hasStoreBarbers ? 8 : 0,
                                    paddingBottom: 8,
                                }}
                            />
                        )}

                    </>
                }
            />
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
            <BottomSheetModal
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: 'close' })}
                handleIndicatorStyle={{ backgroundColor: '#47494e' }}
                backgroundStyle={{ backgroundColor: '#151618' }}
                ref={(inst) => setRef('freeBarberMinePanel', inst)}
                onChange={(index) => { setIsSheetOpen(index >= 0); }}
                snapPoints={['100%']} enableOverDrag={false} enablePanDownToClose={false}>
                <BottomSheetView className='h-full pt-2'>
                    <FormFreeBarberOperation freeBarberId={freeBarberId!} enabled={isSheetOpen} />
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    )
}


export default Index

