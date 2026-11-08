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

test('resident batch form sends only filled meters with month converted to day 01', async () => {
  const { meterBatchSchema, toSubmissions } = await import('../src/features/meter-submissions/schemas.ts')
  const photo = new File(['png'], 'meter.png', { type: 'image/png' })
  const value = { month: '2026-11', reading_date: '2026-11-30', entries: [{ service_id: 1, current_reading: ' 1250.5 ', photo }, { service_id: 2, current_reading: '', photo: undefined }] }
  const parsed = meterBatchSchema.parse(value)
  assert.deepEqual(toSubmissions(parsed), [{ index: 0, input: { service_id: 1, period: '2026-11-01', reading_date: '2026-11-30', current_reading: '1250.5', photo } }])
  const both = { ...value, entries: [value.entries[0], { service_id: 2, current_reading: '20', photo }] }
  assert.equal(toSubmissions(meterBatchSchema.parse(both)).length, 2)
})

test('resident batch form requires one meter, a photo per filled meter and a reading date inside the month', () => {
  return import('../src/features/meter-submissions/schemas.ts').then(({ meterBatchSchema }) => {
    const photo = new File(['png'], 'meter.png', { type: 'image/png' })
    const base = { month: '2026-11', reading_date: '2026-11-30', entries: [{ service_id: 1, current_reading: '', photo: undefined }, { service_id: 2, current_reading: '', photo: undefined }] }
    assert.equal(meterBatchSchema.safeParse(base).success, false)
    assert.equal(meterBatchSchema.safeParse({ ...base, entries: [{ service_id: 1, current_reading: '12', photo: undefined }, base.entries[1]] }).success, false)
    assert.equal(meterBatchSchema.safeParse({ ...base, entries: [{ service_id: 1, current_reading: '1.001', photo }, base.entries[1]] }).success, false)
    assert.equal(meterBatchSchema.safeParse({ ...base, reading_date: '2026-10-31', entries: [{ service_id: 1, current_reading: '12', photo }, base.entries[1]] }).success, false)
    assert.equal(meterBatchSchema.safeParse({ ...base, month: '2026-13', entries: [{ service_id: 1, current_reading: '12', photo }, base.entries[1]] }).success, false)
  })
})
