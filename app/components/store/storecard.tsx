// app/components/StoreCard.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, ScrollView, Dimensions, Alert } from 'react-native';
import { Text } from '../common/Text';
import { Icon, IconButton } from 'react-native-paper';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { BarberType, BarberStoreGetDto, PricingType } from '../../types';
import { useToggleFavoriteMutation } from '../../store/api';
import { useAuth } from '../../hook/useAuth';
import { ImageCarousel } from '../common/imagecarousel';
import { useLanguage } from '../../hook/useLanguage';

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
    showImageAnimation?: boolean;
    isMapMode?: boolean;
};

const StoreCard: React.FC<Props> = ({ store, isList, expanded, cardWidthStore, isViewerFromFreeBr = false, typeLabel, typeLabelColor = 'bg-blue-500', onPressUpdate, onPressRatings, showImageAnimation = true, isMapMode = false }) => {
    const coverImage = store.imageList?.[0]?.imageUrl;
    const carouselWidth = Math.max(0, cardWidthStore);
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const [toggleFavorite, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();
    const [isFavorite, setIsFavorite] = useState(store.isFavorited ?? false);
    const [favoriteCount, setFavoriteCount] = useState(store.favoriteCount || 0);

    const handlePressCard = useCallback(() => {
        onPressUpdate?.(store);
    }, [onPressUpdate, store]);

    // store.isFavorited ve favoriteCount değiştiğinde state'i güncelle (API.tsx'teki optimistic update ve invalidateTags sonrası)
    useEffect(() => {
        if (store.isFavorited !== undefined) {
            setIsFavorite(store.isFavorited);
        }
        if (store.favoriteCount !== undefined && store.favoriteCount !== null) {
            setFavoriteCount(store.favoriteCount);
        }
    }, [store.isFavorited, store.favoriteCount]);

    const handleToggleFavorite = useCallback(async () => {
        if (!isAuthenticated) {
            Alert.alert(t('booking.warning'), t('booking.loginRequiredForFavorite'));
            return;
        }

        try {
            await toggleFavorite({
                targetId: store.id,
                appointmentId: null,
            }).unwrap();
            // API.tsx'teki optimistic update ve invalidateTags ile state otomatik güncellenecek
        } catch (error: any) {
            Alert.alert(t('common.error'), error?.data?.message || error?.message || t('appointment.alerts.favoriteFailed'));
        }
    }, [isAuthenticated, store.id, toggleFavorite, t]);

    return (
        <View
            style={{ width: cardWidthStore, overflow: 'hidden' }}
            className={expanded ? 'mt-4' : 'mt-0'}
        >
            <View className={isList ? '' : 'pl-4 py-2 rounded-lg bg-[#202123]'}>
                {!isList && (
                    <View className='flex-row justify-end px-2 pb-0'>
                        <View className={store.isOpenNow ? 'bg-green-600 px-2 py-1 rounded-xl flex-row items-center justify-center' : 'bg-red-600 px-2 py-1 rounded-xl flex-row items-center justify-center'}>
                            <Text className="text-white text-sm font-century-gothic-sans-medium">
                                {store.isOpenNow ? 'Açık' : 'Kapalı'}
                            </Text>
                        </View>
                    </View>
                )}
                <View className={isList ? '' : 'flex flex-row'}>
                    <TouchableOpacity onPress={handlePressCard} className="relative mr-2">
                        <ImageCarousel
                            key={`store-${store.id}-${isMapMode}`}
                            images={store.imageList ?? []}
                            width={isList ? carouselWidth : 112}
                            height={isList ? 250 : 112}
                            autoPlay={showImageAnimation}
                            mode={"default"}
                            autoPlayInterval={2000}
                            borderRadiusClass="rounded-lg"
                            showPagination={true}
                            isMapMode={isMapMode}
                        />
                        {/* Image üzerinde bilgiler - hem list hem card modunda */}
                        <View className={isList ? 'absolute top-3 right-3 flex-row gap-2 z-10' : ''}>
                            {isList && (
                                <>
                                    <View className={`px-2 py-1 rounded-xl flex-row items-center justify-center ${store.type === BarberType.MaleHairdresser ? 'bg-blue-500' : store.type === BarberType.FemaleHairdresser ? 'bg-pink-500' : 'bg-green-500'}`}>
                                        <Icon
                                            source={store.type === BarberType.BeautySalon ? 'store' : store.type === BarberType.MaleHairdresser ? 'face-man' : 'face-woman'}
                                            color="white"
                                            size={14}
                                        />

                                        <Text className="text-white text-base font-century-gothic-sans-medium ml-1">
                                            {store.type === BarberType.MaleHairdresser ? 'Erkek Berber' : store.type === BarberType.FemaleHairdresser ? 'Kadın Kuaför' : 'Güzellik Salonu'}
                                        </Text>

                                    </View>
                                    <View className={store.isOpenNow ? 'bg-green-600 px-2 py-1 rounded-xl flex-row items-center justify-center' : 'bg-red-600 px-2 py-1 rounded-xl flex-row items-center justify-center'}>
                                        <Text className={'text-white font-century-gothic-sans-medium text-base'}>
                                            {store.isOpenNow ? 'Açık' : 'Kapalı'}
                                        </Text>
                                    </View>
                                </>
                            )}

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
                                    className="font-century-gothic-sans-semibold text-xl flex-shrink text-white"
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
                                        className={`text-white font-century-gothic-sans-regular text-xs ${!isList ? 'pb-3 ml-[-8px] mr-2' : 'pb-2'
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
                                        className={`text-white font-century-gothic-sans-regular text-xs pb-1`}
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
                                <TouchableOpacity
                                    onPress={() => onPressRatings?.(store.id, store.storeName)}
                                    style={{ flexShrink: 0 }}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
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
            </View>


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
            prev.onPressRatings === next.onPressRatings &&
            prev.showImageAnimation === next.showImageAnimation &&
            (prev.isMapMode ?? false) === (next.isMapMode ?? false);

        return sameStore && sameProps;
    }
);
