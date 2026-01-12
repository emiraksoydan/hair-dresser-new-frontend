/**
 * Yan panel filter drawer component
 * Soldan açılır, hem swipe hem de buton ile kontrol edilebilir
 */

import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions, Modal, StyleSheet } from 'react-native';
import { Text } from './Text';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Chip, Divider, Icon, TextInput } from 'react-native-paper';
import { MultiSelect } from 'react-native-element-dropdown';
import { useGetParentCategoriesQuery, useLazyGetChildCategoriesQuery } from '../../store/api';
import { useLanguage } from '../../hook/useLanguage';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.85;

interface FilterDrawerProps {
    visible: boolean;
    onClose: () => void;

    // Tür seçimi (Free Barber / Dükkan / Hepsi)
    selectedUserType: string;
    onChangeUserType: (type: string) => void;
    showUserTypeFilter?: boolean; // Kullanıcı türü filtresini göster/gizle

    // Ana Kategori seçimi (Saç Kesimi / Saç Boyama / Güzellik Salonu / Hepsi)
    selectedMainCategory: string;
    onChangeMainCategory: (category: string) => void;

    // Hizmet seçimi (çoklu)
    selectedServices: string[];
    onChangeServices: (services: string[]) => void;

    // Fiyat seçimi
    priceSort: 'none' | 'asc' | 'desc';
    onChangePriceSort: (sort: 'none' | 'asc' | 'desc') => void;
    minPrice: string;
    maxPrice: string;
    onChangeMinPrice: (price: string) => void;
    onChangeMaxPrice: (price: string) => void;

    // Free barberler için dükkan fiyatlandırma türü
    showPricingType?: boolean;
    selectedPricingType: string; // 'Hepsi' | 'Kiralama' | 'Yüzdelik'
    onChangePricingType: (type: string) => void;

    // Müsaitlik durumu
    availabilityFilter: 'all' | 'available' | 'unavailable';
    onChangeAvailability: (filter: 'all' | 'available' | 'unavailable') => void;

    // Puanlama filtresi
    selectedRating: number; // 0 = Hepsi, 1-5 = yıldız sayısı
    onChangeRating: (rating: number) => void;

    // Favori filtresi
    showFavoritesOnly: boolean;
    onChangeFavoritesOnly: (value: boolean) => void;

    // Aksiyon butonları
    onApplyFilters: () => void;
    onClearFilters: () => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
    visible,
    onClose,
    selectedUserType,
    onChangeUserType,
    showUserTypeFilter = true,
    selectedMainCategory,
    onChangeMainCategory,
    selectedServices,
    onChangeServices,
    priceSort,
    onChangePriceSort,
    minPrice,
    maxPrice,
    onChangeMinPrice,
    onChangeMaxPrice,
    showPricingType = false,
    selectedPricingType,
    onChangePricingType,
    availabilityFilter,
    onChangeAvailability,
    selectedRating,
    onChangeRating,
    showFavoritesOnly,
    onChangeFavoritesOnly,
    onApplyFilters,
    onClearFilters,
}) => {
    const { t } = useLanguage();
    const translateX = useSharedValue(-DRAWER_WIDTH);

    // Category API hooks
    const { data: parentCategoriesRaw = [] } = useGetParentCategoriesQuery();
    const [triggerGetChildCategories, { data: childCategories = [] }] = useLazyGetChildCategoriesQuery();
    
    // Duplicate kategorileri filtrele (name bazında)
    const parentCategories = React.useMemo(() => {
        const seen = new Set<string>();
        return parentCategoriesRaw.filter((cat: any) => {
            if (seen.has(cat.name)) return false;
            seen.add(cat.name);
            return true;
        });
    }, [parentCategoriesRaw]);

    // Ana kategori değişince alt kategorileri yükle
    useEffect(() => {
        if (selectedMainCategory && selectedMainCategory !== t('filters.all')) {
            const parentCat = parentCategories.find((cat: any) => cat.name === selectedMainCategory);
            if (parentCat) {
                triggerGetChildCategories(parentCat.id);
            }
        }
    }, [selectedMainCategory, parentCategories, triggerGetChildCategories, t]);

    // Hizmet seçenekleri
    const serviceOptions = React.useMemo(() => {
        if (!selectedMainCategory || selectedMainCategory === t('filters.all')) return [];
        return childCategories.map((cat: any) => ({ label: cat.name, value: cat.id }));
    }, [childCategories, selectedMainCategory, t]);

    // Drawer açma/kapama animasyonu
    useEffect(() => {
        if (visible) {
            translateX.value = withTiming(0, { duration: 300 });
        } else {
            translateX.value = withTiming(-DRAWER_WIDTH, { duration: 300 });
        }
    }, [visible]);

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: visible ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 300 }),
    }));

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            if (event.translationX < -DRAWER_WIDTH / 3 || event.velocityX < -500) {
                translateX.value = withTiming(-DRAWER_WIDTH, { duration: 300 });
                runOnJS(onClose)();
            } else {
                translateX.value = withTiming(0, { duration: 300 });
            }
        });

    const userTypes = [t('filters.all'), t('labels.freeBarber'), t('labels.store')];
    const mainCategories = React.useMemo(() => {
        // Kullanıcı türü "Serbest Berber" ise Güzellik Salonu'nu gizle
        let categories = parentCategories.map((cat: any) => cat.name);
        
        if (selectedUserType === t('labels.freeBarber')) {
            // Güzellik Salonu kategorisini filtrele (kategori adı dinamik olabilir)
            categories = categories.filter((cat: string) => cat !== "Güzellik Salonu");
        }
        
        // "Hepsi" ve filtrelenmiş kategorileri birleştir, duplicate'leri kaldır
        const allCategories = [t('filters.all'), ...categories];
        return Array.from(new Set(allCategories)); // Duplicate'leri kaldır
    }, [parentCategories, selectedUserType, t]);
    const pricingTypes = [t('filters.all'), t('filters.rental'), t('filters.percentage')];
    const availabilityOptions = [
        { label: t('filters.all'), value: 'all' },
        { label: t('filters.available'), value: 'available' },
        { label: t('filters.unavailable'), value: 'unavailable' },
    ];
    const ratingOptions = [
        { label: t('filters.all'), value: 0 },
        { label: '⭐ 1+', value: 1 },
        { label: '⭐ 2+', value: 2 },
        { label: '⭐ 3+', value: 3 },
        { label: '⭐ 4+', value: 4 },
        { label: '⭐ 5', value: 5 },
    ];
    const favoriteOptions = [
        { label: t('filters.all'), value: false },
        { label: t('filters.onlyFavorites'), value: true },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        activeOpacity={1}
                        onPress={onClose}
                    />
                </Animated.View>

                {/* Drawer */}
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.drawer, drawerStyle]}>
                        {/* Header */}
                        <View className="flex-row items-center justify-between p-4 border-b border-gray-700">
                            <Text className="text-white text-xl font-century-gothic-bold">Filtreler</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Icon source="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <ScrollView
                            className="flex-1 px-4"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
                        >
                            {/* Kullanıcı Türü - Horizontal ScrollView */}
                            {showUserTypeFilter && (
                                <>
                                    <Text className="text-white text-base font-century-gothic-bold mb-2">
                                        {t('filters.userType')}
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        className="mb-4"
                                        contentContainerStyle={{ gap: 8 }}
                                    >
                                        {userTypes.map((type) => {
                                            const isSelected = selectedUserType === type;
                                            return (
                                                <TouchableOpacity
                                                    key={type}
                                                    onPress={() => onChangeUserType(type)}
                                                    className={`px-4 py-2 rounded-full border ${
                                                        isSelected ? 'bg-[#f05e23] border-[#f05e23]' : 'border-gray-600'
                                                    }`}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                                        {type}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>

                                    <Divider style={{ backgroundColor: '#47494e', marginBottom: 16 }} />
                                </>
                            )}

                            {/* Ana Kategori - Horizontal ScrollView */}
                            <Text className="text-white text-base font-century-gothic-bold mb-2">
                                {t('filters.mainCategory')}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="mb-4"
                                contentContainerStyle={{ gap: 8 }}
                            >
                                    {mainCategories.map((category, index) => {
                                    const isSelected = selectedMainCategory === category;
                                    // "Hepsi" için özel key, diğerleri için index kullan (unique garantisi için)
                                    const uniqueKey = category === t('filters.all') ? 'category-all' : `category-${index}-${category}`;
                                    
                                    return (
                                        <TouchableOpacity
                                            key={uniqueKey}
                                            onPress={() => onChangeMainCategory(category)}
                                            className={`px-4 py-2 rounded-full border ${
                                                isSelected ? 'bg-[#f05e23] border-[#f05e23]' : 'border-gray-600'
                                            }`}
                                            activeOpacity={0.7}
                                        >
                                            <Text className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                                {category}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <Divider style={{ backgroundColor: '#47494e', marginBottom: 16 }} />

                            {/* Hizmetler - MultiSelect Dropdown */}
                            {serviceOptions.length > 0 && (
                                <>
                                    <Text className="text-white text-base font-century-gothic-bold mb-2">
                                        {t('filters.services')}
                                    </Text>
                                    <MultiSelect
                                        data={serviceOptions}
                                        labelField="label"
                                        valueField="value"
                                        value={selectedServices}
                                        onChange={onChangeServices}
                                        placeholder={t('filters.selectService')}
                                        search
                                        searchPlaceholder={t('common.search')}
                                        dropdownPosition="auto"
                                        inside
                                        alwaysRenderSelectedItem
                                        visibleSelectedItem
                                        style={{
                                            backgroundColor: "#1F2937",
                                            borderColor: "#444",
                                            borderWidth: 1,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            marginBottom: 16,
                                        }}
                                        containerStyle={{
                                            backgroundColor: "#1F2937",
                                            borderWidth: 1,
                                            borderColor: '#444',
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                        }}
                                        placeholderStyle={{ color: "gray", fontSize: 14 }}
                                        selectedTextStyle={{ color: "white", fontSize: 14 }}
                                        itemTextStyle={{ color: "white", fontSize: 14 }}
                                        inputSearchStyle={{ color: "white", fontSize: 14 }}
                                        activeColor="#0f766e"
                                        selectedStyle={{
                                            borderRadius: 8,
                                            backgroundColor: "#374151",
                                            borderColor: "#0f766e",
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            margin: 2,
                                        }}
                                        selectedTextProps={{ numberOfLines: 1 }}
                                    />
                                    <Divider style={{ backgroundColor: '#47494e', marginBottom: 16 }} />
                                </>
                            )}

                            {/* Fiyatlandırma Türü (FreeBarber/Dükkan için) */}
                            {showPricingType && (
                                <>
                                    <Text className="text-white text-base font-century-gothic-bold mb-2">
                                        {t('filters.pricingType')}
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        className="mb-4"
                                        contentContainerStyle={{ gap: 8 }}
                                    >
                                        {pricingTypes.map((type) => {
                                            const isSelected = selectedPricingType === type;
                                            return (
                                                <TouchableOpacity
                                                    key={type}
                                                    onPress={() => onChangePricingType(type)}
                                                    className={`px-4 py-2 rounded-full border ${
                                                        isSelected ? 'bg-[#f05e23] border-[#f05e23]' : 'border-gray-600'
                                                    }`}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                                        {type}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                    <Divider style={{ backgroundColor: '#47494e', marginBottom: 16 }} />
                                </>
                            )}

                            {/* Fiyat Sıralaması */}
                            <Text className="text-white text-base font-century-gothic-bold mb-2">
                                {t('filters.priceSort')}
                            </Text>
                            <View className="flex-row gap-2 mb-4">
                                <TouchableOpacity
                                    onPress={() => onChangePriceSort('asc')}
                                    className={`flex-1 flex-row items-center justify-center px-3 py-2 rounded-lg border ${
                                        priceSort === 'asc' ? 'bg-[#f05e23] border-[#f05e23]' : 'border-gray-600'
                                    }`}
                                    activeOpacity={0.7}
                                >
                                    <Icon source="arrow-up" size={16} color={priceSort === 'asc' ? 'white' : '#d1d5db'} />
                                    <Text className={`text-sm ml-1 ${priceSort === 'asc' ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                        {t('filters.lowest')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => onChangePriceSort('desc')}
                                    className={`flex-1 flex-row items-center justify-center px-3 py-2 rounded-lg border ${
                                        priceSort === 'desc' ? 'bg-[#f05e23] border-[#f05e23]' : 'border-gray-600'
                                    }`}
                                    activeOpacity={0.7}
                                >
                                    <Icon source="arrow-down" size={16} color={priceSort === 'desc' ? 'white' : '#d1d5db'} />
                                    <Text className={`text-sm ml-1 ${priceSort === 'desc' ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                        {t('filters.highest')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Divider style={{ backgroundColor: '#47494e', marginBottom: 16 }} />

                            {/* Fiyat Aralığı */}
                            <Text className="text-white text-base font-century-gothic-bold mb-2">
                                {t('filters.priceRange')}
                            </Text>
                            <View className="flex-row items-center gap-3 mb-4">
                                <View className="flex-1">
                                    <TextInput
                                        label={t('filters.minPrice')}
                                        mode="outlined"
                                        dense
                                        keyboardType="numeric"
                                        value={minPrice}
                                        onChangeText={(text) => {
                                            const cleaned = text.replace(/[^\d]/g, '');
                                            onChangeMinPrice(cleaned);
                                        }}
                                        placeholder="0"
                                        textColor="white"
                                        outlineColor="#444"
                                        theme={{
                                            roundness: 10,
                                            colors: { onSurfaceVariant: "gray", primary: "white" }
                                        }}
                                        style={{ backgroundColor: '#1F2937', borderWidth: 0 }}
                                    />
                                </View>
                                <Text className="text-gray-500 mt-2">-</Text>
                                <View className="flex-1">
                                    <TextInput
                                        label={t('filters.maxPrice')}
                                        mode="outlined"
                                        dense
                                        keyboardType="numeric"
                                        value={maxPrice}
                                        onChangeText={(text) => {
                                            const cleaned = text.replace(/[^\d]/g, '');
                                            onChangeMaxPrice(cleaned);
                                        }}
                                        placeholder="∞"
                                        textColor="white"
                                        outlineColor="#444"
                                        theme={{
                                            roundness: 10,
                                            colors: { onSurfaceVariant: "gray", primary: "white" }
                                        }}
                                        style={{ backgroundColor: '#1F2937', borderWidth: 0 }}
                                    />
                                </View>
                            </View>

                            <Divider style={{ backgroundColor: '#47494e', marginBottom: 16 }} />

                            {/* Müsaitlik Durumu - Horizontal ScrollView */}
                            <Text className="text-white text-base font-century-gothic-bold mb-2">
                                {t('filters.availability')}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="mb-4"
                                contentContainerStyle={{ gap: 8 }}
                            >
                                {availabilityOptions.map((option) => {
                                    const isSelected = availabilityFilter === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() => onChangeAvailability(option.value as any)}
                                            className={`px-4 py-2 rounded-full border ${
                                                isSelected ? 'bg-[#f05e23] border-[#f05e23]' : 'border-gray-600'
                                            }`}
                                            activeOpacity={0.7}
                                        >
                                            <Text className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <Divider style={{ backgroundColor: '#47494e', marginBottom: 16 }} />

                            {/* Puanlama Filtresi - Horizontal ScrollView */}
                            <Text className="text-white text-base font-century-gothic-bold mb-2">
                                {t('filters.minimumRating')}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="mb-4"
                                contentContainerStyle={{ gap: 8 }}
                            >
                                {ratingOptions.map((option) => {
                                    const isSelected = selectedRating === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() => onChangeRating(option.value)}
                                            className={`px-4 py-2 rounded-full border ${
                                                isSelected ? 'bg-[#f05e23] border-[#f05e23]' : 'border-gray-600'
                                            }`}
                                            activeOpacity={0.7}
                                        >
                                            <Text className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <Divider style={{ backgroundColor: '#47494e', marginBottom: 16 }} />

                            {/* Favori Filtresi - Horizontal ScrollView */}
                            <Text className="text-white text-base font-century-gothic-bold mb-2">
                                {t('filters.favoriteFilter')}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="mb-4"
                                contentContainerStyle={{ gap: 8 }}
                            >
                                {favoriteOptions.map((option) => {
                                    const isSelected = showFavoritesOnly === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={String(option.value)}
                                            onPress={() => onChangeFavoritesOnly(option.value)}
                                            className={`px-4 py-2 rounded-full border ${
                                                isSelected ? 'bg-[#f05e23] border-[#f05e23]' : 'border-gray-600'
                                            }`}
                                            activeOpacity={0.7}
                                        >
                                            <Text className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </ScrollView>

                        {/* Footer Buttons */}
                        <View className="px-4 py-3 flex-row border-t border-gray-700 gap-3">
                            <TouchableOpacity
                                onPress={onApplyFilters}
                                className="flex-1 bg-[#f05e23] rounded-lg py-2.5 items-center justify-center"
                                activeOpacity={0.8}
                            >
                                <Text className="text-white text-sm font-semibold">{t('filters.apply')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onClearFilters}
                                className="flex-1 border border-[#f05e23] rounded-lg py-2.5 items-center justify-center"
                                activeOpacity={0.8}
                            >
                                <Text className="text-[#f05e23] text-sm font-semibold">{t('filters.clear')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </GestureDetector>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    backdropTouchable: {
        flex: 1,
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: '#202123',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 16,
    },
});
