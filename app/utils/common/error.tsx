/**
 * Error handling utilities
 * Provides user-friendly error messages and error type detection
 */

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
 */
export const extractErrorMessage = (error: unknown): string => {
    // Handle null/undefined
    if (error == null) {
        return 'İşlem başarısız.';
    }

    // Handle string errors
    if (typeof error === 'string') {
        return error;
    }

    const e = error as ApiError;

    // FluentValidation hatalarını kontrol et (hem array hem object formatında olabilir)
    const validationError = extractFirstValidationError(e?.data?.errors ?? e?.error?.data?.errors);
    if (validationError) {
        return validationError;
    }

    // Backend'den gelen message'ı kontrol et (FluentValidation middleware'den gelen)
    const backendMessage = e?.data?.message ?? e?.error?.data?.message;
    if (backendMessage) {
        return backendMessage;
    }

    return (
        e?.data?.error ??
        e?.error?.message ??
        e?.message ??
        'İşlem başarısız.'
    );
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
 */
export const getUserFriendlyErrorMessage = (error: unknown): string => {
    if (isDuplicateSlotError(error)) {
        return "Bu randevu zamanı başka bir kullanıcı tarafından alındı. Lütfen başka bir saat seçin.";
    }

    const message = extractErrorMessage(error);

    // Map common backend error messages to user-friendly Turkish messages
    const errorMappings: Record<string, string> = {
        "store not found": "Dükkan bulunamadı.",
        "chair required": "Koltuk seçimi gereklidir.",
        "start time end time required": "Başlangıç ve bitiş saati gereklidir.",
        "location required": "Konum bilgisi gereklidir.",
        "customer distance exceeded": "Dükkana olan mesafeniz çok uzak. Maksimum mesafe: 1 km.",
        "freebarber distance exceeded": "Serbest berbere olan mesafeniz çok uzak. Maksimum mesafe: 1 km.",
        "freebarber store distance exceeded": "Serbest berber ile dükkan arasındaki mesafe çok uzak. Maksimum mesafe: 1 km.",
        "store freebarber distance exceeded": "Dükkan ile serbest berber arasındaki mesafe çok uzak. Maksimum mesafe: 1 km.",
        "customer has active appointment": "Zaten aktif bir randevunuz var. Yeni randevu almak için mevcut randevunuzu tamamlamanız veya iptal etmeniz gerekir.",
        "freebarber has active appointment": "Serbest berberin zaten aktif bir randevusu var.",
        "store has active call": "Dükkanın zaten aktif bir çağrısı var.",
        "store closed": "Dükkan bu saatlerde kapalı.",
        "store not open": "Dükkan bu saatlerde açık değil.",
        "appointment slot overlap": "Seçilen saat aralığı başka bir randevu ile çakışıyor.",
        "appointment slot taken": "Bu randevu zamanı daha önce alınmış.",
        "freebarber not available": "Serbest berber şu anda müsait değil.",
    };

    const lowerMessage = message.toLowerCase();
    for (const [key, value] of Object.entries(errorMappings)) {
        if (lowerMessage.includes(key)) {
            return value;
        }
    }

    return message;
};

/**
 * Alias for getUserFriendlyErrorMessage for backward compatibility
 */
export const resolveApiErrorMessage = getUserFriendlyErrorMessage;



