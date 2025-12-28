// app/components/customer/customercard.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { UserFavoriteDto, FavoriteTargetType } from '../../types';
import { useToggleFavoriteMutation, useIsFavoriteQuery } from '../../store/api';
import { useAuth } from '../../hook/useAuth';

type Props = {
    customer: UserFavoriteDto;
    isList: boolean;
    expanded: boolean;
    cardWidth: number;
    typeLabel?: string;
    typeLabelColor?: string;
    onPressUpdate?: (customer: UserFavoriteDto) => void;
    onPressRatings?: (targetId: string, targetName: string) => void;
};

const CustomerCard: React.FC<Props> = ({
    customer,
    isList,
    expanded,
    cardWidth,
    typeLabel,
    typeLabelColor = 'bg-purple-500',
    onPressUpdate,
    onPressRatings
}) => {
    const coverImage = customer.imageUrl;
    const { isAuthenticated } = useAuth();
    const [toggleFavorite, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();
    const { data: isFavoriteData } = useIsFavoriteQuery(customer.id, { skip: !isAuthenticated });
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteCount, setFavoriteCount] = useState(customer.favoriteCount || 0);
    const [isToggling, setIsToggling] = useState(false);

    const handlePressCard = useCallback(() => {
        onPressUpdate?.(customer);
    }, [onPressUpdate, customer]);

    // isFavoriteData değiştiğinde state'i güncelle
    useEffect(() => {
        if (isFavoriteData !== undefined) {
            setIsFavorite(isFavoriteData);
        }
    }, [isFavoriteData]);

    // customer.favoriteCount değiştiğinde state'i güncelle
    useEffect(() => {
        if (customer.favoriteCount !== undefined && customer.favoriteCount !== null) {
            setFavoriteCount(customer.favoriteCount);
            setIsToggling(false);
        }
    }, [customer.favoriteCount]);

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
        setIsToggling(true);

        try {
            const result = await toggleFavorite({
                targetId: customer.id,
                targetType: FavoriteTargetType.Customer,
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
    }, [isAuthenticated, customer.id, toggleFavorite, isFavorite, favoriteCount]);

    return (
        <View
            style={{ width: cardWidth, overflow: 'hidden' }}
            className={`${!expanded ? 'mt-0' : 'mt-4'} ${!isList ? 'pl-4 py-2 rounded-lg bg-[#202123]' : 'pl-0'}`}
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
                    {isList && (
                        <View className='absolute top-2 right-[3] z-10 gap-2 justify-end flex-row items-center'>
                            {typeLabel && (
                                <View className={`${typeLabelColor} px-2 py-1 rounded-xl flex-row items-center justify-center`}>
                                    <Text className="text-white text-base font-ibm-plex-sans-medium">
                                        {typeLabel}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
                <View className="flex-1 flex-col gap-2">
                    <View
                        className={`flex-row justify-between ${!isList ? 'items-start' : 'items-center'}`}
                    >
                        <View className={`flex-row h-8 flex-1 ${isList ? 'items-center' : ''}`}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode={'tail'}
                                style={{ fontSize: 20 }}
                                className="font-ibm-plex-sans-semibold text-xl flex-shrink text-white"
                            >
                                {customer.firstName} {customer.lastName}
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
                                icon="account"
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
                                    className={`text-white font-ibm-plex-sans-regular text-xs ${!isList ? 'pb-3 ml-[-8px] mr-2' : 'pb-2'}`}
                                >
                                    ({favoriteCount})
                                </Text>
                            </View>
                        )}
                    </View>

                    {!isList && (
                        <View className="flex-row justify-between pr-2">
                            <Text className='text-base text-gray-500'>Müşteri</Text>
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
                                <Text className={`text-white font-ibm-plex-sans-regular text-xs pb-1`}>
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
                                rating={customer.rating || 0}
                                starSize={15}
                                starStyle={{ marginHorizontal: 0 }}
                            />
                            <Text className="text-white flex-1">{customer.rating?.toFixed(1) || '0.0'}</Text>
                            {onPressRatings && (
                                <TouchableOpacity onPress={() => onPressRatings(customer.id, `${customer.firstName} ${customer.lastName}`)}>
                                    <Text className="text-white underline mr-0 mb-0 text-xs">
                                        Yorumlar
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <Text className="text-white text-xs">({customer.reviewCount || 0})</Text>

                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

export const CustomerCardInner = CustomerCard;

export default CustomerCard;
