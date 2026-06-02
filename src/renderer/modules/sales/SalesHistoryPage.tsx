import { History } from 'lucide-react';

export default function SalesHistoryPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <History className="w-16 h-16 mb-4" />
      <h2 className="text-xl font-semibold text-gray-600 mb-1">Sales History</h2>
      <p className="text-sm">Sales list with filters will be built here</p>
    </div>
  );
}
