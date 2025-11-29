// useNearByStore.ts (useNearbyStores)
import { useLazyGetNearbyFreeBarberQuery } from "../store/api";
import { useNearbyControl } from "./useNearByControl";
import type { FreeBarGetDto } from "../types";

const DEFAULT_RADIUS_KM = 1;

export function useNearbyFreeBarber(enabled: boolean) {
    const [trigger, result] = useLazyGetNearbyFreeBarberQuery();

    const nearby = useNearbyControl({
        enabled,
        moveThresholdM: 150,
        staleMs: 15_000,
        hardRefreshMs: 15_000,
        onFetch: async (lat, lon) => {
            await trigger({ lat, lon, radiusKm: DEFAULT_RADIUS_KM }, true);
        },
    });

    return {
        freeBarbers: (result.data ?? []) as FreeBarGetDto[],
        loading: nearby.initialLoading || result.isLoading,
        fetching: result.isFetching,
        fetchedOnce: nearby.fetchedOnce,
        error: result.error,
        locationStatus: nearby.locationStatus,
        locationMessage: nearby.locationMessage,
        hasLocation: nearby.hasLocation,
        manualFetch: nearby.manualFetch,
        retryPermission: nearby.retryPermission,
    };
}
