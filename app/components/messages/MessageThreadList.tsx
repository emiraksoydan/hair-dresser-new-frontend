/**
 * Shared message thread list component
 * Used across different user type message pages
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, ScrollView } from 'react-native';
import { LegendList } from '@legendapp/list';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useGetChatThreadsQuery } from '../../store/api';
import { ChatThreadListItemDto, ChatThreadParticipantDto, AppointmentStatus, UserType, BarberType } from '../../types';
import { LottieViewComponent } from '../common/lottieview';
import { SkeletonComponent } from '../common/skeleton';
import { useFormatTime } from '../../utils/time/time-formatter';
import { getAppointmentStatusColor } from '../../utils/appointment/appointment-helpers';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import { useAuth } from '../../hook/useAuth';

interface MessageThreadListProps {
    routePrefix: string; // e.g., '/(customertabs)/(messages)' or '/(barberstoretabs)/(messages)'
    iconSource: string; // Icon name for the avatar (react-native-paper icon name)
}

export const MessageThreadList: React.FC<MessageThreadListProps> = ({ routePrefix, iconSource }) => {
    const router = useRouter();
    const { data: threads, isLoading, refetch, isFetching } = useGetChatThreadsQuery();
    const formatTime = useFormatTime();
    const { userType: currentUserType } = useAuth();

    // Backend zaten filtreliyor ama frontend'de de ekstra güvenlik kontrolü yapıyoruz
    // Favori thread'ler: Backend'den gelen thread zaten görünür (en az 1 aktif favori var)
    // Randevu thread'leri: Sadece Pending/Approved durumunda görünür olmalı
    const filteredThreads = useMemo(() => {
        if (!threads) return [];
        return threads.filter(thread => {
            if (thread.isFavoriteThread) {
                // Favori thread: Backend'den gelen thread zaten görünür (aktif favori var)
                return true;
            } else {
                // Randevu thread'i: Sadece Pending/Approved durumunda görünür
                if (thread.status !== undefined && thread.status !== null) {
                    return thread.status === AppointmentStatus.Pending || thread.status === AppointmentStatus.Approved;
                }
                // Status yoksa (null/undefined) görünür olmamalı
                return false;
            }
        });
    }, [threads]);

    const renderItem = useCallback(({ item }: { item: ChatThreadListItemDto }) => {
        const hasUnread = item.unreadCount > 0;
        const statusColor = item.status ? getAppointmentStatusColor(item.status) : undefined;
        const statusText = item.status === AppointmentStatus.Approved
            ? MESSAGES.APPOINTMENT_STATUS.APPROVED
            : item.status === AppointmentStatus.Pending
                ? MESSAGES.APPOINTMENT_STATUS.PENDING
                : null;

        const handlePress = () => {
            // Screens klasöründeki chat sayfasına yönlendir
            router.push(`/(screens)/chat/${item.threadId}`);
        };

        // Participant'ları render et - kullanıcı türüne göre görünüm
        const renderParticipant = (participant: ChatThreadParticipantDto, index: number) => {
            const isFirst = index === 0;
            const displayName = participant.displayName;

            // Kullanıcı türüne göre participant etiketi belirle
            // ÖNEMLİ: Her kullanıcı kendi bakış açısından diğer kişileri görmeli
            const getParticipantLabel = () => {
                // Eğer participant kendi türümüzle aynıysa, tür etiketi gösterme
                if (participant.userType === currentUserType) {
                    return '';
                }

                // Participant'ın türüne göre etiket
                if (participant.userType === UserType.BarberStore) {
                    return 'Dükkan';
                } else if (participant.userType === UserType.FreeBarber) {
                    return 'Serbest Berber';
                } else if (participant.userType === UserType.Customer) {
                    return 'Müşteri';
                }
                return '';
            };

            const participantLabel = getParticipantLabel();
            console.log(participant);

            // BarberType bilgisini göster (eğer varsa)
            const getBarberTypeLabel = () => {
                if (participant.barberType === undefined || participant.barberType === null) {
                    return null;
                }

                if (participant.userType === UserType.FreeBarber) {
                    return participant.barberType === BarberType.MaleHairdresser ? "Erkek" : "Kadın";
                } else if (participant.userType === UserType.BarberStore) {
                    if (participant.barberType === BarberType.MaleHairdresser) return "Erkek Berberi";
                    if (participant.barberType === BarberType.FemaleHairdresser) return "Kadın Kuaförü";
                    return "Güzellik Salonu";
                }
                return null;
            };

            const barberTypeLabel = getBarberTypeLabel();

            return (
                <View key={participant.userId}>
                    <View className={`flex-row items-start ${!isFirst ? 'ml-2' : ''}`}>
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
                        <View className="ml-2 gap-1">
                            <View className='flex-row gap-2 items-center flex-wrap'>
                                <Text className="text-white font-ibm-plex-sans-bold text-base" numberOfLines={1}>
                                    {displayName}
                                </Text>
                                {item.isFavoriteThread && (
                                    <View className="px-2 py-1 rounded bg-yellow-900/20 border border-yellow-800/30 flex-row items-center">
                                        <Icon source="heart" size={12} color="#fbbf24" />
                                        <Text className="text-yellow-400 text-xs font-ibm-plex-sans-medium ml-1">
                                            Favori
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View className='flex-row gap-2 items-center'>
                                {participantLabel && (
                                    <Text className="text-gray-400 text-xs font-ibm-plex-sans-medium">
                                        {participantLabel} -
                                    </Text>
                                )}
                                {barberTypeLabel && (
                                    <Text className="text-gray-500 text-xs">
                                        {barberTypeLabel}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {item.lastMessagePreview && (
                        <View className='flex-row items-center gap-2 mt-2' style={{ marginLeft: 42 }}>
                            <Icon source="message-text" size={12} color={hasUnread ? "#22c55e" : "#6b7280"} />
                            <Text
                                className={`text-sm mb-0 ${hasUnread ? 'text-white font-ibm-plex-sans-medium' : 'text-gray-400 font-ibm-plex-sans-regular'}`}
                                numberOfLines={2}
                            >
                                {item.lastMessagePreview}
                            </Text>
                        </View>

                    )}
                </View>


            );
        };

        return (
            <TouchableOpacity
                onPress={handlePress}
                className="bg-gray-800 rounded-xl pt-2 p-4 mb-3 border border-gray-700/50"
            >
                {statusText && statusColor && (
                    <View className="flex-row items-center mb-2 justify-end">
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
                    </View>
                )}
                <View className="flex-row justify-between">
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
                        <View className="flex-row items-center justify-end gap-2">
                            {/* Mesaj ikonu - her zaman göster, unread varsa badge ile */}
                            {item.lastMessageAt && (
                                <Text className="text-gray-500 text-xs">
                                    {new Date(item.lastMessageAt).toLocaleString('tr-TR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            )}
                            <View className="relative items-center justify-center">
                                <Icon source="message-text" size={18} color={hasUnread ? "#22c55e" : "#6b7280"} />
                                {hasUnread && item.unreadCount > 0 && (
                                    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                                        <Text className="text-white text-[8px] font-bold">
                                            {item.unreadCount > 9 ? '9+' : item.unreadCount}
                                        </Text>
                                    </View>
                                )}
                            </View>

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
            <LegendList
                data={filteredThreads}
                keyExtractor={(item) => item.threadId}
                estimatedItemSize={100}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                // Performance optimizations
                recycleItems={true} // Item recycling için
                drawDistance={250} // Render mesafesi
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={refetch}
                        tintColor="#f05e23"
                    />
                }
            />
        </View>
    );
};
