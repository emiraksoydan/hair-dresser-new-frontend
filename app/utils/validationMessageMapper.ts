/**
 * FluentValidation mesajlarını frontend localization key'lerine map eden utility
 * Backend'den gelen validation hata mesajlarını frontend i18n key'lerine çevirir
 */

import i18n from '../i18n/config';

/**
 * FluentValidation mesaj string'lerini frontend i18n key'lerine map eden obje
 * Backend ValidationRules klasöründeki mesajlar buraya eklenmeli
 */
const validationToFrontendKeyMap: Record<string, string> = {
  // BarberStore Validation Messages
  'İşletme adı zorunludur.': 'form.storeNameRequired',
  'Geçerli bir işletme türü seçilmelidir.': 'form.storeTypeRequired',
  'Geçerli bir koltuk fiyat hizmeti seçilmelidir.': 'form.pricingType',
  'Adres açıklaması zorunludur.': 'form.addressRequired',
  'Geçerli bir enlem değeri giriniz (-90..90).': 'form.locationRequired',
  'Geçerli bir boylam değeri giriniz (-180..180).': 'form.locationRequired',
  'Vergi levhası resmi zorunludur.': 'form.taxDocumentRequired',
  'Fiyat girilmelidir.': 'form.priceRequired',
  'Fiyat 0\'dan büyük olmalıdır.': 'form.priceRequired',
  'Yüzdelik girilmelidir.': 'form.percentRequired',
  'Yüzdelik 0\'dan büyük olmalıdır.': 'form.percentRequired',
  'Yüzdelik 100\'ü geçemez.': 'form.percentMax',
  'En az bir koltuk eklenmelidir.': 'form.minChairs',
  'Berber atanmadıysa koltuk adı zorunludur.': 'form.chairNameRequired',
  'Manuel berber adı zorunludur.': 'form.barberNameRequired',
  'Berber sayısı 30\'u geçemez.': 'form.maxBarbers',
  'Koltuk sayısı 30\'u geçemez.': 'form.maxChairs',
  'En az bir hizmet girilmelidir.': 'form.atLeastOneService',
  'Hizmet adı boş olamaz.': 'form.serviceNameRequired',
  'Hizmet fiyatı 0\'dan büyük olmalıdır.': 'form.priceRequired',
  'Hizmet adları benzersiz olmalıdır.': 'form.duplicateServiceName',
  'Çalışma saatleri zorunludur.': 'form.workingHoursRequired',
  'En az bir çalışma günü girilmelidir.': 'form.workingDaysRequired',
  'Her gün için tek bir çalışma kaydı olmalıdır.': 'form.duplicateWorkingDay',
  'Başlangıç saati zorunludur.': 'form.startTimeRequired',
  'Başlangıç saati HH:mm formatında olmalı.': 'form.startTimeFormat',
  'Bitiş saati zorunludur.': 'form.endTimeRequired',
  'Bitiş saati HH:mm formatında olmalı.': 'form.endTimeFormat',
  'Başlangıç saati bitiş saatinden küçük olmalı.': 'form.endTimeGreater',
  'Başlangıç saati bitiş saatinden küçük olmalıdır.': 'form.endTimeGreater',
  'Çalışma aralığı 1 saatlik aralıklarla seçilmeli.': 'form.workingHoursInterval',
  'Çalışma aralığı 1 saatlik slotlara tam bölünebilmeli.': 'form.workingHoursInterval',
  'Çalışma süresi en az 6 ve en fazla 18 saat olmalı.': 'form.workDurationMin',

  // User Validation Messages
  'İsim zorunludur': 'form.nameRequired',
  'İsim en az 2 karakter olmalıdır': 'form.minLength',
  'İsim en fazla 20 karakter olabilir': 'form.maxLength',
  'İsim boşluk içeremez': 'form.noSpaces',
  'Soyisim zorunludur': 'form.surnameRequired',
  'Soyisim en az 2 karakter olmalıdır': 'form.minLength',
  'Soyisim en fazla 20 karakter olabilir': 'form.maxLength',
  'Soyisim boşluk içeremez': 'form.noSpaces',
  'Telefon numarası zorunludur': 'auth.phoneNumber',
  'Telefon numarası boş olamaz': 'auth.phoneNumber',
  'Telefon numarası +90 ile başlamalı ve 13 haneli olmalıdır': 'auth.phoneNumber',

  // Location Validation Messages
  'Enlem (latitude) zorunludur.': 'form.locationRequired',
  'Enlem değeri -90 ile 90 arasında olmalıdır.': 'form.locationRequired',
  'Boylam (longitude) zorunludur.': 'form.locationRequired',
  'Boylam değeri -180 ile 180 arasında olmalıdır.': 'form.locationRequired',

  // Appointment Validation Messages
  'Randevu tarihi zorunludur.': 'booking.appointmentDateRequired',
  'Dükkan seçimi zorunludur.': 'booking.storeSelectionRequired',
  'Koltuk seçimi zorunludur.': 'errors.chairRequired',
  'Hizmet seçimi zorunludur.': 'form.atLeastOneService',
  'En az bir hizmet seçilmelidir.': 'form.atLeastOneService',
  'Serbest berber seçimi zorunludur.': 'errors.freebarberUserIdRequired',
  'Randevu notu zorunludur.': 'booking.appointmentNoteRequired',
  'Serbest berber ID\'si request body\'de gönderilmemelidir.': 'errors.freebarberNotAllowedForStoreAppointment',
  'Dükkan seçim tipi bu senaryoda kullanılamaz.': 'errors.invalidStoreSelectionType',
  'Dükkan randevusunda serbest berber seçilemez.': 'errors.freebarberNotAllowedForStoreAppointment',
  'Dükkan seç senaryosunda storeid gönderilemez.': 'errors.invalidStoreSelectionType',
  'Dükkan seç senaryosunda hizmet seçilemez.': 'errors.invalidStoreSelectionType',
  'Geçersiz dükkan seçim tipi.': 'errors.invalidStoreSelectionType',
};

/**
 * Validation mesajını frontend localization key'ine çevirir
 * @param validationMessage Backend'den gelen validation mesaj string'i
 * @param params Interpolation parametreleri
 * @returns Çevrilmiş mesaj veya orijinal mesaj (eğer mapping bulunamazsa)
 */
export const mapValidationMessage = (
  validationMessage: string,
  params?: Record<string, any>
): string => {
  if (!validationMessage) {
    return '';
  }

  // Trim whitespace
  const trimmedMessage = validationMessage.trim();

  // Mapping'de var mı kontrol et
  const frontendKey = validationToFrontendKeyMap[trimmedMessage];

  if (frontendKey) {
    try {
      // i18n ile çevir - string olarak cast et
      const translated = i18n.t(frontendKey, params || {});
      return typeof translated === 'string' ? translated : String(translated);
    } catch (error) {
      console.warn(`Translation failed for key: ${frontendKey}`, error);
      // Eğer çeviri başarısız olursa, orijinal mesajı döndür
      return validationMessage;
    }
  }

  // Eğer mapping yoksa, orijinal mesajı döndür
  return validationMessage;
};

/**
 * Backend validation error response'unu işler
 * FluentValidation genellikle errors array'i döner
 * @param validationErrors Backend validation errors array'i
 * @returns Kullanıcı dostu hata mesajları array'i
 */
export const handleValidationErrors = (
  validationErrors: Array<{ propertyName?: string; errorMessage: string }> | any
): string[] => {
  if (!validationErrors || !Array.isArray(validationErrors)) {
    return [];
  }

  return validationErrors.map((error) => {
    const message = error.errorMessage || error.message || error;
    return mapValidationMessage(message);
  });
};

/**
 * Backend'den gelen validation error response'unu tek bir string'e çevirir
 * @param validationErrors Backend validation errors
 * @param separator Mesajlar arası ayırıcı (varsayılan: '\n')
 * @returns Birleştirilmiş hata mesajları
 */
export const formatValidationErrors = (
  validationErrors: any,
  separator: string = '\n'
): string => {
  const messages = handleValidationErrors(validationErrors);
  return messages.join(separator);
};
