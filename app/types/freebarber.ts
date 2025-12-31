/**
 * Free Barber-related types
 */

import { BarberType, ImageGetDto, ServiceOfferingGetDto } from './common';
import type { CreateImageDto, ServiceOfferingCreateDto, ServiceOfferingUpdateDto, UpdateImageDto } from './store';

export type FreeBarberCreateDto = {
  firstName: string;
  lastName: string;
  type: BarberType;
  imageList?: CreateImageDto[];
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  barberCertificateImageId?: string;
  offerings: ServiceOfferingCreateDto[];
};

export type FreeBarberUpdateDto = {
  id: string;
  firstName: string;
  lastName: string;
  type: BarberType;
  imageList?: UpdateImageDto[];
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  barberCertificateImageId?: string;
  offerings: ServiceOfferingUpdateDto[];
};

export type FreeBarGetDto = {
  id: string;
  freeBarberUserId?: string;
  fullName: string;
  rating: number;
  favoriteCount: number;
  isAvailable: boolean;
  distanceKm: number;
  type: BarberType;
  reviewCount: number;
  latitude: number;
  longitude: number;
  offerings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
};

export type FreeBarberPanelDto = {
  id: string;
  freeBarberUserId?: string;
  fullName: string;
  rating: number;
  favoriteCount: number;
  isAvailable: boolean;
  type: BarberType;
  reviewCount: number;
  latitude: number;
  longitude: number;
  offerings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
};

export type FreeBarberMinePanelDetailDto = {
  id: string;
  firstName: string;
  lastName: string;
  type: BarberType;
  isAvailable: boolean;
  offerings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
  latitude?: number;
  longitude?: number;
};

// Re-export from store types for convenience
export type { CreateImageDto, ServiceOfferingCreateDto, ServiceOfferingUpdateDto, UpdateImageDto };


