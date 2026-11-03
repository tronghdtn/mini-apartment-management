import test from 'node:test'
import assert from 'node:assert/strict'
import { changeEmailSchema, forgotPasswordSchema, resetPasswordSchema, verifyLinkSchema } from '../src/features/auth/emailSchemas.ts'

test('forgot password requires one valid email and nothing else', () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: 'cu.dan@example.test' }).success, true)
  for (const input of [{ email: '' }, { email: 'not-an-email' }, { email: 'a@example.test', user_id: 1 }]) {
    assert.equal(forgotPasswordSchema.safeParse(input).success, false)
  }
})

test('reset password keeps the registration rules and matching confirmation', () => {
  assert.equal(resetPasswordSchema.safeParse({ password: 'Matkhau moi 2026', password_confirmation: 'Matkhau moi 2026' }).success, true)
  for (const input of [{ password: 'short', password_confirmation: 'short' }, { password: 'Matkhau moi 2026', password_confirmation: 'khac' },
    { password: 'ế'.repeat(25), password_confirmation: 'ế'.repeat(25) }]) {
    assert.equal(resetPasswordSchema.safeParse(input).success, false)
  }
})

test('change email needs the new address and current password', () => {
  assert.equal(changeEmailSchema.safeParse({ email: 'moi@example.test', current_password: 'x' }).success, true)
  assert.equal(changeEmailSchema.safeParse({ email: '', current_password: 'x' }).success, false)
  assert.equal(changeEmailSchema.safeParse({ email: 'moi@example.test', current_password: '' }).success, false)
})

test('verify link parameters must keep the exact signed shape', () => {
  const link = { id: '12', hash: 'a'.repeat(40), expires: '1793700000', signature: 'b'.repeat(64) }
  assert.equal(verifyLinkSchema.safeParse(link).success, true)
  for (const change of [{ id: '0' }, { hash: 'A'.repeat(40) }, { signature: 'b'.repeat(63) }, { expires: null }]) {
    assert.equal(verifyLinkSchema.safeParse({ ...link, ...change }).success, false)
  }
})
