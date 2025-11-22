// utils/resolveApiErrorMessage.ts
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { SerializedError } from '@reduxjs/toolkit';

export function resolveApiErrorMessage(
    error: FetchBaseQueryError | SerializedError | any
): string {
    if (error && 'status' in error) {
        const fe = error as FetchBaseQueryError;
        const data: any = fe.data;

        if (data) {
            // validation hatası: { errors: [{field, message}, ...] }
            if (Array.isArray(data.errors) && data.errors.length > 0) {
                // string array ise
                if (typeof data.errors[0] === 'string') {
                    return data.errors.join('\n');
                }
                // { field, message } array ise
                return data.errors
                    .map((e: any) => e.message ?? JSON.stringify(e))
                    .join('\n');
            }

            if (typeof data.message === 'string' && data.message.length > 0) {
                return data.message;
            }

            if (typeof data === 'string') {
                return data;
            }
        }

        if (fe.status === 'FETCH_ERROR') {
            return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.';
        }

        if (fe.status === 500) {
            return 'Sunucu tarafında bir hata oluştu.';
        }
    }

    if (error && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }

    return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
}
