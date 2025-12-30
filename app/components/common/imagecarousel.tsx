import React from 'react';
import { View, Image, Dimensions, StyleProp, ViewStyle } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { ImageGetDto } from '../../types/common';

interface ImageCarouselProps {
  images: ImageGetDto[];
  height?: number;
  borderRadiusClass?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  height = 250,
  borderRadiusClass = '',
  containerStyle,
}) => {
  const width = Dimensions.get('window').width;

  // If no images or empty array, show placeholder
  if (!images || images.length === 0) {
    return (
      <View style={[{ width, height }, containerStyle]} className={borderRadiusClass}>
        <Image
          source={{ uri: 'https://picsum.photos/900/600' }}
          className={`w-full h-full ${borderRadiusClass}`}
          resizeMode="cover"
        />
      </View>
    );
  }

  // If only one image, show it without carousel
  if (images.length === 1) {
    return (
      <View style={[{ width, height }, containerStyle]} className={borderRadiusClass}>
        <Image
          source={{ uri: images[0].imageUrl || 'https://picsum.photos/900/600' }}
          className={`w-full h-full ${borderRadiusClass}`}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Multiple images - show carousel
  return (
    <View style={[{ width, height }, containerStyle]} className={borderRadiusClass}>
      <Carousel
        loop
        width={width}
        height={height}
        autoPlay={true}
        autoPlayInterval={3000}
        data={images}
        scrollAnimationDuration={1000}
        renderItem={({ item }) => (
          <View className="w-full h-full">
            <Image
              source={{ uri: item.imageUrl || 'https://picsum.photos/900/600' }}
              className={`w-full h-full ${borderRadiusClass}`}
              resizeMode="cover"
            />
          </View>
        )}
      />
    </View>
  );
};
