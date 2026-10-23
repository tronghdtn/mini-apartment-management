import test from 'node:test'
import assert from 'node:assert/strict'
import { staffUserSchema } from '../src/features/user-management/schemas.ts'
import { registerSchema } from '../src/features/auth/schemas.ts'

const staff = { full_name: ' Nhân viên mới ', phone: ' +84901234567 ', email: '', role: 'technician', password: 'Staff Private!42', password_confirmation: 'Staff Private!42' }

test('staff creation permits only the two approved roles and never substitutes another role', () => {
  for (const role of ['technician', 'guard']) assert.equal(staffUserSchema.parse({ ...staff, role }).role, role)
  for (const role of ['admin', 'resident', 'user', 'staff', '', null, ['guard']]) assert.equal(staffUserSchema.safeParse({ ...staff, role }).success, false)
})

test('staff email is optional in the form and identifiers are trimmed without changing the password', () => {
  const password = '  Staff Private!42  '
  const parsed = staffUserSchema.parse({ ...staff, email: '  STAFF@Example.test ', password, password_confirmation: password })
  assert.equal(parsed.full_name, 'Nhân viên mới')
  assert.equal(parsed.phone, '+84901234567')
  assert.equal(parsed.email, 'STAFF@Example.test')
  assert.equal(parsed.password, password)
  assert.equal(staffUserSchema.parse({ ...staff, email: '  ' }).email, '')
})

test('staff form rejects missing or malformed names phone numbers and real email values', () => {
  for (const change of [{ full_name: '' }, { full_name: 'a'.repeat(121) }, { phone: '123456789' }, { phone: '1234567890123456' }, { phone: '09-abcd' }, { phone: [] }, { email: 'not-email' }, { email: null }, { email: 'a'.repeat(181)+'@example.test' }]) {
    assert.equal(staffUserSchema.safeParse({ ...staff, ...change }).success, false)
  }
  for (const phone of ['0901234567', '+84901234567', '84901234567']) assert.equal(staffUserSchema.safeParse({ ...staff, phone }).success, true)
})

test('staff passwords are required and confirmed with field-specific feedback', () => {
  for (const password of ['', 'short']) assert.equal(staffUserSchema.safeParse({ ...staff, password, password_confirmation: password }).success, false)
  const mismatch = staffUserSchema.safeParse({ ...staff, password_confirmation: 'different password' })
  assert.equal(mismatch.success, false)
  assert.ok(mismatch.error.issues.some(issue => issue.path.join('.') === 'password_confirmation'))
})

test('staff bcrypt boundaries count UTF-8 bytes and reject NUL before hashing', () => {
  for (const password of ['a'.repeat(72), 'ế'.repeat(24)]) assert.equal(staffUserSchema.safeParse({ ...staff, password, password_confirmation: password }).success, true)
  for (const password of ['a'.repeat(73), 'ế'.repeat(25), 'private\0password']) assert.equal(staffUserSchema.safeParse({ ...staff, password, password_confirmation: password }).success, false)
})

test('staff form strips server-controlled permissions state legal fields and identifiers', () => {
  const parsed = staffUserSchema.parse({ ...staff, id: 9, status: 'locked', user_id: 10, email_verified_at: '2026-10-23', id_number: 'private', remember_token: 'private', has_active_contract: true, active_contract: { id: 7 }, permissions: ['admin'], is_admin: true })
  assert.deepEqual(Object.keys(parsed).sort(), ['full_name', 'phone', 'email', 'role', 'password', 'password_confirmation'].sort())
})

test('registration and staff creation reuse the same account validation for ordinary fields', () => {
  const { role, ...registration } = staff
  assert.equal(role, 'technician')
  const registered = registerSchema.parse(registration)
  const created = staffUserSchema.parse(staff)
  for (const field of Object.keys(registration)) assert.equal(created[field], registered[field])
  for (const change of [{ password: 'short', password_confirmation: 'short' }, { phone: 'invalid' }, { email: 'invalid' }]) {
    assert.equal(registerSchema.safeParse({ ...registration, ...change }).success, staffUserSchema.safeParse({ ...staff, ...change }).success)
  }
})
