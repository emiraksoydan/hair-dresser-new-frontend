import React from "react";
import { View } from "react-native";
import { Badge, IconButton } from "react-native-paper";

type Props = {
    icon: string;
    iconColor?: string;
    size?: number;
    badgeCount?: number;
    onPress?: () => void;
    badgeColor?: string;
};

export function BadgeIconButton({
    icon,
    iconColor = "white",
    size = 24,
    badgeCount = 0,
    onPress,
    badgeColor = "#f05e23",
}: Props) {
    const show = (badgeCount ?? 0) > 0;
    const text = badgeCount! > 99 ? "99+" : String(badgeCount);

    return (
        <View style={{ position: "relative" }}>
            <IconButton icon={icon} iconColor={iconColor} size={size} onPress={onPress} />
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
