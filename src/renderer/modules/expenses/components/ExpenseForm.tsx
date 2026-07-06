import { useState, useEffect } from 'react';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { useExpenseCategories, useCreateExpense, useUpdateExpense } from '../api/ExpenseQueries';
import { useProjects } from '../../estimates/api/useProjectQueries';
import { Tag, DollarSign, Calendar, FileText, Hash, Paperclip, Repeat, FolderKanban } from 'lucide-react';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useBusinessTaxSettings } from '../../settings/hooks/useBusinessTaxSettings';
import type { Expense } from '../api/ExpenseTypes';

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense | null;
  shiftId?: number | null;
}

export default function ExpenseForm({ open, onClose, expense, shiftId }: ExpenseFormProps) {
  const { data: categories } = useExpenseCategories();
  const { data: projects } = useProjects();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const authShiftId = useAppSelector((s) => s.auth.user?.shift_id ?? null);
  const { taxEnabled: vatEnabled } = useBusinessTaxSettings();
  const activeShiftId = shiftId ?? authShiftId;

  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [supplierTin, setSupplierTin] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [vatAmount, setVatAmount] = useState('');
  const [vatClaimable, setVatClaimable] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState('monthly');
  const [nextDueDate, setNextDueDate] = useState('');

  const isEditing = !!expense;

  useEffect(() => {
    queueMicrotask(() => {
      if (expense) {
        setCategoryId(expense.expense_category_id?.toString() || '');
        setProjectId('');
        setAmount(parseFloat(expense.amount).toString());
        setDescription(expense.description);
        setReference(expense.reference || '');
        setSupplierTin(expense.supplier_tin || '');
        setSupplierInvoiceNo(expense.supplier_invoice_no || '');
        setVatAmount(expense.vat_amount ? parseFloat(expense.vat_amount).toString() : '');
        setVatClaimable(expense.vat_claimable ?? false);
        setExpenseDate(expense.expense_date.split(' ')[0] || expense.expense_date);
        setIsRecurring(expense.is_recurring);
        setRecurrenceInterval(expense.recurrence_interval || 'monthly');
        setNextDueDate(expense.next_due_date || '');
        setReceipt(null);
      } else {
        setCategoryId('');
        setProjectId('');
        setAmount('');
        setDescription('');
        setReference('');
        setSupplierTin('');
        setSupplierInvoiceNo('');
        setVatAmount('');
        setVatClaimable(false);
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setIsRecurring(false);
        setRecurrenceInterval('monthly');
        setNextDueDate('');
        setReceipt(null);
      }
    });
  }, [expense, open]);

  const handleSubmit = () => {
    if (!amount || !description || !expenseDate) return;

    const formData = new FormData();
    if (categoryId) formData.append('expense_category_id', categoryId);
    if (projectId) formData.append('project_id', projectId);
    formData.append('amount', amount);
    formData.append('description', description);
    if (reference) formData.append('reference', reference);
    if (vatEnabled) {
      if (supplierTin) formData.append('supplier_tin', supplierTin);
      if (supplierInvoiceNo) formData.append('supplier_invoice_no', supplierInvoiceNo);
      if (vatAmount) formData.append('vat_amount', vatAmount);
      formData.append('vat_claimable', vatClaimable ? '1' : '0');
    }
    formData.append('expense_date', expenseDate);
    if (!isEditing && activeShiftId) formData.append('shift_id', String(activeShiftId));
    if (isEditing && expense?.shift_id) formData.append('shift_id', String(expense.shift_id));
    if (receipt) formData.append('receipt', receipt);
    if (isRecurring) {
      formData.append('is_recurring', '1');
      formData.append('recurrence_interval', recurrenceInterval);
      if (nextDueDate) formData.append('next_due_date', nextDueDate);
    }

    if (isEditing && expense) {
      updateMutation.mutate({ id: expense.id, data: formData }, { onSuccess: onClose });
    } else {
      createMutation.mutate(formData, { onSuccess: onClose });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = !!amount && !!description && !!expenseDate;

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Expense' : 'Record Expense'}
      subtitle={activeShiftId ? 'Linked to your active shift for handover reporting' : 'Log a business expense'}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      canSubmit={canSubmit}
    >
      <div className="space-y-5">

        {/* Category & Project */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Tag className="w-4 h-4 text-gray-400" /> Category &amp; Project</h3>
          </div>
          <div className="p-4 space-y-3">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select category</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div>
              <div className="relative">
                <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white appearance-none">
                  <option value="">No project (general expense)</option>
                  {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-400">Link to a project for automatic cost allocation and budget tracking.</p>
            </div>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" /> Amount &amp; Date</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{getBusinessCurrency()}</span>
                  <input type="number" min={0} step="100" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="date" value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Description</h3>
          </div>
          <div className="p-4">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="Expense description" />
          </div>
        </div>

        {/* Reference & Receipt */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Paperclip className="w-4 h-4 text-gray-400" /> Reference &amp; Receipt</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. INV-001" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt</label>
              <input type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
              {expense?.receipt_url && !receipt && (
                <p className="text-xs text-gray-400 mt-1">Current: <a href={expense.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View receipt</a></p>
              )}
            </div>
          </div>
        </div>

        {vatEnabled && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Tag className="w-4 h-4 text-gray-400" /> Input VAT (purchases)</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier TIN</label>
                  <input type="text" value={supplierTin} onChange={(e) => setSupplierTin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Supplier tax ID" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier invoice no.</label>
                  <input type="text" value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Invoice reference" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VAT amount on invoice</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{getBusinessCurrency()}</span>
                  <input type="number" min={0} step="0.01" value={vatAmount} onChange={(e) => setVatAmount(e.target.value)}
                    className="w-full pl-11 pr-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0.00" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={vatClaimable} onChange={(e) => setVatClaimable(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Include in VAT return as claimable input VAT</span>
              </label>
            </div>
          </div>
        )}

        {/* Recurrence */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Repeat className="w-4 h-4 text-gray-400" /> Recurrence</h3>
          </div>
          <div className="p-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">Repeat this expense</span>
            </label>
            {isRecurring && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
                  <select value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Due</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </SlideDrawer>
  );
}
