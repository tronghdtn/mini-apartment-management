import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { useApiResource } from '@/hooks/useApiResource'
import { getDashboardBuildings } from './api'
import { dashboardPageSchema } from './schemas'
import { DashboardCard, DashboardError, DashboardLoading } from './DashboardCard'
import { OccupancyChart } from './OccupancyChart'
import { occupancyColors, occupancyLabels } from './occupancy'

/** Phần trăm làm tròn để hiển thị thanh; không dùng cho tiền. */
function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

export function DashboardBuildingsPanel() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const page = params.get('buildings_page') ?? '1'
  const valid = dashboardPageSchema.safeParse(page).success
  const { data, error, reload } = useApiResource(valid ? page : null, signal => getDashboardBuildings(page, signal))
  function changePage(next: number) {
    const updated = new URLSearchParams(params)
    if (next === 1) updated.delete('buildings_page'); else updated.set('buildings_page', String(next))
    setParams(updated)
  }
  const totals = data?.data.reduce((sum, building) => ({ rooms: sum.rooms + building.rooms_count, rented: sum.rented + building.rented_rooms_count }), { rooms: 0, rented: 0 })
  return (
    <DashboardCard title="Lấp đầy theo tòa nhà" action={{ to: '/admin/buildings', label: 'Tòa nhà' }}>
      {!valid ? <DashboardError message="Trang tòa nhà không hợp lệ." onRetry={() => changePage(1)} />
        : error ? <DashboardError message={error} onRetry={reload} />
        : !data || !totals ? <DashboardLoading label="Đang tải tình trạng phòng" />
        : data.data.length === 0 ? <p className="text-sm text-slate-500">Chưa có tòa nhà nào.</p>
        : (
          <div className="space-y-5">
            {data.meta.last_page > 1 && <p className="text-xs text-slate-500">Trang này: {totals.rented}/{totals.rooms} phòng đang cho thuê ({percent(totals.rented, totals.rooms)}%).</p>}
            <OccupancyChart onSelect={id => navigate(`/admin/buildings/${id}`)} rows={data.data.map(building => ({
              id: building.id,
              name: building.name,
              rented: building.rented_rooms_count,
              available: building.available_rooms_count,
              other: Math.max(building.rooms_count - building.rented_rooms_count - building.available_rooms_count, 0),
              total: building.rooms_count,
            }))} />
            <div className="sr-only">
            <table>
              <caption>Tình trạng phòng theo tòa nhà</caption>
              <thead><tr><th scope="col">Tòa nhà</th><th scope="col">Đang thuê</th><th scope="col">Còn trống</th><th scope="col">Tổng phòng</th></tr></thead>
              <tbody>{data.data.map(building => (
                <tr key={building.id}><th scope="row">{building.name}</th><td>{building.rented_rooms_count}</td><td>{building.available_rooms_count}</td><td>{building.rooms_count}</td></tr>
              ))}</tbody>
            </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <div className="flex flex-wrap gap-4">
                {(['rented', 'available', 'other'] as const).map(key => (
                  <span key={key} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: occupancyColors[key] }} />{occupancyLabels[key]}</span>
                ))}
              </div>
              {data.meta.last_page > 1 && (
                <nav aria-label="Phân trang tòa nhà" className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" disabled={data.meta.current_page <= 1} onClick={() => changePage(data.meta.current_page - 1)}>Trước</Button>
                  <span className="tabular-nums">{data.meta.current_page}/{data.meta.last_page}</span>
                  <Button size="sm" variant="ghost" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => changePage(data.meta.current_page + 1)}>Sau</Button>
                </nav>
              )}
            </div>
          </div>
        )}
    </DashboardCard>
  )
}
