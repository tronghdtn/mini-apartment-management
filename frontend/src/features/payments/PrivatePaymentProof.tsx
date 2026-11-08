import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { ImageIcon } from 'lucide-react'
import { Lightbox } from '@/components/ui/Lightbox'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getPaymentProof } from './api'

/** Ảnh minh chứng nằm ở kho riêng tư: chỉ tải khi bấm, mở trong khung xem ảnh, thu hồi URL khi rời màn. */
export function PrivatePaymentProof({ id, label, onAuthFailure }: { id: number; label: string; onAuthFailure: () => void }) {
  const [photo, setPhoto] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const flight = useRef<AbortController | null>(null)
  const url = useRef('')
  useEffect(() => () => { flight.current?.abort(); if (url.current) URL.revokeObjectURL(url.current) }, [])
  async function show() {
    if (photo) { setOpen(true); return }
    if (flight.current) return
    const abort = new AbortController()
    flight.current = abort
    setBusy(true)
    setError('')
    try {
      const blob = await getPaymentProof(id, abort.signal)
      if (abort.signal.aborted) return
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error('Ảnh không hợp lệ.')
      url.current = URL.createObjectURL(blob)
      setPhoto(url.current)
      setOpen(true)
    } catch (failure) {
      if (!abort.signal.aborted) {
        setError(apiErrorMessage(failure))
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
      }
    } finally {
      if (!abort.signal.aborted) { flight.current = null; setBusy(false) }
    }
  }
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => void show()}
        aria-label={`Xem ảnh minh chứng ${label}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60 cursor-pointer"
      >
        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />{busy ? 'Đang mở…' : 'Xem ảnh'}
      </button>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      {photo && <Lightbox isOpen={open} onClose={() => setOpen(false)} images={[photo]} currentIndex={0} setCurrentIndex={() => {}} roomTitle={`Minh chứng chuyển khoản · ${label}`} />}
    </>
  )
}
