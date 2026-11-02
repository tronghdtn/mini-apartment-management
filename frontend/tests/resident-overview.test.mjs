import test from 'node:test'
import assert from 'node:assert/strict'
import { residentOverviewSchema } from '../src/features/resident-overview/schemas.ts'
import { formatVND } from '../src/lib/format.ts'

const debt = { outstanding_amount: '0', outstanding_invoice_count: 0, overdue_amount: '0', overdue_invoice_count: 0 }
const contract = {
  id: 7, contract_number: 'HD-0007', start_date: '2026-01-01', end_date: '2026-11-02', planned_handover_date: '2026-11-03',
  due_state: 'expiring', expiring_warning_days: 30, room: { code: 'P101', building_name: 'Tòa A', address: '1 Đường Test' },
}
const overview = { today: '2026-11-02', active_contract: contract, debt }

test('resident overview accepts no active contract and aggregate debt beyond Number safe integer', () => {
  assert.deepEqual(residentOverviewSchema.parse({ ...overview, active_contract: null }), { ...overview, active_contract: null })
  const parsed = residentOverviewSchema.parse({ ...overview, debt: { ...debt, outstanding_amount: '18014398509481983', outstanding_invoice_count: 3 } })
  assert.equal(formatVND(BigInt(parsed.debt.outstanding_amount)), '18.014.398.509.481.983 ₫')
  for (const state of ['expiring', 'overdue', null]) {
    assert.equal(residentOverviewSchema.safeParse({ ...overview, active_contract: { ...contract, due_state: state } }).success, true)
  }
})

test('resident overview refuses malformed money, counts or due state instead of showing a fake zero', () => {
  for (const change of [{ outstanding_amount: 1000 }, { outstanding_amount: '1.5' }, { overdue_amount: '-1' }, { overdue_amount: '1e16' },
    { outstanding_invoice_count: 0.5 }, { overdue_invoice_count: -1 }, { outstanding_amount: undefined }]) {
    assert.equal(residentOverviewSchema.safeParse({ ...overview, debt: { ...debt, ...change } }).success, false)
  }
  assert.equal(residentOverviewSchema.safeParse({ ...overview, active_contract: { ...contract, due_state: 'soon' } }).success, false)
  assert.equal(residentOverviewSchema.safeParse({ ...overview, today: '02/11/2026' }).success, false)
})
