import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';
import { AccessTokenDto, ApiResponse, BarberChairCreateDto, BarberChairUpdateDto, BarberStoreCreateDto, BarberStoreDetail, BarberStoreGetDto, BarberStoreMineDto, BarberStoreUpdateDto, FreeBarberCreateDto, FreeBarberMinePanelDetailDto, FreeBarberMinePanelDto, FreeBarberUpdateDto, FreeBarGetDto, ManuelBarberCreateDto, ManuelBarberUpdateDto, NearbyRequest, OtpPurpose, UserType, VerifyOtpRequest } from '../types';

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['MineStores', 'GetStoreById', "MineFreeBarberPanel"],
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

        /// Free Barber Api
        addFreeBarberPanel: builder.mutation<{ message: string, success: boolean }, FreeBarberCreateDto>({
            query: (dto) => ({ url: 'FreeBarber/create-free-barber', method: 'POST', body: dto }),
            invalidatesTags: ['MineFreeBarberPanel'],
        }),
        updateFreeBarberPanel: builder.mutation<{ message: string, success: boolean }, FreeBarberUpdateDto>({
            query: (dto) => ({ url: 'FreeBarber/update-free-barber', method: 'PUT', body: dto }),
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
        getFreeBarberMinePanel: builder.query<FreeBarberMinePanelDto, void>({
            query: () => 'FreeBarber/mypanel',
            keepUnusedDataFor: 0,
            providesTags: ['MineFreeBarberPanel'],
        }),
        getFreeBarberMinePanelDetail: builder.query<FreeBarberMinePanelDetailDto, string>({
            query: (id) => `FreeBarber/${id}`,
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
    useAddFreeBarberPanelMutation,
    useUpdateFreeBarberPanelMutation,
} = api;