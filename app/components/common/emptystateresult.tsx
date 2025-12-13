import React from "react";
import { LottieViewComponent } from "./lottieview";
import { EmptyStateProps } from "../../types";



export const EmptyState = ({
    loading,
    locationStatus,
    hasLocation,
    fetchedOnce,
    hasData,
    noResultText,
    needLocationText = "Lütfen konumunuzu açınız.",
    deniedText = "Konum izni verilmedi. Tekrar dene veya ayarlardan izin ver.",
    onRetry,
}: EmptyStateProps) => {
    if (loading) return null;

    const showDenied = locationStatus === "denied";
    const showNeedLocation = !showDenied && !hasLocation;
    const showNoResults = fetchedOnce && !hasData && hasLocation;

    if (showDenied) {
        return (
            <LottieViewComponent
                animationSource={require("../../../assets/animations/Location.json")}
                message={deniedText}
            />
        );
    }
    if (showNeedLocation) {
        return (
            <LottieViewComponent
                animationSource={require("../../../assets/animations/Location.json")}
                message={needLocationText}
            />
        );
    }

    if (showNoResults) {
        return <LottieViewComponent message={noResultText} />;
    }
    return null;
};
