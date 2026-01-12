import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { ImageCarousel } from './imagecarousel';
import { ImageGetDto } from '../../types';

interface CardImageProps {
  images?: ImageGetDto[];
  singleImageUrl?: string | null;
  onPress?: () => void;
  isList: boolean;
  width: number;
  height?: number;
  borderRadiusClass?: string;
  showPagination?: boolean;
  autoPlay?: boolean;
  isMapMode?: boolean;
  className?: string;
}

/**
 * Unified image component for cards
 * Supports both single image and image carousel
 */
export const CardImage: React.FC<CardImageProps> = ({
  images,
  singleImageUrl,
  onPress,
  isList,
  width,
  height,
  borderRadiusClass = 'rounded-lg',
  showPagination = true,
  autoPlay = true,
  isMapMode = false,
  className = '',
}) => {
  const imageHeight = height || (isList ? 250 : 112);
  const emptyImage = require('../../../assets/images/empty.png');

  // If we have multiple images, use carousel
  if (images && images.length > 0) {
    return (
      <View className={`relative ${className}`}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          <ImageCarousel
            images={images}
            width={width}
            height={imageHeight}
            autoPlay={autoPlay}
            mode="default"
            borderRadiusClass={borderRadiusClass}
            showPagination={showPagination}
            isMapMode={isMapMode}
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Single image
  return (
    <View className={`relative ${className}`}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <Image
          defaultSource={emptyImage}
          className={`${isList ? 'w-full' : ''} ${borderRadiusClass} mb-0`}
          style={{ width, height: imageHeight }}
          source={singleImageUrl ? { uri: singleImageUrl } : emptyImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </View>
  );
};
