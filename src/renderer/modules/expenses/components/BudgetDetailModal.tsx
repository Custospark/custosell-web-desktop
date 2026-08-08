import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useBudgetDetail, usePurchaseLine, useBudgetAffordability } from '../api/BudgetQueries';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import {
  PiggyBank, ShoppingCart, Receipt, Wallet, ArrowRight, CheckCircle2, ShieldCheck, AlertTriangle, Loader2,
} from 'lucide-react';
import type { PersonalBudget, PersonalBudgetSummaryRow, BudgetLine } from '../api/BudgetTypes';

interface BudgetDetailModalProps {
  open: boolean;
  onClose: () => void;
  budget?: PersonalBudget | PersonalBudgetSummaryRow | null;
}

function PlanLineRow({ budgetId, line }: { budgetId: number; line: BudgetLine }) {
  const purchase = usePurchaseLine(budgetId);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{line.item_name}</p>
        <p className="text-xs text-gray-500">{line.quantity} × {getBusinessCurrency()} {Number(line.unit_price).toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-gray-700">{getBusinessCurrency()} {Number(line.line_total).toFixed(2)}</span>
        {line.purchased && line.expense_id ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Bought
          </span>
        ) : (
          <Button
            type="button" size="sm" variant="secondary" loading={purchase.isPending}
            onClick={() => purchase.mutate({ lineId: line.id, description: `Bought: ${line.item_name}` })}
          >
            <ArrowRight className="h-3.5 w-3.5" /> Convert to expense
          </Button>
        )}
      </div>
    </div>
  );
}

function AffordabilityBanner({ budgetId }: { budgetId: number }) {
  const { data, isLoading } = useBudgetAffordability(budgetId);
  if (isLoading || !data) return null;
  if (data.can_handle) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
        <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <p className="text-xs text-green-800">{data.recommendation}</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-800">{data.recommendation}</p>
    </div>
  );
}

export default function BudgetDetailModal({ open, onClose, budget }: BudgetDetailModalProps) {
  const { data, isLoading } = useBudgetDetail(budget?.id ?? 0);
  if (!open || !budget) return null;

  const lines = data?.lines ?? [];
  const pendingCount = lines.filter((l) => !l.purchased).length;
  const summary = data?.summary;

  return (
    <Modal isOpen={open} onClose={onClose} title={budget.name} subtitle="Your plan, spending, and what's left in this budget." size="lg">
      <div className="space-y-5">
        <div className="flex items-start gap-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 p-4">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shrink-0 shadow-sm">
            <PiggyBank className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-700 font-medium">{budget.description || 'Money goal'}</p>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <Field label="Planned" value={`${getBusinessCurrency()} ${Number(summary.planned).toFixed(2)}`} />
                <Field label="Spent" value={`${getBusinessCurrency()} ${Number(summary.actual_spend).toFixed(2)}`} accent="text-blue-700" />
                <Field label="Income in" value={`${getBusinessCurrency()} ${Number(summary.actual_income).toFixed(2)}`} accent="text-green-700" />
                <Field
                  label="Left"
                  value={`${getBusinessCurrency()} ${Number(summary.remaining).toFixed(2)}`}
                  accent={Number(summary.remaining) < 0 ? 'text-red-600' : 'text-blue-700'}
                />
              </div>
            )}
          </div>
        </div>

        <AffordabilityBanner budgetId={budget.id} />

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-gray-400" /> Plan / shopping list
            </h3>
            {pendingCount > 0 && <span className="text-xs text-gray-400">{pendingCount} not bought yet</span>}
          </div>
          <div className="p-3 space-y-2 max-h-56 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading plan…
              </div>
            ) : lines.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No plan items yet. Edit the budget to add a shopping list.</p>
            ) : (
              lines.map((line) => <PlanLineRow key={line.id} budgetId={budget.id} line={line} />)
            )}
          </div>
        </div>

        <TxList
          icon={<Receipt className="w-4 h-4 text-gray-400" />}
          title="Linked expenses"
          empty="No expenses linked to this budget yet."
        >
          {(data?.expenses ?? []).map((ex) => (
            <div key={ex.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="text-sm text-gray-600 truncate">{ex.description}</span>
              <span className="text-sm font-semibold text-gray-700">-{getBusinessCurrency()} {Number(ex.amount).toFixed(2)}</span>
            </div>
          ))}
        </TxList>

        <TxList
          icon={<Wallet className="w-4 h-4 text-gray-400" />}
          title="Linked income"
          empty="No income linked to this budget yet."
        >
          {(data?.income ?? []).map((inc) => (
            <div key={inc.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="text-sm text-gray-600 truncate">{inc.source_name}</span>
              <span className="text-sm font-semibold text-green-700">+{getBusinessCurrency()} {Number(inc.amount).toFixed(2)}</span>
            </div>
          ))}
        </TxList>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-white/70 border border-blue-100 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">{label}</p>
      <p className={`text-sm font-bold ${accent ?? 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function TxList({ icon, title, empty, children }: { icon: React.ReactNode; title: string; empty: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">{icon} {title}</h3>
      </div>
      <div className="p-3 space-y-1">
        {children || <p className="text-sm text-gray-400 text-center py-2">{empty}</p>}
      </div>
    </div>
  );
}