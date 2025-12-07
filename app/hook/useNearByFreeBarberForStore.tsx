import * as Location from "expo-location";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ensureLocationGateWithUI } from "../components/location/location-gate";
import { BarberStoreMineDto, FreeBarGetDto } from "../types";
import { useLazyGetNearbyFreeBarberQuery } from "../store/api";

export type LocationStatus = "unknown" | "granted" | "denied";

export type UseNearbyStoresParams = {
    stores: BarberStoreMineDto[];
    enabled: boolean;
    hardRefreshMs?: number;
};

const DEFAULT_RADIUS_KM = 1;

export function useNearbyStoresControl({
    stores,
    enabled,
    hardRefreshMs = 15_000,
}: UseNearbyStoresParams) {
    const [trigger] = useLazyGetNearbyFreeBarberQuery();

    const [locationStatus, setLocationStatus] = useState<LocationStatus>("unknown");
    const [locationMessage, setLocationMessage] = useState<string>("");
    const [freeBarbers, setFreeBarbers] = useState<FreeBarGetDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchedOnce, setFetchedOnce] = useState(false);

    // 1. FETCH FONKSİYONU
    // useCallback içinde stores bağımlılığını kaldırdık çünkü parametre olarak almayacağız,
    // o anki stores ref'ini veya state'ini kullanacağız.
    // Ancak burada en temiz yöntem fonksiyonu her seferinde yeniden oluşturmaktır.
    const handleFetchStores = useCallback(async () => {
        if (!stores || stores.length === 0) return;

        try {
            const promises = stores.map(store => {
                if (store.latitude && store.longitude) {
                    return trigger({
                        lat: store.latitude,
                        lon: store.longitude,
                        radiusKm: DEFAULT_RADIUS_KM
                    }, false).unwrap();
                }
                return Promise.resolve([]);
            });

            const results = await Promise.all(promises);

            const allBarbersMap = new Map<string, FreeBarGetDto>();
            results.flat().forEach(barber => {
                if (barber && barber.id) {
                    allBarbersMap.set(barber.id, barber);
                }
            });

            setFreeBarbers(Array.from(allBarbersMap.values()));
            setFetchedOnce(true);
            console.log("📍 İstek Atıldı:", new Date().toLocaleTimeString());

        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    }, [stores, trigger]);

    // Fonksiyon referansını sakla
    const savedCallback = useRef(handleFetchStores);
    useEffect(() => {
        savedCallback.current = handleFetchStores;
    }, [handleFetchStores]);

    // 2. İZİN ALMA
    async function gateAndStart(): Promise<boolean> {
        const gate = await ensureLocationGateWithUI();

        if (!gate.ok) {
            setLocationMessage(gate.message ?? "Konum hazır değil.");
            setLocationStatus(gate.reason === "permission" ? "denied" : "unknown");
            return false;
        }

        setLocationMessage("");
        setLocationStatus("granted");
        return true;
    }

    // 3. BAŞLANGIÇ İZNİ
    useEffect(() => {
        if (!enabled) return;
        gateAndStart();
    }, [enabled]);

    // ---------------------------------------------------------------------------
    // 4. TEK MERKEZLİ ZAMANLAYICI (HEM DEĞİŞİM HEM INTERVAL)
    // ---------------------------------------------------------------------------

    // Parmak izi (Fingerprint) oluştur
    const storesFingerprint = useMemo(() => {
        return JSON.stringify(stores.map(s => `${s.latitude},${s.longitude}`));
    }, [stores]);

    useEffect(() => {
        if (!enabled || locationStatus !== "granted" || stores.length === 0) return;
        savedCallback.current();


        const id = setInterval(() => {
            savedCallback.current();
        }, hardRefreshMs);

        return () => clearInterval(id);

    }, [storesFingerprint, locationStatus, enabled, hardRefreshMs]);

    const retryPermission = async () => {
        if (!enabled) return;
        await gateAndStart();
    };

    return {
        freeBarbers,
        loading,
        locationStatus,
        locationMessage,
        hasLocation: locationStatus === "granted",
        fetchedOnce,
        manualFetch: handleFetchStores,
        retryPermission,
    };
}