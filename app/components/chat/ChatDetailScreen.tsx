import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
import {
    useGetChatMessagesByThreadQuery,
    useSendChatMessageMutation,
    useSendChatMessageByThreadMutation,
    useMarkChatThreadReadMutation,
    useGetChatThreadsQuery,
    useGetBadgeCountsQuery,
    useNotifyTypingMutation
} from '../../store/api';
import { ChatMessageItemDto, ChatMessageDto, ChatThreadParticipantDto, AppointmentStatus, UserType, BarberType } from '../../types';
import { useAuth } from '../../hook/useAuth';
import { useSignalR } from '../../hook/useSignalR';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatDetailScreenProps {
    threadId: string; // ThreadId ile çalışıyoruz (hem randevu hem favori thread'leri için)
}

/**
 * Reusable chat detail screen component
 * Used by all user types (Customer, BarberStore, FreeBarber)
 * Works with both appointment and favorite threads
 */
export const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({ threadId }) => {
    const router = useRouter();
    const [messageText, setMessageText] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const { userId: currentUserId, userType: currentUserType } = useAuth();
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

    // SignalR bağlantı kontrolü
    const { isConnected, connectionRef } = useSignalR();

    const { data: threads, isLoading: isLoadingThreads, refetch: refetchThreads } = useGetChatThreadsQuery();
    const currentThread = useMemo(() => {
        const thread = threads?.find(t => t.threadId === threadId);
        console.log('📋 Current thread participants count:', thread?.participants?.length || 0);
        return thread;
    }, [threads, threadId]);

    // Thread bulunamadı hatası için kontrol
    useEffect(() => {
        if (!isLoadingThreads && threads && !currentThread && threadId) {
            // Thread bulunamadı, yeniden yükle
            setTimeout(() => {
                refetchThreads();
            }, 1000);
        }
    }, [isLoadingThreads, threads, currentThread, threadId, refetchThreads]);

    // Mesajları ThreadId ile getir
    const { data: messages, isLoading, refetch } = useGetChatMessagesByThreadQuery(
        { threadId },
        { skip: !threadId }
    );

    // Mesaj gönderme kontrolleri
    const canSendMessage = useMemo(() => {
        if (!currentThread) return false;
        if (!isConnected) return false; // SignalR bağlantısı yoksa mesaj gönderilemez

        // Randevu thread'i için: Pending veya Approved
        if (!currentThread.isFavoriteThread && currentThread.status !== null && currentThread.status !== undefined) {
            const status = currentThread.status;
            return status === AppointmentStatus.Pending ||
                status === AppointmentStatus.Approved;
        }

        // Favori thread için: her zaman gönderilebilir (aktif favori kontrolü backend'de)
        if (currentThread.isFavoriteThread) {
            return true;
        }

        return false;
    }, [currentThread, isConnected]);

    // Mesaj gönderme mutation'ları
    const [sendMessageByAppointment, { isLoading: isSendingByAppt }] = useSendChatMessageMutation();
    const [sendMessageByThread, { isLoading: isSendingByThread }] = useSendChatMessageByThreadMutation();
    const isSending = isSendingByAppt || isSendingByThread;

    const [markRead] = useMarkChatThreadReadMutation();
    const [notifyTyping] = useNotifyTypingMutation();

    // Typing indicator için debounce
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypingNotificationRef = useRef(false);

    // Mark thread as read when opened
    useEffect(() => {
        if (threadId && currentThread && currentThread.unreadCount > 0) {
            markRead(threadId);
        }
    }, [threadId, currentThread?.unreadCount, markRead]);

    // ÖNEMLİ: ChatDetailScreen açıkken yeni mesaj geldiğinde otomatik read yap
    // Eğer kullanıcı sohbet odasında ise, mesaj geldiğinde otomatik okundu işaretlenmeli
    useEffect(() => {
        const connection = connectionRef?.current;
        if (!connection || !threadId || !currentUserId) return;

        const handleNewMessage = async (dto: ChatMessageDto) => {
            // Bu thread için gelen mesaj mı?
            if (dto.threadId !== threadId) return;

            // Kendi gönderdiğimiz mesaj değilse (başkasından geldiyse) otomatik read yap
            if (dto.senderUserId !== currentUserId) {
                try {
                    await markRead(threadId).unwrap();
                } catch (error) {
                    // Hata durumunda sessizce devam et
                }
            }
        };

        connection.on("chat.message", handleNewMessage);

        return () => {
            if (connection) {
                connection.off("chat.message", handleNewMessage);
            }
        };
    }, [threadId, currentUserId, markRead, connectionRef]);

    // Typing indicator timeout
    useEffect(() => {
        if (typingUsers.size > 0) {
            const timeout = setTimeout(() => {
                setTypingUsers(new Set());
            }, 3000); // 3 saniye sonra typing indicator'ü kaldır
            return () => clearTimeout(timeout);
        }
    }, [typingUsers]);

    // Typing indicator SignalR event handler
    useEffect(() => {
        const connection = connectionRef?.current;
        if (!connection) return;

        const handleTyping = (data: { threadId: string; typingUserId: string; typingUserName: string; isTyping: boolean }) => {
            if (data.threadId !== threadId) return;
            if (data.typingUserId === currentUserId) return; // Kendi typing'ini gösterme

            if (data.isTyping) {
                setTypingUsers(prev => new Set([...prev, data.typingUserId]));
            } else {
                setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(data.typingUserId);
                    return newSet;
                });
            }
        };

        connection.on("chat.typing", handleTyping);

        return () => {
            if (connection) {
                connection.off("chat.typing", handleTyping);
            }
        };
    }, [threadId, currentUserId]); // connectionRef bir ref olduğu için dependency'ye eklenmez

    // Mesaj yazarken typing indicator gönder
    const handleTextChange = useCallback((text: string) => {
        setMessageText(text);

        // Typing indicator gönder (debounce ile)
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        const shouldNotifyTyping = text.trim().length > 0 && canSendMessage && isConnected;

        if (shouldNotifyTyping && !lastTypingNotificationRef.current) {
            // Typing başladı
            notifyTyping({ threadId, isTyping: true });
            lastTypingNotificationRef.current = true;
        }

        typingTimeoutRef.current = setTimeout(() => {
            // 2 saniye sonra typing bitti
            if (lastTypingNotificationRef.current) {
                notifyTyping({ threadId, isTyping: false });
                lastTypingNotificationRef.current = false;
            }
        }, 2000);
    }, [threadId, canSendMessage, isConnected, notifyTyping]);

    const handleSend = useCallback(async () => {
        if (!messageText.trim() || !threadId || isSending) return;

        // Kontroller
        if (!canSendMessage) {
            if (!isConnected) {
                Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
            } else {
                Alert.alert(
                    'Mesaj Gönderilemez',
                    'Bu thread için mesaj gönderemezsiniz.'
                );
            }
            return;
        }

        // Typing indicator'ü kapat
        if (lastTypingNotificationRef.current) {
            notifyTyping({ threadId, isTyping: false });
            lastTypingNotificationRef.current = false;
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        const text = messageText.trim();
        setMessageText('');

        try {
            // Randevu thread'i ise appointmentId ile gönder, favori thread ise threadId ile
            if (currentThread?.isFavoriteThread || !currentThread?.appointmentId) {
                await sendMessageByThread({ threadId, text }).unwrap();
            } else {
                await sendMessageByAppointment({ appointmentId: currentThread.appointmentId, text }).unwrap();
            }
            refetch();
        } catch (e: any) {
            setMessageText(text); // Restore text on error
            Alert.alert('Hata', e?.data?.message || e?.message || 'Mesaj gönderilemedi');
        }
    }, [messageText, threadId, isSending, canSendMessage, isConnected, currentThread, sendMessageByThread, sendMessageByAppointment, refetch, notifyTyping]);

    const formatMessageTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '';
        }
    };

    // Messages from backend are oldest first, newest last
    // Reverse for inverted FlatList: newest first (will appear at bottom visually)
    // WhatsApp style: oldest at top, newest at bottom, new messages added at bottom
    const sortedMessages = useMemo(() => {
        if (!messages) return [];
        // Array kontrolü ekle - iterator hatasını önlemek için
        if (!Array.isArray(messages)) return [];
        try {
            return [...messages].reverse();
        } catch {
            return [];
        }
    }, [messages]);

    // Participants'ı Map'e çevir - hızlı lookup için (senderParticipant undefined sorununu çözer)
    // Normalize edilmiş userId ile lookup yapıyoruz (trim, toLowerCase) - backend'den gelen verilerde farklılık olabilir
    const participantsMap = useMemo(() => {
        if (!currentThread?.participants || !Array.isArray(currentThread.participants)) {
            return new Map<string, ChatThreadParticipantDto>();
        }
        const map = new Map<string, ChatThreadParticipantDto>();
        currentThread.participants.forEach(p => {
            if (p.userId) {
                // Normalize edilmiş key ile kaydet
                const normalizedKey = p.userId.trim().toLowerCase();
                map.set(normalizedKey, p);
                // Orijinal key ile de kaydet (her iki durumda da çalışsın)
                map.set(p.userId, p);
            }
        });
        return map;
    }, [currentThread?.participants]);

    // Thread participants'ı mesajlar geldiğinde güncelle (yeni mesaj gönderen kullanıcılar için)
    const [hasRefetched, setHasRefetched] = useState(false);

    useEffect(() => {
        if (messages && messages.length > 0 && currentThread && !hasRefetched) {
            // Mesajlardaki tüm unique senderUserId'leri topla
            const messageSenderIds = new Set<string>();
            messages.forEach(msg => {
                if (msg.senderUserId) {
                    messageSenderIds.add(msg.senderUserId);
                }
            });

            // Thread participants'ında olmayan sender'lar varsa thread'i refetch et
            const participantIds = new Set(currentThread.participants.map(p => p.userId));
            const missingSenders = Array.from(messageSenderIds).filter(id => !participantIds.has(id));

            console.log('=== PARTICIPANT CHECK ===');
            console.log('Message sender IDs:', Array.from(messageSenderIds));
            console.log('Participant IDs:', Array.from(participantIds));
            console.log('Missing senders:', missingSenders);
            console.log('Current participants:', currentThread.participants);

            if (missingSenders.length > 0) {
                console.log('⚠️ Missing participants detected, refetching threads...');
                setHasRefetched(true);
                refetchThreads().then(() => {
                    console.log('✅ Threads refetched successfully');
                }).catch((error) => {
                    console.error('❌ Refetch error:', error);
                    setHasRefetched(false); // Hata olursa tekrar denesin
                });
            }
        }
    }, [messages, currentThread?.participants, refetchThreads, hasRefetched]);

    // Auto-scroll to bottom when new messages arrive (inverted FlatList: scroll to index 0 = visual bottom)
    useEffect(() => {
        if (sortedMessages && sortedMessages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: 0, animated: true });
            }, 100);
        }
    }, [sortedMessages]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#151618] items-center justify-center">
                <ActivityIndicator size="large" color="#22c55e" />
            </View>
        );
    }

    if (!currentThread) {
        return (
            <View className="flex-1 bg-[#151618] items-center justify-center">
                <Text className="text-gray-400">Sohbet bulunamadı</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-green-500">Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-[#151618]"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header with Participants Tab */}
            <SafeAreaView className="bg-gray-800">
                <View className="px-4 py-3 flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mr-0 flex-row items-center"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon source="chevron-left" size={28} color="white" />
                    </TouchableOpacity>
                    <View className="flex-1 ml-0">
                        {/* Participants Tab - kullanıcı türüne göre görünüm */}
                        {currentThread.participants.length > 0 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="px-2 py-2"
                            >
                                {currentThread.participants.map((participant) => {
                                    // Kullanıcı türüne göre participant etiketi belirle
                                    const getParticipantLabel = () => {
                                        // Eğer participant kendi türümüzle aynıysa, tür etiketi gösterme
                                        if (participant.userType === currentUserType) {
                                            return null;
                                        }

                                        // Participant'ın türüne göre etiket
                                        if (participant.userType === UserType.BarberStore) {
                                            return 'Dükkan';
                                        } else if (participant.userType === UserType.FreeBarber) {
                                            return 'Serbest Berber';
                                        } else if (participant.userType === UserType.Customer) {
                                            return 'Müşteri';
                                        }
                                        return null;
                                    };

                                    const participantLabel = getParticipantLabel();

                                    // BarberType bilgisini göster (eğer varsa)
                                    const getBarberTypeLabel = () => {
                                        if (participant.barberType === undefined || participant.barberType === null) {
                                            return null;
                                        }

                                        if (participant.userType === UserType.FreeBarber) {
                                            return participant.barberType === BarberType.MaleHairdresser ? "Erkek" : "Kadın";
                                        } else if (participant.userType === UserType.BarberStore) {
                                            if (participant.barberType === BarberType.MaleHairdresser) return "Erkek Berberi";
                                            if (participant.barberType === BarberType.FemaleHairdresser) return "Kadın Kuaförü";
                                            return "Güzellik Salonu";
                                        }
                                        return null;
                                    };

                                    const barberTypeLabel = getBarberTypeLabel();

                                    return (
                                        <View key={participant.userId} className="flex-row items-center mr-4">
                                            <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 items-center justify-center mr-2">
                                                {participant.imageUrl ? (
                                                    <Image
                                                        source={{ uri: participant.imageUrl }}
                                                        className="w-full h-full"
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <Icon
                                                        source={
                                                            participant.userType === UserType.BarberStore
                                                                ? "store"
                                                                : participant.userType === UserType.FreeBarber
                                                                    ? "account-supervisor"
                                                                    : "account"
                                                        }
                                                        size={20}
                                                        color="white"
                                                    />
                                                )}
                                            </View>
                                            <View>
                                                <View className="flex-row items-center gap-1 flex-wrap">
                                                    <Text className="text-white text-base font-ibm-plex-sans-medium" numberOfLines={1}>
                                                        {participant.displayName} -
                                                    </Text>
                                                    {participantLabel && (
                                                        <Text className="text-gray-400 text-xs font-ibm-plex-sans-medium">
                                                            {participantLabel}
                                                        </Text>
                                                    )}
                                                </View>

                                                {barberTypeLabel && (
                                                    <Text className="text-gray-500 text-xs">
                                                        {barberTypeLabel}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                        {currentThread.status !== null && currentThread.status !== undefined && (
                            <Text className="text-gray-400 text-xs">
                                {(() => {
                                    const status = currentThread.status;
                                    if (status === AppointmentStatus.Approved) return 'Onaylandı';
                                    if (status === AppointmentStatus.Pending) return 'Beklemede';
                                    return '';
                                })()}
                            </Text>
                        )}
                    </View>
                </View>


            </SafeAreaView>

            {/* Messages List - WhatsApp style: inverted FlatList for bottom-aligned messages */}
            <FlatList
                ref={flatListRef}
                data={sortedMessages}
                keyExtractor={(item) => item.messageId}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                inverted={true}
                maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                }}
                onScrollToIndexFailed={(info) => {
                    // Fallback: scroll to end if index scroll fails
                    setTimeout(() => {
                        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                    }, 100);
                }}
                renderItem={({ item }: { item: ChatMessageItemDto }) => {
                    const isMe = item.senderUserId === currentUserId;

                    // Participants Map'inden lookup
                    let senderParticipant: ChatThreadParticipantDto | null = null;
                    if (item.senderUserId) {
                        const normalizedKey = item.senderUserId.trim().toLowerCase();
                        senderParticipant = participantsMap.get(normalizedKey) || participantsMap.get(item.senderUserId) || null;
                    }

                    // Fallback: Eğer participant bulunamadıysa, mesajdan bilgi oluştur
                    const displayInfo = senderParticipant || {
                        userId: item.senderUserId,
                        displayName: item.senderUserId?.substring(0, 8) || 'Bilinmeyen',
                        userType: UserType.Customer, // Default
                        imageUrl: null,
                        barberType: null
                    };

                    return (
                        <View className={`flex-row items-start gap-2 mb-3 ${isMe ? 'justify-end' : 'justify-start'}`} style={{ flexShrink: 1 }}>
                            {!isMe && (
                                <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 items-center justify-center" style={{ flexShrink: 0 }}>
                                    {displayInfo.imageUrl ? (
                                        <Image
                                            source={{ uri: displayInfo.imageUrl }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Icon
                                            source={
                                                displayInfo.userType === UserType.BarberStore
                                                    ? "store"
                                                    : displayInfo.userType === UserType.FreeBarber
                                                        ? "account-supervisor"
                                                        : "account"
                                            }
                                            size={20}
                                            color="white"
                                        />
                                    )}
                                </View>
                            )}

                            <View className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`} style={{ flexShrink: 1, minWidth: 0 }}>
                                <View
                                    className={`rounded-2xl px-4 py-2.5 ${isMe
                                        ? 'bg-green-600 rounded-tr-sm'
                                        : 'bg-gray-700 rounded-tl-sm'
                                        }`}
                                    style={{ flexShrink: 1 }}
                                >
                                    {!isMe && (
                                        <View className="flex-row items-center gap-1 mb-1 flex-wrap">
                                            <Text className="text-gray-300 text-xs font-ibm-plex-sans-medium">
                                                {displayInfo.displayName} -
                                            </Text>
                                            {/* Kullanıcı türüne göre sender etiketi - sadece kendi türümüzden farklıysa göster */}
                                            {senderParticipant && senderParticipant.userType !== currentUserType && (
                                                <Text className="text-gray-400 text-xs font-ibm-plex-sans-regular">
                                                    {senderParticipant.userType === UserType.BarberStore ? 'Dükkan' :
                                                        senderParticipant.userType === UserType.FreeBarber ? 'Serbest Berber' :
                                                            'Müşteri'}
                                                </Text>
                                            )}
                                            {!senderParticipant && (
                                                <Text className="text-gray-500 text-xs"> (yükleniyor...)</Text>
                                            )}
                                        </View>
                                    )}
                                    <Text 
                                        className={`text-white text-sm ${isMe ? 'text-right' : 'text-left'} font-ibm-plex-sans-regular`}
                                        style={{ flexWrap: 'wrap', flexShrink: 1 }}
                                    >
                                        {item.text}
                                    </Text>
                                </View>
                                <Text className={`text-gray-500 text-xs mt-1 ${isMe ? 'text-right' : 'text-left'} px-2`}>
                                    {formatMessageTime(item.createdAt)}
                                </Text>
                            </View>

                            {isMe && (
                                <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 items-center justify-center">
                                    {currentThread?.currentUserImageUrl ? (
                                        <Image
                                            source={{ uri: currentThread.currentUserImageUrl }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Icon
                                            source={
                                                currentUserType === UserType.BarberStore
                                                    ? "store"
                                                    : currentUserType === UserType.FreeBarber
                                                        ? "account-supervisor"
                                                        : "account"
                                            }
                                            size={20}
                                            color="white"
                                        />
                                    )}
                                </View>
                            )}
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center py-20">
                        <Text className="text-gray-400">Henüz mesaj yok</Text>
                        <Text className="text-gray-500 text-xs mt-2">İlk mesajı siz gönderin</Text>
                    </View>
                }
                ListFooterComponent={
                    typingUsers.size > 0 ? (
                        <View className="flex-row items-center px-4 py-2">
                            <Text className="text-gray-500 text-xs italic">
                                {Array.from(typingUsers).map(userId => {
                                    const user = currentThread.participants.find(p => p.userId === userId);
                                    return user?.displayName || 'Birisi';
                                }).join(', ')} yazıyor...
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* Input */}
            <View className="bg-gray-800 border-t border-gray-700 px-4 py-3">
                {!isConnected && (
                    <View className="bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 mb-2">
                        <Text className="text-red-400 text-xs text-center">
                            Sunucuya bağlanılamıyor. Mesaj gönderemezsiniz.
                        </Text>
                    </View>
                )}
                {!canSendMessage && isConnected && (
                    <View className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2 mb-2">
                        <Text className="text-yellow-400 text-xs text-center">
                            Bu thread için mesaj gönderemezsiniz
                        </Text>
                    </View>
                )}
                <View className="flex-row items-center gap-2">
                    <TextInput
                        value={messageText}
                        onChangeText={handleTextChange}
                        placeholder={canSendMessage ? "Mesaj yazın..." : "Mesaj gönderilemez"}
                        placeholderTextColor="#6b7280"
                        className="flex-1 bg-gray-700 text-white rounded-full px-4 py-2 font-ibm-plex-sans-regular"
                        multiline
                        maxLength={500}
                        editable={canSendMessage}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!messageText.trim() || isSending || !canSendMessage}
                        className={`w-10 h-10 rounded-full items-center justify-center ${messageText.trim() && canSendMessage ? 'bg-green-600' : 'bg-gray-700'
                            }`}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Icon source="send" size={20} color="white" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};