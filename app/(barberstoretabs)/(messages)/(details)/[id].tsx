import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ChatDetailScreen } from '../../../components/chat/ChatDetailScreen';

/**
 * BarberStore message detail page
 * Uses the shared ChatDetailScreen component
 */
const ChatDetailPage = () => {
    const { id: appointmentId } = useLocalSearchParams<{ id: string }>();

    if (!appointmentId) {
        return null;
    }

    return <ChatDetailScreen appointmentId={appointmentId} />;
};

export default ChatDetailPage;
