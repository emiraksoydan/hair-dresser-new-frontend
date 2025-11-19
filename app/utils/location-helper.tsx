// utils/location-helper.ts
import * as Location from 'expo-location';
import { ensureLocationPermissionWithPrompt } from '../components/location'; // kendi path’ine göre düzelt
import { LocationResult, LocationStatusHelper } from '../types';
import { useCallback, useEffect, useState } from 'react';

export async function getCurrentLocationSafe(): Promise<LocationResult> {
    const granted = await ensureLocationPermissionWithPrompt();
    if (!granted) {
        return {
            ok: false,
            message: 'Konum izni verilmedi.',
        };
    }
    try {
        const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return {
                ok: false,
                message: 'Geçersiz konum bilgisi alındı.',
            };
        }
        return { ok: true, lat, lon };
    } catch (err) {
        console.error('Konum alma hatası:', err);
        return {
            ok: false,
            message: 'Konum alınırken bir hata oluştu.',
        };
    }
}



export function useCurrentLocationSafe(enabled: boolean = true) {
    const [status, setStatus] = useState<LocationStatusHelper>('idle');
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [message, setMessage] = useState<string>("");

    const fetchLocation = useCallback(async () => {
        setStatus('loading');
        const res = await getCurrentLocationSafe();

        if (res.ok) {
            setCoords({ lat: res.lat, lon: res.lon });
            setStatus('ok');
            setMessage("");
        } else {
            setStatus('error');
            setMessage(res.message);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        fetchLocation();
    }, [enabled, fetchLocation]);

    return {
        status,     // 'idle' | 'loading' | 'ok' | 'error'
        coords,     // { lat, lon } | null
        message,    // hata/uyarı mesajı
        retry: fetchLocation,
    };
}

