import React from 'react';
import { Text as RNText, TextProps as RNTextProps, Platform } from 'react-native';

export interface TextProps extends RNTextProps {
  children?: React.ReactNode;
}

/**
 * Custom Text component with Century Gothic font applied by default
 * Use this instead of React Native's Text component throughout the app
 */
export const Text: React.FC<TextProps> = ({ className, style, ...props }) => {
  // Century Gothic font'u className ile ekle ve style ile de uygula
  const fontClassName = className
    ? `font-century-gothic ${className}`
    : 'font-century-gothic';

  // React Native'de font adını style ile de uygula (NativeWind bazen font'u uygulamayabilir)
  // useFonts ile yüklenen font adını kullan
  const fontStyle = Platform.select({
    ios: { fontFamily: 'CenturyGothic' },
    android: { fontFamily: 'CenturyGothic' },
    default: {},
  });

  return (
    <RNText
      className={fontClassName}
      style={[fontStyle, style]}
      {...props}
    />
  );
};
