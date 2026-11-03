import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { useAuth } from './useAuth'
import { profileNameSchema, type ProfileNameInput } from './profileSchemas'
import type { AuthUser } from './types'

export function ProfileNameForm({ user, busy, onBusyChange }: { user: AuthUser; busy: boolean; onBusyChange: (busy: boolean) => void }) {
  const { updateProfile, refresh } = useAuth()
  const [success, setSuccess] = useState('')
  const flight = useRef(false)
  const form = useForm<ProfileNameInput>({ resolver: zodResolver(profileNameSchema), defaultValues: { full_name: user.full_name } })
  async function submit(input: ProfileNameInput) {
    if (flight.current) return
    flight.current = true; onBusyChange(true); setSuccess('')
    try { const saved = await updateProfile(input); form.reset({ full_name: saved.full_name }); setSuccess('Đã cập nhật họ và tên.') }
    catch (failure) {
      applyApiErrors(failure, form.setError, ['full_name'])
      if (isAxiosError(failure) && [401, 403, 409].includes(failure.response?.status ?? 0)) void refresh()
    } finally { flight.current = false; onBusyChange(false) }
  }
  const fieldClass = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700'
  return <form noValidate onSubmit={event => { void form.handleSubmit(submit)(event) }} className="space-y-4">
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <div><label htmlFor="profile-full-name" className="mb-1.5 block text-xs font-bold text-slate-700">Họ và tên</label>
        <input id="profile-full-name" autoComplete="name" {...form.register('full_name')} aria-invalid={!!form.formState.errors.full_name} aria-describedby="profile-name-error" className={fieldClass} />
        {form.formState.errors.full_name && <p id="profile-name-error" role="alert" className="mt-1 text-xs text-rose-700">{form.formState.errors.full_name.message}</p>}</div>
      {[['phone', 'Số điện thoại', user.phone], ['email', 'Email', user.email ?? '']].map(([key, label, value]) => <div key={key}>
        <label htmlFor={`profile-${key}`} className="mb-1.5 block text-xs font-bold text-slate-700">{label}</label>
        <input id={`profile-${key}`} value={value} readOnly placeholder={key === 'email' ? 'Chưa cung cấp email' : undefined} className={`${fieldClass} bg-slate-50`} /></div>)}
      <p className="text-xs leading-relaxed text-slate-500">Bạn có thể sửa họ tên hiển thị. Email, số điện thoại và thông tin pháp lý giữ nguyên tại đây.</p>
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={!form.formState.isDirty} isLoading={form.formState.isSubmitting}>Lưu họ tên</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => { form.reset({ full_name: user.full_name }); setSuccess('') }}>Hủy thay đổi tên</Button></div>
    </fieldset>
    {form.formState.errors.root && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.root.message}</p>}
    {success && <p role="status" className="text-sm text-teal-700">{success}</p>}
  </form>
}
