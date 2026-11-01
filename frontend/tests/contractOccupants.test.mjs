import test from 'node:test'
import assert from 'node:assert/strict'
import { contractOccupantInputSchema, contractOccupantsSchema } from '../src/features/contracts/occupants.ts'

test('occupant form trims names and allows missing optional information as empty strings', () => {
  assert.deepEqual(contractOccupantInputSchema.parse({ full_name: '  Nguyễn A  ', phone: ' ', relationship: ' Bạn ' }),
    { full_name: 'Nguyễn A', phone: '', relationship: 'Bạn' })
})

test('occupant form rejects invalid identity values and database length overflow', () => {
  const base = { full_name: 'Tên minh họa', phone: '', relationship: '' }
  for (const input of [{ ...base, full_name: ' ' }, { ...base, full_name: 'a'.repeat(121) },
    { ...base, phone: '1'.repeat(21) }, { ...base, relationship: 'x'.repeat(51) },
    { ...base, phone: false }, { ...base, full_name: null }]) {
    assert.equal(contractOccupantInputSchema.safeParse(input).success, false)
  }
})

test('occupant response accepts real empty and read-only lists without inventing counts', () => {
  const data = { contract_id: 1, contract_status: 'draft', occupant_count: 4, max_occupants: 4,
    registered_count: 1, has_count_mismatch: true, can_edit: true, revision: 'a'.repeat(64), occupants: [] }
  assert.equal(contractOccupantsSchema.parse(data).occupant_count, 4)
  assert.deepEqual(contractOccupantsSchema.parse(data).occupants, [])
  assert.equal(contractOccupantsSchema.parse({ ...data, contract_status: 'terminated', can_edit: false }).can_edit, false)
  assert.equal(contractOccupantsSchema.safeParse({ ...data, revision: 'bad' }).success, false)
  assert.equal(contractOccupantsSchema.safeParse({ ...data, occupants: [{ id: 1, full_name: 'Tên', phone: false, relationship: null }] }).success, false)
})
