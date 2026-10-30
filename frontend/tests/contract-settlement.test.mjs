import test from 'node:test'
import assert from 'node:assert/strict'
import { terminateContractSchema } from '../src/features/contracts/settlement.ts'
import { formatVND } from '../src/lib/format.ts'

const input = { expected_revision: 'a'.repeat(64), confirmed: true }
test('closing requires deliberate boolean confirmation', () => {
  assert.deepEqual(terminateContractSchema.parse(input), input)
  for (const confirmed of [false, undefined, null, 'true', '1', 1, 0]) {
    assert.equal(terminateContractSchema.safeParse({ ...input, confirmed }).success, false)
  }
})
test('closing requires a complete current financial revision', () => {
  for (const expected_revision of ['', 'A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), null, 123]) {
    assert.equal(terminateContractSchema.safeParse({ ...input, expected_revision }).success, false)
  }
})
test('client cannot supply money, role, invoice status or a claimed refund transfer', () => {
  for (const field of ['role', 'status', 'amount', 'deposit_amount', 'deposit_deducted_amount', 'deposit_refund_amount', 'paid_amount', 'refund_paid', 'user_id']) {
    assert.equal(terminateContractSchema.safeParse({ ...input, [field]: 1 }).success, false)
  }
})
test('large contract-wide debt is displayed without converting to float', () => {
  assert.equal(formatVND(BigInt('18014398509481982')), '18.014.398.509.481.982 ₫')
  assert.equal(formatVND(0n), '0 ₫')
  assert.equal(formatVND(2900000), '2.900.000 ₫')
})
