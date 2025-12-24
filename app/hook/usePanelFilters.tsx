import { useCallback, useState } from "react";

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

export const usePanelFilters = () => {
  const [selectedUserType, setSelectedUserType] = useState<string>("Hepsi");
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("Hepsi");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [priceSort, setPriceSort] = useState<"none" | "asc" | "desc">("none");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedPricingType, setSelectedPricingType] = useState<string>("Hepsi");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
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
  });

  const applyFilters = useCallback(() => {
    setAppliedFilters({
      userType: selectedUserType,
      mainCategory: selectedMainCategory,
      services: selectedServices,
      priceSort,
      minPrice,
      maxPrice,
      pricingType: selectedPricingType,
      availability: availabilityFilter,
      rating: selectedRating,
      favoritesOnly: showFavoritesOnly,
    });
  }, [
    selectedUserType,
    selectedMainCategory,
    selectedServices,
    priceSort,
    minPrice,
    maxPrice,
    selectedPricingType,
    availabilityFilter,
    selectedRating,
    showFavoritesOnly,
  ]);

  const clearFilters = useCallback(() => {
    setSelectedUserType("Hepsi");
    setSelectedMainCategory("Hepsi");
    setSelectedServices([]);
    setPriceSort("none");
    setMinPrice("");
    setMaxPrice("");
    setSelectedPricingType("Hepsi");
    setAvailabilityFilter("all");
    setSelectedRating(0);
    setShowFavoritesOnly(false);
    setAppliedFilters({
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
    });
  }, []);

  return {
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
    appliedFilters,
    applyFilters,
    clearFilters,
  };
};
