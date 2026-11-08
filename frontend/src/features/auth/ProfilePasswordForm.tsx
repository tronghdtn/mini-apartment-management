import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { useAuth } from './useAuth'
import { changePasswordSchema, type ChangePasswordInput } from './profileSchemas'

export function ProfilePasswordForm({ busy, onBusyChange }: { busy: boolean; onBusyChange: (busy: boolean) => void }) {
  const { changePassword } = useAuth()
  const navigate = useNavigate()
  const flight = useRef(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' } })
  async function submit(input: ChangePasswordInput) {
    if (flight.current) return
    flight.current = true; onBusyChange(true)
    try {
      const changed = await changePassword(input)
      form.reset()
      if (!changed) return // Superseded Auth operation must not redirect a newer login.
      navigate('/login', { replace: true })
    } catch (failure) {
      const code = isAxiosError(failure) ? failure.response?.status : undefined
      if ([422, 429, 419].includes(code ?? 0)) applyApiErrors(failure, form.setError, ['current_password', 'password', 'password_confirmation'])
      else {
        form.reset()
        navigate('/login', { replace: true })
      }
    } finally { flight.current = false; onBusyChange(false) }
  }
  return <form noValidate onSubmit={event => { void form.handleSubmit(submit)(event) }} className="space-y-4">
    <p className="text-sm text-slate-500">Sau khi đổi mật khẩu, tất cả phiên sẽ đăng xuất. Bạn cần đăng nhập lại bằng mật khẩu mới.</p>
    <fieldset disabled={busy} className="min-w-0 space-y-4" aria-label="Đổi mật khẩu">
      {([['current_password', 'Mật khẩu hiện tại', 'current-password'], ['password', 'Mật khẩu mới', 'new-password'], ['password_confirmation', 'Xác nhận mật khẩu mới', 'new-password']] as const).map(([key, label, complete]) => {
        const isVisible = !!visiblePasswords[key]
        return <div key={key}>
          <label htmlFor={`profile-${key}`} className="mb-1.5 block text-xs font-bold text-slate-700">{label}</label>
          <div className="relative">
            <input id={`profile-${key}`} type={isVisible ? 'text' : 'password'} autoComplete={complete} placeholder={key === 'current_password' ? 'Nhập mật khẩu đang dùng' : key === 'password' ? 'Mật khẩu mới (tối thiểu 8 ký tự)' : 'Nhập lại mật khẩu mới'} {...form.register(key)} aria-invalid={!!form.formState.errors[key]} aria-describedby={`profile-${key}-error`} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-sm text-slate-700" />
            <button
              type="button"
              onClick={() => setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }))}
              aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.formState.errors[key] && <p id={`profile-${key}-error`} role="alert" className="mt-1 text-xs text-rose-700">{form.formState.errors[key]?.message}</p>}
        </div>
      })}
      <p className="text-xs text-slate-500">Mật khẩu mới tối thiểu 8 ký tự, khác mật khẩu hiện tại và tối đa 72 byte.</p>
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" isLoading={form.formState.isSubmitting}>Đổi mật khẩu và đăng xuất</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => form.reset()}>Xóa nội dung mật khẩu</Button></div>
    </fieldset>
    {form.formState.errors.root && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.root.message}</p>}
  </form>
}
