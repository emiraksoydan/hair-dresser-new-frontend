// app/components/StoreCard.tsx
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { BarberType, FreeBarGetDto } from '../../types';

type Props = {
    freeBarber: FreeBarGetDto;
    isList: boolean;
    expanded: boolean;
    cardWidthFreeBarber: number;
    onPressUpdate?: (freeBarber: FreeBarGetDto) => void;
    mode?: 'default' | 'barbershop';

};

const FreeBarberCard: React.FC<Props> = ({ freeBarber, isList, expanded, cardWidthFreeBarber, onPressUpdate, mode = 'default', }) => {
    const coverImage = freeBarber.imageList?.[0]?.imageUrl;

    const isAvailable = freeBarber.isAvailable ?? true;
    const handlePressCard = useCallback(() => {
        onPressUpdate?.(freeBarber);
    }, [onPressUpdate, freeBarber]);
    return (
        <View
            style={{ width: cardWidthFreeBarber }}
            className={`${!expanded ? 'mt-0' : 'mt-4'} ${!isList ? 'pl-4 py-2 rounded-lg bg-[#202123]' : 'pl-0'
                }`}
        >
            {!isList && (
                <View className='flex-row justify-end px-2 pb-2'>
                    <View className={`${freeBarber.isAvailable ? 'bg-green-600' : 'bg-red-600'} px-2 py-1 rounded-xl flex-row items-center justify-center`}>
                        <Text className="text-white text-sm font-ibm-plex-sans-medium">
                            {freeBarber.isAvailable ? 'Müsait' : 'Meşgul'}
                        </Text>
                    </View>
                </View>
            )}
            <View className={`${!isList ? 'flex flex-row ' : ''}`}>
                <TouchableOpacity onPress={handlePressCard} className="relative mr-2">
                    <Image
                        defaultSource={require('../../assets/images/empty.png')}
                        className={`${isList ? 'w-full h-80' : 'h-28 w-28 mr-2'} rounded-lg mb-0`}
                        source={
                            coverImage
                                ? { uri: coverImage }
                                : require('../../assets/images/empty.png')
                        }
                        resizeMode={'cover'}
                    />
                    {isList && (
                        <View className='absolute top-2 right-[3] z-10 gap-2 justify-end flex-row items-center'>
                            <TouchableOpacity
                                onPress={() => { }}
                                className={` ${freeBarber.type == BarberType.MaleHairdresser ? 'bg-[#4c8ff7]' : 'bg-[#ff69b4]'}  flex-row items-center px-2 py-2 rounded-full shadow-sm`}
                                style={{ elevation: 5 }}
                            >
                                <Text className="text-white text-sm font-ibm-plex-sans-semibold ml-1">
                                    {freeBarber.type == BarberType.MaleHairdresser ? "Erkek" : "Kadın"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { }}
                                className={`  ${isAvailable ? 'bg-[#2e6a45]' : 'bg-[#b24949]'}  flex-row items-center px-2 py-2 rounded-full shadow-sm`}
                                style={{ elevation: 5 }}
                            >
                                <Text className="text-white text-sm font-ibm-plex-sans-semibold ml-1">
                                    {isAvailable ? "Müsait" : "Meşgul"}
                                </Text>
                            </TouchableOpacity>
                            {mode === 'barbershop' && isAvailable && (
                                <TouchableOpacity
                                    onPress={() => { }}
                                    className=" bg-[#f05e23] flex-row items-center px-2 py-2 rounded-full shadow-sm"
                                    style={{ elevation: 5 }}
                                >
                                    <Text className="text-white text-sm font-ibm-plex-sans-semibold ml-1">
                                        Berberi Çağır
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                </TouchableOpacity>
                <View className="flex-1 flex-col gap-2">
                    <View
                        className={`flex-row justify-between ${!isList ? 'items-start' : 'items-center'
                            }`}
                    >
                        <View className={`flex-row h-8 flex-1 ${isList ? 'items-center' : ''}`}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode={'tail'}
                                style={{ fontSize: 20 }}
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
                                    iconColor="gray"
                                    icon="heart"
                                    style={{
                                        marginTop: !isList ? -5 : 0,
                                        marginRight: !isList ? 0 : -8,
                                    }}
                                    onPress={() => { }}
                                />
                                <Text
                                    className={`text-white font-ibm-plex-sans-regular text-xs ${!isList ? 'pb-3 ml-[-8px] mr-2' : 'pb-2'
                                        }`}
                                >
                                    ({freeBarber.favoriteCount})
                                </Text>
                            </View>
                        )}
                    </View>
                    {!isList && (
                        <View className="flex-row  justify-between pr-2 ">
                            <Text className='text-base text-gray-500'>{freeBarber.type === BarberType.MaleHairdresser ? "Erkek" : 'Kadın'}</Text>
                            <View className="flex-row items-center gap-1">
                                <Icon
                                    size={25}
                                    color="gray"
                                    source={"heart"}
                                />
                                <Text
                                    className={`text-white font-ibm-plex-sans-regular text-xs pb-1`}
                                >
                                    ({freeBarber.favoriteCount})
                                </Text>
                            </View>
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
                            <TouchableOpacity onPress={() => { }}>
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

export const FreeBarberCardInner = React.memo(
    FreeBarberCard,
    (prev, next) =>
        prev.freeBarber.id === next.freeBarber.id &&
        prev.isList === next.isList &&
        prev.expanded === next.expanded &&
        prev.cardWidthFreeBarber === next.cardWidthFreeBarber
);
