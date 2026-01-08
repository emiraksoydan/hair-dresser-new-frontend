import React from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { View, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
    onPress: () => void;
    children: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
    mode?: 'contained' | 'outlined' | 'text' | 'contained-tonal';
    buttonColor?: string;
    textColor?: string;
    icon?: string;
    style?: ViewStyle;
    className?: string;
    contentStyle?: ViewStyle;
    labelStyle?: TextStyle;
    testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
    onPress,
    children,
    loading = false,
    disabled = false,
    mode = 'contained',
    buttonColor,
    textColor,
    icon,
    style,
    className,
    contentStyle,
    labelStyle,
    testID,
}) => {
    const isDisabled = disabled || loading;

    // React Native Paper Button kullan ve className için View ile wrap et
    const button = (
        <PaperButton
            mode={mode}
            onPress={onPress}
            disabled={isDisabled}
            loading={loading}
            icon={icon}
            buttonColor={buttonColor}
            textColor={textColor}
            style={[
                {
                    borderRadius: 10,
                    paddingVertical: 2,
                    paddingHorizontal: 16,
                },
                style,
            ]}
            contentStyle={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                contentStyle,
            ]}
            labelStyle={[
                {
                    fontSize: 16,
                    fontWeight: '600',
                },
                labelStyle,
            ]}
            testID={testID}
        >
            {children}
        </PaperButton>
    );

    // className varsa View ile wrap et
    if (className) {
        return (
            <View className={className}>
                {button}
            </View>
        );
    }

    return button;
};
