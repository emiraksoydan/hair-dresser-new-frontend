import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Modal } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Icon } from "react-native-paper";
import { useGetAllNotificationsQuery, useMarkNotificationReadMutation, api } from "../store/api";
import { useAppDispatch } from "../store/hook";
import type { NotificationDto, NotificationPayload } from "../types";
import { NotificationType } from "../types";
import { fmtDateOnly } from "../utils/time/time-helper";

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
    const [selectedNotification, setSelectedNotification] = useState<NotificationDto | null>(null);

    const onPressItem = useCallback(
        async (n: NotificationDto) => {
            // ✅ AppointmentCreated: dokununca read yapma, karar sheet aç
            if (n.type === NotificationType.AppointmentCreated && n.appointmentId) {
                onOpenAppointmentDecision?.(n.appointmentId, n.id);
                return;
            }

            // Detay modalını aç
            setSelectedNotification(n);

            // ✅ Diğerleri: SADECE dokununca read
            if (!n.isRead) {
                dispatch(
                    api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                        const found = draft?.find((x) => x.id === n.id);
                        if (found) found.isRead = true;
                    })
                );

                try {
                    await markRead(n.id).unwrap();
                } catch {
                    refetch();
                }
            }
        },
        [dispatch, markRead, refetch, onOpenAppointmentDecision]
    );

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return "";
        try {
            // "HH:mm:ss" veya "HH:mm" formatından sadece saat:dakika al
            const parts = timeStr.split(":");
            return `${parts[0]}:${parts[1]}`;
        } catch {
            return timeStr;
        }
    };

    const formatDate = (dateStr: string) => {
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
    };

    return (
        <>
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
                        let payload: NotificationPayload | null = null;
                        try {
                            payload = JSON.parse(item.payloadJson);
                        } catch {}

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
                                            {formatDate(item.createdAt)}
                                        </Text>
                                    </View>

                                    {!!item.body && (
                                        <Text style={{ color: "#c9c9cb", marginTop: 6 }} numberOfLines={2}>
                                            {item.body}
                                        </Text>
                                    )}

                                    {/* Payload'dan özet bilgiler */}
                                    {payload && (
                                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#2a2c30" }}>
                                            {payload.date && (
                                                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                                                    <Icon source="calendar" size={14} color="#6b7280" />
                                                    <Text style={{ color: "#9ca3af", fontSize: 12, marginLeft: 6 }}>
                                                        {formatDate(payload.date)}
                                                    </Text>
                                                    {payload.startTime && payload.endTime && (
                                                        <Text style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>
                                                            {formatTime(payload.startTime)} - {formatTime(payload.endTime)}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                            {payload.store?.storeName && (
                                                <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                                                    📍 {payload.store.storeName}
                                                </Text>
                                            )}
                                        </View>
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

            {/* Detay Modal */}
            <Modal
                visible={selectedNotification !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedNotification(null)}
            >
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
                    <View style={{ backgroundColor: "#151618", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", padding: 20 }}>
                        {selectedNotification && (
                            <>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                    <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>Bildirim Detayı</Text>
                                    <TouchableOpacity onPress={() => setSelectedNotification(null)}>
                                        <Icon source="close" size={24} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <NotificationDetailContent notification={selectedNotification} />
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

function NotificationDetailContent({ notification }: { notification: NotificationDto }) {
    const payload: NotificationPayload | null = useMemo(() => {
        try {
            return JSON.parse(notification.payloadJson);
        } catch {
            return null;
        }
    }, [notification.payloadJson]);

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return "";
        try {
            const parts = timeStr.split(":");
            return `${parts[0]}:${parts[1]}`;
        } catch {
            return timeStr;
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('tr-TR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                weekday: 'long'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <View style={{ gap: 16 }}>
            {/* Başlık */}
            <View style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#2a2c30" }}>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
                    {notification.title}
                </Text>
                <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                    {formatDate(notification.createdAt)}
                </Text>
            </View>

            {/* Body */}
            {notification.body && (
                <View>
                    <Text style={{ color: "#c9c9cb", fontSize: 14, lineHeight: 20 }}>
                        {notification.body}
                    </Text>
                </View>
            )}

            {/* Payload Detayları */}
            {payload && (
                <View style={{ gap: 16 }}>
                    {/* Randevu Bilgileri */}
                    {payload.appointmentId && (
                        <View style={{ backgroundColor: "#1c1d20", padding: 16, borderRadius: 12 }}>
                            <Text style={{ color: "#f05e23", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
                                Randevu Bilgileri
                            </Text>

                            {payload.date && (
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                                    <Icon source="calendar" size={20} color="#6b7280" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={{ color: "#9ca3af", fontSize: 12 }}>Tarih</Text>
                                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                                            {formatDate(payload.date)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {payload.startTime && payload.endTime && (
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                                    <Icon source="clock-outline" size={20} color="#6b7280" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={{ color: "#9ca3af", fontSize: 12 }}>Saat</Text>
                                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                                            {formatTime(payload.startTime)} - {formatTime(payload.endTime)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {payload.chair && (
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                                    <Icon source="seat" size={20} color="#6b7280" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={{ color: "#9ca3af", fontSize: 12 }}>Koltuk</Text>
                                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                                            {payload.chair.chairName || "Koltuk"}
                                            {payload.chair.manuelBarberName && ` - ${payload.chair.manuelBarberName}`}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Dükkan Bilgileri */}
                    {payload.store && (
                        <View style={{ backgroundColor: "#1c1d20", padding: 16, borderRadius: 12 }}>
                            <Text style={{ color: "#f05e23", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
                                Dükkan Bilgileri
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                {payload.store.imageUrl && (
                                    <Image
                                        source={{ uri: payload.store.imageUrl }}
                                        style={{ width: 50, height: 50, borderRadius: 8, marginRight: 12 }}
                                    />
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                                        {payload.store.storeName}
                                    </Text>
                                    <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                                        Dükkan ID: {payload.store.storeId.substring(0, 8)}...
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Müşteri Bilgileri */}
                    {payload.customer && (
                        <View style={{ backgroundColor: "#1c1d20", padding: 16, borderRadius: 12 }}>
                            <Text style={{ color: "#f05e23", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
                                Müşteri Bilgileri
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                {payload.customer.avatarUrl && (
                                    <Image
                                        source={{ uri: payload.customer.avatarUrl }}
                                        style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
                                    />
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                                        {payload.customer.displayName || "Müşteri"}
                                    </Text>
                                    <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                                        {payload.customer.roleHint}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Serbest Berber Bilgileri */}
                    {payload.freeBarber && (
                        <View style={{ backgroundColor: "#1c1d20", padding: 16, borderRadius: 12 }}>
                            <Text style={{ color: "#f05e23", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
                                Serbest Berber Bilgileri
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                {payload.freeBarber.avatarUrl && (
                                    <Image
                                        source={{ uri: payload.freeBarber.avatarUrl }}
                                        style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
                                    />
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                                        {payload.freeBarber.displayName}
                                    </Text>
                                    <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                                        {payload.freeBarber.roleHint}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Diğer Bilgiler */}
                    <View style={{ backgroundColor: "#1c1d20", padding: 16, borderRadius: 12 }}>
                        <Text style={{ color: "#f05e23", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
                            Diğer Bilgiler
                        </Text>
                        {payload.eventKey && (
                            <View style={{ marginBottom: 8 }}>
                                <Text style={{ color: "#9ca3af", fontSize: 12 }}>Olay Tipi</Text>
                                <Text style={{ color: "white", fontSize: 14 }}>{payload.eventKey}</Text>
                            </View>
                        )}
                        {payload.recipientRole && (
                            <View style={{ marginBottom: 8 }}>
                                <Text style={{ color: "#9ca3af", fontSize: 12 }}>Alıcı Rolü</Text>
                                <Text style={{ color: "white", fontSize: 14 }}>{payload.recipientRole}</Text>
                            </View>
                        )}
                        {notification.appointmentId && (
                            <View>
                                <Text style={{ color: "#9ca3af", fontSize: 12 }}>Randevu ID</Text>
                                <Text style={{ color: "white", fontSize: 12, fontFamily: "monospace" }}>
                                    {notification.appointmentId}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}
