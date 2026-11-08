import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MoreHorizontal } from 'lucide-react'

export interface RowMenuItem {
  label: string
  icon?: ReactNode
  tone?: 'default' | 'danger'
  /** Có `to` thì là liên kết, ngược lại gọi `onSelect`. */
  to?: string
  onSelect?: () => void
}

/**
 * Menu "⋯" cho các hành động phụ trên một hàng bảng.
 * Dùng vị trí `fixed` theo nút bấm để không bị khung cuộn ngang của bảng cắt mất.
 */
export function RowMenu({ items, label, disabled = false }: { items: RowMenuItem[]; label: string; disabled?: boolean }) {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()
  const open = position !== null

  useEffect(() => {
    if (!open) return
    const close = () => setPosition(null)
    const onPointer = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close(); button.current?.focus() }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const entries = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
        const index = entries.indexOf(document.activeElement as HTMLElement)
        const next = event.key === 'ArrowDown' ? (index + 1) % entries.length : (index - 1 + entries.length) % entries.length
        entries[next]?.focus()
      }
    }
    // Chỉ một menu mở tại một thời điểm, kể cả khi mở bằng bàn phím (không có pointerdown).
    const onOtherOpen = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) close() }
    window.addEventListener('rowmenu:open', onOtherOpen)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => {
      window.removeEventListener('rowmenu:open', onOtherOpen)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, id])

  if (!items.length) return null

  function toggle() {
    if (open) { setPosition(null); return }
    const rect = button.current?.getBoundingClientRect()
    if (!rect) return
    // Gần mép dưới màn hình thì mở lên trên để menu không bị khuất.
    const height = items.length * 38 + 8
    const top = rect.bottom + 4 + height > window.innerHeight ? Math.max(rect.top - 4 - height, 8) : rect.bottom + 4
    window.dispatchEvent(new CustomEvent('rowmenu:open', { detail: id }))
    setPosition({ top, right: window.innerWidth - rect.right })
  }

  const itemClass = (tone: RowMenuItem['tone']) =>
    `flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none cursor-pointer ${tone === 'danger' ? 'text-rose-600 hover:bg-rose-50 focus:bg-rose-50' : 'text-slate-700 hover:bg-slate-50 focus:bg-slate-50'}`

  return (
    <>
      <button
        ref={button}
        type="button"
        disabled={disabled}
        onClick={event => { event.stopPropagation(); toggle() }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60 cursor-pointer"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {position && (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label={label}
          onClick={event => event.stopPropagation()}
          style={{ top: position.top, right: position.right }}
          className="fixed z-40 min-w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map(item => item.to ? (
            <Link key={item.label} role="menuitem" to={item.to} onClick={() => setPosition(null)} className={itemClass(item.tone)}>
              {item.icon}{item.label}
            </Link>
          ) : (
            <button key={item.label} role="menuitem" type="button" onClick={() => { setPosition(null); item.onSelect?.() }} className={itemClass(item.tone)}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
