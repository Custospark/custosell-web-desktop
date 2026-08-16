import { Building2, MapPin, Receipt, Store, Share2, Wallet } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';

export type BusinessSettingsTab = 'profile' | 'location' | 'payments' | 'receipts' | 'social';

interface BusinessSettingsTabsProps {
  activeTab: BusinessSettingsTab;
  onChange: (tab: BusinessSettingsTab) => void;
  isPersonal: boolean;
}

const COMMON_TABS: { key: BusinessSettingsTab; label: string; icon: typeof Building2 }[] = [
  { key: 'profile', label: 'Profile', icon: Store },
  { key: 'location', label: 'Location', icon: MapPin },
];

const BUSINESS_TABS: { key: BusinessSettingsTab; label: string; icon: typeof Building2 }[] = [
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'receipts', label: 'Receipts', icon: Receipt },
  { key: 'social', label: 'Social', icon: Share2 },
];

export function BusinessSettingsTabs({ activeTab, onChange, isPersonal }: BusinessSettingsTabsProps) {
  const tabs = isPersonal ? COMMON_TABS : [...COMMON_TABS, ...BUSINESS_TABS];

  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200 px-4 pt-3 sm:px-6">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === key
              ? 'border-b-2 border-blue-600 text-blue-700'
              : 'text-gray-500 hover:text-gray-800',
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}

interface BusinessSectionActionsProps {
  editing: boolean;
  hasChanges: boolean;
  canSave: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  saveLabel?: string;
}

/**
 * Per-section edit/save/cancel controls. Each tab owns its own editing state so
 * a user can update and persist one section without touching the others.
 */
export function BusinessSectionActions({
  editing,
  hasChanges,
  canSave,
  isSaving,
  onEdit,
  onCancel,
  saveLabel = 'Save changes',
}: BusinessSectionActionsProps) {
  if (!editing) {
    return (
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onEdit} className="inline-flex items-center gap-1.5">
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 border-t-2 border-gray-100 bg-gray-50/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <p className="text-sm font-medium leading-snug text-gray-600">
        {hasChanges ? 'You have unsaved changes' : saveLabel}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSaving} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={isSaving} disabled={!canSave} className="w-full sm:w-auto">
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

