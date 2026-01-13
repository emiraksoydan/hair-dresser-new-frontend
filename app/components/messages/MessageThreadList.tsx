/**
 * Shared message thread list component
 * Used across different user type message pages
 */

import React, { useMemo, useCallback } from 'react';
import { View, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { Text } from '../common/Text';
import { LegendList } from '@legendapp/list';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useGetChatThreadsQuery } from '../../store/api';
import { ChatThreadListItemDto, ChatThreadParticipantDto, AppointmentStatus, UserType, BarberType, ImageOwnerType } from '../../types';
import { LottieViewComponent } from '../common/lottieview';
import { resolveApiErrorMessage } from '../../utils/common/error';
import { SkeletonComponent } from '../common/skeleton';
import { OwnerAvatar } from '../common/owneravatar';
import { useFormatTime } from '../../utils/time/time-formatter';
import { getAppointmentStatusColor } from '../../utils/appointment/appointment-helpers';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import { useAuth } from '../../hook/useAuth';
import { useLanguage } from '../../hook/useLanguage';

interface MessageThreadListProps {
    routePrefix: string; // e.g., '/(customertabs)/(messages)' or '/(barberstoretabs)/(messages)'
    iconSource: string; // Icon name for the avatar (react-native-paper icon name)
}

export const MessageThreadList: React.FC<MessageThreadListProps> = ({ routePrefix, iconSource }) => {
    const router = useRouter();
    const { t } = useLanguage();
    const { data: threads, isLoading, refetch, isFetching, error, isError } = useGetChatThreadsQuery();
    const formatTime = useFormatTime();
    const { userType: currentUserType } = useAuth();

    // Backend zaten filtreliyor - backend'den gelen thread'leri olduğu gibi kullan
    // Backend filtresi:
    // - Favori thread'ler: En az 1 aktif favori varsa görünür
    // - Randevu thread'leri: Sadece Pending/Approved durumunda görünür

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
                    return t('labels.store');
                } else if (participant.userType === UserType.FreeBarber) {
                    return t('labels.freeBarber');
                } else if (participant.userType === UserType.Customer) {
                    return t('card.customer');
                }
                return '';
            };

            const participantLabel = getParticipantLabel();

            // BarberType bilgisini göster (eğer varsa)
            const getBarberTypeLabel = () => {
                if (participant.barberType === undefined || participant.barberType === null) {
                    return null;
                }

                if (participant.userType === UserType.FreeBarber) {
                    return participant.barberType === BarberType.MaleHairdresser 
                        ? t('barberType.maleHairdresserShort') 
                        : t('barberType.femaleHairdresserShort');
                } else if (participant.userType === UserType.BarberStore) {
                    if (participant.barberType === BarberType.MaleHairdresser) return t('barberType.maleHairdresserOf');
                    if (participant.barberType === BarberType.FemaleHairdresser) return t('barberType.femaleHairdresserOf');
                    return t('barberType.beautySalon');
                }
                return null;
            };

            const barberTypeLabel = getBarberTypeLabel();

            return (
                <View key={participant.userId} className={!isFirst ? 'mt-3' : ''} style={{ maxWidth: '100%' }}>
                    <View className="flex-row items-start" style={{ maxWidth: '100%' }}>
                        <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 items-center justify-center" style={{ flexShrink: 0 }}>
                            <OwnerAvatar
                                ownerId={participant.userId}
                                ownerType={ImageOwnerType.User}
                                fallbackUrl={participant.imageUrl}
                                imageClassName="w-full h-full"
                                iconSource={
                                    participant.userType === UserType.BarberStore
                                        ? "store"
                                        : participant.userType === UserType.FreeBarber
                                            ? "account-supervisor"
                                            : "account"
                                }
                                iconSize={20}
                                iconColor="white"
                                iconContainerClassName="bg-transparent"
                            />
                        </View>
                        <View className="ml-2 gap-1 flex-1" style={{ minWidth: 0, maxWidth: '100%', flexShrink: 1 }}>
                            <View className="flex-row gap-2 items-center flex-wrap" style={{ minWidth: 0, maxWidth: '100%' }}>
                                <Text className="text-white font-century-gothic-sans-bold text-base" numberOfLines={1} style={{ flexShrink: 1, minWidth: 0, maxWidth: '100%' }}>
                                    {displayName}
                                </Text>
                                {item.isFavoriteThread && isFirst && (
                                    <View className="px-2 py-1 rounded bg-yellow-900/20 border border-yellow-800/30 flex-row items-center">
                                        <Icon source="heart" size={12} color="#fbbf24" />
                                        <Text className="text-yellow-400 text-xs font-century-gothic-sans-medium ml-1">
                                            Favori
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View className="flex-row gap-2 items-center" style={{ minWidth: 0 }}>
                                {participantLabel && (
                                    <Text className="text-gray-400 text-xs font-century-gothic-sans-medium" style={{ flexShrink: 0 }}>
                                        {participantLabel}
                                    </Text>
                                )}
                                {barberTypeLabel && (
                                    <Text className="text-gray-500 text-xs" style={{ flexShrink: 0 }}>
                                        {barberTypeLabel}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
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
                                className="text-xs font-century-gothic-sans-medium"
                                style={{ color: statusColor }}
                            >
                                {statusText}
                            </Text>
                        </View>
                    </View>
                )}
                <View className="flex-row items-start" style={{ minWidth: 0 }}>
                    <View className="flex-1 pr-2" style={{ minWidth: 0, flexShrink: 1 }}>
                        {item.participants.length > 0 ? (
                            <View className="flex-col" style={{ maxWidth: '100%' }}>
                                {item.participants.map((p, idx) => renderParticipant(p, idx))}
                            </View>
                        ) : (
                            <View className="w-12 h-12 rounded-full bg-gray-700 items-center justify-center">
                                <Icon source={iconSource} size={24} color="white" />
                            </View>
                        )}

                        {item.lastMessagePreview && (
                            <View className="flex-row items-center gap-2 mt-3" style={{ marginLeft: item.participants.length > 0 ? 42 : 0, minWidth: 0, maxWidth: '100%' }}>
                                <Icon source="message-text" size={12} color={hasUnread ? "#22c55e" : "#6b7280"} />
                                <Text
                                    className={`text-sm mb-0 ${hasUnread ? 'text-white font-century-gothic-sans-medium' : 'text-gray-400 font-century-gothic-sans-regular'}`}
                                    numberOfLines={2}
                                    style={{ flexShrink: 1, minWidth: 0, maxWidth: '100%' }}
                                >
                                    {item.lastMessagePreview}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View className="items-end">
                        {item.lastMessageAt && (
                            <Text className="text-gray-500 text-xs mb-1">
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

    // Network/Server error durumu - öncelikli göster
    if (isError && error) {
        const isRtkQueryError = (e: unknown): e is { status?: unknown; data?: any } =>
            typeof e === 'object' && e !== null && 'status' in e;

        const status = isRtkQueryError(error) ? error.status : undefined;
        const isNetworkError = status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR';

        const backendMessage = isRtkQueryError(error) ? (error.data as any)?.message : undefined;
        const errorMessage =
            backendMessage ||
            (isNetworkError
                ? 'Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.'
                : resolveApiErrorMessage(error));

        return (
            <ScrollView
                className="flex-1 bg-[#151618]"
                contentContainerStyle={{ flexGrow: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={refetch}
                        tintColor="#f05e23"
                    />
                }
            >
                <LottieViewComponent
                    animationSource={require('../../../assets/animations/error.json')}
                    message={errorMessage}
                />
            </ScrollView>
        );
    }

    // Boş durum kontrolü
    const hasNoThreads = !threads || (Array.isArray(threads) && threads.length === 0);

    if (hasNoThreads) {
        return (
            <ScrollView
                className="flex-1 bg-[#151618]"
                contentContainerStyle={{ flexGrow: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={refetch}
                        tintColor="#f05e23"
                    />
                }
            >
                <LottieViewComponent message={MESSAGES.EMPTY_STATE.NO_MESSAGES} />
            </ScrollView>
        );
    }

    return (
        <View className="flex-1 bg-[#151618]">
            <LegendList
                data={threads ?? []}
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
