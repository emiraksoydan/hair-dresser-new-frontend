import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ChatDetailScreen } from '../../components/chat/ChatDetailScreen';

/**
 * Customer message detail page
 * Uses the shared ChatDetailScreen component
 * Now uses threadId instead of appointmentId
 */
const ChatDetailPage = () => {
    const { id: threadId } = useLocalSearchParams<{ id: string }>();

    if (!threadId) {
        return null;
    }

    return <ChatDetailScreen threadId={threadId} />;
};

export default ChatDetailPage;
