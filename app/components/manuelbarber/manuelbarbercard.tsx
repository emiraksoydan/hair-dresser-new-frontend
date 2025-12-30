// app/components/manuelbarber/manuelbarbercard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Icon } from 'react-native-paper';
import { useGetImagesByOwnerQuery } from '../../store/api';
import { ImageOwnerType, ManuelBarberFavoriteDto } from '../../types';

type Props = {
    manuelBarber: ManuelBarberFavoriteDto;
    isList: boolean;
    expanded: boolean;
    cardWidth: number;
    typeLabel?: string;
    typeLabelColor?: string;
    onPressUpdate?: (manuelBarber: ManuelBarberFavoriteDto) => void;
};

const ManuelBarberCard: React.FC<Props> = ({
    manuelBarber,
    isList,
    expanded,
    cardWidth,
    typeLabel,
    typeLabelColor = 'bg-orange-500',
    onPressUpdate
}) => {
    const shouldFetchCoverImage = !manuelBarber.imageUrl && !!manuelBarber.id;
    const { data: images } = useGetImagesByOwnerQuery(
        { ownerId: manuelBarber.id, ownerType: ImageOwnerType.ManuelBarber },
        { skip: !shouldFetchCoverImage }
    );

    const coverImage = manuelBarber.imageUrl ?? images?.[0]?.imageUrl;

    const handlePressCard = () => {
        onPressUpdate?.(manuelBarber);
    };

    return (
        <View
            style={{ width: cardWidth }}
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
                        <View className="absolute top-3 right-3 flex-row gap-2 z-10">
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
                                className="font-ibm-plex-sans-semibold text-xl flex-shrink text-white"
                            >
                                {manuelBarber.fullName}
                            </Text>
                            <Icon
                                source="account"
                                size={20}
                                color="gray"
                            />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

export const ManuelBarberCardInner = React.memo(
    ManuelBarberCard,
    (prev, next) =>
        prev.manuelBarber.id === next.manuelBarber.id &&
        prev.isList === next.isList &&
        prev.expanded === next.expanded &&
        prev.cardWidth === next.cardWidth
);
