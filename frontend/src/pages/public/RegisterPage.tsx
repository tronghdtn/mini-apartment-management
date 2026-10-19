import React, { useState } from 'react'
import { Link } from 'react-router'
import { Building2, CheckCircle2 } from 'lucide-react'
import { useApp } from '@/mocks/AppContext'
import { Button } from '@/components/ui/Button'

export const RegisterPage: React.FC = () => {
  const { setRole, showToast } = useApp()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setRole('user')
    showToast('Tạo tài khoản thành công!', 'Bạn đã đăng nhập với vai trò Khách đã đăng ký.', 'success')
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white mb-3 shadow-md shadow-sky-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Đăng Ký Tài Khoản Mới</h1>
          <p className="text-xs text-slate-500 mt-1">
            Đăng ký để quản lý các lịch hẹn xem phòng và nhận hỗ trợ nhanh nhất từ ban quản lý.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Chúc Mừng Bạn Đã Đăng Ký Thành Công!</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Tài khoản khách đã được khởi tạo. Bạn có thể duyệt tìm phòng hoặc xem danh sách lịch hẹn của mình ngay.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link to="/rooms">
                <Button variant="primary" size="md">
                  Khám phá phòng trống
                </Button>
              </Link>
              <Link to="/account/appointments">
                <Button variant="outline" size="md">
                  Lịch hẹn của tôi
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Hoàng Mai Lan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0901234567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nhập lại mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="md" className="w-full mt-4 font-bold">
              Hoàn tất đăng ký
            </Button>

            <p className="text-center text-xs text-slate-500 pt-3">
              Đã có tài khoản?{' '}
              <Link to="/login" className="font-bold text-sky-600 hover:underline">
                Đăng nhập ngay
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
