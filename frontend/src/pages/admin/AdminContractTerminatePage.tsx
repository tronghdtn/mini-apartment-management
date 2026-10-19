import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, FileText, Calendar,
  DollarSign, Wrench, ShieldAlert} from 'lucide-react';
import { useApp } from '@/mocks/AppContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/format'

export const AdminContractTerminatePage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { contracts, terminateContract, showToast } = useApp();

  const contract = contracts.find(c => c.id === Number(contractId));

  // Form states
  const [actualEndDate, setActualEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [closureReason, setClosureReason] = useState<'on_time' | 'early_termination' | 'same_day'>('on_time');
  const [closureNote, setClosureNote] = useState('');
  
  // Room inspection
  const [inspectionPassed, setInspectionPassed] = useState(true);
  const [damageAmount, setDamageAmount] = useState<number>(0);
  const [damageDescription, setDamageDescription] = useState('');
  
  // Early termination fee waiver checkbox
  const [applyExemption, setApplyExemption] = useState(false);
  const [exemptionReason, setExemptionReason] = useState('');

  if (!contract) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-stone-200">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-stone-800">Không tìm thấy hợp đồng</h2>
        <p className="text-stone-500 mt-1 mb-4">Hợp đồng không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <Link to="/admin/contracts">
          <Button variant="outline">Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  // Calculate settlement numbers
  const isEarly = closureReason === 'early_termination';
  // [MOCK-TIỀN] Minh họa giao diện. Phí trước hạn, bồi thường và quyết toán cọc phải do Backend
  // tính theo điều khoản đã ký — cấu trúc còn chờ duyệt (P1–P12), không dùng làm nguồn nghiệp vụ.
  const penaltyFromTerms = contract.earlyTerminationType === 'multiplier'
    ? (contract.monthlyRent * (contract.earlyTerminationValue || 1))
    : (contract.earlyTerminationValue || 0);

  const finalPenalty = isEarly && !applyExemption ? penaltyFromTerms : 0;
  const depositRefund = contract.depositAmount;
  const netSettlement = depositRefund - damageAmount - finalPenalty;

  const handleConfirmLiquidation = () => {
    if (closureReason !== 'on_time' && !closureNote.trim()) {
      showToast('Vui lòng nhập ghi chú lý do thanh lý khi kết thúc trước hạn', undefined, 'error');
      return;
    }

    terminateContract(contract.id, actualEndDate, closureReason, closureNote);
    navigate(`/admin/contracts/${contract.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
              Quy trình thanh lý hợp đồng {contract.code}
            </h1>
            <p className="text-sm text-stone-500">
              Phòng {contract.roomCode} ({contract.buildingName}) — Cư dân: {contract.residentName}
            </p>
          </div>
        </div>
        <Badge tone={contract.status === 'active' ? 'emerald' : 'slate'} size="md">
          {contract.status === 'active' ? 'Đang hiệu lực' : contract.status}
        </Badge>
      </div>

      {/* Contract Terms Snapshot */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-900 leading-relaxed">
          <span className="font-semibold">Điều khoản trả phòng đã ký kết: </span>
          Ngày kết thúc hợp đồng dự kiến là <strong>{formatDate(contract.endDate)}</strong>.
          Phạt vi phạm chấm dứt trước hạn: {
            contract.earlyTerminationType === 'none' ? 'Không bồi thường' :
            contract.earlyTerminationType === 'fixed' ? `${contract.earlyTerminationValue?.toLocaleString('vi-VN')} đ` :
            `${contract.earlyTerminationValue} tháng tiền phòng (${(contract.monthlyRent * (contract.earlyTerminationValue || 1)).toLocaleString('vi-VN')} đ)`
          }.
          {contract.exemptionCondition && (
            <p className="mt-1 text-xs text-amber-800 italic">
              * Điều kiện miễn phạt: {contract.exemptionCondition}
            </p>
          )}
          <p className="mt-2 text-xs text-amber-800">
            <span className="font-semibold">Màn hình minh họa:</span> cấu trúc lưu phí trả trước hạn, miễn trừ
            và bồi thường tài sản đang chờ duyệt (P1–P12) — số liệu dưới đây chưa phải quy tắc đã chốt.
          </p>
        </div>
      </div>

      {/* Step 1: Handover date and Reason */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-stone-800">1. Ngày bàn giao & Lý do chấm dứt</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Ngày bàn giao thực tế (actual_end_date) *
            </label>
            <input 
              type="date"
              value={actualEndDate}
              onChange={e => setActualEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-emerald-600"
            />
            <p className="text-xs text-stone-500 mt-1">
              * Theo quy tắc DB-D43: Ngày bàn giao là mốc loại trừ, tiền thuê tính đến ngày trước đó.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Lý do thanh lý *
            </label>
            <select
              value={closureReason}
              onChange={e => setClosureReason(e.target.value as any)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-emerald-600"
            >
              <option value="on_time">Đúng hạn theo hợp đồng (on_time)</option>
              <option value="early_termination">Chấm dứt trước hạn (early_termination)</option>
              <option value="same_day">Chấm dứt trong ngày nhận phòng (same_day)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Ghi chú biên bản thanh lý {closureReason !== 'on_time' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={2}
              value={closureNote}
              onChange={e => setClosureNote(e.target.value)}
              placeholder="Ghi chú tình trạng nhận bàn giao chìa khóa, hiện trạng vệ sinh..."
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Step 2: Room Inspection & Furniture Check */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <Wrench className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-stone-800">2. Kiểm tra tài sản & Hiện trạng phòng</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="inspection" 
                checked={inspectionPassed} 
                onChange={() => {
                  setInspectionPassed(true);
                  setDamageAmount(0);
                  setDamageDescription('');
                }}
                className="text-emerald-600 focus:ring-emerald-500" 
              />
              <span className="text-sm font-medium text-stone-700">Tài sản đầy đủ, không hư hỏng</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="inspection" 
                checked={!inspectionPassed} 
                onChange={() => setInspectionPassed(false)}
                className="text-emerald-600 focus:ring-emerald-500" 
              />
              <span className="text-sm font-medium text-stone-700">Có hư hao / cần bồi thường</span>
            </label>
          </div>

          {!inspectionPassed && (
            <div className="p-4 bg-red-50/60 rounded-xl border border-red-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-red-900 mb-1">
                  Số tiền khấu trừ bồi thường (VNĐ)
                </label>
                <input 
                  type="number"
                  min="0"
                  step="50000"
                  value={damageAmount}
                  onChange={e => setDamageAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-red-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-red-900 mb-1">
                  Mô tả hư hỏng / thiết bị thiếu
                </label>
                <input 
                  type="text"
                  value={damageDescription}
                  onChange={e => setDamageDescription(e.target.value)}
                  placeholder="Vỡ gương nhà tắm, mất thẻ từ thang máy..."
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-red-500 bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Early termination penalty & Exemption */}
      {isEarly && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-stone-800">3. Phí phạt vi phạm chấm dứt trước hạn</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm p-3 bg-stone-50 rounded-lg">
              <span className="text-stone-600">Phí tính theo hợp đồng:</span>
              <span className="font-bold text-stone-800">{penaltyFromTerms.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={applyExemption}
                  onChange={e => setApplyExemption(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-stone-800">
                  Miễn trừ phạt vi phạm trước hạn (theo điều khoản đã thỏa thuận)
                </span>
              </label>

              {applyExemption && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">
                    Căn cứ miễn phạt *
                  </label>
                  <input 
                    type="text"
                    value={exemptionReason}
                    onChange={e => setExemptionReason(e.target.value)}
                    placeholder="Báo trước trên 30 ngày đúng cam kết / có giấy điều chuyển công tác..."
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm bg-white focus:outline-emerald-600"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Final Settlement Preview */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <FileText className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-stone-800">4. Dự tính quyết toán tài chính cuối cùng (Final Invoice)</h2>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-stone-100">
            <span className="text-stone-600">Tiền cọc giữ ban đầu:</span>
            <span className="font-semibold text-emerald-600">+{depositRefund.toLocaleString('vi-VN')} đ</span>
          </div>
          {damageAmount > 0 && (
            <div className="flex justify-between py-2 border-b border-stone-100 text-red-600">
              <span>Khấu trừ hư hỏng ({damageDescription || 'Tài sản'}):</span>
              <span className="font-semibold">-{damageAmount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          {finalPenalty > 0 && (
            <div className="flex justify-between py-2 border-b border-stone-100 text-red-600">
              <span>Phạt chấm dứt trước hạn:</span>
              <span className="font-semibold">-{finalPenalty.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          <div className="flex justify-between py-3 border-t-2 border-stone-300 font-bold text-base">
            <span className="text-stone-800">
              {netSettlement >= 0 ? 'Số tiền hoàn trả lại cư dân:' : 'Số tiền cư dân cần thanh toán thêm:'}
            </span>
            <span className={netSettlement >= 0 ? 'text-emerald-700' : 'text-red-600'}>
              {Math.abs(netSettlement).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Hủy bỏ
        </Button>
        <Button 
          variant="primary" 
          onClick={handleConfirmLiquidation}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <CheckCircle2 className="w-4 h-4" />
          Xác nhận hoàn tất thanh lý
        </Button>
      </div>
    </div>
  );
};
