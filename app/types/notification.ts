/**
 * Notification-related types
 */

import { AppointmentStatus } from './appointment';

export enum NotificationType {
  AppointmentCreated = 0,
  AppointmentApproved = 1,
  AppointmentRejected = 2,
  AppointmentCancelled = 3,
  AppointmentCompleted = 4,
  AppointmentUnanswered = 5,
  AppointmentDecisionUpdated = 6,
}

export type NotificationDto = {
  id: string;
  type: NotificationType;
  appointmentId?: string | null;
  title: string;
  body?: string | null;
  payloadJson: string;
  createdAt: string;
  isRead: boolean;
};

export interface NotificationPayload {
  appointmentId: string;
  eventKey: string;
  recipientRole: string;
  date: string;
  startTime: string;
  endTime: string;
  actorUserId?: string;

  store?: {
    storeId: string;
    storeOwnerUserId: string; // camelCase - backend JSON serialization camelCase kullanıyor
    storeName: string;
    imageUrl?: string;
    type?: number; // BarberType: 0 = MaleHairdresser, 1 = FemaleHairdresser, 2 = BeautySalon
    pricingType?: number; // PricingType enum
    pricingValue?: number;
    rating?: number;
    isInFavorites?: boolean; // Bu dükkan favorilerde mi?
    addressDescription?: string; // Dükkan adres açıklaması
  };
  customer?: {
    userId: string;
    displayName?: string;
    avatarUrl?: string;
    roleHint: string;
    type?: number; // FreeBarber için BarberType
    rating?: number; // FreeBarber için rating
    isInFavorites?: boolean; // Bu müşteri favorilerde mi?
  };
  freeBarber?: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    roleHint: string;
    type?: number; // BarberType: 0 = MaleHairdresser, 1 = FemaleHairdresser, 2 = BeautySalon
    rating?: number;
    isInFavorites?: boolean; // Bu serbest berber favorilerde mi?
  };
  chair?: {
    chairId: string;
    chairName: string;
    manuelBarberId?: string;
    manuelBarberName?: string;
    manuelBarberImageUrl?: string;
    manuelBarberRating?: number;
  };
  status?: AppointmentStatus;
  storeDecision?: number;
  freeBarberDecision?: number;
  pendingExpiresAt?: string | null; // UTC formatında ISO string
  serviceOfferings?: Array<{
    id: string;
    serviceName: string;
    price: number;
  }>;

  // Favori durumu (recipient'a göre)
  isCustomerInFavorites?: boolean; // Store veya FreeBarber için müşteri favorilerinde mi?
  isFreeBarberInFavorites?: boolean; // Store için freeBarber favorilerinde mi?
  isStoreInFavorites?: boolean; // FreeBarber için store favorilerinde mi?
}

export type BadgeCount = {
  unreadNotifications: number;
  unreadMessages: number;
};

