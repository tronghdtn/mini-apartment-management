import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  FileText, Search, Plus, 
  Eye} from 'lucide-react';
import { useApp } from '@/mocks/AppContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Invoice } from '@/mocks/types'
import { formatDate } from '@/lib/format'

// "Quá hạn" không phải một trạng thái hóa đơn: là cờ isOverdue trên hóa đơn còn nợ.
const isOverdueOpen = (inv: Invoice) =>
  !!inv.isOverdue && (inv.status === 'issued' || inv.status === 'partially_paid');

export const AdminInvoicesPage: React.FC = () => {
  const { invoices } = useApp();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  const filteredInvoices = invoices.filter(inv => {
    // Tab filter
    if (activeTab === 'overdue') {
      if (!isOverdueOpen(inv)) return false;
    } else if (activeTab !== 'all' && inv.status !== activeTab) return false;

    // Period filter
    if (selectedPeriod !== 'all' && inv.period !== selectedPeriod) return false;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchInv = inv.code?.toLowerCase().includes(term);
      const matchRoom = inv.roomCode.toLowerCase().includes(term);
      const matchName = inv.residentName.toLowerCase().includes(term);
      if (!matchInv && !matchRoom && !matchName) return false;
    }

    return true;
  });

  const getStatusBadge = (inv: Invoice) => {
    if (isOverdueOpen(inv)) {
      return <Badge tone="rose">Quá hạn</Badge>;
    }
    switch (inv.status) {
      case 'paid':
        return <Badge tone="emerald">Đã thanh toán</Badge>;
      case 'partially_paid':
        return <Badge tone="indigo">Thanh toán một phần</Badge>;
      case 'issued':
        return <Badge tone="sky">Đã phát hành</Badge>;
      case 'draft':
        return <Badge tone="amber">Bản nháp</Badge>;
      case 'cancelled':
        return <Badge tone="slate">Đã hủy</Badge>;
      default:
        return <Badge tone="slate">{inv.status}</Badge>;
    }
  };

  const getInvoiceTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly': return 'Định kỳ tháng';
      case 'deposit': return 'Đặt cọc';
      case 'final': return 'Quyết toán thanh lý';
      default: return 'Khác';
    }
  };

  // Stats calculation
  // [MOCK-TIỀN] Tổng hiển thị trên dữ liệu giả; khi tích hợp lấy số liệu tổng hợp từ API.
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalRemaining = filteredInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            Quản lý hóa đơn & công nợ
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Theo dõi phát hành hóa đơn định kỳ, quyết toán thanh lý và đối soát thu tiền (DB-D26, DB-D27)
          </p>
        </div>

        {/* Màn hình lập hóa đơn chưa được thiết kế — giữ nút nhưng vô hiệu hóa */}
        <Button
          variant="primary"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled
          title="Màn hình lập hóa đơn chưa có trong prototype"
        >
          <Plus className="w-4 h-4" />
          Lập hóa đơn mới
        </Button>
      </div>

      {/* Overview mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <span className="text-xs text-stone-500 font-medium">Tổng phải thu (theo bộ lọc)</span>
          <p className="text-2xl font-bold text-stone-800 mt-1">
            {totalAmount.toLocaleString('vi-VN')} đ
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <span className="text-xs text-stone-500 font-medium">Đã thu thực tế</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {totalPaid.toLocaleString('vi-VN')} đ
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <span className="text-xs text-stone-500 font-medium">Còn tồn đọng cần thu</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {totalRemaining.toLocaleString('vi-VN')} đ
          </p>
        </div>
      </div>

      {/* Tabs and search bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'issued', label: 'Đã phát hành' },
              { id: 'overdue', label: 'Quá hạn' },
              { id: 'paid', label: 'Đã thanh toán' },
              { id: 'draft', label: 'Bản nháp' },
              { id: 'cancelled', label: 'Đã hủy' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 whitespace-nowrap">Kỳ hóa đơn:</span>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs bg-white focus:outline-emerald-600"
            >
              <option value="all">Tất cả các kỳ</option>
              <option value="2026-10-01">Kỳ 10/2026</option>
              <option value="2026-09-01">Kỳ 09/2026</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo mã hóa đơn (INV-...), số phòng, tên cư dân..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-emerald-600"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Mã hóa đơn</th>
                <th className="px-4 py-3.5">Phòng / Tòa nhà</th>
                <th className="px-4 py-3.5">Cư dân</th>
                <th className="px-4 py-3.5">Kỳ / Loại</th>
                <th className="px-4 py-3.5 text-right">Tổng tiền</th>
                <th className="px-4 py-3.5 text-right">Còn lại</th>
                <th className="px-4 py-3.5">Hạn thanh toán</th>
                <th className="px-4 py-3.5 text-center">Trạng thái</th>
                <th className="px-4 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-stone-500">
                    Không có hóa đơn nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const remaining = inv.remainingAmount;

                  return (
                    <tr key={inv.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link 
                          to={`/admin/invoices/${inv.id}`}
                          className="font-bold text-stone-800 hover:text-emerald-700 flex items-center gap-1.5"
                        >
                          <FileText className="w-4 h-4 text-emerald-600" />
                          {inv.code || 'Bản nháp'}
                        </Link>
                        <div className="text-xs text-stone-400">
                          {inv.issueDate ? `Phát hành: ${formatDate(inv.issueDate)}` : 'Chưa phát hành'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-stone-800">P.{inv.roomCode}</span>
                        <div className="text-xs text-stone-500">{inv.buildingName}</div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-stone-800">{inv.residentName}</div>
                        <div className="text-xs text-stone-500">{inv.residentPhone}</div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-semibold text-stone-700">
                          Tháng {inv.period.substring(5, 7)}/{inv.period.substring(0, 4)}
                        </div>
                        <span className="text-[11px] text-stone-500">
                          {getInvoiceTypeLabel(inv.type)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-stone-800 whitespace-nowrap">
                        {inv.totalAmount.toLocaleString('vi-VN')} đ
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className={`font-mono font-bold ${
                          remaining > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {remaining.toLocaleString('vi-VN')} đ
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-stone-600">
                        {formatDate(inv.dueDate)}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {getStatusBadge(inv)}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Link to={`/admin/invoices/${inv.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1 text-emerald-700 hover:bg-emerald-50">
                            <Eye className="w-4 h-4" />
                            Xem
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
