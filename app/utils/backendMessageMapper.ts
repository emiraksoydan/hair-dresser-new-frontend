/**
 * Backend mesajlarını frontend localization key'lerine map eden utility
 * Backend'den gelen string mesajları frontend i18n key'lerine çevirir
 */

import i18n from '../i18n/config';

/**
 * Backend mesaj string'lerini frontend i18n key'lerine map eden obje
 * Backend Messages.cs ve hardcoded mesajlar buraya eklenmeli
 */
const backendToFrontendKeyMap: Record<string, string> = {
  // Appointment Messages
  'Randevu bulunamadı': 'errors.appointmentNotFound',
  'Randevu süresi dolmuş': 'errors.appointmentExpired',
  'Randevu zaten tamamlanmış': 'errors.appointmentAlreadyCompleted',
  'Randevu zaten iptal edilmiş': 'errors.appointmentAlreadyCancelled',
  'İptal edilemez': 'errors.appointmentCannotBeCancelled',
  'Randevu süresi dolmadan tamamlanamaz': 'errors.appointmentTimeNotPassed',
  'Kabul edilmemiş randevu': 'errors.appointmentNotApproved',
  'Beklemede değil': 'errors.appointmentNotPending',
  'Bekleme yok': 'errors.appointmentNotPendingStatus',
  'Karar zaten verilmiş': 'errors.appointmentDecisionAlreadyGiven',
  'Bu randevu zamanı başka bir kullanıcı tarafından alındı. Lütfen başka bir saat seçin.': 'errors.duplicateSlot',
  'Bu koltuk için seçilen saat aralığında başka bir randevu var.': 'errors.appointmentSlotOverlap',
  'Geçmiş tarih için randevu alınamaz.': 'errors.appointmentPastDate',
  'Geçmiş saat için randevu alınamaz.': 'errors.appointmentPastTime',
  'Randevu süresi dolmuş (yanıtlanmadı).': 'errors.appointmentTimeoutExpired',
  'Randevu başarıyla oluşturuldu.': 'booking.appointmentCreated',
  'Randevu onaylandı.': 'appointment.alerts.approved',
  'Randevu reddedildi.': 'appointment.alerts.rejected',
  'Randevu iptal edildi.': 'appointment.alerts.cancelled',
  'Randevu tamamlandı.': 'appointment.alerts.completed',

  // Store Messages
  'Dükkan bulunamadı': 'errors.storeNotFound',
  'Store not found': 'errors.storeNotFound',
  'Store not found or not owner': 'errors.storeNotFound',
  'Dükkan bu saat aralığında açık değil': 'errors.storeNotOpen',
  'Dükkan bu gün kapalı (tatil)': 'errors.storeClosed',
  'Dükkan bu gün için çalışma saati tanımlamamış (kapalı)': 'errors.storeNoWorkingHours',
  'Dükkanın aktif bir serbest berber çağrısı var. Önce onu sonuçlandır.': 'errors.storeHasActiveCall',
  'Bu dükkana ait aktif veya bekleyen randevu var önce müsait olmalısınız ': 'errors.storeHasActiveAppointments',
  'Berber dükkanı başarıyla oluşturuldu.': 'form.storeCreateSuccess',
  'Berber dükkanı başarıyla güncellendi.': 'form.storeUpdateSuccess',
  'Dükkan silindi.': 'errors.storeDeleted',

  // Chair Messages
  'Koltuk bulunamadı': 'errors.chairNotFound',
  'Koltuk dükkanda bulunamadı': 'errors.chairNotInStore',
  'Koltuk seçimi gereklidir.': 'errors.chairRequired',

  // FreeBarber Messages
  'Serbest berber bulunamadı': 'errors.freebarberNotFound',
  'Serbest berber şu an müsait değil': 'errors.freebarberNotAvailable',
  'Serbest berber koordinatları geçersiz': 'errors.freebarberInvalidCoordinates',
  'Serbest berber 1 km dışında. Yakın değilken randevu oluşturamazsın.': 'errors.freebarberDistanceExceeded',
  'Serbest berber ile dükkan arası 1 km dışında. Bu eşleşmeyle randevu açılamaz.': 'errors.freebarberStoreDistanceExceeded',
  'Dükkan ile serbest berber arası 1 km dışında. Bu eşleşmeyle randevu açılamaz.': 'errors.storeFreebarberDistanceExceeded',
  'Serbest berber seçimi gereklidir.': 'errors.freebarberUserIdRequired',
  'Dükkan randevusunda serbest berber seçilemez.': 'errors.freebarberNotAllowedForStoreAppointment',
  'Bu serbest berberi güncelleme yetkiniz yok': 'errors.freebarberUpdateUnauthorized',
  'Zaten bir serbest berber paneliniz bulunmaktadır. Her kullanıcının sadece bir paneli olabilir.': 'errors.freebarberPanelAlreadyExists',
  'Serbest berber portalı başarıyla oluşturuldu.': 'form.freebarberCreateSuccess',
  'Serbest berber güncellendi.': 'form.freebarberUpdateSuccess',
  'Serbest berber silindi.': 'errors.freebarberDeleted',

  // Customer Messages
  'Müşterinin aktif (Pending/Approved) randevusu var.': 'errors.customerHasActiveAppointment',
  'Zaten aktif bir randevunuz var. Önce onu tamamlayın.': 'errors.customerHasActiveAppointment',
  'Dükkan 1 km dışında. Yakın değilken randevu oluşturamazsın.': 'errors.customerDistanceExceeded',

  // Validation Messages
  'Geçersiz tarih': 'errors.invalidDate',
  'Geçersiz saat': 'errors.invalidTime',
  'Randevu tarihi geçmişte olamaz.': 'errors.appointmentDateCannotBePast',
  'Başlangıç saati bitişten büyük/eşit olamaz.': 'errors.startTimeGreaterThanEndTime',
  'Başlangıç ve bitiş saati gereklidir.': 'errors.timeRequired',
  'Konum bilgisi gerekli (RequestLatitude/RequestLongitude).': 'errors.locationRequired',
  'En az bir hizmet seçilmelidir': 'errors.serviceOfferingRequired',
  'Seçilen hizmetler bu kullanıcıya ait değil.': 'errors.serviceOfferingOwnerMismatch',
  'Randevu bitiş zamanı hesaplanamadı.': 'errors.appointmentEndTimeCalculationFailed',

  // User Messages
  'Kullanıcı bulunamadı.': 'errors.userNotFound',
  'Sadece müşteriler randevu oluşturabilir.': 'errors.onlyCustomersCanCreateAppointment',

  // Chat Messages
  'Chat is only allowed for Pending/Approved appointments': 'errors.chatOnlyForActiveAppointments',
  'Empty message': 'errors.emptyMessage',
  'Chat thread bulunamadı': 'errors.chatThreadNotFound',
  'Sohbet bulunamadı': 'errors.chatNotFound',
  'Katılımcı bulunamadı': 'errors.participantNotFound',

  // Authorization Messages
  'Yetki yok': 'errors.unauthorized',
  'İşleme yetkiniz bulunmamaktadır': 'errors.unauthorizedOperation',
  'Bu randevuya katılımcı değilsiniz': 'errors.notAParticipant',

  // ManuelBarber Messages
  'Berber bulunamadı': 'errors.manuelBarberNotFound',
  'Bu berberinize ait beklemekte olan veya aktif olan randevu işlemi vardır.': 'errors.manuelBarberHasActiveAppointments',
  'Manuel berber eklendi.': 'form.barberAddSuccess',
  'Manuel berber güncellendi.': 'form.barberUpdateSuccess',
  'Manuel berber silindi.': 'form.barberDeleteSuccess',

  // Rating Messages
  'Değerlendirme başarıyla kaydedildi.': 'rating.ratingCreatedSuccess',
  'Değerlendirme başarıyla güncellendi.': 'rating.ratingUpdatedSuccess',
  'Değerlendirme silindi.': 'rating.ratingDeletedSuccess',
  'Değerlendirme bulunamadı.': 'rating.ratingNotFound',
  'Sadece tamamlanmış veya iptal edilmiş randevular için değerlendirme yapılabilir.': 'rating.ratingOnlyForCompleted',
  'Kendi kendinize değerlendirme yapamazsınız.': 'rating.cannotRateYourself',
  'Geçersiz hedef. Sadece Store ID, FreeBarber ID veya Customer UserId ile değerlendirme yapılabilir. ManuelBarber\'a değerlendirme yapılamaz.': 'rating.invalidTargetForRating',
  'Bu randevu için bu hedefe zaten değerlendirme yaptınız. Değerlendirme güncellenemez.': 'errors.ratingAlreadyExists',

  // Favorite Messages
  'Favorilere eklendi.': 'favorites.addedSuccess',
  'Favori güncellendi.': 'favorites.updatedSuccess',
  'Favorilerden çıkarıldı.': 'favorites.removedSuccess',
  'Favori bulunamadı.': 'favorites.notFound',
  'Kendi kendinizi favorilere ekleyemezsiniz.': 'favorites.cannotFavoriteYourself',
  'Hedef kullanıcı bulunamadı.': 'favorites.targetUserNotFound',
  'Randevu sayfasından favorileme için randevunuzun sonuçlanması gerekir.': 'errors.appointmentMustBeCompletedForFavorite',

  // Image Messages
  'Resim bulunamadı.': 'errors.imageNotFound',
  'Resim URL\'i bulunamadı.': 'errors.imageUrlNotFound',
  'Resim başarıyla yüklendi.': 'image.uploadSuccess',
  'Resim başarıyla güncellendi.': 'image.updateSuccess',
  'Resim sahibi ID\'si boş olamaz': 'errors.imageOwnerIdRequired',
  'Resim ID\'si boş olamaz': 'errors.imageIdRequired',

  // Hardcoded Messages from AppointmentManager
  'Bu randevuya dükkan eklenemez.': 'errors.appointmentCannotAddStore',
  'Bu randevuda serbest berber onay adımı yok. Dükkan seçimi bekleniyor.': 'errors.freebarberApprovalStepNotAvailable',
  'Müşteri onay verdiği için bu randevu artık reddedilemez.': 'notification.cannotRejectAfterCustomerApproval',
  'Randevu onaylandı, artık red edemezsiniz.': 'errors.cannotRejectAfterApproval',
  'Randevu iptal edildi, artık red edemezsiniz.': 'errors.cannotRejectAfterCancellation',
  'Randevu tamamlandı, artık red edemezsiniz.': 'errors.cannotRejectAfterCompletion',
  'Reddetme süresi doldu.': 'errors.rejectionTimeoutExpired',
  'Serbest berber onayı bekleniyor.': 'errors.freebarberApprovalPending',
  'Bu randevu için müşteri kararı verilemez.': 'errors.customerDecisionNotAllowed',
  'Dükkan onayı bekleniyor.': 'errors.storeApprovalPending',
  'Pending veya Approved durumundaki randevular silinemez': 'errors.cannotDeletePendingOrApproved',
  'Silinecek randevu bulunamadı.': 'errors.appointmentNotFoundForDelete',
  'Hiçbir randevu silinemedi. {0} adet randevu Pending veya Approved durumunda.': 'errors.noAppointmentsDeleted',

  // Notification Messages
  'Silinecek bildirim bulunamadı.': 'errors.notificationNotFoundForDelete',
  'Silinecek bildirim bulunamadı. Tüm bildirimler Pending veya Approved durumundaki randevulara ait.': 'errors.notificationsNotFoundForDelete',
  'Randevu için alıcı bulunamadı.': 'errors.appointmentRecipientNotFound',

  // Auth Messages
  'Geçersiz kullanıcı tipi.': 'errors.invalidUserType',
  'Geçersiz refresh token.': 'errors.invalidRefreshToken',
  'Müşteri numarası oluşturulamadı. Lütfen tekrar deneyin.': 'errors.customerNumberCreationFailed',

  // FCM Token Messages
  'FCM token registered successfully': 'errors.fcmTokenRegistered',
  'Failed to register FCM token': 'errors.fcmTokenRegistrationFailed',
  'FCM token unregistered successfully': 'errors.fcmTokenUnregistered',
  'Failed to unregister FCM token': 'errors.fcmTokenUnregistrationFailed',

  // General Messages
  'İşlem başarılı': 'common.operationSuccess',
  'İşlem başarısız': 'common.operationFailed',
  'Kayıt bulunamadı': 'errors.entityNotFound',
};

/**
 * Backend'den gelen mesajı frontend localization key'ine çevirir
 * @param backendMessage Backend'den gelen mesaj string'i
 * @param params Interpolation parametreleri (örn: {count: 5})
 * @returns Çevrilmiş mesaj veya orijinal mesaj (eğer mapping bulunamazsa)
 */
export const mapBackendMessage = (
  backendMessage: string,
  params?: Record<string, any>
): string => {
  if (!backendMessage) {
    return '';
  }

  // Trim whitespace
  const trimmedMessage = backendMessage.trim();

  // Mapping'de var mı kontrol et
  const frontendKey = backendToFrontendKeyMap[trimmedMessage];

  if (frontendKey) {
    try {
      // i18n ile çevir - string olarak cast et
      const translated = i18n.t(frontendKey, params || {});
      return typeof translated === 'string' ? translated : String(translated);
    } catch (error) {
      console.warn(`Translation failed for key: ${frontendKey}`, error);
      // Eğer çeviri başarısız olursa, orijinal mesajı döndür
      return backendMessage;
    }
  }

  // Eğer mapping yoksa, orijinal mesajı döndür
  // Bu durumda backend mesajı direkt gösterilir (genellikle Türkçe olur)
  return backendMessage;
};

/**
 * Backend response'undan gelen mesajı işler
 * Backend genellikle { success: false, message: "..." } formatında döner
 * @param response Backend response objesi
 * @returns Çevrilmiş mesaj
 */
export const mapBackendResponseMessage = (
  response: { message?: string; Message?: string } | string
): string => {
  if (typeof response === 'string') {
    return mapBackendMessage(response);
  }

  const message = response.message || response.Message || '';
  return mapBackendMessage(message);
};

/**
 * Backend error response'unu işler ve kullanıcıya gösterilebilir hale getirir
 * @param error Backend error response'u
 * @returns Kullanıcı dostu hata mesajı
 */
export const handleBackendError = (
  error: any
): string => {
  // Error objesi ise
  if (error?.message) {
    return mapBackendMessage(error.message);
  }

  // Response objesi ise
  if (error?.data?.message) {
    return mapBackendMessage(error.data.message);
  }

  // String ise
  if (typeof error === 'string') {
    return mapBackendMessage(error);
  }

  // Bilinmeyen hata
  return i18n.t('common.unexpectedError');
};
