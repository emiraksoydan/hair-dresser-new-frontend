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
    AppointmentGetDto, AppointmentFilter
} from '../types';

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['MineStores', 'GetStoreById', "MineFreeBarberPanel", "Badge", "Notification", "Chat", "Appointment"],
    refetchOnReconnect: true,
    refetchOnFocus: false,
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
                params: { lat, lon, radiusKm },
            }),
            keepUnusedDataFor: 0,
        }),
        getMineStores: builder.query<BarberStoreMineDto[], void>({
            query: () => 'BarberStore/mine',
            keepUnusedDataFor: 0,
            providesTags: ['MineStores'],
        }),
        getStoreById: builder.query<BarberStoreDetail, string>({
            query: (id) => `BarberStore/${id}`,
            keepUnusedDataFor: 0,
            providesTags: ['GetStoreById'],
        }),
        getStoreForUsers: builder.query<BarberStoreMineDto, string>({
            query: (storeId) => `BarberStore/get-store-for-users?storeId=${storeId}`,
            keepUnusedDataFor: 0,
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
                params: { lat, lon, radiusKm },
            }),
            keepUnusedDataFor: 0,
        }),
        getFreeBarberMinePanel: builder.query<FreeBarberPanelDto, void>({
            query: () => 'FreeBarber/mypanel',
            keepUnusedDataFor: 0,
            providesTags: ['MineFreeBarberPanel'],
        }),
        getFreeBarberMinePanelDetail: builder.query<FreeBarberMinePanelDetailDto, string>({
            query: (id) => `FreeBarber/${id}`,
            keepUnusedDataFor: 0,
        }),
        getFreeBarberForUsers: builder.query<FreeBarberPanelDto, string>({
            query: (freeBarberId) => `FreeBarber/get-freebarber-for-users?freeBarberId=${freeBarberId}`,
            keepUnusedDataFor: 0,
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
            keepUnusedDataFor: 0,
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

        storeDecision: builder.mutation<ApiResponse<boolean>, { appointmentId: string; approve: boolean }>({
            query: ({ appointmentId, approve }) => ({
                url: `Appointment/${appointmentId}/store-decision`,
                method: 'POST',
                params: { approve },
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: arg.appointmentId }, // O randevuyu güncelle
                { type: 'Appointment', id: 'LIST' }, // Listeyi yenile (statü değişti)
                'Badge', 'Notification',
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
                'Badge', 'Notification',
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
                if (Array.isArray(res)) return res;
                if (Array.isArray(res?.data)) return res.data;
                if (Array.isArray(res?.Data)) return res.Data;
                return [];
            },
            keepUnusedDataFor: 0,
        }),

        // --- NOTIFICATION API ---
        getBadgeCounts: builder.query<BadgeCount, void>({
            query: () => 'Badge',
            transformResponse: (response: any) => {
                if (response?.unreadNotifications !== undefined && response?.unreadMessages !== undefined) return response;
                if (response?.data && response.data.unreadNotifications !== undefined && response.data.unreadMessages !== undefined) return response.data;
                return { unreadNotifications: 0, unreadMessages: 0 };
            },
            providesTags: ['Badge'],
        }),
        getAllNotifications: builder.query<NotificationDto[], void>({
            query: () => 'Notification',
            transformResponse: (response: any) => {
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
                if (Array.isArray(response)) return response;
                if (Array.isArray(response?.data)) return response.data;
                return [];
            },
            providesTags: ['Chat'],
            keepUnusedDataFor: 0,
        }),
        getChatMessages: builder.query<ChatMessageItemDto[], { appointmentId: string; before?: string }>({
            query: ({ appointmentId, before }) => ({
                url: `Chat/${appointmentId}/messages`,
                method: 'GET',
                params: before ? { before } : undefined,
            }),
            keepUnusedDataFor: 0,
        }),
        sendChatMessage: builder.mutation<ApiResponse<ChatMessageDto>, { appointmentId: string; text: string }>({
            query: ({ appointmentId, text }) => ({
                url: `Chat/${appointmentId}/message`,
                method: 'POST',
                body: { text },
            }),
            invalidatesTags: ['Chat', 'Badge'],
        }),
        markChatThreadRead: builder.mutation<ApiResponse<boolean>, string>({
            query: (appointmentId) => ({
                url: `Chat/${appointmentId}/read`,
                method: 'POST',
            }),
            invalidatesTags: ['Chat', 'Badge'],
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
    useCreateFreeBarberAppointmentMutation,
    useCreateStoreAppointmentMutation,
    useStoreDecisionMutation,
    useFreeBarberDecisionMutation,
    useCancelAppointmentMutation,
    useCompleteAppointmentMutation,
    useGetChatThreadsQuery,
    useGetChatMessagesQuery,
    useSendChatMessageMutation,
    useMarkChatThreadReadMutation,
} = api;