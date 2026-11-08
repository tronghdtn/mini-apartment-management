import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { getMaintenanceRequests } from './api'
import { maintenancePriorityLabels, maintenancePriorityTones, maintenanceStatusLabels, maintenanceStatusTones } from './labels'
import type { MaintenancePage } from './types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'
import { useKeepPrevious } from '@/hooks/useKeepPrevious'

interface Props {
  /** `user_id` = yêu cầu do tài khoản gửi; `assigned_to` = việc được giao cho kỹ thuật viên. Backend chỉ nhận từ Admin. */
  filter: 'user_id' | 'assigned_to'
  personId: number
  title: string
  pageParam: string
}

/** Danh sách sửa chữa theo một tài khoản tại hồ sơ Admin; lọc và phân trang 20 dòng ở Backend. */
export function PersonMaintenancePanel({ filter, personId, title, pageParam }: Props) {
  const [params, setParams] = useSearchParams()
  const page = params.get(pageParam) ?? '1'
  const valid = /^[1-9]\d{0,8}$/.test(page)
  const [retry, setRetry] = useState(0)
  const key = `${filter}:${personId}:${page}:${retry}`
  const [result, setResult] = useState<{ key: string; data?: MaintenancePage; error?: string }>()
  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    getMaintenanceRequests({ [filter]: personId, page: Number(page) }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }) })
      .catch(failure => { if (!controller.signal.aborted) setResult({ key, error: apiErrorMessage(failure) }) })
    return () => controller.abort()
  }, [filter, personId, page, key, valid])
  function changePage(next: number) {
    const updated = new URLSearchParams(params)
    if (next === 1) updated.delete(pageParam); else updated.set(pageParam, String(next))
    setParams(updated)
  }
  const current = result?.key === key ? result : undefined
  const { value: data, stale } = useKeepPrevious(current?.data)
  return <section aria-label={title} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
    <h2 className="font-bold text-slate-900">{title}</h2>
    {!valid ? <div role="alert" className="space-y-2 text-sm text-rose-700"><p>Trang sửa chữa trên URL không hợp lệ.</p><Button variant="outline" onClick={() => changePage(1)}>Về trang đầu</Button></div>
      : current?.error ? <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{current.error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử lại sửa chữa</Button></div>
      : !data ? <p role="status" className="text-sm text-slate-500">Đang tải yêu cầu sửa chữa…</p>
      : <RefreshingFrame busy={stale} className="space-y-4">
        <p className="text-sm text-slate-500">{data.meta.total} yêu cầu.</p>
        {data.data.length === 0 ? <p className="text-sm text-slate-500">Không có yêu cầu ở trang này.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm text-left">
          <thead className="text-xs text-slate-500"><tr>{['Yêu cầu', 'Phòng / Tòa nhà', 'Ưu tiên', filter === 'user_id' ? 'Phụ trách' : 'Người gửi', 'Trạng thái', 'Ngày gửi'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
          <tbody>{data.data.map(request => <tr key={request.id} className="border-t border-slate-100 align-top">
            <td className="p-3"><Link to={`/admin/maintenance-requests/${request.id}`} className="font-mono text-xs font-bold text-sky-700 hover:underline">{request.code}</Link><p className="mt-1 font-semibold text-slate-900 break-words">{request.title}</p></td>
            <td className="p-3">{request.room.code}<p className="text-xs text-slate-500">{request.room.building_name}</p></td>
            <td className="p-3"><Badge tone={maintenancePriorityTones[request.priority]}>{maintenancePriorityLabels[request.priority]}</Badge></td>
            <td className="p-3 text-xs text-slate-700">{filter === 'user_id' ? request.assignee?.full_name ?? 'Chưa phân công' : request.reporter?.full_name ?? 'Cư dân'}</td>
            <td className="p-3"><Badge tone={maintenanceStatusTones[request.status]} dot>{maintenanceStatusLabels[request.status]}</Badge></td>
            <td className="p-3 whitespace-nowrap text-xs text-slate-500">{request.created_at ? formatDateTime(request.created_at) : '—'}</td>
          </tr>)}</tbody></table></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>Trang {data.meta.current_page} / {data.meta.last_page}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={data.meta.current_page <= 1} onClick={() => changePage(data.meta.current_page - 1)}>Trước</Button><Button size="sm" variant="outline" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => changePage(data.meta.current_page + 1)}>Sau</Button></div></div>
      </RefreshingFrame>}
  </section>
}
