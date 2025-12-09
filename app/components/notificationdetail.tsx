import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useGetAllNotificationsQuery, useMarkNotificationReadMutation, api } from "../store/api";
import { useAppDispatch } from "../store/hook";
import type { NotificationDto } from "../types";
import { NotificationType } from "../types";

export function NotificationsSheet({
    onClose,
    onOpenAppointmentDecision,
}: {
    onClose?: () => void;
    onOpenAppointmentDecision?: (appointmentId: string, notificationId: string) => void;
}) {
    const dispatch = useAppDispatch();
    const { data, isFetching, refetch } = useGetAllNotificationsQuery();
    const [markRead] = useMarkNotificationReadMutation();

    const onPressItem = useCallback(
        async (n: NotificationDto) => {
            // ✅ AppointmentCreated: dokununca read yapma, karar sheet aç
            if (n.type === NotificationType.AppointmentCreated && n.appointmentId) {
                onOpenAppointmentDecision?.(n.appointmentId, n.id);
                return;
            }

            // ✅ Diğerleri: SADECE dokununca read
            dispatch(
                api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                    const found = draft?.find((x) => x.id === n.id);
                    if (found) found.isRead = true;
                })
            );

            try {
                if (!n.isRead) await markRead(n.id).unwrap();
            } catch {
                refetch();
            }
        },
        [dispatch, markRead, refetch, onOpenAppointmentDecision]
    );

    return (
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>Bildirimler</Text>
                <TouchableOpacity onPress={onClose}>
                    <Text style={{ color: "#f05e23", fontWeight: "600" }}>Kapat</Text>
                </TouchableOpacity>
            </View>

            <BottomSheetFlatList
                data={data ?? []}
                keyExtractor={(x: NotificationDto) => x.id}
                refreshing={isFetching}
                onRefresh={refetch}
                contentContainerStyle={{ paddingBottom: 18 }}
                renderItem={({ item }: { item: NotificationDto }) => {
                    const unread = !item.isRead;
                    return (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => onPressItem(item)}
                        >
                            <View
                                style={{
                                    padding: 12,
                                    borderRadius: 14,
                                    marginBottom: 10,
                                    backgroundColor: unread ? "#1c1d20" : "#151618",
                                    borderWidth: 1,
                                    borderColor: unread ? "#2a2c30" : "#1f2023",
                                }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    {unread && (
                                        <View
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 99,
                                                backgroundColor: "#f05e23",
                                                marginRight: 8,
                                            }}
                                        />
                                    )}
                                    <Text style={{ color: "white", fontWeight: unread ? "700" : "500", flex: 1 }}>
                                        {item.title}
                                    </Text>
                                    <Text style={{ color: "#8b8c90", fontSize: 12 }}>
                                        {new Date(item.createdAt).toLocaleString()}
                                    </Text>
                                </View>

                                {!!item.body && (
                                    <Text style={{ color: "#c9c9cb", marginTop: 6 }} numberOfLines={2}>
                                        {item.body}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={{ padding: 18 }}>
                        <Text style={{ color: "#8b8c90" }}>Bildirim yok</Text>
                    </View>
                }
            />
        </View>
    );
}
