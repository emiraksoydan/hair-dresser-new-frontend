import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { MotiText } from 'moti';

type EmptyStateProps = {
    message?: string;
    style?: StyleProp<ViewStyle>;
    animationSource?: any;
    animationSize?: number;
};

export const LottieViewComponent: React.FC<EmptyStateProps> = ({
    message = 'Yakınında şu an listelenecek berber bulunamadı.',
    style,
    animationSource = require('../../assets/animations/empty.json'),
    animationSize = 120,
}) => {
    return (
        <View className="items-center justify-start pt-4" style={style}>
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
                className="mt-0 text-white text-lg text-center"
            >
                {message}
            </MotiText>
        </View>
    );
};
