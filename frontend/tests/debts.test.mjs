import test from 'node:test'
import assert from 'node:assert/strict'
import { debtFiltersSchema, debtSearchSchema } from '../src/features/debts/schemas.ts'

test('debt filters accept approved tabs, preserve literal search and positive pages', () => {
  const filters = { status: 'overdue', search: '100%_A\\B', page: '2' }
  assert.deepEqual(debtFiltersSchema.parse(filters), filters)
  assert.equal(debtSearchSchema.parse({ search: '  Nguyễn An  ' }).search, 'Nguyễn An')
})

test('debt filters reject invented status, blank page, unsafe page and long search', () => {
  assert.equal(debtFiltersSchema.safeParse({ status: 'paid', search: '', page: '1' }).success, false)
  assert.equal(debtFiltersSchema.safeParse({ status: 'all', search: '', page: '0' }).success, false)
  assert.equal(debtFiltersSchema.safeParse({ status: 'all', search: '', page: '99999999999999999' }).success, false)
  assert.equal(debtSearchSchema.safeParse({ search: 'x'.repeat(101) }).success, false)
})
