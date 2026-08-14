import { cn } from '../../../shared/utils/cn';
import { TALENT_SURFACE } from './talentSurface';

export default function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className={TALENT_SURFACE.metricCard}>
      <p className={cn('text-xs font-medium', TALENT_SURFACE.textMuted)}>{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', TALENT_SURFACE.textTitle)}>{value}</p>
      <p className={cn('mt-1 text-[11px]', TALENT_SURFACE.textMuted)}>{hint}</p>
    </div>
  );
}
