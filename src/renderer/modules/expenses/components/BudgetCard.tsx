import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Wallet, Pencil, Trash2, CalendarDays, TrendingUp, TrendingDown, Eye, Download, Loader2 } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import { CHART_THEME, formatAxisCurrency } from '../../../shared/components/charts/chartPrimitives';
import { cn } from '../../../shared/utils/cn';
import type { PersonalBudgetSummaryRow } from '../api/BudgetTypes';

interface BudgetCardProps {
  budget: PersonalBudgetSummaryRow;
  onEdit: (budget: PersonalBudgetSummaryRow) => void;
  onDelete: (budget: PersonalBudgetSummaryRow) => void;
  onView: (budget: PersonalBudgetSummaryRow) => void;
  onDownload: () => void;
  downloading?: boolean;
}

function PacingChart({ pacing }: { pacing: { label: string; budget: number; actual: number }[] }) {
  if (!pacing.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-600 mb-1">Your pace — planned vs spent</p>
      <ChartContainer className="h-40" minHeight={160}>
        {(size) => (
          <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
            <LineChart data={pacing} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={formatAxisCurrency} width={56} />
              <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0))} labelStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="budget" stroke={CHART_THEME.line} strokeWidth={2} dot={false} name="Planned" />
              <Line type="monotone" dataKey="actual" stroke={CHART_THEME.primary ?? '#10b981'} strokeWidth={2} dot={false} name="Spent" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>
    </div>
  );
}

export default function BudgetCard({ budget, onEdit, onDelete, onView, onDownload, downloading }: BudgetCardProps) {
  const over = budget.percentage > 100;
  const color = over ? 'bg-red-500' : budget.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onView(budget)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">{budget.name}</h3>
          </div>
          {(budget.period_start || budget.period_end) && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {budget.period_start ?? '…'} → {budget.period_end ?? '…'}
            </p>
          )}
          {budget.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{budget.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onView(budget)}
            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
            title="View budget"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-50"
            title="Download budget as PDF"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(budget)}
            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
            title="Edit budget"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(budget)}
            className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
            title="Delete budget"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-900">{formatCurrency(budget.planned_amount)}</span>
          <span className={cn('text-xs font-medium', over ? 'text-red-600' : 'text-gray-500')}>
            {formatCurrency(budget.actual_spend)} spent
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mt-1.5">
          <div
            className={cn('h-2 rounded-full transition-all', color)}
            style={{ width: `${Math.min(budget.percentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
          <span>{budget.percentage.toFixed(1)}% used</span>
          {over ? (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <TrendingDown className="w-3.5 h-3.5" /> {formatCurrency(Math.abs(budget.remaining))} over
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-600" /> {formatCurrency(budget.remaining)} left
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-blue-50 px-2 py-1.5">
          <span className="text-blue-700 font-medium">{formatCurrency(budget.actual_income)}</span>
          <span className="text-blue-600/70 ml-1">in</span>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-1.5">
          <span className="text-gray-700 font-medium">{budget.expense_count}</span>
          <span className="text-gray-500 ml-1">spends</span>
        </div>
      </div>

      <PacingChart pacing={budget.pacing} />

      <div className="grid grid-cols-2 gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="outline" size="sm" onClick={() => onView(budget)}>
          <Eye className="w-3.5 h-3.5 mr-1" /> View plan
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onDownload} disabled={downloading}>
            {downloading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
            PDF
          </Button>
          <Button variant="primary" size="sm" onClick={() => onEdit(budget)}>
            Adjust
          </Button>
        </div>
      </div>
    </div>
  );
}