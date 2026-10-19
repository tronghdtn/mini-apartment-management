import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  ChevronRight,
  Check,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import { rooms, servicesList } from '@/mocks/data'
import { formatVND, formatDate } from '@/lib/format'
import { useApp } from '@/mocks/AppContext'
import { Button } from '@/components/ui/Button'

export const AdminContractNewPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedRoomId = searchParams.get('roomId')

  const { showToast } = useApp()

  // Wizard current step: 1..8
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Room
  const availableRooms = rooms.filter((r) => r.status === 'available')
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    preselectedRoomId || (availableRooms[0] ? availableRooms[0].id.toString() : '101')
  )
  const selectedRoom = rooms.find((r) => r.id.toString() === selectedRoomId) || rooms[0]

  // Step 2: Resident
  const [residentName, setResidentName] = useState('Đỗ Thùy Trang')
  const [residentPhone, setResidentPhone] = useState('0987654321')
  const [residentEmail, setResidentEmail] = useState('thuytrang@gmail.com')
  const [residentIdNumber, setResidentIdNumber] = useState('001199012345')

  // Step 3: Dates & Financials
  const [startDate, setStartDate] = useState('2026-11-01')
  const [endDate, setEndDate] = useState('2027-10-31') // 1 year
  const [monthlyRent, setMonthlyRent] = useState(selectedRoom.price)
  const [depositAmount, setDepositAmount] = useState(selectedRoom.price)

  // Step 4: Services
  const [selectedServices, setSelectedServices] = useState<string[]>(['INTERNET', 'HYGIENE'])

  // Step 5: Early termination terms (DB-D47)
  const [termType, setTermType] = useState<'none' | 'fixed' | 'multiplier'>('multiplier')
  const [termValue, setTermValue] = useState<number>(1.5)

  // Step 6: Exemption conditions (DB-D48)
  // Danh sách cố định — chưa có thao tác thêm/xóa (Antigravity làm dở)
  const [exemptions] = useState([
    'Người thuê được điều động chuyển công tác ra ngoài Hà Nội (có quyết định của cơ quan)',
    'Phòng xảy ra sự cố nghiêm trọng không do lỗi người thuê và không thể khắc phục trong 7 ngày',
  ])

  // Step 7: Co-occupants
  // Danh sách cố định — chưa có thao tác thêm/xóa (Antigravity làm dở)
  const [coOccupants] = useState([{ name: 'Đỗ Thùy Linh', phone: '0987654322', relation: 'Chị em' }])

  // Step 8: Activation Initial Readings
  const [initialElReading, setInitialElReading] = useState(1250.0)
  const [initialWaterReading, setInitialWaterReading] = useState(85.0)

  const steps = [
    'Chọn phòng',
    'Người thuê',
    'Thời hạn & Tiền',
    'Dịch vụ',
    'Phí trước hạn',
    'Miễn trừ',
    'Ở cùng',
    'Hoàn tất',
  ]

  const handleNext = () => {
    if (currentStep < 8) setCurrentStep(currentStep + 1)
  }

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSaveDraft = () => {
    showToast('Đã lưu hợp đồng ở trạng thái Bản nháp!', 'Bạn có thể chỉnh sửa và kích hoạt sau.', 'info')
    navigate('/admin/contracts')
  }

  const handleSaveAndActivate = () => {
    const newCode = `HD-2026-${Math.floor(1000 + Math.random() * 9000)}`
    showToast(`Đã kích hoạt hợp đồng thành công!`, `Mã hợp đồng: ${newCode}`, 'success')
    navigate('/admin/contracts')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/admin" className="hover:text-slate-900">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/admin/contracts" className="hover:text-slate-900">Hợp đồng</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-slate-900">Lập hợp đồng mới</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lập Hợp Đồng Cho Thuê (Wizard)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy trình chuẩn 8 bước thiết lập hợp đồng, điều khoản bồi thường và kích hoạt chỉ số.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSaveDraft}>
          Lưu bản nháp
        </Button>
      </div>

      {/* Stepper Bar */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
        <div className="flex items-center justify-between min-w-[640px]">
          {steps.map((st, idx) => {
            const stepNum = idx + 1
            const isDone = stepNum < currentStep
            const isCurrent = stepNum === currentStep

            return (
              <button
                key={st}
                type="button"
                onClick={() => setCurrentStep(stepNum)}
                className={`flex items-center gap-2 text-xs font-semibold py-1 px-2.5 rounded-xl transition ${
                  isCurrent
                    ? 'bg-sky-50 text-sky-700'
                    : isDone
                    ? 'text-emerald-700 hover:bg-slate-50'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    isCurrent
                      ? 'bg-sky-600 text-white'
                      : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : stepNum}
                </span>
                <span>{st}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Step 1: Room */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Bước 1: Chọn Căn Hộ Cho Thuê</h3>
            <p className="text-xs text-slate-500">Chỉ các phòng có trạng thái Còn trống mới được lập hợp đồng mới.</p>
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chọn phòng từ danh sách phòng trống
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value)
                  const r = rooms.find((rm) => rm.id.toString() === e.target.value)
                  if (r) {
                    setMonthlyRent(r.price)
                    setDepositAmount(r.price)
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium"
              >
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id.toString()}>
                    {r.code} — {r.title} ({r.buildingName} • Tầng {r.floor} • {formatVND(r.price)}/th)
                  </option>
                ))}
              </select>

              {/* Selected Room Mini Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{selectedRoom.title}</span>
                  <span className="text-slate-500">{selectedRoom.buildingAddress}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sky-700 block text-sm">{formatVND(selectedRoom.price)}</span>
                  <span className="text-slate-400">{selectedRoom.area} m² • Tối đa {selectedRoom.capacity} người</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Resident */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Bước 2: Thông Tin Người Thuê Đại Diện</h3>
            <p className="text-xs text-slate-500">Mỗi hợp đồng chỉ có duy nhất một người đại diện pháp lý ký kết hợp đồng.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Họ và tên người thuê
                </label>
                <input
                  type="text"
                  required
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Số điện thoại liên hệ
                </label>
                <input
                  type="tel"
                  required
                  value={residentPhone}
                  onChange={(e) => setResidentPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={residentEmail}
                  onChange={(e) => setResidentEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Số Căn cước công dân (CCCD)
                </label>
                <input
                  type="text"
                  required
                  value={residentIdNumber}
                  onChange={(e) => setResidentIdNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Dates & Financials */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Bước 3: Thời Hạn & Điều Khoản Tài Chính</h3>
            <p className="text-xs text-slate-500">
              Lưu ý quy tắc DB-D43: Ngày kết thúc (endDate) là <strong>ngày cuối cùng được ở</strong> (inclusive).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ngày bắt đầu ở (startDate)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ngày cuối được ở (endDate)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tiền thuê phòng hàng tháng (VND)
                </label>
                <input
                  type="number"
                  step={50000}
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-sky-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tiền cọc giữ chỗ (VND)
                </label>
                <input
                  type="number"
                  step={50000}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Services */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Bước 4: Đăng Ký Dịch Vụ Định Kỳ</h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              Điện sinh hoạt và Nước sinh hoạt (metered) sẽ tự động kích hoạt kèm theo chỉ số chốt. Chọn thêm các dịch vụ định kỳ đăng ký:
            </div>
            <div className="space-y-2">
              {servicesList.filter((s) => !s.isSystem).map((s) => {
                const isChecked = selectedServices.includes(s.code)
                return (
                  <label
                    key={s.code}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                      isChecked ? 'bg-sky-50/50 border-sky-300' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedServices(
                            isChecked ? selectedServices.filter((x) => x !== s.code) : [...selectedServices, s.code]
                          )
                        }}
                        className="rounded text-sky-600"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{s.name}</span>
                        <span className="text-[11px] text-slate-400">{s.note}</span>
                      </div>
                    </div>
                    <span className="font-bold text-xs text-slate-800">{s.priceDisplay}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 5: Early termination terms (DB-D47) */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Bước 5: Thiết Lập Điều Khoản Bồi Thường Khi Trả Trước Hạn</h3>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <strong>Quy tắc DB-D47:</strong> Bắt buộc xác định khi ký, hệ thống tự động tính khi thanh lý, không thể sửa sau khi kích hoạt hợp đồng.
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="termType"
                  checked={termType === 'none'}
                  onChange={() => setTermType('none')}
                  className="mt-0.5 text-sky-600"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Không bồi thường</span>
                  <span className="text-[11px] text-slate-500">Khách được trả phòng bất kỳ lúc nào mà không phát sinh phí phạt hợp đồng.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="termType"
                  checked={termType === 'fixed'}
                  onChange={() => setTermType('fixed')}
                  className="mt-0.5 text-sky-600"
                />
                <div className="flex-1">
                  <span className="font-bold text-xs text-slate-900 block">Số tiền bồi thường cố định (VND)</span>
                  <span className="text-[11px] text-slate-500 block mb-2">Áp dụng một mức phí phạt cố định nếu vi phạm cam kết thời hạn.</span>
                  {termType === 'fixed' && (
                    <input
                      type="number"
                      step={100000}
                      defaultValue={monthlyRent}
                      className="w-48 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                    />
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-sky-300 bg-sky-50/40 cursor-pointer">
                <input
                  type="radio"
                  name="termType"
                  checked={termType === 'multiplier'}
                  onChange={() => setTermType('multiplier')}
                  className="mt-0.5 text-sky-600"
                />
                <div className="flex-1">
                  <span className="font-bold text-xs text-slate-900 block">Theo hệ số tiền thuê tháng</span>
                  <span className="text-[11px] text-slate-500 block mb-2">Ví dụ 1.0 = 1 tháng tiền thuê; 1.5 = 1.5 tháng tiền thuê.</span>
                  {termType === 'multiplier' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={0.1}
                        min={0.1}
                        max={3.0}
                        value={termValue}
                        onChange={(e) => setTermValue(Number(e.target.value))}
                        className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                      />
                      <span className="text-xs font-semibold text-sky-800">
                        {/* [MOCK-TIỀN] Ước tính xem trước; số chính thức do Backend tính khi thanh lý */}
                        ≈ {termValue} × {formatVND(monthlyRent)} = {formatVND(monthlyRent * termValue)}
                      </span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 6: Exemption conditions (DB-D48) */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Bước 6: Điều Kiện Miễn Bồi Thường (Nếu Có)</h3>
            <p className="text-xs text-slate-500">Chỉ miễn bồi thường khi đúng điều kiện đã thỏa thuận trong hợp đồng và có căn cứ xác nhận.</p>
            <div className="space-y-2">
              {exemptions.map((ex, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                  <span>{idx + 1}. {ex}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Co-occupants */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Bước 7: Người Ở Cùng Phòng (Tùy Chọn)</h3>
            <p className="text-xs text-slate-500">Người ở cùng không bắt buộc có tài khoản; phục vụ đăng ký tạm trú và ra vào tòa nhà.</p>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2 text-xs">
              {coOccupants.map((occ, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{occ.name} ({occ.relation})</span>
                  <span className="text-slate-500">{occ.phone}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 8: Review & Activation */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Bước 8: Kiểm Tra Tổng Quan & Kích Hoạt</h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Căn phòng</span>
                <span className="font-bold text-slate-900">{selectedRoom.code} — {selectedRoom.buildingName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Người đại diện</span>
                <span className="font-bold text-slate-900">{residentName} ({residentPhone})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Thời hạn ở</span>
                <span className="font-semibold text-slate-800">{formatDate(startDate)} → {formatDate(endDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tiền thuê / Cọc</span>
                <span className="font-bold text-sky-700">{formatVND(monthlyRent)} / cọc {formatVND(depositAmount)}</span>
              </div>
            </div>

            {/* Initial Meter Readings Form */}
            <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-900 uppercase">
                <Zap className="w-4 h-4 text-sky-600" />
                <span>Nhập chỉ số điện nước bàn giao ban đầu</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Chỉ số điện đầu (kWh)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={initialElReading}
                    onChange={(e) => setInitialElReading(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Chỉ số nước đầu (m³)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={initialWaterReading}
                    onChange={(e) => setInitialWaterReading(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={currentStep === 1}
            onClick={handlePrev}
          >
            ← Quay lại
          </Button>

          <div className="flex items-center gap-3">
            {currentStep < 8 ? (
              <Button type="button" variant="primary" size="md" onClick={handleNext}>
                Tiếp tục bước tiếp theo →
              </Button>
            ) : (
              <>
                <Button type="button" variant="secondary" size="md" onClick={handleSaveDraft}>
                  Chỉ lưu bản nháp
                </Button>
                <Button type="button" variant="primary" size="md" onClick={handleSaveAndActivate}>
                  Lưu & Kích hoạt hợp đồng ngay
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
