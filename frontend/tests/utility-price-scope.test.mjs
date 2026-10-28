import test from 'node:test'
import assert from 'node:assert/strict'
import { utilityPriceSchema, utilityPriceFiltersSchema } from '../src/features/utility-prices/schemas.ts'

const input = { building_id: 1, service_id: 2, unit_price: 3500, effective_from: '2026-12-01' }
test('a utility price always names a real building selection without choosing the first building', () => {
  const { building_id, ...missing } = input
  assert.equal(utilityPriceSchema.safeParse(missing).success, false)
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', true, false, null]) assert.equal(utilityPriceSchema.safeParse({ ...input, building_id: value }).success, false)
  assert.equal(utilityPriceSchema.parse(input).building_id, building_id)
})
test('utility URL filters preserve building and service through serialization and reject malformed identifiers/pages', () => {
  const filters = { building_id: '21', service_id: '2', page: '3' }
  const query = new URLSearchParams(filters)
  assert.deepEqual(utilityPriceFiltersSchema.parse(Object.fromEntries(query)), filters)
  assert.deepEqual(utilityPriceFiltersSchema.parse({ building_id: '', service_id: '2', page: '1' }), { building_id: '', service_id: '2', page: '1' })
  for (const value of ['-1', '1.5', '0', '9007199254740992', 'abc', ' 1', true]) assert.equal(utilityPriceFiltersSchema.safeParse({ ...filters, building_id: value }).success, false)
  for (const value of ['', '0', '-1', '1.5', '2147483648', 'abc']) assert.equal(utilityPriceFiltersSchema.safeParse({ ...filters, page: value }).success, false)
})
