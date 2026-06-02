import { Shield } from 'lucide-react';

export default function RoleSettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <Shield className="w-16 h-16 mb-4" />
      <h2 className="text-xl font-semibold text-gray-600 mb-1">Roles & Permissions</h2>
      <p className="text-sm">Role configurations and permission settings</p>
    </div>
  );
}
