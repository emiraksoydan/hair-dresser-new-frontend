/**
 * Error handling utilities
 * Provides user-friendly error messages and error type detection
 */

import i18n from '../../i18n/config';
import { mapBackendMessage, mapBackendResponseMessage, handleBackendError } from '../backendMessageMapper';
import { mapValidationMessage, handleValidationErrors } from '../validationMessageMapper';

interface ApiError {
    data?: {
        message?: string;
        error?: string;
        errors?: Record<string, string[] | string>;
    };
    error?: {
        message?: string;
        data?: {
            message?: string;
            errors?: Record<string, string[] | string>;
        };
    };
    message?: string;
}

const extractFirstValidationError = (errors: unknown): string | null => {
    if (!errors) {
        return null;
    }

    if (typeof errors === 'string') {
        return errors;
    }

    if (Array.isArray(errors)) {
        // FluentValidation format: [{ field: "...", message: "..." }]
        const firstErrorWithMessage = errors.find((item) =>
            typeof item === 'object' && item !== null && (item as any).message
        );
        if (firstErrorWithMessage) {
            return (firstErrorWithMessage as any).message;
        }

        // String array format
        const firstString = errors.find((item) => typeof item === 'string');
        return firstString ?? null;
    }

    if (typeof errors === 'object') {
        const values = Object.values(errors as Record<string, unknown>);
        for (const value of values) {
            const nested = extractFirstValidationError(value);
            if (nested) {
                return nested;
            }
        }
    }

    return null;
};
/**
 * Extracts error message from various error formats
 * Now uses backend message mapper for translation
 */
export const extractErrorMessage = (error: unknown): string => {
    const t = (key: string) => i18n.t(key);
    // Handle null/undefined
    if (error == null) {
        return t('common.operationFailed');
    }

    // Handle string errors - map to frontend key
    if (typeof error === 'string') {
        return mapBackendMessage(error);
    }

    const e = error as ApiError;

    // FluentValidation hatalarını kontrol et (hem array hem object formatında olabilir)
    const validationError = extractFirstValidationError(e?.data?.errors ?? e?.error?.data?.errors);
    if (validationError) {
        // Validation mesajını map et
        return mapValidationMessage(validationError);
    }

    // Backend'den gelen message'ı kontrol et (FluentValidation middleware'den gelen)
    const backendMessage = e?.data?.message ?? e?.error?.data?.message;
    if (backendMessage) {
        // Backend mesajını map et
        return mapBackendMessage(backendMessage);
    }

    // Diğer error formatlarını kontrol et
    const otherError = e?.data?.error ?? e?.error?.message ?? e?.message;
    if (otherError) {
        return mapBackendMessage(otherError);
    }

    return t('common.operationFailed');
};

/**
 * Checks if error is a duplicate/slot taken error
 */
export const isDuplicateSlotError = (error: unknown): boolean => {
    // Handle null/undefined errors
    if (error == null) {
        return false;
    }

    const errorMessage = extractErrorMessage(error);
    if (!errorMessage || typeof errorMessage !== 'string') {
        return false;
    }

    const lowerErrorMessage = errorMessage.toLowerCase();

    // Safely stringify error for full text search
    let fullErrorString = '';
    try {
        const stringified = JSON.stringify(error);
        fullErrorString = stringified ? stringified.toLowerCase() : '';
    } catch {
        // If stringify fails, just use empty string
        fullErrorString = '';
    }

    return (
        lowerErrorMessage.includes("duplicate key") ||
        lowerErrorMessage.includes("ix_appointments") ||
        lowerErrorMessage.includes("cannot insert duplicate") ||
        lowerErrorMessage.includes("unique index") ||
        lowerErrorMessage.includes("sqlexception") ||
        lowerErrorMessage.includes("sql exception") ||
        lowerErrorMessage.includes("alındı") ||
        lowerErrorMessage.includes("alindi") ||
        lowerErrorMessage.includes("slot taken") ||
        lowerErrorMessage.includes("slottaken") ||
        lowerErrorMessage.includes("already booked") ||
        lowerErrorMessage.includes("already reserved") ||
        fullErrorString.includes("duplicate key") ||
        fullErrorString.includes("ix_appointments") ||
        fullErrorString.includes("cannot insert duplicate") ||
        fullErrorString.includes("unique index") ||
        fullErrorString.includes("sqlexception")
    );
};

/**
 * Gets user-friendly error message
 * Now uses backend message mapper for automatic translation
 */
export const getUserFriendlyErrorMessage = (error: unknown): string => {
    const t = (key: string) => i18n.t(key);

    if (isDuplicateSlotError(error)) {
        return t('errors.duplicateSlot');
    }

    // extractErrorMessage zaten backend message mapper kullanıyor
    // Bu yüzden direkt kullanabiliriz
    const message = extractErrorMessage(error);

    // Eğer mesaj hala backend formatındaysa (mapping bulunamadıysa)
    // Orijinal mesajı döndür (genellikle Türkçe olur)
    return message;
};

/**
 * Alias for getUserFriendlyErrorMessage for backward compatibility
 */
export const resolveApiErrorMessage = getUserFriendlyErrorMessage;



