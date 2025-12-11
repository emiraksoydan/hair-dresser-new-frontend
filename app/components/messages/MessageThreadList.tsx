/**
 * Shared message thread list component
 * Used across different user type message pages
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useGetChatThreadsQuery } from '../../store/api';
import { ChatThreadListItemDto, AppointmentStatus } from '../../types';
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

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#151618] pt-4">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonComponent key={i} />)}
            </View>
        );
    }

    if (!threads || threads.length === 0) {
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
                keyExtractor={(item) => item.appointmentId}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={refetch}
                        tintColor={COLORS.UI.ACCENT}
                    />
                }
                renderItem={({ item }: { item: ChatThreadListItemDto }) => {
                    const hasUnread = item.unreadCount > 0;
                    const statusColor = getAppointmentStatusColor(item.status);
                    const statusText = item.status === AppointmentStatus.Approved
                        ? MESSAGES.APPOINTMENT_STATUS.APPROVED
                        : MESSAGES.APPOINTMENT_STATUS.PENDING;

                    const handlePress = useCallback(() => {
                        router.push(`${routePrefix}/${item.appointmentId}`);
                    }, [router, routePrefix, item.appointmentId]);

                    return (
                        <TouchableOpacity
                            onPress={handlePress}
                            className="bg-gray-800 rounded-xl p-4"
                        >
                            <View className="flex-row items-start gap-3">
                                <View className="w-12 h-12 rounded-full bg-gray-700 items-center justify-center">
                                    <Icon source={iconSource} size={24} color="white" />
                                </View>

                                <View className="flex-1">
                                    <View className="flex-row items-center justify-between mb-1">
                                        <Text className="text-white font-ibm-plex-sans-bold text-base" numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        {item.lastMessageAt && (
                                            <Text className="text-gray-500 text-xs">
                                                {formatTime(item.lastMessageAt)}
                                            </Text>
                                        )}
                                    </View>

                                    {item.lastMessagePreview && (
                                        <Text
                                            className={`text-sm mb-2 ${hasUnread ? 'text-white font-ibm-plex-sans-medium' : 'text-gray-400 font-ibm-plex-sans-regular'}`}
                                            numberOfLines={2}
                                        >
                                            {item.lastMessagePreview}
                                        </Text>
                                    )}

                                    <View className="flex-row items-center gap-2">
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
                                        {hasUnread && (
                                            <View className="bg-green-500 rounded-full px-2 py-0.5">
                                                <Text className="text-white text-xs font-ibm-plex-sans-bold">
                                                    {item.unreadCount > MESSAGES.UNREAD_BADGE.MAX_DISPLAY
                                                        ? MESSAGES.UNREAD_BADGE.MAX_DISPLAY_TEXT
                                                        : item.unreadCount}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
};

