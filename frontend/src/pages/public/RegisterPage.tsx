import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { registerSchema } from '@/features/auth/schemas'
import type { RegisterInput } from '@/features/auth/schemas'
import { accountDestination } from '@/features/auth/types'
import { applyAuthErrors } from '@/features/auth/errors'

export function RegisterPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', phone: '', email: '', password: '', password_confirmation: '' },
  })
  if (auth.user && auth.status === 'authenticated') return <Navigate to={accountDestination(auth.user)} replace />
  const fields = [
    { name: 'full_name', label: 'Họ và tên', type: 'text', autoComplete: 'name', placeholder: 'VD: Nguyễn Văn An' },
    { name: 'phone', label: 'Số điện thoại', type: 'tel', autoComplete: 'tel', placeholder: 'VD: 0912345678' },
    { name: 'email', label: 'Email (không bắt buộc)', type: 'email', autoComplete: 'email', placeholder: 'VD: nguyenvanan@gmail.com' },
    { name: 'password', label: 'Mật khẩu', type: 'password', autoComplete: 'new-password', placeholder: 'Tối thiểu 8 ký tự' },
    { name: 'password_confirmation', label: 'Nhập lại mật khẩu', type: 'password', autoComplete: 'new-password', placeholder: 'Nhập lại mật khẩu khớp ở trên' },
  ] as const
  const submit = handleSubmit(async input => {
    try {
      const user = await auth.register(input)
      navigate(accountDestination(user), { replace: true })
    } catch (error) { applyAuthErrors(error, setError, fields.map(field => field.name)) }
  })
  return (
    <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white mb-3 shadow-md shadow-sky-500/20"><Building2 className="w-6 h-6" /></div>
          <h1 className="text-2xl font-bold text-slate-900">Đăng Ký Tài Khoản Mới</h1>
          <p className="text-xs text-slate-500 mt-1">Đăng ký tài khoản khách. Email là tùy chọn; bạn sẽ được đăng nhập sau khi tạo tài khoản thành công.</p>
        </div>
        <form onSubmit={submit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-busy={isSubmitting}>
          {fields.map(field => {
            const isPassword = field.type === 'password'
            const isVisible = !!visiblePasswords[field.name]
            return (
              <div key={field.name} className={field.name === 'full_name' ? 'sm:col-span-2' : ''}>
                <label htmlFor={field.name} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{field.label}</label>
                <div className="relative">
                  <input
                    id={field.name}
                    type={isPassword ? (isVisible ? 'text' : 'password') : field.type}
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                    {...register(field.name)}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={`${field.name}-error`}
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none ${isPassword ? 'pr-10' : ''}`}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setVisiblePasswords(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                      aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <p id={`${field.name}-error`} className="text-xs text-rose-600 mt-1">{errors[field.name]?.message}</p>
              </div>
            )
          })}
          {errors.root && <p role="alert" className="sm:col-span-2 text-sm text-rose-600">{errors.root.message}</p>}
          <Button type="submit" isLoading={isSubmitting} disabled={auth.status === 'loading'} className="sm:col-span-2 w-full mt-4 font-bold">Hoàn tất đăng ký</Button>
          {auth.status === 'loading' && <p role="status" className="sm:col-span-2 text-xs text-slate-500">Đang kiểm tra phiên đăng nhập…</p>}
          <p className="sm:col-span-2 text-center text-xs text-slate-500 pt-3">Đã có tài khoản? <Link to="/login" className="font-bold text-sky-600 hover:underline">Đăng nhập ngay</Link></p>
        </form>
      </div>
    </div>
  )
}
