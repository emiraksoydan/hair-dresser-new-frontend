import { useEffect, useRef } from 'react';
import * as SignalR from '@microsoft/signalr';
import { useDispatch } from 'react-redux';
import { api } from '../store/api';
import { BadgeCount } from '../types'; // BadgeCountDto olarak import edildiğinden emin olun
import { tokenStore } from '../lib/tokenStore';
import { AppDispatch } from '../store/redux-store'; // Dispatch tipini buradan çekiyoruz

const HUB_URL = 'http://192.168.1.35:5000/hubs/app';

export const useSignalR = () => {
    const connectionRef = useRef<SignalR.HubConnection | null>(null);

    // DÜZELTME 1: useDispatch'e AppDispatch tipini vererek Thunk kullanımını desteklemesini sağlıyoruz.
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        let isMounted = true;

        const startConnection = async () => {
            // DÜZELTME 2: tokenStore.access bir getter olduğu için () kaldırıldı.
            // Eğer promise dönüyorsa 'await' kalabilir, dönmüyorsa 'await'i de kaldırabilirsiniz.
            const token = tokenStore.access;

            if (!token) return;

            const connection = new SignalR.HubConnectionBuilder()
                .withUrl(HUB_URL, {
                    accessTokenFactory: () => token,
                })
                .withAutomaticReconnect()
                .configureLogging(SignalR.LogLevel.Information)
                .build();

            // --- EVENT HANDLERS ---

            // 1. Badge Güncellemesi
            connection.on('badge.updated', (data: BadgeCount) => {
                console.log('SignalR: Badge updated', data);
                // Dispatch artık Thunk action'ı kabul edecektir
                dispatch(
                    api.util.updateQueryData('getBadgeCounts', undefined, (draft) => {
                        draft.unreadMessages = data.unreadMessages;
                        draft.unreadNotifications = data.unreadNotifications;
                    })
                );
            });

            // 2. Yeni Bildirim
            connection.on('notification.received', () => {
                console.log('SignalR: Notification received');
                dispatch(api.util.invalidateTags(['Notification', 'Badge']));
            });

            // 3. Yeni Chat Mesajı
            connection.on('chat.message', () => {
                dispatch(api.util.invalidateTags(['Chat', 'Badge']));
            });

            try {
                await connection.start();
                console.log('SignalR Connected via Hook');
                connectionRef.current = connection;
            } catch (err) {
                console.error('SignalR Connection Error:', err);
            }
        };

        startConnection();

        return () => {
            isMounted = false;
            connectionRef.current?.stop();
        };
    }, [dispatch]);
};