import React, { useState } from 'react'
import { useParams, Link } from 'react-router'
import {
  ChevronRight,
  Lock,
} from 'lucide-react'
import { contracts, invoices } from '@/mocks/data'
import { formatVND, formatDate } from '@/lib/format'
import { useApp } from '@/mocks/AppContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'

export const AdminContractDetailPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>()
  const { activateContract } = useApp()

  const contract = contracts.find((c) => c.id.toString() === contractId) || contracts[0]
  const contractInvoices = invoices.filter((i) => i.contractId === contract.id)

  const [activeTab, setActiveTab] = useState<'overview' | 'terms' | 'services' | 'invoices'>('overview')

  // Activation Modal
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false)
  const [elReading, setElReading] = useState(1250.0)
  const [waterReading, setWaterReading] = useState(85.0)

  const handleConfirmActivation = () => {
    activateContract(contract.id, elReading, waterReading)
    setIsActivateModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/admin" className="hover:text-slate-900">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/admin/contracts" className="hover:text-slate-900">Hợp đồng</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-slate-900">{contract.code || 'Bản nháp'}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
              {contract.code || 'Bản nháp'}
            </span>
            {contract.status === 'active' && contract.warningStatus === 'overdue' && (
              <Badge tone="rose" dot>Quá hạn trả phòng</Badge>
            )}
            {contract.status === 'active' && contract.warningStatus !== 'overdue' && (
              <Badge tone="emerald" dot>Đang hiệu lực</Badge>
            )}
            {contract.status === 'draft' && <Badge tone="slate">Nháp</Badge>}
            {contract.status === 'terminated' && <Badge tone="slate">Đã thanh lý</Badge>}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hợp Đồng Thuê Phòng {contract.roomCode}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Người thuê đại diện: <strong className="text-slate-800">{contract.residentName}</strong> ({contract.residentPhone})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {contract.status === 'draft' && (
            <Button variant="primary" size="sm" onClick={() => setIsActivateModalOpen(true)}>
              Kích hoạt hợp đồng
            </Button>
          )}
          {contract.status === 'active' && (
            <>
              <Link to={`/admin/invoices?contractId=${contract.id}`}>
                <Button variant="outline" size="sm">
                  Lập hóa đơn tháng
                </Button>
              </Link>
              <Link to={`/admin/contracts/${contract.id}/terminate`}>
                <Button variant="secondary" size="sm" className="text-rose-600 hover:bg-rose-50 border-rose-200">
                  Thanh lý hợp đồng
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Contract Immortality Banner when Active */}
      {contract.status === 'active' && (
        <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-2 text-xs text-slate-600">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Hợp đồng đang hiệu lực: Các trường phòng, người thuê, tiền thuê, tiền cọc, ngày bắt đầu và điều khoản bồi thường đã được khóa bất biến.</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Tổng quan' },
          { id: 'terms', label: 'Điều khoản bồi thường & Miễn trừ' },
          { id: 'services', label: 'Dịch vụ đăng ký' },
          { id: 'invoices', label: `Hóa đơn (${contractInvoices.length})` },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Thông Tin Thời Hạn & Tài Chính</h3>
            <dl className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-400">Ngày bắt đầu tính tiền</dt>
                <dd className="font-semibold text-slate-800">{formatDate(contract.startDate)}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-400">Ngày cuối được ở (endDate)</dt>
                <dd className="font-bold text-slate-900">{formatDate(contract.endDate)}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-400">Bàn giao dự kiến</dt>
                <dd className="text-slate-600">Ngày liền sau endDate</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-400">Tiền thuê hàng tháng</dt>
                <dd className="font-bold text-sky-700 text-sm">{formatVND(contract.monthlyRent)}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-400">Tiền cọc giữ chỗ</dt>
                <dd className="font-bold text-slate-900">{formatVND(contract.depositAmount)}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-400">Trạng thái tiền cọc</dt>
                <dd className="font-semibold">
                  {contract.depositStatus === 'held' && <Badge tone="sky">Đang giữ cọc</Badge>}
                  {contract.depositStatus === 'unpaid' && <Badge tone="slate">Chưa nhận</Badge>}
                  {contract.depositStatus === 'settled' && <Badge tone="emerald">Đã đối soát hoàn trả</Badge>}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Chỉ Số Giao Nhận & Ghi Chú</h3>
            <dl className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-400">Chỉ số điện bàn giao</dt>
                <dd className="font-mono font-bold text-sky-700">{contract.initialElectricityReading?.toFixed(2) || '—'} kWh</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-400">Chỉ số nước bàn giao</dt>
                <dd className="font-mono font-bold text-sky-700">{contract.initialWaterReading?.toFixed(2) || '—'} m³</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-400">Ghi chú hợp đồng</dt>
                <dd className="text-slate-600">{contract.note || 'Không có ghi chú'}</dd>
              </div>
            </dl>

            {contract.status === 'terminated' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block">Thông tin thanh lý hợp đồng:</span>
                <p>Ngày bàn giao thực tế: <strong>{formatDate(contract.actualEndDate || '')}</strong></p>
                <p>Lý do: <strong>{contract.closureReason}</strong></p>
                <p>Ghi chú thanh lý: <em>{contract.closureNote}</em></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Terms */}
      {activeTab === 'terms' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Điều Khoản Bồi Thường Khi Trả Trước Hạn (DB-D47)</h3>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <p className="font-medium text-slate-700">
              Hình thức áp dụng: <strong>
                {contract.earlyTerminationType === 'multiplier' ? `Hệ số ${contract.earlyTerminationValue}× tiền thuê tháng` : contract.earlyTerminationType === 'fixed' ? 'Mức phạt cố định' : 'Không bồi thường'}
              </strong>
            </p>
            <p className="text-slate-500">
              Phí bồi thường chỉ được kích hoạt tự động tính toán khi người thuê bàn giao phòng trước ngày cuối cùng được ở (endDate).
            </p>
          </div>
        </div>
      )}

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          {contractInvoices.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3.5">Mã hóa đơn</th>
                  <th className="px-5 py-3.5">Kỳ phát hành</th>
                  <th className="px-5 py-3.5">Tổng tiền</th>
                  <th className="px-5 py-3.5">Đã thu</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">{inv.code}</td>
                    <td className="px-5 py-4">{inv.period}</td>
                    <td className="px-5 py-4 font-bold text-sky-700">{formatVND(inv.totalAmount)}</td>
                    <td className="px-5 py-4 font-semibold text-emerald-700">{formatVND(inv.paidAmount)}</td>
                    <td className="px-5 py-4">
                      {inv.status === 'paid' && <Badge tone="emerald">Đã thanh toán</Badge>}
                      {inv.status === 'partially_paid' && <Badge tone="amber">Một phần</Badge>}
                      {inv.status === 'issued' && <Badge tone="rose">Chưa thu</Badge>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link to={`/admin/invoices/${inv.id}`}>
                        <Button variant="outline" size="sm" className="text-xs py-1">Xem</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">Chưa có hóa đơn nào phát sinh từ hợp đồng này.</p>
          )}
        </div>
      )}

      {/* Activation Modal */}
      <Modal isOpen={isActivateModalOpen} onClose={() => setIsActivateModalOpen(false)} title="Kích hoạt hợp đồng thuê" maxWidth="md">
        <div className="space-y-4">
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-800">
            Xác nhận các điều kiện: Hợp đồng sẽ sinh mã chính thức `HD-YYYY-NNNN`, trạng thái phòng chuyển sang <strong>Đang thuê</strong>.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chỉ số điện bàn giao</label>
              <input
                type="number"
                step={0.1}
                value={elReading}
                onChange={(e) => setElReading(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chỉ số nước bàn giao</label>
              <input
                type="number"
                step={0.1}
                value={waterReading}
                onChange={(e) => setWaterReading(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setIsActivateModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" onClick={handleConfirmActivation}>
              Xác nhận kích hoạt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
