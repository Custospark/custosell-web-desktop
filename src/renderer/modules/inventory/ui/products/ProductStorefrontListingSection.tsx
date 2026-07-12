import { useState } from 'react';
import { Store } from 'lucide-react';
import {
  PipelineFormSection,
} from '../../../pipeline/ui/pipelineFormFields';
import { Button } from '../../../../shared/components/buttons/Button';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import { useBusiness } from '../../../settings/api/settings/BusinessQueries';
import { useUpdateStorefrontListing, useUploadProductImage } from '../../api/products/ProductStorefrontQueries';
import type { Product } from '../../api/products/ProductTypes';
import { avatarUrl } from '../../../../shared/utils/avatarUrl';
import { useToast } from '../../../../app/contexts/useToast';

interface ProductStorefrontListingSectionProps {
  product: Product;
}

export function ProductStorefrontListingSection({ product }: ProductStorefrontListingSectionProps) {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { showToast } = useToast();
  const { data: business } = useBusiness();
  const updateListing = useUpdateStorefrontListing();
  const uploadImage = useUploadProductImage();
  const shopEnabled = Boolean(business?.storefront_enabled);

  const [listedDraft, setListedDraft] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const listed = listedDraft ?? Boolean(product.listed_for_storefront);

  const imageSrc = preview || (product.image_path ? avatarUrl(product.image_path) : null);

  return (
    <PipelineFormSection title="Public shop" icon={Store}>
      {!shopEnabled ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          Enable your public shop under Settings → Business to list products for guests.
        </p>
      ) : null}

      <div className="flex items-start gap-4 mb-3">
        <div className="h-20 w-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
          {imageSrc ? (
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">No image</div>
          )}
        </div>
        <div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
            <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
              {uploadImage.isPending ? 'Uploading…' : 'Upload image'}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              disabled={isOffline || uploadImage.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setPreview(String(reader.result));
                reader.readAsDataURL(file);
                uploadImage.mutate(
                  { id: product.id, file },
                  {
                    onSuccess: () => showToast('success', 'Product image updated'),
                    onError: () => showToast('error', 'Could not upload image'),
                  },
                );
              }}
            />
          </label>
          <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP up to 2 MB.</p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={listed}
          disabled={isOffline || !shopEnabled || !product.is_active || updateListing.isPending}
          onChange={(e) => setListedDraft(e.target.checked)}
          className="rounded border-gray-300 text-blue-600"
        />
        List on my public shop
      </label>

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={
            isOffline
            || !shopEnabled
            || updateListing.isPending
            || listed === Boolean(product.listed_for_storefront)
          }
          loading={updateListing.isPending}
          onClick={() => {
            updateListing.mutate(
              { id: product.id, listed_for_storefront: listed },
              {
                onSuccess: () => {
                  setListedDraft(null);
                  showToast('success', listed ? 'Listed on shop' : 'Removed from shop');
                },
                onError: () => showToast('error', 'Could not update shop listing'),
              },
            );
          }}
        >
          Save shop listing
        </Button>
      </div>
    </PipelineFormSection>
  );
}
