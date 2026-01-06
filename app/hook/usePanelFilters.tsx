import { useCallback, useState, useMemo } from "react";

export type AppliedFilters = {
  userType: string;
  mainCategory: string;
  services: string[];
  priceSort: "none" | "asc" | "desc";
  minPrice: string;
  maxPrice: string;
  pricingType: string;
  availability: "all" | "available" | "unavailable";
  rating: number;
  favoritesOnly: boolean;
};

const DEFAULT_FILTERS: AppliedFilters = {
  userType: "Hepsi",
  mainCategory: "Hepsi",
  services: [],
  priceSort: "none",
  minPrice: "",
  maxPrice: "",
  pricingType: "Hepsi",
  availability: "all",
  rating: 0,
  favoritesOnly: false,
} as const;

/**
 * Optimized filter hook - uses single source of truth (appliedFilters)
 * Individual state setters are derived from appliedFilters for backward compatibility
 */
export const usePanelFilters = () => {
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(DEFAULT_FILTERS);

  // Derived getters for backward compatibility (components can still use individual state)
  const selectedUserType = appliedFilters.userType;
  const selectedMainCategory = appliedFilters.mainCategory;
  const selectedServices = appliedFilters.services;
  const priceSort = appliedFilters.priceSort;
  const minPrice = appliedFilters.minPrice;
  const maxPrice = appliedFilters.maxPrice;
  const selectedPricingType = appliedFilters.pricingType;
  const availabilityFilter = appliedFilters.availability;
  const selectedRating = appliedFilters.rating;
  const showFavoritesOnly = appliedFilters.favoritesOnly;

  // Optimized setters that update appliedFilters directly
  const setSelectedUserType = useCallback((value: string) => {
    setAppliedFilters(prev => ({ ...prev, userType: value }));
  }, []);

  const setSelectedMainCategory = useCallback((value: string) => {
    setAppliedFilters(prev => ({ ...prev, mainCategory: value }));
  }, []);

  const setSelectedServices = useCallback((value: string[]) => {
    setAppliedFilters(prev => ({ ...prev, services: value }));
  }, []);

  const setPriceSort = useCallback((value: "none" | "asc" | "desc") => {
    setAppliedFilters(prev => ({ ...prev, priceSort: value }));
  }, []);

  const setMinPrice = useCallback((value: string) => {
    setAppliedFilters(prev => ({ ...prev, minPrice: value }));
  }, []);

  const setMaxPrice = useCallback((value: string) => {
    setAppliedFilters(prev => ({ ...prev, maxPrice: value }));
  }, []);

  const setSelectedPricingType = useCallback((value: string) => {
    setAppliedFilters(prev => ({ ...prev, pricingType: value }));
  }, []);

  const setAvailabilityFilter = useCallback((value: "all" | "available" | "unavailable") => {
    setAppliedFilters(prev => ({ ...prev, availability: value }));
  }, []);

  const setSelectedRating = useCallback((value: number) => {
    setAppliedFilters(prev => ({ ...prev, rating: value }));
  }, []);

  const setShowFavoritesOnly = useCallback((value: boolean) => {
    setAppliedFilters(prev => ({ ...prev, favoritesOnly: value }));
  }, []);

  // applyFilters is now a no-op since filters are applied immediately
  const applyFilters = useCallback(() => {
    // Filters are already applied (single source of truth)
    // This function is kept for backward compatibility
  }, []);

  const clearFilters = useCallback(() => {
    setAppliedFilters(DEFAULT_FILTERS);
  }, []);

  // Check if any filter is active (not default)
  const hasActiveFilters = useMemo(() => {
    return (
      appliedFilters.userType !== DEFAULT_FILTERS.userType ||
      appliedFilters.mainCategory !== DEFAULT_FILTERS.mainCategory ||
      appliedFilters.services.length > 0 ||
      appliedFilters.priceSort !== DEFAULT_FILTERS.priceSort ||
      appliedFilters.minPrice !== DEFAULT_FILTERS.minPrice ||
      appliedFilters.maxPrice !== DEFAULT_FILTERS.maxPrice ||
      appliedFilters.pricingType !== DEFAULT_FILTERS.pricingType ||
      appliedFilters.availability !== DEFAULT_FILTERS.availability ||
      appliedFilters.rating !== DEFAULT_FILTERS.rating ||
      appliedFilters.favoritesOnly !== DEFAULT_FILTERS.favoritesOnly
    );
  }, [appliedFilters]);

  return {
    // Individual state getters (derived from appliedFilters)
    selectedUserType,
    setSelectedUserType,
    selectedMainCategory,
    setSelectedMainCategory,
    selectedServices,
    setSelectedServices,
    priceSort,
    setPriceSort,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    selectedPricingType,
    setSelectedPricingType,
    availabilityFilter,
    setAvailabilityFilter,
    selectedRating,
    setSelectedRating,
    showFavoritesOnly,
    setShowFavoritesOnly,
    // Main filter state
    appliedFilters,
    setAppliedFilters, // Direct setter for batch updates
    applyFilters, // No-op for backward compatibility
    clearFilters,
    hasActiveFilters, // Helper to check if filters are active
  };
};
