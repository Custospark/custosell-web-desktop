import { Card } from '../../shared/components/cards/Card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your business performance</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="text-center"><p className="text-sm text-gray-500">Today's Sales</p><p className="text-2xl font-bold">$0.00</p></div></Card>
        <Card><div className="text-center"><p className="text-sm text-gray-500">Transactions</p><p className="text-2xl font-bold">0</p></div></Card>
        <Card><div className="text-center"><p className="text-sm text-gray-500">Products Sold</p><p className="text-2xl font-bold">0</p></div></Card>
        <Card><div className="text-center"><p className="text-sm text-gray-500">Active Customers</p><p className="text-2xl font-bold">0</p></div></Card>
      </div>
    </div>
  );
}
