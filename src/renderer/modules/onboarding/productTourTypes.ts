import type { ElementType } from 'react';
import type { AuthUser } from '../../app/store/slices/authSlice';

export interface ProductTourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  route?: string;
  expandGroup?: string;
  icon?: ElementType;
  tone?: string;
  when?: (user: AuthUser | null | undefined, planModules?: string[]) => boolean;
}
