import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Icon } from 'react-native-paper';
import StarRating from 'react-native-star-rating-widget';
import { useCreateRatingMutation } from '../../store/api';
import { CreateRatingDto, ImageOwnerType } from '../../types';
import { OwnerAvatar } from '../common/owneravatar';

type RatingBottomSheetProps = {
    appointmentId: string;
    targetId: string;
    targetName: string;
    targetType: 'store' | 'freeBarber' | 'manuelBarber' | 'customer';
    targetImage?: string;
    onClose: () => void;
    onSuccess?: () => void;
};

export const RatingBottomSheet: React.FC<RatingBottomSheetProps> = ({
    appointmentId,
    targetId,
    targetName,
    targetType,
    targetImage,
    onClose,
    onSuccess,
}) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [createRating, { isLoading }] = useCreateRatingMutation();

    const normalizedTargetImage =
        targetImage && Platform.OS === 'ios' && targetImage.startsWith('file://')
            ? targetImage.replace(/ /g, '%20')
            : targetImage;

    const targetOwnerType: ImageOwnerType =
        targetType === 'store'
            ? ImageOwnerType.Store
            : targetType === 'freeBarber'
                ? ImageOwnerType.FreeBarber
                : targetType === 'manuelBarber'
                    ? ImageOwnerType.ManuelBarber
                    : ImageOwnerType.User;

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
        <BottomSheetView className="flex-1 bg-[#151618]">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-white text-lg font-bold">Değerlendirme</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon source="close" size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Randevu ID */}
                    <View className="mb-3 pb-3 border-b border-[#2a2c30]">
                        <View className="flex-row items-center gap-2">
                            <Icon source="tag" size={14} color="#6b7280" />
                            <Text className="text-[#6b7280] text-xs">Randevu ID: {appointmentId}</Text>
                        </View>
                    </View>

                    {/* Hedef Tipi ve Fotoğraf */}
                    <View className="mb-3">
                        <View className="flex-row items-center gap-3 mb-2">
                            {/* Fotoğraf */}
                            <OwnerAvatar
                                ownerId={targetId}
                                ownerType={targetOwnerType}
                                fallbackUrl={normalizedTargetImage}
                                imageClassName="w-12 h-12 rounded-full"
                                iconSource={
                                    targetType === 'store'
                                        ? 'store'
                                        : targetType === 'freeBarber'
                                            ? 'account-supervisor'
                                            : 'account'
                                }
                                iconSize={30}
                                iconColor="#6b7280"
                            />
                            <View className="flex-1">
                                <View className="flex-row items-center gap-2 mb-1">
                                    <Text className="text-[#9ca3af] text-xs">
                                        {targetType === 'store' ? 'Dükkan' :
                                            targetType === 'freeBarber' ? 'Serbest Berber' :
                                                targetType === 'manuelBarber' ? 'Dükkan Berberi' :
                                                    'Müşteri'}
                                    </Text>
                                </View>
                                <View className='flex-row gap-2 items-center'>
                                    <Text className="text-white text-base font-semibold">{targetName} -</Text>
                                    <Text className="text-[#9ca3af] text-sm">için değerlendirme yapın</Text>
                                </View>
                            </View>
                        </View>

                    </View>

                    <View className="items-start mb-4">
                        <View className="flex-row items-center">
                            <StarRating
                                rating={rating}
                                onChange={setRating}
                                starSize={40}
                                color="#fbbf24"
                                starStyle={{ marginHorizontal: 4 }}
                            />
                            {rating > 0 && (
                                <Text className="text-[#fbbf24] text-4xl font-bold">: {rating}</Text>
                            )}
                        </View>
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
                        className={`bg-[#f05e23] py-3 rounded-xl flex-row items-center justify-center mb-4 ${(isLoading || rating === 0) ? 'opacity-50' : ''}`}
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
                </ScrollView>
            </KeyboardAvoidingView>
        </BottomSheetView>
    );
};
