import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'

export function getErrorMessage(
    error: FetchBaseQueryError | SerializedError | undefined
): string {
    if (!error) return 'Bir hata oluştu';

    // RTK Query HTTP error
    if ('status' in error) {
        const errData = error.data as any;

        // backend mesajı string geldiyse
        if (typeof errData === 'string') return errData;

        // backend ApiResponse<Message> gibi JSON dönüyorsa
        if (errData && typeof errData === 'object' && 'message' in errData) {
            return String(errData.message);
        }

        return `Sunucu hatası (${error.status})`;
    }

    // SerializedError (genelde message alanı var)
    if ('message' in error && error.message) {
        return error.message;
    }

    return 'Bir hata oluştu';
}
