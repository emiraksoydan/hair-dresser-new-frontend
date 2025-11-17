import { Text, View, Alert, Linking, Dimensions, ScrollView, FlatList } from 'react-native';
import { useNearbyStores } from '../../hook/useNearByStore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SkeletonComponent } from '../../components/skeleton';
import SearchBar from '../../components/searchbar';
import { Chip, Divider, Icon, IconButton } from 'react-native-paper';
import { toggleExpand } from '../../utils/expand-toggle';
import { useBottomSheetRegistry, useSheet } from '../../context/bottomsheet';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { LegendList } from '@legendapp/list';
import { useToggleList } from '../../utils/service-toggle';
import { catData, ratings } from '../../constants';
import { BarberStoreGetDto } from '../../types';
import { StoreCardInner } from '../../components/storecard';
import FormatListButton from '../../components/formatlistbutton';
import FilterButton from '../../components/filterbutton';
import MotiViewExpand from '../../components/motiviewexpand';
import { LottieViewComponent } from '../../components/lottieview';
import { FilterBottomSheet } from '../../components/filterbottomsheet';

const Index = () => {
    const { stores, loading, locationStatus, error, retryPermission } = useNearbyStores(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expanded, setExpanded] = useState(true);
    const [expandedFreeBarber, setExpandedFreeBarber] = useState(false);
    const [isList, setIsList] = useState(true);
    const { present } = useSheet('addFilter');
    const [selectedType, setSelectedType] = useState<string>('Hepsi');
    const [selectedRating, setSelectedRating] = useState<string | number | null>('Hepsi');
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

    const hasStores = !loading && stores.length > 0;
    const hasFreeBarbers = !loading && stores.length > 0;


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


    useEffect(() => {
        if (locationStatus !== 'denied') return;
        Alert.alert(
            'Konum izni gerekli',
            'Yakındaki berberleri gösterebilmen için konum izni vermen gerekiyor.',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Tekrar sor',
                    onPress: () => {
                        retryPermission();
                    },
                },
                {
                    text: 'Ayarları aç',
                    onPress: () => {
                        Linking.openSettings();
                    },
                },
            ]
        );
    }, [locationStatus, retryPermission]);

    return (
        <View className="flex flex-1 pl-4 pr-2 bg-[#151618]">
            <View className="flex flex-row items-center gap-2 mt-4">
                <View className="flex flex-1">
                    <SearchBar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                    />
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
                                İşletmeler
                            </Text>
                            {stores && stores.length !== 0 && (

                                <MotiViewExpand
                                    expanded={expanded}
                                    onPress={() => toggleExpand(expanded, setExpanded)}
                                />
                            )}
                        </View>
                        {loading && (
                            <View className="flex-1 pt-4">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <SkeletonComponent key={i} />
                                ))}
                            </View>
                        )}
                        <FlatList
                            key="storesList"
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
                                !loading ? (
                                    <LottieViewComponent message='Yakınında şu an listelenecek berber bulunamadı' ></LottieViewComponent>
                                ) : locationStatus !== 'denied' ? (<LottieViewComponent animationSource={require('../../../assets/animations/Location.json')} message='Lütfen konumunuzu açınız' ></LottieViewComponent>) : null
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
                        {loading && (
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
                                !loading ? (
                                    <LottieViewComponent message='Yakınında şu an listelenecek serbest berber bulunamadı' ></LottieViewComponent>
                                ) : locationStatus !== 'denied' ? (<LottieViewComponent animationSource={require('../../../assets/animations/Location.json')} message='Lütfen konumunuzu açınız' ></LottieViewComponent>) : null
                            }
                        />
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
