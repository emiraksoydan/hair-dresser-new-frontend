import React from 'react';
import { View, Image, Dimensions, StyleProp, ViewStyle } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { ImageGetDto } from '../../types/common';

interface ImageCarouselProps {
  images: ImageGetDto[];
  width?: number;
  height?: number;
  autoPlay?: boolean;
  borderRadiusClass?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  width: widthProp,
  height = 250,
  autoPlay = true,
  borderRadiusClass = '',
  containerStyle,
}) => {
  const width = widthProp ?? Dimensions.get('window').width;

  // If no images or empty array, show placeholder
  if (!images || images.length === 0) {
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
  if (images.length === 1) {
    return (
      <View style={[{ width, height }, containerStyle]} className={borderRadiusClass}>
        <Image
          source={
            images[0].imageUrl
              ? { uri: images[0].imageUrl }
              : require('../../../assets/images/empty.png')
          }
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
        autoPlay={autoPlay}
        autoPlayInterval={3000}
        data={images}
        scrollAnimationDuration={1000}
        renderItem={({ item }) => (
          <View className="w-full h-full">
            <Image
              source={
                item.imageUrl
                  ? { uri: item.imageUrl }
                  : require('../../../assets/images/empty.png')
              }
              className={`w-full h-full ${borderRadiusClass}`}
              resizeMode="cover"
            />
          </View>
        )}
      />
    </View>
  );
};
