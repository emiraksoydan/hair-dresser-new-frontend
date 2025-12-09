import "react-native-url-polyfill/auto";
import { useEffect, useRef } from "react";
import * as SignalR from "@microsoft/signalr";
import { useDispatch } from "react-redux";
import { api } from "../store/api";
import { tokenStore } from "../lib/tokenStore";
import type { AppDispatch } from "../store/redux-store";
import type { BadgeCount, NotificationDto } from "../types";

const HUB_URL = "http://192.168.1.35:5000/hubs/app";

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


            connection.on("chat.message", () => {
                // Chat endpointlerin yoksa burada en azından badge garanti olsun
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
                console.error("SignalR start error:", e);
            }
        };

        start();

        return () => {
            stopped = true;
            const c = connectionRef.current;
            c?.off("badge.updated");
            c?.off("notification.received");
            c?.off("chat.message");
            c?.stop();
            connectionRef.current = null;
        };
    }, [dispatch]);
};
