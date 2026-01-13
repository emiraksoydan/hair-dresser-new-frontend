import React, { useState, memo, useEffect } from "react";
import { View, Image, ActivityIndicator } from "react-native";
import { Marker } from "react-native-maps";
import { Icon } from "react-native-paper";

interface StoreMarkerProps {
    storeId: string;
    coordinate: { latitude: number; longitude: number };
    title: string;
    description?: string;
    imageUrl?: string;
    storeType: number;
    onPress: () => void;
}

export const StoreMarker = memo(({ storeId, coordinate, title, description, imageUrl, storeType, onPress }: StoreMarkerProps) => {
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    const bg = storeType == 0 ? "#2563eb" : storeType == 1 ? "#db2777" : "#16a34a";
    const iconName = storeType == 0 ? "face-man" : "face-woman";
    const hasImage = imageUrl && !imageError;

    // Stop tracking after initial render to improve performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setTracksViewChanges(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Marker
            key={`store-${storeId}`}
            coordinate={coordinate}
            title={title}
            description={description}
            tracksViewChanges={tracksViewChanges}
            onPress={onPress}
        >
            <View
                className="items-center justify-center w-9 h-9 rounded-full"
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
                            onLoadStart={() => {
                                setImageLoading(true);
                                setTracksViewChanges(true);
                            }}
                            onLoadEnd={() => {
                                setImageLoading(false);
                                // Resim yüklendiğinde bir süre daha track et ki resim görünsün
                                setTracksViewChanges(true);
                                setTimeout(() => setTracksViewChanges(false), 200);
                            }}
                            onError={() => {
                                setImageLoading(false);
                                setImageError(true);
                                setTracksViewChanges(false);
                            }}
                        />
                        {imageLoading && (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: bg, borderRadius: 18 }}>
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
