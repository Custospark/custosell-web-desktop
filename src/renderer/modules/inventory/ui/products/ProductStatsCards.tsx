import { Package, Box, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Product } from '../../api/products/ProductTypes';
import { tracksStock } from '../../api/products/ProductTypes';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';

interface Props {
  products: Product[];
}

const cardStyles: Record<string, { border: string; shadow: string; iconBg: string; iconColor: string; badge: string; glow: string; hoverBg: string }> = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
  red: { border: 'border-red-500', shadow: 'hover:shadow-red-500/20', iconBg: 'bg-red-100', iconColor: 'text-red-600', badge: 'bg-red-100 text-red-700', glow: 'bg-red-500/10', hoverBg: 'group-hover:bg-red-200' },
};

export function ProductStatsCards({ products }: Props) {
  const stocked = products.filter((p) => tracksStock(p));
  const total = products.length;
  const active = products.filter((p) => p.is_active).length;
  const totalValue = stocked.reduce((sum, p) => sum + parseFloat(p.unit_price) * p.stock_quantity, 0);
  const lowStock = stocked.filter((p) => p.stock_quantity <= p.low_stock_threshold).length;

  const cards = [
    { label: 'Total Products', value: total.toLocaleString(), sub: 'All products in inventory', icon: Box, color: 'blue', badge: 'Total' },
    { label: 'Active Products', value: active.toLocaleString(), sub: `${total > 0 ? Math.round((active / total) * 100) : 0}% of total`, icon: Package, color: 'green', badge: 'Active', progress: total > 0 ? (active / total) * 100 : 0 },
    { label: 'Stock Value', value: formatCurrency(totalValue), sub: 'Total inventory value', icon: TrendingUp, color: 'amber', badge: 'Value' },
    { label: 'Low Stock Items', value: lowStock.toLocaleString(), sub: `${total > 0 ? Math.round((lowStock / total) * 100) : 0}% of inventory`, icon: AlertTriangle, color: 'red', badge: 'Alert' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const s = cardStyles[card.color];
        return (
          <div key={card.label}
            className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 bg-gradient-to-br from-white to-${card.color}-50/50 ${s.border} ${s.shadow} hover:-translate-y-0.5 group cursor-pointer min-h-[130px] flex flex-col justify-center`}>
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${s.glow}`} />
            <div className="flex items-center justify-between mb-4 relative">
              <div className={`p-3.5 rounded-xl transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
                <Icon className={`w-6 h-6 ${s.iconColor}`} />
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.badge}`}>{card.badge}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-0.5 relative">{card.value}</p>
            <p className="text-sm font-medium text-gray-500 relative">{card.label}</p>
            {card.progress !== undefined && (
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden relative">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${card.progress}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
