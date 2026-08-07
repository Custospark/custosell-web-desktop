import { AlertCircle } from 'lucide-react';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import { FormSection } from './ExpenseFormSection';

interface InputVatSectionProps {
  supplierTin: string;
  supplierInvoiceNo: string;
  vatAmount: string;
  vatClaimable: boolean;
  onSupplierTinChange: (value: string) => void;
  onSupplierInvoiceNoChange: (value: string) => void;
  onVatAmountChange: (value: string) => void;
  onVatClaimableChange: (checked: boolean) => void;
}

export default function InputVatSection({
  supplierTin,
  supplierInvoiceNo,
  vatAmount,
  vatClaimable,
  onSupplierTinChange,
  onSupplierInvoiceNoChange,
  onVatAmountChange,
  onVatClaimableChange,
}: InputVatSectionProps) {
  const inputClass = 'w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none';

  return (
    <FormSection icon={AlertCircle} title="Input VAT (purchases)">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Supplier TIN</label>
          <input
            type="text"
            value={supplierTin}
            onChange={(e) => onSupplierTinChange(e.target.value)}
            className={inputClass}
            placeholder="Supplier tax ID"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Supplier invoice no.</label>
          <input
            type="text"
            value={supplierInvoiceNo}
            onChange={(e) => onSupplierInvoiceNoChange(e.target.value)}
            className={inputClass}
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
            onChange={(e) => onVatAmountChange(e.target.value)}
            className="w-full pl-11 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={vatClaimable}
          onChange={(e) => onVatClaimableChange(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Claimable input VAT</span>
      </label>
    </FormSection>
  );
}