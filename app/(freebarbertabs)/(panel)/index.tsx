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
import { resolveApiErrorMessage } from '../../utils/error';
import { StoreCardInner } from '../../components/storecard';
import { useNearbyStores } from '../../hook/useNearByStore';
import { BarberStoreGetDto } from '../../types';
import { FreeBarberPanelSection } from '../../components/freebarberpanelsection';
import { EmptyState } from '../../components/emptystateresult';
import { useRouter } from 'expo-router';

const Index = () => {

    const { stores, loading, error: storeError, locationStatus, locationMessage, hasLocation, fetchedOnce } = useNearbyStores(true);
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isList, setIsList] = useState(true);
    const { present } = useSheet('freeBarberFilter');
    const [selectedType, setSelectedType] = useState<string>('Hepsi');
    const [selectedRating, setSelectedRating] = useState<string | number | null>("Hepsi");

    const [expandedStoreBarber, setExpandedStoreBarber] = useState(true);
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: freeBarberPanel } = useSheet('freeBarberMinePanel');
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const { list: selectedServices, toggle: toggleService, has: hasService, } = useToggleList<string>([]);
    const [freeBarberId, setFreeBarberId] = useState<string | null>(null);

    const screenWidth = Dimensions.get('window').width;

    const cardWidthStores = useMemo(
        () => (expandedStoreBarber ? screenWidth * 0.92 : screenWidth * 0.94),
        [expandedStoreBarber, screenWidth]
    );

    const hasStoreBarbers = !loading && stores.length > 0;

    const handleOpenPanel = useCallback((id: string | null) => {
        setFreeBarberId(id);
        freeBarberPanel();
    }, [freeBarberPanel]);

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        router.push({
            pathname: "/store/[storeId]",
            params: { storeId: store.id, },
        });
    }, [router]);

    const renderItem = useCallback(
        ({ item }: { item: BarberStoreGetDto }) => (
            <StoreCardInner
                store={item}
                isList={isList}
                expanded={expandedStoreBarber}
                cardWidthStore={cardWidthStores}
                isViewerFromFreeBr={true}
                onPressUpdate={goStoreDetail}
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
                        <FreeBarberPanelSection
                            isList={isList}
                            locationStatus={locationStatus}
                            locationMessage={locationMessage}
                            onOpenPanel={handleOpenPanel}
                            screenWidth={screenWidth}
                        />
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
                        ) : storeError ? (
                            <LottieViewComponent animationSource={require('../../../assets/animations/error.json')} message={resolveApiErrorMessage(storeError)} ></LottieViewComponent>
                        ) : (
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
                                ListEmptyComponent={() => (
                                    <EmptyState loading={loading} hasLocation={hasLocation} locationStatus={locationStatus} fetchedOnce={fetchedOnce} hasData={hasStoreBarbers} noResultText="Yakınınızda dükkan bulunamadı" ></EmptyState>
                                )}
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
                    <FormFreeBarberOperation freeBarberId={freeBarberId} enabled={isSheetOpen} />
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    )
}

export default Index