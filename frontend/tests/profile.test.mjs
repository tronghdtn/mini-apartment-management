import test from 'node:test'
import assert from 'node:assert/strict'
import { profileNameSchema, changePasswordSchema } from '../src/features/auth/profileSchemas.ts'

const input = { current_password: 'Old profile test!42', password: ' New profile test!43 ', password_confirmation: ' New profile test!43 ' }

test('profile name trims display text and rejects every identity/control field', () => {
  assert.deepEqual(profileNameSchema.parse({ full_name: '  Nguyễn An  ' }), { full_name: 'Nguyễn An' })
  for (const full_name of ['', '   ', 'a'.repeat(121), null, 42]) assert.equal(profileNameSchema.safeParse({ full_name }).success, false)
  for (const field of ['email', 'phone', 'role', 'status', 'user_id', 'password', 'id_number']) {
    assert.equal(profileNameSchema.safeParse({ full_name: 'Nguyễn An', [field]: 'forbidden' }).success, false, field)
  }
})

test('password change preserves all whitespace and requires confirmation and a different password', () => {
  assert.deepEqual(changePasswordSchema.parse(input), input)
  for (const change of [{ current_password: '' }, { password_confirmation: 'Mismatch' },
    { password: input.current_password, password_confirmation: input.current_password }, { user_id: 12 }, { password: 'short', password_confirmation: 'short' }]) {
    assert.equal(changePasswordSchema.safeParse({ ...input, ...change }).success, false)
  }
})

test('password limits use UTF-8 bytes and reject NUL without truncating credentials', () => {
  for (const password of ['a'.repeat(72), 'é'.repeat(36)]) {
    assert.equal(changePasswordSchema.parse({ ...input, password, password_confirmation: password }).password, password)
  }
  for (const password of ['a'.repeat(73), 'é'.repeat(37), 'Unsafe\0password']) {
    assert.equal(changePasswordSchema.safeParse({ ...input, password, password_confirmation: password }).success, false)
  }
  assert.equal(changePasswordSchema.safeParse({ ...input, current_password: 'Old\0password' }).success, false)
})
