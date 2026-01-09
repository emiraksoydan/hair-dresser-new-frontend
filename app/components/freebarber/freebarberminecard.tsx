// app/components/StoreCard.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { Text } from '../common/Text';
import { Icon, IconButton } from 'react-native-paper';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { BarberType, BarberStoreMineDto, FreeBarberPanelDto } from '../../types';
import { useToggleFavoriteMutation, useIsFavoriteQuery, api } from '../../store/api';
import { useAuth } from '../../hook/useAuth';
import { ImageCarousel } from '../common/imagecarousel';

type Props = {
    freeBarber: FreeBarberPanelDto;
    isList: boolean;
    expanded: boolean;
    cardWidthFreeBarber: number;
    onPressUpdate?: (store: FreeBarberPanelDto) => void;
    onPressRatings?: (freeBarberId: string, freeBarberName: string) => void;
    showImageAnimation?: boolean;
};

const FreeBarberMineCard: React.FC<Props> = ({ freeBarber, isList, expanded, cardWidthFreeBarber, onPressUpdate, onPressRatings, showImageAnimation = true }) => {
    const images = freeBarber.imageList ?? [];
    const carouselWidth = Math.max(0, cardWidthFreeBarber - 8);
    const imageWidth = isList ? carouselWidth : 112;
    const imageHeight = isList ? 320 : 112;
    const { isAuthenticated } = useAuth();
    const [toggleFavorite, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();
    const { data: isFavoriteData } = useIsFavoriteQuery(freeBarber.id, { skip: !isAuthenticated });
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteCount, setFavoriteCount] = useState(freeBarber.favoriteCount || 0);

    const handlePressCard = () => {
        onPressUpdate?.(freeBarber);
    };

    // isFavoriteData değiştiğinde state'i güncelle (query yüklendiğinde)
    useEffect(() => {
        if (isFavoriteData !== undefined) {
            setIsFavorite(isFavoriteData);
        }
    }, [isFavoriteData]);

    useEffect(() => {
        if (freeBarber.favoriteCount !== undefined && freeBarber.favoriteCount !== null) {
            setFavoriteCount(freeBarber.favoriteCount);
        }
    }, [freeBarber.favoriteCount]);

    const handleToggleFavorite = useCallback(async () => {
        if (!isAuthenticated) {
            Alert.alert('Uyarı', 'Favori eklemek için giriş yapmanız gerekiyor.');
            return;
        }

        const previousIsFavorite = isFavorite;
        const previousCount = favoriteCount;
        const nextIsFavorite = !previousIsFavorite;
        const nextCount = Math.max(0, previousCount + (nextIsFavorite ? 1 : -1));

        setIsFavorite(nextIsFavorite);
        setFavoriteCount(nextCount);

        try {
            const result = await toggleFavorite({
                targetId: freeBarber.id,
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
            // Hata durumunda sadece alert göster
            // State zaten backend'den gelen değerle güncellenecek (invalidateTags sayesinde)
            Alert.alert('Hata', error?.data?.message || error?.message || 'Favori işlemi başarısız.');
        }
    }, [isAuthenticated, freeBarber.id, toggleFavorite, isFavorite, favoriteCount]);

    return (
        <View
            style={{ width: cardWidthFreeBarber }}
            className={`${!expanded ? 'mt-0' : 'mt-4'} ${!isList ? 'pl-4 py-2 rounded-lg bg-[#202123]' : 'pl-0'
                }`}
        >
            <View className={`${!isList ? 'flex flex-row ' : ''}`}>
                <TouchableOpacity onPress={handlePressCard} className="relative mr-2">
                    <ImageCarousel
                        images={images}
                        width={imageWidth}
                        height={imageHeight}
                        mode={'default'}
                        autoPlay={showImageAnimation}
                        borderRadiusClass="rounded-lg"
                        containerStyle={!isList ? { marginRight: 8 } : undefined}
                    />
                    {/* Image üzerinde bilgiler - hem list hem card modunda */}
                    <View className={`absolute ${isList ? 'top-3 right-3' : 'top-1 right-1'} flex-row gap-2 z-10`}>
                        <View className={`px-2 py-1 rounded-xl flex-row items-center justify-center ${freeBarber.type === BarberType.MaleHairdresser ? 'bg-blue-500' : 'bg-pink-500'}`}>
                            <Icon
                                source={freeBarber.type === BarberType.MaleHairdresser ? 'face-man' : 'face-woman'}
                                color="white"
                                size={isList ? 14 : 12}
                            />
                            {isList && (
                                <Text className="text-white text-base font-ibm-plex-sans-medium ml-1">
                                    {freeBarber.type === BarberType.MaleHairdresser ? 'Erkek' : 'Kadın'}
                                </Text>
                            )}
                        </View>
                        <View className={`${freeBarber.isAvailable ? 'bg-green-600' : 'bg-red-600'} px-2 py-1 rounded-xl flex-row items-center justify-center`}>
                            <Text className={`text-white font-ibm-plex-sans-medium ${isList ? 'text-base' : 'text-xs'}`}>
                                {freeBarber.isAvailable ? 'Müsait' : 'Meşgul'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <View className="flex-1 flex-col gap-2">
                    <View
                        className={`flex-row justify-between ${!isList ? 'items-start' : 'items-center'
                            }`}
                    >
                        <View className={`flex-row h-8 ${isList ? 'items-center' : ''}`}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode={'tail'}
                                className="font-ibm-plex-sans-semibold text-xl flex-shrink text-white"
                            >
                                {freeBarber.fullName}
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
                                    freeBarber.type === BarberType.MaleHairdresser
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
                        <View className="flex-row pr-2 justify-between">
                            <Text className='text-base text-gray-500'>{freeBarber.type === BarberType.MaleHairdresser ? "Erkek" : "Kadın"}</Text>
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
                        style={{ marginTop: !isList ? -5 : -10 }}
                    >
                        <View className="flex-row items-center gap-1">
                            <StarRatingDisplay
                                rating={freeBarber.rating}
                                starSize={15}
                                starStyle={{ marginHorizontal: 0 }}
                            />
                            <Text className="text-white flex-1">{freeBarber.rating}</Text>
                            <TouchableOpacity
                                onPress={() => onPressRatings?.(freeBarber.id, freeBarber.fullName)}
                                activeOpacity={0.7}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text className="text-white underline mr-1 mb-0 text-xs">
                                    Yorumlar ({freeBarber.reviewCount})
                                </Text>
                            </TouchableOpacity>
                        </View>

                    </View>


                </View>
            </View>

            {!!freeBarber.offerings?.length && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-2"
                    contentContainerStyle={{ gap: 8 }}
                >
                    {freeBarber.offerings.map((s) => (
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
    );
};

export const FreeBarberMineCardComp = React.memo(
    FreeBarberMineCard,
    (prev, next) =>
        prev.freeBarber === next.freeBarber &&
        prev.isList === next.isList &&
        prev.expanded === next.expanded &&
        prev.cardWidthFreeBarber === next.cardWidthFreeBarber &&
        prev.showImageAnimation === next.showImageAnimation
);
