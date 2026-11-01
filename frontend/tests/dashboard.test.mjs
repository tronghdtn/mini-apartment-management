import test from 'node:test'
import assert from 'node:assert/strict'
import { dashboardSummarySchema } from '../src/features/dashboard/schemas.ts'
import { formatVND } from '../src/lib/format.ts'

const empty = { period: '2026-11', rented_rooms_count: 0, received_amount: '0', outstanding_amount: '0', pending_maintenance_count: 0 }
test('dashboard accepts successful zero and aggregate VND beyond Number safe integer without rounding', () => {
  assert.deepEqual(dashboardSummarySchema.parse(empty), empty)
  const summary = dashboardSummarySchema.parse({ ...empty, received_amount: '18014398509481982', outstanding_amount: '18014398509481983' })
  assert.equal(formatVND(BigInt(summary.received_amount)), '18.014.398.509.481.982 ₫')
  assert.equal(formatVND(BigInt(summary.outstanding_amount)), '18.014.398.509.481.983 ₫')
})
test('dashboard refuses malformed or imprecise data rather than displaying a fake zero', () => {
  for (const change of [{ period: '2026-13' }, { received_amount: 1000 }, { received_amount: '1.5' }, { outstanding_amount: '-1' },
    { outstanding_amount: '1e16' }, { rented_rooms_count: 0.5 }, { pending_maintenance_count: -1 }, { period: undefined }]) {
    assert.equal(dashboardSummarySchema.safeParse({ ...empty, ...change }).success, false)
  }
})
