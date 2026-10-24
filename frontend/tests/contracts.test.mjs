import test from 'node:test'
import assert from 'node:assert/strict'
import { draftContractSchema, contractFiltersSchema, draftContractServicesSchema } from '../src/features/contracts/schemas.ts'

const draft = { room_id: 1, user_id: 2, start_date: '2026-11-01', end_date: '2027-10-31', monthly_rent: 3500000, deposit_amount: 3500000, occupant_count: 1, note: '' }
const filters = { status: '', building_id: '', room_id: '', user_id: '', q: '' }

test('draft accepts only approved basic fields, trims note and requires both existing resource identifiers', () => {
  assert.deepEqual(draftContractSchema.parse({ ...draft, note: '  Ghi chú  ' }), { ...draft, note: 'Ghi chú' })
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null, true]) {
    for (const field of ['room_id', 'user_id']) assert.equal(draftContractSchema.safeParse({ ...draft, [field]: value }).success, false)
  }
  for (const field of ['role', 'status', 'contract_number', 'deposit_status', 'initial_electricity_reading', 'initial_water_reading', 'early_termination_type', 'activated_at', 'deleted_at']) {
    assert.equal(draftContractSchema.safeParse({ ...draft, [field]: null }).success, false)
  }
})

test('dates are real calendar dates and inclusive last day must be strictly after start', () => {
  for (const change of [{ start_date: '' }, { end_date: '2026-02-30' }, { start_date: '2026-13-01' }, { end_date: draft.start_date }, { end_date: '2026-10-31' }, { start_date: '2026-11-01T00:00:00Z' }]) {
    assert.equal(draftContractSchema.safeParse({ ...draft, ...change }).success, false)
  }
  assert.equal(draftContractSchema.safeParse({ ...draft, start_date: '2028-02-29', end_date: '2028-03-01' }).success, true)
})

test('rent and deposit are nonnegative safe integer VND without floating point conversion', () => {
  for (const field of ['monthly_rent', 'deposit_amount']) {
    for (const value of [0, 1, Number.MAX_SAFE_INTEGER]) assert.equal(draftContractSchema.safeParse({ ...draft, [field]: value }).success, true)
    for (const value of [-1, 0.01, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '3500000', null, true]) assert.equal(draftContractSchema.safeParse({ ...draft, [field]: value }).success, false)
  }
})

test('occupancy includes representative and uses integer schema range; room capacity remains backend and form checked', () => {
  for (const value of [1, 65535]) assert.equal(draftContractSchema.safeParse({ ...draft, occupant_count: value }).success, true)
  for (const value of [0, -1, 1.1, 65536, '2', null, NaN]) assert.equal(draftContractSchema.safeParse({ ...draft, occupant_count: value }).success, false)
})

test('notes enforce MySQL TEXT UTF8 byte limit while empty notes remain valid', () => {
  for (const note of ['', 'a'.repeat(65535), '😀'.repeat(16383)]) assert.equal(draftContractSchema.safeParse({ ...draft, note }).success, true)
  for (const note of ['a'.repeat(65536), '😀'.repeat(16384), null, ['note']]) assert.equal(draftContractSchema.safeParse({ ...draft, note }).success, false)
})

test('list filters retain literal search characters, explicit IDs and existing readonly statuses', () => {
  for (const status of ['', 'draft', 'active', 'terminated', 'expired']) assert.equal(contractFiltersSchema.safeParse({ ...filters, status }).success, true)
  assert.deepEqual(contractFiltersSchema.parse({ ...filters, q: '  %_\\  ', room_id: '21', user_id: '42' }), { ...filters, q: '%_\\', room_id: '21', user_id: '42' })
  assert.equal(contractFiltersSchema.safeParse({ ...filters, q: '😀'.repeat(191) }).success, true)
  assert.equal(contractFiltersSchema.safeParse({ ...filters, q: '😀'.repeat(192) }).success, false)
  for (const field of ['room_id', 'building_id', 'user_id']) for (const value of ['0', '-1', '1.1', '01', '9007199254740992', null, 1]) assert.equal(contractFiltersSchema.safeParse({ ...filters, [field]: value }).success, false)
  assert.equal(contractFiltersSchema.safeParse({ ...filters, status: 'renewed' }).success, false)
})

test('draft service selection accepts empty removal and positive integer quantity within DECIMAL storage', () => {
  for (const quantity of [1, 2, 99999999]) assert.equal(draftContractServicesSchema.safeParse({ services: [{ service_id: 1, quantity }] }).success, true)
  assert.deepEqual(draftContractServicesSchema.parse({ services: [] }), { services: [] })
  for (const quantity of [0, -1, 1.1, 100000000, '2', null, true, NaN, Infinity]) assert.equal(draftContractServicesSchema.safeParse({ services: [{ service_id: 1, quantity }] }).success, false)
})

test('draft service request never includes a client price, dates, status or duplicate identifiers', () => {
  const line = { service_id: 1, quantity: 1 }
  for (const field of ['unit_price', 'price', 'start_date', 'end_date', 'status', 'contract_id']) {
    assert.equal(draftContractServicesSchema.safeParse({ services: [{ ...line, [field]: null }] }).success, false)
    assert.equal(draftContractServicesSchema.safeParse({ services: [line], [field]: null }).success, false)
  }
  assert.equal(draftContractServicesSchema.safeParse({ services: [line, line] }).success, false)
  for (const service_id of [0, -1, 1.5, true, null, '1']) assert.equal(draftContractServicesSchema.safeParse({ services: [{ ...line, service_id }] }).success, false)
})
