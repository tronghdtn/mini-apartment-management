import React, { useState } from 'react';
import { 
  Zap, Droplets, Plus, Search} from 'lucide-react';
import { useApp } from '@/mocks/AppContext'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { MeterReading } from '@/mocks/types'
import { buildings, servicesList } from '@/mocks/data'
import { formatDate } from '@/lib/format'

type MeteredCode = MeterReading['serviceCode'];

export const AdminMeterReadingsPage: React.FC = () => {
  const { meterReadings, rooms, contracts, addMeterReading, showToast } = useApp();

  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-09-01');

  // Modal create reading state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newServiceId, setNewServiceId] = useState<MeteredCode>('ELECTRICITY');
  const [newPeriod, setNewPeriod] = useState('2026-10-01');
  const [newReadingDate, setNewReadingDate] = useState('2026-10-31');
  const [newOldIndex, setNewOldIndex] = useState<number>(0);
  const [newNewIndex, setNewNewIndex] = useState<number>(0);

  // Metered services only (ELECTRICITY, WATER)
  const meteredServices = servicesList.filter(s => s.type === 'metered');

  // Filtered readings list
  const filteredReadings = meterReadings.filter(r => {
    const room = rooms.find(rm => rm.id === r.roomId);

    if (selectedBuilding !== 'all' && String(room?.buildingId) !== selectedBuilding) return false;
    if (selectedService !== 'all' && r.serviceCode !== selectedService) return false;
    if (selectedPeriod !== 'all' && r.period !== selectedPeriod) return false;

    if (searchTerm) {
      const matchRoom = r.roomCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBld = r.buildingName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchRoom && !matchBld) return false;
    }

    return true;
  });

  const latestReadingOf = (roomId: number, code: MeteredCode) =>
    meterReadings
      .filter(m => m.roomId === roomId && m.serviceCode === code)
      .sort((a, b) => b.readingDate.localeCompare(a.readingDate))[0];

  const handleOpenCreateModal = () => {
    if (rooms.length > 0) {
      setNewRoomId(String(rooms[0].id));
      // Auto fetch last reading for this room & default service
      const lastReading = latestReadingOf(rooms[0].id, newServiceId);
      const oldVal = lastReading ? lastReading.newReading : 0;
      setNewOldIndex(oldVal);
      setNewNewIndex(oldVal + 10);
    }
    setIsModalOpen(true);
  };

  const handleRoomChangeInModal = (roomId: string) => {
    setNewRoomId(roomId);
    const lastReading = latestReadingOf(Number(roomId), newServiceId);
    const oldVal = lastReading ? lastReading.newReading : 0;
    setNewOldIndex(oldVal);
    setNewNewIndex(oldVal + 10);
  };

  const handleServiceChangeInModal = (code: MeteredCode) => {
    setNewServiceId(code);
    const lastReading = latestReadingOf(Number(newRoomId), code);
    const oldVal = lastReading ? lastReading.newReading : 0;
    setNewOldIndex(oldVal);
    setNewNewIndex(oldVal + 10);
  };

  const handleSaveReading = () => {
    if (newNewIndex < newOldIndex) {
      showToast('Chỉ số mới không được nhỏ hơn chỉ số cũ!', undefined, 'error');
      return;
    }

    const room = rooms.find(rm => rm.id === Number(newRoomId));
    const service = meteredServices.find(s => s.code === newServiceId);
    if (!room || !service) return;

    // Prototype: lưu vào AppContext. Hợp đồng áp dụng do backend xác định theo
    // khoảng tiêu thụ (DB-D15) — ở đây chỉ hiển thị hợp đồng hiện tại của phòng.
    addMeterReading({
      roomId: room.id,
      roomCode: room.code,
      buildingName: room.buildingName,
      serviceId: service.id,
      serviceCode: newServiceId,
      serviceName: service.name,
      period: newPeriod,
      readingDate: newReadingDate,
      oldReading: newOldIndex,
      newReading: newNewIndex,
      consumption: newNewIndex - newOldIndex,
      unitPrice: service.price,
      kind: 'periodic',
      contractId: room.currentContractId ?? null,
      invoiceId: null,
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            Chỉ số điện nước định kỳ
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Ghi nhận và đối soát chỉ số điện, nước theo phòng và kỳ tiêu thụ (DB-D15)
          </p>
        </div>

        <Button 
          variant="primary" 
          onClick={handleOpenCreateModal}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Ghi chỉ số mới
        </Button>
      </div>

      {/* Filter and stats bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Period selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Kỳ tiêu thụ (Period)
            </label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-emerald-600"
            >
              <option value="all">Tất cả các kỳ</option>
              <option value="2026-10-01">Tháng 10/2026 (Mới nhất)</option>
              <option value="2026-09-01">Tháng 09/2026</option>
              <option value="2026-08-01">Tháng 08/2026</option>
            </select>
          </div>

          {/* Building filter */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Tòa nhà
            </label>
            <select
              value={selectedBuilding}
              onChange={e => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-emerald-600"
            >
              <option value="all">Tất cả các tòa nhà</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Service filter */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Loại dịch vụ
            </label>
            <select
              value={selectedService}
              onChange={e => setSelectedService(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-emerald-600"
            >
              <option value="all">Tất cả dịch vụ đo lường</option>
              <option value="ELECTRICITY">Điện sinh hoạt</option>
              <option value="WATER">Nước sinh hoạt</option>
            </select>
          </div>

          {/* Search box */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Tìm theo số phòng
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Nhập 101, 202..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-emerald-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Meter readings table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Kỳ / Ngày chốt</th>
                <th className="px-4 py-3.5">Phòng / Tòa nhà</th>
                <th className="px-4 py-3.5">Dịch vụ</th>
                <th className="px-4 py-3.5 text-right">Chỉ số cũ</th>
                <th className="px-4 py-3.5 text-right">Chỉ số mới</th>
                <th className="px-4 py-3.5 text-right">Tiêu thụ</th>
                <th className="px-4 py-3.5">Hợp đồng áp dụng</th>
                <th className="px-4 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredReadings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-500">
                    Không tìm thấy chỉ số điện nước phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredReadings.map(r => {
                  const isElec = r.serviceCode === 'ELECTRICITY';
                  const contract = contracts.find(c => c.id === r.contractId);

                  return (
                    <tr key={r.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-stone-800">
                          Tháng {r.period.substring(5, 7)}/{r.period.substring(0, 4)}
                        </div>
                        <div className="text-xs text-stone-500">
                          Chốt: {formatDate(r.readingDate)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-stone-800">P.{r.roomCode}</span>
                        <div className="text-xs text-stone-500">{r.buildingName}</div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          isElec ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {isElec ? <Zap className="w-3.5 h-3.5 text-amber-500" /> : <Droplets className="w-3.5 h-3.5 text-blue-500" />}
                          {isElec ? 'Điện (kWh)' : 'Nước (m³)'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-stone-600">
                        {r.oldReading.toLocaleString('vi-VN')}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-stone-800">
                        {r.newReading.toLocaleString('vi-VN')}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          +{r.consumption.toLocaleString('vi-VN')} {isElec ? 'kWh' : 'm³'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        {contract ? (
                          <span className="text-stone-700 font-medium">
                            {contract.code ?? 'Hợp đồng nháp'}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">Trống</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => showToast('Chức năng chỉnh sửa chỉ số chưa có trong prototype', undefined, 'info')}
                          className="text-stone-600 hover:text-emerald-700"
                        >
                          Sửa
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal record new reading */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ghi nhận chỉ số điện / nước mới"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Chọn phòng *</label>
              <select
                value={newRoomId}
                onChange={e => handleRoomChangeInModal(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-emerald-600"
              >
                {rooms.map(rm => (
                  <option key={rm.id} value={rm.id}>
                    P.{rm.code} - {rm.buildingName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Loại dịch vụ *</label>
              <select
                value={newServiceId}
                onChange={e => handleServiceChangeInModal(e.target.value as MeteredCode)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-emerald-600"
              >
                <option value="ELECTRICITY">Điện sinh hoạt (kWh)</option>
                <option value="WATER">Nước sinh hoạt (m³)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Kỳ tiêu thụ (Period) *</label>
              <input
                type="month"
                value={newPeriod.substring(0, 7)}
                onChange={e => setNewPeriod(`${e.target.value}-01`)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Ngày chốt số thực tế *</label>
              <input
                type="date"
                value={newReadingDate}
                onChange={e => setNewReadingDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Chỉ số cũ</label>
              <input
                type="number"
                value={newOldIndex}
                onChange={e => setNewOldIndex(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Chỉ số mới *</label>
              <input
                type="number"
                value={newNewIndex}
                onChange={e => setNewNewIndex(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-emerald-600 font-bold"
              />
            </div>

            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-stone-200 text-sm">
              <span className="text-stone-600 font-medium">Sản lượng tiêu thụ:</span>
              <span className="font-mono font-bold text-emerald-700 text-base">
                {Math.max(0, newNewIndex - newOldIndex).toLocaleString('vi-VN')} {newServiceId === 'ELECTRICITY' ? 'kWh' : 'm³'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button variant="primary" onClick={handleSaveReading} className="bg-emerald-600 hover:bg-emerald-700">
              Lưu chỉ số
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
