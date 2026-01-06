import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Icon } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import SearchBar from './searchbar';

interface InfoModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    items: Array<{
        title: string;
        description?: string;
    }>;
}

export const InfoModal: React.FC<InfoModalProps> = ({ visible, onClose, title = "Kullanım Bilgileri", items }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const query = searchQuery.toLowerCase();
        return items.filter(item => 
            item.title.toLowerCase().includes(query) || 
            (item.description && item.description.toLowerCase().includes(query))
        );
    }, [items, searchQuery]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} tint="dark" className="flex-1 justify-center items-center px-4">
                <View className="bg-[#151618] rounded-2xl w-full max-w-lg max-h-[75%] border border-[#2a2c30]">
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-4 border-b border-[#2a2c30]">
                        <Text className="text-lg font-semibold text-white flex-1">{title}</Text>
                        <TouchableOpacity onPress={onClose} className="p-1 ml-2">
                            <Icon source="close" size={22} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View className="px-4 pt-4 pb-2">
                        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    </View>

                    {/* Content */}
                    <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                        {filteredItems.length === 0 ? (
                            <View className="py-8 items-center">
                                <Text className="text-gray-400 text-sm">Arama sonucu bulunamadı</Text>
                            </View>
                        ) : (
                            filteredItems.map((item, index) => (
                                <View key={index} className="mb-5">
                                    <View className="flex-row items-center mb-2">
                                        <View className="w-2 h-2 rounded-full bg-[#f05e23] mr-3" />
                                        <Text className="text-base font-medium text-white flex-1">{item.title}</Text>
                                    </View>
                                    {item.description && (
                                        <Text className="text-sm text-gray-400 ml-5 leading-5">{item.description}</Text>
                                    )}
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </BlurView>
        </Modal>
    );
};

