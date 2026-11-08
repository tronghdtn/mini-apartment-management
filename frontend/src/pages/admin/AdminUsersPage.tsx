import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, FilePlus2, FileText, Plus, RotateCcw, Search, UserCheck, Users, X } from 'lucide-react'
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { getUsers } from '@/features/user-management/api'
import { ActiveContractInfo } from '@/features/user-management/ActiveContractInfo'
import { StaffUserForm } from '@/features/user-management/StaffUserForm'
import { userFiltersSchema } from '@/features/user-management/schemas'
import type { UserFilters } from '@/features/user-management/schemas'
import { managedUserRoleLabels } from '@/features/user-management/types'
import type { ManagedUserRole, UserPage } from '@/features/user-management/types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'

const emptyFilters: UserFilters = { role: '', status: '', has_active_contract: '', q: '' }
const residentFilters: UserFilters = { ...emptyFilters, role: 'resident' }

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AdminUsersPage({ residentsOnly = false }: { residentsOnly?: boolean }) {
  const navigate = useNavigate()
  const baseFilters = residentsOnly ? residentFilters : emptyFilters
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<UserFilters>(baseFilters)
  const [searchInput, setSearchInput] = useState(filters.q ?? '')
  const [result, setResult] = useState<UserPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setLoadError] = useState('')
  const [revision, setRevision] = useState(0)
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState('')
  const savingStaff = useRef(false)
  const searchId = useId()
  const roleId = useId()
  const statusId = useId()
  const contractId = useId()

  // Debounced search input sync
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      setFilters(prev => {
        if (prev.q === trimmed) return prev
        setPage(1)
        setLoading(true)
        return { ...prev, q: trimmed }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()
    getUsers(page, filters, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => {
        if (!controller.signal.aborted) {
          setLoadError(apiErrorMessage(failure))
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, filters, revision])

  const reload = () => { setLoading(true); setLoadError(''); setRevision(value => value + 1) }
  const changePage = (next: number) => { setLoading(true); setLoadError(''); setPage(next) }

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    const nextFilters = { ...filters, [key]: value }
    const validated = userFiltersSchema.safeParse(nextFilters)
    if (validated.success) {
      setFilters(validated.data)
      setPage(1)
      setLoading(true)
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setFilters({ ...baseFilters })
    setPage(1)
    setLoading(true)
  }

  const closeStaffModal = () => { if (!savingStaff.current) setCreating(false) }

  const hasActiveFilters = Boolean(
    filters.q ||
    (!residentsOnly && filters.role) ||
    filters.status ||
    filters.has_active_contract
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
              {residentsOnly ? 'Quản lý cho thuê' : 'Hệ thống'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-slate-500">
              {residentsOnly ? 'Danh bạ cư dân' : 'Quản trị tài khoản & vai trò'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {residentsOnly ? 'Quản Lý Cư Dân' : 'Tài Khoản & Phân Quyền'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {residentsOnly
              ? 'Tài khoản vai trò Cư dân trong hệ thống, bao gồm cả lịch sử thuê sau khi bàn giao phòng.'
              : 'Xem hồ sơ tài khoản, tình trạng thuê thực tế và cấp mới tài khoản cho Kỹ thuật viên / Bảo vệ.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {residentsOnly ? (
            <Link to="/admin/users">
              <Button variant="outline" size="md" className="text-xs font-semibold">
                Quản lý tất cả tài khoản
              </Button>
            </Link>
          ) : (
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => { setSuccess(''); setCreating(true) }}
              className="shadow-xs font-bold"
            >
              Tạo tài khoản nhân viên
            </Button>
          )}
        </div>
      </div>

      {success && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 flex items-center justify-between gap-3">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">Đóng</button>
        </div>
      )}

      {/* Modern Filter Toolbar with Instant Live Filtering */}
      <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Instant Search Bar */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor={searchId} className="sr-only">Tìm tài khoản</label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id={searchId}
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm theo họ tên, SĐT, email..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                title="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instant Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!residentsOnly && (
              <div>
                <label htmlFor={roleId} className="sr-only">Vai trò</label>
                <select
                  id={roleId}
                  value={filters.role}
                  onChange={e => handleFilterChange('role', e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition cursor-pointer"
                  title="Lọc theo vai trò tài khoản"
                >
                  <option value="">Tất cả vai trò</option>
                  {(Object.keys(managedUserRoleLabels) as ManagedUserRole[]).map(role => (
                    <option key={role} value={role}>{managedUserRoleLabels[role]}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor={statusId} className="sr-only">Trạng thái</label>
              <select
                id={statusId}
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition cursor-pointer"
                title="Lọc theo trạng thái hoạt động"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Đã bị khóa</option>
              </select>
            </div>

            <div>
              <label htmlFor={contractId} className="sr-only">Tình trạng thuê</label>
              <select
                id={contractId}
                value={filters.has_active_contract}
                onChange={e => handleFilterChange('has_active_contract', e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition cursor-pointer"
                title="Lọc theo tình trạng thuê phòng"
              >
                <option value="">Tất cả hợp đồng</option>
                <option value="1">Đang thuê phòng</option>
                <option value="0">Không đang thuê</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table / Content Area */}
      {loading && !result ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent" />
          <p role="status" className="text-xs text-slate-500 mt-3 font-medium">Đang tải danh sách tài khoản…</p>
        </div>
      ) : error && !loading ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={reload}>Thử lại</Button>
            <a href="/login" className="text-xs text-sky-700 underline font-semibold">Đăng nhập</a>
          </div>
        </div>
      ) : result && (
        <RefreshingFrame busy={loading} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500 whitespace-nowrap">
                  <tr>
                    <th className="px-5 py-3 font-medium">Họ và tên</th>
                    <th className="px-5 py-3 font-medium">Liên hệ</th>
                    <th className="px-5 py-3 font-medium">Vai trò</th>
                    <th className="px-5 py-3 font-medium">Tình trạng thuê</th>
                    <th className="px-5 py-3 font-medium">Trạng thái</th>
                    <th className="px-5 py-3 font-medium">Ngày tham gia</th>
                    <th className="px-5 py-3" aria-label="Thao tác"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-14 text-center">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">Không tìm thấy tài khoản phù hợp</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {hasActiveFilters
                            ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm Xóa lọc để xem tất cả.'
                            : 'Chưa có tài khoản nào trong hệ thống.'}
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Xóa bộ lọc
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    result.data.map(user => {
                      const canCreateContract =
                        user.status === 'active' &&
                        (user.role === 'user' || (user.role === 'resident' && !user.active_contract))

                      return (
                        <tr
                          key={user.id}
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          className="group hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                                {getInitials(user.full_name)}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  to={`/admin/users/${user.id}`}
                                  onClick={e => e.stopPropagation()}
                                  className="font-semibold text-slate-900 hover:text-sky-700 block truncate transition-colors"
                                >
                                  {user.full_name}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-slate-800 block tabular-nums">{user.phone}</span>
                            <span className="text-xs text-slate-500 block">{user.email ?? 'Chưa có email'}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="whitespace-nowrap text-slate-700">{managedUserRoleLabels[user.role]}</span>
                          </td>
                          <td className="px-5 py-4">
                            {user.role === 'admin' || user.role === 'technician' || user.role === 'guard' ? <span className="text-slate-300" aria-label="Không áp dụng">—</span> : <ActiveContractInfo user={user} />}
                          </td>
                          <td className="px-5 py-4">
                            {user.status === 'active'
                              ? <span className="whitespace-nowrap text-xs text-slate-600">Hoạt động</span>
                              : <Badge size="sm" tone="rose" dot>Đã khóa</Badge>}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                            {user.created_at === null ? 'Chưa có thông tin' : formatDateTime(user.created_at)}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            {(() => {
                              const menuItems: RowMenuItem[] = [
                                ...(canCreateContract ? [{ label: 'Lập hợp đồng', icon: <FilePlus2 className="h-4 w-4 text-slate-400" aria-hidden="true" />, to: `/admin/contracts/new?user_id=${user.id}` }] : []),
                                ...(user.role === 'resident' || user.role === 'user' ? [{ label: 'Xem hợp đồng', icon: <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />, to: `/admin/contracts?user_id=${user.id}` }] : []),
                              ]
                              return menuItems.length
                                ? <RowMenu label={`Thao tác khác với tài khoản ${user.full_name}`} items={menuItems} />
                                : <ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-slate-500" aria-hidden="true" />
                            })()}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <nav aria-label="Phân trang tài khoản" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
            <p className="font-medium">
              Trang <strong className="text-slate-700">{result.meta.current_page}</strong> / {result.meta.last_page} · Tổng cộng <strong className="text-slate-700">{result.meta.total}</strong> tài khoản
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
                className="text-xs"
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= result.meta.last_page}
                onClick={() => changePage(page + 1)}
                className="text-xs"
              >
                Trang sau
              </Button>
            </div>
          </nav>
        </RefreshingFrame>
      )}

      <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-4 text-xs text-sky-900 flex items-start gap-2.5">
        <UserCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Hướng dẫn chuyển Khách đã đăng ký thành Cư dân:</p>
          <p className="text-sky-800">
            Bấm nút <strong>⋯</strong> trên dòng tài khoản của khách → <strong>Lập hợp đồng</strong> (hoặc vào Chi tiết tài khoản) → Chọn phòng trống và <strong>Kích hoạt hợp đồng</strong>. Hệ thống sẽ tự động nâng cấp tài khoản từ <em>Khách đã đăng ký</em> lên <em>Cư dân</em> và gắn phòng thuê cho khách.
          </p>
        </div>
      </div>

      {/* Staff User Creation Modal */}
      <Modal isOpen={creating} onClose={closeStaffModal} title="Tạo tài khoản nhân viên" maxWidth="lg">
        <StaffUserForm
          onCancel={closeStaffModal}
          onBusyChange={busy => { savingStaff.current = busy }}
          onCreated={user => {
            setCreating(false)
            setSuccess(`Đã tạo tài khoản ${managedUserRoleLabels[user.role]} cho ${user.full_name}.`)
            setPage(1)
            reload()
          }}
        />
      </Modal>
    </div>
  )
}
