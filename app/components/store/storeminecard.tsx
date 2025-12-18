// app/components/StoreCard.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions, Alert } from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { BarberType, BarberStoreMineDto } from '../../types';
import { useToggleFavoriteMutation, useIsFavoriteQuery, api } from '../../store/api';
import { useAuth } from '../../hook/useAuth';
import { useDispatch } from 'react-redux';

type Props = {
    store: BarberStoreMineDto;
    isList: boolean;
    expanded: boolean;
    cardWidthStore: number;
    onPressUpdate?: (store: BarberStoreMineDto) => void;
    onPressRatings?: (storeId: string, storeName: string) => void;
};

const StoreMineCard: React.FC<Props> = ({ store, isList, expanded, cardWidthStore, onPressUpdate, onPressRatings }) => {
    const coverImage = store.imageList?.[0]?.imageUrl;
    const { isAuthenticated } = useAuth();
    const dispatch = useDispatch();
    const [toggleFavorite, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();
    const { data: isFavoriteData, refetch: refetchIsFavorite } = useIsFavoriteQuery(store.id, { skip: !isAuthenticated });
    const [isFavorite, setIsFavorite] = useState(false);
    // favoriteCount'u direkt store prop'undan al, optimistic update yapma
    const favoriteCount = store.favoriteCount || 0;

    const handlePressCard = () => {
        onPressUpdate?.(store);
    };

    // isFavoriteData değiştiğinde state'i güncelle (query yüklendiğinde)
    useEffect(() => {
        if (isFavoriteData !== undefined) {
            setIsFavorite(isFavoriteData);
        }
    }, [isFavoriteData]);

    const handleToggleFavorite = useCallback(async () => {
        if (!isAuthenticated) {
            Alert.alert('Uyarı', 'Favori eklemek için giriş yapmanız gerekiyor.');
            return;
        }

        // ÖNEMLİ: Component'te optimistic update yapmıyoruz, sadece API.tsx'teki optimistic update yeterli
        // Bu sayede "fazladan ekliyor sonra azaltıyor" sorunu çözülür
        try {
            await toggleFavorite({
                targetId: store.id,
                appointmentId: null,
            }).unwrap();

            // Mutation başarılı olduktan sonra:
            // 1. isFavorite query'sini refetch et
            if (refetchIsFavorite) {
                refetchIsFavorite();
            }

            // 2. Parent query'leri invalidate et (favoriteCount güncellenmesi için)
            // Not: toggleFavorite mutation'ı zaten tüm gerekli tag'leri invalidate ediyor
            // Burada ekstra invalidate etmeye gerek yok, ama güvenlik için yapıyoruz
            dispatch(api.util.invalidateTags([
                { type: 'MineStores' as const, id: store.id },
                { type: 'MineStores' as const, id: 'LIST' },
                { type: 'GetStoreById' as const, id: store.id },
                { type: 'StoreForUsers' as const, id: store.id },
            ]));
        } catch (error: any) {
            // Hata durumunda sadece alert göster
            // State zaten backend'den gelen değerle güncellenecek (invalidateTags sayesinde)
            Alert.alert('Hata', error?.data?.message || error?.message || 'Favori işlemi başarısız.');
        }
    }, [isAuthenticated, store.id, toggleFavorite, refetchIsFavorite, dispatch]);

    return (
        <View
            style={{ width: cardWidthStore }}
            className={`${!expanded ? 'mt-0' : 'mt-4'} ${!isList ? 'pl-4 py-2 rounded-lg bg-[#202123]' : 'pl-0'
                }`}
        >
            <View className={`${!isList ? 'flex flex-row ' : ''}`}>
                <TouchableOpacity onPress={handlePressCard} className="relative mr-2">
                    <Image
                        defaultSource={require('../../../assets/images/empty.png')}
                        className={`${isList ? 'w-full h-80' : 'h-28 w-28 mr-2'} rounded-lg mb-0`}
                        source={
                            coverImage
                                ? { uri: coverImage }
                                : require('../../../assets/images/empty.png')
                        }

                        resizeMode={'cover'}
                    />
                </TouchableOpacity>
                <View className="flex-1 relative">
                    <View
                        className={`flex-row justify-between ${!isList ? 'items-start' : 'items-center'
                            }`}
                    >
                        <View className={`flex-row flex-1 ${isList ? 'items-center' : ''}`}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode={'tail'}
                                style={{ fontSize: 20 }}
                                className="font-ibm-plex-sans-semibold flex-shrink text-white"
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

                    <View
                        className="flex-row justify-between items-center"
                        style={{ marginTop: !isList ? -5 : 0 }}
                    >
                        <View className="flex-row items-center gap-1">
                            <StarRatingDisplay
                                rating={store.rating}
                                starSize={15}
                                starStyle={{ marginHorizontal: 0 }}
                            />
                            <Text className="text-white">{store.rating}</Text>
                        </View>
                        {isList && (
                            <TouchableOpacity onPress={() => onPressRatings?.(store.id, store.storeName)}>
                                <Text className="text-white underline mr-1 mb-1 text-xs">
                                    Yorumlar ({store.reviewCount})
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {!isList && (
                        <View className="flex-row mt-2 justify-between items-center">
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
                            <TouchableOpacity onPress={() => onPressRatings?.(store.id, store.storeName)}>
                                <Text className="text-white underline mr-1 mb-1 text-xs">
                                    Yorumlar ({store.reviewCount})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

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
                            key={s.id}
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
    );
};

export const StoreMineCardComp = React.memo(
    StoreMineCard,
    (prev, next) =>
        prev.store === next.store &&
        prev.isList === next.isList &&
        prev.expanded === next.expanded &&
        prev.cardWidthStore === next.cardWidthStore
);
