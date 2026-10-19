import React, { useState } from 'react'
import { User, Phone, Mail } from 'lucide-react'
import { useApp } from '@/mocks/AppContext'
import { Button } from '@/components/ui/Button'

export const GuestProfilePage: React.FC = () => {
  const { currentUser, showToast } = useApp()

  const [name, setName] = useState(currentUser.name || 'Hoàng Mai Lan')
  const [phone, setPhone] = useState(currentUser.phone || '0901000007')
  const [email, setEmail] = useState(currentUser.email || 'mailan@gmail.com')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    showToast('Đã lưu thông tin tài khoản!', undefined, 'success')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Tài Khoản Của Tôi</h1>
        <p className="text-xs text-slate-500 mt-1">
          Thông tin cá nhân liên hệ để ban quản lý tòa nhà kết nối khi bạn đặt lịch xem phòng.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-600" />
              <span>Họ và tên</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-sky-600" />
                <span>Số điện thoại</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <span>Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button type="submit" variant="primary" size="md">
              Cập nhật thông tin
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
