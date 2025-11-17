// useNearbyControl.ts
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { LocationStatus, Pos, UseNearbyControlParams } from '../types';

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function useNearbyControl({
    enabled,
    moveThresholdM = 150,
    staleMs = 15_000,
    hardRefreshMs = 30_000,
    onFetch,
}: UseNearbyControlParams) {
    const [locationStatus, setLocationStatus] =
        useState<LocationStatus>('unknown'); // 'unknown' | 'granted' | 'denied'

    const lastFetchPos = useRef<Pos | null>(null);
    const lastFetchTime = useRef(0);
    const lastKnownPos = useRef<Pos | null>(null);
    const watchRef = useRef<Location.LocationSubscription | null>(null);

    function shouldFetchByMoveOrAge(lat: number, lon: number) {
        const now = Date.now();

        if (!lastFetchPos.current) return true; // ilk sefer

        const distKm = distanceKm(
            lastFetchPos.current.lat,
            lastFetchPos.current.lon,
            lat,
            lon
        );
        const distM = distKm * 1000;
        const age = now - lastFetchTime.current;

        if (distM >= moveThresholdM) return true;
        if (age >= staleMs) return true;

        return false;
    }

    async function handleFetch(lat: number, lon: number) {
        await onFetch(lat, lon); // RTK trigger vs.
        lastFetchPos.current = { lat, lon };
        lastFetchTime.current = Date.now();
    }

    async function startWatching() {
        if (watchRef.current) return;

        watchRef.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.Balanced,
                distanceInterval: 10,
                timeInterval: 3000,
            },
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                lastKnownPos.current = { lat, lon };

                if (!shouldFetchByMoveOrAge(lat, lon)) return;

                handleFetch(lat, lon);
            }
        );
    }

    async function askPermissionAndMaybeStart(): Promise<boolean> {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            setLocationStatus('denied');
            return false;
        }

        setLocationStatus('granted');
        await startWatching();
        return true;
    }

    // 📍 ilk mount + enabled değişince izin iste + watch başlat
    useEffect(() => {
        if (!enabled) return;

        askPermissionAndMaybeStart();

        return () => {
            watchRef.current?.remove();
            watchRef.current = null;
        };
    }, [enabled]);

    // ⏱ Hard refresh – ama sadece izin "granted" ise
    useEffect(() => {
        if (!enabled) return;
        if (locationStatus !== 'granted') return;

        const id = setInterval(() => {
            if (!lastKnownPos.current) return;

            const now = Date.now();
            const age = now - lastFetchTime.current;

            if (age >= hardRefreshMs) {
                handleFetch(lastKnownPos.current.lat, lastKnownPos.current.lon);
            }
        }, hardRefreshMs);

        return () => clearInterval(id);
    }, [enabled, locationStatus, hardRefreshMs]);

    // 🔁 Dışarı vereceğimiz "tekrar dene" fonksiyonu
    const retryPermission = async () => {
        if (!enabled) return;
        const granted = await askPermissionAndMaybeStart();
        if (granted && lastKnownPos.current) {
            await handleFetch(lastKnownPos.current.lat, lastKnownPos.current.lon);
        }
    };

    return {
        manualFetch: () => {
            if (!lastKnownPos.current || locationStatus !== 'granted') return;
            return handleFetch(lastKnownPos.current.lat, lastKnownPos.current.lon);
        },
        locationStatus,
        hasLocation: locationStatus === 'granted',
        retryPermission,
    };
}
