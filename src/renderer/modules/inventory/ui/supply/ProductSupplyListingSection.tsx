import { useEffect, useMemo, useState } from 'react';
import { Store } from 'lucide-react';
import {
  PipelineFormSection,
  PipelineIconField,
  pipelineInputClass,
} from '../../../pipeline/ui/pipelineFormFields';
import { Button } from '../../../../shared/components/buttons/Button';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import { useBusiness } from '../../../settings/api/settings/BusinessQueries';
import { useUpdateSupplyListing } from '../../api/products/ProductQueries';
import type { Product } from '../../api/products/ProductTypes';
import { tracksStock } from '../../api/products/ProductTypes';
import { getBusinessCurrency } from '../../../../shared/utils/formatCurrency';

interface ProductSupplyListingSectionProps {
  product: Product;
}

export function ProductSupplyListingSection({ product }: ProductSupplyListingSectionProps) {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { data: business } = useBusiness();
  const updateListing = useUpdateSupplyListing();
  const openForSupply = Boolean(business?.is_open_for_supply);
  const canList = tracksStock(product) && product.is_active;

  const [listed, setListed] = useState(Boolean(product.listed_for_supply));
  const [supplyPrice, setSupplyPrice] = useState(
    product.supply_price != null ? String(product.supply_price) : product.wholesale_price ?? product.unit_price ?? '',
  );
  const [minQty, setMinQty] = useState(String(product.supply_min_qty ?? 1));

  useEffect(() => {
    setListed(Boolean(product.listed_for_supply));
    setSupplyPrice(
      product.supply_price != null ? String(product.supply_price) : product.wholesale_price ?? product.unit_price ?? '',
    );
    setMinQty(String(product.supply_min_qty ?? 1));
  }, [product]);

  const dirty = useMemo(() => {
    const priceNum = supplyPrice === '' ? null : Number(supplyPrice);
    const prevPrice = product.supply_price != null ? Number(product.supply_price) : null;
    return (
      listed !== Boolean(product.listed_for_supply)
      || priceNum !== prevPrice
      || Number(minQty || 1) !== Number(product.supply_min_qty ?? 1)
    );
  }, [listed, supplyPrice, minQty, product]);

  if (!canList) {
    return (
      <PipelineFormSection
        title="Supply marketplace"
        icon={Store}
        description="Only active physical products can be listed for other businesses."
      >
        <p className="text-sm text-gray-600">Services and inactive items cannot appear on the marketplace.</p>
      </PipelineFormSection>
    );
  }

  return (
    <PipelineFormSection
      title="Supply marketplace"
      icon={Store}
      description={
        openForSupply
          ? 'Opt-in listing for other businesses on the B2B marketplace.'
          : 'Turn on “Open for supply” in Business settings before listings are visible.'
      }
    >
      {!openForSupply ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Your business is not open for supply. Listings stay hidden until you enable the supply profile.
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={listed}
          disabled={isOffline || updateListing.isPending}
          onChange={(e) => setListed(e.target.checked)}
          className="rounded border-gray-300 text-blue-600"
        />
        List this product for supply
      </label>

      {listed ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PipelineIconField label={`Supply price (${getBusinessCurrency()})`} icon={Store} required>
            <input
              className={pipelineInputClass}
              type="number"
              step="0.01"
              min={0}
              value={supplyPrice}
              disabled={isOffline || updateListing.isPending}
              onChange={(e) => setSupplyPrice(e.target.value)}
              placeholder="0.00"
            />
          </PipelineIconField>
          <PipelineIconField label="Minimum order qty" icon={Store}>
            <input
              className={pipelineInputClass}
              type="number"
              min={1}
              value={minQty}
              disabled={isOffline || updateListing.isPending}
              onChange={(e) => setMinQty(e.target.value)}
              placeholder="1"
            />
          </PipelineIconField>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={isOffline || !dirty || updateListing.isPending || (listed && supplyPrice === '')}
          loading={updateListing.isPending}
          onClick={() => {
            updateListing.mutate({
              id: product.id,
              data: {
                listed_for_supply: listed,
                supply_price: listed ? Number(supplyPrice) : null,
                supply_min_qty: listed ? Math.max(1, Number(minQty) || 1) : 1,
              },
            });
          }}
        >
          Save listing
        </Button>
      </div>
      {isOffline ? (
        <p className="text-xs text-amber-700">Supply listing changes require a connection.</p>
      ) : null}
    </PipelineFormSection>
  );
}
