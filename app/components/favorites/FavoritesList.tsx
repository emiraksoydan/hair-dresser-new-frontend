import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, Dimensions, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Text } from '../common/Text';
import { LegendList } from '@legendapp/list';
import { useGetMyFavoritesQuery, useGetMeQuery, useGetMineStoresQuery, useGetFreeBarberMinePanelQuery, useGetSettingQuery } from '../../store/api';
import { FavoriteGetDto, FavoriteTargetType } from '../../types';
import { StoreCardInner } from '../store/storecard';
import { FreeBarberCardInner } from '../freebarber/freebarbercard';
import { CustomerCardInner } from '../customer/customercard';
import { ManuelBarberCardInner } from '../manuelbarber/manuelbarbercard';
import { useRouter } from 'expo-router';
import { BarberStoreGetDto, FreeBarGetDto, UserFavoriteDto, ManuelBarberFavoriteDto } from '../../types';
import { Icon } from 'react-native-paper';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { RatingsBottomSheet } from '../rating/ratingsbottomsheet';
import { useBottomSheet } from '../../hook/useBottomSheet';
import { LottieViewComponent } from '../common/lottieview';
import { resolveApiErrorMessage } from '../../utils/common/error';
import FormStoreUpdate from '../store/formstoreupdate';
import { FormFreeBarberOperation } from '../freebarber/formfreebarberoper';
import { SkeletonComponent } from '../common/skeleton';

type FavoritesListProps = {
    mode?: 'store' | 'customer' | 'freebarber';
};

const FavoritesList: React.FC<FavoritesListProps> = ({ mode = 'store' }) => {
    const { data: favorites, isLoading, refetch, isFetching, error, isError } = useGetMyFavoritesQuery();
    const { data: currentUser } = useGetMeQuery();
    // Favoriler listesinde hem store hem freeBarber olabileceği için her zaman query'leri çalıştır
    const { data: myStores = [] } = useGetMineStoresQuery();
    const { data: myFreeBarber } = useGetFreeBarberMinePanelQuery();
    const { data: settingData } = useGetSettingQuery();
    const router = useRouter();

    // Bottom sheet hooks
    const ratingsSheet = useBottomSheet({
        snapPoints: ["50%", "85%"],
        enablePanDownToClose: true,
    });
    const updateStoreSheet = useBottomSheet({
        snapPoints: ["100%"],
        enablePanDownToClose: true,
    });
    const updateFreeBarberSheet = useBottomSheet({
        snapPoints: ["100%"],
        enablePanDownToClose: true,
    });

    const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{ targetId: string; targetName: string } | null>(null);
    const [selectedStoreForUpdate, setSelectedStoreForUpdate] = useState<BarberStoreGetDto | null>(null);

    const screenWidth = Dimensions.get("window").width;
    const cardWidth = screenWidth * 0.92;

    // Kullanıcının kendi store ID'lerini al
    const myStoreIds = useMemo(() => {
        return new Set(myStores.map(s => s.id));
    }, [myStores]);

    // Kullanıcının kendi freeBarber user ID'sini al
    const myFreeBarberUserId = useMemo(() => {
        return currentUser?.data?.id;
    }, [currentUser]);

    const goStoreDetail = useCallback((store: BarberStoreGetDto) => {
        // Eğer kullanıcının kendi store'u ise update sheet'e yönlendir
        if (myStoreIds.has(store.id)) {
            setSelectedStoreForUpdate(store);
            setTimeout(() => {
                updateStoreSheet.present();
            }, 100);
            return;
        }

        router.push({
            pathname: "/store/[storeId]",
            params: { storeId: store.id, mode: mode },
        });
    }, [router, mode, myStoreIds, updateStoreSheet]);

    const goFreeBarberDetail = useCallback((freeBarber: FreeBarGetDto) => {
        // Eğer kullanıcının kendi freeBarber paneli ise update sheet'e yönlendir
        if (freeBarber.freeBarberUserId && myFreeBarberUserId && freeBarber.freeBarberUserId === myFreeBarberUserId) {
            setTimeout(() => {
                updateFreeBarberSheet.present();
            }, 100);
            return;
        }

        router.push({
            pathname: "/freebarber/[freeBarberId]",
            params: { freeBarberId: freeBarber.id },
        });
    }, [router, myFreeBarberUserId, updateFreeBarberSheet]);





    const handlePressRatings = useCallback((targetId: string, targetName: string) => {
        setSelectedRatingsTarget({ targetId, targetName });
        // Sheet'i açmak için küçük bir gecikme ekle
        setTimeout(() => {
            ratingsSheet.present();
        }, 100);
    }, [ratingsSheet]);

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
                    showImageAnimation={settingData?.data?.showImageAnimation ?? true}
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
                    showImageAnimation={settingData?.data?.showImageAnimation ?? true}
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
                />
            );
        }
        return null;
    }, [cardWidth, goStoreDetail, goFreeBarberDetail, getTargetTypeLabel, getTargetTypeColor, mode, handlePressRatings, settingData]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-[#151618] justify-center items-center">
                <ActivityIndicator size="large" color="#f05e23" />
            </View>
        );
    }

    // Network/Server error durumu - öncelikli göster
    if (isError && error) {
        const errorMessage = resolveApiErrorMessage(error);

        return (
            <View className="flex-1 bg-[#151618]">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isFetching && !isLoading}
                            onRefresh={refetch}
                            tintColor="#f05e23"
                        />
                    }
                >
                    <LottieViewComponent
                        animationSource={require('../../../assets/animations/error.json')}
                        message={errorMessage}
                    />
                </ScrollView>
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
                ref={ratingsSheet.ref}
                snapPoints={ratingsSheet.snapPoints}
                enablePanDownToClose={ratingsSheet.enablePanDownToClose}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={ratingsSheet.makeBackdrop()}
                onChange={(index) => {
                    ratingsSheet.handleChange(index);
                    if (index < 0) {
                        setSelectedRatingsTarget(null);
                    }
                }}
            >
                {selectedRatingsTarget ? (
                    <RatingsBottomSheet
                        targetId={selectedRatingsTarget.targetId}
                        targetName={selectedRatingsTarget.targetName}
                        onClose={() => {
                            setSelectedRatingsTarget(null);
                            ratingsSheet.dismiss();
                        }}
                    />
                ) : (
                    <View className="flex-1 pt-4">
                        <SkeletonComponent />
                    </View>
                )}
            </BottomSheetModal>

            {/* Store Update Bottom Sheet */}
            <BottomSheetModal
                ref={updateStoreSheet.ref}
                snapPoints={updateStoreSheet.snapPoints}
                enablePanDownToClose={updateStoreSheet.enablePanDownToClose}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={updateStoreSheet.makeBackdrop()}
                onChange={(index) => {
                    updateStoreSheet.handleChange(index);
                    if (index < 0) {
                        setSelectedStoreForUpdate(null);
                        // RTK Query otomatik olarak cache'i güncelleyecek
                    }
                }}
            >
                <BottomSheetView className="h-full pt-2">
                    {selectedStoreForUpdate && (
                        <FormStoreUpdate
                            storeId={selectedStoreForUpdate.id}
                            enabled={updateStoreSheet.isOpen}
                            onClose={() => {
                                updateStoreSheet.dismiss();
                                setSelectedStoreForUpdate(null);
                            }}
                        />
                    )}
                </BottomSheetView>
            </BottomSheetModal>

            {/* FreeBarber Update Bottom Sheet */}
            <BottomSheetModal
                ref={updateFreeBarberSheet.ref}
                snapPoints={updateFreeBarberSheet.snapPoints}
                enablePanDownToClose={updateFreeBarberSheet.enablePanDownToClose}
                handleIndicatorStyle={{ backgroundColor: "#47494e" }}
                backgroundStyle={{ backgroundColor: "#151618" }}
                backdropComponent={updateFreeBarberSheet.makeBackdrop()}
                onChange={(index) => {
                    updateFreeBarberSheet.handleChange(index);
                    if (index < 0) {
                        // RTK Query otomatik olarak cache'i güncelleyecek
                    }
                }}
            >
                <BottomSheetView className="h-full pt-2">
                    {myFreeBarber && updateFreeBarberSheet.isOpen && (
                        <FormFreeBarberOperation
                            freeBarberId={myFreeBarber.id}
                            enabled={true}
                            onClose={() => {
                                updateFreeBarberSheet.dismiss();
                            }}
                        />
                    )}
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    );
};

export default FavoritesList;





