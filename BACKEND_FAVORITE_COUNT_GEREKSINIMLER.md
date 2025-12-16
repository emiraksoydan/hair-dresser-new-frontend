# Backend Favorite Count Gereksinimleri

## Sorun Özeti

**Frontend'de:** Favori count stabil değil - dükkan iken berberi beğeniyor, 1 oluyor, sonra 0 oluyor, sonra tekrar 1 oluyor.

**Neden:** Optimistic update ile cache invalidation çakışıyor. Frontend'de düzeltme yapıldı (optimistic update kaldırıldı), şimdi backend'den gelen değer kullanılıyor.

## Frontend'de Yapılan Düzeltmeler

1. ✅ **Optimistic Update Kaldırıldı:** `favoriteCount` için optimistic update yapılmıyor, backend'den gelen değer bekleniyor
2. ✅ **Cache Öncelikli:** Cache'den gelen `favoriteCount` değeri her zaman kullanılıyor
3. ✅ **Toggle Flag Yönetimi:** Cache güncellemesi geldiğinde `isToggling` flag'i otomatik false yapılıyor

## Backend'de Olması Gerekenler

### 1. ToggleFavoriteAsync Metodu (FavoriteManager.cs)

#### FavoriteCount Güncellemesi
```csharp
public async Task<IDataResult<bool>> ToggleFavoriteAsync(ToggleFavoriteDto dto, Guid userId)
{
    // Mevcut favori kaydını kontrol et
    var existingFavorite = await _favoriteDal.Get(x => 
        x.FavoritedFromUserId == userId && 
        x.FavoritedToId == favoritedToId
    );

    if (existingFavorite != null)
    {
        // Favori zaten var - toggle yap (aktif/pasif)
        existingFavorite.IsActive = !existingFavorite.IsActive;
        await _favoriteDal.UpdateAsync(existingFavorite);
        
        // ÖNEMLİ: FavoriteCount'u güncelle
        await UpdateFavoriteCountAsync(favoritedToId, existingFavorite.IsActive ? 1 : -1);
    }
    else
    {
        // Yeni favori ekle
        var newFavorite = new Favorite
        {
            FavoritedFromUserId = userId,
            FavoritedToId = favoritedToId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await _favoriteDal.AddAsync(newFavorite);
        
        // ÖNEMLİ: FavoriteCount'u güncelle
        await UpdateFavoriteCountAsync(favoritedToId, 1);
    }
    
    // Thread oluştur/güncelle
    // ... (mevcut kod)
    
    return new SuccessDataResult<bool>(true);
}

private async Task UpdateFavoriteCountAsync(Guid targetId, int delta)
{
    // Store için
    var store = await _barberStoreDal.Get(x => x.Id == targetId);
    if (store != null)
    {
        store.FavoriteCount = Math.Max(0, store.FavoriteCount + delta);
        await _barberStoreDal.UpdateAsync(store);
        return;
    }
    
    // FreeBarber için
    var freeBarber = await _freeBarberDal.Get(x => x.Id == targetId);
    if (freeBarber != null)
    {
        freeBarber.FavoriteCount = Math.Max(0, freeBarber.FavoriteCount + delta);
        await _freeBarberDal.UpdateAsync(freeBarber);
        return;
    }
    
    // Customer için (eğer gerekirse)
    // Customer'lar için favoriteCount tutulmuyor olabilir, kontrol et
}
```

### 2. GetNearbyStores ve GetNearbyFreeBarbers Metodları

#### FavoriteCount'un Doğru Döndürülmesi
```csharp
// Store için
public async Task<IDataResult<List<BarberStoreGetDto>>> GetNearbyStoresAsync(NearbyRequest request)
{
    var stores = await _barberStoreDal.GetAll(x => 
        // ... location filter
    );
    
    // ÖNEMLİ: FavoriteCount'u direkt store'dan al (güncel değer)
    var dtos = stores.Select(s => new BarberStoreGetDto
    {
        Id = s.Id,
        StoreName = s.StoreName,
        FavoriteCount = s.FavoriteCount, // Store entity'den direkt al
        // ... diğer alanlar
    }).ToList();
    
    return new SuccessDataResult<List<BarberStoreGetDto>>(dtos);
}

// FreeBarber için
public async Task<IDataResult<List<FreeBarGetDto>>> GetNearbyFreeBarbersAsync(NearbyRequest request)
{
    var freeBarbers = await _freeBarberDal.GetAll(x => 
        // ... location filter
    );
    
    // ÖNEMLİ: FavoriteCount'u direkt freeBarber'dan al (güncel değer)
    var dtos = freeBarbers.Select(fb => new FreeBarGetDto
    {
        Id = fb.Id,
        FullName = fb.FullName,
        FavoriteCount = fb.FavoriteCount, // FreeBarber entity'den direkt al
        // ... diğer alanlar
    }).ToList();
    
    return new SuccessDataResult<List<FreeBarGetDto>>(dtos);
}
```

### 3. GetStoreById ve GetFreeBarberById Metodları

#### FavoriteCount'un Doğru Döndürülmesi
```csharp
// Store için
public async Task<IDataResult<BarberStoreDetail>> GetStoreByIdAsync(Guid storeId)
{
    var store = await _barberStoreDal.Get(x => x.Id == storeId);
    if (store == null)
        return new ErrorDataResult<BarberStoreDetail>("Store bulunamadı");
    
    // ÖNEMLİ: FavoriteCount'u direkt store'dan al
    var dto = new BarberStoreDetail
    {
        Id = store.Id,
        StoreName = store.StoreName,
        FavoriteCount = store.FavoriteCount, // Store entity'den direkt al
        // ... diğer alanlar
    };
    
    return new SuccessDataResult<BarberStoreDetail>(dto);
}

// FreeBarber için
public async Task<IDataResult<FreeBarberPanelDto>> GetFreeBarberByIdAsync(Guid freeBarberId)
{
    var freeBarber = await _freeBarberDal.Get(x => x.Id == freeBarberId);
    if (freeBarber == null)
        return new ErrorDataResult<FreeBarberPanelDto>("FreeBarber bulunamadı");
    
    // ÖNEMLİ: FavoriteCount'u direkt freeBarber'dan al
    var dto = new FreeBarberPanelDto
    {
        Id = freeBarber.Id,
        FullName = freeBarber.FullName,
        FavoriteCount = freeBarber.FavoriteCount, // FreeBarber entity'den direkt al
        // ... diğer alanlar
    };
    
    return new SuccessDataResult<FreeBarberPanelDto>(dto);
}
```

### 4. GetMineStores ve GetFreeBarberMinePanel Metodları

#### FavoriteCount'un Doğru Döndürülmesi
```csharp
// Store için
public async Task<IDataResult<List<BarberStoreMineDto>>> GetMineStoresAsync(Guid userId)
{
    var stores = await _barberStoreDal.GetAll(x => x.BarberStoreOwnerId == userId);
    
    // ÖNEMLİ: FavoriteCount'u direkt store'dan al
    var dtos = stores.Select(s => new BarberStoreMineDto
    {
        Id = s.Id,
        StoreName = s.StoreName,
        FavoriteCount = s.FavoriteCount, // Store entity'den direkt al
        // ... diğer alanlar
    }).ToList();
    
    return new SuccessDataResult<List<BarberStoreMineDto>>(dtos);
}

// FreeBarber için
public async Task<IDataResult<FreeBarberPanelDto>> GetFreeBarberMinePanelAsync(Guid userId)
{
    var freeBarber = await _freeBarberDal.Get(x => x.FreeBarberUserId == userId);
    if (freeBarber == null)
        return new ErrorDataResult<FreeBarberPanelDto>("FreeBarber bulunamadı");
    
    // ÖNEMLİ: FavoriteCount'u direkt freeBarber'dan al
    var dto = new FreeBarberPanelDto
    {
        Id = freeBarber.Id,
        FullName = freeBarber.FullName,
        FavoriteCount = freeBarber.FavoriteCount, // FreeBarber entity'den direkt al
        // ... diğer alanlar
    };
    
    return new SuccessDataResult<FreeBarberPanelDto>(dto);
}
```

### 5. Transaction Yönetimi

#### FavoriteCount Güncellemesi Transaction İçinde Olmalı
```csharp
public async Task<IDataResult<bool>> ToggleFavoriteAsync(ToggleFavoriteDto dto, Guid userId)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        // Favori kaydını toggle yap
        // ... (mevcut kod)
        
        // ÖNEMLİ: FavoriteCount'u güncelle (transaction içinde)
        await UpdateFavoriteCountAsync(favoritedToId, delta);
        
        // Transaction'ı commit et
        await transaction.CommitAsync();
        
        return new SuccessDataResult<bool>(true);
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

### 6. Race Condition Önleme

#### Concurrent Toggle İşlemleri İçin
```csharp
// ÖNEMLİ: Aynı anda birden fazla toggle işlemi yapılırsa race condition olmamalı
// Database constraint veya lock kullanılmalı

// Örnek: Database constraint
// Favorite tablosunda: UNIQUE (FavoritedFromUserId, FavoritedToId)

// Veya: Pessimistic lock
var existingFavorite = await _favoriteDal.GetWithLock(x => 
    x.FavoritedFromUserId == userId && 
    x.FavoritedToId == favoritedToId
);
```

## Özet - Backend'de Yapılması Gerekenler

1. ✅ **ToggleFavoriteAsync:** FavoriteCount'u mutlaka güncellemeli (`UpdateFavoriteCountAsync` metodu)
2. ✅ **GetNearbyStores/FreeBarbers:** FavoriteCount'u direkt entity'den almalı (hesaplama yapmamalı)
3. ✅ **GetStoreById/FreeBarberById:** FavoriteCount'u direkt entity'den almalı
4. ✅ **GetMineStores/FreeBarberMinePanel:** FavoriteCount'u direkt entity'den almalı
5. ✅ **Transaction:** FavoriteCount güncellemesi transaction içinde olmalı
6. ✅ **Race Condition:** Concurrent toggle işlemleri için lock veya constraint kullanılmalı
7. ✅ **Cache Invalidation:** Frontend'deki cache tag'leri doğru invalidate edilmeli

## Test Senaryoları

1. **Dükkan → FreeBarber Favorileme:**
   - FreeBarber'ın favoriteCount'u +1 olmalı ✅
   - Cache invalidation sonrası güncel değer görünmeli ✅
   - Tekrar toggle yapınca -1 olmalı ✅

2. **FreeBarber → Store Favorileme:**
   - Store'un favoriteCount'u +1 olmalı ✅
   - Cache invalidation sonrası güncel değer görünmeli ✅
   - Tekrar toggle yapınca -1 olmalı ✅

3. **Concurrent Toggle:**
   - Aynı anda birden fazla toggle işlemi yapılırsa race condition olmamalı ✅
   - FavoriteCount doğru güncellenmeli ✅

4. **Cache Invalidation:**
   - Toggle sonrası tüm ilgili query'ler invalidate edilmeli ✅
   - NEARBY, LIST, ve spesifik ID tag'leri invalidate edilmeli ✅
