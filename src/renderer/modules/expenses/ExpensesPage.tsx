import { Card } from '../../shared/components/cards/Card';

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
      <Card>
        <p className="text-gray-500">Track and categorize your business expenses.</p>
      </Card>
    </div>
  );
}
