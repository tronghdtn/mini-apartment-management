import React, { useState } from 'react'
import { Link } from 'react-router'
import {
  DoorOpen,
  CreditCard,
  AlertTriangle,
  DollarSign,
  Clock,
} from 'lucide-react'
import { useApp } from '@/mocks/AppContext'
import { buildings, rooms } from '@/mocks/data'
import { formatVND } from '@/lib/format'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export const AdminDashboardPage: React.FC = () => {
  const { payments, maintenanceRequests, contracts, invoices, appointments } = useApp()

  const [selectedBuildingId, setSelectedBuildingId] = useState('all')

  const totalRooms = rooms.length
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length
  const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100)

  // [MOCK-TIỀN] Các tổng dưới đây tính trên dữ liệu giả; khi tích hợp lấy từ API thống kê.
  // Real collected revenue this month (confirmed payments)
  const confirmedPaymentsTotal = payments
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0)

  // Total outstanding debt
  const totalDebt = invoices
    .filter((inv) => inv.status === 'issued' || inv.status === 'partially_paid')
    .reduce((sum, inv) => sum + inv.remainingAmount, 0)

  const pendingPayments = payments.filter((p) => p.status === 'pending')
  const pendingMaintenance = maintenanceRequests.filter((m) => m.status === 'pending')
  const todayAppointments = appointments.filter((a) => a.date === '2026-10-16' && a.status === 'confirmed')
  const overdueContracts = contracts.filter((c) => c.warningStatus === 'overdue')

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Tổng Quan Hoạt Động
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Số liệu thống kê thực tế toàn bộ hệ thống chung cư mini hôm nay, 16/10/2026.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">Tất cả tòa nhà (3 cơ sở)</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id.toString()}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tỷ lệ lấp đầy"
          value={`${occupancyRate}%`}
          subValue={`${occupiedRooms}/${totalRooms} phòng đang thuê`}
          icon={<DoorOpen className="w-5 h-5" />}
          tone="emerald"
        />

        <StatCard
          label="Thực thu tháng này"
          value={formatVND(confirmedPaymentsTotal)}
          subValue="Đã đối soát vào tài khoản"
          icon={<DollarSign className="w-5 h-5" />}
          tone="sky"
        />

        <StatCard
          label="Tổng công nợ chưa thu"
          value={formatVND(totalDebt)}
          subValue="Bao gồm các hóa đơn còn hạn & quá hạn"
          icon={<CreditCard className="w-5 h-5" />}
          tone={totalDebt > 0 ? 'amber' : 'default'}
        />

        <StatCard
          label="Thanh toán chờ duyệt"
          value={pendingPayments.length}
          subValue={`${pendingMaintenance.length} sự cố kỹ thuật chờ xử lý`}
          icon={<Clock className="w-5 h-5" />}
          tone={pendingPayments.length > 0 ? 'rose' : 'default'}
        />
      </div>

      {/* Action Required Priority Banners */}
      {(pendingPayments.length > 0 || overdueContracts.length > 0 || pendingMaintenance.length > 0) && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Việc cần xử lý ngay</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pendingPayments.length > 0 && (
              <div className="p-3 bg-white rounded-xl border border-amber-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {pendingPayments.length} khoản chuyển khoản
                  </span>
                  <span className="text-[11px] text-slate-500">Cần đối soát biên nhận</span>
                </div>
                {/* Màn hình Duyệt thanh toán chưa có trong prototype */}
                <Button variant="outline" size="sm" className="text-xs py-1" disabled title="Màn hình chưa có trong prototype">
                  Duyệt ngay
                </Button>
              </div>
            )}

            {overdueContracts.length > 0 && (
              <div className="p-3 bg-white rounded-xl border border-rose-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-700 block">
                    {overdueContracts.length} hợp đồng quá hạn
                  </span>
                  <span className="text-[11px] text-slate-500">Cần gia hạn hoặc thanh lý</span>
                </div>
                <Link to="/admin/contracts?status=overdue">
                  <Button variant="outline" size="sm" className="text-xs py-1">
                    Kiểm tra
                  </Button>
                </Link>
              </div>
            )}

            {pendingMaintenance.length > 0 && (
              <div className="p-3 bg-white rounded-xl border border-amber-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {pendingMaintenance.length} sự cố sửa chữa
                  </span>
                  <span className="text-[11px] text-slate-500">Chưa phân công kỹ thuật</span>
                </div>
                {/* Màn hình Yêu cầu sửa chữa chưa có trong prototype */}
                <Button variant="outline" size="sm" className="text-xs py-1" disabled title="Màn hình chưa có trong prototype">
                  Phân công
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Middle Grid: Revenue & Occupancy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Occupancy by Building Matrix (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">Tình Trạng Phòng Từng Tòa Nhà</h3>
              <p className="text-xs text-slate-400">Tỷ lệ lấp đầy và số phòng sẵn sàng cho thuê</p>
            </div>
            <Link to="/admin/rooms" className="text-xs font-semibold text-sky-600 hover:underline">
              Xem chi tiết phòng →
            </Link>
          </div>

          <div className="space-y-4 pt-2">
            {buildings.map((b) => {
              const bRooms = rooms.filter((r) => r.buildingId === b.id)
              const bOccupied = bRooms.filter((r) => r.status === 'occupied').length
              const bAvail = bRooms.filter((r) => r.status === 'available').length
              const rate = bRooms.length ? Math.round((bOccupied / bRooms.length) * 100) : 0

              return (
                <div key={b.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{b.name} ({b.district})</span>
                    <span className="font-semibold text-emerald-700">{rate}% lấp đầy</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${rate}%` }} />
                    <div className="bg-sky-400 h-full" style={{ width: `${100 - rate}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{bOccupied} phòng đang thuê</span>
                    <span className="font-medium text-sky-700">{bAvail} phòng còn trống</span>
                    <span>Tổng {bRooms.length} phòng</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Today's Viewing Schedule (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Khách Xem Phòng Hôm Nay</h3>
                <p className="text-xs text-slate-400">Theo dõi khách đến trực tiếp tòa nhà</p>
              </div>
              {/* Màn hình Lịch xem phòng chưa có trong prototype */}
              <span className="text-xs font-semibold text-slate-400 cursor-not-allowed" title="Màn hình chưa có trong prototype">
                Tất cả →
              </span>
            </div>

            <div className="space-y-3 pt-3">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {apt.guestName} ({apt.guestPhone})
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Phòng {apt.roomCode} • {apt.buildingName}
                      </span>
                      <span className="text-[10px] text-sky-700 font-semibold mt-1 inline-block">
                        Khung giờ: {apt.timeSlot}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      {apt.guardStatus === 'checked_in' && (
                        <Badge tone="emerald" dot size="sm">Đã vào</Badge>
                      )}
                      {apt.guardStatus === 'checked_out' && (
                        <Badge tone="slate" size="sm">Đã ra</Badge>
                      )}
                      {apt.guardStatus === 'not_arrived' && (
                        <Badge tone="amber" dot size="sm">Chưa đến</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">Hôm nay không có lịch hẹn mới.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link to="/admin/contracts/new">
              <Button variant="primary" size="md" className="w-full text-xs font-bold">
                Lập hợp đồng cho thuê mới
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
