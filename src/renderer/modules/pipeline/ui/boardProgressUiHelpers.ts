import { roundDisplayNumber } from '../api/pipelineProgressTerms';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

export function paceBadgeClass(status: string): string {
  switch (status) {
    case 'achieved':
      return 'bg-emerald-100 text-emerald-800';
    case 'on_track':
      return 'bg-blue-100 text-blue-800';
    case 'at_risk':
      return 'bg-amber-100 text-amber-800';
    case 'behind':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function formatMetricValue(value: number, unit: string, currency: string): string {
  const rounded = roundDisplayNumber(value);
  if (unit === 'currency') return formatCurrency(rounded, currency);
  if (unit === 'percent') return `${rounded}%`;
  if (unit === 'days') return `${rounded}d`;
  return String(rounded);
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
