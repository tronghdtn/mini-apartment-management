import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { isAxiosError } from 'axios'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate, formatDateTime } from '@/lib/format'
import { getUser } from '@/features/user-management/api'
import { ActiveContractInfo } from '@/features/user-management/ActiveContractInfo'
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
  return (
    <div className="space-y-6">
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link to="/admin/users" className="hover:text-slate-900">Người dùng</Link><ChevronRight className="w-3.5 h-3.5 text-slate-400" /><span className="font-bold text-slate-900 break-words">{user.full_name}</span></nav>
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xl">{Array.from(user.full_name)[0]}</div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-slate-900 break-words">{user.full_name}</h1><Badge tone={user.status === 'active' ? 'emerald' : 'rose'} dot>{user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</Badge></div>
            <p className="text-xs text-slate-500 break-words">{user.email ?? 'Chưa có email'} · {user.phone}</p>
            <Badge tone={user.role === 'admin' ? 'purple' : user.role === 'resident' ? 'emerald' : 'sky'}>{managedUserRoleLabels[user.role]}</Badge>
            <div className="mt-3"><UserStatusAction user={user} onChanged={updated => {
              setSuccess(updated.status === 'locked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.')
              setLoading(true)
              setRevision(value => value + 1)
            }} /></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-base text-slate-900">Hồ Sơ Cá Nhân</h2><Button type="button" size="sm" variant="outline" onClick={() => { setSuccess(''); setEditingName(true) }}>Sửa họ tên</Button></div>
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
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
          <h2 className="font-bold text-base text-slate-900">Tình trạng thuê hiện tại</h2>
          <ActiveContractInfo user={user} />
          <p className="text-xs text-slate-500">Vai trò cư dân được giữ để xem lịch sử sau thanh lý. Đang thuê được xác định từ hợp đồng đang hiệu lực.</p>
        </section>
      </div>
      <section className="bg-sky-50 rounded-3xl border border-sky-100 p-6 text-sm text-sky-800 space-y-2">
        <p>Chỉ cho cập nhật họ tên. SĐT, email, mật khẩu, vai trò và dữ liệu pháp lý chưa mở chỉnh sửa tại đây.</p>
        <p>Lịch sử hợp đồng, hóa đơn, công nợ và sửa chữa của tài khoản chưa được tích hợp.</p>
      </section>
      <Modal isOpen={editingName} onClose={closeName} title="Sửa họ tên">
        <UserNameForm user={user} onCancel={closeName} onBusyChange={busy => { savingName.current = busy }} onSaved={updated => {
          setEditingName(false)
          setSuccess('Đã cập nhật họ tên.')
          setLoading(true)
          setRevision(value => value + 1)
          if (updated.id === auth.user?.id) void auth.refresh()
        }} />
      </Modal>
    </div>
  )
}
