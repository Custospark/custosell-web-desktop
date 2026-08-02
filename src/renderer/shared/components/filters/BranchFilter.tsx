import { useLocations } from '../../../modules/settings/api/settings/LocationQueries';
import { cn } from '../../utils/cn';

interface BranchFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function BranchFilter({ value, onChange, className }: BranchFilterProps) {
  const { data: locations = [] } = useLocations();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
        className,
      )}
      aria-label="Filter by branch"
    >
      <option value="">All branches</option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
          {l.is_default ? ' (Default)' : ''}
        </option>
      ))}
    </select>
  );
}