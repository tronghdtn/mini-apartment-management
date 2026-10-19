import React, { useState } from 'react'
import { Link } from 'react-router'
import { Plus, Info, Zap } from 'lucide-react'
import { servicesList } from '@/mocks/data'
import { formatVND } from '@/lib/format'
import type { ServiceFee } from '@/mocks/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/mocks/AppContext'

export const AdminServicesPage: React.FC = () => {
  const { showToast } = useApp()
  const [services, setServices] = useState<ServiceFee[]>(servicesList)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [type, setType] = useState<ServiceFee['type']>('per_room')
  const [price, setPrice] = useState(100000)
  // Form chưa có ô sửa đơn vị tính (Antigravity làm dở)
  const [unit] = useState('phòng/tháng')
  const [note, setNote] = useState('')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const newSvc: ServiceFee = {
      id: Date.now(),
      name,
      code: code.toUpperCase(),
      type,
      price,
      priceDisplay: formatVND(price),
      unit,
      note,
      status: 'active',
    }
    setServices([...services, newSvc])
    showToast(`Đã thêm dịch vụ ${name}!`, undefined, 'success')
    setIsModalOpen(false)
    setName('')
    setCode('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh Mục Khoản Thu & Dịch Vụ</h1>
          <p className="text-xs text-slate-500 mt-1">
            Khai báo các dịch vụ sinh hoạt và cách tính phí hàng tháng áp dụng cho hợp đồng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/utility-prices">
            <Button variant="outline" size="md" icon={<Zap className="w-4 h-4" />}>
              Bảng giá điện nước
            </Button>
          </Link>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
            Thêm dịch vụ
          </Button>
        </div>
      </div>

      <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs text-sky-800">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block">Quy tắc tính toán (BR-SVC-04 CONFIRMED):</strong>
          <span>Hai dịch vụ hệ thống <strong>Điện (`ELECTRICITY`)</strong> và <strong>Nước (`WATER`)</strong> là dạng metered tính theo chỉ số đồng hồ riêng. Các dịch vụ cố định (theo phòng, theo người, theo xe) sẽ được phân bổ theo số ngày sử dụng thực tế khi bắt đầu hoặc kết thúc hợp đồng giữa tháng.</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-5 py-3.5">Mã dịch vụ</th>
              <th className="px-5 py-3.5">Tên dịch vụ</th>
              <th className="px-5 py-3.5">Cách tính phí</th>
              <th className="px-5 py-3.5">Đơn giá niêm yết</th>
              <th className="px-5 py-3.5">Đơn vị tính</th>
              <th className="px-5 py-3.5">Phân loại</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map((svc) => (
              <tr key={svc.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-4 font-mono font-bold text-slate-900">
                  {svc.code}
                </td>
                <td className="px-5 py-4 font-bold text-slate-800">
                  {svc.name}
                  <span className="text-[11px] text-slate-400 block font-normal mt-0.5">{svc.note}</span>
                </td>
                <td className="px-5 py-4">
                  {svc.type === 'metered' && <Badge tone="amber">Theo chỉ số (Metered)</Badge>}
                  {svc.type === 'per_room' && <Badge tone="sky">Theo phòng</Badge>}
                  {svc.type === 'per_person' && <Badge tone="emerald">Theo người</Badge>}
                  {svc.type === 'per_unit' && <Badge tone="indigo">Theo số lượng (xe...)</Badge>}
                  {svc.type === 'free' && <Badge tone="slate">Miễn phí</Badge>}
                </td>
                <td className="px-5 py-4 font-bold text-slate-900">
                  {svc.type === 'metered' ? (
                    <Link to="/admin/utility-prices" className="text-sky-600 hover:underline">
                      Theo bảng giá điện nước →
                    </Link>
                  ) : (
                    svc.priceDisplay
                  )}
                </td>
                <td className="px-5 py-4 text-slate-600 font-medium">
                  {svc.unit}
                </td>
                <td className="px-5 py-4">
                  {svc.isSystem ? (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Hệ thống
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Tùy chỉnh
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Add Service */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm dịch vụ mới" maxWidth="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tên dịch vụ
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Dịch vụ giặt sấy"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mã dịch vụ (Code)
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="LAUNDRY"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cách tính phí
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              >
                <option value="per_room">Theo phòng / tháng</option>
                <option value="per_person">Theo người / tháng</option>
                <option value="per_unit">Theo số lượng (xe, thiết bị)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Đơn giá niêm yết (VND)
              </label>
              <input
                type="number"
                step={5000}
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ghi chú mô tả
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Quy chuẩn tính tiền..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="md">
              Lưu dịch vụ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
