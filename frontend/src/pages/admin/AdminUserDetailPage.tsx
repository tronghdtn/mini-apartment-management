import React, { useState } from 'react'
import { useParams, Link } from 'react-router'
import { ChevronRight, Lock, Unlock } from 'lucide-react'
import { users, contracts, invoices } from '@/mocks/data'
import { formatVND } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useApp } from '@/mocks/AppContext'

export const AdminUserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const { showToast } = useApp()

  const user = users.find((u) => u.id.toString() === userId) || users[1]
  const userContracts = contracts.filter((c) => c.residentId === user.id)
  const userInvoices = invoices.filter((i) => i.residentId === user.id)

  const [status, setStatus] = useState(user.status)

  const handleToggleStatus = () => {
    const next = status === 'active' ? 'locked' : 'active'
    setStatus(next)
    showToast(`Đã ${next === 'locked' ? 'khóa' : 'mở khóa'} tài khoản ${user.name}!`, undefined, 'info')
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/admin" className="hover:text-slate-900">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/admin/users" className="hover:text-slate-900">Người dùng</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-slate-900">{user.name}</span>
      </div>

      {/* User Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xl">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              {status === 'active' ? <Badge tone="emerald" dot>Hoạt động</Badge> : <Badge tone="rose" dot>Đã khóa</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {user.email} • {user.phone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.role !== 'admin' && (
            <Button
              variant={status === 'active' ? 'outline' : 'primary'}
              size="sm"
              icon={status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              onClick={handleToggleStatus}
            >
              {status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
            </Button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Column */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
          <h3 className="font-bold text-base text-slate-900">Hồ Sơ Cá Nhân</h3>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-slate-400">Vai trò trong hệ thống</dt>
              <dd className="font-semibold text-slate-800 uppercase mt-0.5">{user.role}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Số Căn cước công dân (CCCD)</dt>
              <dd className="font-mono font-bold text-slate-900 mt-0.5">{user.idNumber || 'Chưa cập nhật'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Phòng thuê hiện tại</dt>
              <dd className="font-semibold text-sky-700 mt-0.5">{user.roomCode || 'Không có hợp đồng active'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Ngày tham gia hệ thống</dt>
              <dd className="text-slate-700 mt-0.5">{user.createdAt}</dd>
            </div>
          </dl>
        </div>

        {/* Contracts & Debts Column (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Hợp Đồng Liên Quan ({userContracts.length})</h3>
            {userContracts.length > 0 ? (
              <div className="space-y-2">
                {userContracts.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{c.code || 'Bản nháp'}</span>
                      <p className="text-slate-500">Phòng {c.roomCode} • {formatVND(c.monthlyRent)}/tháng</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={c.status === 'active' ? 'emerald' : 'slate'}>
                        {c.status === 'active' ? 'Đang hiệu lực' : 'Đã thanh lý'}
                      </Badge>
                      <Link to={`/admin/contracts/${c.id}`}>
                        <Button variant="outline" size="sm" className="text-[11px] py-1">Xem</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">Người dùng này chưa có hợp đồng thuê nào.</p>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Hóa Đơn Cần Thanh Toán ({userInvoices.length})</h3>
            {userInvoices.length > 0 ? (
              <div className="space-y-2">
                {userInvoices.map((inv) => (
                  <div key={inv.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{inv.code}</span>
                      <p className="text-slate-500">Kỳ {inv.period} • Hạn trả: {inv.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-700">{formatVND(inv.totalAmount)}</span>
                      <Badge tone={inv.status === 'paid' ? 'emerald' : inv.status === 'partially_paid' ? 'amber' : 'rose'}>
                        {inv.status === 'paid' ? 'Đã trả' : inv.status === 'partially_paid' ? 'Trả một phần' : 'Chưa trả'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">Không có công nợ hóa đơn.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
