import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { getUsers } from '@/features/user-management/api'
import { ActiveContractInfo } from '@/features/user-management/ActiveContractInfo'
import { StaffUserForm } from '@/features/user-management/StaffUserForm'
import { userFiltersSchema } from '@/features/user-management/schemas'
import type { UserFilters } from '@/features/user-management/schemas'
import { managedUserRoleLabels } from '@/features/user-management/types'
import type { ManagedUserRole, UserPage } from '@/features/user-management/types'

const emptyFilters: UserFilters = { role: '', status: '', has_active_contract: '', q: '' }
const inputClass = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-sky-500'

export function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<UserFilters>(emptyFilters)
  const [result, setResult] = useState<UserPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setLoadError] = useState('')
  const [revision, setRevision] = useState(0)
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState('')
  const savingStaff = useRef(false)
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<UserFilters>({
    resolver: zodResolver(userFiltersSchema), defaultValues: emptyFilters,
  })

  useEffect(() => {
    const controller = new AbortController()
    getUsers(page, filters, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => {
        if (!controller.signal.aborted) {
          applyApiErrors(failure, setError, ['role', 'status', 'has_active_contract', 'q'])
          setLoadError(apiErrorMessage(failure))
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, filters, revision, setError])

  const reload = () => { setLoading(true); setLoadError(''); setRevision(value => value + 1) }
  const changePage = (next: number) => { setLoading(true); setLoadError(''); setPage(next) }
  const submit = handleSubmit(input => { setLoading(true); setLoadError(''); setPage(1); setFilters(input) })
  const closeStaffModal = () => { if (!savingStaff.current) setCreating(false) }
  const clearFilters = () => { reset(emptyFilters); setLoading(true); setLoadError(''); setPage(1); setFilters({ ...emptyFilters }) }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div><h1 className="text-2xl font-bold text-slate-900">Quản Lý Người Dùng & Cư Dân</h1><p className="text-xs text-slate-500 mt-1">Xem hồ sơ tài khoản và cấp mới Kỹ thuật viên/Bảo vệ. Đang thuê được xác định từ hợp đồng đang hiệu lực.</p></div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setSuccess(''); setCreating(true) }}>Tạo tài khoản nhân viên</Button>
      </div>
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      <form onSubmit={submit} noValidate className="p-4 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div>
          <label htmlFor="user-q" className="block text-xs font-semibold text-slate-600 mb-1">Tìm tài khoản</label>
          <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input id="user-q" {...register('q')} aria-invalid={!!errors.q} aria-describedby="user-q-error" placeholder="Tìm tên, SĐT, email" className={`${inputClass} pl-9`} /></div>
          <p id="user-q-error" className="text-xs text-rose-600 mt-1">{errors.q?.message}</p>
        </div>
        <div>
          <label htmlFor="user-role" className="block text-xs font-semibold text-slate-600 mb-1">Vai trò</label>
          <select id="user-role" {...register('role')} aria-invalid={!!errors.role} aria-describedby="user-role-error" className={inputClass}>
            <option value="">Tất cả vai trò</option>
            {(Object.keys(managedUserRoleLabels) as ManagedUserRole[]).map(role => <option key={role} value={role}>{managedUserRoleLabels[role]}</option>)}
          </select>
          <p id="user-role-error" className="text-xs text-rose-600 mt-1">{errors.role?.message}</p>
        </div>
        <div>
          <label htmlFor="user-status" className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
          <select id="user-status" {...register('status')} aria-invalid={!!errors.status} aria-describedby="user-status-error" className={inputClass}><option value="">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="locked">Đã khóa</option></select>
          <p id="user-status-error" className="text-xs text-rose-600 mt-1">{errors.status?.message}</p>
        </div>
        <div>
          <label htmlFor="user-has_active_contract" className="block text-xs font-semibold text-slate-600 mb-1">Tình trạng thuê</label>
          <select id="user-has_active_contract" {...register('has_active_contract')} aria-invalid={!!errors.has_active_contract} aria-describedby="user-has_active_contract-error" className={inputClass}><option value="">Tất cả tài khoản</option><option value="1">Đang thuê</option><option value="0">Không đang thuê</option></select>
          <p id="user-has_active_contract-error" className="text-xs text-rose-600 mt-1">{errors.has_active_contract?.message}</p>
        </div>
        <div className="sm:col-span-2 xl:col-span-4 flex flex-wrap gap-2"><Button type="submit">Tìm kiếm</Button><Button type="button" variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button></div>
      </form>
      {loading ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải danh sách tài khoản…</p> : error ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3"><p className="text-sm text-rose-700">{error}</p><div className="flex items-center gap-3"><Button variant="outline" onClick={reload}>Thử lại</Button><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div></div>
      ) : result && <>
        <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase"><tr><th className="px-5 py-3.5">Họ và tên</th><th className="px-5 py-3.5">Liên hệ</th><th className="px-5 py-3.5">Vai trò</th><th className="px-5 py-3.5">Tình trạng thuê</th><th className="px-5 py-3.5">Trạng thái</th><th className="px-5 py-3.5">Ngày tham gia</th><th className="px-5 py-3.5 text-right">Hồ sơ</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {result.data.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Không có tài khoản phù hợp.</td></tr> : result.data.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-bold text-slate-900"><Link to={`/admin/users/${user.id}`} className="hover:text-sky-600">{user.full_name}</Link></td>
                  <td className="px-5 py-4"><span className="font-semibold text-slate-800 block">{user.phone}</span><span className="text-xs text-slate-500">{user.email ?? 'Chưa có email'}</span></td>
                  <td className="px-5 py-4"><Badge tone={user.role === 'admin' ? 'purple' : user.role === 'resident' ? 'emerald' : 'sky'}>{managedUserRoleLabels[user.role]}</Badge></td>
                  <td className="px-5 py-4"><ActiveContractInfo user={user} /></td>
                  <td className="px-5 py-4"><Badge tone={user.status === 'active' ? 'emerald' : 'rose'} dot>{user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</Badge></td>
                  <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{user.created_at === null ? 'Chưa có thông tin' : formatDateTime(user.created_at)}</td>
                  <td className="px-5 py-4 text-right"><Link to={`/admin/users/${user.id}`} className="inline-block px-3 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Chi tiết</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav aria-label="Phân trang tài khoản" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} tài khoản</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</Button><Button variant="outline" size="sm" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)}>Trang sau</Button></div></nav>
      </>}
      <p className="text-xs text-slate-500">Mở chi tiết để sửa họ tên; khóa/mở khóa chỉ áp dụng tài khoản không phải Admin. Các thông tin hồ sơ khác chưa mở chỉnh sửa.</p>
      <Modal isOpen={creating} onClose={closeStaffModal} title="Tạo tài khoản nhân viên" maxWidth="lg">
        <StaffUserForm onCancel={closeStaffModal} onBusyChange={busy => { savingStaff.current = busy }} onCreated={user => {
          setCreating(false)
          setSuccess(`Đã tạo tài khoản ${managedUserRoleLabels[user.role]} cho ${user.full_name}.`)
          setPage(1)
          reload()
        }} />
      </Modal>
    </div>
  )
}
