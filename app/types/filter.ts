import { BarberType } from './index';

export interface FilterRequestDto {
    latitude?: number;
    longitude?: number;
    distance?: number;
    searchQuery?: string;
    mainCategory?: BarberType;
    serviceIds?: string[];
    minPrice?: number;
    maxPrice?: number;
    priceSort?: 'asc' | 'desc';
    pricingType?: string;
    isAvailable?: boolean; // FreeBarber için
    isOpenNow?: boolean; // Store için
    minRating?: number;
    favoritesOnly?: boolean;
    currentUserId?: string;
}
