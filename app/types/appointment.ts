/**
 * Appointment-related types
 */

import { BarberType, ServiceOfferingGetDto } from './common';
import { PricingType } from './store';

export enum AppointmentStatus {
  Pending = 0,
  Approved = 1,
  Completed = 2,
  Cancelled = 3,
  Rejected = 4,
  Unanswered = 5,
}

export enum DecisionStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  NoAnswer = 3,
}

export enum AppointmentRequester {
  Customer = 1,
  Store = 2,
  FreeBarber = 3,
}

export type CreateAppointmentRequestDto = {
  storeId: string;
  chairId?: string | null;
  appointmentDate: string; // DateOnly format: "YYYY-MM-DD"
  startTime?: string | null; // TimeSpan format: "HH:mm:ss"
  endTime?: string | null; // TimeSpan format: "HH:mm:ss"
  freeBarberUserId?: string | null;
  serviceOfferingIds: string[];
  requestLatitude?: number | null;
  requestLongitude?: number | null;
};


export enum AppointmentFilter {
  Active = 1,
  Completed = 2,
  Cancelled = 3,
}

// Hizmet Detayı
export type AppointmentServiceDto = {
  serviceId: string;
  serviceName: string;
  price: number;
}

// Ana Randevu DTO'su
export type AppointmentGetDto = {
  id: string;
  chairId?: string;
  chairName?: string;
  startTime: string; // "14:30:00"
  endTime: string;
  appointmentDate: string; // "2025-12-14"
  status: AppointmentStatus;
  createdAt: string;

  // YENİ: Hizmetler ve Fiyat
  services: AppointmentServiceDto[];
  totalPrice: number;
  pricingType: PricingType;
  pricingValue: number;
  appointmentRequester: AppointmentRequester

  // Store
  barberStoreId?: string;
  storeName?: string;
  storeImage?: string;
  isStoreFavorite: boolean;
  storeType: BarberType;
  myRatingForStore?: number;
  myCommentForStore?: string;
  storeAverageRating?: number; // Store'un ortalama rating'i

  // FreeBarber
  freeBarberId?: string;
  freeBarberName?: string;
  freeBarberImage?: string;
  isFreeBarberFavorite: boolean;
  myRatingForFreeBarber?: number;
  myCommentForFreeBarber?: string;
  freeBarberAverageRating?: number; // FreeBarber'ın ortalama rating'i

  // ManuelBarber
  manuelBarberId?: string;
  manuelBarberName?: string;
  manuelBarberImage?: string;
  myRatingForManuelBarber?: number;
  myCommentForManuelBarber?: string;
  manuelBarberAverageRating?: number; // ManuelBarber'ın ortalama rating'i

  // Customer
  customerUserId?: string;
  customerName?: string;
  customerImage?: string;
  isCustomerFavorite: boolean;
  myRatingForCustomer?: number;
  myCommentForCustomer?: string;
  customerAverageRating?: number; // Customer'ın ortalama rating'i
}

export type SlotDto = {
  slotId: string;
  start: string;
  end: string;
  isBooked: boolean;
  isPast: boolean;
};

export type ChairSlotDto = {
  chairId: string;
  chairName?: string;
  barberId?: string | null;
  barberName?: string | null;
  barberRating?: number | null;
  slots: SlotDto[];
};

