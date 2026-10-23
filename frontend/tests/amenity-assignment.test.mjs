import test from 'node:test'
import assert from 'node:assert/strict'
import { amenityAssignmentSchema } from '../src/features/amenity-assignment/schemas.ts'

test('assignment form allows explicit active selections and clearing with an empty list', () => {
  assert.deepEqual(amenityAssignmentSchema.parse({ amenity_ids: [3, 8] }), { amenity_ids: [3, 8] })
  assert.deepEqual(amenityAssignmentSchema.parse({ amenity_ids: [] }), { amenity_ids: [] })
})

test('assignment form requires a list of positive JSON-safe integer identifiers', () => {
  for (const input of [{}, { amenity_ids: null }, { amenity_ids: '3' }, { amenity_ids: { selected: 3 } }]) {
    assert.equal(amenityAssignmentSchema.safeParse(input).success, false)
  }
  for (const id of [0, -1, 1.5, NaN, Infinity, true, false, '3', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(amenityAssignmentSchema.safeParse({ amenity_ids: [id] }).success, false)
  }
  assert.equal(amenityAssignmentSchema.safeParse({ amenity_ids: [Number.MAX_SAFE_INTEGER] }).success, true)
})

test('duplicate direct selections are rejected instead of being silently rewritten', () => {
  for (const amenity_ids of [[3, 3], [3, 8, 3]]) assert.equal(amenityAssignmentSchema.safeParse({ amenity_ids }).success, false)
  assert.deepEqual(amenityAssignmentSchema.parse({ amenity_ids: [8, 3] }), { amenity_ids: [8, 3] })
})

test('assignment form excludes inherited/effective data and protected state from its payload', () => {
  const parsed = amenityAssignmentSchema.parse({
    amenity_ids: [8], inherited: [3], effective: [3, 8], status: 'occupied', role: 'admin',
    base_price: 1, price: 1, contract_id: 99, is_archived: false,
  })
  assert.deepEqual(parsed, { amenity_ids: [8] })
})

test('form validation does not mutate selections or infer inherited IDs', () => {
  const direct = [8]
  const inherited = [3]
  const source = { amenity_ids: direct, inherited }
  const parsed = amenityAssignmentSchema.parse(source)
  assert.deepEqual(source, { amenity_ids: [8], inherited: [3] })
  assert.deepEqual(parsed.amenity_ids, [8])
  parsed.amenity_ids.push(9)
  assert.deepEqual(direct, [8])
})
