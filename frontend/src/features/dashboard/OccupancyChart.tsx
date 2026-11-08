import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { occupancyColors, occupancyLabels } from './occupancy'

export interface OccupancyRow {
  id: number
  name: string
  rented: number
  available: number
  other: number
  total: number
}

type ChartRow = OccupancyRow & { rentedPct: number; otherPct: number }

function shortName(name: string, max: number) {
  const short = name.replace(/^Chung cư Mini\s+/i, '')
  return short.length > max ? `${short.slice(0, max - 1)}…` : short
}

/** Phần trăm làm tròn để vẽ; số phòng thật vẫn hiển thị ở nhãn và tooltip. */
function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0
}

/** Nhãn trái: tên tòa (rút gọn) và số phòng đang thuê / tổng. */
function BuildingTick({ x, y, payload, rows, compact }: { x?: number; y?: number; payload?: { index: number }; rows: ChartRow[]; compact: boolean }) {
  const row = rows[payload?.index ?? -1]
  if (!row) return null
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <title>{row.name}</title>
      <text x={-12} y={-4} textAnchor="end" fontSize={compact ? 12 : 13} fill="#0f172a" fontWeight={500}>{shortName(row.name, compact ? 12 : 24)}</text>
      <text x={-12} y={12} textAnchor="end" fontSize={11} fill="#64748b">{row.rented}/{row.total} phòng{compact ? '' : ' đang thuê'}</text>
    </g>
  )
}

/** Nhãn phải: tỷ lệ lấp đầy của tòa. */
function PercentTick({ x, y, payload, rows }: { x?: number; y?: number; payload?: { index: number }; rows: ChartRow[] }) {
  const row = rows[payload?.index ?? -1]
  if (!row) return null
  return <text x={(x ?? 0) + 12} y={(y ?? 0) + 4} fontSize={13} fontWeight={600} fill="#0f172a">{Math.round(row.rentedPct)}%</text>
}

function OccupancyTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-900">{row.name}</p>
      {(['rented', 'available', 'other'] as const).map(key => (
        <p key={key} className="flex items-center justify-between gap-6 text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: occupancyColors[key] }} />{occupancyLabels[key]}</span>
          <span className="font-medium text-slate-900 tabular-nums">{row[key]}</span>
        </p>
      ))}
      <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-slate-500">Tổng {row.total} phòng</p>
    </div>
  )
}

/**
 * Thanh tiến độ theo tòa: nền xám nhạt là toàn bộ phòng của tòa (còn trống),
 * phần xanh lá là đang thuê, phần cam là bảo trì/ngừng. Thang 0–100% để các tòa có quy mô khác nhau so được với nhau.
 */
export function OccupancyChart({ rows, onSelect }: { rows: OccupancyRow[]; onSelect?: (id: number) => void }) {
  const data: ChartRow[] = rows.map(row => ({ ...row, rentedPct: percent(row.rented, row.total), otherPct: percent(row.other, row.total) }))
  // Khung hẹp (điện thoại) thì thu cột tên để thanh còn đủ dài.
  const box = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const element = box.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 440))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={box} style={{ height: data.length * 56 + 8 }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
          barSize={10}
          onClick={state => { const index = Number(state?.activeTooltipIndex); if (onSelect && Number.isInteger(index) && data[index]) onSelect(data[index].id) }}
          style={onSelect ? { cursor: 'pointer' } : undefined}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis yAxisId="name" type="category" dataKey="name" width={compact ? 118 : 190} axisLine={false} tickLine={false} interval={0} tick={<BuildingTick rows={data} compact={compact} />} />
          <YAxis yAxisId="pct" type="category" dataKey="name" orientation="right" width={48} axisLine={false} tickLine={false} interval={0} tick={<PercentTick rows={data} />} />
          <Tooltip content={<OccupancyTooltip />} cursor={{ fill: 'rgba(241,245,249,0.6)' }} />
          <Bar yAxisId="name" dataKey="rentedPct" stackId="rooms" fill={occupancyColors.rented} radius={[5, 0, 0, 5]} background={{ fill: occupancyColors.available, radius: 5 }} isAnimationActive={false} />
          <Bar yAxisId="name" dataKey="otherPct" stackId="rooms" fill={occupancyColors.other} stroke="#ffffff" strokeWidth={2} radius={[0, 5, 5, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
