/**
 * Notification Participant View Component
 * Displays participant information in notifications based on recipient role
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import type { NotificationPayload } from '../../types';
import { UserType, BarberType } from '../../types';
import { getBarberTypeName } from '../../utils/store/barber-type';

interface NotificationParticipantViewProps {
    payload: NotificationPayload;
    recipientRole: string | undefined;
    isStoreInFavorites: boolean;
    isFreeBarberInFavorites: boolean;
    isCustomerInFavorites: boolean;
    formatRating: (r?: number) => any;
    onToggleFavorite?: (targetId: string) => void;
    isTogglingFavorite?: boolean;
}

export const NotificationParticipantView: React.FC<NotificationParticipantViewProps> = ({
    payload,
    recipientRole,
    isStoreInFavorites,
    isFreeBarberInFavorites,
    isCustomerInFavorites,
    formatRating,
    onToggleFavorite,
    isTogglingFavorite = false,
}) => {
    const hasStore = !!payload?.store;
    const hasFreeBarber = !!payload?.freeBarber;

    if (recipientRole === 'store') {
        return (
            <View className="flex-row gap-3">
                {payload.customer && (
                    <View className="flex-1 flex-row items-center">
                        {payload.customer.avatarUrl ? (
                            <Image source={{ uri: payload.customer.avatarUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                        ) : (
                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                <Icon source="account" size={24} color="#6b7280" />
                            </View>
                        )}
                        <View className="flex-1">
                            <Text className="text-[#9ca3af] text-xs">Müşteri</Text>
                            <Text className="text-white text-sm font-semibold">{payload.customer?.displayName || 'Müşteri'}</Text>
                            {isCustomerInFavorites && (
                                <View className="flex-row items-center mt-0.5">
                                    <Icon source="heart" size={12} color="#f05e23" />
                                    <Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
                <View className="flex-1">
                    {payload.freeBarber ? (
                        <View className="flex-row items-center">
                            {payload.freeBarber.avatarUrl ? (
                                <Image source={{ uri: payload.freeBarber.avatarUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                            ) : (
                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                    <Icon source="account-supervisor" size={24} color="#6b7280" />
                                </View>
                            )}
                            <View className="flex-1">
                                <Text className="text-[#9ca3af] text-xs">Traş Edecek</Text>
                                <Text className="text-white text-sm font-semibold">{payload.freeBarber?.displayName || 'Serbest Berber'}</Text>
                                {isFreeBarberInFavorites && (
                                    <View className="flex-row items-center mt-0.5">
                                        <Icon source="heart" size={12} color="#f05e23" />
                                        <Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : payload.chair?.manuelBarberId ? (
                        <View className="flex-row items-center">
                            {payload.chair.manuelBarberImageUrl ? (
                                <Image source={{ uri: payload.chair.manuelBarberImageUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                            ) : (
                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                    <Icon source="account" size={24} color="#6b7280" />
                                </View>
                            )}
                            <View className="flex-1">
                                <Text className="text-[#9ca3af] text-xs">Dükkan Berberi</Text>
                                <Text className="text-white text-sm font-semibold">{payload.chair.manuelBarberName}</Text>
                            </View>
                        </View>
                    ) : (
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                <Icon source="seat" size={24} color="#6b7280" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white text-sm font-semibold">{payload.chair?.chairName}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    if (recipientRole === 'freebarber') {
        return (
            <View>
                {payload.store && (
                    <View className="flex-row items-center mb-2">
                        {payload.store.imageUrl ? (
                            <Image source={{ uri: payload.store.imageUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                        ) : (
                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                <Icon source="store" size={24} color="#6b7280" />
                            </View>
                        )}
                        <View className="flex-1">
                            <Text className="text-[#9ca3af] text-xs">Berber Dükkanı</Text>
                            <Text className="text-white text-sm font-semibold">{payload.store.storeName}</Text>
                            {isStoreInFavorites && (
                                <View className="flex-row items-center mt-0.5">
                                    <Icon source="heart" size={12} color="#f05e23" />
                                    <Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
                {payload.customer && (
                    <View className="flex-row items-center">
                        {payload.customer.avatarUrl ? (
                            <Image source={{ uri: payload.customer.avatarUrl }} className="w-10 h-10 rounded-full mr-2" resizeMode="cover" />
                        ) : (
                            <View className="w-10 h-10 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                <Icon source="account" size={20} color="#6b7280" />
                            </View>
                        )}
                        <View className="flex-1">
                            <Text className="text-[#9ca3af] text-xs">Müşteri</Text>
                            <Text className="text-white text-sm font-semibold">{payload.customer?.displayName || 'Müşteri'}</Text>
                            {isCustomerInFavorites && (
                                <View className="flex-row items-center mt-0.5">
                                    <Icon source="heart" size={12} color="#f05e23" />
                                    <Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    }

    if (recipientRole === 'customer') {
        return (
            <View className="flex-row gap-3">
                {payload.store && (
                    <View className="flex-1 flex-row items-center">
                        {payload.store.imageUrl ? (
                            <Image source={{ uri: payload.store.imageUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                        ) : (
                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                <Icon source="store" size={24} color="#6b7280" />
                            </View>
                        )}
                        <View className="flex-1">
                            <Text className="text-[#9ca3af] text-xs">Berber Dükkanı</Text>
                            <Text className="text-white text-sm font-semibold">{payload.store.storeName}</Text>
                            {payload.store.type !== undefined && (
                                <Text className="text-[#9ca3af] text-xs mt-0.5">
                                    {getBarberTypeName(payload.store.type as BarberType)}
                                </Text>
                            )}
                            {payload.store.rating !== undefined && (
                                <View className="flex-row items-center mt-0.5">
                                    <Icon source="star" size={12} color="#fbbf24" />
                                    <Text className="text-[#fbbf24] text-xs ml-1">{formatRating(payload.store.rating)}</Text>
                                </View>
                            )}
                            {isStoreInFavorites && (
                                <View className="flex-row items-center mt-0.5">
                                    <Icon source="heart" size={12} color="#f05e23" />
                                    <Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                <View className="flex-1">
                    {payload.freeBarber ? (
                        <View className="flex-row items-center">
                            {payload.freeBarber.avatarUrl ? (
                                <Image source={{ uri: payload.freeBarber.avatarUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                            ) : (
                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                    <Icon source="account-supervisor" size={24} color="#6b7280" />
                                </View>
                            )}
                            <View className="flex-1">
                                <Text className="text-[#9ca3af] text-xs">Traş Edecek</Text>
                                <Text className="text-white text-sm font-semibold">{payload.freeBarber?.displayName || 'Serbest Berber'}</Text>
                                {payload.freeBarber?.rating !== undefined && (
                                    <View className="flex-row items-center mt-0.5">
                                        <Icon source="star" size={12} color="#fbbf24" />
                                        <Text className="text-[#fbbf24] text-xs ml-1">{formatRating(payload.freeBarber.rating)}</Text>
                                    </View>
                                )}
                                {isFreeBarberInFavorites && (
                                    <View className="flex-row items-center mt-0.5">
                                        <Icon source="heart" size={12} color="#f05e23" />
                                        <Text className="text-[#f05e23] text-xs ml-1">Favorilerinizde</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : payload.chair?.manuelBarberId ? (
                        <View className="flex-row items-center">
                            {payload.chair.manuelBarberImageUrl ? (
                                <Image source={{ uri: payload.chair.manuelBarberImageUrl }} className="w-12 h-12 rounded-full mr-2" resizeMode="cover" />
                            ) : (
                                <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                    <Icon source="account" size={24} color="#6b7280" />
                                </View>
                            )}
                            <View className="flex-1">
                                <Text className="text-[#9ca3af] text-xs">Manuel Berber</Text>
                                <Text className="text-white text-sm font-semibold">{payload.chair.manuelBarberName}</Text>
                                {payload.chair.manuelBarberRating !== undefined && (
                                    <View className="flex-row items-center mt-0.5">
                                        <Icon source="star" size={12} color="#fbbf24" />
                                        <Text className="text-[#fbbf24] text-xs ml-1">{formatRating(payload.chair.manuelBarberRating)}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-2 items-center justify-center">
                                <Icon source="seat" size={24} color="#6b7280" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white text-sm font-semibold">{payload.chair?.chairName}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    return null;
};
