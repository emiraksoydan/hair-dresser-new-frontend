/**
 * Filter types that match backend FilterRequestDto structure exactly
 */

export interface FilterRequestDto {
  // Konum bilgileri (nearby için)
  latitude?: number;
  longitude?: number;
  distanceKm?: number; // km - default 1.0

  // Arama
  searchQuery?: string;

  // Kullanıcı türü filtresi
  userType?: string; // "Hepsi", "Serbest Berber", "Dükkan"

  // Ana kategori filtresi (BarberType)
  mainCategory?: number; // BarberType enum as number, null = Hepsi

  // Hizmet filtresi (CategoryId listesi)
  serviceIds?: string[];

  // Fiyat filtresi
  priceSort?: string; // "none", "asc", "desc"
  minPrice?: number;
  maxPrice?: number;

  // Pricing Type (Store için)
  pricingType?: string; // "all", "rent", "percent"

  // Müsaitlik (FreeBarber için)
  isAvailable?: boolean;

  // Açık/Kapalı durumu (Store için)
  isOpenNow?: boolean;

  // Puanlama
  minRating?: number; // 0-5

  // Favoriler
  favoritesOnly?: boolean;

  // Kullanıcı ID (favoriler ve diğer kullanıcıya özel filtreler için)
  currentUserId?: string;
}

// Frontend filter criteria (user-friendly names)
export interface FilterCriteria {
  searchQuery: string;
  userType: string;
  mainCategory?: string;
  services: string[];
  priceSort: "none" | "low-to-high" | "high-to-low";
  minPrice: string;
  maxPrice: string;
  pricingType: string;
  availability?: "all" | "available" | "unavailable";
  isOpenNow?: boolean;
  rating: number;
  favoritesOnly: boolean;
}

// Default filter values
export const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  searchQuery: "",
  userType: "Hepsi",
  mainCategory: undefined,
  services: [],
  priceSort: "none",
  minPrice: "",
  maxPrice: "",
  pricingType: "Hepsi",
  availability: "all",
  isOpenNow: undefined,
  rating: 0,
  favoritesOnly: false,
};

// Helper function to convert frontend criteria to backend DTO
export const toFilterRequestDto = (
  criteria: FilterCriteria,
  location?: { latitude: number; longitude: number },
  currentUserId?: string,
): FilterRequestDto => {
  return {
    // Location
    latitude: location?.latitude,
    longitude: location?.longitude,
    distanceKm: 1.0,

    // Search
    searchQuery: criteria.searchQuery || undefined,

    // User type
    userType: criteria.userType,

    // Category (convert string to enum number if needed)
    mainCategory: criteria.mainCategory
      ? parseInt(criteria.mainCategory)
      : undefined,

    // Services
    serviceIds: criteria.services.length > 0 ? criteria.services : undefined,

    // Price
    priceSort:
      criteria.priceSort === "none"
        ? undefined
        : criteria.priceSort === "low-to-high"
          ? "asc"
          : "desc",
    minPrice: criteria.minPrice ? parseFloat(criteria.minPrice) : undefined,
    maxPrice: criteria.maxPrice ? parseFloat(criteria.maxPrice) : undefined,

    // Pricing type
    pricingType:
      criteria.pricingType === "Hepsi" ? undefined : criteria.pricingType,

    // Availability
    isAvailable:
      criteria.availability === "all"
        ? undefined
        : criteria.availability === "available"
          ? true
          : false,
    isOpenNow: criteria.isOpenNow,

    // Rating
    minRating: criteria.rating > 0 ? criteria.rating : undefined,

    // Favorites
    favoritesOnly: criteria.favoritesOnly || undefined,

    // User ID
    currentUserId: currentUserId || undefined,
  };
};
