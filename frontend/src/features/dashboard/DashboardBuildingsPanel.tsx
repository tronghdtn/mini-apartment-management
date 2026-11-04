import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { useApiResource } from '@/hooks/useApiResource'
import { getDashboardBuildings } from './api'
import { dashboardPageSchema } from './schemas'

export function DashboardBuildingsPanel() {
  const [params, setParams] = useSearchParams()
  const page = params.get('buildings_page') ?? '1'
  const valid = dashboardPageSchema.safeParse(page).success
  const { data, error, reload } = useApiResource(valid ? page : null, signal => getDashboardBuildings(page, signal))
  function changePage(next: number) {
    const updated = new URLSearchParams(params)
    if (next === 1) updated.delete('buildings_page'); else updated.set('buildings_page', String(next))
    setParams(updated)
  }
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-slate-900">Tình trạng phòng từng tòa nhà</h2><Button size="sm" variant="outline" onClick={reload}>Tải lại tòa nhà</Button></div>
    {!valid ? <div role="alert" className="space-y-2 text-sm text-rose-700"><p>Trang tòa nhà không hợp lệ.</p><Button variant="outline" onClick={() => changePage(1)}>Về trang đầu</Button></div>
      : error ? <div role="alert" className="text-sm text-rose-700 space-y-2"><p>{error}</p><Button variant="outline" onClick={reload}>Thử lại bảng tòa nhà</Button></div>
      : !data ? <p role="status" className="text-sm text-slate-500">Đang tải tổng quan tòa nhà…</p>
      : <>{data.data.length === 0 ? <p className="text-sm text-slate-500">Không có tòa nhà ở trang này.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[440px] text-sm text-left"><thead className="text-xs text-slate-500"><tr>{['Tòa nhà', 'Tổng phòng', 'Đang thuê', 'Phòng trống'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{data.data.map(building => <tr key={building.id} className="border-t border-slate-100"><td className="p-3"><Link className="font-semibold text-sky-700 hover:underline" to={`/admin/buildings/${building.id}`}>{building.name}</Link></td>{[building.rooms_count, building.rented_rooms_count, building.available_rooms_count].map((count, index) => <td key={index} className="p-3 text-right tabular-nums">{count}</td>)}</tr>)}</tbody></table></div>}
        <p className="text-xs text-slate-500">Đang thuê theo hợp đồng hiệu lực; trống theo trạng thái phòng. Tổng phòng còn gồm các trạng thái bảo trì và ngừng sử dụng.</p>
        <nav aria-label="Phân trang tòa nhà" className="flex flex-wrap justify-between items-center gap-3 text-sm"><span>Trang {data.meta.current_page}/{data.meta.last_page} · {data.meta.total} tòa nhà</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={data.meta.current_page <= 1} onClick={() => changePage(data.meta.current_page - 1)}>Trước</Button><Button size="sm" variant="outline" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => changePage(data.meta.current_page + 1)}>Sau</Button></div></nav>
      </>}
  </section>
}
