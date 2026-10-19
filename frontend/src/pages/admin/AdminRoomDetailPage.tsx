import React, { useState } from 'react'
import { useParams, Link } from 'react-router'
import {
  CheckCircle2,
  ChevronRight,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react'
import { rooms, contracts, meterReadings, maintenanceRequests, viewingAppointments } from '@/mocks/data'
import { formatVND, formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { useApp } from '@/mocks/AppContext'

export const AdminRoomDetailPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const { toggleRoomPublic } = useApp()

  const room = rooms.find((r) => r.id.toString() === roomId) || rooms[0]
  const roomContracts = contracts.filter((c) => c.roomId === room.id)
  const roomReadings = meterReadings.filter((m) => m.roomId === room.id)
  const roomMaintenance = maintenanceRequests.filter((req) => req.roomId === room.id)
  const roomAppointments = viewingAppointments.filter((a) => a.roomId === room.id)

  const [activeTab, setActiveTab] = useState<'info' | 'contracts' | 'readings' | 'maintenance' | 'appointments'>('info')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/admin" className="hover:text-slate-900">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/admin/rooms" className="hover:text-slate-900">Phòng</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-slate-900">{room.code}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
              {room.code}
            </span>
            {room.status === 'available' && <Badge tone="emerald" dot>Còn trống</Badge>}
            {room.status === 'occupied' && <Badge tone="sky" dot>Đang thuê</Badge>}
            {room.status === 'maintenance' && <Badge tone="amber" dot>Bảo trì</Badge>}
            <button
              onClick={() => toggleRoomPublic(room.id)}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-200 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
            >
              {room.is_public ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
              <span>{room.is_public ? 'Công khai' : 'Ẩn web'}</span>
            </button>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{room.title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {room.buildingName} • Tầng {room.floor} • {room.buildingAddress}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {room.status === 'available' && (
            <Link to={`/admin/contracts/new?roomId=${room.id}`}>
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                Lập hợp đồng thuê
              </Button>
            </Link>
          )}
          <Link to={`/rooms/${room.id}`} target="_blank">
            <Button variant="outline" size="sm">
              Xem trang Public
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs
        tabs={[
          { id: 'info', label: 'Thông tin phòng' },
          { id: 'contracts', label: `Hợp đồng (${roomContracts.length})` },
          { id: 'readings', label: `Chỉ số điện nước (${roomReadings.length})` },
          { id: 'maintenance', label: `Sửa chữa (${roomMaintenance.length})` },
          { id: 'appointments', label: `Lịch xem (${roomAppointments.length})` },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* Tab 1: Info Overview */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
              <h3 className="font-bold text-base text-slate-900">Thông Số Cơ Bản</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block">Giá niêm yết</span>
                  <span className="font-bold text-sky-700 text-sm mt-0.5 block">{formatVND(room.price)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tiền cọc</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatVND(room.deposit)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Diện tích</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{room.area} m²</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Sức chứa tối đa</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{room.capacity} người</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Mô tả căn hộ
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {room.description}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
              <h3 className="font-bold text-base text-slate-900">Tiện Nghi Riêng Trong Phòng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {room.roomAmenities.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Images preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Hình Ảnh Phòng</h3>
              <div className="space-y-2">
                {room.images.map((img, idx) => (
                  <div key={idx} className="h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contracts */}
      {activeTab === 'contracts' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          {roomContracts.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3.5">Mã HĐ</th>
                  <th className="px-5 py-3.5">Người thuê đại diện</th>
                  <th className="px-5 py-3.5">Thời hạn</th>
                  <th className="px-5 py-3.5">Tiền thuê</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomContracts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {c.code || 'Nháp'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-800 block">{c.residentName}</span>
                      <span className="text-[11px] text-slate-400">{c.residentPhone}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(c.startDate)} → {formatDate(c.endDate)}
                    </td>
                    <td className="px-5 py-4 font-bold text-sky-700">
                      {formatVND(c.monthlyRent)}/th
                    </td>
                    <td className="px-5 py-4">
                      {c.status === 'active' && <Badge tone="emerald" dot>Đang hiệu lực</Badge>}
                      {c.status === 'draft' && <Badge tone="slate">Nháp</Badge>}
                      {c.status === 'terminated' && <Badge tone="slate">Đã thanh lý</Badge>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link to={`/admin/contracts/${c.id}`}>
                        <Button variant="outline" size="sm" className="text-xs py-1">
                          Xem HĐ
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">Chưa có hợp đồng nào cho phòng này.</p>
          )}
        </div>
      )}

      {/* Tab 3: Meter Readings */}
      {activeTab === 'readings' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          {roomReadings.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3.5">Kỳ tiêu thụ</th>
                  <th className="px-5 py-3.5">Dịch vụ</th>
                  <th className="px-5 py-3.5">Chỉ số cũ</th>
                  <th className="px-5 py-3.5">Chỉ số mới</th>
                  <th className="px-5 py-3.5">Tiêu thụ</th>
                  <th className="px-5 py-3.5">Loại chốt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomReadings.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-4 font-bold text-slate-900">{r.period}</td>
                    <td className="px-5 py-4 font-medium">{r.serviceName}</td>
                    <td className="px-5 py-4 font-mono">{r.oldReading.toFixed(2)}</td>
                    <td className="px-5 py-4 font-mono font-bold text-sky-700">{r.newReading.toFixed(2)}</td>
                    <td className="px-5 py-4 font-bold text-emerald-700">
                      {r.consumption.toFixed(2)} {r.serviceCode === 'ELECTRICITY' ? 'kWh' : 'm³'}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={r.kind === 'final' ? 'amber' : 'slate'}>
                        {r.kind === 'final' ? 'Chốt trả phòng' : 'Định kỳ'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">Chưa có bản ghi chỉ số nào cho phòng này.</p>
          )}
        </div>
      )}

      {/* Tab 4: Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3">
          {roomMaintenance.length > 0 ? (
            roomMaintenance.map((m) => (
              <div key={m.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs">{m.code}</span>
                    <Badge tone={m.status === 'resolved' ? 'emerald' : m.status === 'in_progress' ? 'sky' : 'amber'}>
                      {m.status === 'resolved' ? 'Đã xử lý' : m.status === 'in_progress' ? 'Đang làm' : 'Chờ xử lý'}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1">{m.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                </div>
                {/* Màn hình chi tiết yêu cầu sửa chữa chưa có trong prototype */}
                <Button variant="outline" size="sm" className="text-xs py-1" disabled title="Màn hình chưa có trong prototype">
                  Xem sự cố
                </Button>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">Không có yêu cầu sửa chữa nào.</p>
          )}
        </div>
      )}

      {/* Tab 5: Appointments */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3">
          {roomAppointments.length > 0 ? (
            roomAppointments.map((a) => (
              <div key={a.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-xs">{a.code}</span>
                  <h4 className="font-bold text-sm text-slate-900 mt-0.5">{a.guestName} ({a.guestPhone})</h4>
                  <p className="text-xs text-slate-500">Khung giờ: {a.timeSlot}, ngày {formatDate(a.date)}</p>
                </div>
                <Badge tone={a.status === 'confirmed' ? 'emerald' : 'amber'}>
                  {a.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ duyệt'}
                </Badge>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">Chưa có lịch hẹn xem cho phòng này.</p>
          )}
        </div>
      )}
    </div>
  )
}
