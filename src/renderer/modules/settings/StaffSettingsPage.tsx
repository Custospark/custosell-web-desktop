import { UserCog } from 'lucide-react';

export default function StaffSettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <UserCog className="w-16 h-16 mb-4" />
      <h2 className="text-xl font-semibold text-gray-600 mb-1">Staff Management</h2>
      <p className="text-sm">Staff users and roles will be managed here</p>
    </div>
  );
}
