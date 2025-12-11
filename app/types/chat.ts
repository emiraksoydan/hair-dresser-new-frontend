/**
 * Chat-related types
 */

import { AppointmentStatus } from './appointment';

export type ChatThreadListItemDto = {
  appointmentId: string;
  status: AppointmentStatus;
  title: string;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
};

export type ChatMessageItemDto = {
  messageId: string;
  senderUserId: string;
  text: string;
  createdAt: string;
};

export type ChatMessageDto = {
  appointmentId: string;
  messageId: string;
  senderUserId: string;
  text: string;
  createdAt: string;
};

