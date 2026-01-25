import React, { useState } from 'react';
import { Image, ImageProps, View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';

interface FallbackImageProps extends Omit<ImageProps, 'source'> {
  source?: { uri?: string } | number;
  fallbackSource?: any;
  showIconFallback?: boolean;
  iconName?: string;
  iconSize?: number;
  iconColor?: string;
}

export const FallbackImage: React.FC<FallbackImageProps> = ({
  source,
  fallbackSource,
  showIconFallback = false,
  iconName = 'image-outline',
  iconSize = 40,
  iconColor = '#666',
  style,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine if we should show fallback
  const shouldShowFallback = hasError || !source || (typeof source === 'object' && !source.uri);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // If we should show fallback and showIconFallback is true, show icon instead
  if (shouldShowFallback && showIconFallback) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Icon source={iconName} size={iconSize} color={iconColor} />
      </View>
    );
  }

  // If should show fallback but no fallbackSource and no icon fallback, return null or empty view
  if (shouldShowFallback && !fallbackSource && !showIconFallback) {
    return <View style={style} />;
  }

  return (
    <Image
      {...props}
      source={shouldShowFallback ? (fallbackSource || undefined) : source}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      onLoadStart={() => setIsLoading(true)}
    />
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});

// Usage examples:
// <FallbackImage source={{ uri: imageUrl }} style={styles.image} />
// <FallbackImage source={{ uri: imageUrl }} showIconFallback style={styles.image} />
// <FallbackImage source={{ uri: imageUrl }} fallbackSource={require('./custom-fallback.png')} />
