import type { RatioSet } from '../api/AccountingTypes';

export type RatioFormat = 'decimal' | 'percent' | 'times';
export type HealthStatus = 'healthy' | 'warning' | 'danger';

export interface RatioDef {
  category: keyof RatioSet;
  key: string;
  label: string;
  format: RatioFormat;
  healthyThreshold: number;
  warningThreshold: number;
  higherIsBetter: boolean;
}
