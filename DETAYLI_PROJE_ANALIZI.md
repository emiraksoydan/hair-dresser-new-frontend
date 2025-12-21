# HairDresser Projesi - Detaylı Analiz Raporu

## 📋 Genel Bakış

Bu proje, berber randevu yönetim sistemi için **Backend (ASP.NET Core)** ve **Frontend (React Native/Expo)** içeren tam kapsamlı bir uygulamadır. Sistem, müşteri (Customer), serbest berber (FreeBarber) ve berber işletmesi (BarberStore) olmak üzere üç farklı kullanıcı tipini desteklemektedir.

---

## 🏗️ Backend Analizi (ASP.NET Core)

### Mimari Yapı

Proje **Clean Architecture** prensiplerine uygun olarak katmanlı mimari kullanmaktadır:

```
HairDresser/
├── Api/                    # Web API Katmanı (Controllers, Hubs, Background Services)
├── Business/               # İş Mantığı Katmanı
│   ├── Abstract/          # Service Interface'leri
│   ├── Concrete/          # Service Implementasyonları
│   ├── ValidationRules/   # FluentValidation kuralları
│   └── DependencyResolvers/ # Autofac DI modülü
├── Core/                   # Çekirdek Katman (Cross-cutting concerns)
│   ├── Aspect/            # AOP (Transaction, Validation)
│   ├── Extensions/        # Extension metodlar
│   ├── Utilities/         # Yardımcı sınıflar (JWT, Security, etc.)
│   └── Exceptions/        # Custom exception'lar
├── DataAccess/             # Veri Erişim Katmanı
│   ├── Abstract/          # Repository Interface'leri
│   └── Concrete/          # Entity Framework implementasyonları
└── Entities/               # Domain Model Katmanı
    ├── Concrete/Entities/ # Entity sınıfları
    ├── Concrete/Dto/      # Data Transfer Objects
    └── Concrete/Enums/    # Enum tanımları
```

### Teknoloji Stack

- **Framework**: .NET 9.0
- **ORM**: Entity Framework Core 9.0
- **Database**: SQL Server
- **Authentication**: JWT Bearer Authentication
- **Real-time**: SignalR 1.2.0
- **Dependency Injection**: Autofac
- **Validation**: FluentValidation
- **Background Jobs**: IHostedService (AppointmentTimeoutWorker)
- **SMS/OTP**: Twilio
- **Serialization**: System.Text.Json (camelCase)

### Önemli Özellikler

#### 1. Authentication & Authorization

- **JWT Token Based Authentication**: Access token + Refresh token mekanizması
- **Refresh Token Rotation**: Güvenlik için refresh token'lar rotate ediliyor
- **Family-based Token Management**: Token aileleri ile çoklu cihaz yönetimi
- **OTP-based Login**: Twilio ile SMS tabanlı OTP doğrulama
- **Password Login**: İsim bazlı alternatif giriş yöntemi (development için)

**Güvenlik Özellikleri:**
- Telefon numarası şifreleme (encryption)
- Token fingerprint mekanizması (reuse detection)
- IP bazlı token tracking
- Otomatik token ailesi revoke (güvenlik ihlalleri için)

#### 2. Appointment (Randevu) Yönetimi

Sistem karmaşık randevu yönetimi mantığına sahiptir:

**Randevu Tipleri:**
1. **Customer → Store** (Müşteri, dükkana randevu alır)
2. **Customer → Store + FreeBarber** (Müşteri, dükkan ve serbest berber seçer)
3. **FreeBarber → Store** (Serbest berber, dükkanı çağırır)
4. **Store → FreeBarber** (Dükkan, serbest berberi çağırır)

**Randevu Durumları (AppointmentStatus):**
- `Pending`: Beklemede
- `Approved`: Onaylandı
- `Completed`: Tamamlandı
- `Cancelled`: İptal edildi
- `Rejected`: Reddedildi
- `Unanswered`: Cevaplanmadı (timeout)

**Karar Durumları (DecisionStatus):**
- `Pending`: Karar bekleniyor
- `Approved`: Onaylandı
- `Rejected`: Reddedildi
- `NoAnswer`: Cevaplanmadı (timeout)

**Önemli İş Kuralları:**
- **Single Active Appointment**: Customer ve FreeBarber aynı anda sadece bir aktif randevuya sahip olabilir
- **Store Single Active Call**: Store'un aynı anda sadece bir "call" (FreeBarber çağırma) randevusu olabilir
- **Distance Control**: Tüm katılımcılar birbirine maksimum 1 km mesafede olmalı (configurable)
- **Chair Overlap Prevention**: Aynı koltuk aynı zamanda birden fazla randevuya atanamaz
- **Working Hours Check**: Randevu saatleri işletmenin çalışma saatleri içinde olmalı
- **Pending Timeout**: Pending randevular 5 dakika içinde cevaplanmazsa otomatik "Unanswered" durumuna geçer

**Optimistic Concurrency:**
- `RowVersion` ile concurrency control
- Race condition'ları önlemek için unique index'ler

#### 3. Real-time Communication (SignalR)

**SignalR Hub**: `/hubs/app`

**Real-time Event'ler:**
- `badge.updated`: Bildirim/mesaj sayısı güncellemesi
- `notification.received`: Yeni bildirim
- `chat.message`: Yeni mesaj
- `chat.threadCreated`: Yeni sohbet thread'i
- `chat.threadUpdated`: Thread güncellemesi
- `chat.threadRemoved`: Thread kaldırılması
- `chat.typing`: Yazma göstergesi
- `appointment.updated`: Randevu durumu güncellemesi

**Kullanıcı Grupları:**
- Her kullanıcı `user:{userId}` grubuna ekleniyor
- Targeted notification'lar için kullanılıyor

#### 4. Background Services

**AppointmentTimeoutWorker:**
- Periyodik olarak (varsayılan: 300 saniye) pending randevuları kontrol eder
- Timeout olan randevuları `Unanswered` durumuna çevirir
- FreeBarber availability'sini serbest bırakır
- Notification'ları günceller ve SignalR ile push eder

#### 5. Entity Framework Configuration

**Önemli Index'ler:**
- **Appointment**: 
  - Unique index: (ChairId, AppointmentDate, StartTime, EndTime) + Status filter
  - Performance index'ler: (CustomerUserId, Status), (FreeBarberUserId, Status), (BarberStoreUserId, Status)
- **ChatThread**: 
  - Unique index: AppointmentId (nullable)
  - Composite index: (FavoriteFromUserId, FavoriteToUserId)
- **Notification**: (UserId, IsRead, CreatedAt)
- **FreeBarber**: (IsAvailable, Latitude, Longitude) - location-based queries için

**Row Versioning:**
- Appointment entity'de `RowVersion` ile optimistic concurrency

#### 6. Business Logic Services

**Ana Service'ler:**
- `IAppointmentService`: Randevu yönetimi
- `IAuthService`: Kimlik doğrulama
- `IBarberStoreService`: Berber dükkanı yönetimi
- `IFreeBarberService`: Serbest berber yönetimi
- `IChatService`: Mesajlaşma
- `INotificationService`: Bildirim yönetimi
- `IFavoriteService`: Favori yönetimi
- `IRatingService`: Değerlendirme sistemi
- `ISlotService`: Müsaitlik kontrolü
- `IBadgeService`: Badge sayıları (bildirim/mesaj)

**Transaction Management:**
- `[TransactionScopeAspect]` attribute ile transaction yönetimi
- Appointment oluşturma ve kritik işlemler transaction içinde

#### 7. API Controllers

**Controller'lar:**
- `AuthController`: Authentication (send-otp, verify-otp, refresh, revoke)
- `AppointmentController`: Randevu işlemleri
- `BarberStoreController`: Dükkan CRUD işlemleri
- `FreeBarberController`: Serbest berber CRUD işlemleri
- `ChatController`: Mesajlaşma
- `NotificationController`: Bildirimler
- `FavoriteController`: Favoriler
- `RatingController`: Değerlendirmeler
- `SlotController`: Müsaitlik sorguları
- `BadgeController`: Badge sayıları

**CORS Configuration:**
- Development: Tüm origin'lere izin
- Production: Belirtilen origin'lere izin

**Response Compression:**
- Brotli ve Gzip compression aktif

---

## 📱 Frontend Analizi (React Native/Expo)

### Mimari Yapı

```
hair-dresser-new-frontend/
├── app/                    # Expo Router (file-based routing)
│   ├── (auth)/            # Authentication screens
│   ├── (customertabs)/    # Customer tab navigation
│   ├── (freebarbertabs)/  # FreeBarber tab navigation
│   ├── (barberstoretabs)/ # BarberStore tab navigation
│   ├── (screens)/         # Shared screens
│   ├── components/        # Reusable components
│   ├── constants/         # App constants
│   ├── context/           # React Context providers
│   ├── hook/              # Custom React hooks
│   ├── lib/               # Library utilities
│   ├── store/             # Redux store
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── assets/                # Images, animations
└── global.css             # Tailwind CSS
```

### Teknoloji Stack

- **Framework**: React Native 0.81.5
- **Expo**: ~54.0.27
- **Routing**: Expo Router ~6.0.17
- **State Management**: Redux Toolkit (@reduxjs/toolkit) + RTK Query
- **UI Library**: React Native Paper 5.14.5
- **Styling**: NativeWind 4.2.1 (Tailwind CSS)
- **Form Management**: React Hook Form 7.64.0 + Zod 3.25.76
- **Real-time**: @microsoft/signalr 10.0.0
- **Maps**: react-native-maps 1.20.1
- **Animations**: 
  - Lottie (react-native) ~7.3.1
  - Moti ^0.30.0
  - react-native-reanimated ~4.1.1
- **Authentication**: JWT decode (jwt-decode)
- **Storage**: @react-native-async-storage/async-storage 2.2.0

### Önemli Özellikler

#### 1. Routing Yapısı

**File-based Routing (Expo Router):**

- `(auth)`: Giriş/Kayıt ekranları
- `(customertabs)`: Müşteri tab navigasyonu
  - Ana sayfa (store/freebarber listesi)
  - Randevular
  - Favoriler
  - Mesajlar
  - Profil
- `(freebarbertabs)`: Serbest berber tab navigasyonu
  - Panel (kendi bilgileri)
  - Randevular
  - Favoriler
  - Mesajlar
  - Profil
- `(barberstoretabs)`: Berber dükkanı tab navigasyonu
  - Panel (dükkan yönetimi)
  - Randevular
  - Favoriler
  - Mesajlar
  - Profil

**Dynamic Routing:**
- Kullanıcı tipine göre otomatik yönlendirme (`index.tsx`)
- Token durumuna göre auth/ana sayfa geçişi

#### 2. State Management (Redux Toolkit + RTK Query)

**Store Yapısı:**
- `api.tsx`: RTK Query API slice (tüm endpoint'ler)
- `baseQuery.tsx`: Custom base query (token refresh, error handling)
- `redux-store.tsx`: Redux store configuration

**RTK Query Features:**
- Otomatik cache yönetimi
- Tag-based invalidation
- Optimistic updates
- Automatic refetch on reconnect/focus

**API Tags:**
```typescript
tagTypes: [
  'MineStores',
  'GetStoreById',
  'MineFreeBarberPanel',
  'Badge',
  'Notification',
  'Chat',
  'Appointment',
  'Favorite',
  'IsFavorite',
  'StoreForUsers',
  'FreeBarberForUsers'
]
```

#### 3. Authentication

**Token Management:**
- `tokenStore.tsx`: In-memory token store (reactive)
- `tokenStorage.tsx`: AsyncStorage persistence
- `useAuth.tsx`: Custom hook (JWT decode, user info)

**Token Refresh:**
- Otomatik refresh (baseQuery'de)
- Refresh token rotation
- Token expiration kontrolü

**User Type Detection:**
- JWT içinden userType okuma
- Dynamic routing based on userType

#### 4. Real-time Communication (SignalR)

**useSignalR Hook:**
- SignalR connection management
- Automatic reconnection (exponential backoff)
- Event handlers:
  - `badge.updated`: Badge count güncelleme
  - `notification.received`: Yeni bildirim (duplicate prevention)
  - `chat.message`: Mesaj güncelleme
  - `chat.threadCreated/Updated/Removed`: Thread yönetimi
  - `appointment.updated`: Randevu durumu güncelleme

**RTK Query Integration:**
- SignalR event'leri RTK Query cache'ini günceller
- Optimistic updates
- Automatic cache invalidation

#### 5. Custom Hooks

**Önemli Hooks:**
- `useAuth`: Authentication state ve user info
- `useSignalR`: SignalR connection management
- `useAppointmentBooking`: Randevu rezervasyon mantığı
- `useAppointmentPricing`: Fiyatlandırma hesaplamaları
- `useNearby`: Yakındaki store/freebarber sorguları
- `useSnackbar`: Snackbar notifications

#### 6. Component Architecture

**Component Kategorileri:**
- **appointment/**: Randevu ile ilgili component'ler
- **chat/**: Mesajlaşma component'leri
- **common/**: Ortak UI component'leri
- **customer/**: Müşteri özel component'ler
- **freebarber/**: Serbest berber component'leri
- **store/**: Dükkan yönetimi component'leri
- **rating/**: Değerlendirme component'leri
- **favorites/**: Favoriler listesi

**UI Patterns:**
- Bottom Sheet Modals (@gorhom/bottom-sheet)
- Loading Skeletons
- Empty States (Lottie animations)
- Error Boundaries
- Map Pickers

#### 7. Form Management

**React Hook Form + Zod:**
- Form validation (Zod schemas)
- Type-safe form handling
- Error messages (i18n ready)
- Complex nested forms (randevu rezervasyonu, store/freebarber oluşturma)

#### 8. Location Services

**Features:**
- GPS konum erişimi (expo-location)
- Konum izni yönetimi
- Harita entegrasyonu (react-native-maps)
- Yakındaki store/freebarber sorguları
- Konum bazlı filtreleme

#### 9. Type Safety

**TypeScript Configuration:**
- Strict mode aktif
- Kapsamlı type definitions (`types/` klasörü)
- Backend DTO'lar ile senkronize type'lar

**Type Categories:**
- `auth.ts`: Authentication types
- `appointment.ts`: Randevu types
- `chat.ts`: Mesajlaşma types
- `notification.ts`: Bildirim types
- `store.ts`: Dükkan types
- `freebarber.ts`: Serbest berber types
- `rating.ts`: Değerlendirme types
- `favorite.ts`: Favori types

---

## 🔄 Backend-Frontend Entegrasyonu

### API Communication

**Base URL Configuration:**
```typescript
BASE_URL: 'http://192.168.1.107:5149/api/'
SIGNALR_HUB_URL: 'http://192.168.1.107:5149/hubs/app'
```

**Request/Response Format:**
- **Request**: camelCase (System.Text.Json camelCase converter)
- **Response**: camelCase (consistent naming)
- **Error Handling**: Standardized error responses

**Authentication Flow:**
1. User sends phone number → `POST /api/Auth/send-otp`
2. User enters OTP → `POST /api/Auth/verify-otp` → AccessToken + RefreshToken
3. Token stored in memory + AsyncStorage
4. All subsequent requests include `Authorization: Bearer {token}`
5. Token refresh on 401 (automatic in baseQuery)

### Real-time Synchronization

**SignalR Events → RTK Query Cache:**
- `badge.updated` → Updates badge count cache
- `notification.received` → Adds/updates notification list
- `chat.message` → Updates message list + thread list
- `appointment.updated` → Updates appointment lists (all filters)

**Optimistic Updates:**
- Appointment creation → Immediate UI update
- Decision actions → Immediate status change
- Cache invalidation ensures data consistency

---

## 🗄️ Veri Modeli (Database)

### Ana Entity'ler

#### User
- Kullanıcı bilgileri
- Şifrelenmiş telefon numarası
- UserType (Customer/FreeBarber/BarberStore)

#### Appointment
- Randevu bilgileri
- İlişkili kullanıcılar (Customer, FreeBarber, BarberStore)
- Durum yönetimi (Status, StoreDecision, FreeBarberDecision)
- Zaman yönetimi (PendingExpiresAt)
- Concurrency (RowVersion)

#### BarberStore
- Dükkan bilgileri
- Lokasyon (Latitude, Longitude)
- Fiyatlandırma (PricingType, PricingValue)
- İşletme sahibi (BarberStoreOwnerId)

#### FreeBarber
- Serbest berber bilgileri
- Lokasyon (Latitude, Longitude)
- Müsaitlik durumu (IsAvailable)
- Sertifika dosyası

#### BarberStoreChair
- Dükkan koltuğu
- Manuel barber ataması (opsiyonel)
- Store'a bağlı

#### ChatThread & ChatMessage
- Mesajlaşma sistemi
- Appointment bazlı veya favori bazlı thread'ler
- Unread message tracking

#### Notification
- Bildirimler
- Type-based notification'lar
- JSON payload ile genişletilebilir yapı

#### Favorite
- Favori store/freebarber
- Active/Passive durumları

#### Rating
- Değerlendirme sistemi
- Manuel barber rating'leri

---

## 🔒 Güvenlik

### Backend Güvenlik

1. **JWT Authentication**
   - Access token expiration: 30 dakika
   - Refresh token expiration: 30 gün
   - Token rotation mekanizması

2. **Phone Number Encryption**
   - AES encryption (phone number)
   - Search token (hash-based) for queries
   - Nonce for encryption

3. **Refresh Token Security**
   - Fingerprint-based tracking
   - Family-based management
   - Reuse detection (automatic family revoke)

4. **Authorization**
   - Role-based access control
   - User type-based permissions
   - Resource ownership validation

5. **SQL Injection Prevention**
   - Entity Framework (parameterized queries)
   - Input validation (FluentValidation)

6. **CORS**
   - Development: Open
   - Production: Restricted origins

### Frontend Güvenlik

1. **Token Storage**
   - Secure storage (AsyncStorage - not ideal for production)
   - In-memory token store
   - Token refresh on expiration

2. **API Security**
   - HTTPS (production)
   - Token-based authentication
   - Automatic token refresh

3. **Input Validation**
   - Client-side validation (Zod)
   - Server-side validation (FluentValidation)

---

## 📊 Performans Optimizasyonları

### Backend

1. **Database Indexes**
   - Appointment queries için özel index'ler
   - Location-based queries için spatial index'ler
   - Status-based filtering için filtered index'ler

2. **Query Optimization**
   - Include() ile eager loading
   - Select projections (sadece gerekli alanlar)
   - Pagination (gerekli yerlerde)

3. **Caching**
   - RTK Query cache (frontend)
   - SignalR ile real-time updates

4. **Background Processing**
   - Appointment timeout worker (asenkron)
   - SignalR push notifications (asenkron)

### Frontend

1. **RTK Query Caching**
   - Automatic cache management
   - Tag-based invalidation
   - Optimistic updates

2. **Component Optimization**
   - React.memo (where needed)
   - useMemo/useCallback hooks
   - Lazy loading (Expo Router)

3. **Image Optimization**
   - Expo Image optimization
   - Lazy loading images

4. **Network Optimization**
   - Request debouncing
   - Batch updates (SignalR)
   - Request cancellation (AbortController)

---

## 🧪 Test Durumu

**Not:** Projede test dosyaları görünmüyor. Test stratejisi eklenebilir:

- **Backend**: xUnit, NUnit (unit tests)
- **Frontend**: Jest, React Native Testing Library
- **Integration**: API integration tests
- **E2E**: Detox, Appium

---

## 📝 Öneriler ve İyileştirmeler

### Backend

1. **Logging**
   - Structured logging (Serilog)
   - Request/Response logging middleware
   - Error tracking (Sentry, Application Insights)

2. **Monitoring**
   - Health checks
   - Performance metrics
   - Database query monitoring

3. **Testing**
   - Unit tests (Business logic)
   - Integration tests (API endpoints)
   - Load testing (SignalR connections)

4. **Documentation**
   - Swagger/OpenAPI documentation (mevcut)
   - API documentation improvement
   - Architecture decision records (ADR)

5. **Security**
   - Rate limiting
   - Request validation middleware
   - Security headers

### Frontend

1. **Error Handling**
   - Global error boundary
   - Network error handling
   - Offline mode support

2. **Performance**
   - Code splitting
   - Image lazy loading
   - List virtualization (FlatList optimizations)

3. **Testing**
   - Unit tests (hooks, utils)
   - Component tests
   - E2E tests (Detox)

4. **UX Improvements**
   - Loading states
   - Skeleton screens (mevcut)
   - Pull-to-refresh
   - Infinite scroll

5. **Accessibility**
   - Screen reader support
   - Touch target sizes
   - Color contrast

---

## 🎯 Sonuç

Bu proje, modern yazılım geliştirme prensipleri kullanılarak geliştirilmiş, ölçeklenebilir bir berber randevu yönetim sistemidir. Backend ve frontend arasında güçlü bir entegrasyon vardır ve real-time communication ile kullanıcı deneyimi zenginleştirilmiştir.

**Güçlü Yönler:**
- ✅ Clean Architecture
- ✅ Type-safe code (C# + TypeScript)
- ✅ Real-time communication
- ✅ Comprehensive business logic
- ✅ Modern UI/UX

**Geliştirilebilir Alanlar:**
- ⚠️ Test coverage
- ⚠️ Error handling/documentation
- ⚠️ Monitoring/logging
- ⚠️ Security hardening (production için)

---

**Rapor Tarihi:** 2024
**Proje Durumu:** Aktif Geliştirme

