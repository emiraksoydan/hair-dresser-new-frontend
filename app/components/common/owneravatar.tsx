import React from "react";
import { Image, View } from "react-native";
import { Icon } from "react-native-paper";
import { useGetImagesByOwnerQuery } from "../../store/api";
import { ImageOwnerType } from "../../types";

type Props = {
    ownerId?: string | null;
    ownerType?: ImageOwnerType | null;
    fallbackUrl?: string | null;
    preferServer?: boolean;
    imageClassName: string;
    resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
    iconSource: string;
    iconSize?: number;
    iconColor?: string;
    iconContainerClassName?: string;
};

export const OwnerAvatar: React.FC<Props> = ({
    ownerId,
    ownerType,
    fallbackUrl,
    preferServer = false,
    imageClassName,
    resizeMode = "cover",
    iconSource,
    iconSize = 24,
    iconColor = "#6b7280",
    iconContainerClassName = "bg-[#2a2c30]",
}) => {
    const shouldFetch =
        !!ownerId && ownerType != null && (preferServer || !fallbackUrl);

    const { data: images } = useGetImagesByOwnerQuery(
        { ownerId: ownerId ?? "", ownerType: ownerType as ImageOwnerType },
        { skip: !shouldFetch }
    );

    const resolvedUrl = (images?.[0]?.imageUrl ?? fallbackUrl) || null;

    if (resolvedUrl) {
        return (
            <Image
                source={{ uri: resolvedUrl }}
                className={imageClassName}
                resizeMode={resizeMode}
            />
        );
    }

    return (
        <View
            className={`${imageClassName} ${iconContainerClassName} items-center justify-center`}
        >
            <Icon source={iconSource} size={iconSize} color={iconColor} />
        </View>
    );
};

