import React from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Text } from './Text';
import { Icon } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../../hook/useLanguage';
import { getLegalDocuments, LegalDocumentType } from '../../constants/legal';

interface LegalModalProps {
    visible: boolean;
    onClose: () => void;
    documentType: LegalDocumentType;
}

export const LegalModal: React.FC<LegalModalProps> = ({ visible, onClose, documentType }) => {
    const { t, currentLanguage } = useLanguage();
    const documents = getLegalDocuments(currentLanguage);
    const doc = documents[documentType];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} tint="dark" className="flex-1 justify-center items-center px-4">
                <View className="bg-[#151618] rounded-2xl w-full max-w-lg border border-[#2a2c30]" style={{ maxHeight: '85%' }}>
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-4 border-b border-[#2a2c30]">
                        <Text className="text-lg font-semibold text-white flex-1" numberOfLines={2}>
                            {doc.title}
                        </Text>
                        <TouchableOpacity onPress={onClose} className="p-1 ml-2">
                            <Icon source="close" size={22} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView className="p-4" showsVerticalScrollIndicator={true}>
                        <Text className="text-sm text-gray-300 leading-6 font-century-gothic-sans-regular">
                            {doc.content}
                        </Text>
                    </ScrollView>

                    {/* Close Button */}
                    <View className="p-4 border-t border-[#2a2c30]">
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-full rounded-xl py-3 items-center bg-[#1a1a1a]"
                        >
                            <Text className="text-base font-semibold text-white">
                                {t('legal.close')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
};
