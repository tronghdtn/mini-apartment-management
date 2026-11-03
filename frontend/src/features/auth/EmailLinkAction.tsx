import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { emailErrorMessage } from './emailApi'
import { useAuth } from './useAuth'

/**
 * Trang mở từ liên kết email: người dùng bấm nút để xác nhận (không tự gửi khi tải trang,
 * tránh trình quét thư hoặc tải lại trang dùng mất liên kết một lần).
 */
export function EmailLinkAction({ description, actionLabel, invalid, run }: {
  description: string; actionLabel: string; invalid?: string; run: () => Promise<string>
}) {
  const { status, refresh } = useAuth()
  const flight = useRef(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string }>()
  async function confirm() {
    if (flight.current) return
    flight.current = true; setBusy(true)
    try {
      setResult({ ok: true, message: await run() })
      if (status === 'authenticated') void refresh() // Cập nhật email/trạng thái xác minh trên hồ sơ đang mở.
    } catch (error) { setResult({ ok: false, message: emailErrorMessage(error) }) } finally { flight.current = false; setBusy(false) }
  }
  if (invalid) return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{invalid}</p>
  if (result?.ok) return <p role="status" className="rounded-xl bg-teal-50 p-4 text-sm text-teal-800">{result.message}</p>
  return <div className="space-y-4">
    <p className="text-sm text-slate-600">{description}</p>
    {result && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{result.message}</p>}
    <Button className="w-full font-bold" isLoading={busy} onClick={() => void confirm()}>{actionLabel}</Button>
  </div>
}
