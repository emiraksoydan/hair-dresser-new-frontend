import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../common/Text';
import { FreeBarGetDto, FavoriteTargetType } from '../../types';
import { useFavoriteToggle } from '../../hook/useFavoriteToggle';
import { useCallFreeBarberMutation } from '../../store/api';
import { useLanguage } from '../../hook/useLanguage';
import { CardImage } from '../common/CardImage';
import { CardHeader } from '../common/CardHeader';
import { FavoriteButton } from '../common/FavoriteButton';
import { RatingSection } from '../common/RatingSection';
import { StatusBadge } from '../common/StatusBadge';
import { ServiceOfferingsList } from '../common/ServiceOfferingsList';
import { TypeLabel } from '../common/TypeLabel';
import { getShortBarberTypeLabel } from '../../utils/card-helpers';

type Props = {
    freeBarber: FreeBarGetDto;
    isList: boolean;
    expanded: boolean;
    cardWidthFreeBarber: number;
    typeLabel?: string;
    typeLabelColor?: string;
    onPressUpdate?: (freeBarber: FreeBarGetDto) => void;
    mode?: 'default' | 'barbershop';
    onPressRatings?: (freeBarberId: string, freeBarberName: string) => void;
    onCallFreeBarber?: (freeBarberId: string) => void;
    storeId?: string;
    showImageAnimation?: boolean;
    isMapMode?: boolean;
};

const FreeBarberCard: React.FC<Props> = ({ freeBarber, isList, expanded, cardWidthFreeBarber, typeLabel, typeLabelColor = 'bg-green-500', onPressUpdate, mode = 'default', onPressRatings, onCallFreeBarber, storeId, showImageAnimation = true, isMapMode = false }) => {
    const carouselWidth = Math.max(0, cardWidthFreeBarber);
    const { t } = useLanguage();
    const [callFreeBarber, { isLoading: isCalling }] = useCallFreeBarberMutation();
    const [hasCalled, setHasCalled] = useState(false);
    const previousAvailableRef = useRef<boolean | null>(null);

    const isAvailable = freeBarber.isAvailable ?? true;

    const { isFavorite, favoriteCount, isLoading, toggleFavorite } = useFavoriteToggle({
        targetId: freeBarber.id,
        targetType: FavoriteTargetType.FreeBarber,
        initialIsFavorite: freeBarber.isFavorited ?? false,
        initialFavoriteCount: freeBarber.favoriteCount || 0,
        skipQuery: true, // FreeBarberCard uses isFavorited from props
    });

    const handlePressCard = useCallback(() => {
        onPressUpdate?.(freeBarber);
    }, [onPressUpdate, freeBarber]);

    const handlePressRatings = useCallback(() => {
        onPressRatings?.(freeBarber.id, freeBarber.fullName);
    }, [onPressRatings, freeBarber.id, freeBarber.fullName]);

    useEffect(() => {
        if (previousAvailableRef.current === false && isAvailable) {
            setHasCalled(false);
        }
        previousAvailableRef.current = isAvailable;
    }, [isAvailable]);

    const handleCallFreeBarber = useCallback(async () => {
        if (!storeId) {
            Alert.alert(t('common.error'), t('booking.selectStoreFirst'));
            return;
        }

        Alert.alert(
            t('booking.callBarber'),
            t('card.callBarberConfirm', { name: freeBarber.fullName }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('booking.callBarber'),
                    onPress: async () => {
                        try {
                            const freeBarberUserId = freeBarber.freeBarberUserId;
                            if (!freeBarberUserId) {
                                Alert.alert(t('common.error'), t('booking.freebarberUserNotFound'));
                                return;
                            }

                            await callFreeBarber({
                                storeId,
                                freeBarberUserId,
                            }).unwrap();
                            setHasCalled(true);
                            Alert.alert(t('common.success'), t('booking.barberCalled'));
                            if (onCallFreeBarber) {
                                onCallFreeBarber(freeBarber.id);
                            }
                        } catch (error: any) {
                            Alert.alert(t('common.error'), error?.data?.message || error?.message || t('booking.barberCallFailed'));
                        }
                    },
                },
            ]
        );
    }, [storeId, freeBarber.id, freeBarber.fullName, callFreeBarber, onCallFreeBarber]);
    return (
        <View
            style={{ width: cardWidthFreeBarber, overflow: 'hidden' }}
            className={expanded ? 'mt-4' : 'mt-0'}
        >

            <View className={isList ? '' : 'pl-4 py-2 rounded-lg bg-[#202123]'}>
                {!isList && (
                    <View className='flex-row justify-end px-2 pb-2'>
                        <StatusBadge
                            type={isAvailable ? 'available' : 'busy'}
                            isList={false}
                        />
                    </View>
                )}
                <View className={isList ? '' : 'flex flex-row'}>

                    <View className="relative mr-2">
                        <CardImage
                            images={freeBarber.imageList}
                            onPress={handlePressCard}
                            isList={isList}
                            width={isList ? carouselWidth : 112}
                            height={isList ? 250 : 112}
                            autoPlay={showImageAnimation}
                            isMapMode={isMapMode}
                        />
                        {isList && (
                            <View className='absolute top-2 right-[3] z-10 gap-2 justify-end flex-row items-center'>
                                {typeLabel && (
                                    <TypeLabel label={typeLabel} color={typeLabelColor} />
                                )}
                                <StatusBadge
                                    type="barber-type"
                                    barberType={freeBarber.type}
                                    isList={true}
                                />
                                <StatusBadge
                                    type={isAvailable ? 'available' : 'busy'}
                                    isList={true}
                                />
                                {mode === 'barbershop' && isAvailable && !hasCalled && (
                                    <TouchableOpacity
                                        onPress={handleCallFreeBarber}
                                        disabled={isCalling}
                                        className="bg-[#f05e23] flex-row items-center px-2 py-2 rounded-full shadow-sm"
                                        style={{ elevation: 5 }}
                                    >
                                        <Text className="text-white text-sm font-century-gothic-sans-semibold ml-1">
                                            {isCalling ? t('card.calling') : t('card.callBarber')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>

                    <View className="flex-1 flex-col gap-2">
                        <View
                            className={`flex-row justify-between ${!isList ? 'items-start' : 'items-center'}`}
                        >
                            <CardHeader
                                title={freeBarber.fullName}
                                isList={isList}
                                barberType={freeBarber.type}
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
                                <Text className='text-base text-gray-500'>
                                    {getShortBarberTypeLabel(freeBarber.type)}
                                </Text>
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
                                rating={freeBarber.rating}
                                reviewCount={freeBarber.reviewCount}
                                onPressRatings={handlePressRatings}
                            />
                        </View>
                    </View>
                </View>
            </View>

            <ServiceOfferingsList offerings={freeBarber.offerings || []} />
        </View>
    );
};

export const FreeBarberCardInner = React.memo(
    FreeBarberCard,
    (prev, next) => {
        const sameFreeBarber =
            prev.freeBarber.id === next.freeBarber.id &&
            prev.freeBarber.fullName === next.freeBarber.fullName &&
            prev.freeBarber.type === next.freeBarber.type &&
            prev.freeBarber.isAvailable === next.freeBarber.isAvailable &&
            prev.freeBarber.rating === next.freeBarber.rating &&
            prev.freeBarber.reviewCount === next.freeBarber.reviewCount &&
            prev.freeBarber.favoriteCount === next.freeBarber.favoriteCount &&
            prev.freeBarber.imageList === next.freeBarber.imageList &&
            prev.freeBarber.offerings === next.freeBarber.offerings;


        const sameProps =
            prev.isList === next.isList &&
            prev.expanded === next.expanded &&
            prev.cardWidthFreeBarber === next.cardWidthFreeBarber &&
            prev.typeLabel === next.typeLabel &&
            prev.typeLabelColor === next.typeLabelColor &&
            prev.mode === next.mode &&
            prev.storeId === next.storeId &&
            prev.onPressUpdate === next.onPressUpdate &&
            prev.onPressRatings === next.onPressRatings &&
            prev.onCallFreeBarber === next.onCallFreeBarber &&
            prev.showImageAnimation === next.showImageAnimation &&
            (prev.isMapMode ?? false) === (next.isMapMode ?? false);

        return sameFreeBarber && sameProps;
    }
);
