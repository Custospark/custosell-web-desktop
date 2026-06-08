import { useDashboardSummary } from './DashboardQueries';
import { useExpenseSummary } from '../expenses/api/ExpenseQueries';
import { SalesTrendChart, ExpensePieChart } from './DashboardCharts';
import QuickReports from './QuickReports';
import { Badge } from '../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { DollarSign, ShoppingCart, Package, Users, ReceiptText, AlertTriangle, Clock } from 'lucide-react';

const methodBadge: Record<string, 'success' | 'primary' | 'warning' | 'neutral'> = {
  cash: 'success', mobile_money: 'primary', card: 'warning', other: 'neutral',
};

const cardStyles = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  purple: { border: 'border-purple-500', shadow: 'hover:shadow-purple-500/20', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', glow: 'bg-purple-500/10', hoverBg: 'group-hover:bg-purple-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
  indigo: { border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', glow: 'bg-indigo-500/10', hoverBg: 'group-hover:bg-indigo-200' },
};

const cards = [
  { label: 'Net Sales Today', key: 'today_net_sales' as const, format: true, icon: DollarSign, color: 'blue' as const, badge: 'Today' },
  { label: "Today's Sales", key: 'today_transactions' as const, format: false, icon: ShoppingCart, color: 'green' as const, badge: 'Sales' },
  { label: 'Products Sold', key: 'today_products_sold' as const, format: false, icon: Package, color: 'purple' as const, badge: 'Sold' },
  { label: "Today's Expenses", key: 'today_expenses' as const, format: true, icon: ReceiptText, color: 'amber' as const, badge: 'Expenses' },
  { label: 'Total Customers', key: 'total_customers' as const, format: false, icon: Users, color: 'indigo' as const, badge: 'Users' },
];

export default function DashboardPage() {
  const { data: summary, isLoading } = useDashboardSummary();
  const todayKey = new Date().toISOString().slice(0, 10);
  const { data: expenseSummary } = useExpenseSummary({ date_from: todayKey, date_to: todayKey });

  if (isLoading) return <LoadingSkeleton variant="table" />;

  const expenseCategories = (expenseSummary?.by_category ?? []).map((c) => ({
    name: c.category_name,
    value: c.total,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Today&apos;s business performance.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const s = cardStyles[card.color];
          const val = summary?.[card.key];
          const value = card.format ? formatCurrency(val ?? 0) : String(val ?? 0);
          const showNetBreakdown = card.key === 'today_net_sales' && summary
            && ((summary.today_refunds ?? 0) > 0 || (summary.today_expenses ?? 0) > 0);
          const secondary = showNetBreakdown && summary ? (
            <>
              Gross <span className="font-bold text-gray-700">{formatCurrency(summary.today_gross_sales ?? summary.today_revenue)}</span>
              {summary.today_refunds > 0 && <> · Refunds <span className="font-bold text-red-600">-{formatCurrency(summary.today_refunds)}</span></>}
              {summary.today_expenses > 0 && <> · Expenses <span className="font-bold text-red-600">-{formatCurrency(summary.today_expenses)}</span></>}
            </>
          ) : null;
          return (
            <div key={card.label}
              className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 bg-gradient-to-br from-white to-${card.color}-50/50 ${s.border} ${s.shadow} hover:-translate-y-0.5 group cursor-pointer min-h-[130px] flex flex-col justify-center`}>
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${s.glow}`} />
              <div className="flex items-center justify-between mb-4 relative">
                <div className={`p-3.5 rounded-xl transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
                  <Icon className={`w-6 h-6 ${s.iconColor}`} />
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.badge}`}>
                  {card.badge}
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-0.5 relative">{value}</p>
              <p className="text-sm font-medium text-gray-500 relative">{card.label}</p>
              {secondary && <p className="text-xs text-gray-500 mt-1 relative">{secondary}</p>}
            </div>
          );
        })}
      </div>

      {/* Main Content: Left Column + Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column — Sales Trend + Low Stock + Expense Chart */}
        <div className="lg:col-span-3 space-y-6">
          <SalesTrendChart data={summary?.sales_trend ?? []} />

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              Low Stock Alerts
              <span className="text-xs font-normal text-gray-400">· {summary?.active_products ?? 0} active products</span>
              {summary?.low_stock && summary.low_stock.length > 0 && (
                <span className="ml-auto text-xs font-normal text-gray-400">{summary.low_stock.length} item(s)</span>
              )}
            </h3>
            {(!summary?.low_stock || summary.low_stock.length === 0) ? (
              <p className="text-sm text-gray-400 text-center py-8">All products are well stocked</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {summary.low_stock.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg shrink-0">
                    <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                    <span className="text-sm font-semibold text-amber-700 shrink-0 ml-2">{p.stock_quantity} / {p.low_stock_threshold}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ExpensePieChart data={expenseCategories} title="Today's Expenses by Category" />
        </div>

        {/* Right Column — Reports + Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <QuickReports />

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              Recent Activity
            </h3>
            {(!summary?.recent_sales || summary.recent_sales.length === 0) ? (
              <p className="text-sm text-gray-400 text-center py-8">No recent sales</p>
            ) : (
              <div className="space-y-3">
                {summary.recent_sales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-gray-800 truncate">{s.receipt_number}</span>
                      <Badge variant={methodBadge[s.payment_method] || 'neutral'} className="shrink-0">{s.payment_method.replace('_', ' ')}</Badge>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(s.net_amount ?? s.total_amount)}</span>
                      {Boolean(s.refunds) && (
                        <p className="text-xs text-gray-400">Gross {formatCurrency(s.total_amount)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
