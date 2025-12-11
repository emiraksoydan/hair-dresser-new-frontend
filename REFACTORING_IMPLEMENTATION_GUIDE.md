# 🚀 Refaktör Uygulama Rehberi

## ✅ Tamamlanan İyileştirmeler

### 1. Güvenlik İyileştirmeleri
- ✅ **CORS Konfigürasyonu**: Development ve Production için ayrı ayarlar
- ✅ **SecuredOperation**: Mantık hatası düzeltildi, dependency injection eklendi
- ✅ **HTTPS Redirection**: Production'da aktif
- ✅ **JWT Token Expiration**: 5 dakikadan 30 dakikaya çıkarıldı
- ✅ **Secrets Management**: appsettings.json'dan development secrets kaldırıldı

### 2. Kod Tekrarı Azaltma
- ✅ **useAuth Hook**: JWT decode logic merkezileştirildi
- ✅ **Logger Utility**: Console.log'lar merkezi logger'a taşındı
- ✅ **ChatDetailScreen Component**: Ortak mesaj detay component'i oluşturuldu
- ✅ **Constants Dosyaları**: Magic numbers/strings merkezileştirildi

### 3. Performans İyileştirmeleri
- ✅ **SignalR Hook**: Root layout'ta bir kez çağrılıyor
- ✅ **RTK Query Cache**: keepUnusedDataFor değerleri optimize edildi

### 4. Console.log Temizliği
- ✅ Tüm console.log'lar logger utility'ye taşındı
- ✅ Production'da sadece error'lar loglanıyor

---

## 📋 Yapılması Gerekenler (Manuel)

### 1. Mesaj Detay Sayfalarını Birleştir

**Dosyalar:**
- `app/(customertabs)/(messages)/[id].tsx`
- `app/(barberstoretabs)/(messages)/(details)/[id].tsx`
- `app/(freebarbertabs)/(messages)/[id].tsx`

**Yapılacak:**
```typescript
// Her üç dosyayı da şu şekilde değiştir:
import { ChatDetailScreen } from '../../components/chat/ChatDetailScreen';
import { useLocalSearchParams } from 'expo-router';

export default function ChatDetailPage() {
    const { id: appointmentId } = useLocalSearchParams<{ id: string }>();
    return <ChatDetailScreen appointmentId={appointmentId!} />;
}
```

### 2. Backend - Unit of Work Pattern

**Dosya:** `Core/DataAccess/EntityFramework/EfEntityRepositoryBase.cs`

**Sorun:** Her işlemde SaveChangesAsync çağrılıyor

**Çözüm:**
```csharp
// 1. IUnitOfWork interface oluştur
public interface IUnitOfWork : IDisposable
{
    IAppointmentDal Appointments { get; }
    IBarberStoreDal BarberStores { get; }
    // ... diğer DAL'lar
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}

// 2. UnitOfWork implementasyonu
public class UnitOfWork : IUnitOfWork
{
    private readonly DatabaseContext _context;
    private IDbContextTransaction? _transaction;
    
    public IAppointmentDal Appointments { get; }
    public IBarberStoreDal BarberStores { get; }
    // ...
    
    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
    
    public async Task BeginTransactionAsync()
    {
        _transaction = await _context.Database.BeginTransactionAsync();
    }
    
    public async Task CommitTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }
    
    public async Task RollbackTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }
}

// 3. EfEntityRepositoryBase'i güncelle
public class EfEntityRepositoryBase<TEntity, TContext> : IEntityRepository<TEntity>
    where TEntity : class, IEntity
    where TContext : DbContext
{
    protected readonly TContext Context;
    
    public EfEntityRepositoryBase(TContext context)
    {
        Context = context;
    }
    
    // SaveChangesAsync çağrılarını kaldır
    public async Task Add(TEntity entity)
    {
        await Context.Set<TEntity>().AddAsync(entity);
        // SaveChangesAsync kaldırıldı - UnitOfWork'te yapılacak
    }
    
    // Diğer metodlarda da aynı şekilde
}
```

### 3. Backend - Service Locator Kaldırma

**Dosya:** `Core/Utilities/IoC/ServiceTool.cs`

**Sorun:** Service Locator anti-pattern

**Çözüm:**
1. `ServiceTool` kullanımlarını bul:
```bash
grep -r "ServiceTool" --include="*.cs"
```

2. Her kullanımı constructor injection'a çevir:
```csharp
// ÖNCE:
_httpContextAccessor = ServiceTool.ServiceProvider.GetService<IHttpContextAccessor>();

// SONRA:
public SecuredOperation(string roles, IHttpContextAccessor httpContextAccessor)
{
    _roles = roles.Split(',');
    _httpContextAccessor = httpContextAccessor;
}
```

3. `ServiceTool.cs` dosyasını sil

### 4. Backend - Custom Exception Types

**Dosya:** `Core/Exceptions/` (yeni klasör)

**Oluştur:**
```csharp
// Core/Exceptions/BusinessException.cs
namespace Core.Exceptions
{
    public class BusinessException : Exception
    {
        public BusinessException(string message) : base(message) { }
    }
    
    public class UnauthorizedOperationException : Exception
    {
        public UnauthorizedOperationException(string message) : base(message) { }
    }
    
    public class EntityNotFoundException : Exception
    {
        public EntityNotFoundException(string entityName, object id) 
            : base($"{entityName} with id {id} not found") { }
    }
    
    public class ValidationException : Exception
    {
        public ValidationException(string message) : base(message) { }
    }
}
```

**Kullanım:**
```csharp
// ÖNCE:
throw new Exception("İşleme yetkiniz bulunmamaktadır");

// SONRA:
throw new UnauthorizedOperationException("İşleme yetkiniz bulunmamaktadır");
```

### 5. Backend - Error Messages Resource

**Dosya:** `Business/Resources/Messages.cs`

**Oluştur:**
```csharp
namespace Business.Resources
{
    public static class Messages
    {
        // Appointment
        public const string AppointmentNotFound = "Randevu bulunamadı";
        public const string AppointmentExpired = "Randevu süresi dolmuş";
        public const string AppointmentAlreadyCompleted = "Randevu zaten tamamlanmış";
        
        // Authorization
        public const string Unauthorized = "Yetki yok";
        public const string UnauthorizedOperation = "İşleme yetkiniz bulunmamaktadır";
        
        // Validation
        public const string InvalidDate = "Geçersiz tarih";
        public const string InvalidTime = "Geçersiz saat";
        
        // Store
        public const string StoreNotFound = "Dükkan bulunamadı";
        public const string ChairNotFound = "Koltuk bulunamadı";
        
        // FreeBarber
        public const string FreeBarberNotFound = "Serbest berber bulunamadı";
        public const string FreeBarberNotAvailable = "Serbest berber şu an müsait değil";
    }
}
```

**Kullanım:**
```csharp
// ÖNCE:
return new ErrorResult("Randevu bulunamadı");

// SONRA:
return new ErrorResult(Messages.AppointmentNotFound);
```

### 6. Frontend - API Base URL Configuration

**Dosya:** `app/constants/api.ts` (zaten oluşturuldu)

**Kullanım:**
```typescript
// app/store/baseQuery.tsx
import { API_CONFIG } from '../constants/api';

export const API = API_CONFIG.BASE_URL;
```

### 7. Frontend - Error Boundary

**Dosya:** `app/components/ErrorBoundary.tsx`

**Oluştur:**
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { logger } from '../utils/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('ErrorBoundary caught an error:', error, errorInfo);
        // TODO: Send to error tracking service (Sentry, etc.)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View className="flex-1 bg-[#151618] items-center justify-center p-4">
                    <Text className="text-white text-xl font-bold mb-4">
                        Bir hata oluştu
                    </Text>
                    <Text className="text-gray-400 text-center mb-4">
                        {this.state.error?.message || 'Beklenmeyen bir hata meydana geldi'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => this.setState({ hasError: false, error: undefined })}
                        className="bg-green-600 px-6 py-3 rounded-lg"
                    >
                        <Text className="text-white font-semibold">Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}
```

**Kullanım:**
```typescript
// app/_layout.tsx
import { ErrorBoundary } from './components/ErrorBoundary';

export default function RootLayout() {
    return (
        <ErrorBoundary>
            <Stack>
                {/* ... */}
            </Stack>
        </ErrorBoundary>
    );
}
```

### 8. Backend - Response Compression

**Dosya:** `Api/Program.cs`

**Ekleyin:**
```csharp
// builder.Services.AddResponseCompression ekleyin
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Optimal;
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Optimal;
});

// app.UseResponseCompression() ekleyin (UseCors'tan önce)
app.UseResponseCompression();
app.UseCors();
```

### 9. Backend - Rate Limiting

**Dosya:** `Api/Program.cs`

**Ekleyin:**
```csharp
// NuGet: Microsoft.AspNetCore.RateLimiting

builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.Identity?.Name ?? httpContext.Request.Headers.Host.ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));
    
    // Auth endpoint için daha sıkı limit
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// app.UseRateLimiter() ekleyin
app.UseRateLimiter();
```

**Controller'da kullanım:**
```csharp
[EnableRateLimiting("auth")]
[HttpPost("send-otp")]
public async Task<IActionResult> SendOtp(...)
```

### 10. Backend - Caching (Redis)

**Dosya:** `Api/Program.cs`

**Ekleyin:**
```csharp
// NuGet: Microsoft.Extensions.Caching.StackExchangeRedis

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "HairDresser:";
});
```

**appsettings.json:**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "...",
    "Redis": "localhost:6379"
  }
}
```

**Kullanım:**
```csharp
public class AppointmentManager
{
    private readonly IMemoryCache _cache;
    
    public async Task<IDataResult<List<ChairSlotDto>>> GetAvailibity(...)
    {
        var cacheKey = $"availability:{storeId}:{dateOnly}";
        
        if (_cache.TryGetValue(cacheKey, out List<ChairSlotDto>? cached))
        {
            return new SuccessDataResult<List<ChairSlotDto>>(cached!);
        }
        
        var result = await appointmentDal.GetAvailibilitySlot(...);
        
        _cache.Set(cacheKey, result, TimeSpan.FromMinutes(5));
        
        return new SuccessDataResult<List<ChairSlotDto>>(result);
    }
}
```

---

## 🔧 Yapılandırma Dosyaları

### Backend - appsettings.Production.json

**Oluştur:**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=PROD_SERVER;Database=HairDresser;..."
  },
  "TokenOptions": {
    "AccessTokenExpiration": 30
  },
  "AllowedOrigins": [
    "https://yourdomain.com",
    "https://app.yourdomain.com"
  ],
  "Twilio": {
    "AccountSid": "",
    "AuthToken": "",
    "VerifyServiceSid": ""
  }
}
```

**Not:** Production secrets'ları Azure Key Vault veya benzeri bir serviste saklayın.

### Frontend - Environment Variables

**Dosya:** `app/config/env.ts`

**Oluştur:**
```typescript
export const ENV = {
    API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.101:5149/api/',
    SIGNALR_HUB_URL: process.env.EXPO_PUBLIC_SIGNALR_URL || 'http://192.168.1.35:5000/hubs/app',
    IS_DEV: __DEV__,
} as const;
```

**Kullanım:**
```typescript
// app/store/baseQuery.tsx
import { ENV } from '../config/env';

export const API = ENV.API_BASE_URL;
```

---

## 📊 Test Coverage

### Backend - Unit Tests

**Proje:** `Business.Tests` (yeni proje)

**Örnek:**
```csharp
[Fact]
public async Task CreateAppointment_ShouldReturnError_WhenCustomerHasPendingAppointment()
{
    // Arrange
    var mockAppointmentDal = new Mock<IAppointmentDal>();
    mockAppointmentDal.Setup(x => x.AnyAsync(It.IsAny<Expression<Func<Appointment, bool>>>()))
        .ReturnsAsync(true);
    
    var manager = new AppointmentManager(mockAppointmentDal.Object, ...);
    
    // Act
    var result = await manager.CreateCustomerToStoreAndFreeBarberControlAsync(...);
    
    // Assert
    Assert.False(result.Success);
    Assert.Contains("aktif", result.Message);
}
```

### Frontend - Component Tests

**Dosya:** `app/components/__tests__/ChatDetailScreen.test.tsx`

**Örnek:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ChatDetailScreen } from '../chat/ChatDetailScreen';

describe('ChatDetailScreen', () => {
    it('should render empty state when no messages', () => {
        render(<ChatDetailScreen appointmentId="test-id" />);
        expect(screen.getByText('Henüz mesaj yok')).toBeTruthy();
    });
});
```

---

## 🎯 Öncelik Sırası

1. **Hemen Yapılmalı:**
   - ✅ Güvenlik düzeltmeleri (tamamlandı)
   - Mesaj detay sayfalarını birleştir
   - Service Locator kaldır

2. **Yakın Zamanda:**
   - Unit of Work pattern
   - Custom exception types
   - Error messages resource

3. **İyileştirme:**
   - Response compression
   - Rate limiting
   - Redis caching
   - Error boundary
   - Test coverage

---

## 📝 Notlar

- Tüm değişiklikler backward compatible olmalı
- Her değişiklikten sonra test edin
- Git commit'lerini küçük tutun
- Production'a deploy etmeden önce staging'de test edin

