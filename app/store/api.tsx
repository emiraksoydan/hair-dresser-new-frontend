import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';
import {
    AccessTokenDto, ApiResponse, BadgeCount, BarberChairCreateDto, BarberChairUpdateDto,
    BarberStoreCreateDto, BarberStoreDetail, BarberStoreGetDto, BarberStoreMineDto,
    BarberStoreUpdateDto, ChairSlotDto, CreateAppointmentRequestDto, FreeBarberCreateDto,
    FreeBarberMinePanelDetailDto, FreeBarberPanelDto, FreeBarberUpdateDto, FreeBarGetDto,
    ManuelBarberCreateDto, ManuelBarberUpdateDto, NearbyRequest, NotificationDto,
    OtpPurpose, UpdateLocationDto, UserType, VerifyOtpRequest, WorkingHourGetDto,
    ChatThreadListItemDto, ChatMessageItemDto, ChatMessageDto,
    // YENİ EKLENEN TİPLER:
    AppointmentGetDto, AppointmentFilter,
    CreateRatingDto, RatingGetDto,
    ToggleFavoriteDto, ToggleFavoriteResponseDto, FavoriteGetDto,
    AddStoreToAppointmentRequestDto, CreateStoreToFreeBarberRequestDto
} from '../types';
import { FilterRequestDto } from '../types/filter';

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['MineStores', 'GetStoreById', "MineFreeBarberPanel", "Badge", "Notification", "Chat", "Appointment", "Favorite", "IsFavorite", "StoreForUsers", "FreeBarberForUsers"],
    refetchOnReconnect: true,
    refetchOnFocus: true,
    endpoints: (builder) => ({

        // ... (Auth, BarberStore, FreeBarber, ManuelBarber kısımları aynı kalıyor) ...
        // ... (Kodun okunabilirliği için sadece Appointment ve değişen yerleri gösteriyorum) ...

        // --- AUTH API ---
        sendOtp: builder.mutation<{ message: string; success: boolean }, { phoneNumber: string, userType?: UserType, Otppurpose: OtpPurpose }>({
            query: (body) => ({ url: 'Auth/send-otp', method: 'POST', body }),
        }),
        verifyOtp: builder.mutation<ApiResponse<AccessTokenDto>, VerifyOtpRequest>({
            query: (body) => ({ url: 'Auth/verify-otp', method: 'POST', body }),
        }),
        password: builder.mutation<ApiResponse<AccessTokenDto>, VerifyOtpRequest>({
            query: (body) => ({ url: 'Auth/password', method: 'POST', body }),
        }),
        revoke: builder.mutation<{ message: string, success: boolean }, { refreshToken: string }>({
            query: (body) => ({ url: 'Auth/revoke', method: 'POST', body }),
        }),
        refresh: builder.mutation<ApiResponse<AccessTokenDto>, { refreshToken: string }>({
            query: (body) => ({ url: 'Auth/refresh', method: 'POST', body }),
        }),

        // --- BARBER STORE API ---
        addBarberStore: builder.mutation<{ message: string, success: boolean }, BarberStoreCreateDto>({
            query: (dto) => ({ url: 'BarberStore/create-store', method: 'POST', body: dto }),
            invalidatesTags: ['MineStores'],
        }),
        updateBarberStore: builder.mutation<{ message: string, success: boolean }, BarberStoreUpdateDto>({
            query: (dto) => ({ url: 'BarberStore/update-store', method: 'PUT', body: dto }),
            invalidatesTags: ['MineStores'],
        }),
        getNearbyStores: builder.query<BarberStoreGetDto[], NearbyRequest>({
            query: ({ lat, lon, radiusKm = 1 }) => ({
                url: 'BarberStore/nearby',
                method: 'GET',
                params: { lat, lon, distance: radiusKm },
            }),
            keepUnusedDataFor: 0, // ✅ Cache kaldırıldı - lokasyon değişikliklerinde hard refresh yapılıyor
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'MineStores' as const, id })),
                        { type: 'MineStores' as const, id: 'LIST' },
                        { type: 'MineStores' as const, id: 'NEARBY' },
                    ]
                    : [
                        { type: 'MineStores' as const, id: 'LIST' },
                        { type: 'MineStores' as const, id: 'NEARBY' },
                    ],
        }),
        getMineStores: builder.query<BarberStoreMineDto[], void>({
            query: () => 'BarberStore/mine',
            keepUnusedDataFor: 0, // ✅ Cache süresi azaltıldı - 30 saniye (beğeni ve yorum güncellemeleri için)
            // refetchOnMountOrArgChange hook seviyesinde kullanılır, endpoint tanımında değil
            providesTags: (result) =>
                result
                    ? [...result.map(({ id }) => ({ type: 'MineStores' as const, id })), { type: 'MineStores' as const, id: 'LIST' }]
                    : [{ type: 'MineStores' as const, id: 'LIST' }],
        }),
        getStoreById: builder.query<BarberStoreDetail, string>({
            query: (id) => `BarberStore/${id}`,
            keepUnusedDataFor: 0, // 30 saniye cache (detay sayfası için)
            providesTags: (result, error, id) => [{ type: 'GetStoreById' as const, id }],
        }),
        getStoreForUsers: builder.query<BarberStoreMineDto, string>({
            query: (storeId) => `BarberStore/get-store-for-users?storeId=${storeId}`,
            keepUnusedDataFor: 0, // 30 saniye cache (detay sayfası için)
            providesTags: (result, error, storeId) => [{ type: 'StoreForUsers' as const, id: storeId }],
        }),

        // --- FREE BARBER API ---
        addFreeBarberPanel: builder.mutation<{ message: string, success: boolean }, FreeBarberCreateDto>({
            query: (dto) => ({ url: 'FreeBarber/create-free-barber', method: 'POST', body: dto }),
            invalidatesTags: ['MineFreeBarberPanel'],
        }),
        updateFreeBarberPanel: builder.mutation<{ message: string, success: boolean }, FreeBarberUpdateDto>({
            query: (dto) => ({ url: 'FreeBarber/update-free-barber', method: 'PUT', body: dto }),
            invalidatesTags: ['MineFreeBarberPanel'],
        }),
        updateFreeBarberLocation: builder.mutation<ApiResponse<string>, UpdateLocationDto>({
            query: (body) => ({
                url: 'FreeBarber/update-location',
                method: 'POST',
                body: body,
            }),
            invalidatesTags: ['MineFreeBarberPanel'],
        }),
        getNearbyFreeBarber: builder.query<FreeBarGetDto[], NearbyRequest>({
            query: ({ lat, lon, radiusKm = 1 }) => ({
                url: 'FreeBarber/nearby',
                method: 'GET',
                params: { lat, lon, distance: radiusKm },
            }),
            keepUnusedDataFor: 0, // ✅ Cache kaldırıldı - lokasyon değişikliklerinde hard refresh yapılıyor
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'MineFreeBarberPanel' as const, id })),
                        { type: 'MineFreeBarberPanel' as const, id: 'LIST' },
                        { type: 'MineFreeBarberPanel' as const, id: 'NEARBY' },
                    ]
                    : [
                        { type: 'MineFreeBarberPanel' as const, id: 'LIST' },
                        { type: 'MineFreeBarberPanel' as const, id: 'NEARBY' },
                    ],
        }),
        getFreeBarberMinePanel: builder.query<FreeBarberPanelDto, void>({
            query: () => 'FreeBarber/mypanel',
            keepUnusedDataFor: 0, // ✅ Cache süresi azaltıldı - 30 saniye (beğeni ve yorum güncellemeleri için)
            providesTags: ['MineFreeBarberPanel'],
        }),
        getFreeBarberMinePanelDetail: builder.query<FreeBarberMinePanelDetailDto, string>({
            query: (id) => `FreeBarber/${id}`,
            keepUnusedDataFor: 0, // 30 saniye cache (detay sayfası için)
            providesTags: (result, error, id) => [{ type: 'MineFreeBarberPanel' as const, id }],
        }),
        getFreeBarberForUsers: builder.query<FreeBarberPanelDto, string>({
            query: (freeBarberId) => `FreeBarber/get-freebarber-for-users?freeBarberId=${freeBarberId}`,
            keepUnusedDataFor: 0, // 30 saniye cache (detay sayfası için)
            providesTags: (result, error, freeBarberId) => [{ type: 'FreeBarberForUsers' as const, id: freeBarberId }],
        }),

        // --- MANUEL BARBER API ---
        addManuelBarber: builder.mutation<{ message: string; success: boolean }, { dto: ManuelBarberCreateDto }>({
            query: ({ dto }) => ({ url: `ManuelBarber`, method: 'POST', body: dto }),
            invalidatesTags: ['GetStoreById'],
        }),
        updateManuelBarber: builder.mutation<{ message: string; success: boolean }, { dto: ManuelBarberUpdateDto }>({
            query: ({ dto }) => ({ url: `ManuelBarber`, method: 'PUT', body: dto }),
            invalidatesTags: ['GetStoreById'],
        }),
        deleteManuelBarber: builder.mutation<{ message: string; success: boolean }, string>({
            query: (id) => ({ url: `ManuelBarber/${id}`, method: 'DELETE' }),
            invalidatesTags: ['GetStoreById'],
        }),

        // --- STORE CHAIR API ---
        addStoreChair: builder.mutation<{ message: string; success: boolean }, { dto: BarberChairCreateDto }>({
            query: ({ dto }) => ({ url: `BarberStoreChair`, method: 'POST', body: dto }),
            invalidatesTags: ['GetStoreById'],
        }),
        updateStoreChair: builder.mutation<{ message: string; success: boolean }, { dto: BarberChairUpdateDto }>({
            query: ({ dto }) => ({ url: `BarberStoreChair`, method: 'PUT', body: dto }),
            invalidatesTags: ['GetStoreById'],
        }),
        deleteStoreChair: builder.mutation<{ message: string; success: boolean }, string>({
            query: (id) => ({ url: `BarberStoreChair/${id}`, method: 'DELETE' }),
            invalidatesTags: ['GetStoreById'],
        }),

        // --- APPOINTMENT API ---

        // 1. Availability (Mevcut)
        getAvailability: builder.query<ChairSlotDto[], { storeId: string; dateOnly: string }>({
            query: ({ storeId, dateOnly }) => `Appointment/availability?storeId=${storeId}&dateOnly=${dateOnly}`,
            transformResponse: (response: any) => {
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
            providesTags: (result, error, { storeId, dateOnly }) => [
                { type: 'Appointment' as const, id: `availability-${storeId}-${dateOnly}` },
                { type: 'Appointment' as const, id: 'availability' },
            ],
            keepUnusedDataFor: 0,
        }),

        // 2. YENİ EKLENEN: Filtreli Randevu Listesi (Active/Completed/Cancelled)
        getAllAppointmentByFilter: builder.query<AppointmentGetDto[], AppointmentFilter>({
            query: (filter) => ({
                url: `Appointment/getallbyfilter`,
                method: 'GET',
                params: { filter },
            }),
            keepUnusedDataFor: 0, // 30 saniye cache (appointment listesi için)
            transformResponse: (response: any) => {
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
            // Listeyi 'LIST' etiketiyle ve her öğeyi kendi ID'siyle etiketle
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Appointment' as const, id })),
                        { type: 'Appointment', id: 'LIST' },
                    ]
                    : [{ type: 'Appointment', id: 'LIST' }],
        }),

        createCustomerToFreeBarberAppointment: builder.mutation<ApiResponse<{ id: string }>, CreateAppointmentRequestDto>({
            query: (body) => ({ url: 'Appointment/customer-to-freebarber', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                'Appointment', 'Badge', 'Notification',
                { type: 'Appointment', id: 'LIST' },
                'Chat',
            ],
        }),
        createCustomerAppointment: builder.mutation<ApiResponse<{ id: string }>, CreateAppointmentRequestDto>({
            query: (body) => ({ url: 'Appointment/customer', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                'Appointment', 'Badge', 'Notification',
                { type: 'Appointment', id: 'LIST' }, // Listeyi yenile
                ...(arg.storeId && arg.appointmentDate ? [
                    { type: 'Appointment' as const, id: `availability-${arg.storeId}-${arg.appointmentDate}` },
                    { type: 'Appointment' as const, id: 'availability' },
                ] : []),
            ],
        }),
        addStoreToAppointment: builder.mutation<ApiResponse<boolean>, { appointmentId: string; body: AddStoreToAppointmentRequestDto }>({
            query: ({ appointmentId, body }) => ({
                url: `Appointment/${appointmentId}/add-store`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: arg.appointmentId },
                { type: 'Appointment', id: 'LIST' },
                'Badge',
                'Notification',
                'Chat',
                { type: 'Appointment', id: 'availability' }
            ],
        }),
        createFreeBarberAppointment: builder.mutation<ApiResponse<{ id: string }>, CreateAppointmentRequestDto>({
            query: (body) => ({ url: 'Appointment/freebarber', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                'Appointment', 'Badge', 'Notification',
                { type: 'Appointment', id: 'LIST' },
                ...(arg.storeId && arg.appointmentDate ? [
                    { type: 'Appointment' as const, id: `availability-${arg.storeId}-${arg.appointmentDate}` },
                    { type: 'Appointment' as const, id: 'availability' },
                ] : []),
            ],
        }),
        createStoreAppointment: builder.mutation<ApiResponse<{ id: string }>, CreateAppointmentRequestDto>({
            query: (body) => ({ url: 'Appointment/store', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                'Appointment', 'Badge', 'Notification',
                { type: 'Appointment', id: 'LIST' },
                ...(arg.storeId && arg.appointmentDate ? [
                    { type: 'Appointment' as const, id: `availability-${arg.storeId}-${arg.appointmentDate}` },
                    { type: 'Appointment' as const, id: 'availability' },
                ] : []),
            ],
        }),
        callFreeBarber: builder.mutation<ApiResponse<{ id: string }>, CreateStoreToFreeBarberRequestDto>({
            query: (body) => ({ url: 'Appointment/store/call-freebarber', method: 'POST', body }),
            invalidatesTags: [
                'Appointment',
                'Badge',
                'Notification',
                { type: 'Appointment', id: 'LIST' },
                'Chat',
                { type: 'MineFreeBarberPanel', id: 'NEARBY' },
                { type: 'MineFreeBarberPanel', id: 'LIST' },
            ],
        }),

        storeDecision: builder.mutation<ApiResponse<boolean>, { appointmentId: string; approve: boolean }>({
            query: ({ appointmentId, approve }) => ({
                url: `Appointment/${appointmentId}/store-decision`,
                method: 'POST',
                params: { approve },
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: arg.appointmentId }, // O randevuyu güncelle
                { type: 'Appointment', id: 'LIST' }, // Listeyi yenile (statü değişti)
                'Badge',
                'Notification', // Bildirim listesini invalidate et
                { type: 'Notification' as const, id: 'LIST' }, // Tüm bildirimleri invalidate et
                { type: 'Appointment', id: 'availability' }
            ],
        }),
        freeBarberDecision: builder.mutation<ApiResponse<boolean>, { appointmentId: string; approve: boolean }>({
            query: ({ appointmentId, approve }) => ({
                url: `Appointment/${appointmentId}/freebarber-decision`,
                method: 'POST',
                params: { approve },
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: arg.appointmentId },
                { type: 'Appointment', id: 'LIST' },
                'Badge',
                'Notification', // Bildirim listesini invalidate et
                { type: 'Notification' as const, id: 'LIST' }, // Tüm bildirimleri invalidate et
                { type: 'Appointment', id: 'availability' }
            ],
        }),
        customerDecision: builder.mutation<ApiResponse<boolean>, { appointmentId: string; approve: boolean }>({
            query: ({ appointmentId, approve }) => ({
                url: `Appointment/${appointmentId}/customer-decision`,
                method: 'POST',
                params: { approve },
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: arg.appointmentId },
                { type: 'Appointment', id: 'LIST' },
                'Badge',
                'Notification',
                { type: 'Notification' as const, id: 'LIST' },
                'Chat',
                { type: 'Appointment', id: 'availability' }
            ],
        }),
        cancelAppointment: builder.mutation<ApiResponse<boolean>, string>({
            query: (appointmentId) => ({
                url: `Appointment/${appointmentId}/cancel`,
                method: 'POST',
            }),
            // İşlem bitince ilgili etiketleri geçersiz kıl
            invalidatesTags: (result, error, appointmentId) => [
                { type: 'Appointment', id: appointmentId }, // Tekil kartı yenile
                { type: 'Appointment', id: 'LIST' },        // Listeyi yenile
                'Badge',
                'Notification',
                { type: 'Appointment', id: 'availability' }
            ],
        }),

        // --- TAMAMLAMA ---
        // Artık sadece string (appointmentId) alıyor
        completeAppointment: builder.mutation<ApiResponse<boolean>, string>({
            query: (appointmentId) => ({
                url: `Appointment/${appointmentId}/complete`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, appointmentId) => [
                { type: 'Appointment', id: appointmentId },
                { type: 'Appointment', id: 'LIST' },
                'Badge',
                'Notification',
                { type: 'Appointment', id: 'availability' }
            ],
        }),

        // --- WORKING HOURS API ---
        getWorkingHoursByTarget: builder.query<WorkingHourGetDto[], string>({
            query: (targetId) => `Working/${targetId}`,
            transformResponse: (res: any) => {
                // Backend zaten camelCase döndürüyor, sadece array/data kontrolü yap
                if (Array.isArray(res)) return res;
                if (Array.isArray(res?.data)) return res.data;
                return [];
            },
            keepUnusedDataFor: 0, // 2 dakika cache (working hours nadiren değişir)
        }),

        // --- NOTIFICATION API ---
        getBadgeCounts: builder.query<BadgeCount, void>({
            query: () => 'Badge',
            transformResponse: (response: any) => {
                // Backend zaten camelCase döndürüyor, sadece data wrapper kontrolü yap
                if (response?.unreadNotifications !== undefined && response?.unreadMessages !== undefined) return response;
                if (response?.data?.unreadNotifications !== undefined && response?.data?.unreadMessages !== undefined) return response.data;
                return { unreadNotifications: 0, unreadMessages: 0 };
            },
            providesTags: ['Badge'],
        }),
        getAllNotifications: builder.query<NotificationDto[], void>({
            query: () => 'Notification',
            transformResponse: (response: any) => {
                // Backend zaten camelCase döndürüyor, sadece array/data kontrolü yap
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
            providesTags: (result) => {
                if (!result || !Array.isArray(result)) return [{ type: 'Notification' as const, id: 'LIST' }];
                return [
                    ...result.map(({ id }) => ({ type: 'Notification' as const, id })),
                    { type: 'Notification' as const, id: 'LIST' },
                ];
            },
        }),
        markNotificationRead: builder.mutation<void, string>({
            query: (id) => ({ url: `Notification/read/${id}`, method: 'POST' }),
            invalidatesTags: (result, error, id) => [{ type: 'Notification' as const, id }, 'Badge'],
        }),

        // --- CHAT API ---
        getChatThreads: builder.query<ChatThreadListItemDto[], void>({
            query: () => 'Chat/threads',
            transformResponse: (response: any) => {
                // Backend zaten camelCase döndürüyor, sadece array/data kontrolü yap
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
            providesTags: ['Chat'],
            keepUnusedDataFor: 0, // 10 saniye cache (SignalR ile güncellenir)
        }),
        getChatMessages: builder.query<ChatMessageItemDto[], { appointmentId: string; before?: string }>({
            query: ({ appointmentId, before }) => ({
                url: `Chat/${appointmentId}/messages`,
                method: 'GET',
                params: before ? { before } : undefined,
            }),
            keepUnusedDataFor: 0, // 10 saniye cache (SignalR ile güncellenir)
        }),
        getChatMessagesByThread: builder.query<ChatMessageItemDto[], { threadId: string; before?: string }>({
            query: ({ threadId, before }) => ({
                url: `Chat/thread/${threadId}/messages`,
                method: 'GET',
                params: before ? { before } : undefined,
            }),
            keepUnusedDataFor: 0, // 10 saniye cache (SignalR ile güncellenir)
            transformResponse: (response: any) => {
                // Backend zaten camelCase döndürüyor, sadece array/data kontrolü yap
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
        }),
        sendChatMessage: builder.mutation<ApiResponse<ChatMessageDto>, { appointmentId: string; text: string }>({
            query: ({ appointmentId, text }) => ({
                url: `Chat/${appointmentId}/message`,
                method: 'POST',
                body: { text },
            }),
            invalidatesTags: ['Chat', 'Badge'],
        }),
        sendChatMessageByThread: builder.mutation<ApiResponse<ChatMessageDto>, { threadId: string; text: string }>({
            query: ({ threadId, text }) => ({
                url: `Chat/thread/${threadId}/message`,
                method: 'POST',
                body: { text },
            }),
            invalidatesTags: ['Chat', 'Badge'],
        }),
        markChatThreadRead: builder.mutation<ApiResponse<boolean>, string>({
            query: (threadId) => ({
                url: `Chat/thread/${threadId}/read`,
                method: 'POST',
            }),
            invalidatesTags: ['Chat', 'Badge'],
        }),
        markChatThreadReadByAppointment: builder.mutation<ApiResponse<boolean>, string>({
            query: (appointmentId) => ({
                url: `Chat/${appointmentId}/read`,
                method: 'POST',
            }),
            invalidatesTags: ['Chat', 'Badge'],
        }),
        markChatThreadReadByThread: builder.mutation<ApiResponse<boolean>, string>({
            query: (threadId) => ({
                url: `Chat/thread/${threadId}/read`,
                method: 'POST',
            }),
            invalidatesTags: ['Chat', 'Badge'],
        }),
        notifyTyping: builder.mutation<ApiResponse<boolean>, { threadId: string; isTyping: boolean }>({
            query: ({ threadId, isTyping }) => ({
                url: `Chat/thread/${threadId}/typing`,
                method: 'POST',
                body: { isTyping },
            }),
        }),

        // --- RATING API ---
        createRating: builder.mutation<ApiResponse<RatingGetDto>, CreateRatingDto>({
            query: (body) => ({ url: 'Rating/create', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                'Appointment',
                // Store veya FreeBarber'a rating yapıldığında nearby listelerini de güncelle
                { type: 'StoreForUsers' as const, id: arg.targetId },
                { type: 'FreeBarberForUsers' as const, id: arg.targetId },
                // Nearby listeler için genel tag'leri invalidate et
                { type: 'MineStores' as const, id: 'NEARBY' },
                { type: 'MineFreeBarberPanel' as const, id: 'NEARBY' },
            ],
        }),
        deleteRating: builder.mutation<ApiResponse<boolean>, string>({
            query: (ratingId) => ({ url: `Rating/${ratingId}`, method: 'DELETE' }),
            invalidatesTags: ['Appointment'],
        }),
        getRatingById: builder.query<RatingGetDto, string>({
            query: (ratingId) => `Rating/${ratingId}`,
            keepUnusedDataFor: 30, // 30 saniye cache
        }),
        getRatingsByTarget: builder.query<RatingGetDto[], string>({
            query: (targetId) => `Rating/target/${targetId}`,
            keepUnusedDataFor: 30, // 30 saniye cache
            transformResponse: (response: any) => {
                // Backend zaten camelCase döndürüyor, sadece array/data kontrolü yap
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
        }),
        getMyRatingForAppointment: builder.query<RatingGetDto, { appointmentId: string; targetId: string }>({
            query: ({ appointmentId, targetId }) => `Rating/appointment/${appointmentId}/target/${targetId}`,
            keepUnusedDataFor: 30, // 30 saniye cache
        }),

        // --- FAVORITE API ---
        toggleFavorite: builder.mutation<ApiResponse<ToggleFavoriteResponseDto>, ToggleFavoriteDto>({
            query: (body) => ({ url: 'Favorite/toggle', method: 'POST', body }),
            async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
                // ✅ PERFORMANS İYİLEŞTİRME: Optimistic update ile anında UI güncelleme
                const targetId = arg.targetId;
                const state = getState() as any;

                // Optimistic update için patch'leri sakla (rollback için)
                const patchResults: any[] = [];

                // ✅ Optimistic update: Anında UI'ı güncelle
                const optimisticUpdateCache = (endpointName: string, optimisticToggle: boolean) => {
                    try {
                        const apiState = (state as any).api;
                        if (!apiState?.queries) return;

                        Object.keys(apiState.queries).forEach((queryKey) => {
                            const queryState = apiState.queries[queryKey];
                            if (queryState?.endpointName === endpointName && queryState?.data) {
                                try {
                                    let queryArgs = queryState.originalArgs;

                                    if (!queryArgs && queryState.queryCacheKey) {
                                        const match = queryState.queryCacheKey.match(/\((.+)\)$/);
                                        if (match) {
                                            try {
                                                queryArgs = JSON.parse(match[1]);
                                            } catch (e) {
                                                // Parse edilemezse atla
                                            }
                                        }
                                    }

                                    if (queryArgs) {
                                        const patchResult = dispatch(
                                            api.util.updateQueryData(endpointName as any, queryArgs, (draft: any) => {
                                                if (Array.isArray(draft)) {
                                                    const item = draft.find((s: any) => s.id === targetId);
                                                    if (item) {
                                                        // Optimistic: favoriteCount'u tahmin et
                                                        item.favoriteCount = (item.favoriteCount || 0) + (optimisticToggle ? 1 : -1);
                                                        if (item.favoriteCount < 0) item.favoriteCount = 0;
                                                    }
                                                } else if (draft && draft.id === targetId) {
                                                    draft.favoriteCount = (draft.favoriteCount || 0) + (optimisticToggle ? 1 : -1);
                                                    if (draft.favoriteCount < 0) draft.favoriteCount = 0;
                                                }
                                            })
                                        );
                                        patchResults.push(patchResult);
                                    }
                                } catch (e) {
                                    // Hata durumunda sessizce devam et
                                }
                            }
                        });
                    } catch (e) {
                        // Hata durumunda sessizce devam et
                    }
                };

                // İlk önce optimistic update yap (kullanıcı anında feedback alır)
                const currentIsFavorite = await (async () => {
                    try {
                        const apiState = (state as any).api;
                        if (apiState?.queries) {
                            for (const queryKey of Object.keys(apiState.queries)) {
                                const queryState = apiState.queries[queryKey];
                                if (queryState?.endpointName === 'isFavorite' && queryState?.data !== undefined) {
                                    const args = queryState.originalArgs;
                                    if (args === targetId) {
                                        return queryState.data as boolean;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Hata durumunda false döndür
                    }
                    return false;
                })();

                const optimisticToggle = !currentIsFavorite;

                // Tüm ilgili cache'leri optimistic olarak güncelle
                optimisticUpdateCache('getNearbyStores', optimisticToggle);
                optimisticUpdateCache('getMineStores', optimisticToggle);
                optimisticUpdateCache('getNearbyFreeBarber', optimisticToggle);
                optimisticUpdateCache('getFreeBarberMinePanel', optimisticToggle);
                optimisticUpdateCache('getStoreForUsers', optimisticToggle);
                optimisticUpdateCache('getFreeBarberForUsers', optimisticToggle);

                // Helper function: Backend'den dönen favoriteCount ile cache'i güncelle
                const updateCacheWithFavoriteCount = (endpointName: string, favoriteCount: number, isFavorite: boolean) => {
                    try {
                        const apiState = (state as any).api;
                        if (!apiState?.queries) return;

                        Object.keys(apiState.queries).forEach((queryKey) => {
                            const queryState = apiState.queries[queryKey];
                            if (queryState?.endpointName === endpointName && queryState?.data) {
                                try {
                                    let queryArgs = queryState.originalArgs;

                                    if (!queryArgs && queryState.queryCacheKey) {
                                        const match = queryState.queryCacheKey.match(/\((.+)\)$/);
                                        if (match) {
                                            try {
                                                queryArgs = JSON.parse(match[1]);
                                            } catch (e) {
                                                // Parse edilemezse atla
                                            }
                                        }
                                    }

                                    if (queryArgs) {
                                        dispatch(
                                            api.util.updateQueryData(endpointName as any, queryArgs, (draft: any) => {
                                                if (Array.isArray(draft)) {
                                                    const item = draft.find((s: any) => s.id === targetId);
                                                    if (item) {
                                                        item.favoriteCount = favoriteCount;
                                                    }
                                                } else if (draft && draft.id === targetId) {
                                                    draft.favoriteCount = favoriteCount;
                                                }
                                            })
                                        );
                                    }
                                } catch (e) {
                                    // Hata durumunda sessizce devam et
                                }
                            }
                        });
                    } catch (e) {
                        // Hata durumunda sessizce devam et
                    }
                };

                // Appointment listesi için isFavorite flag'ini güncelle
                const updateAppointmentFavoriteFlag = (isFavorite: boolean) => {
                    try {
                        const apiState = (state as any).api;
                        if (apiState?.queries) {
                            Object.keys(apiState.queries).forEach((queryKey) => {
                                const queryState = apiState.queries[queryKey];
                                if (queryState?.endpointName === 'getAllAppointmentByFilter' && queryState?.data && Array.isArray(queryState.data)) {
                                    const appointment = queryState.data.find((apt: any) =>
                                        apt.customerUserId === targetId ||
                                        apt.barberStoreId === targetId ||
                                        apt.freeBarberId === targetId
                                    );

                                    if (appointment && queryState.originalArgs !== undefined) {
                                        dispatch(
                                            api.util.updateQueryData('getAllAppointmentByFilter', queryState.originalArgs, (draft) => {
                                                if (!draft || !Array.isArray(draft)) return;
                                                const draftAppointment = draft.find((apt: any) =>
                                                    apt.customerUserId === targetId ||
                                                    apt.barberStoreId === targetId ||
                                                    apt.freeBarberId === targetId
                                                );
                                                if (draftAppointment) {
                                                    if (draftAppointment.customerUserId === targetId) {
                                                        draftAppointment.isCustomerFavorite = isFavorite;
                                                    }
                                                    if (draftAppointment.barberStoreId === targetId) {
                                                        draftAppointment.isStoreFavorite = isFavorite;
                                                    }
                                                    if (draftAppointment.freeBarberId === targetId) {
                                                        draftAppointment.isFreeBarberFavorite = isFavorite;
                                                    }
                                                }
                                            })
                                        );
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        // Hata durumunda sessizce devam et
                    }
                };

                // Backend'den dönen response'u bekle ve cache'i gerçek değerle düzelt
                try {
                    const result = await queryFulfilled;
                    const responseData = result.data?.data || result.data;

                    if (responseData) {
                        const favoriteCount = responseData.favoriteCount ?? 0;
                        const isFavorite = responseData.isFavorite ?? false;

                        // ✅ Backend'den gelen gerçek değerlerle cache'i düzelt
                        updateCacheWithFavoriteCount('getNearbyStores', favoriteCount, isFavorite);
                        updateCacheWithFavoriteCount('getMineStores', favoriteCount, isFavorite);
                        updateCacheWithFavoriteCount('getNearbyFreeBarber', favoriteCount, isFavorite);
                        updateCacheWithFavoriteCount('getFreeBarberMinePanel', favoriteCount, isFavorite);
                        updateCacheWithFavoriteCount('getStoreForUsers', favoriteCount, isFavorite);
                        updateCacheWithFavoriteCount('getFreeBarberForUsers', favoriteCount, isFavorite);

                        // Appointment favorite flag'lerini güncelle
                        updateAppointmentFavoriteFlag(isFavorite);
                    }
                } catch (error) {
                    // ✅ Hata durumunda optimistic update'i geri al
                    patchResults.forEach(patchResult => {
                        patchResult.undo();
                    });
                    // invalidatesTags zaten cache'i temizleyecek ve refetch yapacak
                }
            },
            invalidatesTags: (result, error, arg) => [
                'Appointment',
                'Favorite',
                'Chat', // Thread listesini güncelle
                'Notification', // Notification'lardaki favori durumlarını güncelle
                // Store ve FreeBarber için spesifik item ve list tag'leri
                { type: 'MineStores' as const, id: arg.targetId },
                { type: 'MineStores' as const, id: 'LIST' },
                { type: 'MineStores' as const, id: 'NEARBY' },
                { type: 'GetStoreById' as const, id: arg.targetId }, // Store detay sayfası için
                { type: 'StoreForUsers' as const, id: arg.targetId }, // Store detay sayfası (müşteri görünümü) için
                { type: 'MineFreeBarberPanel' as const, id: arg.targetId },
                { type: 'MineFreeBarberPanel' as const, id: 'LIST' },
                { type: 'MineFreeBarberPanel' as const, id: 'NEARBY' },
                { type: 'FreeBarberForUsers' as const, id: arg.targetId }, // FreeBarber detay sayfası (müşteri görünümü) için
                // IsFavorite query'si için
                { type: 'IsFavorite' as const, id: arg.targetId },
                { type: 'IsFavorite' as const, id: 'LIST' },
            ],
            transformResponse: (response: any) => {
                // Backend zaten camelCase döndürüyor: { success: boolean, data: { isFavorite: boolean, favoriteCount: number }, message?: string }
                if (response?.success !== undefined && response?.data !== undefined) {
                    return response;
                }
                return response;
            },
        }),
        isFavorite: builder.query<boolean, string>({
            query: (targetId) => `Favorite/check/${targetId}`,
            keepUnusedDataFor: 0, // ✅ Cache kaldırıldı - favoriler anlık güncellenmeli
            providesTags: (result, error, targetId) => [{ type: 'IsFavorite' as const, id: targetId }],
            transformResponse: (response: any) => {
                // Backend zaten camelCase döndürüyor: { success: boolean, data: boolean, message?: string }
                if (typeof response === 'boolean') return response;
                if (response?.data !== undefined) return response.data;
                return false;
            },
        }),
        getMyFavorites: builder.query<FavoriteGetDto[], void>({
            query: () => 'Favorite/my-favorites',
            keepUnusedDataFor: 0, // ✅ Cache kaldırıldı - favoriler anlık güncellenmeli
            providesTags: ['Favorite'],
            transformResponse: (response: any) => {
                // Backend zaten camelCase döndürüyor, sadece array/data kontrolü yap
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
        }),
        removeFavorite: builder.mutation<ApiResponse<boolean>, string>({
            query: (targetId) => ({ url: `Favorite/${targetId}`, method: 'DELETE' }),
            invalidatesTags: ['Appointment', 'MineStores', 'MineFreeBarberPanel'],
        }),

        // --- CATEGORY API ---
        getAllCategories: builder.query<any[], void>({
            query: () => 'Categories',
            keepUnusedDataFor: 0, // 5 dakika cache (kategoriler sık değişmez)
            transformResponse: (response: any) => {
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
        }),
        getParentCategories: builder.query<any[], void>({
            query: () => 'Categories/parents',
            keepUnusedDataFor: 0, // 5 dakika cache
            transformResponse: (response: any) => {
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
        }),
        getChildCategories: builder.query<any[], string>({
            query: (parentId) => `Categories/children/${parentId}`,
            keepUnusedDataFor: 0, // 5 dakika cache
            transformResponse: (response: any) => {
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
        }),

        // --- FILTERED API ---
        getFilteredStores: builder.mutation<BarberStoreGetDto[], FilterRequestDto>({
            query: (filter) => ({
                url: 'BarberStore/filtered',
                method: 'POST',
                body: filter,
            }),
            invalidatesTags: ['MineStores'],
        }),

        getFilteredFreeBarbers: builder.mutation<FreeBarGetDto[], FilterRequestDto>({
            query: (filter) => ({
                url: 'FreeBarber/filtered',
                method: 'POST',
                body: filter,
            }),
            invalidatesTags: ['MineFreeBarberPanel'],
        }),

        // --- IMAGE API ---
        uploadImage: builder.mutation<ApiResponse<string>, FormData>({
            query: (formData) => ({
                url: 'Image/upload',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['MineStores', 'MineFreeBarberPanel', 'StoreForUsers', 'FreeBarberForUsers'],
        }),

        uploadMultipleImages: builder.mutation<ApiResponse<string[]>, FormData>({
            query: (formData) => ({
                url: 'Image/upload-multiple',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['MineStores', 'MineFreeBarberPanel', 'StoreForUsers', 'FreeBarberForUsers'],
        }),

        deleteImage: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                url: `Image/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['MineStores', 'MineFreeBarberPanel', 'StoreForUsers', 'FreeBarberForUsers'],
        }),

    }),
});

export const {
    useSendOtpMutation,
    useVerifyOtpMutation,
    usePasswordMutation,
    useRevokeMutation,
    useRefreshMutation,
    useAddBarberStoreMutation,
    useUpdateBarberStoreMutation,
    useLazyGetNearbyStoresQuery,
    useGetMineStoresQuery,
    useLazyGetStoreByIdQuery,
    useAddManuelBarberMutation,
    useDeleteManuelBarberMutation,
    useUpdateManuelBarberMutation,
    useAddStoreChairMutation,
    useUpdateStoreChairMutation,
    useDeleteStoreChairMutation,
    useGetFreeBarberMinePanelQuery,
    useLazyGetFreeBarberMinePanelDetailQuery,
    useLazyGetNearbyFreeBarberQuery,
    useAddFreeBarberPanelMutation,
    useUpdateFreeBarberPanelMutation,
    useGetAvailabilityQuery,

    // YENİ EKLENEN QUERY
    useGetAllAppointmentByFilterQuery,

    useGetStoreForUsersQuery,
    useGetWorkingHoursByTargetQuery,
    useGetFreeBarberForUsersQuery,
    useUpdateFreeBarberLocationMutation,
    useGetBadgeCountsQuery,
    useGetAllNotificationsQuery,
    useMarkNotificationReadMutation,
    useCreateCustomerAppointmentMutation,
    useCreateCustomerToFreeBarberAppointmentMutation,
    useCreateFreeBarberAppointmentMutation,
    useCreateStoreAppointmentMutation,
    useCallFreeBarberMutation,
    useAddStoreToAppointmentMutation,
    useStoreDecisionMutation,
    useFreeBarberDecisionMutation,
    useCustomerDecisionMutation,
    useCancelAppointmentMutation,
    useCompleteAppointmentMutation,
    useGetChatThreadsQuery,
    useGetChatMessagesQuery,
    useGetChatMessagesByThreadQuery,
    useSendChatMessageMutation,
    useSendChatMessageByThreadMutation,
    useMarkChatThreadReadMutation,
    useMarkChatThreadReadByThreadMutation,
    useNotifyTypingMutation,
    useCreateRatingMutation,
    useDeleteRatingMutation,
    useGetRatingByIdQuery,
    useGetRatingsByTargetQuery,
    useGetMyRatingForAppointmentQuery,
    useToggleFavoriteMutation,
    useIsFavoriteQuery,
    useGetMyFavoritesQuery,
    useRemoveFavoriteMutation,
    useGetAllCategoriesQuery,
    useGetParentCategoriesQuery,
    useLazyGetChildCategoriesQuery,
    useGetFilteredStoresMutation,
    useGetFilteredFreeBarbersMutation,
    useUploadImageMutation,
    useUploadMultipleImagesMutation,
    useDeleteImageMutation,
} = api;
