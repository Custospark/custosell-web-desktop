import { Card } from '../../shared/components/cards/Card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <Card>
        <p className="text-gray-500">Configure your business, staff, roles, and subscription.</p>
      </Card>
    </div>
  );
}
