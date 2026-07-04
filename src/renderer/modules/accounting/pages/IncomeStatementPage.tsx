import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Select } from '../../../shared/components/inputs/Select';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useIncomeStatement, useAccountingPeriods } from '../api/AccountingQueries';
import { BarChart3 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

function AmountRow({ label, amount, bold, indent, positive }: { label: string; amount: number; bold?: boolean; indent?: boolean; positive?: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-between py-2',
      bold ? 'border-t border-gray-200 font-semibold' : 'text-gray-600',
      indent && 'pl-6',
    )}>
      <span className={cn(bold && 'text-gray-900')}>{label}</span>
      <span className={cn(
        'font-mono',
        positive ? 'text-green-600' : amount < 0 ? 'text-red-600' : 'text-gray-900',
      )}>
        {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}

export default function IncomeStatementPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const { data: periods } = useAccountingPeriods();
  const { data: statement, isLoading } = useIncomeStatement(periodId ? Number(periodId) : undefined);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Income Statement</h1>
            <p className="text-sm text-gray-500">Profit & loss overview</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-4 items-center">
        <Select
          label="Period"
          options={[
            { value: '', label: 'All Periods' },
            ...(periods ?? []).map((p) => ({ value: String(p.id), label: p.name })),
          ]}
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className="w-64"
        />
      </div>

      {isLoading ? <LoadingSpinner /> : statement && (
        <>
          <Card>
            <div className="text-sm text-gray-500 mb-4">
              Period: <span className="font-medium text-gray-900">{statement.period.name}</span>
              &nbsp;({statement.period.start_date} — {statement.period.end_date})
            </div>

            {statement.sections && Object.entries(statement.sections).map(([sectionName, accounts]) => (
              <div key={sectionName} className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">{sectionName}</h3>
                {accounts.map((acc) => (
                  <div key={acc.account_id} className="flex items-center justify-between py-1.5 text-sm pl-4 text-gray-600">
                    <span>{acc.code} - {acc.name}</span>
                    <span className="font-mono">{acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            ))}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Summary</h3>
            <div className="space-y-1">
              <AmountRow label="Total Revenue" amount={statement.total_revenue} bold positive />
              <AmountRow label="Cost of Goods Sold" amount={statement.total_cost_of_goods_sold} indent />
              <AmountRow label="Gross Profit" amount={statement.gross_profit} bold positive />
              <AmountRow label="Total Operating Expenses" amount={statement.total_operating_expenses} indent />
              <AmountRow label="Operating Income" amount={statement.operating_income} bold />
              <AmountRow label="Other Income" amount={statement.other_income} indent positive />
              <AmountRow label="Other Expenses" amount={statement.other_expenses} indent />
              <AmountRow label="Income Before Tax" amount={statement.net_income_before_tax} bold />
              <AmountRow label="Tax Expense" amount={statement.tax_expense} indent />
              <AmountRow
                label="Net Income"
                amount={statement.net_income}
                bold
                positive={statement.net_income >= 0}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
