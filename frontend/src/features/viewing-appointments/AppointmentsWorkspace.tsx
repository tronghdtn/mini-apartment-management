import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Building2, Calendar, Clock, DoorOpen, FilePlus2, RotateCcw, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { changeAppointment, getAppointments } from './api'
import { appointmentActionSchema, appointmentFiltersSchema, appointmentTimeSchema, vietnamAppointmentTime } from './schemas'
import type { AppointmentActionInput } from './schemas'
import { appointmentLabels } from './types'
import type { AppointmentPage, ViewingAppointment } from './types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'
import { RowMenu } from '@/components/ui/RowMenu'
import { useKeepPrevious } from '@/hooks/useKeepPrevious'

// Chờ = cam (cần làm), đã xác nhận = xanh dương (đã lên lịch), hoàn tất = xanh lá, đã hủy = xám (đã đóng, không phải lỗi).
const appointmentTones = { pending: 'amber', confirmed: 'sky', completed: 'emerald', cancelled: 'slate' } as const
const primaryActions = new Set(['confirm', 'complete', 'check-in', 'check-out'])

type Action = { item: ViewingAppointment; action: string; label: string }

export function AppointmentsWorkspace({ mode, roomId }: { mode: 'admin' | 'guard' | 'owner'; roomId?: number }) {
  const { refresh } = useAuth()
  const [params, setParams] = useSearchParams()
  const queryField = (name: string) => roomId === undefined ? name : `appointments_${name}`
  const status = params.get(queryField('status')) ?? 'all'
  const page = params.get(queryField('page')) ?? '1'
  const date = params.get(queryField('date')) ?? ''
  const Heading = roomId === undefined ? 'h1' : 'h2'
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<Action>()
  const key = `${status}:${page}:${date}:${retry}:${mode}:${roomId ?? 'all'}`
  const [result, setResult] = useState<{ key: string; data?: AppointmentPage; error?: string }>()
  const valid = appointmentFiltersSchema.safeParse({ status, page, date }).success

  useEffect(() => {
    if (!valid) return
    const abort = new AbortController()
    getAppointments({ status, page, date }, abort.signal, roomId)
      .then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(failure => {
        if (!abort.signal.aborted) {
          setResult({ key, error: apiErrorMessage(failure) })
          if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
        }
      })
    return () => abort.abort()
  }, [key, status, page, date, valid, refresh, roomId])

  const current = result?.key === key ? result : undefined
  const { value: shown, stale } = useKeepPrevious(current?.data ? current : undefined)

  function filter(name: string, value: string) {
    const next = new URLSearchParams(params)
    next.set(queryField(name), value)
    if (name !== 'page') next.delete(queryField('page'))
    setParams(next)
  }

  const isOwner = mode === 'owner'

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <header>
        <Heading className="text-2xl font-bold tracking-tight text-slate-900">
          {mode === 'guard'
            ? 'Đón khách xem phòng hôm nay'
            : mode === 'admin'
            ? 'Lịch xem phòng'
            : 'Lịch hẹn của tôi'}
        </Heading>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          {mode === 'guard'
            ? 'Các lịch đã xác nhận trong hôm nay. Check-in khi khách đến, check-out khi khách rời đi.'
            : mode === 'admin'
            ? 'Xác nhận, đổi giờ hoặc hủy lịch khách hẹn xem phòng.'
            : 'Theo dõi các lịch hẹn xem phòng bạn đã đăng ký. Ban quản lý sẽ liên hệ đón tiếp bạn.'}
        </p>
      </header>

      {roomId !== undefined && (
        <Link to="/admin/viewing-appointments" className="inline-block text-xs sm:text-sm font-semibold text-sky-700 hover:underline">
          ← Mở trang quản lý lịch xem phòng
        </Link>
      )}

      {/* Filter Tabs & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {mode !== 'guard' && (
          <nav className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto max-w-full" aria-label="Trạng thái lịch">
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(tab => (
              <button
                type="button"
                key={tab}
                disabled={!!selected}
                onClick={() => filter('status', tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  status === tab
                    ? 'bg-white text-sky-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'all' ? 'Tất cả' : appointmentLabels[tab]}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {mode === 'admin' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Ngày hẹn</span>
              <input
                type="date"
                value={date}
                onChange={event => filter('date', event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-sky-500"
              />
            </div>
          )}

          <button
            type="button"
            disabled={!!selected}
            onClick={() => setRetry(value => value + 1)}
            aria-label="Tải lại lịch hẹn"
            title="Tải lại"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-60 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {!valid || current?.error ? (
        <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-sm text-rose-800">
          <p>{!valid ? 'Bộ lọc lịch hẹn không hợp lệ.' : current?.error}</p>
          <Button
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(params)
              for (const name of ['status', 'page', 'date']) next.delete(queryField(name))
              setParams(next)
              setRetry(value => value + 1)
            }}
          >
            Đặt lại và thử lại
          </Button>
        </div>
      ) : !shown?.data ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent" />
          <p role="status" className="text-xs text-slate-500 mt-3 font-medium">Đang tải lịch hẹn…</p>
        </div>
      ) : (
        <RefreshingFrame busy={stale} className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Hiển thị <strong>{shown.data.meta.total}</strong> lịch hẹn</span>
          </div>

          {!shown.data.data.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Chưa có lịch hẹn nào phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isOwner
                  ? 'Bạn chưa có lịch hẹn xem phòng nào trong mục này. Hãy duyệt danh sách phòng và đặt lịch miễn phí nhé!'
                  : 'Không có dữ liệu lịch hẹn phù hợp với bộ lọc hiện tại.'}
              </p>
              {isOwner && (
                <Link to="/rooms" className="inline-block pt-2">
                  <Button size="sm">Tìm phòng và đặt lịch ngay</Button>
                </Link>
              )}
            </div>
          ) : isOwner ? (
            /* OWNER / GUEST CARD-BASED VIEW */
            <div className="space-y-4">
              {shown.data.data.map(item => (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 font-bold text-xs">
                        <DoorOpen className="w-3.5 h-3.5" />
                        Phòng {item.room.code}
                      </span>

                      <Badge
                        tone={appointmentTones[item.status]}
                        dot
                      >
                        {appointmentLabels[item.status]}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {item.room.building_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 mt-1.5">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Clock className="w-4 h-4 text-sky-600" />
                          {formatDateTime(item.preferred_at)}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          Người đăng ký: <strong className="text-slate-700 font-medium">{item.guest_name} ({item.guest_phone})</strong>
                        </span>
                      </div>
                    </div>

                    {item.admin_note && (
                      <div className="rounded-xl bg-sky-50/80 border border-sky-100 p-3 text-xs text-sky-900">
                        <span className="font-semibold block mb-0.5">Lời nhắn từ quản lý:</span>
                        {item.admin_note}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0 gap-3">
                    {item.can_cancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!selected}
                        onClick={() => setSelected({ item, action: 'cancel', label: 'Hủy lịch hẹn' })}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold"
                      >
                        Hủy lịch hẹn
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ADMIN & GUARD TABLE VIEW */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500 whitespace-nowrap">
                    <tr>
                      <th className="px-5 py-3 font-medium">Giờ hẹn</th>
                      <th className="px-5 py-3 font-medium">Khách</th>
                      <th className="px-5 py-3 font-medium">Phòng</th>
                      <th className="px-5 py-3 font-medium">Trạng thái</th>
                      {roomId === undefined && <th className="px-5 py-3 font-medium" aria-label="Thao tác"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {shown.data.data.map(item => (
                      <tr key={item.id} className="align-top hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 tabular-nums">{formatDateTime(item.preferred_at)}</span>
                          {item.checked_in_at && (
                            <span className="block text-xs text-slate-500 tabular-nums">Đến {formatDateTime(item.checked_in_at)}</span>
                          )}
                          {item.checked_out_at && (
                            <span className="block text-xs text-slate-400 tabular-nums">Rời {formatDateTime(item.checked_out_at)}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="whitespace-nowrap font-medium text-slate-900">{item.guest_name}</p>
                          <p className="text-xs text-slate-500 tabular-nums">{item.guest_phone}</p>
                        </td>
                        <td className="px-5 py-4">
                          {mode === 'admin' ? (
                            <Link to={`/admin/rooms/${item.room.id}`} className="whitespace-nowrap font-medium text-slate-900 hover:text-sky-700">
                              Phòng {item.room.code}
                            </Link>
                          ) : (
                            <span className="whitespace-nowrap font-medium text-slate-900">Phòng {item.room.code}</span>
                          )}
                          <span className="block max-w-56 truncate text-xs text-slate-500" title={item.room.building_name}>{item.room.building_name}</span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge tone={appointmentTones[item.status]} size="sm" dot>{appointmentLabels[item.status]}</Badge>
                        </td>
                        {roomId === undefined && (
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {actions(item, mode).filter(([action]) => primaryActions.has(action)).map(([action, label]) => (
                                <Button key={action} size="sm" disabled={!!selected} onClick={() => setSelected({ item, action, label })} aria-label={`${label} lịch hẹn của ${item.guest_name}`}>
                                  {label}
                                </Button>
                              ))}
                              <RowMenu
                                label={`Thao tác khác với lịch hẹn của ${item.guest_name}`}
                                disabled={!!selected}
                                items={[
                                  ...actions(item, mode).filter(([action]) => !primaryActions.has(action)).map(([action, label]) => ({
                                    label,
                                    tone: action === 'cancel' ? 'danger' as const : 'default' as const,
                                    icon: action === 'cancel' ? <XCircle className="h-4 w-4" aria-hidden="true" /> : <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />,
                                    onSelect: () => setSelected({ item, action, label }),
                                  })),
                                  ...(mode === 'admin' && item.status !== 'cancelled' ? [{ label: 'Lập hợp đồng cho phòng này', icon: <FilePlus2 className="h-4 w-4 text-slate-400" aria-hidden="true" />, to: `/admin/contracts/new?room_id=${item.room.id}` }] : []),
                                ]}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          <nav aria-label="Phân trang lịch hẹn" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-2">
            <p className="font-medium">
              Trang <strong className="text-slate-700">{shown.data.meta.current_page}</strong> / {shown.data.meta.last_page}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!!selected || Number(page) <= 1}
                onClick={() => filter('page', String(Number(page) - 1))}
                className="text-xs"
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!!selected || Number(page) >= shown.data.meta.last_page}
                onClick={() => filter('page', String(Number(page) + 1))}
                className="text-xs"
              >
                Trang sau
              </Button>
            </div>
          </nav>
        </RefreshingFrame>
      )}

      {selected && (
        <AppointmentAction
          key={`${selected.item.id}:${selected.action}`}
          selected={selected}
          close={() => setSelected(undefined)}
          done={() => {
            setSelected(undefined)
            setRetry(value => value + 1)
          }}
        />
      )}
    </div>
  )
}

function actions(item: ViewingAppointment, mode: string): [string, string][] {
  const result: [string, string][] = []
  if (mode === 'guard') {
    if (!item.checked_in_at) result.push(['check-in', 'Check-in'])
    else if (!item.checked_out_at) result.push(['check-out', 'Check-out'])
  } else {
    if (mode === 'admin') {
      if (item.status === 'pending') result.push(['confirm', 'Xác nhận'])
      if (['pending', 'confirmed'].includes(item.status) && !item.checked_in_at) result.push(['reschedule', 'Đổi giờ'])
      if (item.status === 'confirmed' && item.checked_out_at) result.push(['complete', 'Hoàn tất'])
    }
    if (item.can_cancel) result.push(['cancel', 'Hủy lịch'])
  }
  return result
}

function AppointmentAction({ selected, close, done }: { selected: Action; close: () => void; done: () => void }) {
  const { refresh } = useAuth()
  const flight = useRef(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<AppointmentActionInput>({
    resolver: zodResolver(appointmentActionSchema),
    defaultValues: { preferred_at: '', note: '' },
  })

  async function submit(input: AppointmentActionInput) {
    if (flight.current) return
    const data: Record<string, string> = {}
    if (selected.action === 'reschedule') {
      const parsed = appointmentTimeSchema.safeParse(input.preferred_at)
      if (!parsed.success) {
        setError('preferred_at', { message: parsed.error.issues[0].message })
        return
      }
      if (!input.note) {
        setError('note', { message: 'Nhập lý do đổi giờ.' })
        return
      }
      data.preferred_at = vietnamAppointmentTime(input.preferred_at)
    }
    if (['reschedule', 'confirm', 'complete'].includes(selected.action)) data.admin_note = input.note
    if (['check-in', 'check-out'].includes(selected.action)) data.guard_note = input.note
    flight.current = true
    try {
      await changeAppointment(selected.item.id, selected.action, data)
      done()
    } catch (failure) {
      applyApiErrors(failure, setError, ['preferred_at'])
      if (isAxiosError(failure) && failure.response?.status === 422) {
        const note = failure.response.data?.errors?.admin_note?.[0] ?? failure.response.data?.errors?.guard_note?.[0]
        if (typeof note === 'string') setError('note', { message: note })
      }
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
    } finally {
      flight.current = false
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!flight.current) close() }} title={`${selected.label} · ${selected.item.code}`}>
      <form onSubmit={event => { void handleSubmit(submit)(event) }} className="space-y-5">
        <p className="text-sm text-slate-600">
          {selected.item.guest_name} · Phòng {selected.item.room.code} · {formatDateTime(selected.item.preferred_at)}
        </p>
        <fieldset disabled={isSubmitting} className="space-y-4">
          {selected.action === 'reschedule' && (
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Thời gian mới (giờ Việt Nam)
              <input
                {...register('preferred_at')}
                type="datetime-local"
                className="block w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-sky-500"
              />
              {errors.preferred_at && <span role="alert" className="text-xs text-rose-700">{errors.preferred_at.message}</span>}
            </label>
          )}
          {selected.action !== 'cancel' && (
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Ghi chú
              <textarea
                {...register('note')}
                rows={3}
                placeholder="Nhập nội dung ghi chú..."
                className="block w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-sky-500"
              />
              {errors.note && <span role="alert" className="text-xs text-rose-700">{errors.note.message}</span>}
            </label>
          )}
          {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={close}>Đóng</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang xử lý…' : selected.label}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
