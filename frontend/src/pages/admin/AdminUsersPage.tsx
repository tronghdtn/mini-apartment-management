import React, { useState } from 'react'
import { Link } from 'react-router'
import { Search, Plus, Lock, Unlock } from 'lucide-react'
import { users as initialUsers } from '@/mocks/data'
import type { UserAccount } from '@/mocks/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/mocks/AppContext'

export const AdminUsersPage: React.FC = () => {
  const { showToast } = useApp()
  const [userList, setUserList] = useState<UserAccount[]>(initialUsers)
  const [activeTab, setActiveTab] = useState<'all' | 'resident' | 'user' | 'technician' | 'guard' | 'admin'>('all')
  const [query, setQuery] = useState('')

  // Create Staff Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [staffRole, setStaffRole] = useState<'technician' | 'guard'>('technician')

  const handleToggleLock = (userId: number) => {
    setUserList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === 'active' ? 'locked' : 'active'
          showToast(`Đã ${newStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản ${u.name}!`, undefined, 'info')
          return { ...u, status: newStatus }
        }
        return u
      })
    )
  }

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault()
    const newStaff: UserAccount = {
      id: Date.now(),
      name,
      email,
      phone,
      role: staffRole,
      status: 'active',
      hasActiveContract: false,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setUserList([newStaff, ...userList])
    showToast(`Đã tạo tài khoản nhân viên ${name}!`, undefined, 'success')
    setIsModalOpen(false)
    setName('')
    setEmail('')
    setPhone('')
  }

  const filteredUsers = userList.filter((u) => {
    if (activeTab !== 'all' && u.role !== activeTab) return false
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      const matchName = u.name.toLowerCase().includes(q)
      const matchEmail = u.email.toLowerCase().includes(q)
      const matchPhone = u.phone.includes(q)
      if (!matchName && !matchEmail && !matchPhone) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản Lý Người Dùng & Cư Dân</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng cộng {userList.length} tài khoản trong hệ thống quản lý.
          </p>
        </div>
        <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Tạo tài khoản nhân viên
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Tabs
          tabs={[
            { id: 'all', label: 'Tất cả' },
            { id: 'resident', label: 'Cư dân' },
            { id: 'user', label: 'Khách đã ĐK' },
            { id: 'technician', label: 'Kỹ thuật' },
            { id: 'guard', label: 'Bảo vệ' },
            { id: 'admin', label: 'Quản trị' },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as any)}
          size="sm"
        />

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tên, SĐT, email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-5 py-3.5">Họ và tên</th>
              <th className="px-5 py-3.5">Liên hệ</th>
              <th className="px-5 py-3.5">Số CCCD (Admin)</th>
              <th className="px-5 py-3.5">Vai trò</th>
              <th className="px-5 py-3.5">Phòng đang ở</th>
              <th className="px-5 py-3.5">Trạng thái</th>
              <th className="px-5 py-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-4 font-bold text-slate-900">
                  <Link to={`/admin/users/${u.id}`} className="hover:text-sky-600">
                    {u.name}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <span className="font-semibold text-slate-800 block">{u.phone}</span>
                  <span className="text-[11px] text-slate-400">{u.email}</span>
                </td>
                <td className="px-5 py-4 font-mono text-slate-600">
                  {u.idNumber || '—'}
                </td>
                <td className="px-5 py-4">
                  {u.role === 'resident' && <Badge tone="emerald">Cư dân</Badge>}
                  {u.role === 'user' && <Badge tone="sky">Khách đã ĐK</Badge>}
                  {u.role === 'technician' && <Badge tone="amber">Kỹ thuật viên</Badge>}
                  {u.role === 'guard' && <Badge tone="indigo">Bảo vệ</Badge>}
                  {u.role === 'admin' && <Badge tone="purple">Quản trị viên</Badge>}
                </td>
                <td className="px-5 py-4">
                  {u.roomCode ? (
                    <span className="font-semibold text-slate-800">{u.roomCode}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {u.status === 'active' ? (
                    <Badge tone="emerald" dot>Hoạt động</Badge>
                  ) : (
                    <Badge tone="rose" dot>Đã khóa</Badge>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/admin/users/${u.id}`}>
                      <Button variant="outline" size="sm" className="text-xs py-1">
                        Hồ sơ
                      </Button>
                    </Link>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleToggleLock(u.id)}
                        className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                          u.status === 'active'
                            ? 'border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                      >
                        {u.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Staff Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tạo tài khoản nhân viên" maxWidth="md">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Vai trò nhân viên
            </label>
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
            >
              <option value="technician">Nhân viên sửa chữa (Technician)</option>
              <option value="guard">Bảo vệ tòa nhà (Guard)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Lê Văn Tuấn"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
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
                placeholder="tuan.kt@miniapartment.vn"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="md">
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
