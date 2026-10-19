import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  icon?: React.ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
  tone?: 'default' | 'sky' | 'emerald' | 'amber' | 'rose'
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  tone = 'default',
}) => {
  const toneBg = {
    default: 'bg-white border-slate-200/90',
    sky: 'bg-sky-50/50 border-sky-100',
    emerald: 'bg-emerald-50/50 border-emerald-100',
    amber: 'bg-amber-50/50 border-amber-100',
    rose: 'bg-rose-50/50 border-rose-100',
  }

  const iconBg = {
    default: 'bg-slate-100 text-slate-700',
    sky: 'bg-sky-100 text-sky-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className={`p-4 rounded-2xl border shadow-xs ${toneBg[tone]} flex items-start justify-between gap-3`}>
      <div className="space-y-1">
        <span className="text-xs font-medium text-slate-500 block">{label}</span>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {subValue && <span className="text-[11px] text-slate-400 block">{subValue}</span>}
      </div>
      {icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg[tone]}`}>
          {icon}
        </div>
      )}
    </div>
  )
}
