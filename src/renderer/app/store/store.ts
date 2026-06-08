import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    auth: {
      user: null,
      token: null,
      businessId: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      isLocalSession: false,
      pendingAuthSync: false,
      error: null,
    },
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
