import { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useExpenseCategories, useCreateExpense, useUpdateExpense } from '../api/ExpenseQueries';
import { useBillableProjects } from '../../estimates/api/useProjectQueries';
import { useFixedAssets } from '../../accounting/api/AccountingQueries';
import { cn } from '../../../shared/utils/cn';
import {
  Tag, DollarSign, Calendar, FileText, Hash, Paperclip, Repeat,
  FolderKanban, Package, Receipt, AlertCircle,
} from 'lucide-react';
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

function FormSection({ icon: Icon, title, children }: { icon: typeof Tag; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400" /> {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function ExpenseForm({ open, onClose, expense, shiftId }: ExpenseFormProps) {
  const { data: categories } = useExpenseCategories();
  const { data: projects } = useBillableProjects();
  const { data: fixedAssets = [] } = useFixedAssets();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const authShiftId = useAppSelector((s) => s.auth.user?.shift_id ?? null);
  const { taxEnabled: vatEnabled } = useBusinessTaxSettings();
  const activeShiftId = shiftId ?? authShiftId;

  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [fixedAssetId, setFixedAssetId] = useState('');
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
  const [errors, setErrors] = useState<{ amount?: string; description?: string; date?: string }>({});
  const [attempted, setAttempted] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = !!expense;

  useEffect(() => {
    queueMicrotask(() => {
      if (expense) {
        setCategoryId(expense.expense_category_id?.toString() || '');
        setProjectId('');
        setFixedAssetId(expense.fixed_asset_id?.toString() || '');
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
        setErrors({});
        setAttempted(false);
      } else {
        setCategoryId('');
        setProjectId('');
        setFixedAssetId('');
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
        setErrors({});
        setAttempted(false);
      }
    });
  }, [expense, open]);

  function validate(): { amount?: string; description?: string; date?: string } {
    const next: { amount?: string; description?: string; date?: string } = {};
    if (!amount.trim()) next.amount = 'Enter the expense amount.';
    if (!description.trim()) next.description = 'Describe what the expense was for.';
    if (!expenseDate) next.date = 'Pick the expense date.';
    return next;
  }

  const clearError = (key: keyof typeof errors) => {
    if (!errors[key]) return;
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setAttempted(true);
      if (nextErrors.amount) amountRef.current?.focus();
      else if (nextErrors.date) dateRef.current?.focus();
      else if (nextErrors.description) descriptionRef.current?.focus();
      return;
    }
    setAttempted(false);

    const formData = new FormData();
    if (categoryId) formData.append('expense_category_id', categoryId);
    if (projectId) formData.append('project_id', projectId);
    if (fixedAssetId) formData.append('fixed_asset_id', fixedAssetId);
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
  const title = isEditing ? 'Edit Expense' : 'Record Expense';
  const subtitle = isEditing
    ? 'Update the expense details below.'
    : 'Log a business expense and optionally attach a receipt.';

  return (
    <Modal isOpen={open} onClose={onClose} title={title} subtitle={subtitle} size="lg">
      <div className="space-y-5">

        {/* Hero */}
        <div className="flex items-start gap-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50/50 border border-orange-100 p-4">
          <div className="rounded-lg bg-gradient-to-br from-orange-500 to-red-600 p-2.5 shrink-0 shadow-sm">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-orange-900">
              {isEditing ? 'Edit expense' : 'New expense'}
            </p>
            <p className="text-xs text-orange-700 mt-0.5">
              {activeShiftId
                ? 'This expense will be linked to your active shift for handover reporting.'
                : 'Categorise your spending to track where your money goes.'}
            </p>
          </div>
        </div>

        {/* Category & Project */}
        <FormSection icon={Tag} title="Category & Project">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-orange-400 focus:outline-none"
            >
              <option value="">Select category</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project (optional)</label>
            <div className="relative">
              <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white appearance-none focus:border-orange-400 focus:outline-none"
              >
                <option value="">No project (general expense)</option>
                {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-400">Link to a project for automatic cost allocation.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fixed asset (optional)</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={fixedAssetId}
                onChange={(e) => setFixedAssetId(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white appearance-none focus:border-orange-400 focus:outline-none"
              >
                <option value="">No company asset</option>
                {fixedAssets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.asset_tag ? ` (${a.asset_tag})` : ''}</option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-400">Link repair or maintenance spend to a fixed asset.</p>
          </div>
        </FormSection>

        {/* Amount & Date */}
        <FormSection icon={DollarSign} title="Amount & Date">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">{getBusinessCurrency()}</span>
                <input
                  ref={amountRef}
                  type="number" min={0} step="100"
                  value={amount}
                  aria-invalid={!!errors.amount}
                  onChange={(e) => { setAmount(e.target.value); clearError('amount'); }}
                  className={cn(
                    'w-full pl-11 pr-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none',
                    errors.amount ? 'border-red-300 bg-red-50/40 focus:border-red-400' : 'border-gray-200 focus:border-orange-400',
                  )}
                  placeholder="0"
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs font-medium text-red-600">{errors.amount}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  ref={dateRef}
                  type="date"
                  value={expenseDate}
                  aria-invalid={!!errors.date}
                  onChange={(e) => { setExpenseDate(e.target.value); clearError('date'); }}
                  className={cn(
                    'w-full pl-10 pr-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none',
                    errors.date ? 'border-red-300 bg-red-50/40 focus:border-red-400' : 'border-gray-200 focus:border-orange-400',
                  )}
                />
              </div>
              {errors.date && <p className="mt-1 text-xs font-medium text-red-600">{errors.date}</p>}
            </div>
          </div>
        </FormSection>

        {/* Description */}
        <FormSection icon={FileText} title="Description *">
          <textarea
            ref={descriptionRef}
            value={description}
            aria-invalid={!!errors.description}
            onChange={(e) => { setDescription(e.target.value); clearError('description'); }}
            className={cn(
              'w-full px-3 py-2.5 border-2 rounded-lg text-sm min-h-[80px] focus:outline-none resize-none',
              errors.description ? 'border-red-300 bg-red-50/40 focus:border-red-400' : 'border-gray-200 focus:border-orange-400',
            )}
            placeholder="What was this expense for? e.g. Office supplies — printer toner and paper"
          />
          {errors.description && <p className="mt-1 text-xs font-medium text-red-600">{errors.description}</p>}
        </FormSection>

        {/* Reference & Receipt */}
        <FormSection icon={Paperclip} title="Reference & Receipt">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none"
                placeholder="e.g. INV-001, Receipt #1234"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Receipt</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceipt(e.target.files?.[0] || null)}
              disabled={isPending}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 disabled:opacity-40"
            />
            {expense?.receipt_url && !receipt && (
              <p className="text-xs text-gray-400 mt-1">
                Current: <a href={expense.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View receipt</a>
              </p>
            )}
          </div>
        </FormSection>

        {/* VAT */}
        {vatEnabled && (
          <FormSection icon={AlertCircle} title="Input VAT (purchases)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier TIN</label>
                <input
                  type="text"
                  value={supplierTin}
                  onChange={(e) => setSupplierTin(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="Supplier tax ID"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier invoice no.</label>
                <input
                  type="text"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="Invoice reference"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">VAT amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">{getBusinessCurrency()}</span>
                <input
                  type="number" min={0} step="0.01"
                  value={vatAmount}
                  onChange={(e) => setVatAmount(e.target.value)}
                  className="w-full pl-11 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vatClaimable}
                onChange={(e) => setVatClaimable(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Claimable input VAT</span>
            </label>
          </FormSection>
        )}

        {/* Recurrence */}
        <FormSection icon={Repeat} title="Recurrence">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-medium text-gray-700">Repeat this expense</span>
          </label>
          {isRecurring && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Interval</label>
                <select
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-orange-400 focus:outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Next due</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </FormSection>

        {/* Actions */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          {attempted && Object.values(errors).some(Boolean) && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Fill in the highlighted required fields to save the expense.</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              loading={isPending}
              disabled={isPending}
            >
              <Receipt className="h-4 w-4" />
              {isEditing ? 'Update Expense' : 'Save Expense'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
