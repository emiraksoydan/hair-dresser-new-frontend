import "react-native-url-polyfill/auto";
import { useEffect, useRef } from "react";
import * as SignalR from "@microsoft/signalr";
import { useDispatch } from "react-redux";
import { api } from "../store/api";
import { tokenStore } from "../lib/tokenStore";
import type { AppDispatch } from "../store/redux-store";
import type { BadgeCount, NotificationDto, ChatThreadListItemDto, ChatMessageDto, ChatMessageItemDto } from "../types";
import { API_CONFIG } from "../constants/api";
import { useAuth } from "./useAuth";
import { logger } from "../utils/common/logger";

const HUB_URL = API_CONFIG.SIGNALR_HUB_URL;

export const useSignalR = () => {
    const dispatch = useDispatch<AppDispatch>();
    const connectionRef = useRef<SignalR.HubConnection | null>(null);
    const { token } = useAuth();

    useEffect(() => {
        let stopped = false;

        const start = async () => {
            const currentToken = tokenStore.access;
            if (!currentToken) {
                // Token yoksa badge count'u invalidate et (login olmamış kullanıcı için)
                dispatch(api.util.invalidateTags(['Badge']));
                return;
            }

            const connection = new SignalR.HubConnectionBuilder()
                .withUrl(HUB_URL, {
                    transport: SignalR.HttpTransportType.WebSockets,
                    skipNegotiation: true,
                    accessTokenFactory: async () => {
                        // Her istekte güncel token'ı al - token refresh edilmiş olabilir
                        const token = tokenStore.access;
                        if (!token) {
                            throw new Error('No access token available');
                        }
                        return token;
                    },
                })
                .withAutomaticReconnect([0, 2000, 10000, 30000])
                .configureLogging(SignalR.LogLevel.Information)
                .build();

            connection.on("badge.updated", (data: any) => {
                // Backend'den gelen data büyük harfle (UnreadNotifications, UnreadMessages) veya küçük harfle (unreadNotifications, unreadMessages) olabilir
                // Her iki durumu da destekle
                const unreadNotifications = data?.unreadNotifications ?? data?.UnreadNotifications ?? 0;
                const unreadMessages = data?.unreadMessages ?? data?.UnreadMessages ?? 0;

                // Sadece updateQueryData yap, invalidateTags gereksiz (zaten güncelleniyor)
                dispatch(
                    api.util.updateQueryData("getBadgeCounts", undefined, (draft) => {
                        if (!draft) {
                            return { unreadNotifications, unreadMessages };
                        }
                        draft.unreadMessages = unreadMessages;
                        draft.unreadNotifications = unreadNotifications;
                    })
                );
            });
            connection.on("notification.received", (dto: NotificationDto) => {
                // Notification'ı listeye ekle veya güncelle
                dispatch(
                    api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                        if (!draft) return;

                        // Duplicate kontrolü: Aynı appointmentId ve type'a sahip notification var mı?
                        // Eğer varsa ve aynı userId'ye aitse, eski notification'ı kaldır (backend'den gelen duplicate'ları önlemek için)
                        if (dto.appointmentId && dto.type) {
                            const duplicateIndex = draft.findIndex(n =>
                                n.appointmentId === dto.appointmentId &&
                                n.type === dto.type &&
                                n.id !== dto.id
                            );
                            if (duplicateIndex >= 0) {
                                // Eski duplicate notification'ı kaldır
                                draft.splice(duplicateIndex, 1);
                            }
                        }

                        // Eğer aynı notification zaten varsa güncelle
                        const existingIndex = draft.findIndex(n => n.id === dto.id);
                        if (existingIndex >= 0) {
                            // Mevcut notification'ı tamamen güncelle (payload dahil)
                            draft[existingIndex] = { ...dto };
                        } else {
                            // Yeni notification'ı başa ekle
                            draft.unshift(dto);
                        }

                        // Appointment-related notification'lar için: Aynı appointmentId'ye sahip 
                        // diğer notification'ların payload'larını da güncelle (status değişikliği için)
                        if (dto.appointmentId && dto.payloadJson && dto.payloadJson.trim() !== '' && dto.payloadJson !== '{}') {
                            try {
                                const newPayload = JSON.parse(dto.payloadJson);
                                if (newPayload && typeof newPayload === 'object') {
                                    const newStatus = newPayload?.status;
                                    const newStoreDecision = newPayload?.storeDecision;
                                    const newFreeBarberDecision = newPayload?.freeBarberDecision;

                                    // Aynı appointmentId'ye sahip tüm notification'ları bul ve güncelle
                                    draft.forEach((notification) => {
                                        if (notification.appointmentId === dto.appointmentId && notification.id !== dto.id) {
                                            try {
                                                if (notification.payloadJson && notification.payloadJson.trim() !== '' && notification.payloadJson !== '{}') {
                                                    const currentPayload = JSON.parse(notification.payloadJson);
                                                    if (currentPayload && typeof currentPayload === 'object') {
                                                        // Status ve decision bilgilerini güncelle
                                                        if (newStatus !== undefined) {
                                                            currentPayload.status = newStatus;
                                                        }
                                                        if (newStoreDecision !== undefined) {
                                                            currentPayload.storeDecision = newStoreDecision;
                                                        }
                                                        if (newFreeBarberDecision !== undefined) {
                                                            currentPayload.freeBarberDecision = newFreeBarberDecision;
                                                        }
                                                        notification.payloadJson = JSON.stringify(currentPayload);
                                                    }
                                                }
                                            } catch {
                                                // Payload parse edilemezse atla
                                            }
                                        }
                                    });
                                }
                            } catch {
                                // Yeni payload parse edilemezse atla
                            }
                        }
                    })
                );

                // Appointment status değiştiğinde slot availability'yi güncelle
                if (dto.appointmentId && dto.payloadJson && dto.payloadJson.trim() !== '' && dto.payloadJson !== '{}') {
                    try {
                        const payload = JSON.parse(dto.payloadJson);
                        if (payload && typeof payload === 'object') {
                            const status = payload?.status;
                            // Status değişikliği varsa (Pending, Approved, Rejected, Cancelled, Completed)
                            // ve storeId varsa availability'yi invalidate et
                            if (status !== undefined && payload?.store?.storeId) {
                                const storeId = payload.store.storeId;
                                const date = payload.date;
                                if (storeId && date) {
                                    dispatch(api.util.invalidateTags([
                                        { type: 'Appointment', id: `availability-${storeId}-${date}` },
                                        { type: 'Appointment', id: 'availability' },
                                    ]));
                                }
                            }
                        }
                    } catch {
                        // Payload parse edilemezse atla
                    }
                }

                // Badge count'u invalidate et - backend'den badge.updated event'i gelecek
                // Backend'de CreateAndPushAsync içinde badge count hesaplanıp badge.updated event'i gönderiliyor
                // Bu yüzden burada sadece invalidate etmek yeterli, manuel artırmaya gerek yok
                dispatch(api.util.invalidateTags(["Badge"]));
            });


            connection.on("chat.message", (dto: ChatMessageDto) => {
                // Thread listesindeki lastMessagePreview'ı güncelle
                dispatch(
                    api.util.updateQueryData("getChatThreads", undefined, (draft) => {
                        if (!draft) return;
                        const thread = draft.find(t => t.appointmentId === dto.appointmentId);
                        if (thread) {
                            thread.lastMessagePreview = dto.text.length > 60 ? dto.text.substring(0, 60) : dto.text;
                            thread.lastMessageAt = dto.createdAt;
                            // Sender dışındaki kullanıcılar için unread count artacak (backend'de yapılıyor)
                        }
                    })
                );

                // Mesaj listesini güncelle (eğer o appointment'ın mesajları açıksa)
                dispatch(
                    api.util.updateQueryData("getChatMessages", { appointmentId: dto.appointmentId }, (draft) => {
                        if (!draft) return;
                        // Eğer aynı mesaj yoksa ekle
                        const existingMessage = draft.find(m => m.messageId === dto.messageId);
                        if (!existingMessage) {
                            const newMessage: ChatMessageItemDto = {
                                messageId: dto.messageId,
                                senderUserId: dto.senderUserId,
                                text: dto.text,
                                createdAt: dto.createdAt,
                            };
                            draft.push(newMessage);
                            // Tarihe göre sırala (en eski en başta)
                            draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                        }
                    })
                );

                // Badge count backend'den badge.updated event'i ile gelecek, burada sadece invalidate et
                dispatch(api.util.invalidateTags(["Badge"]));
            });

            connection.on("chat.threadCreated", (dto: ChatThreadListItemDto) => {
                // Yeni chat thread oluşturulduğunda listeyi güncelle
                dispatch(
                    api.util.updateQueryData("getChatThreads", undefined, (draft) => {
                        if (!draft) return;
                        // Eğer zaten varsa güncelle, yoksa başa ekle
                        const existingIndex = draft.findIndex(t => t.appointmentId === dto.appointmentId);
                        if (existingIndex >= 0) {
                            draft[existingIndex] = dto;
                        } else {
                            draft.unshift(dto);
                        }
                    })
                );
                dispatch(api.util.invalidateTags(["Badge"]));
            });

            // Bağlantı durumu event'leri
            connection.onclose((error) => {
                if (error) {
                    logger.warn('SignalR connection closed with error:', error);
                }
                // Bağlantı kapandığında cache'i invalidate et (yeniden bağlanınca güncel veri gelsin)
                dispatch(api.util.invalidateTags(['Badge', 'Chat', 'Notification']));
            });

            connection.onreconnecting((error) => {
                logger.info('SignalR reconnecting...', error);
            });

            connection.onreconnected((connectionId) => {
                logger.info('SignalR reconnected:', connectionId);
                // Yeniden bağlandığında güncel verileri çek
                dispatch(api.util.invalidateTags(['Badge', 'Chat', 'Notification']));
            });

            try {
                await connection.start();
                if (stopped) {
                    await connection.stop();
                    return;
                }
                connectionRef.current = connection;
                // Bağlantı kurulduğunda badge count'u fetch et
                dispatch(api.util.invalidateTags(['Badge']));
            } catch (e) {
                // Error logging will be handled by logger if needed
                // SignalR connection errors are expected during network issues
                // Bağlantı kurulamazsa DB'den veri çek
                logger.error('SignalR connection failed:', e);
                dispatch(api.util.invalidateTags(['Notification', 'Badge', 'Chat']));
            }
        };

        start();

        return () => {
            stopped = true;
            const c = connectionRef.current;
            c?.off("badge.updated");
            c?.off("notification.received");
            c?.off("chat.message");
            c?.off("chat.threadCreated");
            c?.stop();
            connectionRef.current = null;
        };
    }, [dispatch, token]); // Token değiştiğinde bağlantıyı yeniden kur
};
