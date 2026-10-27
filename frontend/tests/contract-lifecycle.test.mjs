import test from 'node:test'
import assert from 'node:assert/strict'
import { zodResolver } from '@hookform/resolvers/zod'
import { activateContractSchema, contractTermsSchema } from '../src/features/contracts/schemas.ts'

const terms = { early_termination_fee_type: '', early_termination_fee_amount: null, early_termination_fee_multiplier: null, early_termination_waiver_conditions: [] }
const readings = { initial_electricity_reading: '100.25', initial_water_reading: '0', meter_gap_reason: '', meter_gap_confirmed: false }
test('unsigned draft does not invent a fee and explicit none remains distinct', () => {
  assert.equal(contractTermsSchema.parse(terms).early_termination_fee_type, '')
  assert.equal(contractTermsSchema.parse({ ...terms, early_termination_fee_type: 'none' }).early_termination_fee_type, 'none')
})
test('fixed fee requires an integer amount and rent_multiple requires a bounded decimal string', () => {
  assert.equal(contractTermsSchema.safeParse({ ...terms, early_termination_fee_type: 'fixed' }).success, false)
  for (const value of [0, 1, Number.MAX_SAFE_INTEGER]) assert.equal(contractTermsSchema.safeParse({ ...terms, early_termination_fee_type: 'fixed', early_termination_fee_amount: value }).success, true)
  for (const value of [-1, 0.1, NaN, '1', true]) assert.equal(contractTermsSchema.safeParse({ ...terms, early_termination_fee_type: 'fixed', early_termination_fee_amount: value }).success, false)
  for (const value of ['0.01', '1.50', '999.99']) assert.equal(contractTermsSchema.safeParse({ ...terms, early_termination_fee_type: 'rent_multiple', early_termination_fee_multiplier: value }).success, true)
  for (const value of [null, '', '0', '1000', '1.001', '1e2', 1.5]) assert.equal(contractTermsSchema.safeParse({ ...terms, early_termination_fee_type: 'rent_multiple', early_termination_fee_multiplier: value }).success, false)
})
test('waiver snapshots require distinct legal codes and a real description', () => {
  const condition = { code: 'NOTICE_30', description: 'Điều kiện được thỏa thuận' }
  assert.equal(contractTermsSchema.safeParse({ ...terms, early_termination_waiver_conditions: [condition] }).success, true)
  for (const conditions of [[condition, condition], [{ ...condition, code: '' }], [{ ...condition, description: '  ' }], [{ ...condition, waived_by: 1 }]]) assert.equal(contractTermsSchema.safeParse({ ...terms, early_termination_waiver_conditions: conditions }).success, false)
})
test('activation accepts real readings as decimal strings without rounding or zero defaults', () => {
  for (const value of ['0', '0.01', '99999999.99']) assert.equal(activateContractSchema.safeParse({ ...readings, initial_electricity_reading: value }).success, true)
  for (const value of ['', -1, 1.25, '1.001', '-1', '100000000', '1e2', true, null]) assert.equal(activateContractSchema.safeParse({ ...readings, initial_electricity_reading: value }).success, false)
})
test('activation rejects client supplied actor code status and financial fields', () => {
  for (const field of ['activated_at', 'meter_gap_confirmed_by', 'contract_number', 'role', 'status', 'deposit_status']) assert.equal(activateContractSchema.safeParse({ ...readings, [field]: 'forged' }).success, false)
})

test('duplicate waiver error remains available at the RHF field-array root', async () => {
  const condition = { code: 'DUPLICATE', description: 'Điều kiện đã ký' }
  const result = await zodResolver(contractTermsSchema)({ ...terms, early_termination_waiver_conditions: [condition, condition] }, {}, {
    criteriaMode: 'firstError', shouldUseNativeValidation: false, fields: {}, names: ['early_termination_waiver_conditions.0.code', 'early_termination_waiver_conditions.1.code'],
  })
  assert.equal(result.errors.early_termination_waiver_conditions.root.message, 'Không được trùng mã điều kiện.')
})
