import test from 'node:test'
import assert from 'node:assert/strict'
import { finalInvoiceInputSchema, buildFinalInvoiceFormData } from '../src/features/contracts/finalInvoice.ts'

const closure = { actual_end_date: '2026-10-30', closure_note: 'Lý do test', electricity_reading: '125.00', water_reading: '13.00' }
const empty = { damages: [], waiver_code: '', waiver_note: '', waiver_evidence: [] }
const photo = () => new File([new Uint8Array([137, 80, 78, 71])], 'proof.png', { type: 'image/png' })
const damage = () => ({ description: 'Kính cửa', reason: 'Nứt kính', basis: 'Báo giá', amount: 300000, photos: [photo()] })
const revision = 'a'.repeat(64)

test('final invoice form serializes only approved fields, decimal strings and per-line private evidence', () => {
  const body = buildFinalInvoiceFormData(closure, { ...empty, damages: [damage()] }, revision)
  assert.equal(body.get('electricity_reading'), '125.00')
  assert.equal(body.get('damages[0][amount]'), '300000')
  assert.equal(body.get('damage_photos[0][]').name, 'proof.png')
  for (const key of ['total_amount', 'role', 'status', 'unit_price', 'early_termination_fee']) assert.equal(body.has(key), false)
  const noDamage = buildFinalInvoiceFormData(closure, empty, revision)
  assert.equal([...noDamage.keys()].some(key => key.startsWith('damage') || key.startsWith('waiver')), false)
})

test('damage validation rejects missing basis, unsafe VND, missing/unsupported/oversized images and extra fields', () => {
  for (const change of [{ basis: '' }, { reason: '' }, { description: '' }, { amount: 0 }, { amount: 0.5 }, { amount: Number.MAX_SAFE_INTEGER + 1 },
    { amount: '300000' }, { photos: [] }, { photos: Array.from({ length: 6 }, photo) },
    { photos: [new File(['svg'], 'fake.svg', { type: 'image/svg+xml' })] },
    { photos: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })] }, { unit_price: 1 }]) {
    assert.equal(finalInvoiceInputSchema.safeParse({ ...empty, damages: [{ ...damage(), ...change }] }).success, false)
  }
  assert.equal(finalInvoiceInputSchema.safeParse({ ...empty, damages: Array.from({ length: 11 }, damage) }).success, false)
  assert.equal(finalInvoiceInputSchema.safeParse({ ...empty, total_amount: 1 }).success, false)
})

test('waiver requires a signed-condition identifier, note and private image together, without client fee', () => {
  const valid = { ...empty, waiver_code: 'agreed', waiver_note: '  Căn cứ đã ký  ', waiver_evidence: [photo()] }
  assert.equal(finalInvoiceInputSchema.parse(valid).waiver_note, 'Căn cứ đã ký')
  for (const change of [{ waiver_note: '' }, { waiver_evidence: [] }, { waiver_code: '' }, { waiver_note: 'x'.repeat(2001) }]) {
    assert.equal(finalInvoiceInputSchema.safeParse({ ...valid, ...change }).success, false)
  }
  const body = buildFinalInvoiceFormData(closure, valid, revision)
  assert.equal(body.get('waiver_note'), 'Căn cứ đã ký')
  assert.equal(body.getAll('waiver_evidence[]').length, 1)
})

test('serialization rejects invalid closure and revision rather than coercing readings or accepting a stale preview payload', () => {
  for (const change of [{ electricity_reading: 125 }, { water_reading: '-1' }, { actual_end_date: '2026-02-30' }, { total_amount: 0 }]) {
    assert.throws(() => buildFinalInvoiceFormData({ ...closure, ...change }, empty, revision))
  }
  assert.throws(() => buildFinalInvoiceFormData(closure, empty, ''))
})
