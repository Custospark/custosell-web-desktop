import { Card } from '../../shared/components/cards/Card';

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
      <Card>
        <p className="text-gray-500">Sales management module. Create new sales, view history, and process refunds.</p>
      </Card>
    </div>
  );
}
