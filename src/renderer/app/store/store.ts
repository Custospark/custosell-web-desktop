import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';
import { buildAuthStateFromStorage } from './slices/authSlice';

const { token, user } = buildAuthStateFromStorage();

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    auth: {
      user,
      token,
      businessId: user?.business_id ?? null,
      isAuthenticated: !!token,
      isLoading: false,
      isInitialized: false,
      error: null,
    },
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
