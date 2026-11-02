import test from 'node:test'
import assert from 'node:assert/strict'
import { canConfirmDepositRefund, confirmDepositRefundSchema, terminateContractSchema } from '../src/features/contracts/settlement.ts'
import { formatVND } from '../src/lib/format.ts'

const input = { expected_revision: 'a'.repeat(64), confirmed: true }

test('refund confirmation requires exact positive integral amount, revision and intentional acknowledgement', () => {
  const refund = { expected_revision: 'a'.repeat(64), expected_refund_amount: 2100000, confirmed_paid: true }
  assert.deepEqual(confirmDepositRefundSchema.parse(refund), refund)
  for (const bad of [{ confirmed_paid: false }, { confirmed_paid: '1' }, { expected_refund_amount: true },
    { expected_refund_amount: 0 }, { expected_refund_amount: 1.5 }, { expected_refund_amount: Number.MAX_SAFE_INTEGER + 1 },
    { expected_revision: 'old' }, { deposit_refunded_by: 4 }, { deposit_refunded_at: '2026-11-02' }]) {
    assert.equal(confirmDepositRefundSchema.safeParse({ ...refund, ...bad }).success, false)
  }
})

test('refund action remains unavailable for legacy schemas, active contracts, zero or already repaid deposits', () => {
  const closed = { status: 'terminated', deposit_status: 'settled', deposit_refund_amount: 2100000,
    deposit_refunded_at: null, deposit_refunded_by: null, refund_outstanding_amount: 2100000 }
  assert.equal(canConfirmDepositRefund(closed), true)
  for (const bad of [{ status: 'active' }, { deposit_status: 'held' }, { deposit_refund_amount: 0 },
    { deposit_refunded_at: undefined }, { deposit_refunded_by: undefined }, { refund_outstanding_amount: undefined },
    { refund_outstanding_amount: 0 }, { deposit_refunded_at: '2026-11-02T00:00:00Z', deposit_refunded_by: 8, refund_outstanding_amount: 0 }]) {
    assert.equal(canConfirmDepositRefund({ ...closed, ...bad }), false)
  }
})
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
