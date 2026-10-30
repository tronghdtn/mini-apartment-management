import test from 'node:test'
import assert from 'node:assert/strict'
import { contractInspectionSchema } from '../src/features/contracts/inspection.ts'

test('inspection result and note are validated without client supplied actor or time', () => {
  const input = { inspection_result: 'damaged', inspection_note: '  Vết nứt cạnh cửa  ', photos: [], inspected_by: 7, inspected_at: '2026-10-30T10:00:00Z' }
  assert.deepEqual(contractInspectionSchema.parse(input), {
    inspection_result: 'damaged', inspection_note: 'Vết nứt cạnh cửa', photos: [],
  })
  for (const inspection_result of ['', 'unknown']) {
    assert.equal(contractInspectionSchema.safeParse({ ...input, inspection_result }).success, false)
  }
  assert.equal(contractInspectionSchema.safeParse({ ...input, inspection_note: 'x'.repeat(65536) }).success, false)
})

test('inspection accepts up to five ordinary image files and rejects unsupported or oversized files', () => {
  const photo = new File(['png'], 'room.png', { type: 'image/png' })
  assert.equal(contractInspectionSchema.safeParse({ inspection_result: 'no_damage', inspection_note: '', photos: Array(5).fill(photo) }).success, true)
  assert.equal(contractInspectionSchema.safeParse({ inspection_result: 'no_damage', inspection_note: '', photos: Array(6).fill(photo) }).success, false)
  for (const file of [
    new File(['svg'], 'room.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
  ]) {
    assert.equal(contractInspectionSchema.safeParse({ inspection_result: 'no_damage', inspection_note: '', photos: [file] }).success, false)
  }
})
