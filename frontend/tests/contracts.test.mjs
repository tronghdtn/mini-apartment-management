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

test('ngày hiện tại theo giờ Việt Nam và cảnh báo quá ngày cuối chỉ áp dụng hợp đồng hiệu lực', async () => {
  const { businessToday } = await import('../src/lib/format.ts')
  const { isPastLastDay, contractLabel } = await import('../src/features/contracts/types.ts')
  assert.equal(businessToday(new Date('2026-10-31T16:59:59Z')), '2026-10-31')
  assert.equal(businessToday(new Date('2026-10-31T17:00:00Z')), '2026-11-01')
  assert.equal(isPastLastDay({ status: 'active', end_date: '2026-10-31' }, '2026-11-01'), true)
  assert.equal(isPastLastDay({ status: 'active', end_date: '2026-11-01' }, '2026-11-01'), false)
  for (const status of ['draft', 'terminated', 'expired']) assert.equal(isPastLastDay({ status, end_date: '2026-10-01' }, '2026-11-01'), false)
  assert.equal(contractLabel({ id: 7, contract_number: null }), 'Bản nháp #7')
  assert.equal(contractLabel({ id: 7, contract_number: 'HD-0007' }), 'HD-0007')
})

test('nhãn cọc 0đ không hiển thị như khoản chưa nhận', async () => {
  const { depositStatusText } = await import('../src/features/contracts/types.ts')
  assert.equal(depositStatusText({ deposit_amount: 0, deposit_status: 'unpaid' }), 'Không yêu cầu cọc')
  assert.equal(depositStatusText({ deposit_amount: 1000000, deposit_status: 'unpaid' }), 'Chưa nhận')
  assert.equal(depositStatusText({ deposit_amount: 0, deposit_status: 'settled' }), 'Đã đối soát')
})

test('nhãn quá hạn/sắp hết hạn dùng cửa sổ ngày của server và ngày áp dụng thay dịch vụ là 01 tháng sau', async () => {
  const { contractDueState, serviceChangeEffectiveDate } = await import('../src/features/contracts/types.ts')
  const window = { today: '2026-11-02', expiring_until: '2026-12-02' }
  assert.equal(contractDueState({ status: 'active', end_date: '2026-11-01' }, window), 'overdue')
  assert.equal(contractDueState({ status: 'active', end_date: '2026-11-02' }, window), 'expiring')
  assert.equal(contractDueState({ status: 'active', end_date: '2026-12-02' }, window), 'expiring')
  assert.equal(contractDueState({ status: 'active', end_date: '2026-12-03' }, window), null)
  assert.equal(contractDueState({ status: 'terminated', end_date: '2026-01-01' }, window), null)
  assert.equal(serviceChangeEffectiveDate({ start_date: '2026-10-01' }, '2026-11-02'), '2026-12-01')
  assert.equal(serviceChangeEffectiveDate({ start_date: '2026-10-01' }, '2026-12-31'), '2027-01-01')
  assert.equal(serviceChangeEffectiveDate({ start_date: '2027-01-10' }, '2026-11-02'), '2027-01-10')
})

test('bộ lọc hạn chỉ đi với tab tất cả hoặc đang hiệu lực', async () => {
  const { contractFiltersSchema } = await import('../src/features/contracts/schemas.ts')
  const base = { status: '', building_id: '', room_id: '', user_id: '', q: '' }
  for (const due of ['', 'expiring', 'overdue']) assert.equal(contractFiltersSchema.safeParse({ ...base, due }).success, true)
  assert.equal(contractFiltersSchema.safeParse({ ...base, status: 'active', due: 'overdue' }).success, true)
  assert.equal(contractFiltersSchema.safeParse({ ...base, status: 'draft', due: 'overdue' }).success, false)
  assert.equal(contractFiltersSchema.safeParse({ ...base, due: 'late' }).success, false)
})
