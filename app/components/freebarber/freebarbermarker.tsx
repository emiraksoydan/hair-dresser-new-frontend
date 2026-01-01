import React, { useState, memo } from "react";
import { View, Image, ActivityIndicator } from "react-native";
import { Marker } from "react-native-maps";
import { Icon } from "react-native-paper";

interface FreeBarberMarkerProps {
    barberId: string;
    coordinate: { latitude: number; longitude: number };
    title: string;
    imageUrl?: string;
    barberType: number;
    onPress: () => void;
}

export const FreeBarberMarker = memo(({ barberId, coordinate, title, imageUrl, barberType, onPress }: FreeBarberMarkerProps) => {
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    const bg = barberType == 0 ? "#2563eb" : barberType == 1 ? "#db2777" : "#16a34a";
    const iconName = barberType == 0 ? "face-man" : "face-woman";
    const hasImage = imageUrl && !imageError;

    return (
        <Marker
            key={`freebarber-${barberId}`}
            coordinate={coordinate}
            title={title}
            tracksViewChanges={false}
            onPress={onPress}
        >
            <View
                className="items-center justify-center w-8 h-8 rounded-full"
                style={{
                    elevation: 4,
                    borderWidth: hasImage ? 0 : 1,
                    borderColor: "white",
                    backgroundColor: bg,
                }}
            >
                {hasImage ? (
                    <>
                        <Image
                            source={{ uri: imageUrl }}
                            className="w-full h-full rounded-full"
                            resizeMode="cover"
                            onLoadStart={() => setImageLoading(true)}
                            onLoadEnd={() => setImageLoading(false)}
                            onError={() => {
                                setImageLoading(false);
                                setImageError(true);
                            }}
                        />
                        {imageLoading && (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: bg, borderRadius: 16 }}>
                                <ActivityIndicator size="small" color="white" />
                            </View>
                        )}
                    </>
                ) : (
                    <Icon source={iconName} color="white" size={20} />
                )}
            </View>
        </Marker>
    );
});
