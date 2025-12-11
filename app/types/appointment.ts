/**
 * Appointment-related types
 */

import { ServiceOfferingGetDto } from './store';

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

export type AppointmentDto = {
  id: string;
  chairId?: string | null;
  startTime: string; // TimeSpan format
  endTime: string; // TimeSpan format
  appointmentDate: string; // DateOnly format
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  barberStoreUserId?: string | null;
  customerUserId?: string | null;
  freeBarberUserId?: string | null;
  manuelBarberId?: string | null;
  requestedBy: AppointmentRequester;
  storeDecision: DecisionStatus;
  freeBarberDecision: DecisionStatus;
  pendingExpiresAt?: string | null;
  cancelledByUserId?: string | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  // Related data
  store?: {
    id: string;
    storeName: string;
    addressDescription?: string;
    imageUrl?: string;
  };
  customer?: {
    userId: string;
    displayName?: string;
    avatarUrl?: string;
  };
  freeBarber?: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
  chair?: {
    chairId: string;
    chairName?: string;
    manuelBarberId?: string;
    manuelBarberName?: string;
  };
  serviceOfferings?: ServiceOfferingGetDto[];
};

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

