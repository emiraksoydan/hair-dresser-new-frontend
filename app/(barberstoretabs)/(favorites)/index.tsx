import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, Dimensions, ActivityIndicator, Image } from 'react-native';
import { useGetMyFavoritesQuery } from '../../store/api';
import { FavoriteGetDto, FavoriteTargetType } from '../../types';
import { StoreCardInner } from '../../components/store/storecard';
import { FreeBarberCardInner } from '../../components/freebarber/freebarbercard';
import { useRouter } from 'expo-router';
import { BarberStoreGetDto, FreeBarGetDto } from '../../types';
import { Icon } from 'react-native-paper';

const Index = () => {
    const { data: favorites, isLoading, refetch, isFetching } = useGetMyFavoritesQuery();
    const router = useRouter();

    const screenWidth = Dimensions.get("window").width;
    const cardWidthStore = screenWidth * 0.92;
    const cardWidthFreeBarber = screenWidth * 0.92;

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        router.push({
            pathname: "/store/[storeId]",
            params: { storeId: store.id, mode: "store" },
        });
    }, [router]);

    const goFreeBarberDetail = useCallback((freeBarber: FreeBarGetDto) => {
        router.push({
            pathname: "/freebarber/[freeBarberId]",
            params: { freeBarber: freeBarber.id },
        });
    }, [router]);

    // Store, FreeBarber, Customer ve ManuelBarber favorilerini ayır
    const storeFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.Store && f.store) || [];
    }, [favorites]);

    const freeBarberFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.FreeBarber && f.freeBarber) || [];
    }, [favorites]);

    const customerFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.Customer && f.customer) || [];
    }, [favorites]);

    const manuelBarberFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.ManuelBarber && f.manuelBarber) || [];
    }, [favorites]);

    const allFavorites = useMemo(() => {
        return [...storeFavorites, ...freeBarberFavorites, ...customerFavorites, ...manuelBarberFavorites];
    }, [storeFavorites, freeBarberFavorites, customerFavorites, manuelBarberFavorites]);

    // Tip etiketi için fonksiyon
    const getTargetTypeLabel = useCallback((targetType: FavoriteTargetType) => {
        switch (targetType) {
            case FavoriteTargetType.Store:
                return 'Dükkan';
            case FavoriteTargetType.FreeBarber:
                return 'Serbest Berber';
            case FavoriteTargetType.Customer:
                return 'Müşteri';
            case FavoriteTargetType.ManuelBarber:
                return 'Manuel Berber';
            default:
                return 'Bilinmeyen';
        }
    }, []);

    const renderItem = useCallback(({ item }: { item: FavoriteGetDto }) => {
        const typeLabel = getTargetTypeLabel(item.targetType);

        if (item.targetType === FavoriteTargetType.Store && item.store) {
            return (
                <View>
                    <View className="flex-row items-center mb-2 px-1">
                        <View className="bg-blue-500 px-2 py-1 rounded-lg">
                            <Text className="text-white text-xs font-ibm-plex-sans-medium">{typeLabel}</Text>
                        </View>
                    </View>
                    <StoreCardInner
                        store={item.store}
                        isList={true}
                        expanded={true}
                        cardWidthStore={cardWidthStore}
                        onPressUpdate={goStoreDetail}
                    />
                </View>
            );
        } else if (item.targetType === FavoriteTargetType.FreeBarber && item.freeBarber) {
            return (
                <View>
                    <View className="flex-row items-center mb-2 px-1">
                        <View className="bg-green-500 px-2 py-1 rounded-lg">
                            <Text className="text-white text-xs font-ibm-plex-sans-medium">{typeLabel}</Text>
                        </View>
                    </View>
                    <FreeBarberCardInner
                        freeBarber={item.freeBarber}
                        isList={true}
                        expanded={true}
                        cardWidthFreeBarber={cardWidthFreeBarber}
                        onPressUpdate={goFreeBarberDetail}
                    />
                </View>
            );
        } else if (item.targetType === FavoriteTargetType.Customer && item.customer) {
            return (
                <View className="bg-[#202123] rounded-lg p-4 mb-4">
                    <View className="flex-row items-center mb-2">
                        <View className="bg-purple-500 px-2 py-1 rounded-lg mr-2">
                            <Text className="text-white text-xs font-ibm-plex-sans-medium">{typeLabel}</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        {item.customer.imageUrl ? (
                            <Image source={{ uri: item.customer.imageUrl }} className="w-12 h-12 rounded-full mr-3" />
                        ) : (
                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-3 items-center justify-center">
                                <Icon source="account" size={24} color="#6b7280" />
                            </View>
                        )}
                        <View className="flex-1">
                            <Text className="text-white text-base font-ibm-plex-sans-semibold">
                                {item.customer.firstName} {item.customer.lastName}
                            </Text>
                        </View>
                    </View>
                </View>
            );
        } else if (item.targetType === FavoriteTargetType.ManuelBarber && item.manuelBarber) {
            return (
                <View className="bg-[#202123] rounded-lg p-4 mb-4">
                    <View className="flex-row items-center mb-2">
                        <View className="bg-orange-500 px-2 py-1 rounded-lg mr-2">
                            <Text className="text-white text-xs font-ibm-plex-sans-medium">{typeLabel}</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        {item.manuelBarber.imageUrl ? (
                            <Image source={{ uri: item.manuelBarber.imageUrl }} className="w-12 h-12 rounded-full mr-3" />
                        ) : (
                            <View className="w-12 h-12 rounded-full bg-[#2a2c30] mr-3 items-center justify-center">
                                <Icon source="account" size={24} color="#6b7280" />
                            </View>
                        )}
                        <View className="flex-1">
                            <Text className="text-white text-base font-ibm-plex-sans-semibold">
                                {item.manuelBarber.fullName}
                            </Text>
                        </View>
                    </View>
                </View>
            );
        }
        return null;
    }, [cardWidthStore, cardWidthFreeBarber, goStoreDetail, goFreeBarberDetail, getTargetTypeLabel]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#151618] justify-center items-center">
                <ActivityIndicator size="large" color="#f05e23" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#151618]">
            <FlatList
                data={allFavorites}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 10 }}
                ListEmptyComponent={
                    <View className="items-center justify-center mt-20 p-5">
                        <Icon source="heart-outline" size={48} color="#2a2c30" />
                        <Text className="text-[#6b7280] mt-4 text-center">
                            Henüz favori eklemediniz.
                        </Text>
                        <Text className="text-[#6b7280] mt-2 text-center text-sm">
                            Beğendiğiniz dükkanları ve berberleri favorilerinize ekleyebilirsiniz.
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

export default Index;
