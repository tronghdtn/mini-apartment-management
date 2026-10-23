import { useEffect, useState } from 'react'
import { Archive, Info, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { archiveAmenity, getAmenities } from '@/features/amenities/api'
import { AmenityForm } from '@/features/amenities/AmenityForm'
import type { Amenity, AmenityPage } from '@/features/amenities/types'

export function AdminAmenitiesPage() {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<AmenityPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<Amenity | null | undefined>(undefined)
  const [archiving, setArchiving] = useState<Amenity | null>(null)
  const [archiveError, setArchiveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    let redirected = false
    getAmenities(page, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return
        if (page > data.meta.last_page) { redirected = true; setPage(data.meta.last_page) }
        else setResult(data)
      })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted && !redirected) setLoading(false) })
    return () => controller.abort()
  }, [page, revision])
  const reload = () => { setLoading(true); setError(''); setRevision(value => value + 1) }
  const changePage = (next: number) => { setLoading(true); setError(''); setPage(next) }
  const closeEdit = () => { if (!saving) setEditing(undefined) }
  const closeArchive = () => { if (!saving) setArchiving(null) }
  const confirmArchive = async () => {
    if (!archiving || saving) return
    setSaving(true)
    setArchiveError('')
    try { await archiveAmenity(archiving.id); setArchiving(null); setSuccess(`Đã lưu trữ tiện nghi ${archiving.name}.`); reload() }
    catch (failure) { setArchiveError(apiErrorMessage(failure)) }
    finally { setSaving(false) }
  }
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200"><div><h1 className="text-2xl font-bold text-slate-900">Danh Mục Tiện Nghi</h1><p className="text-xs text-slate-500 mt-1">Quản lý tiện nghi dùng cho phòng và tòa nhà.</p></div><Button icon={<Plus className="w-4 h-4" />} onClick={() => { setSuccess(''); setEditing(null) }}>Thêm tiện nghi</Button></div>
    <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs text-sky-800"><Info className="w-4 h-4 shrink-0 mt-0.5" /><p>Tiện nghi mô tả cơ sở vật chất, không tự phát sinh tiền thu. Các khoản phí được quản lý riêng tại mục Dịch vụ.</p></div>
    {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    {loading ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải danh sách tiện nghi…</p> : error ? <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3"><p className="text-sm text-rose-700">{error}</p><div className="flex items-center gap-3"><Button variant="outline" onClick={reload}>Thử lại</Button><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div></div> : result && <>
      <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xs"><table className="w-full text-left text-xs"><thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase"><tr><th className="px-5 py-3.5">Tên tiện nghi</th><th className="px-5 py-3.5">Mô tả</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{result.data.length === 0 ? <tr><td colSpan={3} className="px-5 py-12 text-center text-slate-500">Chưa có tiện nghi nào.</td></tr> : result.data.map(item => <tr key={item.id} className="hover:bg-slate-50/80"><td className="px-5 py-4 font-bold text-slate-900 break-words">{item.name}</td><td className="px-5 py-4 text-slate-600 whitespace-pre-wrap break-words">{item.description || 'Chưa có mô tả.'}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => { setSuccess(''); setEditing(item) }}>Sửa</Button><Button variant="outline" size="sm" icon={<Archive className="w-3.5 h-3.5" />} onClick={() => { setSuccess(''); setArchiveError(''); setArchiving(item) }}>Lưu trữ</Button></div></td></tr>)}</tbody></table></div>
      <nav aria-label="Phân trang tiện nghi" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} tiện nghi</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</Button><Button variant="outline" size="sm" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)}>Trang sau</Button></div></nav>
    </>}
    <Modal isOpen={editing !== undefined} onClose={closeEdit} title={editing ? 'Sửa tiện nghi' : 'Thêm tiện nghi mới'} maxWidth="md"><AmenityForm key={editing?.id ?? 'new'} amenity={editing ?? undefined} onCancel={closeEdit} onBusyChange={setSaving} onSaved={amenity => { setEditing(undefined); setSuccess(`Đã lưu tiện nghi ${amenity.name}.`); reload() }} /></Modal>
    <Modal isOpen={archiving !== null} onClose={closeArchive} title="Lưu trữ tiện nghi" maxWidth="md"><div className="space-y-4"><p className="text-sm text-slate-700">Lưu trữ <strong>{archiving?.name}</strong>? Tiện nghi sẽ ẩn khỏi danh mục; dữ liệu và liên kết hiện có được giữ lại.</p>{archiveError && <p role="alert" className="text-sm text-rose-600">{archiveError}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={closeArchive}>Hủy</Button><Button isLoading={saving} onClick={confirmArchive}>Xác nhận lưu trữ</Button></div></div></Modal>
  </div>
}
