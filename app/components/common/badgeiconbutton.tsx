import React, { useEffect } from "react";
import { View } from "react-native";
import { Badge, IconButton } from "react-native-paper";
import { useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate } from "react-native-reanimated";
import Animated from "react-native-reanimated";

type Props = {
    icon: string;
    iconColor?: string;
    size?: number;
    badgeCount?: number;
    onPress?: () => void;
    badgeColor?: string;
    animateWhenActive?: boolean; // Bildirim çanı için animasyon
};

export function BadgeIconButton({
    icon,
    iconColor = "white",
    size = 24,
    badgeCount = 0,
    onPress,
    badgeColor = "#f05e23",
    animateWhenActive = false,
}: Props) {
    const show = (badgeCount ?? 0) > 0;
    const text = badgeCount! > 99 ? "99+" : String(badgeCount);
    
    // Animasyon için shared value
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);
    
    // Bildirim varsa ve animasyon aktifse animasyonu başlat
    useEffect(() => {
        if (animateWhenActive && show) {
            // Sürekli animasyon: scale ve rotation (sallanma efekti)
            scale.value = withRepeat(
                withTiming(1.15, { duration: 600 }),
                -1,
                true
            );
            rotation.value = withRepeat(
                withTiming(1, { duration: 600 }),
                -1,
                true
            );
        } else {
            // Animasyonu durdur
            scale.value = withTiming(1, { duration: 200 });
            rotation.value = withTiming(0, { duration: 200 });
        }
    }, [show, animateWhenActive]);
    
    // Icon için animasyonlu style
    const animatedIconStyle = useAnimatedStyle(() => {
        const rotate = interpolate(rotation.value, [0, 1], [-15, 15]);
        return {
            transform: [
                { scale: scale.value },
                { rotate: `${rotate}deg` },
            ],
        };
    });
    
    // Bildirim varsa ve animasyon aktifse kırmızı renk kullan
    const finalIconColor = animateWhenActive && show ? "#ef4444" : iconColor;

    return (
        <View style={{ position: "relative" }}>
            {animateWhenActive && show ? (
                <Animated.View style={animatedIconStyle}>
                    <IconButton icon={icon} iconColor={finalIconColor} size={size} onPress={onPress} />
                </Animated.View>
            ) : (
                <IconButton icon={icon} iconColor={finalIconColor} size={size} onPress={onPress} />
            )}
            {show && (
                <Badge
                    style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        backgroundColor: badgeColor,
                    }}
                    size={16}
                >
                    {text}
                </Badge>
            )}
        </View>
    );
}
