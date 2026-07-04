import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Select } from '../../../shared/components/inputs/Select';
import { Button } from '../../../shared/components/buttons/Button';
import { useAccountingPeriods } from '../api/AccountingQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { BarChart3, ClipboardList, Scale, Download, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface StatementCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  accent: 'blue' | 'green' | 'purple';
}

function StatementCard({ title, description, icon: Icon, route, accent }: StatementCardProps) {
  const navigate = useNavigate();
  return (
    <Card accent={accent} hover padding={false}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'p-2.5 rounded-lg',
            accent === 'blue' && 'bg-blue-50 text-blue-600',
            accent === 'green' && 'bg-green-50 text-green-600',
            accent === 'purple' && 'bg-purple-50 text-purple-600',
          )}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</p>
        <Button variant="outline" onClick={() => navigate(route)} className="w-full">
          View Report <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

export default function FinancialStatementsPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const { data: periods } = useAccountingPeriods();

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Financial Statements</h1>
              <p className="text-sm text-gray-500">View and export your financial reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1.5" />PDF
            </Button>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex gap-4 items-center">
        <Select
          label="Period"
          options={[
            { value: '', label: 'Current Period' },
            ...(periods ?? []).map((p) => ({ value: String(p.id), label: p.name })),
          ]}
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatementCard
          title="Trial Balance"
          description="Verify that total debits equal total credits. Check if your accounts are in balance before generating reports."
          icon={Scale}
          route={ROUTES.ACCOUNTING.TRIAL_BALANCE}
          accent="blue"
        />
        <StatementCard
          title="Income Statement"
          description="View revenue, cost of goods sold, operating expenses, and net profit for the selected period."
          icon={BarChart3}
          route={ROUTES.ACCOUNTING.INCOME_STATEMENT}
          accent="green"
        />
        <StatementCard
          title="Balance Sheet"
          description="Review your assets, liabilities, and equity. Confirm the accounting equation: Assets = Liabilities + Equity."
          icon={ClipboardList}
          route={ROUTES.ACCOUNTING.BALANCE_SHEET}
          accent="purple"
        />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Need more detail?</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Access the full Chart of Accounts, Journal Entries, or run a detailed Fixed Assets report.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => window.location.href = ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS}>
              Chart of Accounts
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = ROUTES.ACCOUNTING.JOURNAL_ENTRIES}>
              Journal Entries
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
