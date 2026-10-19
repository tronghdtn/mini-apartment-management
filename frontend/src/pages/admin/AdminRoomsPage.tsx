import React, { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { Plus, Search, Eye, EyeOff } from 'lucide-react'
import { buildings } from '@/mocks/data'
import { formatVND } from '@/lib/format'
import { useApp } from '@/mocks/AppContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'

export const AdminRoomsPage: React.FC = () => {
  const { rooms, toggleRoomPublic, showToast } = useApp()

  const [query, setQuery] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied' | 'maintenance'>('all')

  // Create room modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newBuildingId, setNewBuildingId] = useState('1')
  const [newFloor, setNewFloor] = useState(2)
  const [newArea, setNewArea] = useState('28.00')
  const [newPrice, setNewPrice] = useState(3500000)
  const [newCapacity, setNewCapacity] = useState(2)

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault()
    showToast(`Đã thêm phòng ${newCode}!`, undefined, 'success')
    setIsCreateModalOpen(false)
    setNewCode('')
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedBuilding !== 'all' && r.buildingId.toString() !== selectedBuilding) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (query.trim()) {
        const q = query.toLowerCase().trim()
        const matchCode = r.code.toLowerCase().includes(q)
        const matchTitle = r.title.toLowerCase().includes(q)
        const matchBuilding = r.buildingName.toLowerCase().includes(q)
        if (!matchCode && !matchTitle && !matchBuilding) return false
      }
      return true
    })
  }, [rooms, selectedBuilding, statusFilter, query])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản Lý Phòng</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng cộng {rooms.length} phòng trong hệ thống mini apartment.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Thêm phòng mới
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã phòng, tòa nhà..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none"
            >
              <option value="all">Tất cả tòa nhà</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id.toString()}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Tabs
              tabs={[
                { id: 'all', label: 'Tất cả' },
                { id: 'available', label: 'Trống' },
                { id: 'occupied', label: 'Đang thuê' },
                { id: 'maintenance', label: 'Bảo trì' },
              ]}
              activeTab={statusFilter}
              onChange={(id) => setStatusFilter(id as any)}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Rooms Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Mã phòng</th>
                <th className="px-5 py-3.5">Tòa nhà</th>
                <th className="px-5 py-3.5">Tầng / Diện tích</th>
                <th className="px-5 py-3.5">Giá thuê niêm yết</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5">Website</th>
                <th className="px-5 py-3.5">Người đang thuê</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-5 py-4 font-mono font-bold text-slate-900">
                    <Link to={`/admin/rooms/${room.id}`} className="hover:text-sky-600">
                      {room.code}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-800 block">{room.buildingName}</span>
                    <span className="text-[11px] text-slate-400">{room.district}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span>Tầng {room.floor}</span> • <span className="font-medium">{room.area} m²</span>
                  </td>
                  <td className="px-5 py-4 font-bold text-sky-700">
                    {formatVND(room.price)}
                  </td>
                  <td className="px-5 py-4">
                    {room.status === 'available' && <Badge tone="emerald" dot>Còn trống</Badge>}
                    {room.status === 'occupied' && <Badge tone="sky" dot>Đang thuê</Badge>}
                    {room.status === 'maintenance' && <Badge tone="amber" dot>Bảo trì</Badge>}
                    {room.status === 'inactive' && <Badge tone="slate">Ngừng dùng</Badge>}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleRoomPublic(room.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                        room.is_public
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                      title="Bấm để bật/tắt hiển thị trên website"
                    >
                      {room.is_public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{room.is_public ? 'Công khai' : 'Ẩn'}</span>
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    {room.currentResident ? (
                      <span className="font-medium text-slate-900">{room.currentResident}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/admin/rooms/${room.id}`}>
                        <Button variant="outline" size="sm" className="text-[11px] py-1 px-2.5">
                          Chi tiết
                        </Button>
                      </Link>
                      {room.status === 'available' && (
                        <Link to={`/admin/contracts/new?roomId=${room.id}`}>
                          <Button variant="primary" size="sm" className="text-[11px] py-1 px-2.5">
                            Lập HĐ
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Room Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Thêm phòng mới"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tòa nhà
              </label>
              <select
                value={newBuildingId}
                onChange={(e) => setNewBuildingId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id.toString()}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mã phòng
              </label>
              <input
                type="text"
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="VD: A-502"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tầng
              </label>
              <input
                type="number"
                min={1}
                required
                value={newFloor}
                onChange={(e) => setNewFloor(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Diện tích (m²)
              </label>
              <input
                type="text"
                required
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sức chứa (người)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                required
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Giá thuê niêm yết (VND / tháng)
            </label>
            <input
              type="number"
              step={100000}
              required
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="md">
              Lưu thông tin phòng
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
