import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { updateQuantity } from '../api/salesSlice';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Package, Hash, ArrowRight } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { canAccessModule } from '../../../shared/utils/moduleAccess';

interface Props {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  currentQty: number;
  maxQty: number;
  /** Price tier of the cart line; disambiguates when the same product is added at both retail and wholesale. */
  tier?: 'retail' | 'wholesale';
  /** When set, updates quantity via callback instead of the sales cart slice. */
  onConfirm?: (quantity: number) => void;
  /** Weight/volume units (kg, litre) accept fractional quantities; pieces are whole numbers. */
  supportsDecimalQuantity?: boolean;
  /** Selling unit label, shown as "per Kg" / "per Piece". */
  unit?: string | null;
  /** Unit price of the line, used for the live line-total preview. */
  lineUnitPrice?: number;
}

const DECIMAL_PRESETS = [0.25, 0.5, 1, 2, 5];
const INTEGER_PRESETS = [1, 2, 5, 10, 20];

export default function QuantityEditModal({
  open, onClose, productId, productName, currentQty, maxQty, tier, onConfirm,
  supportsDecimalQuantity = false, unit, lineUnitPrice,
}: Props) {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);
  const [qty, setQty] = useState(String(currentQty));
  const inputRef = useRef<HTMLInputElement>(null);

  const presets = supportsDecimalQuantity ? DECIMAL_PRESETS : INTEGER_PRESETS;

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset qty when modal opens
      setQty(String(currentQty));
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [open, currentQty]);

  const parsed = parseFloat(qty);
  const exceedsStock = maxQty > 0 && parsed > maxQty;
  const isInvalid = !qty || Number.isNaN(parsed) || parsed <= 0 || exceedsStock;
  const lineTotal = Number.isNaN(parsed) || parsed <= 0
    ? 0
    : Math.round((lineUnitPrice ?? 0) * parsed * 100) / 100;

  const handleSave = () => {
    const n = parseFloat(qty);
    if (n <= 0) return;
    if (onConfirm) {
      if (maxQty > 0 && n > maxQty) return;
      onConfirm(n);
    } else if (n <= maxQty) {
      dispatch(updateQuantity({ product_id: productId, tier, quantity: n }));
    }
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Update Quantity" size="sm">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <Package className="w-8 h-8 text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">{productName}</p>
            <p className="text-xs text-gray-500">Current: {currentQty}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            New Quantity{unit ? ` (per ${unit})` : ''}
          </label>
          {maxQty > 0 && maxQty < 9999 && (
            <p className="text-xs text-gray-400 mb-1.5">In stock: {maxQty} {unit ?? ''}</p>
          )}
          {maxQty >= 9999 && (
            <p className="text-xs text-gray-400 mb-1.5">Service - no stock limit</p>
          )}
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input ref={inputRef} type="number" min={supportsDecimalQuantity ? 0.001 : 1}
              step={supportsDecimalQuantity ? 0.1 : 1} max={maxQty || undefined} value={qty}
              onChange={(e) => setQty(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums" />
          </div>

          {supportsDecimalQuantity && (
            <div className="flex flex-wrap gap-2 mt-2">
              {presets.map((p) => (
                <button key={p} type="button" onClick={() => setQty(String(p))}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors ${
                    parseFloat(qty) === p
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}>
                  {p}{unit ? ` ${unit}` : ''}
                </button>
              ))}
            </div>
          )}

          {!Number.isNaN(parsed) && parsed > 0 && lineUnitPrice != null && (
            <p className="text-xs text-blue-700 mt-2 font-medium">
              Line total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'UGX', minimumFractionDigits: 2 }).format(lineTotal)}
            </p>
          )}

          {exceedsStock && (
            <p className="text-xs text-red-500 mt-1">Only {maxQty} in stock</p>
          )}
          {exceedsStock && canAccessModule(authUser, 'inventory') && (
            <p className="text-xs text-blue-600 mt-1">
              Stock is low -{' '}
              <Link to={ROUTES.INVENTORY.PRODUCTS} className="underline font-medium" onClick={onClose}>
                add more stock
              </Link>{' '}
              to keep selling this item.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={isInvalid} onClick={handleSave}>
            <ArrowRight className="w-4 h-4 mr-1.5" />Update
          </Button>
        </div>
      </div>
    </Modal>
  );
}
