import * as Location from "expo-location";
import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { ensureLocationGateWithUI } from "../components/location/location-gate";
import type { Pos, LocationStatus, UseNearbyControlParams } from "../types";

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function useNearbyControl({
    enabled,
    moveThresholdM = 150,
    staleMs = 15_000,
    hardRefreshMs = 15_000, // Default değeri useNearby.ts ile tutarlı hale getir
    onFetch,
}: UseNearbyControlParams) {
    const [locationStatus, setLocationStatus] = useState<LocationStatus>("unknown");
    const [locationMessage, setLocationMessage] = useState<string>("");
    const [fetchedOnce, setFetchedOnce] = useState(false);

    const lastFetchPos = useRef<Pos | null>(null);
    const lastFetchTime = useRef(0);
    const lastKnownPos = useRef<Pos | null>(null);

    const watchRef = useRef<Location.LocationSubscription | null>(null);
    const inflightFetch = useRef(false);

    // Başlangıç değeri undefined olarak ayarlandı
    const savedFetchHandler = useRef<((lat: number, lon: number) => Promise<void>) | undefined>(undefined);

    const initialLoading = !fetchedOnce && locationStatus !== "denied";

    function shouldFetchByMoveOrAge(lat: number, lon: number) {
        const now = Date.now();
        if (!lastFetchPos.current) return true;

        const distM = distanceKm(lastFetchPos.current.lat, lastFetchPos.current.lon, lat, lon) * 1000;
        const age = now - lastFetchTime.current;

        return distM >= moveThresholdM || age >= staleMs;
    }

    // handleFetch'i useCallback ile sarmalıyoruz
    const handleFetch = useCallback(async (lat: number, lon: number) => {
        if (inflightFetch.current) return;

        inflightFetch.current = true;
        try {
            await onFetch(lat, lon);
        } catch (e) {
            // Error handled by RTK Query
        } finally {
            inflightFetch.current = false;
            setFetchedOnce(true);
            lastFetchPos.current = { lat, lon };
            lastFetchTime.current = Date.now();
        }
    }, [onFetch]);

    // Her renderda handleFetch'in son halini ref'e kaydet
    useEffect(() => {
        savedFetchHandler.current = handleFetch;
    }, [handleFetch]);

    async function startWatching() {
        if (watchRef.current) return;

        const sub = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.Balanced,
                distanceInterval: 50,
                timeInterval: 3000,
            },
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

                const p = { lat, lon };
                lastKnownPos.current = p;

                if (!shouldFetchByMoveOrAge(p.lat, p.lon)) return;

                // Hareket algılandı, güncel fonksiyonu çağır
                if (savedFetchHandler.current) {
                    savedFetchHandler.current(p.lat, p.lon);
                }
            }
        );

        watchRef.current = sub;
    }

    async function gateAndStart(): Promise<boolean> {
        const gate = await ensureLocationGateWithUI();

        if (!gate.ok) {
            setLocationMessage(gate.message ?? "Konum hazır değil.");
            setLocationStatus(gate.reason === "permission" ? "denied" : "unknown");
            return false;
        }

        setLocationMessage("");
        setLocationStatus("granted");
        await startWatching();
        return true;
    }

    useEffect(() => {
        if (!enabled) return;
        gateAndStart();
        return () => {
            watchRef.current?.remove();
            watchRef.current = null;
        };
    }, [enabled]);

    // Timer (Zorunlu Yenileme - Hard Refresh)
    useEffect(() => {
        if (!enabled) return;
        if (locationStatus !== "granted") return;

        // Bu fonksiyon her tetiklendiğinde ref içindeki EN GÜNCEL handleFetch'i bulur.
        const tick = () => {
            const pos = lastKnownPos.current;
            if (!pos) return;

            // Ref üzerinden çağırdığımız için stale closure (eski veri) olmaz.
            savedFetchHandler.current?.(pos.lat, pos.lon);
        };

        const id = setInterval(tick, hardRefreshMs);

        return () => clearInterval(id);
    }, [enabled, locationStatus, hardRefreshMs]);

    // AppState listener: Uygulama foreground'a geldiğinde lokasyon iznini kontrol et ve hard refresh yap
    useEffect(() => {
        if (!enabled) return;

        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            // Uygulama foreground'a geldiğinde (active)
            if (nextAppState === "active") {
                // Lokasyon iznini kontrol et
                const permissionStatus = await Location.getForegroundPermissionsAsync();

                if (permissionStatus.granted) {
                    // Watch aktif değilse veya daha önce denied idi ise, durumu güncelle ve fetch yap
                    if (!watchRef.current) {
                        setLocationStatus("granted");
                        setLocationMessage("");
                        await startWatching();
                    }

                    // Eğer son bilinen pozisyon varsa hemen fetch yap (hard refresh)
                    // Ayarlardan döndüğünde veri güncellemesi için
                    if (lastKnownPos.current && savedFetchHandler.current) {
                        await savedFetchHandler.current(
                            lastKnownPos.current.lat,
                            lastKnownPos.current.lon
                        );
                    }
                } else {
                    // İzin yoksa durumu güncelle ve watch'i durdur
                    setLocationStatus("denied");
                    setLocationMessage("Konum izni verilmedi.");
                    watchRef.current?.remove();
                    watchRef.current = null;
                }
            }
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [enabled]); // locationStatus'i dependency'den çıkardık çünkü handler içinde kontrol ediyoruz

    const retryPermission = async () => {
        if (!enabled) return;
        const ok = await gateAndStart();
        if (ok && lastKnownPos.current && savedFetchHandler.current) {
            await savedFetchHandler.current(lastKnownPos.current.lat, lastKnownPos.current.lon);
        }
    };

    return {
        locationStatus,
        locationMessage,
        hasLocation: locationStatus === "granted",
        location: lastKnownPos.current ? { latitude: lastKnownPos.current.lat, longitude: lastKnownPos.current.lon } : undefined,
        fetchedOnce,
        initialLoading,
        manualFetch: async () => {
            if (!lastKnownPos.current || locationStatus !== "granted") return;
            await savedFetchHandler.current?.(lastKnownPos.current.lat, lastKnownPos.current.lon);
        },
        retryPermission,
    };
}