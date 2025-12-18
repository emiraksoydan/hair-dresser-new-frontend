/**
 * Custom hook for appointment pricing calculations
 * Extracted from StoreBookingContent to reduce complexity
 */

import { useMemo } from 'react';
import { PricingType } from '../types';
import { APPOINTMENT_CONSTANTS } from '../constants/appointment';
import { ServiceOfferingGetDto } from '../types/common';

interface UseAppointmentPricingProps {
    pricingType?: string | number;
    pricingValue?: number;
    serviceOfferings?: ServiceOfferingGetDto[];
    selectedServices: string[];
    selectedSlotKeys: string[];
    isFreeBarber: boolean;
}

export const useAppointmentPricing = ({
    pricingType,
    pricingValue,
    serviceOfferings,
    selectedServices,
    selectedSlotKeys,
    isFreeBarber,
}: UseAppointmentPricingProps) => {
    const pricingValueNum = useMemo(() => Number(pricingValue ?? 0), [pricingValue]);
    
    const pricingTypeKey = useMemo(() => {
        const pt = pricingType;
        if (typeof pt === "string") return pt.toLowerCase() as "percent" | "rent";
        if (typeof pt === "number") {
            return pt === PricingType.Rent ? "rent" : "percent";
        }
        return "unknown" as const;
    }, [pricingType]);

    const isHourlyFree = isFreeBarber && pricingTypeKey === "rent";
    const isPercentFree = isFreeBarber && pricingTypeKey === "percent";

    const totalPrice = useMemo(() => {
        const servicesTotal =
            (serviceOfferings ?? [])
                .filter(x => selectedServices.includes(x.id))
                .reduce((sum, x) => sum + Number(x.price ?? 0), 0);

        if (isHourlyFree) {
            return Number((pricingValueNum * selectedSlotKeys.length).toFixed(APPOINTMENT_CONSTANTS.DECIMAL_PLACES));
        }
        if (isPercentFree) {
            return Number((servicesTotal * (pricingValueNum / APPOINTMENT_CONSTANTS.PERCENTAGE_DIVISOR)).toFixed(APPOINTMENT_CONSTANTS.DECIMAL_PLACES));
        }
        return Number(servicesTotal.toFixed(APPOINTMENT_CONSTANTS.DECIMAL_PLACES));
    }, [serviceOfferings, selectedServices, isHourlyFree, isPercentFree, pricingValueNum, selectedSlotKeys.length]);

    return {
        pricingTypeKey,
        isHourlyFree,
        isPercentFree,
        totalPrice,
        pricingValue: pricingValueNum,
    };
};
