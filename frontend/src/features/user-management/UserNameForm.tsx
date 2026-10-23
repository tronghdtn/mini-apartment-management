import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { updateUserName } from './api'
import { userNameSchema } from './schemas'
import type { UserNameInput } from './schemas'
import type { UserSummary } from './types'

interface UserNameFormProps {
  user: UserSummary
  onSaved: (user: UserSummary) => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}

export function UserNameForm({ user, onSaved, onCancel, onBusyChange }: UserNameFormProps) {
  const inFlight = useRef(false)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<UserNameInput>({
    resolver: zodResolver(userNameSchema), defaultValues: { full_name: user.full_name },
  })
  async function submit(input: UserNameInput) {
    if (inFlight.current) return
    inFlight.current = true
    setSaving(true)
    onBusyChange(true)
    try { onSaved(await updateUserName(user.id, input)) }
    catch (failure) { applyApiErrors(failure, setError, ['full_name']) }
    finally { inFlight.current = false; setSaving(false); onBusyChange(false) }
  }
  return <form onSubmit={event => { void handleSubmit(submit)(event) }} noValidate aria-busy={saving || isSubmitting} className="space-y-4">
    <div>
      <label htmlFor="user-full_name" className="block text-xs font-bold text-slate-700 mb-1">Họ và tên</label>
      <input id="user-full_name" {...register('full_name')} disabled={saving || isSubmitting} aria-invalid={!!errors.full_name} aria-describedby="user-full_name-error"
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" />
      <p id="user-full_name-error" className="text-xs text-rose-600 mt-1">{errors.full_name?.message}</p>
    </div>
    <p className="text-xs text-slate-500">Chỉ cập nhật họ tên. Thông tin đăng nhập và dữ liệu pháp lý được giữ nguyên.</p>
    {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
      <Button type="button" variant="outline" disabled={saving || isSubmitting} onClick={onCancel}>Hủy</Button>
      <Button type="submit" isLoading={saving || isSubmitting}>Lưu họ tên</Button>
    </div>
  </form>
}
