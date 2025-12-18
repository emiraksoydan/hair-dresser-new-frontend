/**
 * Error handling utilities
 * Provides user-friendly error messages and error type detection
 */

interface ApiError {
    data?: {
        message?: string;
        error?: string;
    };
    error?: {
        message?: string;
        data?: {
            message?: string;
        };
    };
    message?: string;
}

/**
 * Extracts error message from various error formats
 */
export const extractErrorMessage = (error: unknown): string => {
    const e = error as ApiError;

    return (
        e?.data?.message ??
        e?.data?.error ??
        e?.error?.message ??
        e?.error?.data?.message ??
        e?.message ??
        (typeof error === 'string' ? error : 'İşlem başarısız.')
    );
};

/**
 * Checks if error is a duplicate/slot taken error
 */
export const isDuplicateSlotError = (error: unknown): boolean => {
    const errorMessage = extractErrorMessage(error).toLowerCase();
    const fullErrorString = JSON.stringify(error).toLowerCase();

    return (
        errorMessage.includes("duplicate key") ||
        errorMessage.includes("ix_appointments") ||
        errorMessage.includes("cannot insert duplicate") ||
        errorMessage.includes("unique index") ||
        errorMessage.includes("sqlexception") ||
        errorMessage.includes("sql exception") ||
        errorMessage.includes("alındı") ||
        errorMessage.includes("slot taken") ||
        errorMessage.includes("slottaken") ||
        errorMessage.includes("already booked") ||
        errorMessage.includes("already reserved") ||
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
