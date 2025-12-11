/**
 * Centralized logging utility
 * In development, logs to console
 * In production, can be extended to send to logging service
 */
const isDev = __DEV__;

export const logger = {
    log: (...args: any[]) => {
        if (isDev) {
            console.log('[LOG]', ...args);
        }
    },
    error: (...args: any[]) => {
        // Errors should always be logged, even in production
        console.error('[ERROR]', ...args);
        // TODO: In production, send to error tracking service (e.g., Sentry)
    },
    warn: (...args: any[]) => {
        if (isDev) {
            console.warn('[WARN]', ...args);
        }
    },
    info: (...args: any[]) => {
        if (isDev) {
            console.info('[INFO]', ...args);
        }
    },
    debug: (...args: any[]) => {
        if (isDev) {
            console.debug('[DEBUG]', ...args);
        }
    },
};

