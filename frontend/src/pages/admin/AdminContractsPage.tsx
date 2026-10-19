import React, { useState } from 'react'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { useApp } from '@/mocks/AppContext'
import { formatVND, formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'

export const AdminContractsPage: React.FC = () => {
  const { contracts } = useApp()
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'draft' | 'overdue' | 'terminated'>('all')
  const [query, setQuery] = useState('')

  const filteredContracts = contracts.filter((c) => {
    if (activeTab === 'active' && c.status !== 'active') return false
    if (activeTab === 'draft' && c.status !== 'draft') return false
    if (activeTab === 'overdue' && c.warningStatus !== 'overdue') return false
    if (activeTab === 'terminated' && c.status !== 'terminated') return false

    if (query.trim()) {
      const q = query.toLowerCase().trim()
      const matchCode = (c.code || '').toLowerCase().includes(q)
      const matchResident = c.residentName.toLowerCase().includes(q)
      const matchRoom = c.roomCode.toLowerCase().includes(q)
      if (!matchCode && !matchResident && !matchRoom) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản Lý Hợp Đồng Thuê</h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi danh sách hợp đồng nháp, hợp đồng đang hiệu lực và lịch sử thanh lý.
          </p>
        </div>
        <Link to="/admin/contracts/new">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Lập hợp đồng mới (Wizard)
          </Button>
        </Link>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Tabs
          tabs={[
            { id: 'all', label: 'Tất cả', count: contracts.length },
            { id: 'active', label: 'Đang hiệu lực', count: contracts.filter((c) => c.status === 'active').length },
            { id: 'overdue', label: 'Quá hạn trả phòng', count: contracts.filter((c) => c.warningStatus === 'overdue').length },
            { id: 'draft', label: 'Bản nháp', count: contracts.filter((c) => c.status === 'draft').length },
            { id: 'terminated', label: 'Đã thanh lý', count: contracts.filter((c) => c.status === 'terminated').length },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as any)}
          size="sm"
        />

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã HĐ, tên, phòng..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-5 py-3.5">Mã Hợp Đồng</th>
              <th className="px-5 py-3.5">Phòng / Tòa nhà</th>
              <th className="px-5 py-3.5">Người đại diện thuê</th>
              <th className="px-5 py-3.5">Thời hạn thuê (Ngày cuối ở)</th>
              <th className="px-5 py-3.5">Tiền thuê</th>
              <th className="px-5 py-3.5">Trạng thái cọc</th>
              <th className="px-5 py-3.5">Trạng thái HĐ</th>
              <th className="px-5 py-3.5 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredContracts.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-4 font-mono font-bold text-slate-900">
                  <Link to={`/admin/contracts/${c.id}`} className="hover:text-sky-600">
                    {c.code || 'Bản nháp (Chưa kích hoạt)'}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <span className="font-bold text-slate-800 block">{c.roomCode}</span>
                  <span className="text-[11px] text-slate-400">{c.buildingName}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="font-semibold text-slate-900 block">{c.residentName}</span>
                  <span className="text-[11px] text-slate-400">{c.residentPhone}</span>
                </td>
                <td className="px-5 py-4">
                  <span>{formatDate(c.startDate)} → <strong>{formatDate(c.endDate)}</strong></span>
                  {c.warningStatus === 'overdue' && (
                    <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                      Đã qua ngày cuối được ở!
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 font-bold text-sky-700">
                  {formatVND(c.monthlyRent)}/th
                </td>
                <td className="px-5 py-4">
                  {c.depositStatus === 'held' && <Badge tone="sky">Đang giữ cọc</Badge>}
                  {c.depositStatus === 'unpaid' && <Badge tone="slate">Chưa nhận</Badge>}
                  {c.depositStatus === 'settled' && <Badge tone="emerald">Đã đối soát</Badge>}
                </td>
                <td className="px-5 py-4">
                  {c.status === 'active' && c.warningStatus === 'overdue' && (
                    <Badge tone="rose" dot>Quá hạn trả phòng</Badge>
                  )}
                  {c.status === 'active' && c.warningStatus !== 'overdue' && (
                    <Badge tone="emerald" dot>Đang hiệu lực</Badge>
                  )}
                  {c.status === 'draft' && (
                    <Badge tone="slate">Bản nháp</Badge>
                  )}
                  {c.status === 'terminated' && (
                    <Badge tone="slate">Đã thanh lý</Badge>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link to={`/admin/contracts/${c.id}`}>
                    <Button variant="outline" size="sm" className="text-xs py-1">
                      Chi tiết
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
