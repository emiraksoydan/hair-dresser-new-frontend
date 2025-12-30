// app/components/StoreCard.tsx
import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions, Alert } from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { BarberType, BarberStoreGetDto, PricingType } from '../../types';
import { useToggleFavoriteMutation, useIsFavoriteQuery } from '../../store/api';
import { useAuth } from '../../hook/useAuth';
import { ImageCarousel } from '../common/imagecarousel';

type Props = {
    store: BarberStoreGetDto;
    isList: boolean;
    expanded: boolean;
    cardWidthStore: number;
    isViewerFromFreeBr?: boolean;
    typeLabel?: string;
    typeLabelColor?: string;
    onPressUpdate?: (store: BarberStoreGetDto) => void;
    onPressRatings?: (storeId: string, storeName: string) => void;
};

const StoreCard: React.FC<Props> = ({ store, isList, expanded, cardWidthStore, isViewerFromFreeBr = false, typeLabel, typeLabelColor = 'bg-blue-500', onPressUpdate, onPressRatings }) => {
    const coverImage = store.imageList?.[0]?.imageUrl;
    const carouselWidth = Math.max(0, cardWidthStore - 8);
    const { isAuthenticated } = useAuth();
    const [toggleFavorite, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();
    const { data: isFavoriteData } = useIsFavoriteQuery(store.id, { skip: !isAuthenticated });
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteCount, setFavoriteCount] = useState(store.favoriteCount || 0);
    const [isToggling, setIsToggling] = useState(false);

    const handlePressCard = useCallback(() => {
        onPressUpdate?.(store);
    }, [onPressUpdate, store]);

    // isFavoriteData değiştiğinde state'i güncelle (query yüklendiğinde)
    useEffect(() => {
        if (isFavoriteData !== undefined) {
            setIsFavorite(isFavoriteData);
        }
    }, [isFavoriteData]);

    // store.favoriteCount değiştiğinde state'i güncelle
    // ÖNEMLİ: Cache'den gelen değer her zaman öncelikli (backend'den gelen gerçek değer)
    useEffect(() => {
        // Cache güncellemesi geldiğinde direkt kullan (optimistic update'i override et)
        if (store.favoriteCount !== undefined && store.favoriteCount !== null) {
            setFavoriteCount(store.favoriteCount);
            // Cache güncellemesi geldi, toggle flag'ini kaldır
            setIsToggling(false);
        }
    }, [store.favoriteCount]);

    const handleToggleFavorite = useCallback(async () => {
        if (!isAuthenticated) {
            Alert.alert('Uyarı', 'Favori eklemek için giriş yapmanız gerekiyor.');
            return;
        }

        // ÖNEMLİ: Component'te optimistic update yapmıyoruz, sadece API.tsx'teki optimistic update yeterli
        // Bu sayede "fazladan ekliyor sonra azaltıyor" sorunu çözülür
        const previousIsFavorite = isFavorite;
        const previousCount = favoriteCount;
        const nextIsFavorite = !previousIsFavorite;
        const nextCount = Math.max(0, previousCount + (nextIsFavorite ? 1 : -1));

        setIsFavorite(nextIsFavorite);
        setFavoriteCount(nextCount);
        setIsToggling(true);

        try {
            const result = await toggleFavorite({
                targetId: store.id,
                appointmentId: null,
            }).unwrap();

            const responseData: any = (result as any)?.data ?? result;
            if (typeof responseData?.isFavorite === "boolean") {
                setIsFavorite(responseData.isFavorite);
            }
            if (typeof responseData?.favoriteCount === "number") {
                setFavoriteCount(responseData.favoriteCount);
            }
        } catch (error: any) {
            setIsFavorite(previousIsFavorite);
            setFavoriteCount(previousCount);
            Alert.alert('Hata', error?.data?.message || error?.message || 'Favori işlemi başarısız.');
        } finally {
            setIsToggling(false);
        }
    }, [isAuthenticated, store.id, toggleFavorite, isFavorite, favoriteCount]);

    return (
        <View
            style={{ width: cardWidthStore, overflow: 'hidden' }}
            className={`${!expanded ? 'mt-0' : 'mt-4'} ${!isList ? 'pl-4 py-2 rounded-lg bg-[#202123]' : 'pl-0'
                }`}
        >
            <View className={`${!isList ? 'flex flex-row ' : ''}`}>
                <TouchableOpacity onPress={handlePressCard} className="relative mr-2">
                    {isList ? (
                        <ImageCarousel
                            images={store.imageList ?? []}
                            width={carouselWidth}
                            height={320}
                            autoPlay={false}
                            borderRadiusClass="rounded-lg"
                        />
                    ) : (
                        <Image
                            defaultSource={require('../../../assets/images/empty.png')}
                            className="h-28 w-28 mr-2 rounded-lg mb-0"
                            source={
                                coverImage
                                    ? { uri: coverImage }
                                    : require('../../../assets/images/empty.png')
                            }
                            resizeMode={'cover'}
                        />
                    )}
                    {/* Image üzerinde bilgiler - hem list hem card modunda */}
                    <View className={`absolute ${isList ? 'top-3 right-3' : 'top-1 right-1'} flex-row gap-2 z-10`}>
                        {isList && typeLabel && (
                            <View className={`${typeLabelColor} px-2 py-1 rounded-xl flex-row items-center justify-center`}>
                                <Text className="text-white text-base font-ibm-plex-sans-medium">
                                    {typeLabel}
                                </Text>
                            </View>
                        )}
                        <View className={`px-2 py-1 rounded-xl flex-row items-center justify-center ${store.type === BarberType.MaleHairdresser ? 'bg-blue-500' : store.type === BarberType.FemaleHairdresser ? 'bg-pink-500' : 'bg-green-500'}`}>
                            <Icon
                                source={store.type === BarberType.BeautySalon ? 'store' : store.type === BarberType.MaleHairdresser ? 'face-man' : 'face-woman'}
                                color="white"
                                size={isList ? 14 : 12}
                            />
                            {isList && (
                                <Text className="text-white text-base font-ibm-plex-sans-medium ml-1">
                                    {store.type === BarberType.MaleHairdresser ? 'Erkek Berber' : store.type === BarberType.FemaleHairdresser ? 'Kadın Kuaför' : 'Güzellik Salonu'}
                                </Text>
                            )}
                        </View>
                        <View className={`${store.isOpenNow ? 'bg-green-600' : 'bg-red-600'} px-2 py-1 rounded-xl flex-row items-center justify-center`}>
                            <Text className={`text-white font-ibm-plex-sans-medium ${isList ? 'text-base' : 'text-xs'}`}>
                                {store.isOpenNow ? 'Açık' : 'Kapalı'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <View className="flex-1 flex-col gap-2" style={{ minWidth: 0, maxWidth: '100%' }}>
                    <View
                        className={`flex-row  justify-between ${!isList ? 'items-start' : 'items-center'
                            }`}
                        style={{ minWidth: 0, maxWidth: '100%' }}
                    >
                        <View className={`flex-row  h-8 flex-1 ${isList ? 'items-center' : ''}`} style={{ minWidth: 0, maxWidth: '100%', flexShrink: 1 }}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode={'tail'}
                                className="font-ibm-plex-sans-semibold text-xl flex-shrink text-white"
                                style={{ flexShrink: 1, minWidth: 0, maxWidth: '100%' }}
                            >
                                {store.storeName}
                            </Text>

                            <IconButton
                                iconColor="gray"
                                size={20}
                                style={{
                                    marginTop: 0,
                                    paddingRight: 5,
                                    paddingTop: isList ? 5 : 0,
                                    paddingBottom: !isList ? 10 : 0,
                                    flexShrink: 1,
                                }}
                                icon={
                                    store.type === BarberType.MaleHairdresser
                                        ? 'face-man'
                                        : 'face-woman'
                                }
                            />
                        </View>

                        {isList && (
                            <View className="flex-row items-center">
                                <IconButton
                                    size={25}
                                    iconColor={isFavorite ? "red" : "gray"}
                                    icon={isFavorite ? "heart" : "heart-outline"}
                                    style={{
                                        marginTop: !isList ? -5 : 0,
                                        marginRight: !isList ? 0 : -8,
                                    }}
                                    onPress={handleToggleFavorite}
                                    disabled={isTogglingFavorite}
                                />
                                <Text
                                    className={`text-white font-ibm-plex-sans-regular text-xs ${!isList ? 'pb-3 ml-[-8px] mr-2' : 'pb-2'
                                        }`}
                                >
                                    ({favoriteCount})
                                </Text>
                            </View>
                        )}
                    </View>

                    {!isList && (
                        <View className="flex-row  justify-between pr-2 ">
                            <Text className='text-base text-gray-500'>{store.type === BarberType.MaleHairdresser ? "Erkek Berber" : store.type === BarberType.FemaleHairdresser ? 'Kadın Kuaför' : 'Güzellik Salonu'}</Text>
                            <TouchableOpacity
                                onPress={handleToggleFavorite}
                                disabled={isTogglingFavorite}
                                className="flex-row items-center gap-1"
                            >
                                <Icon
                                    size={25}
                                    color={isFavorite ? "red" : "gray"}
                                    source={isFavorite ? "heart" : "heart-outline"}
                                />
                                <Text
                                    className={`text-white font-ibm-plex-sans-regular text-xs pb-1`}
                                >
                                    ({favoriteCount})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <View
                        className="flex-row justify-between items-center"
                        style={{ marginTop: !isList ? -5 : -10, minWidth: 0, maxWidth: '100%' }}
                    >
                        <View className="flex-row items-center gap-1" style={{ minWidth: 0, maxWidth: '100%', flexShrink: 1 }}>
                            <StarRatingDisplay
                                rating={store.rating}
                                starSize={15}
                                starStyle={{ marginHorizontal: 0 }}
                            />
                            <Text className="text-white flex-1" style={{ flexShrink: 0 }}>{store.rating}</Text>
                            <TouchableOpacity onPress={() => onPressRatings?.(store.id, store.storeName)} style={{ flexShrink: 0 }}>
                                <Text className="text-white underline mr-1 mb-0 text-xs" numberOfLines={1}>
                                    Yorumlar ({store.reviewCount})
                                </Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>
            </View>

            {!!store.serviceOfferings?.length && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-2"
                    contentContainerStyle={{ gap: 8 }}
                >
                    {store.serviceOfferings.map((s) => (
                        <View
                            key={(s as any).id ?? s.serviceName}
                            className="flex-row bg-[#2a2b2f] px-3 py-2 rounded-lg items-center"
                        >
                            <Text className="text-[#d1d5db] mr-1 text-sm">
                                {s.serviceName} :
                            </Text>
                            <Text className="text-[#a3e635] text-sm">
                                {s.price} TL
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            )}
            {isViewerFromFreeBr && (
                <View className='bg-[#2a2b2f] mt-2 px-3 py-2 rounded-lg'>
                    <Text className='text-[#d1d5db] mr-1 text-sm'>
                        {store.pricingType.toLowerCase() === 'percent' ? `Fiyatlandırma: yapılan işlemlerin toplamının  %${store.pricingValue} alınır` : store.pricingType.toLowerCase() === 'rent' ? `Fiyatlandırma: Koltuk kirası (Saatlik:${store.pricingValue}₺/saat)` : ''}
                    </Text>
                </View>
            )}
        </View>
    );
};

export const StoreCardInner = React.memo(
    StoreCard,
    (prev, next) => {
        const sameStore =
            prev.store.id === next.store.id &&
            prev.store.storeName === next.store.storeName &&
            prev.store.type === next.store.type &&
            prev.store.isOpenNow === next.store.isOpenNow &&
            prev.store.rating === next.store.rating &&
            prev.store.reviewCount === next.store.reviewCount &&
            prev.store.favoriteCount === next.store.favoriteCount &&
            prev.store.imageList === next.store.imageList &&
            prev.store.serviceOfferings === next.store.serviceOfferings &&
            prev.store.pricingType === next.store.pricingType &&
            prev.store.pricingValue === next.store.pricingValue;

        const sameProps =
            (prev.isViewerFromFreeBr ?? false) === (next.isViewerFromFreeBr ?? false) &&
            prev.isList === next.isList &&
            prev.expanded === next.expanded &&
            prev.cardWidthStore === next.cardWidthStore &&
            prev.typeLabel === next.typeLabel &&
            prev.typeLabelColor === next.typeLabelColor &&
            prev.onPressUpdate === next.onPressUpdate &&
            prev.onPressRatings === next.onPressRatings;

        return sameStore && sameProps;
    }
);
