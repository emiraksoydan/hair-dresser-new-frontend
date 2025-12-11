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
  switch (type) {
    case 'MaleHairdresser':
      return 0;
    case 'FemaleHairdresser':
      return 1;
    case 'BeautySalon':
      return 2;
    default:
      return 0;
  }
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
 * Maps pricing mode to numeric value
 * @param mode - Pricing mode ('percent' or 'rent')
 * @returns Numeric pricing type (0 for percent, 1 for rent)
 */
export const mapPricingType = (mode: 'percent' | 'rent'): number => {
  return mode === 'percent' ? 0 : 1;
};

