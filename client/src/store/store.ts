import {configureStore} from "@reduxjs/toolkit";
import posReducer from "./posSlice";
import authReducer from "../features/auth/auth.slice";
import { api } from "../api/api";

export const store = configureStore({
    reducer: {
        pos: posReducer,
        auth: authReducer,
        [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;