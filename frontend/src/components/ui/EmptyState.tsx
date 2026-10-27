import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center px-4 py-12 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon ?? <Inbox aria-hidden="true" className="h-7 w-7" />}</div><h2 className="text-base font-bold text-slate-800">{title}</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div>
}
