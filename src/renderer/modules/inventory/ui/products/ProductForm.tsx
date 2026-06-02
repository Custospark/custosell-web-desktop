import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct, useCreateProduct, useUpdateProduct, useCategories } from '../../api/products/ProductQueries';
import type { CreateProductData } from '../../api/products/ProductTypes';
import { Button } from '../../../../shared/components/buttons/Button';
import { Input } from '../../../../shared/components/inputs/Input';
import { Select } from '../../../../shared/components/inputs/Select';
import { Card } from '../../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { useToast } from '../../../../app/contexts/useToast';
import { ArrowLeft } from 'lucide-react';

const emptyForm: CreateProductData = {
  name: '',
  unit_price: 0,
  category_id: null,
  description: null,
  sku: null,
  barcode: null,
  cost_price: null,
  stock_quantity: 0,
  low_stock_threshold: 5,
  tax_percentage: 0,
  is_active: true,
};

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { data: categories } = useCategories();
  const { data: product, isLoading: isLoadingProduct } = useProduct(id ? Number(id) : 0);
  const { showToast } = useToast();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const [formData, setFormData] = useState<CreateProductData>(emptyForm);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        unit_price: parseFloat(product.unit_price),
        category_id: product.category_id,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        cost_price: product.cost_price ? parseFloat(product.cost_price) : null,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        tax_percentage: parseFloat(product.tax_percentage),
        is_active: product.is_active,
      });
    }
  }, [product]);

  const updateField = <K extends keyof CreateProductData>(key: K, value: CreateProductData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const onSuccess = () => {
      showToast('success', isEditing ? 'Product updated' : 'Product created');
      navigate('/inventory/products');
    };

    if (isEditing && id) {
      updateMutation.mutate(
        { id: Number(id), data: formData },
        { onSuccess },
      );
    } else {
      createMutation.mutate(formData, { onSuccess });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingProduct) {
    return <LoadingSkeleton variant="default" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory/products')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Product' : 'Add Product'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditing ? 'Update product details' : 'Create a new product'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
            <Select
              label="Category"
              value={formData.category_id ? String(formData.category_id) : ''}
              onChange={(e) => updateField('category_id', e.target.value ? Number(e.target.value) : null)}
              options={categories?.map((c) => ({ value: String(c.id), label: c.name })) || []}
              placeholder="No category"
            />
            <Input
              label="Unit Price"
              type="number"
              step="0.01"
              min={0}
              value={formData.unit_price}
              onChange={(e) => updateField('unit_price', parseFloat(e.target.value) || 0)}
              required
            />
            <Input
              label="Cost Price (optional)"
              type="number"
              step="0.01"
              min={0}
              value={formData.cost_price ?? ''}
              onChange={(e) => updateField('cost_price', e.target.value ? parseFloat(e.target.value) : null)}
            />
            <Input
              label="Stock Quantity"
              type="number"
              min={0}
              value={formData.stock_quantity}
              onChange={(e) => updateField('stock_quantity', parseInt(e.target.value) || 0)}
            />
            <Input
              label="Low Stock Threshold"
              type="number"
              min={0}
              value={formData.low_stock_threshold}
              onChange={(e) => updateField('low_stock_threshold', parseInt(e.target.value) || 0)}
            />
            <Input
              label="SKU (optional)"
              value={formData.sku || ''}
              onChange={(e) => updateField('sku', e.target.value || null)}
            />
            <Input
              label="Barcode (optional)"
              value={formData.barcode || ''}
              onChange={(e) => updateField('barcode', e.target.value || null)}
            />
            <Input
              label="Tax Percentage"
              type="number"
              step="0.01"
              min={0}
              max={100}
              value={formData.tax_percentage}
              onChange={(e) => updateField('tax_percentage', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value || null)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active ?? true}
              onChange={(e) => updateField('is_active', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => navigate('/inventory/products')}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
