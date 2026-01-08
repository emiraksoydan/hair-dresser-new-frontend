import { configureStore } from '@reduxjs/toolkit'
import { api } from './api';
import snackbarReducer from './snackbarSlice';

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        snackbar: snackbarReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch