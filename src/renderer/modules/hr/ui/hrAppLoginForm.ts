import type { BusinessModuleSlug } from '../../../shared/utils/moduleAccess';

export interface HrAppLoginFormState {
  email: string;
  password: string;
  password_confirmation: string;
  role_id: string;
  modules: BusinessModuleSlug[];
  /** Nested under `hr` - never auto-enabled when toggling HR. */
  hrFullAccess: boolean;
}

export const emptyAppLoginForm = (): HrAppLoginFormState => ({
  email: '',
  password: '',
  password_confirmation: '',
  role_id: '',
  modules: ['sales'],
  hrFullAccess: false,
});
