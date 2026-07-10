import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategories, useCreateProduct, useUpdateProduct } from '../../api/products/ProductQueries';
import type { CatalogItemType, CreateProductData } from '../../api/products/ProductTypes';
import type { ProductWithSyncMeta } from '../../../../app/store/offline/inventory/localProductsStore';
import { SlideDrawer } from '../../../../shared/components/modals/SlideDrawer';
import { getBusinessCurrency } from '../../../../shared/utils/formatCurrency';
import { TAX_CLASS_LABELS, type TaxClass } from '../../../../shared/utils/taxEngine';
import { Package, DollarSign, Barcode, Tag, Archive, AlertTriangle, Percent, FileText, FolderTree, Wrench } from 'lucide-react';

interface ProductFormDrawerProps {
  open: boolean;
  onClose: () => void;
  product?: ProductWithSyncMeta | null;
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
  unit_price: string; wholesale_price: string; cost_price: string; stock_quantity: string;
  low_stock_threshold: string; tax_percentage: string; tax_class: TaxClass;
}

const emptyForm: FormState = {
  name: '', type: 'product', unit: '', category_id: null, description: null,
  sku: null, barcode: null, is_active: true,
  unit_price: '', wholesale_price: '', cost_price: '', stock_quantity: '0',
  low_stock_threshold: '5', tax_percentage: '0', tax_class: 'standard',
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
    unit_price: toNumber(f.unit_price),
    wholesale_price: f.wholesale_price === '' ? null : toNumber(f.wholesale_price),
    cost_price: f.cost_price === '' ? null : toNumber(f.cost_price),
    stock_quantity: isService ? 0 : toNumber(f.stock_quantity),
    low_stock_threshold: isService ? 0 : toNumber(f.low_stock_threshold),
    tax_percentage: toNumber(f.tax_percentage),
    tax_class: f.tax_class,
  };
}

export default function ProductFormDrawer({ open, onClose, product }: ProductFormDrawerProps) {
  const isEditing = !!product;
  const { data: categories } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(emptyForm);
  const isService = form.type === 'service';
  const itemLabel = isService ? 'Service' : 'Product';

  useEffect(() => {
    queueMicrotask(() => {
      if (product) {
        setForm({
          name: product.name, type: product.type === 'service' ? 'service' : 'product',
          unit: product.unit ?? '', category_id: product.category_id, description: product.description,
          sku: product.sku, barcode: product.barcode, is_active: product.is_active,
          unit_price: product.unit_price, wholesale_price: product.wholesale_price ?? '', cost_price: product.cost_price ?? '',
          stock_quantity: String(product.stock_quantity), low_stock_threshold: String(product.low_stock_threshold),
          tax_percentage: product.tax_percentage,
          tax_class: (product.tax_class as TaxClass) || 'standard',
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

  const canSubmit = useMemo(() => form.name.trim().length > 0 && form.unit_price !== '' && toNumber(form.unit_price) >= 0, [form]);

  const handleSubmit = () => {
    const payload = toCreatePayload(form);
    if (isEditing && product) {
      updateMutation.mutate({ id: product.id, data: payload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  const inputClass = "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit ${itemLabel}` : `Add ${itemLabel}`}
      subtitle={isEditing ? `Update ${itemLabel.toLowerCase()} details` : `Create a new ${itemLabel.toLowerCase()}`}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
      fullContentWidth
    >
      {product?._syncFailed && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Sync failed</p>
          <p className="mt-1">{product._lastError || 'Update the product details and save to retry sync.'}</p>
        </div>
      )}
      {/* Basic Information */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Basic Information</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelClass}>Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('product')}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.type === 'product'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Package className="w-4 h-4" />
                Product
              </button>
              <button
                type="button"
                onClick={() => setType('service')}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.type === 'service'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Wrench className="w-4 h-4" />
                Service
              </button>
            </div>
            {isService && (
              <p className="mt-2 text-xs text-gray-500">Services sell without stock limits and post to service revenue (4200).</p>
            )}
          </div>
          <div>
            <label className={labelClass}>{itemLabel} Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder={`Enter ${itemLabel.toLowerCase()} name`} required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Unit of Measure</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.unit} onChange={(e) => update('unit', e.target.value)} placeholder="e.g. Pieces, Kg, Litre" list="unit-list" />
              <datalist id="unit-list">
                {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <div className="relative">
              <FolderTree className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select className={inputClass} title="Category" value={form.category_id ?? ''} onChange={(e) => update('category_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">No category</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <textarea className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-h-[80px]" value={form.description ?? ''} onChange={(e) => update('description', e.target.value || null)} placeholder="Optional description" />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Pricing</h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Unit Price ({getBusinessCurrency()}) <span className="text-red-500">*</span></label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="number" step="0.01" min={0} value={form.unit_price} onChange={(e) => update('unit_price', e.target.value)} required placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Wholesale Price (optional)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="number" step="0.01" min={0} value={form.wholesale_price} onChange={(e) => update('wholesale_price', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          {!isService && (
            <div>
              <label className={labelClass}>Cost Price (optional)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input className={inputClass} type="number" step="0.01" min={0} value={form.cost_price} onChange={(e) => update('cost_price', e.target.value)} placeholder="0.00" />
              </div>
            </div>
          )}
          <div>
            <label className={labelClass}>Tax class</label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                className={inputClass}
                value={form.tax_class}
                onChange={(e) => update('tax_class', e.target.value as TaxClass)}
              >
                {(Object.entries(TAX_CLASS_LABELS) as [TaxClass, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Tax % (standard only)</label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="number" step="0.01" min={0} max={100} value={form.tax_percentage} onChange={(e) => update('tax_percentage', e.target.value)} placeholder="0 = use business default" />
            </div>
          </div>
        </div>
      </div>

      {/* Inventory / Availability */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">{isService ? 'Availability' : 'Inventory'}</h3>
        </div>
        <div className="p-4 space-y-4">
          {isService ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Services do not track stock quantity. You can sell any quantity from the sales screen.
            </div>
          ) : isEditing ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Stock quantity is managed via stock adjustments. Use <strong>Adjust Stock</strong> to modify inventory levels.</span>
            </div>
          ) : (
            <div>
              <label className={labelClass}>Initial Stock Quantity</label>
              <div className="relative">
                <Archive className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input className={inputClass} type="number" min={0} value={form.stock_quantity} onChange={(e) => update('stock_quantity', e.target.value)} placeholder="0" />
              </div>
            </div>
          )}
          {!isService && (
            <div>
              <label className={labelClass}>Low Stock Threshold</label>
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input className={inputClass} type="number" min={0} value={form.low_stock_threshold} onChange={(e) => update('low_stock_threshold', e.target.value)} placeholder="5" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active ?? true} onChange={(e) => update('is_active', e.target.checked)} className="rounded border-gray-300 text-blue-600" />
            <label htmlFor="is_active" className="text-sm text-gray-700">{itemLabel} is active</label>
          </div>
        </div>
      </div>

      {/* Identification */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Identification</h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>SKU</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.sku ?? ''} onChange={(e) => update('sku', e.target.value || null)} placeholder="Optional SKU" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Barcode</label>
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.barcode ?? ''} onChange={(e) => update('barcode', e.target.value || null)} placeholder="Optional barcode" />
            </div>
          </div>
        </div>
      </div>
    </SlideDrawer>
  );
}
