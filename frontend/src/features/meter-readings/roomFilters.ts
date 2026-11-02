export type RoomMeterFilter = 'meter_service_id' | 'meter_period' | 'meter_kind' | 'meter_page'

/** Phạm vi phòng lấy từ tài nguyên đang mở, không từ query có thể còn sót của phòng khác. */
export function roomMeterFilterValues(roomId: number, params: URLSearchParams) {
  return { building_id: '', room_id: String(roomId), service_id: params.get('meter_service_id') ?? '',
    period: params.get('meter_period') ?? '', kind: params.get('meter_kind') ?? '', page: params.get('meter_page') ?? '1' }
}

export function roomMeterSearchParams(current: URLSearchParams, field: RoomMeterFilter, value: string) {
  const next = new URLSearchParams(current)
  next.set('tab', 'utilities')
  if (value) next.set(field, value)
  else next.delete(field)
  if (field !== 'meter_page') next.delete('meter_page')
  return next
}

export function clearRoomMeterFilters(current: URLSearchParams) {
  const next = new URLSearchParams(current)
  for (const key of ['meter_service_id', 'meter_period', 'meter_kind', 'meter_page']) next.delete(key)
  next.set('tab', 'utilities')
  return next
}
