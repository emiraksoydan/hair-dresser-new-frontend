import { Alert } from 'react-native';
import { LocationStatus } from '../types';

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
    const canPerform = !error && locationStatus !== 'denied';

    const checkAndAlert = (): boolean => {
        if (error) {
            const errorMessage = error?.data?.message || error?.message || 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.';
            Alert.alert('Hata', errorMessage);
            return false;
        }

        if (locationStatus === 'denied') {
            Alert.alert(
                'Konum İzni Gerekli',
                locationMessage || 'Bu işlemi gerçekleştirmek için konum izni gereklidir. Lütfen ayarlardan konum iznini açın.'
            );
            return false;
        }

        return true;
    };

    return { canPerform, checkAndAlert };
}
