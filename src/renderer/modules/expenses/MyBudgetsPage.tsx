import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBudgetsIndex, useDeleteBudget } from './api/BudgetQueries';
import BudgetCard from './components/BudgetCard';
import BudgetFormModal from './components/BudgetFormModal';
import BudgetDetailModal from './components/BudgetDetailModal';
import { downloadBudgetPdf } from './useBudgetPdf';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { Button } from '../../shared/components/buttons/Button';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Target, PiggyBank, Plus, Settings2, Wallet, LayoutDashboard, Search, X } from 'lucide-react';
import { DashboardStatCard } from '../../shared/components/cards/DashboardStatCard';
import { useToast } from '../../app/contexts/useToast';
import type { PersonalBudgetSummaryRow } from './api/BudgetTypes';

export default function MyBudgetsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useBudgetsIndex({ status: 'active' });
  const deleteMutation = useDeleteBudget();
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalBudgetSummaryRow | null>(null);
  const [viewing, setViewing] = useState<PersonalBudgetSummaryRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const budgetsList = data?.budgets ?? [];

  const years = useMemo(() => {
    const set = new Set<number>();
    budgetsList.forEach((b) => {
      if (b.period_start) set.add(new Date(b.period_start).getFullYear());
      if (b.period_end) set.add(new Date(b.period_end).getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [budgetsList]);

  const visibleBudgets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return budgetsList.filter((b) => {
      if (yearFilter !== 'all') {
        const inRange =
          (b.period_start && String(new Date(b.period_start).getFullYear()) === yearFilter) ||
          (b.period_end && String(new Date(b.period_end).getFullYear()) === yearFilter);
        if (!inRange) return false;
      }
      if (term && !b.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [budgetsList, yearFilter, searchTerm]);

  const handleNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (budget: PersonalBudgetSummaryRow) => {
    setViewing(null);
    setEditing(budget);
    setModalOpen(true);
  };

  const handleView = (budget: PersonalBudgetSummaryRow) => {
    setEditing(null);
    setModalOpen(false);
    setViewing(budget);
  };

  const handleDelete = async (budget: PersonalBudgetSummaryRow) => {
    const ok = await confirm({
      title: 'Delete this budget?',
      message: `Delete "${budget.name}"? Your linked income and expenses will be kept — they just won't count toward a budget anymore.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) deleteMutation.mutate(budget.id);
  };

  const handleDownload = async (budget: PersonalBudgetSummaryRow) => {
    setDownloadingId(budget.id);
    try {
      await downloadBudgetPdf(budget.id);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to download budget PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) return <CustosellLoader message="Loading your budgets…" />;

  if (isError) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-500 text-sm">Couldn't load your budgets.</p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <PiggyBank className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">My Budgets</h1>
            <p className="text-sm text-gray-500">Your money goals, and how you're tracking against them.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(ROUTES.EXPENSES.OVERVIEW)}>
            <LayoutDashboard className="w-4 h-4 mr-1.5" /> Money overview
          </Button>
          <Button variant="outline" onClick={() => navigate(ROUTES.EXPENSES.CATEGORIES)}>
            <Settings2 className="w-4 h-4 mr-1.5" /> Manage categories
          </Button>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-1.5" /> New budget
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashboardStatCard
          label="Planned total"
          value={formatCurrency(d.total_planned)}
          sub="Across all your budgets"
          icon={Target}
          color="blue"
          badge="Planned"
        />
        <DashboardStatCard
          label="Spent so far"
          value={formatCurrency(d.total_spend)}
          sub="From expenses linked to budgets"
          icon={Wallet}
          color="amber"
          badge="Spent"
        />
        <DashboardStatCard
          label="Income in"
          value={formatCurrency(d.total_income)}
          sub="From income linked to budgets"
          icon={PiggyBank}
          color="blue"
          badge="Income"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full">
          <div className="relative rounded-lg p-[2px]">
            <motion.div
              className="absolute inset-0 rounded-lg z-0"
              style={{ background: 'linear-gradient(90deg, #2563eb, #059669, #2563eb)', backgroundSize: '300% 100%' }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: searchFocused ? 2 : 6, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative rounded-[6px] overflow-hidden bg-white">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchFocused ? 'text-blue-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search your budgets by name…"
                title="Search budgets"
                className="w-full pl-9 pr-10 py-2.5 text-sm border-transparent bg-white text-gray-900 focus:outline-none rounded-[6px] placeholder:text-gray-400"
              />
              {searchTerm && (
                <button
                  title="Clear search"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        {years.length > 1 && (
          <div className="flex items-center gap-2 text-sm shrink-0">
            <span className="text-gray-500 text-xs">Year</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {d.budgets.length > 0 ? (
        visibleBudgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleBudgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onDownload={() => void handleDownload(budget)}
                downloading={downloadingId === budget.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-14">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">
              No budgets match your search{yearFilter !== 'all' ? ` in ${yearFilter}` : ''}.
            </p>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setYearFilter('all'); }}>
              Clear filters
            </Button>
          </div>
        )
      ) : (
        <div className="text-center py-14">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            You haven't created any budgets yet. Create one — like "Groceries", "June holiday", or "House savings" — and link your spending to it.
          </p>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-1.5" /> Create your first budget
          </Button>
        </div>
      )}

      <BudgetFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        budget={editing ? { ...editing, planned_amount: editing.planned_amount } : null}
      />
      <BudgetDetailModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        budget={viewing}
      />
    </div>
  );
}