/**
 * Common form mapping utilities
 * Centralizes mapping functions used across multiple form components
 */

/**
 * Maps business type string to numeric value
 * @param type - Business type string (e.g., "MaleHairdresser", "FemaleHairdresser", "BeautySalon")
 * @returns Numeric type value
 */
export const mapBarberType = (type: string): number => {
  const raw = (type ?? "").toString().trim();
  const lower = raw.toLowerCase();

  // Numeric string support ("0","1","2")
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && Number.isFinite(asNum)) {
    if (asNum === 0) return 0;
    if (asNum === 1) return 1;
    if (asNum === 2) return 2;
  }

  // English enum names
  if (raw === "MaleHairdresser") return 0;
  if (raw === "FemaleHairdresser") return 1;
  if (raw === "BeautySalon") return 2;

  // Turkish display names (category names)
  if (lower === "erkek berber") return 0;
  if (lower === "bayan kuaför" || lower === "bayan kuafor") return 1;
  if (lower === "güzellik salonu" || lower === "guzellik salonu") return 2;

  return 0;
};

/**
 * Maps business type number to string label
 * @param type - Numeric business type
 * @returns Business type string label
 */
export const mapTypeToLabel = (type: number): string => {
  switch (type) {
    case 0:
      return 'MaleHairdresser';
    case 1:
      return 'FemaleHairdresser';
    case 2:
      return 'BeautySalon';
    default:
      return '';
  }
};

/**
 * Maps business type number to display name (Turkish)
 * @param type - Numeric business type
 * @returns Display name in Turkish
 */
export const mapTypeToDisplayName = (type: number | string): string => {
  // If it's already a Turkish display name, keep it
  if (typeof type === "string") {
    const raw = type.trim();
    const lower = raw.toLowerCase();

    if (lower === "erkek berber") return "Erkek Berber";
    if (lower === "bayan kuaför" || lower === "bayan kuafor") return "Bayan Kuaför";
    if (lower === "güzellik salonu" || lower === "guzellik salonu") return "Güzellik Salonu";

    // If it's enum label, map it
    if (raw === "MaleHairdresser") return "Erkek Berber";
    if (raw === "FemaleHairdresser") return "Bayan Kuaför";
    if (raw === "BeautySalon") return "Güzellik Salonu";

    // Numeric string support
    const n = Number(raw);
    if (!Number.isNaN(n) && Number.isFinite(n)) {
      return mapTypeToDisplayName(n);
    }

    return "";
  }

  switch (type) {
    case 0:
      return "Erkek Berber";
    case 1:
      return "Bayan Kuaför";
    case 2:
      return "Güzellik Salonu";
    default:
      return "";
  }
};

/**
 * Maps pricing mode to numeric value
 * @param mode - Pricing mode ('percent' or 'rent')
 * @returns Numeric pricing type (0 for percent, 1 for rent)
 */
export const mapPricingType = (mode: 'percent' | 'rent'): number => {
  return mode === 'percent' ? 0 : 1;
};

