import test from 'node:test'
import assert from 'node:assert/strict'
import { userDebtSummarySchema } from '../src/features/user-management/debtSummary.ts'
import { formatVND } from '../src/lib/format.ts'

const zero = { outstanding_amount: '0', outstanding_invoice_count: 0, overdue_amount: '0', overdue_invoice_count: 0 }
test('account debt summary keeps zero and aggregate VND beyond Number safe integer exact', () => {
  assert.deepEqual(userDebtSummarySchema.parse(zero), zero)
  const parsed = userDebtSummarySchema.parse({ ...zero, outstanding_amount: '18014398509481983', outstanding_invoice_count: 3 })
  assert.equal(formatVND(BigInt(parsed.outstanding_amount)), '18.014.398.509.481.983 ₫')
})
test('account debt summary refuses malformed money or counts instead of showing a fake zero', () => {
  for (const change of [{ outstanding_amount: 1000 }, { outstanding_amount: '1.5' }, { overdue_amount: '-1' }, { overdue_amount: '1e16' },
    { outstanding_invoice_count: 0.5 }, { overdue_invoice_count: -1 }, { outstanding_amount: undefined }]) {
    assert.equal(userDebtSummarySchema.safeParse({ ...zero, ...change }).success, false)
  }
})
