import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

export async function ensureLocationPermissionWithPrompt(): Promise<boolean> {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
        return true;
    }
    if (!canAskAgain) {
        Alert.alert(
            'Konum izni gerekli',
            'Konum izni vermediğiniz için bazı özellikler çalışmayacak. Ayarlardan el ile izin vermeniz gerekiyor.',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Ayarları aç',
                    onPress: () => {
                        Linking.openSettings(); // kullanıcıyı uygulama ayarlarına atar
                    },
                },
            ]
        );
        return false;
    }
    return await new Promise<boolean>((resolve) => {
        Alert.alert(
            'Konum izni gerekli',
            'Konum izinlerini kabul etmeden devam edemezsiniz.',
            [
                {
                    text: 'Vazgeç',
                    style: 'cancel',
                    onPress: () => resolve(false),
                },
                {
                    text: 'Tekrar dene',
                    onPress: async () => {
                        const ok = await ensureLocationPermissionWithPrompt();
                        resolve(ok);
                    },
                },
            ]
        );
    });
}
