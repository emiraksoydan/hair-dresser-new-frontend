import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useGetChatMessagesQuery, useSendChatMessageMutation, useMarkChatThreadReadMutation, useGetChatThreadsQuery } from '../../store/api';
import { ChatMessageItemDto } from '../../types';
import { useAuth } from '../../hook/useAuth';
import { logger } from '../../utils/common/logger';

interface ChatDetailScreenProps {
    appointmentId: string;
}

/**
 * Reusable chat detail screen component
 * Used by all user types (Customer, BarberStore, FreeBarber)
 */
export const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({ appointmentId }) => {
    const router = useRouter();
    const [messageText, setMessageText] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const { userId: currentUserId } = useAuth();

    const { data: messages, isLoading, refetch } = useGetChatMessagesQuery(
        { appointmentId },
        { skip: !appointmentId }
    );
    
    const { data: threads } = useGetChatThreadsQuery();
    const currentThread = useMemo(() => 
        threads?.find(t => t.appointmentId === appointmentId),
        [threads, appointmentId]
    );

    const [sendMessage, { isLoading: isSending }] = useSendChatMessageMutation();
    const [markRead] = useMarkChatThreadReadMutation();

    // Mark thread as read when opened
    useEffect(() => {
        if (appointmentId && currentThread && currentThread.unreadCount > 0) {
            markRead(appointmentId);
        }
    }, [appointmentId, currentThread?.unreadCount, markRead]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages && messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSend = useCallback(async () => {
        if (!messageText.trim() || !appointmentId || isSending) return;

        const text = messageText.trim();
        setMessageText('');

        try {
            await sendMessage({ appointmentId, text }).unwrap();
            refetch();
        } catch (e: any) {
            setMessageText(text); // Restore text on error
            logger.error('Send message error:', e);
        }
    }, [messageText, appointmentId, isSending, sendMessage, refetch]);

    const formatMessageTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Şimdi';
            if (diffMins < 60) return `${diffMins} dk önce`;
            if (diffMins < 1440) return `${Math.floor(diffMins / 60)} sa önce`;
            return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    // Reverse messages (oldest first, newest last)
    const sortedMessages = useMemo(() => {
        if (!messages) return [];
        return [...messages].reverse();
    }, [messages]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#151618] items-center justify-center">
                <ActivityIndicator size="large" color="#22c55e" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-[#151618]"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View className="bg-gray-800 px-4 py-3 flex-row items-center justify-between border-b border-gray-700">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <Icon source="chevron-left" size={24} color="white" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-white font-ibm-plex-sans-bold text-lg" numberOfLines={1}>
                        {currentThread?.title || 'Sohbet'}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                        {currentThread?.status === 1 ? 'Onaylandı' : 'Beklemede'}
                    </Text>
                </View>
            </View>

            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={sortedMessages}
                keyExtractor={(item) => item.messageId}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                renderItem={({ item }: { item: ChatMessageItemDto }) => {
                    const isMe = item.senderUserId === currentUserId;
                    
                    return (
                        <View className={`flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <View className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isMe && (
                                    <View className="w-8 h-8 rounded-full bg-gray-700 items-center justify-center mb-1">
                                        <Icon source="account" size={16} color="white" />
                                    </View>
                                )}
                                <View
                                    className={`rounded-2xl px-4 py-2 ${
                                        isMe ? 'bg-green-600' : 'bg-gray-700'
                                    }`}
                                >
                                    <Text className={`text-white text-sm ${isMe ? 'text-right' : 'text-left'}`}>
                                        {item.text}
                                    </Text>
                                </View>
                                <Text className="text-gray-500 text-xs mt-1 px-2">
                                    {formatMessageTime(item.createdAt)}
                                </Text>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center py-20">
                        <Text className="text-gray-400">Henüz mesaj yok</Text>
                        <Text className="text-gray-500 text-xs mt-2">İlk mesajı siz gönderin</Text>
                    </View>
                }
            />

            {/* Input */}
            <View className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex-row items-center gap-2">
                <TextInput
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Mesaj yazın..."
                    placeholderTextColor="#6b7280"
                    className="flex-1 bg-gray-700 text-white rounded-full px-4 py-2 font-ibm-plex-sans-regular"
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    onPress={handleSend}
                    disabled={!messageText.trim() || isSending}
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                        messageText.trim() ? 'bg-green-600' : 'bg-gray-700'
                    }`}
                >
                    {isSending ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Icon source="send" size={20} color="white" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};
