import test from 'node:test'
import assert from 'node:assert/strict'
import { meterPayloadSchema, meterFormSchema, meterFiltersSchema } from '../src/features/meter-readings/schemas.ts'

const entry = { room_id: 1, service_id: 2, period: '2026-10-01', reading_date: '2026-11-01', current_reading: '112.35' }
test('meter payload keeps exact decimal strings and excludes all server controlled snapshots', () => {
  const result = meterPayloadSchema.parse({ readings: [{ ...entry, amount: 1, previous_reading: '0.00', contract_id: 4, kind: 'final' }] })
  assert.deepEqual(result.readings, [entry])
  for (const current_reading of ['0', '0.00', '99999999.99']) assert.equal(meterPayloadSchema.safeParse({ readings: [{ ...entry, current_reading }] }).success, true)
  for (const current_reading of [112.35, true, null, '-1', '1e2', '1.001', '100000000']) assert.equal(meterPayloadSchema.safeParse({ readings: [{ ...entry, current_reading }] }).success, false)
})
test('meter batch detects duplicate room-service pairs and invalid dates before transmission', () => {
  assert.equal(meterPayloadSchema.safeParse({ readings: [entry, entry] }).success, false)
  assert.equal(meterPayloadSchema.safeParse({ readings: [entry, { ...entry, service_id: 3 }] }).success, true)
  for (const change of [{ period: '2026-10-02' }, { reading_date: '2026-02-30' }, { reading_date: '2026-09-30' }, { period: '0999-01-01' }]) assert.equal(meterPayloadSchema.safeParse({ readings: [{ ...entry, ...change }] }).success, false)
  assert.equal(meterPayloadSchema.safeParse({ readings: Array(101).fill(entry) }).success, false)
  assert.equal(meterFormSchema.safeParse({ building_id: 1, service_id: 2, period: entry.period, reading_date: entry.reading_date, rows: [{ room_id: 1, current_reading: '112.35' }] }).success, true)
})
test('meter filters preserve exact period and refuse malformed identifiers or page', () => {
  const value = { building_id: '23', room_id: '43', service_id: '2', period: '2026-10-01', kind: 'periodic', page: '2' }
  assert.deepEqual(meterFiltersSchema.parse(Object.fromEntries(new URLSearchParams(value))), value)
  for (const change of [{ page: '-1' }, { kind: 'submitted' }, { building_id: '1e2' }, { period: '2026-10-02' }]) assert.equal(meterFiltersSchema.safeParse({ ...value, ...change }).success, false)
})
