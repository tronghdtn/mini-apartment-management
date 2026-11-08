import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { createStaffUser } from './api'
import { staffUserSchema } from './schemas'
import type { StaffUserInput } from './schemas'
import type { UserSummary } from './types'

interface StaffUserFormProps {
  onCreated: (user: UserSummary) => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none'

export function StaffUserForm({ onCreated, onCancel, onBusyChange }: StaffUserFormProps) {
  const requestInFlight = useRef(false)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<StaffUserInput>({
    resolver: zodResolver(staffUserSchema),
    defaultValues: { full_name: '', phone: '', email: '', role: 'technician', password: '', password_confirmation: '' },
  })
  const fields = [
    { name: 'full_name', label: 'Họ và tên', type: 'text', placeholder: 'VD: Phạm Văn Kỹ Thuật' },
    { name: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: 'VD: 0912345678' },
    { name: 'email', label: 'Email (tùy chọn)', type: 'email', placeholder: 'VD: kythuat@miniapart.vn' },
    { name: 'password', label: 'Mật khẩu ban đầu', type: 'password', placeholder: 'Tối thiểu 8 ký tự (VD: Password123!)' },
    { name: 'password_confirmation', label: 'Nhập lại mật khẩu', type: 'password', placeholder: 'Nhập lại mật khẩu khớp ở trên' },
  ] as const
  async function submit(input: StaffUserInput) {
    if (requestInFlight.current) return
    requestInFlight.current = true
    setSaving(true)
    onBusyChange(true)
    try {
      const created = await createStaffUser(input)
      reset()
      onCreated(created)
    } catch (failure) {
      applyApiErrors(failure, setError, ['full_name', 'phone', 'email', 'role', 'password', 'password_confirmation'])
    } finally {
      requestInFlight.current = false
      setSaving(false)
      onBusyChange(false)
    }
  }
  return (
    <form onSubmit={event => { void handleSubmit(submit)(event) }} noValidate autoComplete="off" aria-busy={isSubmitting || saving} className="space-y-4 max-h-[calc(100dvh-13rem)] overflow-y-auto pr-1">
      <fieldset disabled={isSubmitting || saving} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="staff-user-role" className="block text-xs font-bold text-slate-700 mb-1">Vai trò nhân viên</label>
          <select id="staff-user-role" {...register('role')} aria-invalid={!!errors.role} aria-describedby="staff-user-role-error" className={inputClass}>
            <option value="technician">Kỹ thuật viên</option><option value="guard">Bảo vệ</option>
          </select>
          <p id="staff-user-role-error" className="text-xs text-rose-600 mt-1">{errors.role?.message}</p>
        </div>
        {fields.map(field => (
          <div key={field.name} className={field.name === 'full_name' ? 'sm:col-span-2' : ''}>
            <label htmlFor={`staff-user-${field.name}`} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{field.label}</label>
            <input id={`staff-user-${field.name}`} type={field.type} placeholder={field.placeholder} autoComplete={field.type === 'password' ? 'new-password' : 'off'} {...register(field.name)}
              aria-invalid={!!errors[field.name]} aria-describedby={`staff-user-${field.name}-error`} className={inputClass} />
            <p id={`staff-user-${field.name}-error`} className="text-xs text-rose-600 mt-1">{errors[field.name]?.message}</p>
          </div>
        ))}
      </fieldset>
      <p className="text-xs text-slate-500">Bàn giao thông tin đăng nhập trực tiếp qua kênh an toàn. Hệ thống chưa yêu cầu đổi mật khẩu ở lần đăng nhập đầu.</p>
      {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
      <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isSubmitting || saving} onClick={onCancel}>Hủy</Button>
        <Button type="submit" isLoading={isSubmitting || saving}>Tạo tài khoản</Button>
      </div>
    </form>
  )
}
