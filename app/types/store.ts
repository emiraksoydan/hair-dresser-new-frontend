/**
 * Barber Store-related types
 */

import { BarberType, ImageGetDto, ServiceOfferingGetDto } from './common';

export enum PricingType {
  Percent = 0,
  Rent = 1,
}

export enum ImageOwnerType {
  User = 1,
  Store = 2,
  ManuelBarber = 3,
  FreeBarber = 4
}

// DTOs
export type BarberStoreCreateDto = {
  storeName: string;
  storeImageList?: CreateImageDto[];
  type: number;
  pricingType: number;
  addressDescription: string;
  latitude: number;
  longitude: number;
  pricingValue: number;
  taxDocumentFilePath: string;
  chairs: BarberChairCreateDto[];
  offerings: ServiceOfferingCreateDto[];
  manuelBarbers: ManuelBarberCreateDto[];
  workingHours: WorkingHourCreateDto[];
};

export type BarberStoreUpdateDto = {
  id: string;
  storeName: string;
  storeImageList?: UpdateImageDto[];
  type: number;
  pricingType: number;
  addressDescription: string;
  latitude: number;
  longitude: number;
  pricingValue: number;
  taxDocumentFilePath: string;
  chairs: BarberChairUpdateDto[];
  offerings: ServiceOfferingUpdateDto[];
  manuelBarbers: ManuelBarberUpdateDto[];
  workingHours: WorkingHourUpdateDto[];
};

export type BarberStoreGetDto = {
  id: string;
  storeName: string;
  pricingType: string;
  pricingValue: number;
  type: BarberType;
  rating: number;
  distanceKm: number;
  favoriteCount: number;
  latitude: number;
  longitude: number;
  addressDescription: string;
  isOpenNow: boolean;
  reviewCount: number;
  serviceOfferings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
};

export type BarberStoreMineDto = {
  id: string;
  storeName: string;
  type: BarberType;
  rating: number;
  favoriteCount: number;
  reviewCount: number;
  isOpenNow: boolean;
  addressDescription?: string;
  latitude?: number;
  longitude?: number;
  serviceOfferings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
  pricingType?: string;
  pricingValue?: number;
};

export type BarberStoreDetail = {
  id: string;
  storeName: string;
  imageList: ImageGetDto[];
  type: string;
  pricingType: string;
  pricingValue: number;
  latitude: number;
  longitude: number;
  isOpenNow: boolean;
  addressDescription: string;
  barberStoreChairs: BarberChairDto[];
  manuelBarbers: ManuelBarberDto[];
  serviceOfferings: ServiceOfferingGetDto[];
  workingHours: WorkingHourGetDto[];
  taxDocumentFilePath: string;
};

// Sub-entities
export type BarberChairCreateDto = {
  barberId?: string;
  id?: string;
  name?: string;
  storeId?: string;
};

export type BarberChairUpdateDto = {
  barberId?: string;
  id: string;
  name?: string;
};

export type BarberChairDto = {
  id: string;
  name?: string;
  manualBarberId?: string;
};

export type ServiceOfferingCreateDto = {
  price: number;
  serviceName: string;
};

export type ServiceOfferingUpdateDto = {
  id?: string;
  price: number;
  serviceName: string;
  ownerId?: string;
};

export type ManuelBarberCreateDto = {
  id?: string;
  fullName: string;
  profileImageUrl?: string;
  storeId?: string;
};

export type ManuelBarberUpdateDto = {
  id?: string;
  fullName: string;
  profileImageUrl?: string;
};

export type ManuelBarberDto = {
  id: string;
  fullName: string;
  profileImageUrl: string;
  rating: number;
};

export type WorkingHourCreateDto = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
};

export type WorkingHourUpdateDto = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
  ownerId?: string;
};

export type WorkingHourGetDto = {
  dayOfWeek: number;
  endTime: string;
  id: string;
  isClosed: boolean;
  ownerId: string;
  startTime: string;
};

export type CreateImageDto = {
  imageUrl: string;
  ownerType: ImageOwnerType;
  imageOwnerId?: string;
};

export type UpdateImageDto = {
  id: string;
  imageUrl: string;
  imageOwnerId: string;
  ownerType?: number;
};

