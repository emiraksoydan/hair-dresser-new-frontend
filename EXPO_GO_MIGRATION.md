# Expo Go'ya Dönüş Rehberi

## ⚠️ ÖNEMLİ UYARI

Expo Go'ya dönmek için **native modülleri kaldırmanız** gerekecek. Bu durumda:

### ❌ Kaybedeceğiniz Özellikler:

1. **Firebase Push Notifications**
   - `@react-native-firebase/app` ve `@react-native-firebase/messaging` çalışmaz
   - Backend Firebase FCM kullanıyor, Expo Go ile uyumsuz
   - **Çözüm:** Expo Notifications kullanabilirsiniz ama backend'i değiştirmeniz gerekir

2. **React Native Maps**
   - `react-native-maps` Expo Go'da çalışmaz
   - Harita özellikleri çalışmayacak
   - **Çözüm:** WebView ile Google Maps embed edebilirsiniz (sınırlı)

## 🔄 Expo Go'ya Dönüş Adımları

### 1. Native Modülleri Kaldırın

```bash
# Firebase paketlerini kaldır
npm uninstall @react-native-firebase/app @react-native-firebase/messaging

# react-native-maps'i kaldır (isteğe bağlı, harita kullanmıyorsanız)
npm uninstall react-native-maps

# expo-dev-client'i kaldır
npm uninstall expo-dev-client
```

### 2. app.json'dan Native Plugin'leri Kaldırın

```json
{
  "expo": {
    "plugins": [
      "expo-router"
      // "expo-dev-client", ← KALDIR
      // "@react-native-firebase/app" ← KALDIR
    ],
    "ios": {
      // "googleServicesFile": "./GoogleService-Info.plist" ← KALDIR (isteğe bağlı)
    },
    "android": {
      "config": {
        // "googleMaps": { ... } ← KALDIR (isteğe bağlı)
      }
      // "googleServicesFile": "./google-services.json" ← KALDIR (isteğe bağlı)
    }
  }
}
```

### 3. Kod Değişiklikleri

#### Firebase Yerine Expo Notifications

`app/hook/useFcmToken.tsx` dosyasını güncelleyin:

```typescript
// Expo Notifications kullan
import * as Notifications from 'expo-notifications';

export const useFcmToken = () => {
  const getFcmToken = useCallback(async (): Promise<string | null> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return null;
      }
      
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData?.data || null;
    } catch (error) {
      console.error('Error getting Expo push token:', error);
      return null;
    }
  }, []);
  
  // ... rest of the code
};
```

**⚠️ Backend Değişikliği Gerekli:**
- Backend Expo Push Notification API kullanmalı
- Firebase FCM yerine Expo Push Notification servisi kullanılmalı

#### Maps Yerine Alternatif

`react-native-maps` kullanılan yerlerde:

**Seçenek 1:** WebView ile Google Maps embed
```typescript
import { WebView } from 'react-native-webview';

<WebView
  source={{
    html: `
      <iframe
        width="100%"
        height="100%"
        frameborder="0"
        style="border:0"
        src="https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${lat},${lng}"
        allowfullscreen>
      </iframe>
    `
  }}
/>
```

**Seçenek 2:** Harita özelliklerini tamamen kaldır

### 4. Prebuild Klasörlerini Silin

```bash
# Native kodları sil
rm -rf android/
rm -rf ios/
```

### 5. Expo Go ile Çalıştırın

```bash
# Expo Go ile başlat
npx expo start

# QR kodu Expo Go uygulaması ile tarayın
```

## ⚖️ Karşılaştırma

| Özellik | Expo Go | Development Build |
|---------|---------|-------------------|
| Firebase Push | ❌ Çalışmaz | ✅ Çalışır |
| React Native Maps | ❌ Çalışmaz | ✅ Çalışır |
| Hızlı Test | ✅ Çok hızlı | ⚠️ Build gerekli |
| Native Modüller | ❌ Sınırlı | ✅ Tam destek |
| Production Ready | ❌ Değil | ✅ Evet |

## 💡 Öneri

**Expo Go'ya dönmek yerine Development Build kullanmanızı öneririm:**

1. ✅ Tüm özellikler çalışır
2. ✅ Production'a hazır
3. ✅ Native modüller desteklenir
4. ⚠️ İlk build biraz uzun sürer ama sonrası hızlı

**Development Build avantajları:**
- Hot reload çalışır
- Fast refresh çalışır
- Native modüller çalışır
- Production build'e kolay geçiş

