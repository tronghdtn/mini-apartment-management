import React, { useState } from 'react'
import { Plus, Info } from 'lucide-react'
import { amenitiesList } from '@/mocks/data'
import type { Amenity } from '@/mocks/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/mocks/AppContext'

export const AdminAmenitiesPage: React.FC = () => {
  const { showToast } = useApp()
  const [amenities, setAmenities] = useState<Amenity[]>(amenitiesList)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState<'room' | 'building' | 'both'>('room')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const newA: Amenity = {
      id: Date.now(),
      name,
      description: desc,
      category,
      inUseCount: 0,
    }
    setAmenities([...amenities, newA])
    showToast(`Đã thêm tiện nghi ${name}!`, undefined, 'success')
    setIsModalOpen(false)
    setName('')
    setDesc('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh Mục Tiện Nghi</h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các trang thiết bị và tiện ích vật chất dùng cho phòng và tòa nhà.
          </p>
        </div>
        <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Thêm tiện nghi
        </Button>
      </div>

      {/* Domain Rule Reminder Box */}
      <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs text-sky-800">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block">Quy tắc chuẩn hóa CSDL:</strong>
          <span>Tiện nghi chỉ mô tả cơ sở vật chất sẵn có, không bao giờ tự phát sinh tiền thu. Các khoản phí dịch vụ thu hàng tháng được khai báo riêng tại mục <strong>Dịch vụ</strong>.</span>
        </div>
      </div>

      {/* Amenities Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-5 py-3.5">Tên tiện nghi</th>
              <th className="px-5 py-3.5">Phân loại áp dụng</th>
              <th className="px-5 py-3.5">Mô tả chi tiết</th>
              <th className="px-5 py-3.5 text-center">Đang sử dụng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {amenities.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-4 font-bold text-slate-900">
                  {item.name}
                </td>
                <td className="px-5 py-4">
                  {item.category === 'room' && <Badge tone="sky">Trong phòng</Badge>}
                  {item.category === 'building' && <Badge tone="emerald">Tòa nhà</Badge>}
                  {item.category === 'both' && <Badge tone="indigo">Cả hai</Badge>}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {item.description}
                </td>
                <td className="px-5 py-4 text-center font-bold text-slate-700">
                  {item.inUseCount} vị trí
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Add Amenity */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm tiện nghi mới" maxWidth="md">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên tiện nghi
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cửa sổ cách âm Eurowindow"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Phân loại áp dụng
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none"
            >
              <option value="room">Tiện nghi trong phòng riêng</option>
              <option value="building">Tiện nghi chung của tòa nhà</option>
              <option value="both">Áp dụng cả hai</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mô tả chi tiết
            </label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Thông số, quy cách, tính năng..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="md">
              Lưu tiện nghi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
