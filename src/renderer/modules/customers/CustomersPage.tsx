import { Card } from '../../shared/components/cards/Card';

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
      <Card>
        <p className="text-gray-500">View and manage your customer relationships.</p>
      </Card>
    </div>
  );
}
