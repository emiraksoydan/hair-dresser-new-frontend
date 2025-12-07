import { useNearbyControl } from "./useNearByControl";
import { useUpdateFreeBarberLocationMutation } from "../store/api";

export function useTrackFreeBarberLocation(enabled: boolean, barberId: string | null) {
    const [updateLocation, { isLoading }] = useUpdateFreeBarberLocationMutation();

    const tracker = useNearbyControl({
        enabled: enabled && !!barberId, // Sadece enabled true ise VE barberId varsa çalışır
        moveThresholdM: 100, // 100 metre yer değiştirirse tetikle
        staleMs: 15 * 1000, // Veya son güncellemeden 30 saniye geçtiyse tetikle
        hardRefreshMs: 30 * 1000, // 1 dakikada bir zorunlu update (opsiyonel)
        onFetch: async (lat, lon) => {
            if (!barberId) return;
            try {
                await updateLocation({
                    id: barberId,
                    latitude: lat,
                    longitude: lon
                }).unwrap();
            } catch (error) {
            }
        },
    });

    return {
        isTracking: tracker.locationStatus === 'granted',
        status: tracker.locationStatus,
        message: tracker.locationMessage,
        retry: tracker.retryPermission,
        isUpdating: isLoading,
    };
}