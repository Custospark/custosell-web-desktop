import { Users } from 'lucide-react';

export default function CustomerListPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <Users className="w-16 h-16 mb-4" />
      <h2 className="text-xl font-semibold text-gray-600 mb-1">Customers</h2>
      <p className="text-sm">Customer list with purchase history will be built here</p>
    </div>
  );
}
