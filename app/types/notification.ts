/**
 * Notification-related types
 */

import { AppointmentStatus } from './appointment';

export enum NotificationType {
  AppointmentCreated = 1,
  AppointmentApproved = 2,
  AppointmentRejected = 3,
  AppointmentCancelled = 4,
  AppointmentCompleted = 5,
  AppointmentUnanswered = 6,
  AppointmentDecisionUpdated = 7,
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
    StoreOwnerUserId: string;
    storeName: string;
    imageUrl?: string;
  };
  customer?: {
    userId: string;
    displayName?: string;
    avatarUrl?: string;
    roleHint: string;
  };
  freeBarber?: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    roleHint: string;
  };
  chair?: {
    chairId: string;
    chairName: string;
    manuelBarberId?: string;
    manuelBarberName?: string;
  };
  status?: AppointmentStatus;
  storeDecision?: number;
  freeBarberDecision?: number;
}

export type BadgeCount = {
  unreadNotifications: number;
  unreadMessages: number;
};

