import { Card } from '../../shared/components/cards/Card';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
      <Card>
        <p className="text-gray-500">Manage your products, categories, and stock levels.</p>
      </Card>
    </div>
  );
}
