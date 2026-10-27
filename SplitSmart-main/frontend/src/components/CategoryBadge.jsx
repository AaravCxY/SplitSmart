import React from 'react';
import {
  Utensils,
  Car,
  Home,
  ShoppingCart,
  Film,
  ShoppingBag,
  Zap,
  MoreHorizontal
} from 'lucide-react';

const CATEGORY_CONFIG = {
  Food: { icon: Utensils, bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  Transport: { icon: Car, bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  Accommodation: { icon: Home, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Groceries: { icon: ShoppingCart, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Entertainment: { icon: Film, bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  Shopping: { icon: ShoppingBag, bg: 'bg-pink-50 text-pink-700 border-pink-200' },
  Utilities: { icon: Zap, bg: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  Other: { icon: MoreHorizontal, bg: 'bg-slate-100 text-slate-700 border-slate-200' }
};

export default function CategoryBadge({ category, size = 'sm' }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Other;
  const Icon = config.icon;

  const sizeClass =
    size === 'xs'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-lg border ${config.bg} ${sizeClass}`}
    >
      <Icon className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{category}</span>
    </span>
  );
}
