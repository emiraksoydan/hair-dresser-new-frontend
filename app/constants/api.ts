/**
 * API-related constants
 * Centralized API configuration
 */

export const API_CONSTANTS = {
    BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.103:5149/api/',
    SIGNALR_HUB_URL: process.env.EXPO_PUBLIC_SIGNALR_URL || 'http://192.168.1.103:5149/hubs/app',

    // Timeouts
    REQUEST_TIMEOUT_MS: 30000, // 10 saniye - sunucu kapalıysa hızlıca fail et
    REFRESH_TOKEN_SKEW_MS: 30000,

    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
} as const;

// Backward compatibility
export const API_CONFIG = API_CONSTANTS;

