/**
 * Centralized user-facing messages
 * Avoids hardcoded strings throughout the frontend
 */

export const MESSAGES = {
    // Appointment Status
    APPOINTMENT_STATUS: {
        PENDING: 'Beklemede',
        APPROVED: 'Onaylandı',
        COMPLETED: 'Tamamlandı',
        CANCELLED: 'İptal Edildi',
        REJECTED: 'Reddedildi',
        UNANSWERED: 'Yanıtlanmadı',
    },

    // Time Format
    TIME: {
        NOW: 'Şimdi',
        MINUTES_AGO: (mins: number) => `${mins} dk`,
        HOURS_AGO: (hours: number) => `${hours} sa`,
    },

    // Empty States
    EMPTY_STATE: {
        NO_MESSAGES: 'Henüz mesajınız bulunmamaktadır.',
        NO_APPOINTMENTS: 'Henüz randevunuz bulunmamaktadır.',
        NO_NOTIFICATIONS: 'Henüz bildiriminiz bulunmamaktadır.',
        NO_FAVORITES: 'Henüz favori listenizde bir şey bulunmamaktadır.',
    },

    // Actions
    ACTIONS: {
        APPROVE: 'Onayla',
        REJECT: 'Reddet',
        CANCEL: 'İptal Et',
        COMPLETE: 'Tamamla',
        RETRY: 'Tekrar Dene',
        CANCEL_BUTTON: 'İptal',
        YES_CANCEL: 'Evet, İptal Et',
        YES_COMPLETE: 'Evet, Tamamla',
    },

    // Alert Titles
    ALERTS: {
        APPOINTMENT_CANCELLATION: 'Randevu İptali',
        APPOINTMENT_COMPLETION: 'Randevu Tamamlandı',
        SUCCESS: 'Başarılı',
        ERROR: 'Hata',
    },

    // Alert Messages
    ALERT_MESSAGES: {
        CONFIRM_CANCELLATION: 'Bu randevuyu iptal etmek istediğinizden emin misiniz?',
        CONFIRM_COMPLETION: 'Bu randevuyu tamamlandı olarak işaretlemek istediğinizden emin misiniz?',
        APPOINTMENT_APPROVED: 'Randevu onaylandı',
        APPOINTMENT_REJECTED: 'Randevu reddedildi',
        APPOINTMENT_CANCELLED: 'Randevu iptal edildi',
        APPOINTMENT_COMPLETED: 'Randevu tamamlandı olarak işaretlendi',
        OPERATION_FAILED: 'İşlem başarısız',
    },

    // Errors
    ERRORS: {
        UNEXPECTED: 'Beklenmeyen bir hata meydana geldi',
        NETWORK_ERROR: 'Bağlantı hatası. Lütfen tekrar deneyin.',
        LOADING_ERROR: 'Yüklenirken bir hata oluştu.',
    },

    // Unread Badge
    UNREAD_BADGE: {
        MAX_DISPLAY: 99,
        MAX_DISPLAY_TEXT: '99+',
    },

    // Labels
    LABELS: {
        FREE_BARBER: 'Serbest Berber',
        CUSTOMER: 'Müşteri',
        STORE: 'İşletme',
    },

    // Appointment Details
    APPOINTMENT_DETAILS: {
        CUSTOMER_DEFAULT_NAME: 'Müşteri',
        STORE_DEFAULT_NAME: 'İşletme',
        FREE_BARBER_DEFAULT_NAME: 'Serbest Berber',
    },
} as const;

