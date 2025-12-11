import "react-native-url-polyfill/auto";
import { useEffect, useRef } from "react";
import * as SignalR from "@microsoft/signalr";
import { useDispatch } from "react-redux";
import { api } from "../store/api";
import { tokenStore } from "../lib/tokenStore";
import type { AppDispatch } from "../store/redux-store";
import type { BadgeCount, NotificationDto, ChatThreadListItemDto, ChatMessageDto } from "../types";
import { API_CONFIG } from "../constants/api";

const HUB_URL = API_CONFIG.SIGNALR_HUB_URL;

export const useSignalR = () => {
    const dispatch = useDispatch<AppDispatch>();
    const connectionRef = useRef<SignalR.HubConnection | null>(null);

    useEffect(() => {
        let stopped = false;

        const start = async () => {
            const initialToken = tokenStore.access;
            if (!initialToken) return;

            const connection = new SignalR.HubConnectionBuilder()
                .withUrl(HUB_URL, {
                    transport: SignalR.HttpTransportType.WebSockets,
                    skipNegotiation: true,
                    accessTokenFactory: async () => tokenStore.access ?? "",
                })
                .withAutomaticReconnect([0, 2000, 10000, 30000])
                .configureLogging(SignalR.LogLevel.Information)
                .build();

            connection.on("badge.updated", (data: BadgeCount) => {
                dispatch(api.util.invalidateTags(["Badge"]));
                dispatch(
                    api.util.updateQueryData("getBadgeCounts", undefined, (draft) => {
                        if (!draft) return;
                        draft.unreadMessages = data.unreadMessages;
                        draft.unreadNotifications = data.unreadNotifications;
                    })
                );
            });
            connection.on("notification.received", (dto: NotificationDto) => {
                dispatch(
                    api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                        if (!draft) return;
                        draft.unshift(dto); // isRead server’dan ne geldiyse o
                    })
                );

                dispatch(api.util.invalidateTags(["Badge"])); // badge server hesaplıyor
            });


            connection.on("chat.message", (dto: ChatMessageDto) => {
                // Mesaj geldiğinde thread listesini ve mesaj listesini güncelle
                dispatch(api.util.invalidateTags(["Badge", "Chat"]));
                
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

            try {
                await connection.start();
                if (stopped) {
                    await connection.stop();
                    return;
                }
                connectionRef.current = connection;
            } catch (e) {
                // Error logging will be handled by logger if needed
                // SignalR connection errors are expected during network issues
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
    }, [dispatch]);
};
