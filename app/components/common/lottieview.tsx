import React from 'react';
import { View, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';
import { MotiText } from 'moti';
import { useLanguage } from '../../hook/useLanguage';
import { Text } from './Text';

type EmptyStateProps = {
    message?: string;
    style?: StyleProp<ViewStyle>;
    animationSource?: any;
    animationSize?: number;
    onRetry?: () => void;
    showRetryButton?: boolean;
};

export const LottieViewComponent: React.FC<EmptyStateProps> = ({
    message,
    style,
    animationSource = require('../../../assets/animations/empty.json'),
    animationSize = 120,
    onRetry,
    showRetryButton = false,
}) => {
    const { t } = useLanguage();
    const defaultMessage = message || t('empty.noBarbersNearby');
    
    // Retry butonunu göster: showRetryButton true ise veya onRetry verilmişse ve error animasyonu ise
    const shouldShowRetry = showRetryButton || (onRetry && animationSource?.toString?.()?.includes?.('error'));
    
    return (
        <View className="items-center justify-center py-8 px-4" style={[{ minHeight: 200, maxHeight: 400 }, style]}>
            <LottieView
                source={animationSource}
                autoPlay
                loop
                style={{ width: animationSize, height: animationSize }}
            />
            <MotiText
                from={{ opacity: 0.7, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    type: 'timing',
                    duration: 1200,
                    loop: true,
                    repeatReverse: true,
                }}
                className="mt-2 text-white text-base text-center px-4"
                style={{ fontFamily: 'CenturyGothic' }}
                numberOfLines={3}
            >
                {defaultMessage}
            </MotiText>
            {onRetry && (
                <View className="mt-4">
                    <TouchableOpacity
                        onPress={onRetry}
                        className="bg-[#c2a523] px-6 py-2 rounded-lg"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-medium">{t("common.retry")}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};
