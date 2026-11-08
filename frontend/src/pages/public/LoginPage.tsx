import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Eye, EyeOff, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { loginSchema } from '@/features/auth/schemas'
import type { LoginInput } from '@/features/auth/schemas'
import { safeDestination } from '@/features/auth/types'
import { applyAuthErrors } from '@/features/auth/errors'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  // Context survives RequireAuth's redirect, so a successful logout cannot lose its confirmation message.
  const accountNotice = auth.accountNotice
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' },
  })
  if (auth.user && auth.status === 'authenticated') return <Navigate to={safeDestination(location.state?.from, auth.user)} replace />
  const submit = handleSubmit(async input => {
    try {
      const user = await auth.login(input)
      navigate(safeDestination(location.state?.from, user), { replace: true })
    } catch (error) { applyAuthErrors(error, setError, ['identifier', 'password']) }
  })
  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none'
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white"><Building2 className="w-5 h-5" /></div>
              <div><span className="font-extrabold text-xl text-slate-900 block leading-tight">Mini<span className="text-sky-600">Apart</span></span><h1 className="text-xs text-slate-400">Đăng nhập tài khoản</h1></div>
            </div>
            {accountNotice === 'password-updated' && <p role="status" className="mb-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.</p>}
            {accountNotice === 'profile-session-ended' && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Phiên tài khoản đã thay đổi hoặc không còn hợp lệ. Vui lòng đăng nhập lại để kiểm tra.</p>}
            {accountNotice === 'password-unknown' && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Chưa xác định được kết quả đổi mật khẩu. Vui lòng đăng nhập lại để kiểm tra; nếu đã đổi thành công, hãy dùng mật khẩu mới.</p>}
            <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isSubmitting}>
              <div>
                <label htmlFor="identifier" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email hoặc Số điện thoại</label>
                <input id="identifier" type="text" autoComplete="username" {...register('identifier')} placeholder="Email hoặc số điện thoại" className={inputClass} aria-invalid={!!errors.identifier} aria-describedby="identifier-error" />
                <p id="identifier-error" className="text-xs text-rose-600 mt-1">{errors.identifier?.message}</p>
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    {...register('password')}
                    className={`${inputClass} pr-10`}
                    aria-invalid={!!errors.password}
                    aria-describedby="password-error"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p id="password-error" className="text-xs text-rose-600 mt-1">{errors.password?.message}</p>
              </div>
              <p className="text-right text-xs"><Link to="/forgot-password" className="font-semibold text-sky-600 hover:underline">Quên mật khẩu?</Link></p>
              {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
              <Button type="submit" isLoading={isSubmitting} disabled={auth.status === 'loading'} className="w-full mt-2 font-bold">Đăng nhập hệ thống</Button>
              {auth.status === 'loading' && <p role="status" className="text-xs text-slate-500">Đang kiểm tra phiên đăng nhập…</p>}
            </form>
          </div>
          <p className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-100">Chưa có tài khoản? <Link to="/register" className="font-bold text-sky-600 hover:underline">Đăng ký ngay</Link></p>
        </div>
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-4"><Sparkles className="w-3.5 h-3.5" />MiniApart</div>
          <h2 className="text-xl font-bold mb-3">Chào mừng bạn trở lại</h2>
          <p className="text-sm text-slate-300 leading-relaxed">Sử dụng email hoặc số điện thoại đã đăng ký để truy cập khu vực phù hợp với tài khoản của bạn.</p>
          <p className="mt-6 text-xs text-slate-400 leading-relaxed">Quên mật khẩu? Dùng liên kết gửi tới email đã xác minh. Tài khoản chưa có email đã xác minh vui lòng liên hệ ban quản lý.</p>
          <Link to="/" className="inline-block mt-8 text-sm text-sky-300 hover:underline">Về trang chủ</Link>
        </div>
      </div>
    </div>
  )
}
