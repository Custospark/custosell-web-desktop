import { PiggyBank } from 'lucide-react';

interface BudgetPickerProps {
  value: string;
  onChange: (value: string) => void;
  budgets: { id: number; name: string }[];
  hint?: string;
}

export default function BudgetPicker({ value, onChange, budgets, hint }: BudgetPickerProps) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-gray-400" /> Budget (optional)
        </h3>
      </div>
      <div className="p-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Which budget does this count toward?</label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">No budget — general</option>
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            {hint ?? 'Link this to a budget to see your progress toward it. Create budgets on the My Budgets page.'}
          </p>
        </div>
      </div>
    </div>
  );
}