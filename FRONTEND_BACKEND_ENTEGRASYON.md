# Buda HairDresser - Frontend-Backend Entegrasyon Dokümantasyonu

## Genel Bakış

Bu dokümantasyon, Buda HairDresser uygulamasının frontend tarafının backend ile nasıl entegre olduğunu açıklar. Uygulama React Native/Expo tabanlıdır ve Redux Toolkit Query (RTK Query) ile REST API çağrıları yapmaktadır. Real-time iletişim için SignalR kullanılmaktadır.

---

## 1. API Yapılandırması

### Base URL ve Endpoint'ler

**Dosya:** `app/constants/api.ts`

```typescript
export const API_CONSTANTS = {
    BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.102:5149/api/',
    SIGNALR_HUB_URL: process.env.EXPO_PUBLIC_SIGNALR_URL || 'http://192.168.1.102:5149/hubs/app',
    REQUEST_TIMEOUT_MS: 30000,
    REFRESH_TOKEN_SKEW_MS: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
}
```

**Önemli Notlar:**
- Base URL environment variable'dan (`EXPO_PUBLIC_API_URL`) alınır, yoksa fallback IP kullanılır
- SignalR hub URL'i ayrı bir environment variable'dan (`EXPO_PUBLIC_SIGNALR_URL`) alınır

---

## 2. Authentication ve Token Yönetimi

### Token Storage

**Dosya:** `app/lib/tokenStore.tsx`

In-memory token store:
```typescript
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokenStore = {
  get access() { return accessToken; },
  get refresh() { return refreshToken; },
  set(tokens: { accessToken: string; refreshToken: string }) { ... },
  clear() { ... }
};
```

**Dosya:** `app/lib/tokenStorage.tsx`

AsyncStorage ile kalıcı token saklama:
- `saveTokens()` - Token'ları AsyncStorage'a kaydet
- `loadTokens()` - Token'ları AsyncStorage'dan yükle
- `clearStoredTokens()` - Token'ları temizle

### Base Query ve Token Refresh

**Dosya:** `app/store/baseQuery.tsx`

**Özellikler:**
1. **Otomatik Token Ekleme:** Her request'e `Authorization: Bearer {token}` header'ı eklenir
2. **Token Refresh:** 401/403/419/498 hatalarında otomatik refresh token ile yeniden deneme
3. **Token Expiry Kontrolü:** JWT decode ile expiry kontrolü yapılır
4. **Error Normalization:** Backend'den gelen error response'lar normalize edilir

**Token Refresh Akışı:**
```typescript
if (res.error?.status === 401 && tokenStore.refresh) {
    // Refresh token ile yeni access token al
    const { accessToken, refreshToken } = await refresh();
    tokenStore.set({ accessToken, refreshToken });
    // Orijinal request'i tekrar dene
    res = await raw(args, api, extra);
}
```

---

## 3. RTK Query API Endpoints

**Dosya:** `app/store/api.tsx`

### 3.1 Authentication Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `Auth/send-otp` | POST | OTP gönder |
| `Auth/verify-otp` | POST | OTP doğrula |
| `Auth/password` | POST | Şifre ile giriş |
| `Auth/refresh` | POST | Token yenile |
| `Auth/revoke` | POST | Token iptal et |

**Kullanım:**
```typescript
const [sendOtp] = useSendOtpMutation();
const [verifyOtp] = useVerifyOtpMutation();
const [refresh] = useRefreshMutation();
```

### 3.2 Barber Store Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `BarberStore/create-store` | POST | Dükkan oluştur |
| `BarberStore/update-store` | PUT | Dükkan güncelle |
| `BarberStore/nearby` | GET | Yakındaki dükkanları getir |
| `BarberStore/mine` | GET | Kullanıcının dükkanlarını getir |
| `BarberStore/{id}` | GET | Dükkan detayı |
| `BarberStore/get-store-for-users?storeId={id}` | GET | Müşteri görünümü için dükkan detayı |
| `BarberStore/filtered` | POST | Filtreli dükkan listesi |

**Cache Stratejisi:**
- `keepUnusedDataFor: 0` - Lokasyon değişikliklerinde hard refresh
- `providesTags: ['MineStores']` - Cache invalidation için tag'ler

### 3.3 Free Barber Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `FreeBarber/create-free-barber` | POST | Serbest berber profili oluştur |
| `FreeBarber/update-free-barber` | PUT | Serbest berber profili güncelle |
| `FreeBarber/update-location` | POST | Konum güncelle |
| `FreeBarber/nearby` | GET | Yakındaki serbest berberleri getir |
| `FreeBarber/mypanel` | GET | Kullanıcının serbest berber paneli |
| `FreeBarber/{id}` | GET | Serbest berber detayı |
| `FreeBarber/get-freebarber-for-users?freeBarberId={id}` | GET | Müşteri görünümü için serbest berber detayı |
| `FreeBarber/filtered` | POST | Filtreli serbest berber listesi |

### 3.4 Appointment Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `Appointment/availability?storeId={id}&dateOnly={date}` | GET | Müsaitlik kontrolü |
| `Appointment/getallbyfilter?filter={filter}` | GET | Filtreli randevu listesi (Active/Completed/Cancelled) |
| `Appointment/customer` | POST | Müşteri randevusu oluştur |
| `Appointment/freebarber` | POST | Serbest berber randevusu oluştur |
| `Appointment/store` | POST | Dükkan randevusu oluştur |
| `Appointment/{id}/store-decision?approve={bool}` | POST | Dükkan onay/red |
| `Appointment/{id}/freebarber-decision?approve={bool}` | POST | Serbest berber onay/red |
| `Appointment/{id}/cancel` | POST | Randevu iptal et |
| `Appointment/{id}/complete` | POST | Randevu tamamla |

**Filter Tipleri:**
- `AppointmentFilter.Active` - Aktif randevular (Approved)
- `AppointmentFilter.Completed` - Tamamlanan randevular
- `AppointmentFilter.Cancelled` - İptal edilen randevular

### 3.5 Chat Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `Chat/threads` | GET | Chat thread listesi |
| `Chat/{appointmentId}/messages` | GET | Randevu mesajları |
| `Chat/thread/{threadId}/messages` | GET | Thread mesajları |
| `Chat/{appointmentId}/message` | POST | Randevu mesajı gönder |
| `Chat/thread/{threadId}/message` | POST | Thread mesajı gönder |
| `Chat/thread/{threadId}/read` | POST | Thread'i okundu işaretle |
| `Chat/{appointmentId}/read` | POST | Randevu mesajlarını okundu işaretle |
| `Chat/thread/{threadId}/typing` | POST | Yazıyor göstergesi |

**Cache Stratejisi:**
- `keepUnusedDataFor: 0` - SignalR ile real-time güncellenir
- SignalR event'leri ile cache anlık güncellenir

### 3.6 Notification Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `Badge` | GET | Okunmamış bildirim ve mesaj sayısı |
| `Notification` | GET | Tüm bildirimler |
| `Notification/read/{id}` | POST | Bildirimi okundu işaretle |

**Badge Count Response:**
```typescript
{
  unreadNotifications: number;
  unreadMessages: number;
}
```

### 3.7 Rating Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `Rating/create` | POST | Değerlendirme oluştur |
| `Rating/{id}` | DELETE | Değerlendirme sil |
| `Rating/{id}` | GET | Değerlendirme detayı |
| `Rating/target/{targetId}` | GET | Hedef için tüm değerlendirmeler |
| `Rating/appointment/{appointmentId}/target/{targetId}` | GET | Randevu için kullanıcının değerlendirmesi |

### 3.8 Favorite Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `Favorite/toggle` | POST | Favori ekle/kaldır |
| `Favorite/check/{targetId}` | GET | Favori durumu kontrol et |
| `Favorite/my-favorites` | GET | Kullanıcının favorileri |
| `Favorite/{targetId}` | DELETE | Favoriyi kaldır |

**Toggle Favorite Request:**
```typescript
{
  targetId: string; // Store ID, FreeBarber ID, veya Customer User ID
  targetType: 'Store' | 'FreeBarber' | 'Customer';
}
```

**Toggle Favorite Response:**
```typescript
{
  isFavorite: boolean;
  favoriteCount: number;
}
```

**Optimistic Update:**
- `toggleFavorite` mutation'ı optimistic update yapar
- Anında UI güncellenir, backend response ile gerçek değerlerle düzeltilir
- Hata durumunda rollback yapılır

### 3.9 Working Hours Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `Working/{targetId}` | GET | Hedef için çalışma saatleri |

### 3.10 Category Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `Categories` | GET | Tüm kategoriler |
| `Categories/parents` | GET | Ana kategoriler |
| `Categories/children/{parentId}` | GET | Alt kategoriler |

---

## 4. SignalR Real-Time İletişim

**Dosya:** `app/hook/useSignalR.tsx`

### 4.1 Bağlantı Yapılandırması

```typescript
const connection = new SignalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
        transport: SignalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
        accessTokenFactory: async () => tokenStore.access,
    })
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .build();
```

**Özellikler:**
- WebSocket transport kullanır
- Otomatik yeniden bağlanma (exponential backoff)
- Token-based authentication
- Token refresh edildiğinde bağlantı yeniden kurulur

### 4.2 SignalR Event'leri

#### `badge.updated`
Badge count güncellendiğinde tetiklenir:
```typescript
conn.on("badge.updated", (data: { unreadNotifications: number; unreadMessages: number }) => {
    // Cache'i güncelle
    dispatch(api.util.updateQueryData("getBadgeCounts", undefined, (draft) => {
        draft.unreadNotifications = data.unreadNotifications;
        draft.unreadMessages = data.unreadMessages;
    }));
});
```

#### `notification.received`
Yeni bildirim geldiğinde tetiklenir:
```typescript
conn.on("notification.received", (dto: NotificationDto) => {
    // Notification listesine ekle veya güncelle
    dispatch(api.util.updateQueryData("getAllNotifications", undefined, (draft) => {
        // Duplicate kontrolü
        // Appointment status değişikliklerini handle et
        // Badge count'u invalidate et
    }));
});
```

#### `chat.message`
Yeni mesaj geldiğinde tetiklenir:
```typescript
conn.on("chat.message", (dto: ChatMessageDto) => {
    // Thread listesindeki lastMessagePreview'ı güncelle
    // Mesaj listesine ekle (appointmentId veya threadId ile)
    // Badge count'u invalidate et
});
```

#### `chat.threadCreated`
Yeni chat thread oluşturulduğunda tetiklenir:
```typescript
conn.on("chat.threadCreated", (dto: ChatThreadListItemDto) => {
    // Thread listesine ekle
    // Favori thread kontrolü yap
    // Randevu thread'leri için status kontrolü (Pending/Approved)
});
```

#### `chat.threadUpdated`
Chat thread güncellendiğinde tetiklenir:
```typescript
conn.on("chat.threadUpdated", (dto: ChatThreadListItemDto) => {
    // Thread'i güncelle
    // Status değişikliklerini handle et
});
```

#### `chat.threadRemoved`
Chat thread kaldırıldığında tetiklenir:
```typescript
conn.on("chat.threadRemoved", (threadId: string) => {
    // Thread'i listeden kaldır
    // Badge count'u invalidate et
});
```

#### `chat.typing`
Kullanıcı yazıyor göstergesi:
```typescript
conn.on("chat.typing", (data: { threadId: string; typingUserId: string; typingUserName: string; isTyping: boolean }) => {
    // Typing indicator'ü handle et (ChatDetailScreen'de)
});
```

#### `appointment.updated`
Randevu durumu değiştiğinde tetiklenir:
```typescript
conn.on("appointment.updated", (appointment: AppointmentGetDto) => {
    // Tüm filter'lardaki appointment listelerini güncelle
    // Thread görünürlüğünü güncelle
    // Cache'i invalidate et
});
```

### 4.3 Yeniden Bağlanma Mekanizması

**Özellikler:**
- Exponential backoff ile yeniden bağlanma
- Maksimum 10 deneme
- Token kontrolü ile güvenli yeniden bağlanma
- Bağlantı kurulduğunda cache'i invalidate et

---

## 5. Cache Yönetimi ve Invalidation

### 5.1 RTK Query Tag'leri

**Tag Tipleri:**
- `MineStores` - Kullanıcının dükkanları
- `GetStoreById` - Dükkan detayı
- `StoreForUsers` - Müşteri görünümü dükkan detayı
- `MineFreeBarberPanel` - Serbest berber paneli
- `FreeBarberForUsers` - Müşteri görünümü serbest berber detayı
- `Badge` - Badge count
- `Notification` - Bildirimler
- `Chat` - Chat thread'leri
- `Appointment` - Randevular
- `Favorite` - Favoriler
- `IsFavorite` - Favori durumu

### 5.2 Cache Invalidation Stratejisi

**Invalidation Senaryoları:**

1. **Favori Toggle:**
```typescript
invalidatesTags: [
    'Appointment', 'Favorite', 'Chat', 'Notification',
    { type: 'MineStores', id: targetId },
    { type: 'StoreForUsers', id: targetId },
    { type: 'IsFavorite', id: targetId },
    // ...
]
```

2. **Randevu Oluşturma:**
```typescript
invalidatesTags: [
    'Appointment', 'Badge', 'Notification',
    { type: 'Appointment', id: 'LIST' },
    { type: 'Appointment', id: `availability-${storeId}-${date}` },
]
```

3. **Randevu Durumu Değişikliği:**
```typescript
invalidatesTags: [
    { type: 'Appointment', id: appointmentId },
    { type: 'Appointment', id: 'LIST' },
    'Badge', 'Notification',
    { type: 'Appointment', id: 'availability' }
]
```

### 5.3 Optimistic Updates

**Favori Toggle Optimistic Update:**
```typescript
// 1. Anında UI güncelle (optimistic)
optimisticUpdateCache('getNearbyStores', optimisticToggle);

// 2. Backend response'u bekle
const result = await queryFulfilled;

// 3. Gerçek değerlerle cache'i düzelt
updateCacheWithFavoriteCount('getNearbyStores', favoriteCount, isFavorite);

// 4. Hata durumunda rollback
patchResults.forEach(patchResult => patchResult.undo());
```

---

## 6. Error Handling

### 6.1 Base Query Error Handling

**Dosya:** `app/store/baseQuery.tsx`

```typescript
// Backend'den gelen error response'u normalize et
if (res.error) {
    const errorData = res.error.data as any;
    const errorMessage = errorData.message || errorData.Message || errorData.data?.message;
    if (errorMessage) {
        res.error.data = { message: errorMessage };
    }
}
```

### 6.2 Network Error Handling

```typescript
catch (error: any) {
    return {
        error: {
            status: 'FETCH_ERROR',
            data: { message: error?.message || 'Beklenmeyen bir hata oluştu' }
        }
    };
}
```

---

## 7. Response Transformation

### 7.1 Transform Response Pattern

Çoğu endpoint'te response transformation yapılır:

```typescript
transformResponse: (response: any) => {
    // Backend camelCase döndürüyor, sadece array/data kontrolü yap
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    return [];
}
```

### 7.2 API Response Format

Backend'den gelen response formatı:
```typescript
{
    success: boolean;
    data: T;
    message?: string;
}
```

Frontend'de bu format normalize edilir ve `data` kısmı extract edilir.

---

## 8. Type Definitions

**Dosya:** `app/types/index.ts`

Tüm type'lar merkezi bir yerden export edilir:
- `auth.ts` - Authentication type'ları
- `appointment.ts` - Randevu type'ları
- `store.ts` - Dükkan type'ları
- `freebarber.ts` - Serbest berber type'ları
- `chat.ts` - Chat type'ları
- `notification.ts` - Bildirim type'ları
- `rating.ts` - Değerlendirme type'ları
- `favorite.ts` - Favori type'ları
- `common.ts` - Ortak type'lar
- `ui.ts` - UI type'ları
- `form.ts` - Form type'ları

---

## 9. Kullanım Örnekleri

### 9.1 Favori Toggle

```typescript
import { useToggleFavoriteMutation } from '../store/api';

const [toggleFavorite] = useToggleFavoriteMutation();

const handleToggleFavorite = async () => {
    try {
        const result = await toggleFavorite({
            targetId: store.id,
            targetType: 'Store'
        }).unwrap();
        
        // result.isFavorite ve result.favoriteCount kullanılabilir
    } catch (error) {
        // Error handling
    }
};
```

### 9.2 Randevu Oluşturma

```typescript
import { useCreateCustomerAppointmentMutation } from '../store/api';

const [createAppointment] = useCreateCustomerAppointmentMutation();

const handleCreateAppointment = async () => {
    try {
        const result = await createAppointment({
            storeId: store.id,
            appointmentDate: '2024-01-01',
            startTime: '10:00',
            // ...
        }).unwrap();
        
        // result.id ile yeni randevu ID'si alınır
    } catch (error) {
        // Error handling
    }
};
```

### 9.3 SignalR Kullanımı

```typescript
import { useSignalR } from '../hook/useSignalR';

const MyComponent = () => {
    const { isConnected } = useSignalR();
    
    // SignalR otomatik olarak bağlanır ve event'leri dinler
    // Component'te sadece isConnected durumunu kontrol edebilirsiniz
};
```

---

## 10. Environment Variables

**Gerekli Environment Variables:**

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.102:5149/api/
EXPO_PUBLIC_SIGNALR_URL=http://192.168.1.102:5149/hubs/app
```

**Fallback Değerler:**
- API URL: `http://192.168.1.102:5149/api/`
- SignalR URL: `http://192.168.1.102:5149/hubs/app`

---

## 11. Önemli Notlar

### 11.1 ID Kullanımı

**Store Favorileme:**
- Frontend gönderiyor: `store.id` (Store Entity ID)
- Backend thread için kullanmalı: `store.BarberStoreOwnerId` (Store Owner User ID)

**FreeBarber Favorileme:**
- Frontend gönderiyor: `freeBarber.id` (FreeBarber Entity ID)
- Backend thread için kullanmalı: `freeBarber.FreeBarberUserId` (FreeBarber User ID)

**Customer Favorileme:**
- Frontend gönderiyor: `customerUserId` (Customer User ID)
- Backend thread için kullanmalı: `customerUserId` (aynı)

### 11.2 Cache Stratejisi

- Lokasyon bazlı sorgular: `keepUnusedDataFor: 0` (hard refresh)
- Real-time güncellenen veriler: `keepUnusedDataFor: 0` (SignalR ile güncellenir)
- Statik veriler: `keepUnusedDataFor: 30-120` (cache süresi)

### 11.3 SignalR Event Gönderimi

Backend'den her iki tarafa da event gönderilmeli:
- Favori thread oluşturulduğunda: `chat.threadCreated` her iki tarafa
- Favori pasif olduğunda: `chat.threadRemoved` her iki tarafa
- Thread güncellendiğinde: `chat.threadUpdated` her iki tarafa

---

## 12. Test Senaryoları

### 12.1 Favori Toggle Test

1. **Müşteri dükkanı beğendiğinde:**
   - Müşteri tarafında thread görünmeli ✅
   - Berber (Store Owner) tarafında thread görünmeli ✅
   - Her iki tarafa da `chat.threadCreated` event gönderilmeli ✅

2. **Müşteri favoriyi kaldırdığında:**
   - Eğer berber de favori yapmamışsa: Thread her iki tarafta da kaldırılmalı ✅
   - Eğer berber de favori yapmışsa: Thread hala görünür olmalı ✅
   - Her iki tarafa da `chat.threadRemoved` veya `chat.threadUpdated` event gönderilmeli ✅

### 12.2 SignalR Bağlantı Test

1. Token refresh edildiğinde bağlantı yeniden kurulmalı ✅
2. Network kesintisinde otomatik yeniden bağlanma ✅
3. Event'ler doğru şekilde handle edilmeli ✅

---

## 13. Sorun Giderme

### 13.1 Token Refresh Sorunları

**Sorun:** Token refresh edilmiyor
**Çözüm:** `baseQuery.tsx`'te refresh token kontrolü yapılmalı

### 13.2 SignalR Bağlantı Sorunları

**Sorun:** SignalR bağlanmıyor
**Çözüm:** 
- Token'ın geçerli olduğundan emin olun
- Hub URL'in doğru olduğunu kontrol edin
- Network bağlantısını kontrol edin

### 13.3 Cache Invalidation Sorunları

**Sorun:** Cache güncellenmiyor
**Çözüm:** 
- `invalidatesTags` doğru tag'leri içermeli
- SignalR event'leri doğru şekilde handle edilmeli

---

## 14. Geliştirme Notları

### 14.1 Yeni Endpoint Ekleme

1. `app/store/api.tsx`'e endpoint ekle
2. `transformResponse` ekle (gerekirse)
3. `providesTags` ve `invalidatesTags` tanımla
4. Hook'u export et
5. Type definition ekle (`app/types/`)

### 14.2 Yeni SignalR Event Ekleme

1. `app/hook/useSignalR.tsx`'e event handler ekle
2. Cache update veya invalidation yap
3. Type definition ekle (`app/types/chat.ts` veya ilgili dosya)

---

## Sonuç

Bu dokümantasyon, Buda HairDresser frontend'inin backend ile entegrasyonunu kapsamlı bir şekilde açıklar. Tüm API endpoint'leri, SignalR event'leri, cache yönetimi ve error handling mekanizmaları detaylı olarak belgelenmiştir.

**İletişim:** Sorularınız için proje ekibiyle iletişime geçin.
