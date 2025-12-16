# Backend Participant Bilgileri Gereksinimleri

## Sorun Özeti

1. **Thread'lerde Store fotoğrafı ve ismi görünmüyor**
2. **Thread'lerde FreeBarber fotoğrafı ve ismi görünmüyor**
3. **Thread bulunamadı hatası** veriyor
4. **FreeBarber türü** "Erkek" veya "Kadın" olarak gösterilmeli (Store için "Erkek Berberi" veya "Kadın Kuaförü")

## Frontend'de Beklenen Yapı

### ChatThreadParticipantDto
```typescript
export type ChatThreadParticipantDto = {
  userId: string;
  displayName: string; // Store için storeName, FreeBarber için fullName, Customer için displayName
  imageUrl?: string | null; // Store için store image, FreeBarber için freeBarber image, Customer için avatarUrl
  userType: UserType; // BarberStore, FreeBarber, veya Customer
  barberType?: BarberType | null; // Store veya FreeBarber için (MaleHairdresser, FemaleHairdresser, BeautySalon)
};
```

## Backend'de Olması Gerekenler

### 1. GetThreadsAsync Metodu (ChatManager.cs)

#### Store Participant Bilgileri
```csharp
// Store için participant bilgileri
if (appt.BarberStoreUserId.HasValue)
{
    var store = await barberStoreDal.Get(x => x.BarberStoreOwnerId == appt.BarberStoreUserId.Value);
    if (store != null)
    {
        // Store'un ilk image'ini al (imageList[0].imageUrl)
        var storeImage = await imageDal.Get(x => x.OwnerId == store.Id && x.OwnerType == "BarberStore");
        
        participants.Add(new ChatThreadParticipantDto
        {
            UserId = store.BarberStoreOwnerId.ToString(),
            DisplayName = store.StoreName, // Store ismi
            ImageUrl = storeImage?.ImageUrl, // Store'un kendi ID'sine göre image
            UserType = UserType.BarberStore,
            BarberType = store.Type // MaleHairdresser, FemaleHairdresser, BeautySalon
        });
    }
}
```

#### FreeBarber Participant Bilgileri
```csharp
// FreeBarber için participant bilgileri
if (appt.FreeBarberUserId.HasValue)
{
    var freeBarber = await freeBarberDal.Get(x => x.FreeBarberUserId == appt.FreeBarberUserId.Value);
    if (freeBarber != null)
    {
        // FreeBarber'ın ilk image'ini al (imageList[0].imageUrl)
        var freeBarberImage = await imageDal.Get(x => x.OwnerId == freeBarber.Id && x.OwnerType == "FreeBarber");
        
        participants.Add(new ChatThreadParticipantDto
        {
            UserId = freeBarber.FreeBarberUserId.ToString(),
            DisplayName = freeBarber.FullName, // FreeBarber'ın kendi panelinden fullName
            ImageUrl = freeBarberImage?.ImageUrl, // FreeBarber'ın kendi ID'sine göre image
            UserType = UserType.FreeBarber,
            BarberType = freeBarber.Type // MaleHairdresser veya FemaleHairdresser
        });
    }
}
```

#### Customer Participant Bilgileri
```csharp
// Customer için participant bilgileri
if (appt.CustomerUserId.HasValue)
{
    var customer = await userDal.Get(x => x.Id == appt.CustomerUserId.Value);
    if (customer != null)
    {
        participants.Add(new ChatThreadParticipantDto
        {
            UserId = customer.Id.ToString(),
            DisplayName = $"{customer.FirstName} {customer.LastName}", // Customer ismi
            ImageUrl = customer.AvatarUrl, // Customer avatar
            UserType = UserType.Customer,
            BarberType = null // Customer için null
        });
    }
}
```

### 2. Favori Thread'ler İçin Participant Bilgileri

#### EnsureFavoriteThreadAsync veya GetThreadsAsync İçinde
```csharp
// Favori thread için participant bilgileri
if (thread.FavoriteFromUserId.HasValue && thread.FavoriteToUserId.HasValue)
{
    var fromUser = await userDal.Get(x => x.Id == thread.FavoriteFromUserId.Value);
    var toUser = await userDal.Get(x => x.Id == thread.FavoriteToUserId.Value);
    
    // From User (yapan taraf)
    if (fromUser != null)
    {
        // Store mu kontrol et
        var fromStore = await barberStoreDal.Get(x => x.BarberStoreOwnerId == fromUser.Id);
        if (fromStore != null)
        {
            var storeImage = await imageDal.Get(x => x.OwnerId == fromStore.Id && x.OwnerType == "BarberStore");
            participants.Add(new ChatThreadParticipantDto
            {
                UserId = fromUser.Id.ToString(),
                DisplayName = fromStore.StoreName,
                ImageUrl = storeImage?.ImageUrl,
                UserType = UserType.BarberStore,
                BarberType = fromStore.Type
            });
        }
        else
        {
            // FreeBarber mı kontrol et
            var fromFreeBarber = await freeBarberDal.Get(x => x.FreeBarberUserId == fromUser.Id);
            if (fromFreeBarber != null)
            {
                var freeBarberImage = await imageDal.Get(x => x.OwnerId == fromFreeBarber.Id && x.OwnerType == "FreeBarber");
                participants.Add(new ChatThreadParticipantDto
                {
                    UserId = fromUser.Id.ToString(),
                    DisplayName = fromFreeBarber.FullName,
                    ImageUrl = freeBarberImage?.ImageUrl,
                    UserType = UserType.FreeBarber,
                    BarberType = fromFreeBarber.Type
                });
            }
            else
            {
                // Customer
                participants.Add(new ChatThreadParticipantDto
                {
                    UserId = fromUser.Id.ToString(),
                    DisplayName = $"{fromUser.FirstName} {fromUser.LastName}",
                    ImageUrl = fromUser.AvatarUrl,
                    UserType = UserType.Customer,
                    BarberType = null
                });
            }
        }
    }
    
    // To User (karşı taraf) - Aynı mantık
    // ... (yukarıdaki mantığın aynısı)
}
```

### 3. Image Tablosu Eşleştirmesi

#### Store Image
```csharp
// Store için image: OwnerId = store.Id, OwnerType = "BarberStore"
var storeImage = await imageDal.Get(x => 
    x.OwnerId == store.Id && 
    x.OwnerType == "BarberStore"
);
```

#### FreeBarber Image
```csharp
// FreeBarber için image: OwnerId = freeBarber.Id, OwnerType = "FreeBarber"
var freeBarberImage = await imageDal.Get(x => 
    x.OwnerId == freeBarber.Id && 
    x.OwnerType == "FreeBarber"
);
```

### 4. Üçlü Durum (Serbest Berber + Dükkan + Müşteri)

Randevu thread'lerinde üç participant olmalı:
1. **Store** (BarberStoreOwnerId)
2. **FreeBarber** (FreeBarberUserId)
3. **Customer** (CustomerUserId)

Her biri için yukarıdaki mantıkla participant bilgileri oluşturulmalı.

### 5. İkili Durumlar

#### Serbest Berber ↔ Dükkan (Favori Thread)
- Her iki tarafın da participant bilgileri gönderilmeli
- Store için: store.Id'ye göre image ve storeName
- FreeBarber için: freeBarber.Id'ye göre image ve fullName

#### Dükkan ↔ Müşteri (Favori Thread)
- Store için: store.Id'ye göre image ve storeName
- Customer için: customer.Id'ye göre avatarUrl ve displayName

#### Serbest Berber ↔ Müşteri (Favori Thread)
- FreeBarber için: freeBarber.Id'ye göre image ve fullName
- Customer için: customer.Id'ye göre avatarUrl ve displayName

## Özet - Backend'de Yapılması Gerekenler

1. ✅ **Store Participant**: `store.Id`'ye göre image ve `store.StoreName` gönderilmeli
2. ✅ **FreeBarber Participant**: `freeBarber.Id`'ye göre image ve `freeBarber.FullName` gönderilmeli
3. ✅ **Customer Participant**: `customer.Id`'ye göre `avatarUrl` ve `displayName` gönderilmeli
4. ✅ **Image Eşleştirmesi**: Image tablosunda `OwnerId` ve `OwnerType` ile eşleştirme yapılmalı
5. ✅ **FreeBarber Türü**: `barberType` gönderilmeli (MaleHairdresser veya FemaleHairdresser)
6. ✅ **Store Türü**: `barberType` gönderilmeli (MaleHairdresser, FemaleHairdresser, veya BeautySalon)
7. ✅ **Thread Bulunamadı Hatası**: Thread oluşturulurken/güncellenirken participant bilgileri mutlaka gönderilmeli

## Test Senaryoları

1. **Serbest Berber → Dükkan Randevu:**
   - Thread'de Store fotoğrafı ve ismi görünmeli ✅
   - Thread'de FreeBarber fotoğrafı ve ismi görünmeli ✅
   - Thread'de Customer fotoğrafı ve ismi görünmeli ✅

2. **Favori Thread (Store ↔ Customer):**
   - Thread'de Store fotoğrafı ve ismi görünmeli ✅
   - Thread'de Customer fotoğrafı ve ismi görünmeli ✅

3. **Favori Thread (FreeBarber ↔ Store):**
   - Thread'de Store fotoğrafı ve ismi görünmeli ✅
   - Thread'de FreeBarber fotoğrafı ve ismi görünmeli ✅
   - FreeBarber türü "Erkek" veya "Kadın" olarak gösterilmeli ✅
