// Index.tsx dosyasının en altına veya ayrı bir dosyaya ekleyebilirsin
import React, { useEffect, useRef, useState, memo } from "react";
import { View, Image } from "react-native";
import { Marker } from "react-native-maps";
import { Icon } from "react-native-paper";
import { FreeBarGetDto } from "../types"; // Tiplerinin yolu
import { safeCoord } from "../utils/location/geo";

interface BarberMarkerProps {
    barber: FreeBarGetDto;
    onPress: (item: FreeBarGetDto) => void;
}

// MEMO kullanarak gereksiz renderları önlüyoruz
export const BarberMarker = memo(({ barber, onPress }: BarberMarkerProps) => {
    // Marker her mount olduğunda (listeye girdiğinde) TRUE başlar
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    const id = (barber as any).id;

    useEffect(() => {
        // Marker ekrana geldikten 500ms sonra takibi bırak (Performans için)
        // Bu süre, marker'ın "görünmez" gelmesini engeller.
        const timer = setTimeout(() => {
            setTracksViewChanges(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const c = safeCoord((barber as any).latitude, (barber as any).longitude);
    if (!c) return null;

    const avatarUrl = (barber as any)?.imageList?.[0]?.imageUrl;
    const bg = (barber as any).type == 0 ? "#2563eb" : "#db2777";
    const iconName = (barber as any).type == 0 ? "face-man" : "face-woman";

    return (
        <Marker
            coordinate={{ latitude: c.lat, longitude: c.lon }}
            title={(barber as any).fullName}
            tracksViewChanges={tracksViewChanges} // State'ten geliyor
            onPress={() => onPress(barber)}
            // Z-Index ile markerların üst üste binme sırasını düzeltebilirsin
            zIndex={tracksViewChanges ? 2 : 1}
        >
            <View
                className="items-center justify-center w-8 h-8 rounded-full"
                style={{
                    elevation: 4,
                    borderWidth: avatarUrl ? 0 : 1,
                    borderColor: "white",
                    backgroundColor: bg,
                }}
            >
                {avatarUrl ? (
                    <Image
                        source={{ uri: avatarUrl }}
                        className="w-full h-full rounded-full"
                        resizeMode="cover"
                        // Resim yüklendiğinde tekrar tetiklemeye gerek yok,
                        // çünkü useEffect'teki timeout zaten kapatacak.
                        // Ama resim geç yüklenirse diye bir güvenlik açabiliriz:
                        onLoadEnd={() => {
                            // Resim yüklenince bir anlık tekrar track et, sonra kapat
                            setTracksViewChanges(true);
                            setTimeout(() => setTracksViewChanges(false), 200);
                        }}
                    />
                ) : (
                    <Icon source={iconName} color="white" size={20} />
                )}
            </View>
        </Marker>
    );
});