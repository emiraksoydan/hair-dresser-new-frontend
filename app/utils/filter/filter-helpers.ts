/**
 * Filter helper utilities
 * Centralized filter logic for consistency
 */

import { AppliedFilters } from '../../hook/usePanelFilters';
import { BarberType } from '../../types/common';

/**
 * Checks if any filter is active (not default values)
 */
export const hasActiveFilters = (filters: AppliedFilters, searchQuery?: string): boolean => {
    if (searchQuery && searchQuery.trim().length > 0) return true;
    
    return (
        filters.userType !== "Hepsi" ||
        filters.mainCategory !== "Hepsi" ||
        filters.services.length > 0 ||
        filters.priceSort !== "none" ||
        filters.minPrice !== "" ||
        filters.maxPrice !== "" ||
        filters.pricingType !== "Hepsi" ||
        filters.availability !== "all" ||
        filters.rating > 0 ||
        filters.favoritesOnly
    );
};

/**
 * Checks if user type filter should show stores
 */
export const shouldShowStores = (userType: string): boolean => {
    return userType === "Hepsi" || userType === "Dükkan";
};

/**
 * Checks if user type filter should show free barbers
 */
export const shouldShowFreeBarbers = (userType: string): boolean => {
    return userType === "Hepsi" || userType === "Serbest Berber";
};

/**
 * Normalizes search query for comparison
 */
export const normalizeSearchQuery = (query: string): string => {
    return query.trim().toLowerCase();
};

/**
 * Maps Turkish category name to BarberType enum
 */
export const mapCategoryToBarberType = (category: string): BarberType | null => {
    if (category === "Hepsi") return null;
    
    const categoryMap: Record<string, BarberType> = {
        "Erkek": BarberType.Male,
        "Kadın": BarberType.Female,
        "Unisex": BarberType.Unisex,
    };
    
    return categoryMap[category] || null;
};

/**
 * Maps pricing type from Turkish to backend format
 */
export const mapPricingType = (pricingType: string): string | null => {
    if (pricingType === "Hepsi") return null;
    
    const pricingMap: Record<string, string> = {
        "Kiralama": "rent",
        "Yüzdelik": "percent",
    };
    
    return pricingMap[pricingType] || null;
};

/**
 * Converts price string to number safely
 */
export const parsePrice = (priceStr: string): number | null => {
    if (!priceStr || priceStr.trim() === "") return null;
    const parsed = parseFloat(priceStr);
    return isNaN(parsed) ? null : parsed;
};

