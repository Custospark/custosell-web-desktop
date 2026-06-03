import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import salesReducer from '../../modules/sales/api/salesSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  sales: salesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
