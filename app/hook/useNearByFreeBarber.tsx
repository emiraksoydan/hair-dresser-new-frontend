// useNearByFreeBarber.ts (useNearbyFreeBarber)
// Wrapper hook for free barbers - uses the generic useNearby hook
import { useLazyGetNearbyFreeBarberQuery } from "../store/api";
import { useNearby } from "./useNearby";
import type { FreeBarGetDto } from "../types";

export function useNearbyFreeBarber(enabled: boolean) {
    const result = useNearby<FreeBarGetDto>(
        useLazyGetNearbyFreeBarberQuery,
        { enabled }
    );

    return {
        freeBarbers: result.data,
        loading: result.loading,
        fetching: result.fetching,
        fetchedOnce: result.fetchedOnce,
        error: result.error,
        locationStatus: result.locationStatus,
        locationMessage: result.locationMessage,
        hasLocation: result.hasLocation,
        manualFetch: result.manualFetch,
        retryPermission: result.retryPermission,
    };
}
