import React from 'react';

export default function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge
}) {
  const variantStyles = {
    default: {
      card: 'border-slate-200/80 hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-700',
      valueColor: 'text-slate-900'
    },
    positive: {
      card: 'border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/30 hover:border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-700',
      valueColor: 'text-emerald-700'
    },
    negative: {
      card: 'border-rose-200/80 bg-gradient-to-br from-white to-rose-50/30 hover:border-rose-300',
      iconBg: 'bg-rose-100 text-rose-700',
      valueColor: 'text-rose-700'
    },
    info: {
      card: 'border-sky-200/80 bg-gradient-to-br from-white to-sky-50/30 hover:border-sky-300',
      iconBg: 'bg-sky-100 text-sky-700',
      valueColor: 'text-sky-700'
    }
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={`bg-white p-5 rounded-2xl border shadow-sm transition duration-200 flex flex-col justify-between ${style.card}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h4 className={`text-2xl font-extrabold tracking-tight ${style.valueColor}`}>
            {value}
          </h4>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${style.iconBg} shadow-sm shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{subtitle}</span>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
