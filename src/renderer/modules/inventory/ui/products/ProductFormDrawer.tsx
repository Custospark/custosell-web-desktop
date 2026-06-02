import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategories, useCreateProduct, useUpdateProduct } from '../../api/products/ProductQueries';
import type { Product, CreateProductData } from '../../api/products/ProductTypes';
import { SlideDrawer } from '../../../../shared/components/modals/SlideDrawer';
import { Package, DollarSign, Barcode, Tag, Archive, AlertTriangle, Percent, FileText, FolderTree } from 'lucide-react';

interface ProductFormDrawerProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

interface FormState {
  name: string; category_id: number | null; description: string | null;
  sku: string | null; barcode: string | null; is_active: boolean;
  unit_price: string; cost_price: string; stock_quantity: string;
  low_stock_threshold: string; tax_percentage: string;
}

const emptyForm: FormState = {
  name: '', category_id: null, description: null,
  sku: null, barcode: null, is_active: true,
  unit_price: '', cost_price: '', stock_quantity: '0',
  low_stock_threshold: '5', tax_percentage: '0',
};

function toNumber(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function toCreatePayload(f: FormState): CreateProductData {
  return {
    name: f.name, category_id: f.category_id, description: f.description,
    sku: f.sku, barcode: f.barcode, is_active: f.is_active,
    unit_price: toNumber(f.unit_price),
    cost_price: f.cost_price === '' ? null : toNumber(f.cost_price),
    stock_quantity: toNumber(f.stock_quantity),
    low_stock_threshold: toNumber(f.low_stock_threshold),
    tax_percentage: toNumber(f.tax_percentage),
  };
}

export default function ProductFormDrawer({ open, onClose, product }: ProductFormDrawerProps) {
  const isEditing = !!product;
  const { data: categories } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name, category_id: product.category_id, description: product.description,
        sku: product.sku, barcode: product.barcode, is_active: product.is_active,
        unit_price: product.unit_price, cost_price: product.cost_price ?? '',
        stock_quantity: String(product.stock_quantity), low_stock_threshold: String(product.low_stock_threshold),
        tax_percentage: product.tax_percentage,
      });
    } else {
      setForm(emptyForm);
    }
  }, [product, open]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => setForm((p) => ({ ...p, [key]: val })), []);

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
      title={isEditing ? 'Edit Product' : 'Add Product'}
      subtitle={isEditing ? 'Update product details' : 'Create a new product'}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
    >
      {/* Basic Information */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Basic Information</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelClass}>Product Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter product name" required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <div className="relative">
              <FolderTree className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select className={inputClass} value={form.category_id ?? ''} onChange={(e) => update('category_id', e.target.value ? Number(e.target.value) : null)}>
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
            <label className={labelClass}>Unit Price (UGX) <span className="text-red-500">*</span></label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="number" step="0.01" min={0} value={form.unit_price} onChange={(e) => update('unit_price', e.target.value)} required placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Cost Price (optional)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="number" step="0.01" min={0} value={form.cost_price} onChange={(e) => update('cost_price', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tax %</label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="number" step="0.01" min={0} max={100} value={form.tax_percentage} onChange={(e) => update('tax_percentage', e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Inventory</h3>
        </div>
        <div className="p-4 space-y-4">
          {isEditing ? (
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
          <div>
            <label className={labelClass}>Low Stock Threshold</label>
            <div className="relative">
              <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="number" min={0} value={form.low_stock_threshold} onChange={(e) => update('low_stock_threshold', e.target.value)} placeholder="5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active ?? true} onChange={(e) => update('is_active', e.target.checked)} className="rounded border-gray-300 text-blue-600" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Product is active</label>
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
