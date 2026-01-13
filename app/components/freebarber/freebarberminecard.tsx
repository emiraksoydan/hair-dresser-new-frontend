// app/components/FreeBarberMineCard.tsx
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { FreeBarberPanelDto, FavoriteTargetType } from '../../types';
import { useFavoriteToggle } from '../../hook/useFavoriteToggle';
import { CardImage } from '../common/CardImage';
import { CardHeader } from '../common/CardHeader';
import { FavoriteButton } from '../common/FavoriteButton';
import { RatingSection } from '../common/RatingSection';
import { StatusBadge } from '../common/StatusBadge';
import { ServiceOfferingsList } from '../common/ServiceOfferingsList';
import { getShortBarberTypeLabel } from '../../utils/card-helpers';
import { useUpdateFreeBarberAvailabilityMutation } from '../../store/api';
import { useAppDispatch } from '../../store/hook';
import { showSnack } from '../../store/snackbarSlice';
import { TouchableOpacity, ActivityIndicator } from 'react-native';

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
    const carouselWidth = Math.max(0, cardWidthFreeBarber - 8);
    const { isFavorite, favoriteCount, isLoading, toggleFavorite } = useFavoriteToggle({
        targetId: freeBarber.id,
        targetType: FavoriteTargetType.FreeBarber,
        initialIsFavorite: false,
        initialFavoriteCount: freeBarber.favoriteCount || 0,
        skipQuery: false,
    });
    const handlePressCard = useCallback(() => {
        onPressUpdate?.(freeBarber);
    }, [onPressUpdate, freeBarber]);

    const handlePressRatings = useCallback(() => {
        onPressRatings?.(freeBarber.id, freeBarber.fullName);
    }, [onPressRatings, freeBarber.id, freeBarber.fullName]);

    const dispatch = useAppDispatch();
    const [updateAvailability, { isLoading: isUpdatingAvailability }] = useUpdateFreeBarberAvailabilityMutation();

    const handleToggleAvailability = useCallback(async () => {
        try {
            const nextState = !freeBarber.isAvailable;
            const result = await updateAvailability(nextState).unwrap();
            dispatch(showSnack({ message: result.message, isError: !result.success }));
        } catch (err: any) {
            dispatch(showSnack({ message: err?.data?.message || 'Durum güncellenemedi', isError: true }));
        }
    }, [freeBarber.isAvailable, updateAvailability, dispatch]);

    return (
        <View
            style={{ width: cardWidthFreeBarber }}
            className={`${!expanded ? 'mt-0' : 'mt-4'} ${!isList ? 'pl-4 py-2 rounded-lg bg-[#202123]' : 'pl-0'
                }`}
        >
            {!isList && (
                <View className='flex-row justify-end px-2 pb-1'>
                    <StatusBadge
                        type={freeBarber.isAvailable ? 'available' : 'busy'}
                        isList={false}
                    />
                </View>
            )}
            <View className={`${!isList ? 'flex flex-row ' : ''}`}>
                <View className="relative mr-2">
                    <CardImage
                        images={freeBarber.imageList}
                        onPress={handlePressCard}
                        isList={isList}
                        width={isList ? carouselWidth : 112}
                        height={isList ? 320 : 112}
                        autoPlay={showImageAnimation}
                        className={!isList ? 'mr-2' : ''}
                    />
                    {isList && (
                        <View className="absolute top-3 right-3 flex-row gap-2 z-10">
                            <StatusBadge
                                type="barber-type"
                                barberType={freeBarber.type}
                                isList={isList}
                            />
                            <TouchableOpacity
                                onPress={handleToggleAvailability}
                                disabled={isUpdatingAvailability}
                                style={{ opacity: isUpdatingAvailability ? 0.7 : 1 }}
                            >
                                {isUpdatingAvailability ? (
                                    <View style={{ width: 80, height: 24, backgroundColor: '#2d2d2d', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                                        <ActivityIndicator size="small" color="#f05e23" />
                                    </View>
                                ) : (
                                    <StatusBadge
                                        type={freeBarber.isAvailable ? 'available' : 'busy'}
                                        isList={isList}
                                    />
                                )}
                            </TouchableOpacity>
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
                        <View className="flex-row pr-2 justify-between">
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
            <ServiceOfferingsList offerings={freeBarber.offerings || []} />
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
