import test from 'node:test'
import assert from 'node:assert/strict'
import { residentContractFiltersSchema } from '../src/features/resident-contracts/schemas.ts'

test('resident contract filters support history and reject draft, unknown status and invalid pagination', () => {
  assert.deepEqual(residentContractFiltersSchema.parse({ status: 'terminated', page: '2' }), { status: 'terminated', page: '2' })
  for (const patch of [{ status: 'draft' }, { status: 'cancelled' }, { page: '0' }, { page: '1.5' }, { page: '2147483648' }]) assert.equal(residentContractFiltersSchema.safeParse({ status: 'all', page: '1', ...patch }).success, false)
})
