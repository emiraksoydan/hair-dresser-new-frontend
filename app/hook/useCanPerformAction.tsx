import { Alert } from 'react-native';
import { LocationStatus } from '../types';
import { useLanguage } from './useLanguage';

/**
 * Hook to check if user can perform actions (appointment booking, panel add/update)
 * Returns false if:
 * - Server is down (error exists)
 * - Location permission is denied
 */
export function useCanPerformAction(
    error: any,
    locationStatus: LocationStatus | undefined,
    locationMessage?: string
): { canPerform: boolean; checkAndAlert: () => boolean } {
    const { t } = useLanguage();
    const canPerform = !error && locationStatus !== 'denied';

    const checkAndAlert = (): boolean => {
        if (error) {
            const errorMessage = error?.data?.message || error?.message || t('errors.serverUnreachable');
            Alert.alert(t('common.error'), errorMessage);
            return false;
        }

        if (locationStatus === 'denied') {
            Alert.alert(
                t('location.locationRequired'),
                locationMessage || t('location.permissionDeniedSettings')
            );
            return false;
        }

        return true;
    };

    return { canPerform, checkAndAlert };
}
