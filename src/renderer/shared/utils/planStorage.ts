import type { Plan } from '../types';

const PLANS_KEY = 'custosell_plans';
const PLAN_FEATURES_KEY = 'custosell_plan_features';

export function getStoredPlans(): Plan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function storePlans(plans: Plan[]): void {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch {
    /* quota exceeded or private browsing — non-critical */
  }
}

export function storePlanFeatures(features: Record<string, boolean> | null | undefined): void {
  if (!features) return;
  try {
    localStorage.setItem(PLAN_FEATURES_KEY, JSON.stringify(features));
  } catch {
    /* ignore */
  }
}

export function getStoredPlanFeatures(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(PLAN_FEATURES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPlanStorage(): void {
  try {
    localStorage.removeItem(PLANS_KEY);
    localStorage.removeItem(PLAN_FEATURES_KEY);
  } catch {
    /* ignore */
  }
}
