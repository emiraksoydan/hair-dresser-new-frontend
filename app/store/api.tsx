import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';
import { AccessTokenDto, ApiResponse, BarberStoreCreateDto, BarberStoreDetail, BarberStoreGetDto, BarberStoreMineDto, NearbyStoresRequest, OtpPurpose, UserType, VerifyOtpRequest } from '../types';

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    refetchOnReconnect: true,
    endpoints: (builder) => ({
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
        addBarberStore: builder.mutation<{ message: string, success: boolean }, BarberStoreCreateDto>({
            query: (dto) => ({ url: 'BarberStore/create-store', method: 'POST', body: dto }),
        }),
        getNearbyStores: builder.query<BarberStoreGetDto[], NearbyStoresRequest>({
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
        }),
        getStoreById: builder.query<BarberStoreDetail, string>({
            query: (id) => `BarberStore/${id}`,
            keepUnusedDataFor: 0,
        }),
    }),
});
export const { useSendOtpMutation, useVerifyOtpMutation, usePasswordMutation, useRevokeMutation, useRefreshMutation, useAddBarberStoreMutation, useLazyGetNearbyStoresQuery, useGetMineStoresQuery, useGetStoreByIdQuery } = api;