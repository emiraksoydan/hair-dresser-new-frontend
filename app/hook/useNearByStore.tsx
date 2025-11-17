// useNearbyStores.ts
import { useLazyGetNearbyStoresQuery } from '../store/api';
import { useNearbyControl } from './useNearByControl';
import type { BarberStoreGetDto } from '../types';

const DEFAULT_RADIUS_KM = 1;

export function useNearbyStores(enabled: boolean) {
    const [trigger, result] = useLazyGetNearbyStoresQuery();

    const { locationStatus, hasLocation, manualFetch, retryPermission } = useNearbyControl({
        enabled,
        moveThresholdM: 150,
        staleMs: 15_000,
        hardRefreshMs: 15_000,
        onFetch: async (lat, lon) => {
            await trigger({ lat, lon, radiusKm: DEFAULT_RADIUS_KM }, true);
        },
    });

    return {
        stores: (result.data ?? []) as BarberStoreGetDto[],
        loading: result.isLoading || result.isFetching,
        error: result.error,
        locationStatus,
        hasLocation,
        manualFetch,
        retryPermission,
    };
}
