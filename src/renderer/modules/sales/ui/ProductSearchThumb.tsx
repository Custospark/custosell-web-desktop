import { Package } from 'lucide-react';
import { avatarUrl } from '../../../shared/utils/avatarUrl';

interface ProductSearchThumbProps {
  name: string;
  imagePath?: string | null;
  isService?: boolean;
}

export function ProductSearchThumb({ name, imagePath, isService }: ProductSearchThumbProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {imagePath ? (
        <img
          src={avatarUrl(imagePath)}
          alt=""
          className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg object-cover ring-1 ring-gray-200"
        />
      ) : (
        <div className="p-1 sm:p-1.5 rounded-lg bg-gray-100 text-gray-500 shrink-0">
          <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      )}
      <div className="min-w-0">
        <span className="text-sm font-medium text-gray-800 truncate block">{name}</span>
        {isService && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-blue-600">Service</span>
        )}
      </div>
    </div>
  );
}
