import React, { useMemo, useState } from 'react';
import { View, Text, Image, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Icon } from 'react-native-paper';
import { useGetRatingsByTargetQuery } from '../../store/api';
import { RatingGetDto, UserType, BarberType } from '../../types';
import { useAuth } from '../../hook/useAuth';
import { getBarberTypeName } from '../../utils/store/barber-type';

type RatingsBottomSheetProps = {
    targetId: string;
    targetName: string;
    onClose: () => void;
};

export const RatingsBottomSheet: React.FC<RatingsBottomSheetProps> = ({
    targetId,
    targetName,
    onClose,
}) => {
    const { userId } = useAuth();

    // Query'yi normal şekilde çalıştır - sheet açıldığında component mount olur ve query otomatik tetiklenir
    const { data: ratings, isLoading, refetch } = useGetRatingsByTargetQuery(targetId, {
        skip: !targetId, // targetId yoksa query yapma
    });

    const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null); // null = Hepsi

    const safeRatings = Array.isArray(ratings) ? ratings : [];
    const formatDateTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        } catch {
            return dateStr;
        }
    };

    // Filtrelenmiş yorumlar
    const filteredRatings = useMemo(() => {
        if (!Array.isArray(safeRatings)) return [];
        if (selectedRatingFilter === null) return safeRatings;
        return safeRatings.filter((r: RatingGetDto) => Math.round(r.score) === selectedRatingFilter);
    }, [safeRatings, selectedRatingFilter]);

    // UserType ve BarberType'a göre görünen isim
    const getDisplayName = (rating: RatingGetDto) => {
        return rating.ratedFromName || 'Anonim';
    };

    // Kullanıcının kendi yorumu mu kontrol et
    // Backend'de RatedFromId her zaman User ID (userId) olarak set ediliyor
    // Bu yüzden tüm user type'lar için userId ile karşılaştırma yapılmalı
    const isMyRating = (rating: RatingGetDto) => {
        if (!rating.ratedFromId || !userId) return false;

        // Backend'de RatedFromId her zaman User ID olarak set ediliyor
        // Bu yüzden direkt userId ile karşılaştır
        return rating.ratedFromId === userId;
    };

    const renderRatingItem = ({ item }: { item: RatingGetDto }) => {
        const isMyComment = isMyRating(item);
        const displayName = getDisplayName(item);
        const imageUrl = item.ratedFromImage;
        const roundedScore = Math.round(item.score);

        return (
            <View className="mb-4">
                {/* Üst kısım: Kullanıcı bilgileri */}
                <View className="flex-row items-start">
                    {/* Profil fotoğrafı */}
                    <View className="relative mr-3">
                        <Image
                            source={
                                imageUrl
                                    ? { uri: imageUrl }
                                    : require('../../../assets/images/empty.png')
                            }
                            className="w-12 h-12 rounded-full"
                            resizeMode="cover"
                        />
                        {/* "Sizin yorumunuz" badge */}
                        {isMyComment && (
                            <View className="absolute -top-1 -right-1 bg-[#f05e23] rounded-full px-1.5 py-0.5">
                                <Text className="text-white text-[8px] font-bold">Sizin</Text>
                            </View>
                        )}
                    </View>

                    {/* Kullanıcı bilgileri ve tarih */}
                    <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-2 flex-wrap mb-1">
                            <Text className="text-white font-ibm-plex-sans-bold text-base" numberOfLines={1}>
                                {displayName}
                            </Text>
                            {/* UserType badge - backend'den gelen veri */}
                            {item.ratedFromUserType !== null && item.ratedFromUserType !== undefined && (
                                <View className="bg-[#374151] rounded-full px-2 py-0.5">
                                    <Text className="text-[#9ca3af] text-[10px]">
                                        {item.ratedFromUserType === UserType.Customer ? 'Müşteri' :
                                            item.ratedFromUserType === UserType.FreeBarber ? 'Serbest Berber' :
                                                item.ratedFromUserType === UserType.BarberStore ? 'Dükkan' : ''}
                                    </Text>
                                </View>
                            )}
                            {/* BarberType badge - FreeBarber veya Store için */}
                            {item.ratedFromBarberType !== null && item.ratedFromBarberType !== undefined && (
                                <View className="bg-[#1f2937] rounded-full px-2 py-0.5">
                                    <Text className="text-[#d1d5db] text-[10px]">
                                        {getBarberTypeName(item.ratedFromBarberType)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-[#9ca3af] text-sm">
                            {formatDateTime(item.createdAt)}
                        </Text>
                    </View>

                    {/* Rating badge - sağ tarafta */}
                    <View className="bg-[#f05e23] rounded-full w-10 h-10 items-center justify-center">
                        <Text className="text-white font-bold text-sm">★ {roundedScore}</Text>
                    </View>
                </View>

                {/* Yorum metni */}
                {item.comment && (
                    <View className="mt-3 ml-[60px]">
                        <Text className="text-white text-sm font-ibm-plex-sans-regular leading-5">
                            {item.comment}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const ratingFilters = [
        { label: 'Hepsi', value: null },
        { label: '★ 5', value: 5 },
        { label: '★ 4', value: 4 },
        { label: '★ 3', value: 3 },
        { label: '★ 2', value: 2 },
        { label: '★ 1', value: 1 },
    ];

    return (
        <BottomSheetView className="flex-1 bg-[#151618]">
            {/* Header */}
            <View className="px-4 pt-4 pb-3">
                <Text className="text-white font-ibm-plex-sans-bold text-xl mb-4">
                    Yorumlar
                </Text>

                {/* Rating Filtreleri - Sadece veri varsa göster */}
                {!isLoading && safeRatings.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
                    >
                        {ratingFilters.map((filter: { label: string; value: number | null }) => {
                            const isSelected = selectedRatingFilter === filter.value;
                            return (
                                <TouchableOpacity
                                    key={filter.value ?? 'all'}
                                    onPress={() => setSelectedRatingFilter(filter.value)}
                                    className={`rounded-full px-4 py-2 ${isSelected ? 'bg-[#f05e23]' : 'bg-transparent border border-[#f05e23]'
                                        }`}
                                >
                                    <Text
                                        className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-[#f05e23]'
                                            }`}
                                    >
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
            </View>

            {/* Yorumlar listesi */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#f05e23" />
                </View>
            ) : safeRatings.length === 0 ? (
                <View className="flex-1 items-center justify-center px-4">
                    <Icon source="comment-outline" size={64} color="#6b7280" />
                    <Text className="text-[#9ca3af] text-base mt-4 text-center">
                        Yorumlar yok
                    </Text>
                </View>
            ) : filteredRatings.length === 0 ? (
                <View className="flex-1 items-center justify-center px-4">
                    <Icon source="comment-outline" size={64} color="#6b7280" />
                    <Text className="text-[#9ca3af] text-base mt-4 text-center">
                        Seçilen filtreye uygun yorum bulunamadı
                    </Text>
                </View>
            ) : (
                <BottomSheetFlatList
                    data={filteredRatings}
                    keyExtractor={(item: RatingGetDto) => item.id}
                    renderItem={renderRatingItem}
                    contentContainerStyle={{ padding: 16 }}
                    refreshing={isLoading}
                    onRefresh={refetch}
                />
            )}
        </BottomSheetView>
    );
};

