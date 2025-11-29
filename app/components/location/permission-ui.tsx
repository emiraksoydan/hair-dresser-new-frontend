// components/location/permission-ui.ts
import * as Location from "expo-location";
import { Alert, Linking } from "react-native";

function openSettings() {
    Linking.openSettings();
}

export async function ensureLocationPermissionWithPrompt(): Promise<boolean> {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === "granted") return true;

    // ilk dene: request
    const req = await Location.requestForegroundPermissionsAsync();
    if (req.status === "granted") return true;

    // denied: UI göster
    return await new Promise<boolean>((resolve) => {
        const canAskAgain = !!req.canAskAgain;

        Alert.alert(
            "Konum izni gerekli",
            canAskAgain
                ? "Yakındaki işletmeleri gösterebilmek için konum izni vermen gerekiyor."
                : "Konum izni kapalı görünüyor. Ayarlardan konum iznini açman gerekiyor.",
            [
                { text: "Vazgeç", style: "cancel", onPress: () => resolve(false) },
                {
                    text: canAskAgain ? "Tekrar dene" : "Ayarlar",
                    onPress: async () => {
                        if (canAskAgain) {
                            const again = await Location.requestForegroundPermissionsAsync();
                            resolve(again.status === "granted");
                        } else {
                            openSettings();
                            resolve(false);
                        }
                    },
                },
                ...(canAskAgain
                    ? [
                        {
                            text: "Ayarlar",
                            onPress: () => {
                                openSettings();
                                resolve(false);
                            },
                        },
                    ]
                    : []),
            ]
        );
    });
}
