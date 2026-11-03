import test from 'node:test'
import assert from 'node:assert/strict'
import { userContractsQuerySchema, userContractsPageSchema } from '../src/features/user-management/contractHistory.ts'

test('history scopes the server query by exact account ID and a valid page', () => {
  assert.deepEqual(userContractsQuerySchema.parse({ user_id: 12, page: '2' }), { user_id: 12, page: 2 })
  for (const page of ['0', '-1', '1.2', 'abc', '01', '9999999999', '1&user_id=4']) assert.equal(userContractsQuerySchema.safeParse({ user_id: 12, page }).success, false)
  for (const user_id of [0, -1, 1.2, '12', null]) assert.equal(userContractsQuerySchema.safeParse({ user_id, page: '1' }).success, false)
  assert.equal(userContractsQuerySchema.safeParse({ user_id: 12, page: '1', role: 'admin' }).success, false)
})

test('history reads server pagination and retains only the required contract projection', () => {
  const contract = { id: 1, contract_number: 'HD-0001', status: 'terminated', start_date: '2026-01-01', end_date: '2026-10-31', monthly_rent: 3000000,
    room: { id: 2, code: 'P101', building: { name: 'Tòa A' } }, note: 'private note' }
  const result = userContractsPageSchema.parse({ data: [contract], meta: { current_page: 2, last_page: 2, total: 21 } })
  assert.equal(result.meta.total, 21)
  assert.equal(result.data[0].status, 'terminated')
  assert.equal('note' in result.data[0], false)
  assert.equal(userContractsPageSchema.safeParse({ data: [{ ...contract, monthly_rent: -1 }], meta: result.meta }).success, false)
})
