import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';

let prevSubVal: boolean | null = null;

function checkSubState(source: string): void {
  const cur = store.getState().auth.user?.business?.subscription;
  const has = Boolean(cur);
  if (prevSubVal !== null && prevSubVal !== has) {
    console.log(`[DEBUG] subscription ${has ? 'APPEARED' : 'DROPPED'} via ${source}`, new Date().toISOString());
    if (!has) console.trace();
  }
  prevSubVal = has;
}

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    auth: {
      user: null,
      plans: [],
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
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(() => (next) => (action) => {
      const result = next(action);
      checkSubState(`dispatch:${(action as { type?: string }).type ?? 'unknown'}`);
      return result;
    }),
  devTools: import.meta.env.DEV,
});

/* Also detect mutations that bypass Redux dispatch */
store.subscribe(() => checkSubState('subscribe'));

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
