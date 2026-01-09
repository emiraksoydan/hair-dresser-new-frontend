import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { AppState, AppStateStatus } from 'react-native';
import { API_CONFIG } from '../constants/api';
import { NOTIFICATION_SOUND_DURATION_MS, NOTIFICATION_SOUND_FILENAME } from '../constants/notification';

/**
 * Hook to play notification sound when badge count changes
 * Plays sound when:
 * 1. Badge count increases (new notification received)
 * 2. App is opened and there are unread notifications (first time only)
 * 
 * ÖNEMLİ: 
 * - Ses sadece bildirimi alan kullanıcıda çalar (badge count artışı kontrolü ile)
 * - Aynı anda birden fazla bildirim gelirse, zaten çalan bir ses varsa diğerleri çalmaz
 * - Cooldown süresi (3 saniye) içinde yeni bildirimler için ses çalmaz
 * 
 * Sound duration: NOTIFICATION_SOUND_DURATION_MS (ayarlanabilir - constants/notification.ts)
 * Sound source: Backend'deki varsayılan bildirim sesi dosyası (wwwroot/sounds/notification.mp3)
 */
export const useNotificationSound = (badgeCount: number) => {
    const previousBadgeCountRef = useRef<number>(0);
    const soundRef = useRef<Audio.Sound | null>(null);
    const hasPlayedOnMountRef = useRef<boolean>(false);
    const appStateRef = useRef<AppStateStatus>('active');
    const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSoundPlayTimeRef = useRef<number>(0);
    const SOUND_COOLDOWN_MS = 3000; // 3 saniye cooldown - çoklu bildirimlerde her biri için ses çalmasın
    const isPlayingRef = useRef<boolean>(false); // Şu anda bir ses çalıyor mu kontrolü

    // Set audio mode for notifications
    useEffect(() => {
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
        });
    }, []);

    // Monitor app state
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            appStateRef.current = nextAppState;
        });
        return () => subscription.remove();
    }, []);

    // Play sound when badge count increases
    useEffect(() => {
        const previousCount = previousBadgeCountRef.current;

        // ÖNEMLİ: Okunmayan bildirim yoksa ses çalmamalı
        if (badgeCount === 0) {
            previousBadgeCountRef.current = badgeCount;
            return;
        }

        // Play sound if:
        // 1. Badge count increased (new notification)
        // 2. App just opened with notifications (first time only)
        if (badgeCount > previousCount) {
            // New notification received - sadece cooldown süresi geçtiyse VE şu anda çalan bir ses yoksa ses çal
            const now = Date.now();
            const timeSinceLastSound = now - lastSoundPlayTimeRef.current;
            const isSoundCurrentlyPlaying = soundRef.current !== null || isPlayingRef.current;

            // Eğer bir ses zaten çalıyorsa veya cooldown süresi geçmediyse, yeni ses çalma
            if (!isSoundCurrentlyPlaying && timeSinceLastSound >= SOUND_COOLDOWN_MS) {
                playNotificationSound();
            }
        } else if (!hasPlayedOnMountRef.current && badgeCount > 0 && appStateRef.current === 'active') {
            // App opened with existing notifications (play once)
            // Sadece şu anda çalan bir ses yoksa çal
            if (soundRef.current === null && !isPlayingRef.current) {
                hasPlayedOnMountRef.current = true;
                playNotificationSound();
            }
        }

        previousBadgeCountRef.current = badgeCount;
    }, [badgeCount]);

    const playNotificationSound = async () => {
        // Only play if app is active
        if (appStateRef.current !== 'active') {
            return;
        }

        // ÖNEMLİ: Okunmayan bildirim yoksa ses çalmamalı
        if (badgeCount === 0) {
            return;
        }

        // ÖNEMLİ: Eğer bir ses zaten çalıyorsa, yeni ses çalma (aynı anda birden fazla bildirim gelirse)
        if (soundRef.current !== null || isPlayingRef.current) {
            return;
        }

        // Ses çalmaya başladığını işaretle
        isPlayingRef.current = true;

        // Clear any existing timeout
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }

        try {
            // Backend'deki varsayılan bildirim sesi dosyası (wwwroot/sounds/notification.mp3)
            // API base URL'ini kullanarak backend'deki ses dosyasına erişim
            const apiBaseUrl = API_CONFIG.BASE_URL.replace('/api/', ''); // /api/ kısmını kaldır
            const soundUri = `${apiBaseUrl}/sounds/${NOTIFICATION_SOUND_FILENAME}`;

            // Backend'deki varsayılan ses dosyasını çal
            // Ses dosyasını döngüye alarak 3 saniye boyunca çal
            const { sound } = await Audio.Sound.createAsync(
                { uri: soundUri },
                {
                    shouldPlay: true,
                    volume: 0.6, // Clear volume for notification
                    isLooping: true, // Loop to play for full duration
                    shouldCorrectPitch: true,
                    rate: 1.0 // Normal playback speed
                }
            );

            soundRef.current = sound;
            lastSoundPlayTimeRef.current = Date.now(); // Ses çalma zamanını kaydet

            // Stop sound after NOTIFICATION_SOUND_DURATION_MS (ayarlanabilir süre)
            // constants/notification.ts dosyasından süreyi değiştirebilirsiniz
            stopTimeoutRef.current = setTimeout(async () => {
                try {
                    if (soundRef.current) {
                        await soundRef.current.stopAsync();
                        await soundRef.current.unloadAsync();
                        soundRef.current = null;
                    }
                } catch (e) {
                    // Ignore errors
                }
                // Ses çalma durumunu sıfırla
                isPlayingRef.current = false;
                if (stopTimeoutRef.current) {
                    clearTimeout(stopTimeoutRef.current);
                    stopTimeoutRef.current = null;
                }
            }, NOTIFICATION_SOUND_DURATION_MS); // Ayarlanabilir süre - constants/notification.ts
        } catch (error) {
            // Hata durumunda ses çalma durumunu sıfırla
            isPlayingRef.current = false;
            // Silently fail - don't interrupt user experience
            // If sound fails to load, user can still use the app normally
            // Notification sound not available - silently fail
        }
    };

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (stopTimeoutRef.current) {
                clearTimeout(stopTimeoutRef.current);
            }
            if (soundRef.current) {
                soundRef.current.unloadAsync().catch(() => { });
            }
            isPlayingRef.current = false;
        };
    }, []);
};

