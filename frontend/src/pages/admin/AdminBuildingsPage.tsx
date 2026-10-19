import React, { useState } from 'react'
import { Link } from 'react-router'
import { MapPin, Plus } from 'lucide-react'
import { buildings, rooms } from '@/mocks/data'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/mocks/AppContext'

export const AdminBuildingsPage: React.FC = () => {
  const { showToast } = useApp()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [floors, setFloors] = useState(5)
  const [phone, setPhone] = useState('')

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault()
    showToast(`Đã thêm tòa nhà ${name}!`, undefined, 'success')
    setIsAddModalOpen(false)
    setName('')
    setAddress('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh Sách Tòa Nhà</h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các cơ sở chung cư mini thuộc hệ thống sở hữu của bạn.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Thêm tòa nhà mới
        </Button>
      </div>

      {/* Buildings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {buildings.map((b) => {
          const bRooms = rooms.filter((r) => r.buildingId === b.id)
          const bOccupied = bRooms.filter((r) => r.status === 'occupied').length
          const bAvail = bRooms.filter((r) => r.status === 'available').length

          return (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={b.coverImage}
                    alt={b.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold">
                    {b.floors} tầng
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge tone="emerald" dot>Hoạt động</Badge>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{b.name}</h3>
                    <p className="text-xs text-slate-500 flex items-start gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                      <span>{b.address}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                    <div>
                      <span className="text-xs text-slate-400 block">Tổng</span>
                      <span className="text-sm font-bold text-slate-800">{b.totalRooms}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Đang thuê</span>
                      <span className="text-sm font-bold text-emerald-700">{bOccupied}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Còn trống</span>
                      <span className="text-sm font-bold text-sky-700">{bAvail}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {b.description}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <Link to={`/admin/buildings/${b.id}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                    Xem sơ đồ phòng & chi tiết
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Building Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm tòa nhà mới vào hệ thống"
        maxWidth="md"
      >
        <form onSubmit={handleCreateBuilding} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên tòa nhà
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cầu Giấy EcoApart II"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Địa chỉ chi tiết
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, đường, phường, quận..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Số tầng
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={floors}
                onChange={(e) => setFloors(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Hotline quản lý tòa
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901xxxxxx"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="md">
              Lưu tòa nhà
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
