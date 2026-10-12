import { Link } from 'react-router'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-bold text-slate-900">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">MA</span>
      <span>Mini Apartment</span>
    </Link>
  )
}
