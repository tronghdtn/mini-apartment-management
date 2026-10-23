import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Building2, MapPin, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getBuildings } from '@/features/buildings/api'
import { BuildingForm } from '@/features/buildings/BuildingForm'
import type { BuildingPage } from '@/features/buildings/types'

export function AdminBuildingsPage() {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<BuildingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getBuildings(page, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, revision])
  const reload = () => { setLoading(true); setError(''); setRevision(value => value + 1) }
  const changePage = (next: number) => { setLoading(true); setError(''); setPage(next) }
  const close = () => { if (!saving) setIsModalOpen(false) }
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div><h1 className="text-2xl font-bold text-slate-900">Danh Sách Tòa Nhà</h1><p className="text-xs text-slate-500 mt-1">Quản lý thông tin tòa nhà trong hệ thống.</p></div>
      <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setSuccess(''); setIsModalOpen(true) }}>Thêm tòa nhà mới</Button>
    </div>
    {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    {loading ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải danh sách tòa nhà…</p> : error ? <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3"><p className="text-sm text-rose-700">{error}</p><div className="flex items-center gap-3"><Button variant="outline" onClick={reload}>Thử lại</Button><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div></div> : result && <>
      {result.data.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">Chưa có tòa nhà nào.</div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {result.data.map(building => <article key={building.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="h-28 px-6 flex items-center justify-between bg-gradient-to-br from-sky-50 to-teal-50"><Building2 className="w-10 h-10 text-sky-600" /><Badge tone={building.status === 'active' ? 'emerald' : 'slate'} dot>{building.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}</Badge></div>
          <div className="p-6 space-y-3 flex-1"><h2 className="font-bold text-base text-slate-900 break-words">{building.name}</h2><p className="text-xs text-slate-500 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" /><span className="break-words">{building.address}</span></p><p className="text-sm font-semibold text-slate-700">{building.total_floors} tầng</p>{building.description && <p className="text-xs text-slate-500 line-clamp-2 break-words">{building.description}</p>}</div>
          <Link to={`/admin/buildings/${building.id}`} className="mx-6 mb-6 px-3 py-2 border border-slate-300 rounded-xl text-center text-xs font-semibold text-slate-700 hover:bg-slate-50">Xem chi tiết</Link>
        </article>)}
      </div>}
      <nav aria-label="Phân trang tòa nhà" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} tòa nhà</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</Button><Button variant="outline" size="sm" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)}>Trang sau</Button></div></nav>
    </>}
    <Modal isOpen={isModalOpen} onClose={close} title="Thêm tòa nhà mới" maxWidth="lg"><BuildingForm onCancel={close} onBusyChange={setSaving} onSaved={building => { setIsModalOpen(false); setSuccess(`Đã tạo tòa nhà ${building.name}.`); setPage(1); reload() }} /></Modal>
  </div>
}
