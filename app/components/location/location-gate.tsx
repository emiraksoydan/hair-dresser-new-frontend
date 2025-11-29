// components/location/location-gate.ts
import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";
import { ensureLocationPermissionWithPrompt } from "./permission-ui";
import type { LocationGateResult } from "../../types";

function openSettings() {
    Linking.openSettings();
}

async function ensureServicesEnabledWithPrompt(): Promise<boolean> {
    const enabled = await Location.hasServicesEnabledAsync();
    if (enabled) return true;

    return await new Promise<boolean>((resolve) => {
        Alert.alert(
            "Konum kapalı",
            "Devam edebilmek için cihaz konumunu açman gerekiyor.",
            [
                { text: "Vazgeç", style: "cancel", onPress: () => resolve(false) },
                ...(Platform.OS === "android"
                    ? [
                        {
                            text: "Konumu Aç",
                            onPress: async () => {
                                try {
                                    await Location.enableNetworkProviderAsync();
                                } catch { }
                                const after = await Location.hasServicesEnabledAsync();
                                resolve(after);
                            },
                        },
                    ]
                    : []),
                {
                    text: "Ayarlar",
                    onPress: () => {
                        openSettings();
                        resolve(false);
                    },
                },
            ]
        );
    });
}

// Aynı anda 2 yerden çağrılırsa çift alert çıkmasın:
let inflight: Promise<LocationGateResult> | null = null;

export async function ensureLocationGateWithUI(): Promise<LocationGateResult> {
    if (inflight) return inflight;

    inflight = (async () => {
        try {
            const granted = await ensureLocationPermissionWithPrompt();
            if (!granted) return { ok: false, reason: "permission", message: "Konum izni verilmedi." };

            const servicesOk = await ensureServicesEnabledWithPrompt();
            if (!servicesOk) return { ok: false, reason: "services", message: "Konum servisleri kapalı." };

            return { ok: true };
        } catch {
            return { ok: false, reason: "unknown", message: "Konum kapısı doğrulanamadı." };
        } finally {
            inflight = null;
        }
    })();

    return inflight;
}
