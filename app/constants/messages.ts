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

    // Profile Messages
    PROFILE: {
        UPDATE_SUCCESS: 'Profil başarıyla güncellendi',
        UPDATE_ERROR: 'Profil güncellenemedi',
        UPDATE_FAILED: 'Bir hata oluştu',
        IMAGE_UPDATE_SUCCESS: 'Profil fotoğrafı güncellendi',
        IMAGE_UPDATE_ERROR: 'Fotoğraf yüklenemedi',
        IMAGE_UPDATE_FAILED: 'Fotoğraf yüklenirken hata oluştu',
        REFRESH_FAILED: 'Yenileme başarısız',
        SETTING_UPDATE_SUCCESS: 'Ayar güncellendi',
        SETTING_UPDATE_ERROR: 'Ayar güncellenemedi',
        USER_NOT_FOUND: 'Kullanıcı bilgisi bulunamadı',
    },

    // Form Messages
    FORM: {
        STORE_CREATE_SUCCESS: 'İşletme başarıyla oluşturuldu',
        STORE_CREATE_ERROR: 'İşletme oluşturulamadı',
        STORE_UPDATE_SUCCESS: 'İşletme başarıyla güncellendi',
        STORE_UPDATE_ERROR: 'İşletme güncellenemedi',
        STORE_IMAGES_UPLOAD_ERROR: 'İşletme oluşturuldu, resimler yüklenemedi',
        STORE_IMAGES_UPDATE_ERROR: 'İşletme güncellendi, resimler yüklenemedi',
        FREEBARBER_CREATE_SUCCESS: 'Panel başarıyla oluşturuldu',
        FREEBARBER_CREATE_ERROR: 'Panel oluşturulamadı',
        FREEBARBER_UPDATE_SUCCESS: 'Panel başarıyla güncellendi',
        FREEBARBER_UPDATE_ERROR: 'Panel güncellenemedi',
        FREEBARBER_IMAGES_UPLOAD_ERROR: 'Panel oluşturuldu, resimler yüklenemedi',
        FREEBARBER_IMAGES_UPDATE_ERROR: 'Panel güncellendi, resimler yüklenemedi',
        CERTIFICATE_UPLOAD_ERROR: 'Sertifika resmi yüklenemedi',
        CERTIFICATE_UPLOAD_FAILED: 'Sertifika resmi yüklenirken hata oluştu',
        TAX_DOCUMENT_UPLOAD_ERROR: 'Vergi levhası resmi yüklenemedi',
        TAX_DOCUMENT_UPLOAD_FAILED: 'Vergi levhası yüklenirken hata oluştu',
        IMAGE_DELETE_ERROR: 'Resim silinemedi',
        IMAGE_UPDATE_BLOB_ERROR: 'Resim güncellenemedi',
        IMAGE_UPLOAD_ERROR: 'Resim yüklenemedi',
        PANEL_ID_NOT_FOUND: "Panel id'si bulunamadı",
        STORE_ID_NOT_FOUND: "İşletme oluşturuldu ancak işletme id'si bulunamadı",
        BARBER_IMAGE_UPLOAD_ERROR: 'Berber resmi yüklenemedi',
        BARBER_ADD_SUCCESS: 'Berber eklendi',
        BARBER_UPDATE_SUCCESS: 'Berber güncellendi',
        BARBER_ADD_IMAGE_ERROR: 'Berber eklendi, resim yüklenemedi',
        BARBER_UPDATE_IMAGE_ERROR: 'Berber güncellendi, resim yüklenemedi',
        OPERATION_SUCCESS: 'İşlem başarılı',
        OPERATION_FAILED: 'İşlem başarısız',
        LOCATION_NOT_AVAILABLE: 'Konum alınamadı',
    },
} as const;

