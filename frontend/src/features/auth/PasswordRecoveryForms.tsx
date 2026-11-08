import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { isAxiosError } from 'axios'
import { applyAuthErrors } from './errors'
import { requestPasswordReset, resetPassword } from './emailApi'
import { forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordInput, type ResetPasswordInput } from './emailSchemas'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none'

/** Q4: luôn hiện cùng một thông điệp do Backend trả, không cho biết email có tồn tại hay không. */
export function ForgotPasswordForm() {
  const [sent, setSent] = useState('')
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' },
  })
  const submit = handleSubmit(async input => {
    try { setSent(await requestPasswordReset(input)) } catch (error) { applyAuthErrors(error, setError, ['email']) }
  })
  if (sent) return <p role="status" className="rounded-xl bg-teal-50 p-4 text-sm text-teal-800">{sent}</p>
  return <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isSubmitting}>
    <p className="text-sm text-slate-500">Nhập email đã xác minh của tài khoản. Liên kết đặt lại mật khẩu có hiệu lực 60 phút.</p>
    <div>
      <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Email</label>
      <input id="forgot-email" type="email" autoComplete="email" placeholder="VD: nguyenvanan@gmail.com" {...register('email')} className={inputClass} aria-invalid={!!errors.email} aria-describedby="forgot-email-error" />
      <p id="forgot-email-error" className="mt-1 text-xs text-rose-600">{errors.email?.message}</p>
    </div>
    {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
    <Button type="submit" isLoading={isSubmitting} className="w-full font-bold">Gửi liên kết đặt lại mật khẩu</Button>
    <p className="text-xs text-slate-500">Tài khoản chưa có email đã xác minh vui lòng liên hệ ban quản lý để được hỗ trợ.</p>
  </form>
}

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const [done, setDone] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', password_confirmation: '' },
  })
  const submit = handleSubmit(async input => {
    setLinkError('')
    try { await resetPassword(email, token, input); setDone(true) } catch (error) {
      applyAuthErrors(error, setError, ['password', 'password_confirmation'])
      const tokenError: unknown = isAxiosError(error) ? error.response?.data?.errors?.token : undefined
      if (Array.isArray(tokenError) && typeof tokenError[0] === 'string') setLinkError(tokenError[0])
    }
  })
  if (done) return <div role="status" className="space-y-3 rounded-xl bg-teal-50 p-4 text-sm text-teal-800"><p>Đã đặt lại mật khẩu. Mọi thiết bị đã được đăng xuất.</p><Link to="/login" className="font-bold underline">Đăng nhập bằng mật khẩu mới</Link></div>
  return <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isSubmitting}>
    <p className="break-all text-sm text-slate-500">Đặt mật khẩu mới cho <strong>{email}</strong>.</p>
    {([['password', 'Mật khẩu mới'], ['password_confirmation', 'Xác nhận mật khẩu mới']] as const).map(([key, label]) => {
      const isVisible = !!visiblePasswords[key]
      return <div key={key}>
        <label htmlFor={`reset-${key}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">{label}</label>
        <div className="relative">
          <input id={`reset-${key}`} type={isVisible ? 'text' : 'password'} autoComplete="new-password" placeholder={key === 'password' ? 'Nhập mật khẩu mới (tối thiểu 8 ký tự)' : 'Nhập lại mật khẩu mới'} {...register(key)} className={`${inputClass} pr-10`} aria-invalid={!!errors[key]} aria-describedby={`reset-${key}-error`} />
          <button
            type="button"
            onClick={() => setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }))}
            aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p id={`reset-${key}-error`} className="mt-1 text-xs text-rose-600">{errors[key]?.message}</p>
      </div>
    })}
    {linkError && <p role="alert" className="text-sm text-rose-600">{linkError} <Link to="/forgot-password" className="font-bold underline">Gửi lại liên kết</Link></p>}
    {errors.root && !linkError && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
    <p className="text-xs text-slate-500">Tối thiểu 8 ký tự, tối đa 72 byte. Đặt lại thành công sẽ đăng xuất mọi thiết bị.</p>
    <Button type="submit" isLoading={isSubmitting} className="w-full font-bold">Đặt lại mật khẩu</Button>
  </form>
}
