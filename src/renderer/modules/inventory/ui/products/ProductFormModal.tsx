import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategories, useCreateProduct, useUpdateProduct } from '../../api/products/ProductQueries';
import type { CatalogItemType, Category, CreateProductData, Product } from '../../api/products/ProductTypes';
import type { ProductWithSyncMeta } from '../../../../app/store/offline/inventory/localProductsStore';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { getBusinessCurrency } from '../../../../shared/utils/formatCurrency';
import { TAX_CLASS_LABELS, type TaxClass } from '../../../../shared/utils/taxEngine';
import { cn } from '../../../../shared/utils/cn';
import CategoryFormModal from '../categories/CategoryFormModal';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from '../../../pipeline/ui/pipelineFormFields';
import {
  Package,
  DollarSign,
  Barcode,
  Tag,
  Archive,
  AlertTriangle,
  Percent,
  FileText,
  FolderTree,
  Wrench,
  RefreshCw,
  Check,
  Plus,
} from 'lucide-react';
import { ProductSupplyListingSection } from '../supply/ProductSupplyListingSection';
import { ProductStorefrontListingSection } from './ProductStorefrontListingSection';
import { ProductDiscountField } from './ProductDiscountField';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: ProductWithSyncMeta | null;
  onProductUpdated?: (product: Product) => void;
}

const COMMON_UNITS = [
  'Pieces', 'Box', 'Carton', 'Pack', 'Pair', 'Set', 'Dozen', 'Roll', 'Sheet',
  'Kg', 'g', 'Litre', 'mL', 'Metre', 'cm',
  'Sachet', 'Bottle', 'Can', 'Tin', 'Jar', 'Bag', 'Crate', 'Drum', 'Bucket',
  'Plate', 'Bowl', 'Cup', 'Glass', 'Bunch', 'Head', 'Piece',
];

interface FormState {
  name: string; type: CatalogItemType; unit: string; category_id: number | null; description: string | null;
  sku: string | null; barcode: string | null; is_active: boolean;
  is_recurring: boolean; billing_interval: string;
  unit_price: string; wholesale_price: string; cost_price: string; stock_quantity: string;
  low_stock_threshold: string; tax_percentage: string; tax_class: TaxClass;
  discount_percent: string;
}

const emptyForm: FormState = {
  name: '', type: 'product', unit: '', category_id: null, description: null,
  sku: null, barcode: null, is_active: true,
  is_recurring: false, billing_interval: 'month',
  unit_price: '', wholesale_price: '', cost_price: '', stock_quantity: '0',
  low_stock_threshold: '5', tax_percentage: '0', tax_class: 'standard',
  discount_percent: '',
};

function toNumber(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function toCreatePayload(f: FormState): CreateProductData {
  const isService = f.type === 'service';
  return {
    name: f.name, type: f.type, unit: f.unit || null, category_id: f.category_id, description: f.description,
    sku: f.sku, barcode: f.barcode, is_active: f.is_active,
    is_recurring: f.is_recurring,
    billing_interval: f.is_recurring ? (f.billing_interval || 'month') : null,
    unit_price: toNumber(f.unit_price),
    discount_percent: f.discount_percent === '' ? null : toNumber(f.discount_percent),
    wholesale_price: f.wholesale_price === '' ? null : toNumber(f.wholesale_price),
    cost_price: f.cost_price === '' ? null : toNumber(f.cost_price),
    stock_quantity: isService ? 0 : toNumber(f.stock_quantity),
    low_stock_threshold: isService ? 0 : toNumber(f.low_stock_threshold),
    tax_percentage: toNumber(f.tax_percentage),
    tax_class: f.tax_class,
  };
}

export default function ProductFormModal({ open, onClose, product, onProductUpdated }: ProductFormModalProps) {
  const isEditing = !!product;
  const { data: categories } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const isService = form.type === 'service';
  const itemLabel = isService ? 'Service' : 'Product';

  useEffect(() => {
    queueMicrotask(() => {
      if (product) {
        setForm({
          name: product.name, type: product.type === 'service' ? 'service' : 'product',
          unit: product.unit ?? '', category_id: product.category_id, description: product.description,
          sku: product.sku, barcode: product.barcode, is_active: product.is_active,
          is_recurring: product.is_recurring ?? false,
          billing_interval: product.billing_interval ?? 'month',
          unit_price: product.unit_price, wholesale_price: product.wholesale_price ?? '', cost_price: product.cost_price ?? '',
          stock_quantity: String(product.stock_quantity), low_stock_threshold: String(product.low_stock_threshold),
          tax_percentage: product.tax_percentage,
          tax_class: (product.tax_class as TaxClass) || 'standard',
          discount_percent:
            product.discount_percent != null && product.discount_percent !== ''
              ? String(product.discount_percent)
              : '',
        });
      } else {
        setForm(emptyForm);
      }
    });
  }, [product, open]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => setForm((p) => ({ ...p, [key]: val })), []);

  const setType = useCallback((type: CatalogItemType) => {
    setForm((p) => ({
      ...p,
      type,
      ...(type === 'service' ? { stock_quantity: '0', low_stock_threshold: '0' } : {}),
    }));
  }, []);

  const canSubmit = useMemo(
    () => form.name.trim().length > 0 && form.unit_price !== '' && toNumber(form.unit_price) >= 0,
    [form],
  );

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const payload = toCreatePayload(form);
    if (isEditing && product) {
      updateMutation.mutate({ id: product.id, data: payload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={isEditing ? `Edit ${itemLabel}` : `Add ${itemLabel}`}
      size="xl"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={isService ? Wrench : Package}
          tone="blue"
          title={isEditing ? `Update ${itemLabel.toLowerCase()}` : `New ${itemLabel.toLowerCase()}`}
          description={
            isService
              ? 'Services sell without stock limits and post to service revenue.'
              : 'Products track inventory and post to product sales revenue.'
          }
        />

        {product?._syncFailed ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">Sync failed</p>
            <p className="mt-1">{product._lastError || 'Update the details and save to retry sync.'}</p>
          </div>
        ) : null}

        <PipelineFormSection
          title="Basic information"
          icon={Package}
          description="Type, name, unit, and category."
        >
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Type</p>
            <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-2">
              {([
                { value: 'product' as const, label: 'Product', icon: Package, hint: 'Stock-tracked item' },
                { value: 'service' as const, label: 'Service', icon: Wrench, hint: 'No stock limits' },
              ]).map(({ value, label, icon: Icon, hint }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-colors',
                    form.type === value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <Icon className="mb-1 h-4 w-4 text-gray-600" />
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-[11px] text-gray-500">{hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PipelineIconField label={`${itemLabel} name`} icon={Package} required>
              <input
                className={pipelineInputClass}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder={`Enter ${itemLabel.toLowerCase()} name`}
                required
              />
            </PipelineIconField>
            <PipelineIconField label="Unit of measure" icon={Package}>
              <input
                className={pipelineInputClass}
                value={form.unit}
                onChange={(e) => update('unit', e.target.value)}
                placeholder="e.g. Pieces, Kg, Litre"
                list="product-unit-list"
              />
              <datalist id="product-unit-list">
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </PipelineIconField>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-gray-700">Category</label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCategoryModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Category
              </Button>
            </div>
            <div className="relative">
              <FolderTree className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                className={pipelineSelectClass}
                title="Category"
                value={form.category_id ?? ''}
                onChange={(e) => update('category_id', e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">No category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={form.description ?? ''}
                onChange={(e) => update('description', e.target.value || null)}
                placeholder="Optional description"
              />
            </div>
          </div>
        </PipelineFormSection>

        <PipelineFormSection
          title="Pricing & tax"
          icon={DollarSign}
          description={`Amounts use ${getBusinessCurrency()}.`}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PipelineIconField label={`Unit price (${getBusinessCurrency()})`} icon={DollarSign} required>
              <input
                className={pipelineInputClass}
                type="number"
                step="0.01"
                min={0}
                value={form.unit_price}
                onChange={(e) => update('unit_price', e.target.value)}
                required
                placeholder="0.00"
              />
            </PipelineIconField>
            <ProductDiscountField
              unitPrice={form.unit_price}
              discountPercent={form.discount_percent}
              onChange={(v) => update('discount_percent', v)}
            />
            <PipelineIconField label="Wholesale price (optional)" icon={DollarSign}>
              <input
                className={pipelineInputClass}
                type="number"
                step="0.01"
                min={0}
                value={form.wholesale_price}
                onChange={(e) => update('wholesale_price', e.target.value)}
                placeholder="0.00"
              />
            </PipelineIconField>
            {!isService ? (
              <PipelineIconField label="Cost price (optional)" icon={DollarSign}>
                <input
                  className={pipelineInputClass}
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.cost_price}
                  onChange={(e) => update('cost_price', e.target.value)}
                  placeholder="0.00"
                />
              </PipelineIconField>
            ) : null}
            <PipelineIconField label="Tax class" icon={Percent}>
              <select
                className={pipelineSelectClass}
                value={form.tax_class}
                onChange={(e) => update('tax_class', e.target.value as TaxClass)}
              >
                {(Object.entries(TAX_CLASS_LABELS) as [TaxClass, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </PipelineIconField>
            <PipelineIconField label="Tax % (standard only)" icon={Percent} hint="0 = use business default">
              <input
                className={pipelineInputClass}
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={form.tax_percentage}
                onChange={(e) => update('tax_percentage', e.target.value)}
                placeholder="0"
              />
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        <PipelineFormSection
          title={isService ? 'Availability' : 'Inventory'}
          icon={Archive}
          description={isService ? 'Services do not track stock.' : 'Opening stock and low-stock alerts.'}
        >
          {isService ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Services sell any quantity from the sales screen without stock gates.
            </div>
          ) : isEditing ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Stock quantity is managed via <strong>Adjust Stock</strong>, not this form.</span>
            </div>
          ) : (
            <PipelineIconField label="Initial stock quantity" icon={Archive}>
              <input
                className={pipelineInputClass}
                type="number"
                min={0}
                value={form.stock_quantity}
                onChange={(e) => update('stock_quantity', e.target.value)}
                placeholder="0"
              />
            </PipelineIconField>
          )}

          {!isService ? (
            <PipelineIconField label="Low stock threshold" icon={AlertTriangle}>
              <input
                className={pipelineInputClass}
                type="number"
                min={0}
                value={form.low_stock_threshold}
                onChange={(e) => update('low_stock_threshold', e.target.value)}
                placeholder="5"
              />
            </PipelineIconField>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              id="product_is_active"
              checked={form.is_active ?? true}
              onChange={(e) => update('is_active', e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            {itemLabel} is active
          </label>
        </PipelineFormSection>

        {isEditing && product && !isService ? (
          <ProductSupplyListingSection product={product} />
        ) : null}

        {isEditing && product ? (
          <ProductStorefrontListingSection
            key={product.id}
            product={product}
            onProductUpdated={onProductUpdated}
          />
        ) : null}

        <PipelineFormSection
          title="Recurring / subscription"
          icon={RefreshCw}
          description="Optional flag for Forecasting SaaS KPIs (MRR proxy)."
        >
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              id="product_is_recurring"
              checked={form.is_recurring}
              onChange={(e) => update('is_recurring', e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            Recurring / subscription {itemLabel.toLowerCase()}
          </label>
          {form.is_recurring ? (
            <PipelineIconField label="Billing interval" icon={RefreshCw}>
              <select
                className={pipelineSelectClass}
                value={form.billing_interval}
                onChange={(e) => update('billing_interval', e.target.value)}
                title="Billing interval"
              >
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Yearly</option>
              </select>
            </PipelineIconField>
          ) : null}
        </PipelineFormSection>

        <PipelineFormSection title="Identification" icon={Tag} description="Optional SKU and barcode.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PipelineIconField label="SKU" icon={Tag}>
              <input
                className={pipelineInputClass}
                value={form.sku ?? ''}
                onChange={(e) => update('sku', e.target.value || null)}
                placeholder="Optional SKU"
              />
            </PipelineIconField>
            <PipelineIconField label="Barcode" icon={Barcode}>
              <input
                className={pipelineInputClass}
                value={form.barcode ?? ''}
                onChange={(e) => update('barcode', e.target.value || null)}
                placeholder="Optional barcode"
              />
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <Check className="h-4 w-4" />
            {isEditing ? `Save ${itemLabel.toLowerCase()}` : `Add ${itemLabel.toLowerCase()}`}
          </Button>
        </div>
      </form>

      <CategoryFormModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCreated={(cat: Category) => update('category_id', cat.id)}
      />
    </Modal>
  );
}

