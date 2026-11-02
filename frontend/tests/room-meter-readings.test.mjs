import test from 'node:test'
import assert from 'node:assert/strict'
import { clearRoomMeterFilters, roomMeterFilterValues, roomMeterSearchParams } from '../src/features/meter-readings/roomFilters.ts'
import { meterFiltersSchema } from '../src/features/meter-readings/schemas.ts'

test('room history always scopes API filters to the opened room and keeps server pagination', () => {
  const params = new URLSearchParams('tab=utilities&room_id=999&page=10&meter_service_id=7&meter_period=2026-10-01&meter_kind=final&meter_page=2')
  assert.deepEqual(meterFiltersSchema.parse(roomMeterFilterValues(37, params)), {
    building_id: '', room_id: '37', service_id: '7', period: '2026-10-01', kind: 'final', page: '2',
  })
  assert.equal(roomMeterFilterValues(38, params).room_id, '38')
  assert.equal(roomMeterFilterValues(37, new URLSearchParams('page=10')).page, '1')
})

test('changing a room meter filter resets pagination and preserves unrelated room tabs parameters', () => {
  const original = new URLSearchParams('tab=info&meter_page=3&meter_kind=final&other=keep')
  const changed = roomMeterSearchParams(original, 'meter_service_id', '5')
  assert.equal(changed.get('tab'), 'utilities')
  assert.equal(changed.get('meter_service_id'), '5')
  assert.equal(changed.get('meter_page'), null)
  assert.equal(changed.get('meter_kind'), 'final')
  assert.equal(changed.get('other'), 'keep')
  assert.equal(original.get('tab'), 'info')
  assert.equal(original.get('meter_page'), '3')
  assert.equal(roomMeterSearchParams(changed, 'meter_page', '2').get('meter_page'), '2')
  assert.equal(roomMeterSearchParams(changed, 'meter_service_id', '').get('meter_service_id'), null)
  const cleared = clearRoomMeterFilters(changed)
  assert.equal(cleared.toString(), 'tab=utilities&other=keep')
})

test('invalid room history URL cannot turn into an unfiltered or fabricated empty result', () => {
  for (const query of ['meter_page=0', 'meter_page=2147483648', 'meter_kind=wrong', 'meter_period=2026-10-02', 'meter_service_id=-1']) {
    assert.equal(meterFiltersSchema.safeParse(roomMeterFilterValues(37, new URLSearchParams(query))).success, false, query)
  }
  assert.equal(meterFiltersSchema.safeParse(roomMeterFilterValues(0, new URLSearchParams())).success, false)
})
