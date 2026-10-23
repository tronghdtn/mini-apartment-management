import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { changeUserStatus } from './api'
import type { UserSummary } from './types'

interface UserStatusActionProps {
  user: UserSummary
  onChanged: (user: UserSummary) => void
}

export function UserStatusAction({ user, onChanged }: UserStatusActionProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  if (user.role === 'admin') return null

  const locking = user.status === 'active'
  const label = locking ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
  const close = () => { if (!inFlight.current) setOpen(false) }
  async function confirm() {
    if (inFlight.current) return
    inFlight.current = true
    setSaving(true)
    setError('')
    try {
      const updated = await changeUserStatus(user.id, locking ? 'locked' : 'active')
      setOpen(false)
      onChanged(updated)
    } catch (failure) { setError(apiErrorMessage(failure)) }
    finally { inFlight.current = false; setSaving(false) }
  }
  return <>
    <Button type="button" variant="outline" onClick={() => { setError(''); setOpen(true) }}>{label}</Button>
    <Modal isOpen={open} onClose={close} title={label}>
      <div className="space-y-4" aria-busy={saving}>
        <p className="text-sm text-slate-700 break-words">{locking ? 'Khóa' : 'Mở khóa'} tài khoản <strong>{user.full_name}</strong>?</p>
        <p className="text-sm text-slate-500">{locking
          ? 'Tài khoản sẽ bị chặn đăng nhập và sử dụng hệ thống. Hồ sơ và lịch sử liên quan được giữ nguyên.'
          : 'Tài khoản có thể đăng nhập lại bằng mật khẩu hiện tại. Vai trò và lịch sử được giữ nguyên.'}</p>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" disabled={saving} onClick={close}>Hủy</Button>
          <Button type="button" isLoading={saving} onClick={() => { void confirm() }}>Xác nhận {locking ? 'khóa' : 'mở khóa'}</Button>
        </div>
      </div>
    </Modal>
  </>
}
