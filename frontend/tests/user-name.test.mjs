import test from 'node:test'
import assert from 'node:assert/strict'
import { userNameSchema } from '../src/features/user-management/schemas.ts'

test('name update trims and accepts Vietnamese names and the existing 120-character boundary', () => {
  assert.deepEqual(userNameSchema.parse({ full_name: '  Nguyễn Văn An  ' }), { full_name: 'Nguyễn Văn An' })
  assert.equal(userNameSchema.parse({ full_name: 'a'.repeat(120) }).full_name.length, 120)
})
test('name update rejects missing empty malformed or overlong names', () => {
  for (const input of [{}, ...['', '   ', null, [], true, 'a'.repeat(121)].map(full_name => ({ full_name }))]) {
    assert.equal(userNameSchema.safeParse(input).success, false)
  }
})
test('name update rejects status role identity credentials and legal data', () => {
  for (const field of ['status', 'role', 'email', 'phone', 'password', 'id_number']) {
    assert.equal(userNameSchema.safeParse({ full_name: 'Nguyễn Văn An', [field]: null }).success, false)
  }
})
