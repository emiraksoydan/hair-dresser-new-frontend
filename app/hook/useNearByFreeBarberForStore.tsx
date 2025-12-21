import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureLocationGateWithUI } from "../components/location/location-gate";
import { BarberStoreMineDto, FreeBarGetDto, LocationStatus } from "../types";
import { useLazyGetNearbyFreeBarberQuery } from "../store/api";
import { safeCoord } from "../utils/location/geo";


export type UseNearbyStoresParams = {
    stores: BarberStoreMineDto[];
    enabled: boolean;
    hardRefreshMs?: number;
    radiusKm?: number;
};

export function useNearbyStoresControl({
    stores,
    enabled,
    hardRefreshMs = 15_000,
    radiusKm = 1,
}: UseNearbyStoresParams) {
    const [trigger] = useLazyGetNearbyFreeBarberQuery();

    const [locationStatus, setLocationStatus] = useState<LocationStatus>("unknown");
    const [freeBarbers, setFreeBarbers] = useState<FreeBarGetDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

    // Konum izni kontrolü
    useEffect(() => {
        if (!enabled) return;
        ensureLocationGateWithUI().then((gate) => {
            setLocationStatus(gate.ok ? "granted" : "denied");
        });
    }, [enabled]);

    // Store'ların koordinat imzası (Store değişirse bu değişir)
    const storesFingerprint = useMemo(() => {
        if (!stores?.length) return "[]";
        return JSON.stringify(stores.map(s => `${s.id}:${s.latitude},${s.longitude}`));
    }, [stores]);

    const fetchNearby = useCallback(async () => {
        if (!enabled || !stores.length) return;

        setIsLoading(true);
        try {
            // Her mağaza için ayrı istek atıp sonuçları topluyoruz
            const promises = stores.map(store => {
                const c = safeCoord(store.latitude, store.longitude);
                if (!c) return null;
                // İlk store'un konumunu kaydet (filtreleme için)
                if (!location && c) {
                    setLocation({ latitude: c.lat, longitude: c.lon });
                }
                // RTK Query'nin 'trigger'ı her zaman güncel cache veya yeni veri getirir
                return trigger({ lat: c.lat, lon: c.lon, radiusKm }, true).unwrap();
            }).filter(Boolean);

            const results = await Promise.all(promises);

            // Tüm sonuçları tek bir listede birleştir ve ID'ye göre tekrar edenleri temizle
            const allBarbers = new Map<string, FreeBarGetDto>();
            results.forEach((list) => {
                if (Array.isArray(list)) {
                    list.forEach(barber => allBarbers.set((barber as any).id, barber));
                }
            });

            setFreeBarbers(Array.from(allBarbers.values()));
        } catch (error) {
            // Error handled by RTK Query
        } finally {
            setIsLoading(false);
        }
    }, [enabled, stores, radiusKm, trigger, location]);

    // 1. Durum: Store listesi veya koordinatı değişirse ANINDA çek (Optimistic update burayı tetikler)
    useEffect(() => {
        fetchNearby();
    }, [storesFingerprint, fetchNearby]);

    // 2. Durum: Periyodik olarak arka planda yenile (Timer)
    useEffect(() => {
        if (!enabled) return;
        const interval = setInterval(fetchNearby, hardRefreshMs);
        return () => clearInterval(interval);
    }, [enabled, hardRefreshMs, fetchNearby]);

    return {
        freeBarbers,
        isLoading,
        locationStatus,
        hasLocation: locationStatus === "granted",
        location,
        manualFetch: fetchNearby, // İstersen elle çağırmak için
    };
}