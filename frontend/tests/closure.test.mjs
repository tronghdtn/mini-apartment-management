import test from 'node:test'
import assert from 'node:assert/strict'
import { closurePreviewSchema } from '../src/features/contracts/closure.ts'

test('closure input validates real calendar dates and trims note without client fee or classification', () => {
  assert.deepEqual(closurePreviewSchema.parse({ actual_end_date:'2026-10-01', closure_note:'  Lý do  ', early_termination_fee:0, closure_reason:'on_time' }), { actual_end_date:'2026-10-01', closure_note:'Lý do' })
  for (const actual_end_date of ['', '2026-02-30', '0999-12-31', '2026-10-01T00:00:00Z']) {
    assert.equal(closurePreviewSchema.safeParse({actual_end_date,closure_note:''}).success,false)
  }
  assert.equal(closurePreviewSchema.safeParse({actual_end_date:'2026-10-01',closure_note:'a'.repeat(65536)}).success,false)
})
