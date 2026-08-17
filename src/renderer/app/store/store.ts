import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import type { UnknownAction } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';
import {
  clearStorefrontCart,
  saveStorefrontCart,
} from '../../modules/storefront/cart/storefrontCartStorage';

type StoreState = ReturnType<typeof rootReducer>;

/** Persist the storefront cart to localStorage on every cart-changing action. */
const cartPersist = createListenerMiddleware();
cartPersist.startListening({
  matcher: (action): action is UnknownAction =>
    typeof action.type === 'string' &&
    (action.type.startsWith('storefrontCart/') || action.type === 'auth/logout'),
  effect: (_action, listenerApi) => {
    const carts = (listenerApi.getState() as StoreState).storefrontCart?.carts ?? {};
    const hasItems = Object.values(carts).some((bag) => bag.items.length > 0);
    if (hasItems) {
      saveStorefrontCart(carts);
    } else {
      clearStorefrontCart();
    }
  },
});

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    auth: {
      user: null,
      plans: [],
      token: null,
      businessId: null,
      activeLocationId: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      isLocalSession: false,
      pendingAuthSync: false,
      isSwitchingAccount: false,
      error: null,
    },
  },
  middleware: (getDefault) => getDefault().prepend(cartPersist.middleware),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
