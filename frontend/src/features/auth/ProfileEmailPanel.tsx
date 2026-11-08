import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { applyAuthErrors } from './errors'
import { emailErrorMessage, requestEmailChange, sendVerificationEmail } from './emailApi'
import { changeEmailSchema, type ChangeEmailInput } from './emailSchemas'
import type { AuthUser } from './types'

const inputClass = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700'

/** Q10/DB-D95: trạng thái xác minh, gửi lại liên kết và đổi email qua xác nhận ở địa chỉ mới. */
export function ProfileEmailPanel({ user, busy, onBusyChange }: { user: AuthUser; busy: boolean; onBusyChange: (busy: boolean) => void }) {
  const flight = useRef(false)
  const [notice, setNotice] = useState<{ ok: boolean; message: string }>()
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<ChangeEmailInput>({ resolver: zodResolver(changeEmailSchema), defaultValues: { email: '', current_password: '' } })
  async function guarded(action: () => Promise<void>) {
    if (flight.current) return
    flight.current = true; onBusyChange(true); setNotice(undefined)
    try { await action() } finally { flight.current = false; onBusyChange(false) }
  }
  const resend = () => guarded(async () => {
    try { setNotice({ ok: true, message: await sendVerificationEmail() }) } catch (error) { setNotice({ ok: false, message: emailErrorMessage(error) }) }
  })
  const change = (input: ChangeEmailInput) => guarded(async () => {
    try {
      setNotice({ ok: true, message: await requestEmailChange(input) })
      form.reset()
    } catch (error) {
      applyAuthErrors(error, form.setError, ['email', 'current_password'])
      form.setError('root', { message: emailErrorMessage(error) })
    }
  })
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs" aria-label="Email tài khoản">
    <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><MailCheck aria-hidden="true" className="h-4 w-4 text-teal-600" />Email tài khoản</h2>
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-0 break-all font-semibold text-slate-800">{user.email ?? 'Chưa có email'}</span>
      {user.email && <Badge tone={user.email_verified ? 'emerald' : 'amber'} size="sm">{user.email_verified ? 'Đã xác minh' : 'Chưa xác minh'}</Badge>}
    </div>
    {user.email && !user.email_verified && <div className="space-y-2">
      <p className="text-xs text-slate-500">Xác minh email để có thể tự khôi phục mật khẩu khi quên.</p>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void resend()}>Gửi email xác minh</Button>
    </div>}
    {notice && <p role={notice.ok ? 'status' : 'alert'} className={`rounded-xl p-3 text-sm ${notice.ok ? 'bg-teal-50 text-teal-800' : 'bg-rose-50 text-rose-700'}`}>{notice.message}</p>}
    <form noValidate onSubmit={event => { void form.handleSubmit(change)(event) }} className="space-y-3 border-t border-slate-100 pt-4">
      <h3 className="text-xs font-bold text-slate-700">{user.email ? 'Đổi email' : 'Thêm email'}</h3>
      <fieldset disabled={busy} className="min-w-0 space-y-3">
        {([['email', 'Email mới', 'email', 'email'], ['current_password', 'Mật khẩu hiện tại', 'password', 'current-password']] as const).map(([key, label, type, complete]) => {
          const isPassword = type === 'password'
          return <div key={key}>
            <label htmlFor={`profile-email-${key}`} className="mb-1.5 block text-xs font-bold text-slate-700">{label}</label>
            <div className="relative">
              <input id={`profile-email-${key}`} type={isPassword ? (showPassword ? 'text' : 'password') : type} autoComplete={complete} placeholder={isPassword ? 'Nhập mật khẩu hiện tại để xác thực' : 'VD: emailmoi@gmail.com'} {...form.register(key)} aria-invalid={!!form.formState.errors[key]} aria-describedby={`profile-email-${key}-error`} className={`${inputClass} ${isPassword ? 'pr-10' : ''}`} />
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
            {form.formState.errors[key] && <p id={`profile-email-${key}-error`} role="alert" className="mt-1 text-xs text-rose-700">{form.formState.errors[key]?.message}</p>}
          </div>
        })}
        <p className="text-xs text-slate-500">Hệ thống gửi liên kết tới email mới; email hiện tại giữ nguyên cho tới khi bạn bấm xác nhận trong thư.</p>
        {form.formState.errors.root && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.root.message}</p>}
        <Button type="submit" size="sm" isLoading={form.formState.isSubmitting}>Gửi liên kết xác nhận</Button>
      </fieldset>
    </form>
  </section>
}
