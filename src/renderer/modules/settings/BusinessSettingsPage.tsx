import { Building2 } from 'lucide-react';

export default function BusinessSettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <Building2 className="w-16 h-16 mb-4" />
      <h2 className="text-xl font-semibold text-gray-600 mb-1">Business Settings</h2>
      <p className="text-sm">Business profile, currency, and receipt settings</p>
    </div>
  );
}
