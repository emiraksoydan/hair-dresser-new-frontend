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
    isAvailable?: boolean;
    minRating?: number;
    favoritesOnly?: boolean;
    pageNumber?: number;
    pageSize?: number;
}
