// app/components/customer/customercard.tsx
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { UserFavoriteDto, FavoriteTargetType } from '../../types';
import { useFavoriteToggle } from '../../hook/useFavoriteToggle';
import { FavoriteButton } from '../common/FavoriteButton';
import { RatingSection } from '../common/RatingSection';
import { CardImage } from '../common/CardImage';
import { CardHeader } from '../common/CardHeader';
import { TypeLabel } from '../common/TypeLabel';
import { useLanguage } from '../../hook/useLanguage';

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
    const customerName = `${customer.firstName} ${customer.lastName}`;
    const { t } = useLanguage();
    const { isFavorite, favoriteCount, isLoading, toggleFavorite } = useFavoriteToggle({
        targetId: customer.id,
        targetType: FavoriteTargetType.Customer,
        initialIsFavorite: false,
        initialFavoriteCount: customer.favoriteCount || 0,
    });

    const handlePressCard = useCallback(() => {
        onPressUpdate?.(customer);
    }, [onPressUpdate, customer]);

    const handlePressRatings = useCallback(() => {
        onPressRatings?.(customer.id, customerName);
    }, [onPressRatings, customer.id, customerName]);

    return (
        <View
            style={{ width: cardWidth, overflow: 'hidden' }}
            className={`${!expanded ? 'mt-0' : 'mt-4'} ${!isList ? 'pl-4 py-2 rounded-lg bg-[#202123]' : 'pl-0'}`}
        >
            <View className={`${!isList ? 'flex flex-row ' : ''}`}>
                <View className="relative mr-2">
                    <CardImage
                        singleImageUrl={customer.imageUrl}
                        onPress={handlePressCard}
                        isList={isList}
                        width={isList ? cardWidth : 112}
                        height={isList ? 320 : 112}
                    />
                    {isList && typeLabel && (
                        <View className='absolute top-2 right-[3] z-10 gap-2 justify-end flex-row items-center'>
                            <TypeLabel label={typeLabel} color={typeLabelColor} />
                        </View>
                    )}
                </View>
                <View className="flex-1 flex-col gap-2">
                    <View
                        className={`flex-row justify-between ${!isList ? 'items-start' : 'items-center'}`}
                    >
                        <CardHeader
                            title={customerName}
                            isList={isList}
                            icon="account"
                        />
                        {isList && (
                            <FavoriteButton
                                isFavorite={isFavorite}
                                favoriteCount={favoriteCount}
                                isLoading={isLoading}
                                onPress={toggleFavorite}
                                variant="icon"
                                className="pb-2"
                            />
                        )}
                    </View>

                    {!isList && (
                        <View className="flex-row justify-between pr-2">
                            <Text className='text-base text-gray-500'>{t('card.customer')}</Text>
                            <FavoriteButton
                                isFavorite={isFavorite}
                                favoriteCount={favoriteCount}
                                isLoading={isLoading}
                                onPress={toggleFavorite}
                                variant="button"
                                className="pb-1"
                            />
                        </View>
                    )}

                    <View
                        className="flex-row justify-between items-center"
                        style={{ marginTop: !isList ? -5 : -10 }}
                    >
                        <RatingSection
                            rating={customer.rating || 0}
                            reviewCount={customer.reviewCount || 0}
                            onPressRatings={handlePressRatings}
                            showReviewsLink={!!onPressRatings}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

export const CustomerCardInner = CustomerCard;

export default CustomerCard;
