import { BarberType, ServiceOfferingGetDto } from "../../types/common";
import { BarberStoreGetDto, BarberStoreMineDto } from "../../types/store";
import { FreeBarGetDto } from "../../types/freebarber";
import { mapBarberType } from "../../utils/form/form-mappers";

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

type FilterContext = {
  searchQuery: string;
  filters: AppliedFilters;
  categoryNameById: Map<string, string>;
  favoriteIds?: Set<string>;
};

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const matchesServices = (
  offerings: ServiceOfferingGetDto[] | undefined,
  serviceIds: string[],
  categoryNameById: Map<string, string>
) => {
  if (!serviceIds.length) return true;
  if (!offerings || offerings.length === 0) return false;

  const serviceNames = serviceIds
    .map((id) => categoryNameById.get(id))
    .filter((name): name is string => !!name);

  return offerings.some(
    (service) =>
      serviceIds.includes(service.id) ||
      (service.serviceName ? serviceNames.includes(service.serviceName) : false)
  );
};

const matchesMainCategory = (mainCategory: string, type: BarberType) => {
  if (mainCategory === "Hepsi") return true;
  const mapped = mapBarberType(mainCategory);
  return type === mapped;
};

const matchesRating = (rating: number | undefined, minRating: number) => {
  if (minRating <= 0) return true;
  return (rating ?? 0) >= minRating;
};

const matchesAvailability = (
  availability: AppliedFilters["availability"],
  value: boolean | undefined
) => {
  if (availability === "all") return true;
  if (availability === "available") return value === true;
  return value === false;
};

const matchesFavorites = (favoritesOnly: boolean, favoriteIds?: Set<string>, id?: string) => {
  if (!favoritesOnly) return true;
  if (!favoriteIds || !id) return false;
  return favoriteIds.has(id);
};

const matchesPricingType = (pricingTypeFilter: string, pricingType: string | undefined) => {
  if (pricingTypeFilter === "Hepsi") return true;
  if (!pricingType) return false;
  const target =
    pricingTypeFilter === "Kiralama"
      ? "rent"
      : pricingTypeFilter === "Yüzdelik"
      ? "percent"
      : "";
  if (!target) return true;
  return String(pricingType).toLowerCase() === target;
};

export const filterStores = <T extends BarberStoreGetDto | BarberStoreMineDto>(
  stores: T[],
  { searchQuery, filters, categoryNameById, favoriteIds }: FilterContext
): T[] => {
  let result = [...(stores ?? [])] as T[];

  if (searchQuery) {
    const needle = normalizeSearch(searchQuery);
    result = result.filter((store) =>
      normalizeSearch(store.storeName ?? "").includes(needle)
    );
  }

  result = result.filter((store) => matchesMainCategory(filters.mainCategory, store.type));

  if (filters.services.length > 0) {
    result = result.filter((store) =>
      matchesServices(store.serviceOfferings, filters.services, categoryNameById)
    );
  }

  result = result.filter((store) => matchesRating(store.rating, filters.rating));

  result = result.filter((store) =>
    matchesPricingType(filters.pricingType, store.pricingType)
  );

  if (filters.minPrice) {
    const minVal = parseFloat(filters.minPrice);
    if (!Number.isNaN(minVal)) {
      result = result.filter((store) => (store.pricingValue ?? 0) >= minVal);
    }
  }

  if (filters.maxPrice) {
    const maxVal = parseFloat(filters.maxPrice);
    if (!Number.isNaN(maxVal)) {
      result = result.filter((store) => (store.pricingValue ?? 0) <= maxVal);
    }
  }

  result = result.filter((store) =>
    matchesAvailability(filters.availability, store.isOpenNow)
  );

  result = result.filter((store) =>
    matchesFavorites(filters.favoritesOnly, favoriteIds, store.id)
  );

  if (filters.priceSort !== "none") {
    result.sort((a, b) => {
      const aPrice = a.pricingValue ?? 0;
      const bPrice = b.pricingValue ?? 0;
      return filters.priceSort === "asc" ? aPrice - bPrice : bPrice - aPrice;
    });
  }

  return result;
};

const getFreeBarberPrice = (offerings: ServiceOfferingGetDto[] | undefined) => {
  if (!offerings || offerings.length === 0) return undefined;
  return Math.min(...offerings.map((o) => o.price ?? 0));
};

export const filterFreeBarbers = (
  freeBarbers: FreeBarGetDto[],
  { searchQuery, filters, categoryNameById, favoriteIds }: FilterContext
) => {
  let result = [...(freeBarbers ?? [])];

  if (searchQuery) {
    const needle = normalizeSearch(searchQuery);
    result = result.filter((barber) =>
      normalizeSearch(barber.fullName ?? "").includes(needle)
    );
  }

  result = result.filter((barber) => matchesMainCategory(filters.mainCategory, barber.type));

  if (filters.services.length > 0) {
    result = result.filter((barber) =>
      matchesServices(barber.offerings, filters.services, categoryNameById)
    );
  }

  result = result.filter((barber) => matchesRating(barber.rating, filters.rating));

  if (filters.minPrice) {
    const minVal = parseFloat(filters.minPrice);
    if (!Number.isNaN(minVal)) {
      result = result.filter((barber) => {
        const price = getFreeBarberPrice(barber.offerings);
        return price !== undefined && price >= minVal;
      });
    }
  }

  if (filters.maxPrice) {
    const maxVal = parseFloat(filters.maxPrice);
    if (!Number.isNaN(maxVal)) {
      result = result.filter((barber) => {
        const price = getFreeBarberPrice(barber.offerings);
        return price !== undefined && price <= maxVal;
      });
    }
  }

  result = result.filter((barber) =>
    matchesAvailability(filters.availability, barber.isAvailable)
  );

  result = result.filter((barber) =>
    matchesFavorites(filters.favoritesOnly, favoriteIds, barber.id)
  );

  if (filters.priceSort !== "none") {
    result.sort((a, b) => {
      const aPrice = getFreeBarberPrice(a.offerings) ?? 0;
      const bPrice = getFreeBarberPrice(b.offerings) ?? 0;
      return filters.priceSort === "asc" ? aPrice - bPrice : bPrice - aPrice;
    });
  }

  return result;
};
