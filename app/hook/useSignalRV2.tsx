import "react-native-url-polyfill/auto";
import { useEffect, useRef, useCallback } from "react";
import * as SignalR from "@microsoft/signalr";
import { useAppDispatch, useAppSelector } from "../store/hook";
import { api } from "../store/api";
import { tokenStore } from "../lib/tokenStore";
import { getActiveThreadId } from "../lib/activeChatThread";
import {
  setConnected,
  setGlobalConnection,
  getGlobalConnection,
  getConnectionUserId,
} from "../store/signalrSlice";
import type {
  NotificationDto,
  ChatThreadListItemDto,
  ChatMessageDto,
  AppointmentGetDto,
} from "../types";
import { AppointmentStatus, AppointmentFilter } from "../types/appointment";
import { API_CONFIG } from "../constants/api";
import { useAuth } from "./useAuth";

const HUB_URL = API_CONFIG.SIGNALR_HUB_URL;

/**
 * useSignalRV2 - SignalR hook with backend-authoritative state updates
 */
export const useSignalRV2 = () => {
  const dispatch = useAppDispatch();
  const { token, userId } = useAuth();
  const isConnected = useAppSelector((state) => state.signalr.isConnected);

  const connectionRef = useRef<SignalR.HubConnection | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 10;
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRetryCountRef = useRef(0);
  const maxPollingRetries = 5; // Polling fallback'te max 5 kez dene, sonra dur
  const isTokenRefreshingRef = useRef(false); // Token refresh sırasında reconnect'i engelle

  // Keep userId in ref for event handlers
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;

  // Setup event handlers
  const setupEventHandlers = useCallback((conn: SignalR.HubConnection) => {
    conn.on("notification.received", (dto: NotificationDto) => {
      console.log("[SignalR] notification.received:", dto.id);
      dispatch(
        api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
          if (!draft) return;
          if (!draft.some((n) => n.id === dto.id)) {
            draft.unshift({ ...dto, _updatedAt: Date.now() });
          }
        }),
      );
    });

    conn.on("notification.updated", (dto: NotificationDto) => {
      console.log("[SignalR] notification.updated:", dto.id);
      const wasNewNotification = !dto.isRead;
      dispatch(
        api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
          if (!draft) return;
          const index = draft.findIndex((n) => n.id === dto.id);
          if (index >= 0) {
            draft[index] = { ...dto, _updatedAt: Date.now() };
          } else {
            // Yeni bildirim eklendi - badge count'u güncelle
            draft.unshift({ ...dto, _updatedAt: Date.now() });
            if (wasNewNotification) {
              // Badge count'u invalidate et (yeniden çekilsin)
              dispatch(api.util.invalidateTags([{ type: 'Notification' as const, id: 'LIST' }]));
            }
          }
        }),
      );
    });

    conn.on("chat.message", (dto: ChatMessageDto) => {
      const activeThreadId = getActiveThreadId();
      const isViewingThread = activeThreadId === dto.threadId;
      const isOwnMessage = dto.senderUserId === userIdRef.current;
      const isUnreadMessage = !isViewingThread && !isOwnMessage;

      console.log("[SignalR] chat.message:", dto.threadId, "isUnread:", isUnreadMessage);

      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          const thread = draft.find((t) => t.threadId === dto.threadId);
          if (thread) {
            thread.lastMessagePreview = dto.text.length > 60 ? dto.text.substring(0, 60) : dto.text;
            thread.lastMessageAt = dto.createdAt;
            // NOT: Thread'un unreadCount'unu optimistic update yapmıyoruz
            // Backend'den chat.threadUpdated event'i ile authoritative unreadCount gelecek
            // Bu sayede çakışma (race condition) sorunu önlenir
            // Eğer chat.threadUpdated event'i gecikirse, kullanıcı kısa bir süre yanlış count görebilir
            // ama bu, çift artırma veya yanlış count gösterme sorunundan daha iyidir
          }
        }),
      );

      // NOT: Ana mesaj ikonundaki badge count'u optimistic update yapmıyoruz
      // Backend'den badge.updated event'i ile authoritative count gelecek
      // Bu sayede çift artırma (double increment) sorunu önlenir

      if (dto.appointmentId) {
        dispatch(
          api.util.updateQueryData("getChatMessages", { appointmentId: dto.appointmentId }, (draft) => {
            if (!draft) return;
            if (!draft.find((m) => m.messageId === dto.messageId)) {
              draft.push({ messageId: dto.messageId, senderUserId: dto.senderUserId, text: dto.text, createdAt: dto.createdAt });
              draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }
          }),
        );
      }

      dispatch(
        api.util.updateQueryData("getChatMessagesByThread", { threadId: dto.threadId }, (draft) => {
          if (!draft) return;
          if (!draft.find((m) => m.messageId === dto.messageId)) {
            draft.push({ messageId: dto.messageId, senderUserId: dto.senderUserId, text: dto.text, createdAt: dto.createdAt });
            draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          }
        }),
      );
    });

    conn.on("chat.threadCreated", (dto: ChatThreadListItemDto) => {
      console.log("[SignalR] chat.threadCreated:", dto.threadId);
      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          if (!draft.find((t) => t.threadId === dto.threadId)) {
            draft.unshift(dto);
          }
        }),
      );
    });

    conn.on("chat.threadUpdated", (dto: ChatThreadListItemDto) => {
      console.log("[SignalR] chat.threadUpdated:", dto.threadId);
      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          const index = draft.findIndex((t) => t.threadId === dto.threadId);
          const shouldBeVisible = dto.isFavoriteThread || dto.status === AppointmentStatus.Pending || dto.status === AppointmentStatus.Approved;

          if (shouldBeVisible) {
            if (index >= 0) draft[index] = dto;
            else draft.unshift(dto);
          } else if (index >= 0) {
            draft.splice(index, 1);
          }
        }),
      );
    });

    conn.on("chat.threadRemoved", (threadId: string | null | undefined) => {
      if (!threadId) return;
      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          const index = draft.findIndex((t) => t.threadId === threadId);
          if (index >= 0) draft.splice(index, 1);
        }),
      );
    });

    conn.on("chat.typing", () => {});

    conn.on("appointment.updated", (appointment: AppointmentGetDto) => {
      console.log("[SignalR] appointment.updated:", appointment.id, "status:", appointment.status);

      const filters = [AppointmentFilter.Active, AppointmentFilter.Completed, AppointmentFilter.Cancelled];

      filters.forEach((filter) => {
        dispatch(
          api.util.updateQueryData("getAllAppointmentByFilter", filter, (draft) => {
            if (!draft) return;
            const existingIndex = draft.findIndex((a) => a.id === appointment.id);
            const shouldBeInThisFilter =
              (filter === AppointmentFilter.Active && (appointment.status === AppointmentStatus.Approved || appointment.status === AppointmentStatus.Pending)) ||
              (filter === AppointmentFilter.Completed && appointment.status === AppointmentStatus.Completed) ||
              (filter === AppointmentFilter.Cancelled && (appointment.status === AppointmentStatus.Cancelled || appointment.status === AppointmentStatus.Rejected || appointment.status === AppointmentStatus.Unanswered));

            if (existingIndex >= 0) {
              if (shouldBeInThisFilter) {
                draft[existingIndex] = { ...appointment, _updatedAt: Date.now() };
              } else {
                draft.splice(existingIndex, 1);
              }
            } else if (shouldBeInThisFilter) {
              draft.push({ ...appointment, _updatedAt: Date.now() });
            }
          }),
        );
      });

      // Randevu durumu değiştiğinde ilgili notification'ları da güncelle
      // Özellikle Unanswered durumuna geçtiğinde notification payload'ını güncelle
      if (appointment.status === AppointmentStatus.Unanswered) {
        dispatch(
          api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
            if (!draft) return;
            draft.forEach((notification) => {
              if (notification.appointmentId === appointment.id) {
                // Payload'ı güncelle - status'u Unanswered olarak ayarla
                try {
                  if (notification.payloadJson && notification.payloadJson.trim() !== "" && notification.payloadJson !== "{}") {
                    const payload = JSON.parse(notification.payloadJson);
                    payload.status = AppointmentStatus.Unanswered;
                    notification.payloadJson = JSON.stringify(payload);
                    notification._updatedAt = Date.now();
                  }
                } catch {
                  // Payload parse edilemezse sessizce devam et
                }
              }
            });
          }),
        );
      }

      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          const threadIndex = draft.findIndex((t) => t.appointmentId === appointment.id);
          const shouldBeVisible = appointment.status === AppointmentStatus.Pending || appointment.status === AppointmentStatus.Approved;

          if (threadIndex >= 0) {
            if (shouldBeVisible) draft[threadIndex].status = appointment.status;
            else draft.splice(threadIndex, 1);
          }
        }),
      );

      if (appointment.barberStoreId && appointment.appointmentDate) {
        dispatch(api.util.invalidateTags([
          { type: "Appointment", id: `availability-${appointment.barberStoreId}-${appointment.appointmentDate}` },
          { type: "Appointment", id: "availability" },
        ]));
      }
    });

    conn.on("badge.updated", (counts?: { notificationUnreadCount?: number; chatUnreadCount?: number; threadUnreadCounts?: Record<string, number> }) => {
      console.log("[SignalR] badge.updated:", counts);
      if (counts && (counts.notificationUnreadCount !== undefined || counts.chatUnreadCount !== undefined || counts.threadUnreadCounts !== undefined)) {
        dispatch(
          api.util.updateQueryData("getBadgeCounts", undefined, (draft) => {
            if (!draft?.data) return;
            if (counts.notificationUnreadCount !== undefined) draft.data.notificationUnreadCount = counts.notificationUnreadCount;
            if (counts.chatUnreadCount !== undefined) draft.data.chatUnreadCount = counts.chatUnreadCount;
            if (counts.threadUnreadCounts !== undefined) {
              // Thread unread counts'u merge et (yeni değerlerle güncelle)
              draft.data.threadUnreadCounts = {
                ...draft.data.threadUnreadCounts,
                ...counts.threadUnreadCounts,
              };
            }
          }),
        );
      } else {
        dispatch(api.util.invalidateTags([{ type: "Notification", id: "LIST" }, { type: "Chat", id: "LIST" }]));
      }
    });

    conn.on("image.updated", () => {
      dispatch(api.util.invalidateTags(["UserProfile", "Chat", "Notification", { type: "StoreForUsers", id: "LIST" }, { type: "FreeBarberForUsers", id: "LIST" }, "MineStores", "MineFreeBarberPanel"]));
    });

    conn.on("group.joined", (data: { userId?: string; success: boolean; error?: string }) => {
      if (data.success) console.log("[SignalR] Successfully joined group for user:", data.userId);
      else console.log("[SignalR] Failed to join group:", data.error);
    });
  }, [dispatch]);

  // Create connection
  const createConnection = useCallback(async (currentUserId: string) => {
    if (isConnectingRef.current) {
      console.log("[SignalR] Already connecting, skipping...");
      return;
    }

    const currentToken = tokenStore.access;
    if (!currentToken) {
      console.log("[SignalR] No token available");
      return;
    }

    isConnectingRef.current = true;
    console.log("[SignalR] Creating connection for user:", currentUserId);

    try {
      const connection = new SignalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          transport: SignalR.HttpTransportType.WebSockets,
          skipNegotiation: true,
          accessTokenFactory: () => tokenStore.access || "",
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(SignalR.LogLevel.None)
        .build();

      setupEventHandlers(connection);

      connection.onclose(() => {
        console.log("[SignalR] Connection closed");
        dispatch(setConnected({ connected: false }));
        // Bağlantı koparsa badge count'u invalidate et (yeniden çekilsin)
        dispatch(api.util.invalidateTags([{ type: "Notification", id: "LIST" }, { type: "Chat", id: "LIST" }]));
        if (userIdRef.current === currentUserId && tokenStore.access) {
          attemptReconnect(currentUserId);
        }
      });

      connection.onreconnecting(() => {
        console.log("[SignalR] Reconnecting...");
        dispatch(setConnected({ connected: false }));
        // Reconnecting sırasında invalidate etme - performans için
        // Sadece reconnected veya close durumlarında invalidate et
      });

      connection.onreconnected(async () => {
        reconnectAttemptsRef.current = 0;
        pollingRetryCountRef.current = 0; // Reconnect başarılı - polling counter'ı sıfırla

        // Polling interval'ı temizle
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          console.log("[SignalR] Polling stopped after reconnect");
        }

        dispatch(setConnected({ connected: true, userId: currentUserId }));
        console.log("[SignalR] Reconnected - rejoining group...");
        try {
          await connection.invoke("JoinUserGroup");
          console.log("[SignalR] JoinUserGroup after reconnect successful");
        } catch (e) {
          console.log("[SignalR] JoinUserGroup after reconnect failed:", e);
        }
        dispatch(api.util.invalidateTags([{ type: "Notification", id: "LIST" }, { type: "Chat", id: "LIST" }]));
      });

      await connection.start();

      connectionRef.current = connection;
      setGlobalConnection(connection, currentUserId);
      reconnectAttemptsRef.current = 0;
      pollingRetryCountRef.current = 0; // Bağlantı başarılı - polling retry count'u sıfırla

      // Polling interval'ı temizle (artık gerek yok)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log("[SignalR] Polling stopped - connection successful");
      }

      dispatch(setConnected({ connected: true, userId: currentUserId }));

      console.log("[SignalR] Connected successfully for user:", currentUserId);

      // Join group
      try {
        await connection.invoke("JoinUserGroup");
        console.log("[SignalR] JoinUserGroup successful");
      } catch (e) {
        console.log("[SignalR] JoinUserGroup failed:", e);
      }

      // Invalidate tags to refetch notifications and badge counts
      // This ensures that notifications received while app was closed are loaded
      // Note: invalidateTags will refetch all active (subscribed) queries with matching tags
      // getBadgeCounts is always mounted in BaseTabLayout, so it will be refetched
      // getAllNotifications will be refetched when NotificationsSheet is opened
      dispatch(api.util.invalidateTags([{ type: "Notification", id: "LIST" }, { type: "Chat", id: "LIST" }]));

    } catch (e) {
      console.log("[SignalR] Connection failed:", e);
      dispatch(setConnected({ connected: false }));
      attemptReconnect(currentUserId);
    } finally {
      isConnectingRef.current = false;
    }
  }, [dispatch, setupEventHandlers]);

  // Reconnection logic
  const attemptReconnect = useCallback((expectedUserId: string) => {
    // Token refresh sırasında reconnect yapma
    if (isTokenRefreshingRef.current) {
      console.log("[SignalR] Token refresh in progress, delaying reconnect...");
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect(expectedUserId);
      }, 2000);
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log("[SignalR] Max reconnect attempts reached - starting polling fallback");

      // Mevcut polling interval'ı temizle
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Max polling retry'a ulaştıysa sadece polling yap, reconnect deneme
      if (pollingRetryCountRef.current >= maxPollingRetries) {
        console.log("[SignalR] Max polling retries reached, only polling for data");
        pollingIntervalRef.current = setInterval(() => {
          if (userIdRef.current === expectedUserId && tokenStore.access) {
            console.log("[SignalR] Polling only mode - invalidating badge count");
            dispatch(api.util.invalidateTags([{ type: "Notification", id: "LIST" }, { type: "Chat", id: "LIST" }]));
          } else {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }, 120000); // 2 dakikada bir (daha az agresif)
        return;
      }

      // Polling fallback modunda: her 60 saniyede bir kez reconnect dene
      pollingRetryCountRef.current++;
      console.log("[SignalR] Polling retry attempt", pollingRetryCountRef.current, "of", maxPollingRetries);

      pollingIntervalRef.current = setInterval(() => {
        if (userIdRef.current === expectedUserId && tokenStore.access) {
          console.log("[SignalR] Polling fallback - invalidating badge count");
          dispatch(api.util.invalidateTags([{ type: "Notification", id: "LIST" }, { type: "Chat", id: "LIST" }]));
        } else {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }, 60000);

      // 30 saniye sonra bir kez reconnect dene (polling interval'dan bağımsız)
      reconnectTimeoutRef.current = setTimeout(async () => {
        if (userIdRef.current === expectedUserId && tokenStore.access && !isTokenRefreshingRef.current) {
          console.log("[SignalR] Attempting reconnect from polling fallback...");
          reconnectAttemptsRef.current = 0;
          await createConnection(expectedUserId);
        }
      }, 30000);

      return;
    }

    if (userIdRef.current !== expectedUserId) {
      console.log("[SignalR] User changed, skipping reconnect");
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);

    console.log("[SignalR] Reconnecting in", delay, "ms (attempt", reconnectAttemptsRef.current, ")");

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (!tokenStore.access || userIdRef.current !== expectedUserId) {
        reconnectAttemptsRef.current = 0;
        return;
      }
      // Token refresh kontrolü
      if (isTokenRefreshingRef.current) {
        console.log("[SignalR] Token still refreshing, retrying later...");
        attemptReconnect(expectedUserId);
        return;
      }
      await createConnection(expectedUserId);
    }, delay);
  }, [createConnection, dispatch]);

  // Stop connection
  const stopConnection = useCallback(async () => {
    console.log("[SignalR] Stopping connection...");

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    isConnectingRef.current = false;

    const conn = connectionRef.current;
    if (conn) {
      try {
        conn.off("notification.received");
        conn.off("notification.updated");
        conn.off("chat.message");
        conn.off("chat.threadCreated");
        conn.off("chat.threadUpdated");
        conn.off("chat.threadRemoved");
        conn.off("chat.typing");
        conn.off("appointment.updated");
        conn.off("badge.updated");
        conn.off("image.updated");
        conn.off("group.joined");
        await conn.stop();
      } catch (e) {
        console.log("[SignalR] Error stopping connection:", e);
      }
    }

    connectionRef.current = null;
    setGlobalConnection(null);
    reconnectAttemptsRef.current = 0;
    pollingRetryCountRef.current = 0; // Reset polling retry count
    dispatch(setConnected({ connected: false }));

    console.log("[SignalR] Connection stopped");
  }, [dispatch]);

  // Token refresh durumunu dinle
  useEffect(() => {
    const unsubscribe = tokenStore.onRefreshStateChange((refreshing) => {
      isTokenRefreshingRef.current = refreshing;
      console.log("[SignalR] Token refresh state changed:", refreshing);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // No token or userId - stop connection
    if (!token || !userId) {
      console.log("[SignalR] No token/userId - stopping connection");
      stopConnection();
      return;
    }

    const globalConn = getGlobalConnection();
    const connectedUserId = getConnectionUserId();

    console.log("[SignalR] useEffect - userId:", userId, "globalConn:", !!globalConn, "connectedUserId:", connectedUserId);

    // Different user - stop old connection and create new
    if (globalConn && connectedUserId && connectedUserId !== userId) {
      console.log("[SignalR] Different user, recreating connection...");
      const targetUserId = userId; // Capture current userId
      (async () => {
        await stopConnection();
        // Double check user hasn't changed during stop
        if (userIdRef.current === targetUserId && tokenStore.access) {
          await createConnection(targetUserId);
        }
      })();
      return;
    }

    // Same user with valid connection
    if (globalConn && connectedUserId === userId) {
      connectionRef.current = globalConn;
      if (globalConn.state === SignalR.HubConnectionState.Connected) {
        console.log("[SignalR] Already connected for user:", userId);
        dispatch(setConnected({ connected: true, userId }));
        return;
      } else if (globalConn.state === SignalR.HubConnectionState.Disconnected) {
        console.log("[SignalR] Connection disconnected, recreating...");
        stopConnection().then(() => createConnection(userId));
        return;
      }
      // Connecting or Reconnecting - wait
      return;
    }

    // No connection - create new
    if (!isConnectingRef.current) {
      console.log("[SignalR] No connection, creating new one for user:", userId);
      createConnection(userId);
    }

  }, [token, userId, dispatch, createConnection, stopConnection]);

  return { isConnected, connectionRef };
};
