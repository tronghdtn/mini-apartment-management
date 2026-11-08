import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { isAxiosError } from 'axios'
import { ChevronRight, DoorOpen, FilePlus2, FileText, Pencil, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate, formatDateTime } from '@/lib/format'
import { getUser } from '@/features/user-management/api'
import { ActiveContractInfo } from '@/features/user-management/ActiveContractInfo'
import { UserContractsPanel } from '@/features/user-management/UserContractsPanel'
import { UserDebtSummaryCard } from '@/features/user-management/UserDebtSummaryCard'
import { PersonMaintenancePanel } from '@/features/maintenance-requests/PersonMaintenancePanel'
import { UserStatusAction } from '@/features/user-management/UserStatusAction'
import { UserNameForm } from '@/features/user-management/UserNameForm'
import { managedUserGenderLabel, managedUserRoleLabels } from '@/features/user-management/types'
import type { UserDetail } from '@/features/user-management/types'

export function AdminUserDetailPage() {
  const auth = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [resolvedId, setResolvedId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [revision, setRevision] = useState(0)
  const [success, setSuccess] = useState('')
  const [editingName, setEditingName] = useState(false)
  const savingName = useRef(false)
  const closeName = () => { if (!savingName.current) setEditingName(false) }

  useEffect(() => {
    const controller = new AbortController()
    getUser(userId ?? '', controller.signal)
      .then(data => { if (!controller.signal.aborted) { setUser(data); setNotFound(false); setError(''); setResolvedId(userId) } })
      .catch(failure => { if (!controller.signal.aborted) { setUser(null); setResolvedId(userId); setNotFound(isAxiosError(failure) && failure.response?.status === 404); setError(apiErrorMessage(failure)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [userId, revision])

  if (loading || resolvedId !== userId) return <p role="status" className="text-sm text-slate-500 py-6">Đang tải hồ sơ tài khoản…</p>
  if (error || !user) return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{notFound ? 'Không tìm thấy tài khoản' : 'Chưa tải được hồ sơ tài khoản'}</h1>
      <p role="alert" className="text-sm text-rose-700">{notFound ? 'Tài khoản không tồn tại hoặc không còn khả dụng.' : error}</p>
      <div className="flex flex-wrap items-center gap-3">
        {!notFound && <Button variant="outline" onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1) }}>Thử lại</Button>}
        <Link to="/admin/users" className="text-sm text-sky-700 underline">Về danh sách tài khoản</Link>
        <a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a>
      </div>
    </div>
  )

  const canCreateContract =
    user.status === 'active' &&
    (user.role === 'user' || (user.role === 'resident' && !user.active_contract))

  return (
    <div className="space-y-6">
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link to="/admin/users" className="hover:text-slate-900">Tài khoản & Phân quyền</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-slate-900 break-words">{user.full_name}</span>
      </nav>

      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xl">
            {Array.from(user.full_name)[0]}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 break-words">{user.full_name}</h1>
              <Badge tone={user.status === 'active' ? 'emerald' : 'rose'} dot>
                {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
              </Badge>
              <Badge tone={user.role === 'admin' ? 'purple' : user.role === 'resident' ? 'emerald' : 'sky'}>
                {managedUserRoleLabels[user.role]}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 break-words">{user.email ?? 'Chưa có email'} · {user.phone}</p>
            <div className="pt-1">
              <UserStatusAction
                user={user}
                onChanged={updated => {
                  setSuccess(updated.status === 'locked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.')
                  setLoading(true)
                  setRevision(value => value + 1)
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {canCreateContract && (
            <Link to={`/admin/contracts/new?user_id=${user.id}`}>
              <Button variant="primary" icon={<FilePlus2 className="w-4 h-4" />}>
                {user.role === 'user' ? 'Lập hợp đồng thuê (Chuyển thành Cư dân)' : 'Lập hợp đồng thuê phòng mới'}
              </Button>
            </Link>
          )}
          <Button type="button" variant="outline" icon={<Pencil className="w-4 h-4" />} onClick={() => { setSuccess(''); setEditingName(true) }}>
            Sửa họ tên
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-base text-slate-900">Hồ Sơ Cá Nhân</h2>
            <Button type="button" size="sm" variant="outline" onClick={() => { setSuccess(''); setEditingName(true) }}>
              Sửa họ tên
            </Button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
            <div><dt className="text-xs text-slate-500">Họ và tên</dt><dd className="font-semibold text-slate-800 mt-1 break-words">{user.full_name}</dd></div>
            <div><dt className="text-xs text-slate-500">Vai trò trong hệ thống</dt><dd className="font-semibold text-slate-800 mt-1">{managedUserRoleLabels[user.role]}</dd></div>
            <div><dt className="text-xs text-slate-500">Số điện thoại</dt><dd className="text-slate-800 mt-1">{user.phone}</dd></div>
            <div><dt className="text-xs text-slate-500">Email</dt><dd className="text-slate-800 mt-1 break-words">{user.email ?? 'Chưa có email'}</dd></div>
            <div><dt className="text-xs text-slate-500">Số Căn cước công dân (CCCD)</dt><dd className="font-mono text-slate-800 mt-1 break-words">{user.id_number ?? 'Chưa cập nhật'}</dd></div>
            <div><dt className="text-xs text-slate-500">Ngày sinh</dt><dd className="text-slate-800 mt-1">{user.date_of_birth === null ? 'Chưa cập nhật' : formatDate(user.date_of_birth)}</dd></div>
            <div><dt className="text-xs text-slate-500">Giới tính</dt><dd className="text-slate-800 mt-1">{managedUserGenderLabel(user.gender)}</dd></div>
            <div><dt className="text-xs text-slate-500">Ngày tham gia (giờ Việt Nam)</dt><dd className="text-slate-800 mt-1">{user.created_at === null ? 'Chưa có thông tin' : formatDateTime(user.created_at)}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Địa chỉ thường trú</dt><dd className="text-slate-800 mt-1 whitespace-pre-wrap break-words">{user.permanent_address ?? 'Chưa cập nhật'}</dd></div>
          </dl>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="font-bold text-base text-slate-900">Tình trạng thuê hiện tại</h2>
            <ActiveContractInfo user={user} />

            {user.active_contract && (
              <div className="pt-2 space-y-2 border-t border-slate-100">
                <Link
                  to={`/admin/contracts/${user.active_contract.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-xs font-semibold transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Xem chi tiết hợp đồng đang thuê</span>
                </Link>
                <Link
                  to={`/admin/rooms/${user.active_contract.room.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  <DoorOpen className="w-3.5 h-3.5 text-sky-600" />
                  <span>Xem Phòng {user.active_contract.room.code}</span>
                </Link>
              </div>
            )}

            {canCreateContract && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                <div className="flex items-start gap-2 text-xs text-emerald-900">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    {user.role === 'user'
                      ? 'Tài khoản này đang là Khách đã đăng ký. Để chuyển sang Cư dân chính thức, hãy lập và kích hoạt hợp đồng thuê phòng cho khách.'
                      : 'Cư dân này hiện không có hợp đồng đang hiệu lực. Bạn có thể lập hợp đồng thuê phòng mới bên dưới.'}
                  </p>
                </div>
                <Link
                  to={`/admin/contracts/new?user_id=${user.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>{user.role === 'user' ? 'Lập hợp đồng (Chuyển thành Cư dân)' : 'Lập hợp đồng thuê mới'}</span>
                </Link>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            Vai trò Cư dân được tự động gán khi kích hoạt hợp đồng và được giữ lại để tra cứu lịch sử hóa đơn sau khi thanh lý.
          </p>
        </section>
      </div>

      <UserContractsPanel key={user.id} userId={user.id} />
      {user.role === 'resident' && (
        <>
          <UserDebtSummaryCard key={`debt-${user.id}`} userId={user.id} />
          <PersonMaintenancePanel key={`requests-${user.id}`} filter="user_id" personId={user.id} title="Yêu cầu sửa chữa đã gửi" pageParam="requests_page" />
        </>
      )}
      {user.role === 'technician' && (
        <PersonMaintenancePanel key={`tasks-${user.id}`} filter="assigned_to" personId={user.id} title="Việc sửa chữa được giao" pageParam="tasks_page" />
      )}

      <Modal isOpen={editingName} onClose={closeName} title="Sửa họ tên">
        <UserNameForm
          user={user}
          onCancel={closeName}
          onBusyChange={busy => { savingName.current = busy }}
          onSaved={updated => {
            setEditingName(false)
            setSuccess('Đã cập nhật họ tên.')
            setLoading(true)
            setRevision(value => value + 1)
            if (updated.id === auth.user?.id) void auth.refresh()
          }}
        />
      </Modal>
    </div>
  )
}
