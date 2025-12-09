import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';
import { AccessTokenDto, ApiResponse, BadgeCount, BarberChairCreateDto, BarberChairUpdateDto, BarberStoreCreateDto, BarberStoreDetail, BarberStoreGetDto, BarberStoreMineDto, BarberStoreUpdateDto, ChairSlotDto, FreeBarberCreateDto, FreeBarberMinePanelDetailDto, FreeBarberPanelDto, FreeBarberUpdateDto, FreeBarGetDto, ManuelBarberCreateDto, ManuelBarberUpdateDto, NearbyRequest, NotificationDto, OtpPurpose, UpdateLocationDto, UserType, VerifyOtpRequest, WorkingHourGetDto } from '../types';

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['MineStores', 'GetStoreById', "MineFreeBarberPanel", "Badge", "Notification", "Chat"],
    refetchOnReconnect: true,
    endpoints: (builder) => ({

        //Auth Api
        sendOtp: builder.mutation<{ message: string; success: boolean }, { phoneNumber: string, userType?: UserType, Otppurpose: OtpPurpose }>({
            query: (body) => ({ url: 'Auth/send-otp', method: 'POST', body }),
        }),
        verifyOtp: builder.mutation<ApiResponse<AccessTokenDto>, VerifyOtpRequest>
            ({
                query: (body) => ({ url: 'Auth/verify-otp', method: 'POST', body }),
            }),
        password: builder.mutation<ApiResponse<AccessTokenDto>, VerifyOtpRequest>
            ({
                query: (body) => ({ url: 'Auth/password', method: 'POST', body }),
            }),
        revoke: builder.mutation<{ message: string, success: boolean }, { refreshToken: string }>({
            query: (body) => ({ url: 'Auth/revoke', method: 'POST', body }),
        }),
        refresh: builder.mutation<ApiResponse<AccessTokenDto>, { refreshToken: string }>({
            query: (body) => ({ url: 'Auth/refresh', method: 'POST', body }),
        }),

        // Barber Store Api
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


        /// Free Barber Api
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



        /// Manuel Barber Api
        addManuelBarber: builder.mutation<
            { message: string; success: boolean },
            { dto: ManuelBarberCreateDto }
        >({
            query: ({ dto }) => ({
                url: `ManuelBarber`,
                method: 'POST',
                body: dto,
            }),
            invalidatesTags: ['GetStoreById'],
        }),
        updateManuelBarber: builder.mutation<
            { message: string; success: boolean },
            { dto: ManuelBarberUpdateDto }
        >({
            query: ({ dto }) => ({
                url: `ManuelBarber`,
                method: 'PUT',
                body: dto,
            }),
            invalidatesTags: ['GetStoreById'],
        }),
        deleteManuelBarber: builder.mutation<{ message: string; success: boolean }, string>({
            query: (id) => ({
                url: `ManuelBarber/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['GetStoreById'],
        }),

        // Store Chair Api
        addStoreChair: builder.mutation<
            { message: string; success: boolean },
            { dto: BarberChairCreateDto }
        >({
            query: ({ dto }) => ({
                url: `BarberStoreChair`,
                method: 'POST',
                body: dto,
            }),
            invalidatesTags: ['GetStoreById'],
        }),
        updateStoreChair: builder.mutation<
            { message: string; success: boolean },
            { dto: BarberChairUpdateDto }
        >({
            query: ({ dto }) => ({
                url: `BarberStoreChair`,
                method: 'PUT',
                body: dto,
            }),
            invalidatesTags: ['GetStoreById'],
        }),
        deleteStoreChair: builder.mutation<{ message: string; success: boolean }, string>({
            query: (id) => ({
                url: `BarberStoreChair/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['GetStoreById'],
        }),

        // Appointment Api
        getAvailability: builder.query<ChairSlotDto[], { storeId: string; dateOnly: string }>({
            query: ({ storeId, dateOnly }) =>
                `Appointment/availability?storeId=${storeId}&dateOnly=${dateOnly}`,
            keepUnusedDataFor: 0,
        }),

        // Working Hours Api
        getWorkingHoursByTarget: builder.query<WorkingHourGetDto[], string>({
            query: (targetId) => `Working/${targetId}`,
            transformResponse: (res: any) => {
                if (Array.isArray(res)) return res;
                if (Array.isArray(res?.data)) return res.data; // { data: [] }
                if (Array.isArray(res?.Data)) return res.Data; // { Data: [] } ihtimali
                return [];
            },
            keepUnusedDataFor: 0,
        }),

        // Notification
        getBadgeCounts: builder.query<BadgeCount, void>({
            query: () => 'Badge',
            providesTags: ['Badge'],
        }),
        getAllNotifications: builder.query<NotificationDto[], void>({
            query: () => 'Notification',
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Notification' as const, id })),
                        { type: 'Notification', id: 'LIST' },
                    ]
                    : [{ type: 'Notification', id: 'LIST' }],
        }),

        markNotificationRead: builder.mutation<void, string>({
            query: (id) => ({
                url: `Notification/read/${id}`,
                method: 'POST',
            }),
            // Bildirim okununca hem listeyi hem de badge sayısını yenile
            invalidatesTags: (result, error, id) => [
                { type: 'Notification', id },
                'Badge'
            ],
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
    useGetStoreForUsersQuery,
    useGetWorkingHoursByTargetQuery,
    useGetFreeBarberForUsersQuery,
    useUpdateFreeBarberLocationMutation,
    useGetBadgeCountsQuery,
    useGetAllNotificationsQuery,
    useMarkNotificationReadMutation,
} = api;