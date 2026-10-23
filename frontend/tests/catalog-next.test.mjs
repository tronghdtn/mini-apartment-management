import test from 'node:test'
import assert from 'node:assert/strict'
import { serviceSchema, serviceUpdateSchema } from '../src/features/services/schemas.ts'
import { utilityPriceSchema } from '../src/features/utility-prices/schemas.ts'

const service = { code: ' internet ', name: ' Internet ', billing_type: 'per_room', unit: ' phòng ', price: 100000, description: '' }
const price = { service_id: 1, unit_price: 3500, effective_from: '2026-12-01' }

test('service accepts exactly the three ordinary billing types and normalizes its identifier', () => {
  for (const billing_type of ['per_room', 'per_person', 'per_unit']) {
    const parsed = serviceSchema.parse({ ...service, billing_type })
    assert.equal(parsed.code, 'INTERNET')
    assert.equal(parsed.name, 'Internet')
    assert.equal(parsed.unit, 'phòng')
    assert.equal(parsed.billing_type, billing_type)
  }
  for (const billing_type of ['metered', 'invented', '', null]) assert.equal(serviceSchema.safeParse({ ...service, billing_type }).success, false)
})

test('service rejects reserved identifiers and malformed field limits', () => {
  for (const code of [' electricity ', 'water', 'ELECTRICITY', '', ' '.repeat(3), 'a'.repeat(51)]) assert.equal(serviceSchema.safeParse({ ...service, code }).success, false)
  for (const change of [{ name: '' }, { name: 'a'.repeat(121) }, { unit: 'a'.repeat(21) }]) assert.equal(serviceSchema.safeParse({ ...service, ...change }).success, false)
  assert.equal(serviceSchema.safeParse({ ...service, code: 'a'.repeat(50), name: 'b'.repeat(120), unit: 'c'.repeat(20) }).success, true)
  assert.equal(serviceSchema.safeParse({ ...service, unit: '' }).success, true)
})

test('service VND prices are integral nonnegative JSON-safe numbers and never silently rounded', () => {
  for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '100000', null, true, false]) assert.equal(serviceSchema.safeParse({ ...service, price: value }).success, false)
  for (const value of [0, Number.MAX_SAFE_INTEGER]) assert.equal(serviceSchema.safeParse({ ...service, price: value }).success, true)
})

test('service create and edit schemas exclude server-controlled state and contract snapshots', () => {
  const created = serviceSchema.parse({ ...service, id: 12, status: 'inactive', is_system: true, contract_services: [{ unit_price: 1 }] })
  for (const field of ['id', 'status', 'is_system', 'contract_services']) assert.equal(field in created, false)
  const edited = serviceUpdateSchema.parse({ name: 'Đổi tên', price: null, description: '', code: 'WATER', billing_type: 'metered', unit: 'm3', status: 'inactive' })
  assert.deepEqual(edited, { name: 'Đổi tên', price: null, description: '' })
  assert.equal(serviceUpdateSchema.safeParse({ name: 'Đổi tên', price: -1, description: '' }).success, false)
})

test('service descriptions enforce TEXT UTF-8 capacity on create and edit', () => {
  for (const [schema, base] of [[serviceSchema, service], [serviceUpdateSchema, { name: 'Internet', price: 100000, description: '' }]]) {
    for (const description of ['a'.repeat(65536), 'ế'.repeat(21846)]) assert.equal(schema.safeParse({ ...base, description }).success, false)
    for (const description of ['a'.repeat(65535), 'ế'.repeat(21845)]) assert.equal(schema.safeParse({ ...base, description }).success, true)
  }
})

test('utility price requires a real service selection and positive integer VND amount', () => {
  assert.deepEqual(utilityPriceSchema.parse(price), price)
  for (const change of [{ service_id: 0 }, { service_id: -1 }, { service_id: NaN }, { service_id: 1.5 }, { unit_price: 0 }, { unit_price: -1 }, { unit_price: 1.5 }, { unit_price: Number.MAX_SAFE_INTEGER + 1 }, { unit_price: '3500' }, { unit_price: true }, { unit_price: false }]) assert.equal(utilityPriceSchema.safeParse({ ...price, ...change }).success, false)
  assert.equal(utilityPriceSchema.safeParse({ ...price, unit_price: Number.MAX_SAFE_INTEGER }).success, true)
})

test('utility effective date stays a strict calendar DATE on the first day of a real month', () => {
  for (const effective_from of ['2026-01-01', '2026-12-01', '2028-02-01', '1000-01-01', '9999-12-01']) assert.equal(utilityPriceSchema.safeParse({ ...price, effective_from }).success, true)
  for (const effective_from of ['2026-02-30', '2026-12-02', '2026-00-01', '2026-13-01', '2026-1-01', '0000-01-01', '0001-01-01', '0999-01-01', '2026-12-01T00:00:00Z', '', ' 2026-12-01 ']) assert.equal(utilityPriceSchema.safeParse({ ...price, effective_from }).success, false)
})

test('utility schema does not forward protected identifiers or server-computed relationship data', () => {
  const parsed = utilityPriceSchema.parse({ ...price, id: 99, status: 'active', service: { code: 'WATER' }, meter_readings: [] })
  assert.deepEqual(parsed, price)
})
