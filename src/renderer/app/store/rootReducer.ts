import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import syncReducer from './slices/syncSlice';
import salesReducer from '../../modules/sales/api/salesSlice';
import marketplaceCartReducer from '../../modules/inventory/api/marketplace/marketplaceCartSlice';
import storefrontCartReducer from '../../modules/storefront/cart/storefrontCartSlice';
import networkReducer from './slices/networkSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  sync: syncReducer,
  sales: salesReducer,
  marketplaceCart: marketplaceCartReducer,
  storefrontCart: storefrontCartReducer,
  network: networkReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
