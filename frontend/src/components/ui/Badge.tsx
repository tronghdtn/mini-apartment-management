import React from 'react'

export type BadgeTone = 'emerald' | 'sky' | 'amber' | 'slate' | 'rose' | 'purple' | 'indigo'

interface BadgeProps {
  children: React.ReactNode
  tone?: BadgeTone
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'sky',
  dot = false,
  size = 'md',
  className = '',
}) => {
  const toneStyles: Record<BadgeTone, { badge: string; dot: string }> = {
    emerald: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/90', dot: 'bg-emerald-500' },
    sky: { badge: 'bg-sky-50 text-sky-700 border-sky-200/90', dot: 'bg-sky-500' },
    amber: { badge: 'bg-amber-50 text-amber-700 border-amber-200/90', dot: 'bg-amber-500' },
    slate: { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
    rose: { badge: 'bg-rose-50 text-rose-700 border-rose-200/90', dot: 'bg-rose-500' },
    purple: { badge: 'bg-purple-50 text-purple-700 border-purple-200/90', dot: 'bg-purple-500' },
    indigo: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/90', dot: 'bg-indigo-500' },
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border ${toneStyles[tone].badge} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${toneStyles[tone].dot}`} />}
      {children}
    </span>
  )
}
