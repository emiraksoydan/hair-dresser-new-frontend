# Backend Gereksinimleri - Favori ve Chat Thread Yönetimi

## Sorun Özeti

1. **Müşteri dükkanı beğendiğinde**, berber tarafında chat thread görünmüyor
2. **Favoriyi kaldırdığında**, thread kaldırılmıyor (her iki tarafta da)
3. **SignalR event'leri** her iki tarafa da gönderilmiyor
4. **ID tutarsızlıkları** olabilir (Store ID vs Store Owner User ID)

## Frontend'de Kullanılan ID'ler

### Store Favorileme
- **Frontend gönderiyor:** `store.id` (Store Entity ID)
- **Kullanıldığı yerler:**
  - `storecard.tsx`: `targetId: store.id`
  - `sharedappointment.tsx`: `targetId: item.barberStoreId` (Store Entity ID)

### FreeBarber Favorileme
- **Frontend gönderiyor:** `freeBarber.id` (FreeBarber Entity ID)
- **Kullanıldığı yerler:**
  - `freebarbercard.tsx`: `targetId: freeBarber.id`
  - `sharedappointment.tsx`: `targetId: item.freeBarberId` (FreeBarber Entity ID)

### Customer Favorileme
- **Frontend gönderiyor:** `item.customerUserId` (Customer User ID)
- **Kullanıldığı yerler:**
  - `sharedappointment.tsx`: `targetId: item.customerUserId`

## Backend'de Olması Gerekenler

### 1. `ToggleFavoriteAsync` Metodu (FavoriteManager.cs)

#### Store Favorileme İşlemi
```csharp
// Frontend'den gelen targetId = Store Entity ID
var store = await _barberStoreDal.Get(x => x.Id == dto.TargetId);

if (store != null) {
    favoritedToId = store.Id; // Store Entity ID (favori kaydı için)
    targetUserIdForThread = store.BarberStoreOwnerId; // Store Owner User ID (thread için)
    
    // Thread oluştur/güncelle
    await _chatService.EnsureFavoriteThreadAsync(userId, targetUserIdForThread);
    
    // ÖNEMLİ: Her iki tarafa da SignalR event gönder
    // 1. Yapan taraf (userId)
    // 2. Karşı taraf (targetUserIdForThread = store.BarberStoreOwnerId)
    var threadDto = await GetThreadDtoAsync(userId, targetUserIdForThread);
    await realtime.PushChatThreadCreatedAsync(userId, threadDto);
    await realtime.PushChatThreadCreatedAsync(targetUserIdForThread, threadDto);
}
```

#### FreeBarber Favorileme İşlemi
```csharp
// Frontend'den gelen targetId = FreeBarber Entity ID
var freeBarber = await _freeBarberDal.Get(x => x.Id == dto.TargetId);

if (freeBarber != null) {
    favoritedToId = freeBarber.FreeBarberUserId; // FreeBarber User ID (favori kaydı için)
    targetUserIdForThread = freeBarber.FreeBarberUserId; // FreeBarber User ID (thread için)
    
    // Thread oluştur/güncelle
    await _chatService.EnsureFavoriteThreadAsync(userId, targetUserIdForThread);
    
    // ÖNEMLİ: Her iki tarafa da SignalR event gönder
    var threadDto = await GetThreadDtoAsync(userId, targetUserIdForThread);
    await realtime.PushChatThreadCreatedAsync(userId, threadDto);
    await realtime.PushChatThreadCreatedAsync(targetUserIdForThread, threadDto);
}
```

#### Customer Favorileme İşlemi
```csharp
// Frontend'den gelen targetId = Customer User ID
var customerUser = await _userDal.Get(x => x.Id == dto.TargetId);

if (customerUser != null) {
    favoritedToId = customerUser.Id; // Customer User ID
    targetUserIdForThread = customerUser.Id; // Customer User ID
    
    // Thread oluştur/güncelle
    await _chatService.EnsureFavoriteThreadAsync(userId, targetUserIdForThread);
    
    // ÖNEMLİ: Her iki tarafa da SignalR event gönder
    var threadDto = await GetThreadDtoAsync(userId, targetUserIdForThread);
    await realtime.PushChatThreadCreatedAsync(userId, threadDto);
    await realtime.PushChatThreadCreatedAsync(targetUserIdForThread, threadDto);
}
```

### 2. Favori Pasif Olduğunda Thread Kaldırma

```csharp
// Favori pasif yapıldığında (IsActive = false)
if (!existingFavorite.IsActive) {
    // Thread'i kaldır veya görünürlüğünü kontrol et
    var thread = await _chatService.GetThreadByFavoriteUsersAsync(userId, targetUserIdForThread);
    
    if (thread != null) {
        // Her iki tarafın da favorisi pasif mi kontrol et
        var favorite1 = await _favoriteDal.Get(x => x.FavoritedFromUserId == userId && x.FavoritedToId == targetUserIdForThread && x.IsActive);
        var favorite2 = await _favoriteDal.Get(x => x.FavoritedFromUserId == targetUserIdForThread && x.FavoritedToId == userId && x.IsActive);
        
        // En az bir aktif favori yoksa thread'i kaldır
        if (favorite1 == null && favorite2 == null) {
            // ÖNEMLİ: Her iki tarafa da threadRemoved event gönder
            await realtime.PushChatThreadRemovedAsync(userId, thread.ThreadId);
            await realtime.PushChatThreadRemovedAsync(targetUserIdForThread, thread.ThreadId);
        } else {
            // En az bir aktif favori var, thread güncellenmeli (threadUpdated event)
            var threadDto = await GetThreadDtoAsync(userId, targetUserIdForThread);
            await realtime.PushChatThreadUpdatedAsync(userId, threadDto);
            await realtime.PushChatThreadUpdatedAsync(targetUserIdForThread, threadDto);
        }
    }
}
```

### 3. `GetThreadsAsync` Metodu (ChatManager.cs)

```csharp
// Favori thread'ler için görünürlük kontrolü
var isFavoriteActive = (favorite1 != null && favorite1.IsActive) || (favorite2 != null && favorite2.IsActive);

if (!isFavoriteActive) {
    continue; // Thread görünür olmamalı
}

// Thread görünür, DTO'ya ekle
threads.Add(threadDto);
```

### 4. SignalR Event Gönderimi - Kritik Noktalar

#### `EnsureFavoriteThreadAsync` Metodu
```csharp
public async Task<IDataResult<Guid>> EnsureFavoriteThreadAsync(Guid fromUserId, Guid toUserId)
{
    // Thread oluştur veya mevcut thread'i getir
    var thread = await GetOrCreateFavoriteThreadAsync(fromUserId, toUserId);
    
    // ÖNEMLİ: Her iki tarafa da event gönder
    var threadDto = await GetThreadDtoAsync(fromUserId, toUserId);
    
    // Yapan taraf (fromUserId)
    await realtime.PushChatThreadCreatedAsync(fromUserId, threadDto);
    
    // Karşı taraf (toUserId)
    await realtime.PushChatThreadCreatedAsync(toUserId, threadDto);
    
    return new SuccessDataResult<Guid>(thread.Id);
}
```

#### Favori Toggle Sonrası
```csharp
// ToggleFavoriteAsync içinde
if (existingFavorite.IsActive && !isSelfFavorite && targetUserIdForThread != Guid.Empty)
{
    // Thread oluştur/güncelle
    var threadResult = await _chatService.EnsureFavoriteThreadAsync(userId, targetUserIdForThread);
    
    if (threadResult.Success)
    {
        // ÖNEMLİ: Her iki tarafa da threadUpdated event gönder
        var threadDto = await GetThreadDtoAsync(userId, targetUserIdForThread);
        await realtime.PushChatThreadUpdatedAsync(userId, threadDto);
        await realtime.PushChatThreadUpdatedAsync(targetUserIdForThread, threadDto);
    }
}
```

## Özet - Backend'de Yapılması Gerekenler

1. ✅ **Store Favorileme:** Store Entity ID kullanılmalı, thread için Store Owner User ID kullanılmalı
2. ✅ **FreeBarber Favorileme:** FreeBarber Entity ID kullanılmalı, thread için FreeBarber User ID kullanılmalı
3. ✅ **Customer Favorileme:** Customer User ID kullanılmalı
4. ✅ **SignalR Event'leri:** Her iki tarafa da (`userId` ve `targetUserIdForThread`) gönderilmeli
5. ✅ **Favori Pasif Olduğunda:** `chat.threadRemoved` event'i her iki tarafa da gönderilmeli
6. ✅ **Thread Görünürlük:** En az bir aktif favori varsa thread görünür olmalı

## Test Senaryoları

1. **Müşteri dükkanı beğendiğinde:**
   - Müşteri tarafında thread görünmeli ✅
   - Berber (Store Owner) tarafında thread görünmeli ✅
   - Her iki tarafa da `chat.threadCreated` event gönderilmeli ✅

2. **Müşteri favoriyi kaldırdığında:**
   - Eğer berber de favori yapmamışsa: Thread her iki tarafta da kaldırılmalı ✅
   - Eğer berber de favori yapmışsa: Thread hala görünür olmalı ✅
   - Her iki tarafa da `chat.threadRemoved` veya `chat.threadUpdated` event gönderilmeli ✅

3. **FreeBarber favorileme:**
   - Her iki tarafa da thread görünmeli ✅
   - User ID'ler üzerinden çalışmalı ✅
