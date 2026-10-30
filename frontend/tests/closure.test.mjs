import test from 'node:test'
import assert from 'node:assert/strict'
import { closurePreviewSchema, finalMeterPreviewSchema } from '../src/features/contracts/closure.ts'

test('closure input validates real calendar dates and trims note without client fee or classification', () => {
  assert.deepEqual(closurePreviewSchema.parse({ actual_end_date:'2026-10-01', closure_note:'  Lý do  ', early_termination_fee:0, closure_reason:'on_time' }), { actual_end_date:'2026-10-01', closure_note:'Lý do' })
  for (const actual_end_date of ['', '2026-02-30', '0999-12-31', '2026-10-01T00:00:00Z']) {
    assert.equal(closurePreviewSchema.safeParse({actual_end_date,closure_note:''}).success,false)
  }
  assert.equal(closurePreviewSchema.safeParse({actual_end_date:'2026-10-01',closure_note:'a'.repeat(65536)}).success,false)
})

test('final meter preview requires real decimal strings and keeps contract, price and money off the client input', () => {
  const valid = { actual_end_date:'2026-10-30', closure_note:' Bàn giao ', electricity_reading:'125.00', water_reading:'13.2' }
  assert.deepEqual(finalMeterPreviewSchema.parse(valid), {
    actual_end_date:'2026-10-30', closure_note:'Bàn giao', electricity_reading:'125.00', water_reading:'13.2',
  })
  assert.equal(finalMeterPreviewSchema.safeParse({ ...valid, fee:999 }).success, false)
  for (const reading of ['', '-1', '1e3', '100000000', '1.234', 125, true, null]) {
    assert.equal(finalMeterPreviewSchema.safeParse({ actual_end_date:'2026-10-30', closure_note:'', electricity_reading:reading, water_reading:'1' }).success, false)
  }
  assert.equal(finalMeterPreviewSchema.safeParse({ actual_end_date:'2026-10-30', closure_note:'', electricity_reading:'1', water_reading:'2', previous_reading:'0' }).success, false)
})
