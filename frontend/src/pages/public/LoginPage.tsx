import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Building2, Sparkles, ArrowRight } from 'lucide-react'
import { useApp } from '@/mocks/AppContext'
import { Button } from '@/components/ui/Button'
import type { Role } from '@/mocks/types'

export const LoginPage: React.FC = () => {
  const { setRole, showToast } = useApp()
  const navigate = useNavigate()

  const [email, setEmail] = useState('minhanh@gmail.com')
  const [password, setPassword] = useState('password123')

  const handleQuickEnter = (role: Role, path: string) => {
    setRole(role)
    navigate(path)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Tài khoản demo mặc định là Cư dân, nhưng khu vực Cư dân chưa có trong prototype.
    showToast(
      'Khu vực Cư dân chưa có trong prototype',
      'Hãy dùng "Truy cập nhanh" để xem giao diện Quản trị viên hoặc Khách đã đăng ký.',
      'info'
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Left: Standard Login Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xl text-slate-900 block leading-tight">
                  Mini<span className="text-sky-600">Apart</span>
                </span>
                <span className="text-xs text-slate-400">Đăng nhập tài khoản</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email hoặc Số điện thoại
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mật khẩu
                  </label>
                  <span className="text-xs text-slate-400">Quên mật khẩu?</span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                />
              </div>

              <Button type="submit" variant="primary" size="md" className="w-full mt-2 font-bold">
                Đăng nhập hệ thống
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-100">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-bold text-sky-600 hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>

        {/* Right: Quick Role Showcase Demo Card */}
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Khám phá nhanh theo vai trò</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Truy Cập Nhanh Prototype</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Chọn vai trò bạn muốn kiểm tra giao diện và luồng nghiệp vụ tương ứng:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => handleQuickEnter('admin', '/admin')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left transition"
              >
                <div>
                  <span className="text-xs font-bold text-white block">Quản trị viên (Admin)</span>
                  <span className="text-[11px] text-slate-400">Quản lý tòa nhà, hợp đồng, duyệt thanh toán</span>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-400 shrink-0" />
              </button>

              <button
                onClick={() => handleQuickEnter('user', '/account/appointments')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left transition"
              >
                <div>
                  <span className="text-xs font-bold text-white block">Khách đã đăng ký (User)</span>
                  <span className="text-[11px] text-slate-400">Xem lịch hẹn xem phòng, cập nhật hồ sơ</span>
                </div>
                <ArrowRight className="w-4 h-4 text-teal-400 shrink-0" />
              </button>

              {/* Ba vai trò dưới đã chốt nhưng chưa có màn hình trong prototype */}
              {[
                { label: 'Cư dân (Resident)', desc: 'Xem hóa đơn, thanh toán VietQR, sửa chữa' },
                { label: 'Kỹ thuật viên (Technician)', desc: 'Xem việc được giao, cập nhật tiến độ xử lý' },
                { label: 'Bảo vệ (Guard)', desc: 'Check-in / Check-out khách xem phòng hôm nay' },
              ].map((item) => (
                <div
                  key={item.label}
                  aria-disabled="true"
                  title="Khu vực màn hình của vai trò này chưa có trong prototype"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-left cursor-not-allowed"
                >
                  <div className="opacity-60">
                    <span className="text-xs font-bold text-white block">{item.label}</span>
                    <span className="text-[11px] text-slate-400">{item.desc}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 shrink-0">
                    Chưa có màn hình
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Bạn cũng có thể chuyển vai trò bất kỳ lúc nào qua nút cố định ở góc trên màn hình.
          </div>
        </div>
      </div>
    </div>
  )
}
