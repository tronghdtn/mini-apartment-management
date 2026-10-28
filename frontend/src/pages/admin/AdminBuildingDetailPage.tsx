import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { isAxiosError } from 'axios'
import { ChevronRight, MapPin, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { BuildingRoomMatrix } from '@/features/room-management/BuildingRoomMatrix'
import { BuildingUtilityPricesPanel } from '@/features/utility-prices/BuildingUtilityPricesPanel'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getBuilding } from '@/features/buildings/api'
import { BuildingForm } from '@/features/buildings/BuildingForm'
import { AmenityAssignmentPanel } from '@/features/amenity-assignment/AmenityAssignmentPanel'
import type { Building } from '@/features/buildings/types'

export function AdminBuildingDetailPage() {
  const { refresh } = useAuth()
  const { buildingId } = useParams<{ buildingId: string }>()
  const [building, setBuilding] = useState<Building | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolvedId, setResolvedId] = useState<string>()
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<'matrix' | 'utility' | 'info'>('matrix')
  useEffect(() => {
    const controller = new AbortController()
    getBuilding(buildingId ?? '', controller.signal)
      .then(data => { if (!controller.signal.aborted) { setBuilding(data); setNotFound(false); setError(''); setResolvedId(buildingId) } })
      .catch(failure => { if (!controller.signal.aborted) { setBuilding(null); setResolvedId(buildingId); setNotFound(isAxiosError(failure) && failure.response?.status === 404); setError(apiErrorMessage(failure)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [buildingId, revision])
  const close = () => { if (!saving) setEditing(false) }
  if (loading || resolvedId !== buildingId) return <p role="status" className="text-sm text-slate-500 py-6">Đang tải thông tin tòa nhà…</p>
  if (error || !building) return <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4"><h1 className="text-xl font-bold text-slate-900">{notFound ? 'Không tìm thấy tòa nhà' : 'Chưa tải được tòa nhà'}</h1><p role="alert" className="text-sm text-rose-700">{notFound ? 'Tòa nhà không tồn tại hoặc không còn khả dụng.' : error}</p><div className="flex flex-wrap items-center gap-3">{!notFound && <Button variant="outline" onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1) }}>Thử lại</Button>}<Link to="/admin/buildings" className="text-sm text-sky-700 underline">Về danh sách tòa nhà</Link><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div></div>
  return <div className="space-y-6">
    <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link to="/admin/buildings" className="hover:text-slate-900">Tòa nhà</Link><ChevronRight className="w-3.5 h-3.5 text-slate-400" /><span className="font-bold text-slate-900 break-words">{building.name}</span></nav>
    {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 mb-2"><Badge tone={building.status === 'active' ? 'emerald' : 'slate'} dot>{building.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Badge><span className="text-xs text-slate-400">Mã cơ sở: #{building.id}</span></div><h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 break-words">{building.name}</h1><p className="text-xs sm:text-sm text-slate-500 flex items-start gap-1.5 mt-1"><MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" /><span className="break-words">{building.address}</span></p></div>
      <Button variant="outline" icon={<Pencil className="w-4 h-4" />} onClick={() => { setSuccess(''); setEditing(true) }}>Sửa thông tin</Button>
    </div>
    <Tabs tabs={[{ id: 'matrix', label: 'Sơ đồ phòng theo tầng' }, { id: 'utility', label: 'Biểu giá điện nước' }, { id: 'info', label: 'Thông tin tòa nhà' }]} activeTab={tab} onChange={setTab} />
    <div hidden={tab !== 'matrix'}><BuildingRoomMatrix key={building.id} buildingId={building.id} totalFloors={building.total_floors} /></div>
    {tab === 'info' && <><section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5"><h2 className="font-bold text-base text-slate-900">Thông tin tòa nhà</h2><dl className="grid sm:grid-cols-2 gap-5 text-sm"><div><dt className="text-slate-500 text-xs">Số tầng</dt><dd className="mt-1 font-semibold text-slate-900">{building.total_floors}</dd></div><div><dt className="text-slate-500 text-xs">Tọa độ (vĩ độ, kinh độ)</dt><dd className="mt-1 text-slate-900 break-words">{building.latitude ?? 'Chưa có vĩ độ'}, {building.longitude ?? 'chưa có kinh độ'}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500 text-xs">Mô tả</dt><dd className="mt-1 text-slate-900 whitespace-pre-wrap break-words">{building.description || 'Chưa có mô tả.'}</dd></div></dl></section><AmenityAssignmentPanel key={building.id} targetType="buildings" targetId={building.id} archivedVisibility="show" /></>}
    {tab === 'utility' && <BuildingUtilityPricesPanel key={building.id} buildingId={building.id} onAuthFailure={refresh} />}
    <Modal isOpen={editing} onClose={close} title="Sửa thông tin tòa nhà" maxWidth="lg"><BuildingForm key={building.id} building={building} onCancel={close} onBusyChange={setSaving} onSaved={updated => { setBuilding(updated); setEditing(false); setSuccess('Đã lưu thông tin tòa nhà.') }} /></Modal>
  </div>
}
