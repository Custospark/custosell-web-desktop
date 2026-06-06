import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import salesReducer from '../../modules/sales/api/salesSlice';
import networkReducer from './slices/networkSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  sales: salesReducer,
  network: networkReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
