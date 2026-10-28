import test from 'node:test'
import assert from 'node:assert/strict'
import { submissionSchema, rejectionSchema, validMeterPhoto } from '../src/features/meter-submissions/schemas.ts'

test('resident payload requires one real File and excludes forged ownership and money', () => {
  const photo = new File(['png'], 'meter.png', { type: 'image/png' })
  const input = { service_id: 2, period: '2026-10-01', reading_date: '2026-11-01', current_reading: '112.35', photo }
  assert.deepEqual(submissionSchema.parse({ ...input, room_id: 8, contract_id: 7, amount: 999 }), input)
  for (const change of [{ photo: undefined }, { photo: { name: 'a.png', type: 'image/png', size: 1 } }, { period: '2026-10-02' }, { current_reading: '1.001' }, { reading_date: '2026-09-30' }]) assert.equal(submissionSchema.safeParse({ ...input, ...change }).success, false)
})
test('photo and rejection limits reject unsupported files and blank reasons', () => {
  assert.equal(validMeterPhoto({ name: 'a.webp', type: 'image/webp', size: 5 * 1024 * 1024 }), true)
  for (const change of [{ name: 'a.svg' }, { type: 'text/html' }, { size: 0 }, { size: 5 * 1024 * 1024 + 1 }]) assert.equal(validMeterPhoto({ name: 'a.png', type: 'image/png', size: 8, ...change }), false)
  assert.equal(rejectionSchema.safeParse({ rejection_reason: '  ' }).success, false)
  assert.deepEqual(rejectionSchema.parse({ rejection_reason: '  Ảnh mờ  ' }), { rejection_reason: 'Ảnh mờ' })
})
