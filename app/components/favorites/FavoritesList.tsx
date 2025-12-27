import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { LegendList } from '@legendapp/list';
import { useGetMyFavoritesQuery } from '../../store/api';
import { FavoriteGetDto, FavoriteTargetType } from '../../types';
import { StoreCardInner } from '../store/storecard';
import { FreeBarberCardInner } from '../freebarber/freebarbercard';
import { CustomerCardInner } from '../customer/customercard';
import { ManuelBarberCardInner } from '../manuelbarber/manuelbarbercard';
import { useRouter } from 'expo-router';
import { BarberStoreGetDto, FreeBarGetDto, UserFavoriteDto, ManuelBarberFavoriteDto } from '../../types';
import { Icon } from 'react-native-paper';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { RatingsBottomSheet } from '../rating/ratingsbottomsheet';
import { useBottomSheetRegistry, useSheet } from '../../context/bottomsheet';

type FavoritesListProps = {
    mode?: 'store' | 'customer' | 'freebarber';
};

const FavoritesList: React.FC<FavoritesListProps> = ({ mode = 'store' }) => {
    const { data: favorites, isLoading, refetch, isFetching } = useGetMyFavoritesQuery();
    const router = useRouter();
    const { setRef, makeBackdrop } = useBottomSheetRegistry();
    const { present: presentRatings } = useSheet("ratings");
    const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{ targetId: string; targetName: string } | null>(null);

    const screenWidth = Dimensions.get("window").width;
    const cardWidth = screenWidth * 0.92;

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        router.push({
            pathname: "/store/[storeId]",
            params: { storeId: store.id, mode: mode },
        });
    }, [router, mode]);

    const goFreeBarberDetail = useCallback((freeBarber: FreeBarGetDto) => {
        router.push({
            pathname: "/freebarber/[freeBarberId]",
            params: { freeBarberId: freeBarber.id },
        });
    }, [router]);

    const goCustomerDetail = useCallback((customer: UserFavoriteDto) => {
        // Customer detail sayfası varsa buraya eklenebilir
        // router.push({
        //     pathname: "/customer/[customerId]",
        //     params: { customerId: customer.id },
        // });
    }, []);

    const goManuelBarberDetail = useCallback((manuelBarber: ManuelBarberFavoriteDto) => {
        // ManuelBarber detail sayfası varsa buraya eklenebilir
        // router.push({
        //     pathname: "/manuelbarber/[manuelBarberId]",
        //     params: { manuelBarberId: manuelBarber.id },
        // });
    }, []);

    const handlePressRatings = useCallback((targetId: string, targetName: string) => {
        setSelectedRatingsTarget({ targetId, targetName });
        presentRatings();
    }, [presentRatings]);

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

    // Tip rengi için fonksiyon
    const getTargetTypeColor = useCallback((targetType: FavoriteTargetType) => {
        switch (targetType) {
            case FavoriteTargetType.Store:
                return 'bg-blue-500';
            case FavoriteTargetType.FreeBarber:
                return 'bg-green-500';
            case FavoriteTargetType.Customer:
                return 'bg-purple-500';
            case FavoriteTargetType.ManuelBarber:
                return 'bg-orange-500';
            default:
                return 'bg-gray-500';
        }
    }, []);

    const renderItem = useCallback(({ item }: { item: FavoriteGetDto }) => {
        const typeLabel = getTargetTypeLabel(item.targetType);
        const typeLabelColor = getTargetTypeColor(item.targetType);

        if (item.targetType === FavoriteTargetType.Store && item.store) {
            return (
                <StoreCardInner
                    store={item.store}
                    isList={true}
                    expanded={true}
                    cardWidthStore={cardWidth}
                    typeLabel={typeLabel}
                    typeLabelColor={typeLabelColor}
                    onPressUpdate={goStoreDetail}
                    onPressRatings={handlePressRatings}
                    isViewerFromFreeBr={mode === 'freebarber'}
                />
            );
        } else if (item.targetType === FavoriteTargetType.FreeBarber && item.freeBarber) {
            return (
                <FreeBarberCardInner
                    freeBarber={item.freeBarber}
                    isList={true}
                    expanded={true}
                    cardWidthFreeBarber={cardWidth}
                    typeLabel={typeLabel}
                    typeLabelColor={typeLabelColor}
                    onPressUpdate={goFreeBarberDetail}
                    onPressRatings={handlePressRatings}
                />
            );
        } else if (item.targetType === FavoriteTargetType.Customer && item.customer) {
            return (
                <CustomerCardInner
                    customer={item.customer}
                    isList={true}
                    expanded={true}
                    cardWidth={cardWidth}
                    typeLabel={typeLabel}
                    typeLabelColor={typeLabelColor}
                    onPressUpdate={goCustomerDetail}
                    onPressRatings={handlePressRatings}
                />
            );
        } else if (item.targetType === FavoriteTargetType.ManuelBarber && item.manuelBarber) {
            return (
                <ManuelBarberCardInner
                    manuelBarber={item.manuelBarber}
                    isList={true}
                    expanded={true}
                    cardWidth={cardWidth}
                    typeLabel={typeLabel}
                    typeLabelColor={typeLabelColor}
                    onPressUpdate={goManuelBarberDetail}
                />
            );
        }
        return null;
    }, [cardWidth, goStoreDetail, goFreeBarberDetail, goCustomerDetail, goManuelBarberDetail, getTargetTypeLabel, getTargetTypeColor, mode, handlePressRatings]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#151618] justify-center items-center">
                <ActivityIndicator size="large" color="#f05e23" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#151618]">
            <LegendList
                data={allFavorites}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                estimatedItemSize={200}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 10 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={refetch}
                        tintColor="#f05e23"
                    />
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

            {/* Yorumlar Bottom Sheet */}
            <BottomSheetModal
                ref={(inst) => setRef("ratings", inst)}
                snapPoints={["50%", "85%"]}
                enablePanDownToClose={true}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={makeBackdrop({ appearsOnIndex: 0, disappearsOnIndex: -1, pressBehavior: "close" })}
                onChange={(index) => {
                    if (index < 0) {
                        setSelectedRatingsTarget(null);
                    }
                }}
            >
                {selectedRatingsTarget && (
                    <RatingsBottomSheet
                        targetId={selectedRatingsTarget.targetId}
                        targetName={selectedRatingsTarget.targetName}
                        onClose={() => {
                            setSelectedRatingsTarget(null);
                        }}
                    />
                )}
            </BottomSheetModal>
        </View>
    );
};

export default FavoritesList;





