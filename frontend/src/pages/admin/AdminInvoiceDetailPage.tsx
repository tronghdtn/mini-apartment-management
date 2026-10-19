import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft, Printer, AlertTriangle,
  Send, QrCode, CreditCard, Building,
  ShieldCheck, AlertCircle
} from 'lucide-react';
import { useApp } from '@/mocks/AppContext'
import { Button } from '@/components/ui/Button'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Lightbox } from '@/components/ui/Lightbox'
import type { PaymentProof } from '@/mocks/types'
import { users, systemSettings as settings } from '@/mocks/data'
import { formatDate, formatDateTime } from '@/lib/format'

const paymentMethodLabel: Record<PaymentProof['method'], string> = {
  bank_transfer: 'Chuyển khoản',
  cash: 'Tiền mặt',
  deposit: 'Khấu trừ cọc',
};

export const AdminInvoiceDetailPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { invoices, payments, issueInvoice, cancelInvoice, showToast } = useApp();

  const [previewProofImage, setPreviewProofImage] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const invoice = invoices.find(inv => inv.id === Number(invoiceId));
  const resident = invoice ? users.find(u => u.id === invoice.residentId) : undefined;
  const proofs = invoice ? payments.filter(p => p.invoiceId === invoice.id) : [];

  if (!invoice) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-stone-200">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-stone-800">Không tìm thấy hóa đơn</h2>
        <p className="text-stone-500 mt-1 mb-4">Hóa đơn không tồn tại hoặc đã bị xóa.</p>
        <Link to="/admin/invoices">
          <Button variant="outline">Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  const remaining = invoice.remainingAmount;
  const hasConfirmedPayment = proofs.some(p => p.status === 'confirmed');
  const hasPendingPayment = proofs.some(p => p.status === 'pending');
  const isOverdueOpen =
    !!invoice.isOverdue && (invoice.status === 'issued' || invoice.status === 'partially_paid');

  const statusBadge: { tone: BadgeTone; label: string } = isOverdueOpen
    ? { tone: 'rose', label: 'Quá hạn' }
    : invoice.status === 'paid'
      ? { tone: 'emerald', label: 'Đã thanh toán' }
      : invoice.status === 'partially_paid'
        ? { tone: 'indigo', label: 'Thanh toán một phần' }
        : invoice.status === 'issued'
          ? { tone: 'sky', label: 'Đã phát hành' }
          : invoice.status === 'cancelled'
            ? { tone: 'slate', label: 'Đã hủy' }
            : { tone: 'amber', label: 'Bản nháp' };

  const handleIssueInvoice = () => {
    issueInvoice(invoice.id);
  };

  // DB-D27: có payment confirmed → cần quy trình điều chỉnh; có pending → xử lý pending trước.
  const blockCancelReason = hasConfirmedPayment
    ? 'Hóa đơn đã có thanh toán được xác nhận — cần quy trình điều chỉnh (DB-D27).'
    : hasPendingPayment
      ? 'Hóa đơn còn thanh toán chờ duyệt — cần xử lý trước khi hủy (DB-D27).'
      : null;

  const handleCancelInvoice = () => {
    if (blockCancelReason) {
      showToast('Không thể hủy hóa đơn', blockCancelReason, 'error');
      return;
    }
    if (!cancelReason.trim()) {
      showToast('Vui lòng nhập lý do hủy hóa đơn', undefined, 'error');
      return;
    }
    cancelInvoice(invoice.id, cancelReason.trim());
    setIsCancelModalOpen(false);
    setCancelReason('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-800">
                {invoice.code || 'Hóa đơn tạm tính'}
              </h1>
              <Badge tone={statusBadge.tone}>
                {statusBadge.label}
              </Badge>
            </div>
            <p className="text-sm text-stone-500">
              Kỳ tháng {invoice.period.substring(5, 7)}/{invoice.period.substring(0, 4)} — Hạn thanh toán: {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" />
            In hóa đơn
          </Button>

          {invoice.status === 'draft' && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleIssueInvoice}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="w-4 h-4" />
              Phát hành ngay
            </Button>
          )}

          {invoice.status !== 'cancelled' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                if (blockCancelReason) {
                  showToast('Không thể hủy hóa đơn', blockCancelReason, 'error');
                } else {
                  setIsCancelModalOpen(true);
                }
              }}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Hủy hóa đơn
            </Button>
          )}
        </div>
      </div>

      {/* Warning banner if overdue */}
      {isOverdueOpen && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>
            Hóa đơn này đã quá hạn thanh toán từ ngày <strong>{formatDate(invoice.dueDate)}</strong>.
            Vui lòng liên hệ cư dân hoặc gửi nhắc nhở thanh toán.
          </span>
        </div>
      )}

      {/* Invoice Card / Printable document */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
              <Building className="w-6 h-6" />
              <span>{settings.systemName}</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">Hotline: {settings.hotline}</p>
            <p className="text-xs text-stone-500">Mã tòa nhà: {invoice.buildingName}</p>
          </div>

          <div className="text-left sm:text-right">
            <h2 className="text-xl font-bold text-stone-800">PHIẾU BÁO TIỀN THUÊ & DỊCH VỤ</h2>
            <p className="text-xs font-mono text-stone-500 mt-0.5">Số: {invoice.code || 'DRAFT'}</p>
            <p className="text-xs text-stone-500">Hợp đồng: {invoice.contractCode}</p>
            {invoice.issueDate && (
              <p className="text-xs text-stone-500">Ngày phát hành: {formatDate(invoice.issueDate)}</p>
            )}
          </div>
        </div>

        {/* Customer & Room Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-stone-50 p-4 rounded-xl">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
              Thông tin người thuê (Cư dân)
            </span>
            <div className="font-bold text-stone-800 text-base">{invoice.residentName}</div>
            <div className="text-stone-600">SĐT: {invoice.residentPhone}</div>
            {resident?.email && <div className="text-stone-600">Email: {resident.email}</div>}
          </div>

          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
              Phòng thuê & Thời hạn
            </span>
            <div className="font-bold text-stone-800 text-base">Phòng {invoice.roomCode} ({invoice.buildingName})</div>
            <div className="text-stone-600">Kỳ thanh toán: Tháng {invoice.period.substring(5, 7)}/{invoice.period.substring(0, 4)}</div>
            <div className="text-stone-600 font-medium text-red-600">Hạn chót thanh toán: {formatDate(invoice.dueDate)}</div>
          </div>
        </div>

        {/* Snapshot Items Breakdown Table */}
        <div>
          <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center justify-between">
            <span>Chi tiết các khoản phí snapshot (DB-D32)</span>
            <span className="text-xs font-normal text-stone-500">Đơn vị tính: Đồng (VND)</span>
          </h3>

          <div className="border border-stone-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Khoản thu</th>
                  <th className="px-4 py-3 text-right">Số lượng</th>
                  <th className="px-4 py-3 text-right">Đơn giá</th>
                  <th className="px-4 py-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 text-stone-400 text-xs">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-800">{item.description}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-stone-600">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-stone-600">
                      {item.unitPrice.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-stone-800">
                      {item.amount < 0 ? (
                        <span className="text-emerald-600">-{Math.abs(item.amount).toLocaleString('vi-VN')} đ</span>
                      ) : (
                        `${item.amount.toLocaleString('vi-VN')} đ`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total calculation panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-stone-200">
          <div className="text-xs text-stone-500 leading-relaxed max-w-sm">
            * Số tiền trên hóa đơn đã được tính toán bằng BCMath làm tròn HALF_UP đến từng đồng theo quy định DB-D04.
          </div>

          <div className="w-full sm:w-72 space-y-2 text-sm">
            <div className="flex justify-between py-1 text-stone-600">
              <span>Tổng tiền cần thanh toán:</span>
              <span className="font-mono font-bold text-stone-800">{invoice.totalAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between py-1 text-emerald-700">
              <span>Đã thanh toán (Confirmed):</span>
              <span className="font-mono font-bold">-{invoice.paidAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-stone-300 font-bold text-base">
              <span className="text-stone-800">Còn lại phải nộp:</span>
              <span className={`font-mono ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {remaining.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>

        {/* Payment QR and Bank Account Info */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-sm shrink-0">
            {/* Quick SVG VietQR mock representation */}
            <div className="w-32 h-32 bg-stone-900 rounded flex flex-col items-center justify-center text-white text-xs p-2 text-center">
              <QrCode className="w-10 h-10 mb-1 text-emerald-400" />
              <span className="font-bold text-[10px] tracking-wide">VIETQR PRO</span>
              <span className="text-[9px] text-stone-300">Quét để trả hóa đơn</span>
            </div>
          </div>

          <div className="space-y-1.5 text-sm text-stone-700 w-full">
            <h4 className="font-bold text-stone-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Thông tin chuyển khoản ngân hàng
            </h4>
            <div className="text-xs">
              <span className="text-stone-500">Ngân hàng: </span>
              <span className="font-semibold">{settings.bankName}</span>
            </div>
            <div className="text-xs">
              <span className="text-stone-500">Số tài khoản: </span>
              <span className="font-mono font-bold text-emerald-800">{settings.bankAccount}</span>
            </div>
            <div className="text-xs">
              <span className="text-stone-500">Chủ tài khoản: </span>
              <span className="font-semibold uppercase">{settings.bankAccountName}</span>
            </div>
            <div className="text-xs">
              <span className="text-stone-500">Nội dung chuyển khoản: </span>
              <span className="font-mono font-bold text-stone-800 bg-white px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                {invoice.code || 'TIEN PHONG'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment history & Proofs section */}
        <div className="pt-4 border-t border-stone-200">
          <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Lịch sử giao dịch & Minh chứng đã gửi ({proofs.length})
          </h3>

          {proofs.length === 0 ? (
            <p className="text-xs text-stone-500 italic">Chưa có minh chứng hoặc lượt thanh toán nào được gửi cho hóa đơn này.</p>
          ) : (
            <div className="space-y-3">
              {proofs.map(p => (
                <div key={p.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {p.proofImageUrl && (
                      <img
                        src={p.proofImageUrl}
                        alt="Minh chứng"
                        className="w-12 h-12 object-cover rounded border border-stone-300 cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewProofImage(p.proofImageUrl ?? null)}
                      />
                    )}
                    <div>
                      <div className="font-semibold text-stone-800">
                        {p.amount.toLocaleString('vi-VN')} đ ({paymentMethodLabel[p.method]})
                      </div>
                      <div className="text-stone-500">Thời gian: {formatDateTime(p.submittedAt)}</div>
                      {p.receiptNumber && (
                        <div className="font-mono text-emerald-700 font-semibold">Mã biên nhận: {p.receiptNumber}</div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge tone={p.status === 'confirmed' ? 'emerald' : p.status === 'rejected' ? 'rose' : 'amber'}>
                      {p.status === 'confirmed' ? 'Đã duyệt' : p.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for proof preview */}
      {previewProofImage && (
        <Lightbox
          isOpen={true}
          images={[previewProofImage]}
          currentIndex={0}
          setCurrentIndex={() => {}}
          onClose={() => setPreviewProofImage(null)}
          roomTitle="Ảnh chụp biên lai chuyển khoản của cư dân"
        />
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Xác nhận hủy hóa đơn"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Bạn có chắc chắn muốn hủy hóa đơn <strong>{invoice.code || 'bản nháp'}</strong>?
          </p>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Lý do hủy hóa đơn:</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Nhập lý do sai chỉ số điện nước, thỏa thuận lại tiền phòng..."
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-emerald-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>Quay lại</Button>
            <Button variant="danger" onClick={handleCancelInvoice}>Xác nhận hủy</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
