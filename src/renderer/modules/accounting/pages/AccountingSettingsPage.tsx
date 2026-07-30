import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Settings, Database } from 'lucide-react';
import { InventoryReconciliationCard } from '../ui/InventoryReconciliationCard';

const defaultAccountMappings = [
  { key: 'Cash', account: '1000 - Cash' },
  { key: 'Accounts Receivable', account: '1100 - Accounts Receivable' },
  { key: 'Inventory', account: '1200 - Inventory' },
  { key: 'Fixed Assets', account: '1500 - Fixed Assets' },
  { key: 'Accounts Payable', account: '2000 - Accounts Payable' },
  { key: 'Sales Revenue', account: '4000 - Sales Revenue' },
  { key: 'Cost of Goods Sold', account: '5000 - Cost of Goods Sold' },
  { key: 'Operating Expenses', account: '6000 - Operating Expenses' },
];

export default function AccountingSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Accounting Settings</h1>
            <p className="text-sm text-gray-500">Configure accounting module preferences</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Module Status</h2>
            <p className="text-xs text-gray-500">Accounting module is active and ready</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Active
          </span>
        </div>
      </Card>

      <InventoryReconciliationCard />

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Seed Default Chart of Accounts</h2>
            <p className="text-xs text-gray-500">Create a standard COA for your workspace</p>
          </div>
          <Button>
            <Database className="w-4 h-4 mr-1.5" />Seed COA
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Default Account Code Mappings</h2>
        <div className="space-y-2">
          {defaultAccountMappings.map((mapping) => (
            <div key={mapping.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600">{mapping.key}</span>
              <span className="text-sm font-mono text-gray-900">{mapping.account}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
