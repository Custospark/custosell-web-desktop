import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';
import { buildAuthStateFromStorage } from './slices/authSlice';

const preloadedToken = buildAuthStateFromStorage();

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    auth: {
      user: null,
      token: preloadedToken.token,
      businessId: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
    },
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
