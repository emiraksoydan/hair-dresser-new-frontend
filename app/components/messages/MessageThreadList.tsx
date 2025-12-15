/**
 * Shared message thread list component
 * Used across different user type message pages
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useGetChatThreadsQuery } from '../../store/api';
import { ChatThreadListItemDto, AppointmentStatus, UserType, BarberType } from '../../types';
import { LottieViewComponent } from '../common/lottieview';
import { SkeletonComponent } from '../common/skeleton';
import { useFormatTime } from '../../utils/time/time-formatter';
import { getAppointmentStatusColor } from '../../utils/appointment/appointment-helpers';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';

interface MessageThreadListProps {
    routePrefix: string; // e.g., '/(customertabs)/(messages)' or '/(barberstoretabs)/(messages)'
    iconSource: string; // Icon name for the avatar (react-native-paper icon name)
}

export const MessageThreadList: React.FC<MessageThreadListProps> = ({ routePrefix, iconSource }) => {
    const router = useRouter();
    const { data: threads, isLoading, refetch, isFetching } = useGetChatThreadsQuery();
    const formatTime = useFormatTime();

    // Backend zaten Pending/Approved filtreliyor ve favori thread'leri aktif favorilere göre filtreliyor
    // Frontend'de ekstra kontrol gerekmiyor, sadece threads'i kullanıyoruz

    const renderItem = useCallback(({ item }: { item: ChatThreadListItemDto }) => {
        const hasUnread = item.unreadCount > 0;
        const statusColor = item.status ? getAppointmentStatusColor(item.status) : undefined;
        const statusText = item.status === AppointmentStatus.Approved
            ? MESSAGES.APPOINTMENT_STATUS.APPROVED
            : item.status === AppointmentStatus.Pending
                ? MESSAGES.APPOINTMENT_STATUS.PENDING
                : null;

        const handlePress = () => {
            // Route prefix'e göre detail sayfasına yönlendir
            // ThreadId kullanarak yönlendirme yapıyoruz
            if (routePrefix.includes('(barberstoretabs)')) {
                router.push(`/(barberstoretabs)/(messages)/(details)/${item.threadId}`);
            } else if (routePrefix.includes('(customertabs)')) {
                router.push(`/(customertabs)/(messages)/${item.threadId}`);
            } else if (routePrefix.includes('(freebarbertabs)')) {
                router.push(`/(freebarbertabs)/(messages)/${item.threadId}`);
            } else {
                router.push(`${routePrefix}/${item.threadId}`);
            }
        };

        // Participant'ları render et
        const renderParticipant = (participant: ChatThreadParticipantDto, index: number) => {
            const isFirst = index === 0;
            return (
                <View key={participant.userId} className={`flex-row items-center ${!isFirst ? 'ml-2' : ''}`}>
                    <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 items-center justify-center">
                        {participant.imageUrl ? (
                            <Image
                                source={{ uri: participant.imageUrl }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <Icon
                                source={
                                    participant.userType === UserType.BarberStore
                                        ? "store"
                                        : participant.userType === UserType.FreeBarber
                                            ? "account-supervisor"
                                            : "account"
                                }
                                size={20}
                                color="white"
                            />
                        )}
                    </View>
                    <View className="ml-2">
                        <Text className="text-white text-xs font-ibm-plex-sans-medium" numberOfLines={1}>
                            {participant.displayName}
                        </Text>
                        {participant.barberType !== undefined && participant.barberType !== null && (
                            <Text className="text-gray-500 text-xs">
                                {participant.barberType === BarberType.MaleHairdresser ? "Erkek Kuaförü" :
                                    participant.barberType === BarberType.FemaleHairdresser ? "Kadın Kuaförü" :
                                        "Güzellik Salonu"}
                            </Text>
                        )}
                    </View>
                </View>
            );
        };

        return (
            <TouchableOpacity
                onPress={handlePress}
                className="bg-gray-800 rounded-xl p-4 mb-3 border border-gray-700/50"
            >
                <View className="flex-row items-start gap-3">
                    {/* Participants Row */}
                    {item.participants.length > 0 ? (
                        <View className="flex-row items-center">
                            {item.participants.map((p, idx) => renderParticipant(p, idx))}
                        </View>
                    ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-700 items-center justify-center">
                            <Icon source={iconSource} size={24} color="white" />
                        </View>
                    )}

                    <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                            <Text className="text-white font-ibm-plex-sans-bold text-base flex-1" numberOfLines={1}>
                                {item.title}
                            </Text>
                            <View className="flex-row items-center gap-2">
                                {/* Mesaj ikonu - her zaman göster, unread varsa badge ile */}
                                <View className="relative">
                                    <Icon source="message-text" size={18} color={hasUnread ? "#22c55e" : "#6b7280"} />
                                    {hasUnread && item.unreadCount > 0 && (
                                        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                                            <Text className="text-white text-[8px] font-bold">
                                                {item.unreadCount > 9 ? '9+' : item.unreadCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                {item.lastMessageAt && (
                                    <Text className="text-gray-500 text-xs">
                                        {formatTime(item.lastMessageAt)}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {item.lastMessagePreview && (
                            <Text
                                className={`text-sm mb-2 ${hasUnread ? 'text-white font-ibm-plex-sans-medium' : 'text-gray-400 font-ibm-plex-sans-regular'}`}
                                numberOfLines={2}
                            >
                                {item.lastMessagePreview}
                            </Text>
                        )}

                        <View className="flex-row items-center gap-2 flex-wrap">
                            {statusText && statusColor && (
                                <View
                                    className="px-2 py-1 rounded"
                                    style={{ backgroundColor: statusColor + COLORS.OPACITY.LIGHT }}
                                >
                                    <Text
                                        className="text-xs font-ibm-plex-sans-medium"
                                        style={{ color: statusColor }}
                                    >
                                        {statusText}
                                    </Text>
                                </View>
                            )}
                            {item.isFavoriteThread && (
                                <View className="px-2 py-1 rounded bg-yellow-900/20 border border-yellow-800/30 flex-row items-center">
                                    <Icon source="heart" size={12} color="#fbbf24" />
                                    <Text className="text-yellow-400 text-xs font-ibm-plex-sans-medium ml-1">
                                        Favori
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [router, routePrefix, iconSource, formatTime]);

    // Loading durumu
    if (isLoading) {
        return (
            <View className="flex-1 bg-[#151618] pt-4">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonComponent key={i} />)}
            </View>
        );
    }

    // Boş durum kontrolü
    const hasNoThreads = !threads || (Array.isArray(threads) && threads.length === 0);

    if (hasNoThreads) {
        return (
            <View className="flex-1 bg-[#151618]">
                <LottieViewComponent message={MESSAGES.EMPTY_STATE.NO_MESSAGES} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#151618]">
            <FlatList
                data={threads}
                keyExtractor={(item) => item.threadId}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={refetch}
                        tintColor={COLORS.UI.ACCENT}
                    />
                }
                renderItem={renderItem}
            />
        </View>
    );
};
