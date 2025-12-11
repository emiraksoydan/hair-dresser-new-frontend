import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useGetAllNotificationsQuery } from '../../store/api';
import { NotificationType, AppointmentStatus, NotificationPayload } from '../../types';
import { LottieViewComponent } from '../../components/common/lottieview';
import { SkeletonComponent } from '../../components/common/skeleton';
import { fmtDateOnly } from '../../utils/time/time-helper';
import { getAppointmentStatusColor, getAppointmentStatusText } from '../../utils/appointment/appointment-helpers';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';

const CustomerAppointmentPage = () => {
    const router = useRouter();
    const { data: notifications, isLoading, refetch, isFetching } = useGetAllNotificationsQuery();

    // Appointment ile ilgili notification'ları filtrele
    const appointmentNotifications = useMemo(() => {
        if (!notifications) return [];
        return notifications.filter(n =>
            n.type === NotificationType.AppointmentCreated ||
            n.type === NotificationType.AppointmentApproved ||
            n.type === NotificationType.AppointmentRejected ||
            n.type === NotificationType.AppointmentCancelled ||
            n.type === NotificationType.AppointmentCompleted ||
            n.type === NotificationType.AppointmentUnanswered ||
            n.type === NotificationType.AppointmentDecisionUpdated
        );
    }, [notifications]);


    const formatDate = useCallback((dateStr: string): string => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }, []);

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#151618] pt-4">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonComponent key={i} />)}
            </View>
        );
    }

    if (appointmentNotifications.length === 0) {
        return (
            <View className="flex-1 bg-[#151618]">
                <LottieViewComponent message={MESSAGES.EMPTY_STATE.NO_APPOINTMENTS} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#151618]">
            <FlatList
                data={appointmentNotifications}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={refetch}
                        tintColor={COLORS.UI.ACCENT}
                    />
                }
                renderItem={({ item }) => {
                    let payload: NotificationPayload | null = null;
                    try {
                        payload = JSON.parse(item.payloadJson) as NotificationPayload;
                    } catch {
                        payload = null;
                    }

                    const appointmentId = item.appointmentId || payload?.appointmentId;
                    const status = (payload?.status as AppointmentStatus | undefined) ?? AppointmentStatus.Pending;
                    const date = payload?.date || item.createdAt;
                    const startTime = payload?.startTime || '';
                    const endTime = payload?.endTime || '';
                    const storeName = payload?.store?.storeName || MESSAGES.APPOINTMENT_DETAILS.STORE_DEFAULT_NAME;

                    const handlePress = () => {
                        if (appointmentId) {
                            // TODO: Appointment detay sayfasına yönlendir
                            // router.push(`/(customertabs)/(appointment)/${appointmentId}`);
                        }
                    };

                    return (
                        <TouchableOpacity
                            onPress={handlePress}
                            className="bg-gray-800 rounded-xl p-4"
                        >
                            <View className="flex-row justify-between items-start mb-2">
                                <View className="flex-1">
                                    <Text className="text-white font-ibm-plex-sans-bold text-lg mb-1">
                                        {item.title}
                                    </Text>
                                    <Text className="text-gray-400 font-ibm-plex-sans-regular text-sm">
                                        {storeName}
                                    </Text>
                                </View>
                                <View
                                    className="px-3 py-1 rounded-lg"
                                    style={{ backgroundColor: getAppointmentStatusColor(status) + COLORS.OPACITY.LIGHT }}
                                >
                                    <Text
                                        className="font-ibm-plex-sans-medium text-xs"
                                        style={{ color: getAppointmentStatusColor(status) }}
                                    >
                                        {getAppointmentStatusText(status)}
                                    </Text>
                                </View>
                            </View>

                            {date && (
                                <View className="flex-row items-center gap-2 mt-2">
                                    <Icon source="calendar" size={16} color={COLORS.STATUS.DEFAULT} />
                                    <Text className="text-gray-300 font-ibm-plex-sans-regular text-sm">
                                        {formatDate(date)}
                                    </Text>
                                    {startTime && endTime && (
                                        <>
                                            <Text className="text-gray-500">•</Text>
                                            <Text className="text-gray-300 font-ibm-plex-sans-regular text-sm">
                                                {startTime.substring(0, 5)} - {endTime.substring(0, 5)}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            )}

                            {item.body && (
                                <Text className="text-gray-400 font-ibm-plex-sans-regular text-sm mt-2">
                                    {item.body}
                                </Text>
                            )}

                            <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-700">
                                <Text className="text-gray-500 font-ibm-plex-sans-regular text-xs">
                                    {formatDate(item.createdAt)}
                                </Text>
                                {!item.isRead && (
                                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.UI.ACCENT }} />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
};

export default CustomerAppointmentPage;
