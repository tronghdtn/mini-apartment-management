import test from 'node:test'
import assert from 'node:assert/strict'
import { userStatusSchema } from '../src/features/user-management/schemas.ts'

test('status request accepts explicit active and locked states', () => {
  for (const status of ['active', 'locked']) assert.deepEqual(userStatusSchema.parse({ status }), { status })
})

test('status request rejects missing malformed and unknown states', () => {
  for (const input of [{}, { status: '' }, { status: null }, { status: true }, { status: ['locked'] }, { status: 'inactive' }]) {
    assert.equal(userStatusSchema.safeParse(input).success, false)
  }
})

test('status request cannot mix role credentials identity or legal data into the mutation', () => {
  for (const field of ['role', 'password', 'email', 'phone', 'id_number', 'full_name']) {
    assert.equal(userStatusSchema.safeParse({ status: 'active', [field]: null }).success, false)
  }
})
