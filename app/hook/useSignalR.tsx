import "react-native-url-polyfill/auto";
import { useEffect, useRef, useState } from "react";
import * as SignalR from "@microsoft/signalr";
import { useDispatch } from "react-redux";
import { api } from "../store/api";
import { tokenStore } from "../lib/tokenStore";
import type { AppDispatch } from "../store/redux-store";
import type { BadgeCount, NotificationDto, ChatThreadListItemDto, ChatMessageDto, ChatMessageItemDto, AppointmentGetDto } from "../types";
import { AppointmentStatus, AppointmentFilter } from "../types/appointment";
import { NotificationType } from "../types";
import { API_CONFIG } from "../constants/api";
import { useAuth } from "./useAuth";

const HUB_URL = API_CONFIG.SIGNALR_HUB_URL;

export const useSignalR = () => {
    const dispatch = useDispatch<AppDispatch>();
    const connectionRef = useRef<SignalR.HubConnection | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 10;
    const { token } = useAuth();
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        let stopped = false;
        let previousToken: string | null = null;

        const start = async () => {
            const currentToken = tokenStore.access;

            // Token değiştiyse (refresh edildiyse) mevcut bağlantıyı kapat ve yeniden başlat
            if (previousToken && previousToken !== currentToken && connectionRef.current) {
                try {
                    await connectionRef.current.stop();
                    connectionRef.current = null;
                    setIsConnected(false);
                } catch (e) {
                    // Hata durumunda sessizce devam et
                }
            }

            previousToken = currentToken;

            if (!currentToken) {
                // Token yoksa mevcut bağlantıyı kapat
                if (connectionRef.current) {
                    try {
                        await connectionRef.current.stop();
                        connectionRef.current = null;
                    } catch (e) {
                        // Hata durumunda sessizce devam et
                    }
                }
                setIsConnected(false);
                // Token yoksa badge count'u invalidate et (login olmamış kullanıcı için)
                dispatch(api.util.invalidateTags(['Badge']));
                return;
            }

            // Zaten bağlıysa ve token aynıysa yeniden bağlanma
            if (connectionRef.current && connectionRef.current.state === SignalR.HubConnectionState.Connected) {
                return;
            }

            const connection = new SignalR.HubConnectionBuilder()
                .withUrl(HUB_URL, {
                    transport: SignalR.HttpTransportType.WebSockets,
                    skipNegotiation: true,
                    accessTokenFactory: async () => {
                        // Her istekte güncel token'ı al - token refresh edilmiş olabilir
                        const token = tokenStore.access;
                        if (!token) {
                            throw new Error('No access token available');
                        }
                        return token;
                    },
                })
                .withAutomaticReconnect([0, 2000, 10000, 30000])
                .configureLogging(SignalR.LogLevel.None) // Production'da log yok
                .build();

            // Event handler'ları ekleme fonksiyonu (yeniden bağlanma için kullanılacak)
            const setupEventHandlers = (conn: SignalR.HubConnection) => {
                conn.on("badge.updated", (data: any) => {
                    // Backend'den gelen data büyük harfle (UnreadNotifications, UnreadMessages) veya küçük harfle (unreadNotifications, unreadMessages) olabilir
                    // Her iki durumu da destekle
                    const unreadNotifications = data?.unreadNotifications ?? data?.UnreadNotifications ?? 0;
                    const unreadMessages = data?.unreadMessages ?? data?.UnreadMessages ?? 0;

                    // Sadece updateQueryData yap, invalidateTags gereksiz (zaten güncelleniyor)
                    dispatch(
                        api.util.updateQueryData("getBadgeCounts", undefined, (draft) => {
                            if (!draft) {
                                return { unreadNotifications, unreadMessages };
                            }
                            draft.unreadMessages = unreadMessages;
                            draft.unreadNotifications = unreadNotifications;
                        })
                    );
                });

                conn.on("notification.received", (dto: NotificationDto) => {
                    let addedUnread = 0;
                    let removedUnread = 0;
                    // Notification'ı listeye ekle veya güncelle
                    dispatch(
                        api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
                            if (!draft) {
                                if (!dto.isRead) {
                                    addedUnread = 1;
                                }
                                return;
                            }

                            // Duplicate kontrolü: Aynı appointmentId ve type'a sahip notification var mı?
                            // ÖNEMLİ: AppointmentUnanswered durumunda eski AppointmentCreated notification'ı kaldırmalıyız
                            // Çünkü background service type'ı AppointmentUnanswered'e çeviriyor
                            if (dto.appointmentId && dto.type) {
                                // Eğer yeni notification AppointmentUnanswered ise, eski AppointmentCreated notification'ları kaldır
                                if (dto.type === NotificationType.AppointmentUnanswered) {
                                    const oldCreatedIndexes: number[] = [];
                                    draft.forEach((n, idx) => {
                                        if (n.appointmentId === dto.appointmentId &&
                                            n.type === NotificationType.AppointmentCreated &&
                                            n.id !== dto.id) {
                                            oldCreatedIndexes.push(idx);
                                        }
                                    });
                                    // Tersten kaldır (indeksler bozulmasın diye)
                                    oldCreatedIndexes.reverse().forEach(idx => {
                                        if (!draft[idx].isRead) {
                                            removedUnread++;
                                        }
                                        draft.splice(idx, 1);
                                    });
                                }

                                // Aynı appointmentId ve type'a sahip notification var mı? (genel duplicate kontrolü)
                                const duplicateIndex = draft.findIndex(n =>
                                    n.appointmentId === dto.appointmentId &&
                                    n.type === dto.type &&
                                    n.id !== dto.id
                                );
                                if (duplicateIndex >= 0) {
                                    // Eski duplicate notification'ı kaldır
                                    if (!draft[duplicateIndex].isRead) {
                                        removedUnread++;
                                    }
                                    draft.splice(duplicateIndex, 1);
                                }
                            }

                            // Eğer aynı notification zaten varsa güncelle
                            const existingIndex = draft.findIndex(n => n.id === dto.id);
                            const wasRead = existingIndex >= 0 ? draft[existingIndex].isRead : null;
                            if (existingIndex < 0 && !dto.isRead) {
                                addedUnread = 1;
                            } else if (existingIndex >= 0 && wasRead && !dto.isRead) {
                                addedUnread = 1;
                            }
                            if (existingIndex >= 0) {
                                // Mevcut notification'ı tamamen güncelle (payload dahil)
                                draft[existingIndex] = { ...dto };
                            } else {
                                // Yeni notification'ı başa ekle
                                draft.unshift(dto);
                            }

                            // Appointment-related notification'lar için: Aynı appointmentId'ye sahip 
                            // diğer notification'ların payload'larını da güncelle (status değişikliği için)
                            if (dto.appointmentId && dto.payloadJson && dto.payloadJson.trim() !== '' && dto.payloadJson !== '{}') {
                                try {
                                    const newPayload = JSON.parse(dto.payloadJson);
                                    if (newPayload && typeof newPayload === 'object') {
                                        const newStatus = newPayload?.status;
                            const newStoreDecision = newPayload?.storeDecision;
                            const newFreeBarberDecision = newPayload?.freeBarberDecision;
                            const newCustomerDecision = newPayload?.customerDecision;

                            // Aynı appointmentId'ye sahip tüm notification'ları bul ve güncelle
                            // Sadece AppointmentCreated notification'larını güncelle (diğerleri sabit kalmalı)
                            draft.forEach((notification) => {
                                if (notification.type !== NotificationType.AppointmentCreated) return;
                                if (notification.appointmentId === dto.appointmentId && notification.id !== dto.id) {
                                    try {
                                        if (notification.payloadJson && notification.payloadJson.trim() !== '' && notification.payloadJson !== '{}') {
                                            const currentPayload = JSON.parse(notification.payloadJson);
                                            if (currentPayload && typeof currentPayload === 'object') {
                                                // Status ve decision bilgilerini güncelle
                                                if (newStatus !== undefined) {
                                                    currentPayload.status = newStatus;
                                                }
                                                if (newStoreDecision !== undefined) {
                                                    currentPayload.storeDecision = newStoreDecision;
                                                }
                                                if (newFreeBarberDecision !== undefined) {
                                                    currentPayload.freeBarberDecision = newFreeBarberDecision;
                                                }
                                                if (newCustomerDecision !== undefined) {
                                                    currentPayload.customerDecision = newCustomerDecision;
                                                }
                                                notification.payloadJson = JSON.stringify(currentPayload);
                                            }
                                        }
                                    } catch {
                                        // Payload parse edilemezse atla
                                    }
                                }
                            });
                                    }
                                } catch {
                                    // Yeni payload parse edilemezse atla
                                }
                            }
                        })
                    );


                    const unreadDelta = addedUnread - removedUnread;
                    if (unreadDelta !== 0) {
                        dispatch(
                            api.util.updateQueryData("getBadgeCounts", undefined, (draft) => {
                                if (!draft) {
                                    if (unreadDelta > 0) {
                                        return { unreadNotifications: unreadDelta, unreadMessages: 0 };
                                    }
                                    return;
                                }
                                const nextUnread = Math.max(0, (draft.unreadNotifications ?? 0) + unreadDelta);
                                draft.unreadNotifications = nextUnread;
                            })
                        );
                    }

                    // Appointment status değiştiğinde slot availability'yi güncelle
                    if (dto.appointmentId && dto.payloadJson && dto.payloadJson.trim() !== '' && dto.payloadJson !== '{}') {
                        try {
                            const payload = JSON.parse(dto.payloadJson);
                            if (payload && typeof payload === 'object') {
                                const status = payload?.status;
                                // Status değişikliği varsa (Pending, Approved, Rejected, Cancelled, Completed)
                                // ve storeId varsa availability'yi invalidate et
                                if (status !== undefined && payload?.store?.storeId) {
                                    const storeId = payload.store.storeId;
                                    const date = payload.date;
                                    if (storeId && date) {
                                        dispatch(api.util.invalidateTags([
                                            { type: 'Appointment', id: `availability-${storeId}-${date}` },
                                            { type: 'Appointment', id: 'availability' },
                                        ]));
                                    }
                                }
                            }
                        } catch {
                            // Payload parse edilemezse atla
                        }
                    }

                    // badge.updated event'i gelirse ek olarak senkronize olur
                });

                conn.on("chat.message", (dto: ChatMessageDto) => {
                    // Thread listesindeki lastMessagePreview'ı güncelle (ThreadId ile)
                    dispatch(
                        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
                            if (!draft) return;
                            const thread = draft.find(t => t.threadId === dto.threadId);
                            if (thread) {
                                thread.lastMessagePreview = dto.text.length > 60 ? dto.text.substring(0, 60) : dto.text;
                                thread.lastMessageAt = dto.createdAt;
                                // Sender dışındaki kullanıcılar için unread count artacak (backend'de yapılıyor)
                            }
                        })
                    );

                    // Mesaj listesini güncelle (eğer o appointment'ın mesajları açıksa)
                    // AppointmentId null olabilir (favori thread'lerde)
                    if (dto.appointmentId) {
                        dispatch(
                            api.util.updateQueryData("getChatMessages", { appointmentId: dto.appointmentId }, (draft) => {
                                if (!draft) return;
                                // Eğer aynı mesaj yoksa ekle
                                const existingMessage = draft.find(m => m.messageId === dto.messageId);
                                if (!existingMessage) {
                                    const newMessage: ChatMessageItemDto = {
                                        messageId: dto.messageId,
                                        senderUserId: dto.senderUserId,
                                        text: dto.text,
                                        createdAt: dto.createdAt,
                                    };
                                    draft.push(newMessage);
                                    // Tarihe göre sırala (en eski en başta)
                                    draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                }
                            })
                        );
                    }

                    // ThreadId ile mesajları da güncelle (favori thread'ler için)
                    dispatch(
                        api.util.updateQueryData("getChatMessagesByThread", { threadId: dto.threadId }, (draft) => {
                            if (!draft) return;
                            const existingMessage = draft.find(m => m.messageId === dto.messageId);
                            if (!existingMessage) {
                                const newMessage: ChatMessageItemDto = {
                                    messageId: dto.messageId,
                                    senderUserId: dto.senderUserId,
                                    text: dto.text,
                                    createdAt: dto.createdAt,
                                };
                                draft.push(newMessage);
                                // Tarihe göre sırala (en eski en başta)
                                draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                            }
                        })
                    );

                    // Badge count backend'den badge.updated event'i ile gelecek, burada sadece invalidate et
                    dispatch(api.util.invalidateTags(["Badge"]));
                });

                conn.on("chat.threadCreated", (dto: ChatThreadListItemDto) => {
                    // Yeni chat thread oluşturulduğunda listeyi güncelle
                    dispatch(
                        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
                            if (!draft) return;

                            // Favori thread kontrolü: Backend'den gelen thread zaten filtrelenmiş durumda
                            // (en az bir aktif favori varsa görünür)
                            if (dto.isFavoriteThread) {
                                // Favori thread: Backend'den gelen thread görünür demektir (aktif favori var)
                                const existingIndex = draft.findIndex(t => t.threadId === dto.threadId);
                                if (existingIndex >= 0) {
                                    // Mevcut thread'i güncelle
                                    draft[existingIndex] = dto;
                                } else {
                                    // Yeni thread'i başa ekle
                                    draft.unshift(dto);
                                }
                            } else {
                                // Randevu thread'i: Sadece Pending veya Approved durumunda görünür olmalı
                                if (dto.status !== undefined &&
                                    (dto.status === AppointmentStatus.Pending || dto.status === AppointmentStatus.Approved)) {
                                    const existingIndex = draft.findIndex(t => t.threadId === dto.threadId);
                                    if (existingIndex >= 0) {
                                        // Mevcut thread'i güncelle
                                        draft[existingIndex] = dto;
                                    } else {
                                        // Yeni thread'i başa ekle
                                        draft.unshift(dto);
                                    }
                                }
                                // Status Pending/Approved değilse thread'i ekleme (görünür olmamalı)
                            }
                        })
                    );
                    dispatch(api.util.invalidateTags(["Badge"]));
                });

                conn.on("chat.threadUpdated", (dto: ChatThreadListItemDto) => {
                    // Thread güncellendiğinde (randevu durumu değiştiğinde veya favori durumu değiştiğinde) listeyi güncelle
                    dispatch(
                        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
                            if (!draft) return;
                            const existingIndex = draft.findIndex(t => t.threadId === dto.threadId);

                            if (dto.isFavoriteThread) {
                                // Favori thread: Backend'den gelen thread görünür demektir (en az bir aktif favori var)
                                if (existingIndex >= 0) {
                                    // Mevcut thread'i güncelle
                                    draft[existingIndex] = dto;
                                } else {
                                    // Yeni thread'i başa ekle
                                    draft.unshift(dto);
                                }
                            } else {
                                // Randevu thread'i: Sadece Pending/Approved durumunda görünür olmalı
                                if (dto.status !== undefined &&
                                    (dto.status === AppointmentStatus.Pending || dto.status === AppointmentStatus.Approved)) {
                                    // Status Pending/Approved - thread görünür olmalı
                                    if (existingIndex >= 0) {
                                        // Mevcut thread'i güncelle
                                        draft[existingIndex] = dto;
                                    } else {
                                        // Yeni thread'i başa ekle
                                        draft.unshift(dto);
                                    }
                                } else {
                                    // Status artık Pending/Approved değil - thread'i kaldır (görünür olmamalı)
                                    if (existingIndex >= 0) {
                                        draft.splice(existingIndex, 1);
                                    }
                                }
                            }
                        })
                    );
                    dispatch(api.util.invalidateTags(["Badge"]));
                });

                conn.on("chat.threadRemoved", (threadId: string | null | undefined) => {
                    // Thread kaldırıldığında (randevu iptal/tamamlandığında veya favori pasif olduğunda) listeyi güncelle
                    // ÖNEMLİ: Backend'den gelen threadRemoved event'i her iki tarafa da gönderilmeli
                    // (favori thread'ler için: aktif favori kalmadığında thread kaldırılmalı)
                    if (!threadId) return;
                    dispatch(
                        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
                            if (!draft) return;
                            const existingIndex = draft.findIndex(t => t.threadId === threadId);
                            if (existingIndex >= 0) {
                                // Thread'i kaldır (favori pasif oldu veya randevu sonlandı)
                                draft.splice(existingIndex, 1);
                            }
                        })
                    );
                });

                // Typing indicator event handler
                // Bu event ChatDetailScreen component'inde handle edilecek (callback prop ile)
                conn.on("chat.typing", (data: { threadId: string; typingUserId: string; typingUserName: string; isTyping: boolean }) => {
                    // Typing indicator'ü handle etmek için bir callback mekanizması gerekebilir
                    // Şimdilik sadece event'i dinliyoruz, ChatDetailScreen'de typing state'i yönetilecek
                });

                    // Appointment updated event handler
                // Randevu durumu değiştiğinde (onay/red/tamamlandı/iptal) appointment listesini güncelle
                conn.on("appointment.updated", (appointment: AppointmentGetDto) => {
                    // Tüm filter'lardaki appointment listelerini kontrol et ve güncelle
                    const filters = [AppointmentFilter.Active, AppointmentFilter.Completed, AppointmentFilter.Cancelled];

                    filters.forEach((filter) => {
                        dispatch(
                            api.util.updateQueryData("getAllAppointmentByFilter", filter, (draft) => {
                                if (!draft || !Array.isArray(draft)) return;

                                const existingIndex = draft.findIndex(a => a.id === appointment.id);

                                // Status'e göre hangi filter'da olması gerektiğini kontrol et
                                // Active tab'ında sadece Approved randevular görünür (Pending'ler gözükmeyecek)
                                const shouldBeInThisFilter =
                                    (filter === AppointmentFilter.Active && appointment.status === AppointmentStatus.Approved) ||
                                    (filter === AppointmentFilter.Completed && appointment.status === AppointmentStatus.Completed) ||
                                    (filter === AppointmentFilter.Cancelled && (appointment.status === AppointmentStatus.Cancelled || appointment.status === AppointmentStatus.Rejected || appointment.status === AppointmentStatus.Unanswered));

                                if (existingIndex >= 0) {
                                    if (shouldBeInThisFilter) {
                                        // Mevcut appointment'ı güncelle (customerDecision dahil tüm alanları)
                                        draft[existingIndex] = { ...appointment };
                                        // Tarihe göre yeniden sırala
                                        draft.sort((a, b) => {
                                            try {
                                                const dateA = new Date(a.appointmentDate + 'T' + a.startTime).getTime();
                                                const dateB = new Date(b.appointmentDate + 'T' + b.startTime).getTime();
                                                return dateA - dateB;
                                            } catch {
                                                return 0;
                                            }
                                        });
                                    } else {
                                        // Appointment artık bu filter'da olmamalı - kaldır
                                        draft.splice(existingIndex, 1);
                                    }
                                } else if (shouldBeInThisFilter) {
                                    // Yeni appointment'ı ekle (tarihe göre sıralı)
                                    draft.push(appointment);
                                    draft.sort((a, b) => {
                                        try {
                                            const dateA = new Date(a.appointmentDate + 'T' + a.startTime).getTime();
                                            const dateB = new Date(b.appointmentDate + 'T' + b.startTime).getTime();
                                            return dateA - dateB;
                                        } catch {
                                            return 0;
                                        }
                                    });
                                }
                            })
                        );
                    });

                    // Ayrıca invalidate et (güvenlik için - eğer updateQueryData başarısız olursa)
                    dispatch(api.util.invalidateTags([
                        { type: 'Appointment', id: appointment.id },
                        { type: 'Appointment', id: 'LIST' }
                    ]));

                    // ÖNEMLİ: Randevu durumu değiştiğinde thread listesini de güncelle
                    // Thread görünürlüğü randevu durumuna bağlı (Pending/Approved = görünür, diğerleri = görünmez)
                    // Backend'den chat.threadUpdated event'i de gelecek, ama burada da anlık güncelleme yapıyoruz
                    dispatch(
                        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
                            if (!draft) return;

                            // AppointmentId ile thread'i bul
                            const threadIndex = draft.findIndex(t => t.appointmentId === appointment.id);

                            // Randevu durumuna göre thread görünürlüğünü kontrol et
                            const shouldBeVisible = appointment.status === AppointmentStatus.Pending ||
                                appointment.status === AppointmentStatus.Approved;

                            if (threadIndex >= 0) {
                                // Thread mevcut
                                if (shouldBeVisible) {
                                    // Thread görünür olmalı - status'i güncelle (anlık güncelleme)
                                    draft[threadIndex].status = appointment.status;
                                    // Not: Backend'den chat.threadUpdated event'i de gelecek ve tam bilgileri güncelleyecek
                                } else {
                                    // Thread görünmez olmalı - anlık olarak kaldır
                                    draft.splice(threadIndex, 1);
                                }
                            }
                            // Thread yoksa ve görünür olmalıysa, backend'den chat.threadUpdated event'i gelecek
                            // Bu yüzden burada bir şey yapmıyoruz
                        })
                    );

                    // Thread listesini de invalidate et (backend'den güncel thread listesi çekilsin)
                    // Bu, appointment durumu değiştiğinde thread'in anlık olarak görünmesi/kaybolması için gerekli
                    // Ayrıca backend'den chat.threadUpdated event'i de gelecek ve tam bilgileri güncelleyecek
                    dispatch(api.util.invalidateTags(["Chat"]));
                });
            };

            // İlk bağlantı için event handler'ları ekle
            setupEventHandlers(connection);

            // Bağlantı durumu event'leri - arka planda sessizce yeniden bağlanma
            connection.onclose(async (error?: Error) => {
                if (stopped) return;
                setIsConnected(false);

                // Otomatik yeniden bağlanma mekanizması
                const attemptReconnect = async () => {
                    if (stopped || reconnectAttemptsRef.current >= maxReconnectAttempts) {
                        reconnectAttemptsRef.current = 0;
                        return;
                    }

                    reconnectAttemptsRef.current++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Exponential backoff, max 30s

                    reconnectTimeoutRef.current = setTimeout(async () => {
                        if (stopped) return;

                        try {
                            const currentToken = tokenStore.access;
                            if (!currentToken) {
                                reconnectAttemptsRef.current = 0;
                                return;
                            }

                            // Yeni bağlantı oluştur ve başlat
                            const newConnection = new SignalR.HubConnectionBuilder()
                                .withUrl(HUB_URL, {
                                    transport: SignalR.HttpTransportType.WebSockets,
                                    skipNegotiation: true,
                                    accessTokenFactory: async () => {
                                        const token = tokenStore.access;
                                        if (!token) throw new Error('No access token');
                                        return token;
                                    },
                                })
                                .withAutomaticReconnect([0, 2000, 10000, 30000])
                                .configureLogging(SignalR.LogLevel.None) // Production'da log yok
                                .build();

                            // Event handler'ları tekrar ekle
                            setupEventHandlers(newConnection);

                            await newConnection.start();
                            if (!stopped) {
                                connectionRef.current = newConnection;
                                reconnectAttemptsRef.current = 0; // Başarılı bağlantı
                                setIsConnected(true);
                                dispatch(api.util.invalidateTags(['Badge', 'Chat', 'Notification']));
                            } else {
                                await newConnection.stop();
                            }
                        } catch (e) {
                            // Sessizce tekrar dene
                            attemptReconnect();
                        }
                    }, delay);
                };

                // İlk yeniden bağlanma denemesi
                attemptReconnect();
            });

            connection.onreconnecting(() => {
                // Arka planda yeniden bağlanıyor - kullanıcıya gösterme
            });

            connection.onreconnected(() => {
                reconnectAttemptsRef.current = 0; // Başarılı yeniden bağlantı
                setIsConnected(true);
                // Yeniden bağlandığında güncel verileri çek
                dispatch(api.util.invalidateTags(['Badge', 'Chat', 'Notification']));
            });

            try {
                await connection.start();
                if (stopped) {
                    await connection.stop();
                    return;
                }
                connectionRef.current = connection;
                reconnectAttemptsRef.current = 0; // Başarılı bağlantı
                setIsConnected(true);
                // Bağlantı kurulduğunda badge count'u fetch et
                dispatch(api.util.invalidateTags(['Badge']));
            } catch (e) {
                // SignalR connection errors are expected during network issues
                // Arka planda otomatik yeniden bağlanma mekanizması devreye girecek
                setIsConnected(false);
                dispatch(api.util.invalidateTags(['Notification', 'Badge', 'Chat']));
            }
        };

        start();

        return () => {
            stopped = true;

            // Reconnect timeout'u temizle
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            const c = connectionRef.current;
            c?.off("badge.updated");
            c?.off("notification.received");
            c?.off("chat.message");
            c?.off("chat.threadCreated");
            c?.off("chat.threadUpdated");
            c?.off("chat.threadRemoved");
            c?.off("chat.typing");
            c?.off("appointment.updated");
            c?.stop();
            connectionRef.current = null;
            reconnectAttemptsRef.current = 0;
            setIsConnected(false);
            previousToken = null;
        };
    }, [dispatch, token]); // Token değiştiğinde bağlantıyı yeniden kur

    return { isConnected, connectionRef };
};
