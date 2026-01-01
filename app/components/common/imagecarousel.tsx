import React, { useState, useMemo } from 'react';
import { View, Image, Dimensions, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { ImageGetDto } from '../../types/common';

interface ImageCarouselProps {
  images: ImageGetDto[];
  width?: number;
  height?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  borderRadiusClass?: string;
  containerStyle?: StyleProp<ViewStyle>;
  showPagination?: boolean;
  mode?: any; // Allow any mode supported by the carousel library
  isMapMode?: boolean;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = React.memo(({
  images,
  width: widthProp,
  height = 250,
  autoPlay = true,
  autoPlayInterval = 3000,
  borderRadiusClass = '',
  containerStyle,
  showPagination = true,
  mode = 'horizontal-stack',
  isMapMode = false,
}) => {
  const width = widthProp ?? Dimensions.get('window').width;
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // Memoize image data to prevent re-renders
  const imageData = useMemo(() => images || [], [images]);

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  };

  // If no images or empty array, show placeholder
  if (!imageData || imageData.length === 0) {
    return (
      <View style={[{ width, height }, containerStyle]} className={borderRadiusClass}>
        <Image
          source={require('../../../assets/images/empty.png')}
          className={`w-full h-full ${borderRadiusClass}`}
          resizeMode="cover"
        />
      </View>
    );
  }

  // If only one image, show it without carousel
  if (imageData.length === 1) {
    return (
      <View style={[{ width, height }, containerStyle]} className={borderRadiusClass}>
        <Image
          source={
            imageData[0].imageUrl
              ? { uri: imageData[0].imageUrl }
              : require('../../../assets/images/empty.png')
          }
          className={`w-full h-full ${borderRadiusClass}`}
          resizeMode="cover"
          onLoadStart={() => setLoadedImages(new Set())}
          onLoad={() => handleImageLoad(0)}
        />
        {!loadedImages.has(0) && (
          <View className="absolute inset-0 items-center justify-center bg-gray-800">
            <ActivityIndicator size="large" color="#888" />
          </View>
        )}
      </View>
    );
  }

  // Multiple images - show carousel
  // Always use full width to show only 1 photo at a time
  return (
    <View style={[{ width, height }, containerStyle]}>
      <Carousel
        loop
        width={width}
        height={height}
        autoPlay={autoPlay}
        autoPlayInterval={autoPlayInterval}
        data={imageData}
        scrollAnimationDuration={800}
        onSnapToItem={(index) => setActiveIndex(index)}
        mode={mode}
        renderItem={({ item, index }) => (
          <View
            className={`h-full ${borderRadiusClass}`}
            style={{
              width: width,
            }}
          >
            <Image
              source={
                item.imageUrl
                  ? { uri: item.imageUrl }
                  : require('../../../assets/images/empty.png')
              }
              className={`w-full h-full ${borderRadiusClass}`}
              resizeMode="cover"
              onLoad={() => handleImageLoad(index)}
            />
            {!loadedImages.has(index) && (
              <View className="absolute inset-0 items-center justify-center bg-gray-800 rounded-xl">
                <ActivityIndicator size="large" color="#888" />
              </View>
            )}
          </View>
        )}
      />

      {/* Pagination Dots */}
      {showPagination && imageData.length > 1 && (
        <View className="absolute bottom-3 left-0 right-0 flex-row justify-center items-center gap-2">
          {imageData.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full transition-all ${index === activeIndex
                ? 'w-6 bg-white'
                : 'w-2 bg-white/50'
                }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.images === nextProps.images &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.autoPlay === nextProps.autoPlay &&
    prevProps.isMapMode === nextProps.isMapMode
  );
});

ImageCarousel.displayName = 'ImageCarousel';
