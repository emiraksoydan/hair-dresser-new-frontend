import { useColorScheme } from 'react-native';
import { useMemo } from 'react';

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  // Background colors
  background: string;
  backgroundSecondary: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // UI colors
  border: string;
  inputBackground: string;
  inputBorder: string;
  
  // Accent colors
  primary: string;
  primaryText: string;
  
  // Tagline/decoration
  tagline: string;
  taglineLine: string;
}

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const colorScheme: ColorScheme = systemColorScheme || 'light';

  const colors: ThemeColors = useMemo(() => {
    if (colorScheme === 'dark') {
      return {
        // Dark mode colors
        background: '#000000',
        backgroundSecondary: '#1a1a1a',
        card: '#ffffff',
        
        text: '#000000',
        textSecondary: '#666666',
        textTertiary: '#999999',
        
        border: '#e0e0e0',
        inputBackground: '#f5f5f5',
        inputBorder: '#d0d0d0',
        
        primary: '#2a2a2a',
        primaryText: '#ffffff',
        
        tagline: '#000000',
        taglineLine: '#000000',
      };
    } else {
      return {
        // Light mode colors
        background: '#f5f5f5',
        backgroundSecondary: '#ffffff',
        card: '#ffffff',
        
        text: '#000000',
        textSecondary: '#666666',
        textTertiary: '#999999',
        
        border: '#d0d0d0',
        inputBackground: '#ffffff',
        inputBorder: '#d0d0d0',
        
        primary: '#2a2a2a',
        primaryText: '#ffffff',
        
        tagline: '#8b7355',
        taglineLine: '#8b7355',
      };
    }
  }, [colorScheme]);

  return {
    colorScheme,
    colors,
    isDark: colorScheme === 'dark',
    isLight: colorScheme === 'light',
  };
};
