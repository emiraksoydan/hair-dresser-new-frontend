import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Icon } from 'react-native-paper';
import StarRating from 'react-native-star-rating-widget';
import { useCreateRatingMutation } from '../../store/api';
import { CreateRatingDto } from '../../types';

type RatingBottomSheetProps = {
    appointmentId: string;
    targetId: string;
    targetName: string;
    onClose: () => void;
    onSuccess?: () => void;
};

export const RatingBottomSheet: React.FC<RatingBottomSheetProps> = ({
    appointmentId,
    targetId,
    targetName,
    onClose,
    onSuccess,
}) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [createRating, { isLoading }] = useCreateRatingMutation();

    const handleSubmit = useCallback(async () => {
        if (rating === 0) {
            Alert.alert('Uyarı', 'Lütfen bir puan seçin.');
            return;
        }

        try {
            const dto: CreateRatingDto = {
                appointmentId,
                targetId,
                score: rating,
                comment: comment.trim() || null,
            };

            await createRating(dto).unwrap();
            Alert.alert('Başarılı', 'Değerlendirmeniz kaydedildi.');
            onSuccess?.();
            onClose();
        } catch (error: any) {
            Alert.alert('Hata', error?.data?.message || 'Değerlendirme kaydedilemedi.');
        }
    }, [rating, comment, appointmentId, targetId, createRating, onClose, onSuccess]);

    return (
        <BottomSheetView className="flex-1 bg-[#151618] px-4">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-lg font-bold">Değerlendirme</Text>
                <TouchableOpacity onPress={onClose}>
                    <Icon source="close" size={24} color="#9ca3af" />
                </TouchableOpacity>

            </View>

            <Text className="text-[#9ca3af] text-sm mb-2">{targetName} için değerlendirme yapın</Text>

            <View className="items-center my-6">
                <StarRating
                    rating={rating}
                    onChange={setRating}
                    starSize={40}
                    color="#fbbf24"
                    starStyle={{ marginHorizontal: 4 }}
                />
            </View>

            <Text className="text-white text-sm mb-2">Yorum (Opsiyonel)</Text>
            <TextInput
                className="bg-[#2a2c30] text-white rounded-lg p-3 mb-4 min-h-[100px]"
                placeholder="Yorumunuzu yazın..."
                placeholderTextColor="#6b7280"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
            />

            <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading || rating === 0}
                className={`bg-[#f05e23] py-3 rounded-xl flex-row items-center justify-center ${(isLoading || rating === 0) ? 'opacity-50' : ''}`}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" size="small" />
                ) : (
                    <>
                        <Icon source="star" size={20} color="white" />
                        <Text className="text-white font-bold ml-2">Değerlendirmeyi Gönder</Text>
                    </>
                )}
            </TouchableOpacity>
        </BottomSheetView>
    );
};
