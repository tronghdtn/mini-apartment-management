import React, { useState } from 'react'
import { Zap, Droplets, Plus, Info } from 'lucide-react'
import { utilityPriceHistories } from '@/mocks/data'
import { formatVND } from '@/lib/format'
import type { UtilityPriceHistory } from '@/mocks/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/mocks/AppContext'

export const AdminUtilityPricesPage: React.FC = () => {
  const { showToast } = useApp()
  const [prices, setPrices] = useState<UtilityPriceHistory[]>(utilityPriceHistories)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [serviceCode, setServiceCode] = useState<'ELECTRICITY' | 'WATER'>('ELECTRICITY')
  const [unitPrice, setUnitPrice] = useState(3800)
  const [effectiveFrom, setEffectiveFrom] = useState('2026-11-01')

  const handleAddPrice = (e: React.FormEvent) => {
    e.preventDefault()
    const newPrice: UtilityPriceHistory = {
      id: Date.now(),
      serviceId: serviceCode === 'ELECTRICITY' ? 1 : 2,
      serviceCode,
      serviceName: serviceCode === 'ELECTRICITY' ? 'Điện sinh hoạt' : 'Nước sinh hoạt',
      unitPrice,
      effectiveFrom,
      appliedToInvoices: false,
    }
    setPrices([...prices, newPrice])
    showToast(`Đã thêm mức giá mới cho ${newPrice.serviceName}!`, undefined, 'success')
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bảng Giá Điện Nước Theo Kỳ</h1>
          <p className="text-xs text-slate-500 mt-1">
            Đơn giá áp dụng snapshot cho từng kỳ tiêu thụ (ngày 01 hàng tháng).
          </p>
        </div>
        <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Thêm giá áp dụng mới
        </Button>
      </div>

      <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs text-sky-800">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block">Quy tắc nghiệp vụ DB-D26 (CONFIRMED):</strong>
          <span>Mức giá có hiệu lực từ ngày 01 của tháng. Một kỳ tiêu thụ dùng duy nhất một mức giá snapshot đầu kỳ. Giá đã được dùng để phát hành hóa đơn sẽ không thể chỉnh sửa hay xóa để bảo toàn lịch sử tài chính.</span>
        </div>
      </div>

      {/* Current Active Prices Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Giá điện hiện hành</span>
              <span className="text-2xl font-extrabold text-slate-900 block">3.500 ₫ <span className="text-xs text-slate-500 font-normal">/ kWh</span></span>
              <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Áp dụng từ kỳ 01/01/2026</span>
            </div>
          </div>
          <Badge tone="emerald" dot>Đang áp dụng</Badge>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Giá nước hiện hành</span>
              <span className="text-2xl font-extrabold text-slate-900 block">15.000 ₫ <span className="text-xs text-slate-500 font-normal">/ m³</span></span>
              <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Áp dụng từ kỳ 01/01/2026</span>
            </div>
          </div>
          <Badge tone="emerald" dot>Đang áp dụng</Badge>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900">Lịch Sử Thay Đổi Đơn Giá</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
            <tr>
              <th className="px-5 py-3.5">Dịch vụ</th>
              <th className="px-5 py-3.5">Áp dụng từ kỳ</th>
              <th className="px-5 py-3.5">Đơn giá</th>
              <th className="px-5 py-3.5">Trạng thái sử dụng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prices.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-2">
                  {p.serviceCode === 'ELECTRICITY' ? <Zap className="w-4 h-4 text-amber-500" /> : <Droplets className="w-4 h-4 text-sky-500" />}
                  <span>{p.serviceName}</span>
                </td>
                <td className="px-5 py-4 font-mono font-semibold text-slate-800">
                  {p.effectiveFrom}
                </td>
                <td className="px-5 py-4 font-bold text-sky-700 text-sm">
                  {formatVND(p.unitPrice)}
                </td>
                <td className="px-5 py-4">
                  {p.appliedToInvoices ? (
                    <Badge tone="slate">Đã phát sinh hóa đơn (Khóa)</Badge>
                  ) : (
                    <Badge tone="sky">Chưa áp dụng vào kỳ nào</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Price Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm mức giá áp dụng mới" maxWidth="md">
        <form onSubmit={handleAddPrice} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Dịch vụ áp dụng
            </label>
            <select
              value={serviceCode}
              onChange={(e) => setServiceCode(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
            >
              <option value="ELECTRICITY">Điện sinh hoạt (kWh)</option>
              <option value="WATER">Nước sinh hoạt (m³)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Đơn giá mới (VND)
            </label>
            <input
              type="number"
              step={100}
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Kỳ hiệu lực (bắt đầu ngày 01 của tháng)
            </label>
            <input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="md">
              Lưu mức giá
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
