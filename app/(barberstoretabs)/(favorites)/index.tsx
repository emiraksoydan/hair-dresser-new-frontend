import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Dimensions, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetMyFavoritesQuery } from '../../store/api';
import { FavoriteGetDto, FavoriteTargetType } from '../../types';
import { StoreCardInner } from '../../components/store/storecard';
import { FreeBarberCardInner } from '../../components/freebarber/freebarbercard';
import { useRouter } from 'expo-router';
import { BarberStoreGetDto, FreeBarGetDto } from '../../types';
import { Icon } from 'react-native-paper';

const Index = () => {
    const insets = useSafeAreaInsets();
    const { data: favorites, isLoading, refetch, isFetching } = useGetMyFavoritesQuery();
    const router = useRouter();
    const [expanded, setExpanded] = useState(true);
    const [isList, setIsList] = useState(true);

    const screenWidth = Dimensions.get("window").width;
    const cardWidthStore = useMemo(() => (expanded ? screenWidth * 0.92 : screenWidth * 0.94), [expanded, screenWidth]);
    const cardWidthFreeBarber = useMemo(() => (expanded ? screenWidth * 0.92 : screenWidth * 0.94), [expanded, screenWidth]);

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

    // Store ve FreeBarber favorilerini ayır
    const storeFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.Store && f.store) || [];
    }, [favorites]);

    const freeBarberFavorites = useMemo(() => {
        return favorites?.filter(f => f.targetType === FavoriteTargetType.FreeBarber && f.freeBarber) || [];
    }, [favorites]);

    const allFavorites = useMemo(() => {
        return [...storeFavorites, ...freeBarberFavorites];
    }, [storeFavorites, freeBarberFavorites]);

    const renderItem = useCallback(({ item }: { item: FavoriteGetDto }) => {
        if (item.targetType === FavoriteTargetType.Store && item.store) {
            return (
                <StoreCardInner
                    store={item.store}
                    isList={isList}
                    expanded={expanded}
                    cardWidthStore={cardWidthStore}
                    onPressUpdate={goStoreDetail}
                />
            );
        } else if (item.targetType === FavoriteTargetType.FreeBarber && item.freeBarber) {
            return (
                <FreeBarberCardInner
                    freeBarber={item.freeBarber}
                    isList={isList}
                    expanded={expanded}
                    cardWidthFreeBarber={cardWidthFreeBarber}
                    onPressUpdate={goFreeBarberDetail}
                />
            );
        }
        return null;
    }, [isList, expanded, cardWidthStore, cardWidthFreeBarber, goStoreDetail, goFreeBarberDetail]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#151618] justify-center items-center" style={{ paddingTop: insets.top }}>
                <ActivityIndicator size="large" color="#f05e23" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#151618]" style={{ paddingTop: insets.top }}>
            <FlatList
                data={allFavorites}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 10 }}
                refreshControl={
                    <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#f05e23" />
                }
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
