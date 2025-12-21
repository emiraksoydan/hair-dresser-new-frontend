// useNearByStore.ts (useNearbyStores)
// Wrapper hook for stores - uses the generic useNearby hook
import { useLazyGetNearbyStoresQuery } from "../store/api";
import { useNearby } from "./useNearby";
import type { BarberStoreGetDto } from "../types";

export function useNearbyStores(enabled: boolean) {
    const result = useNearby<BarberStoreGetDto>(
        useLazyGetNearbyStoresQuery,
        { enabled }
    );

    return {
        stores: result.data,
        loading: result.loading,
        fetching: result.fetching,
        fetchedOnce: result.fetchedOnce,
        error: result.error,
        locationStatus: result.locationStatus,
        locationMessage: result.locationMessage,
        hasLocation: result.hasLocation,
        location: result.location,
        manualFetch: result.manualFetch,
        retryPermission: result.retryPermission,
    };
}
