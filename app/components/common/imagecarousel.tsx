import React, { useState, useMemo, useEffect } from 'react';
import { View, Image, Dimensions, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';
import { useSharedValue } from 'react-native-reanimated';
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
  const progressValue = useSharedValue<number>(0);

  // Memoize image data to prevent re-renders
  const imageData = useMemo(() => images || [], [images]);

  // Map mode değiştiğinde loading state'ini sıfırla ve component'i yeniden mount et
  useEffect(() => {
    setLoadedImages(new Set());
  }, [isMapMode]);

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  };


  // Parse borderRadiusClass to get border radius value
  const getBorderRadius = () => {
    if (borderRadiusClass.includes('rounded-full')) return height / 2;
    if (borderRadiusClass.includes('rounded-xl')) return 12;
    if (borderRadiusClass.includes('rounded-lg')) return 8;
    if (borderRadiusClass.includes('rounded-md')) return 6;
    if (borderRadiusClass.includes('rounded-sm')) return 4;
    if (borderRadiusClass.includes('rounded-t-sm')) return 4; // top only
    return 0;
  };

  const borderRadiusValue = getBorderRadius();

  // If no images or empty array, show placeholder
  if (!imageData || imageData.length === 0) {
    return (
      <View style={[{ width, height, borderRadius: borderRadiusValue, overflow: 'hidden' }, containerStyle]}>
        <Image
          source={require('../../../assets/images/empty.png')}
          style={{ width: '100%', height: '100%', borderRadius: borderRadiusValue }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Multiple images - show carousel
  // Always use full width to show only 1 photo at a time
  return (
    <View style={[{ width, height, overflow: 'hidden', borderRadius: borderRadiusValue }, containerStyle]}>
      <Carousel
        loop={imageData.length === 1 ? false : true}
        width={width}
        height={height}
        autoPlay={imageData.length === 1 ? false : autoPlay}
        autoPlayInterval={imageData.length === 1 ? 0 : autoPlayInterval}
        data={imageData}
        scrollAnimationDuration={800}
        onSnapToItem={(index) => setActiveIndex(index)}
        onProgressChange={(_, absoluteProgress) => {
          progressValue.value = absoluteProgress;
        }}
        mode={mode}
        renderItem={({ item, index }) => (
          <View
            style={{
              width: width,
              height: height,
              borderRadius: borderRadiusValue,
              overflow: 'hidden',
            }}
          >
            <Image
              key={`img-${index}-${item.imageUrl}`}
              source={
                item.imageUrl
                  ? { uri: item.imageUrl }
                  : require('../../../assets/images/empty.png')
              }
              style={{
                width: '100%',
                height: '100%',
                borderRadius: borderRadiusValue,
              }}
              resizeMode="cover"
              onLoad={() => handleImageLoad(index)}
            />
            {!loadedImages.has(index) && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: borderRadiusValue }}>
                <ActivityIndicator size="large" color="#888" />
              </View>
            )}
          </View>
        )}
      />

      {/* Pagination Dots - Using Carousel's built-in Pagination */}
      {showPagination && imageData.length > 1 && (
        <View className="absolute bottom-3 left-0 right-0">
          <Pagination.Basic
            progress={progressValue}
            data={imageData}
            horizontal
            containerStyle={{ paddingVertical: 4 }}
            dotStyle={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              marginHorizontal: 4,
            }}
            activeDotStyle={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#f05e23',
              marginHorizontal: 0,
            }}
          />
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  const sameImages = prevProps.images === nextProps.images;
  const sameAutoPlay = prevProps.autoPlay === nextProps.autoPlay;
  const sameMapMode = prevProps.isMapMode === nextProps.isMapMode;
  const sameBorderRadius = prevProps.borderRadiusClass === nextProps.borderRadiusClass;
  const sameWidth = prevProps.width === nextProps.width;
  const sameHeight = prevProps.height === nextProps.height;
  const samePagination = prevProps.showPagination === nextProps.showPagination;

  // Width/height değiştiğinde de re-render yap
  return sameImages && sameAutoPlay && sameMapMode && sameBorderRadius && sameWidth && sameHeight && samePagination;
});

ImageCarousel.displayName = 'ImageCarousel';
