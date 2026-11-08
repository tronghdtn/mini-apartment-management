import test from 'node:test'
import assert from 'node:assert/strict'
import { AxiosError } from 'axios'
import { loginSchema, registerSchema } from '../src/features/auth/schemas.ts'
import { accountDestination, safeDestination } from '../src/features/auth/types.ts'
import { authErrorMessage, applyAuthErrors } from '../src/features/auth/errors.ts'

globalThis.window = { location: { origin: 'http://localhost:8081' } }
const user = { id: 1, full_name: 'Test', phone: '0901234567', email: null, role: 'user', status: 'active' }
const valid = { full_name: ' Test ', phone: '+84901234567', email: '', password: 'TestPass123!', password_confirmation: 'TestPass123!' }

test('identifier accepts email and phone; does not impose new-password minimum at login', () => {
  for (const identifier of ['a@example.test', '0901234567', '+84901234567']) assert.equal(loginSchema.safeParse({ identifier, password: 'old' }).success, true)
  assert.equal(loginSchema.safeParse({ identifier: ' ', password: 'x' }).success, false)
})
test('registration allows absent email content and normalizes whitespace without trimming password', () => {
  const result = registerSchema.parse(valid)
  assert.equal(result.email, '')
  assert.equal(result.full_name, 'Test')
  assert.equal(result.password, valid.password)
  for (const email of ['person@example.test', 'person#tag@example.test', 'person+tag@example.test']) assert.equal(registerSchema.safeParse({ ...valid, email }).success, true)
})
test('invalid email, phone, mismatch and blank name are rejected', () => {
  for (const change of [{ email: 'bad' }, { phone: 'abc' }, { phone: '090 1234567' }, { full_name: ' ' }, { password_confirmation: 'different' }]) assert.equal(registerSchema.safeParse({ ...valid, ...change }).success, false)
})
test('password protects bcrypt byte boundary and NUL, including multibyte input', () => {
  assert.equal(registerSchema.safeParse({ ...valid, password: 'x'.repeat(72), password_confirmation: 'x'.repeat(72) }).success, true)
  for (const password of ['x'.repeat(73), 'a'.repeat(7), 'é'.repeat(37), 'abcdefg\0h']) assert.equal(registerSchema.safeParse({ ...valid, password, password_confirmation: password }).success, false)
})
test('all five roles land in their mounted area and only admin goes to admin area', () => {
  assert.equal(accountDestination({ ...user, role: 'user' }), '/account/profile')
  assert.equal(accountDestination({ ...user, role: 'resident' }), '/resident')
  assert.equal(accountDestination({ ...user, role: 'technician' }), '/staff/maintenance-requests')
  assert.equal(accountDestination({ ...user, role: 'guard' }), '/staff/appointments')
  assert.equal(accountDestination({ ...user, role: 'admin' }), '/admin')
})
test('return-to distinguishes resident technician and guard routes without widening other roles', () => {
  const resident = { ...user, role: 'resident' }
  const technician = { ...user, role: 'technician' }
  const guard = { ...user, role: 'guard' }
  assert.equal(safeDestination('/resident/contracts/12', resident), '/resident/contracts/12')
  assert.equal(safeDestination('/resident-other', resident), '/resident')
  assert.equal(safeDestination('/staff/maintenance-requests/12', technician), '/staff/maintenance-requests/12')
  assert.equal(safeDestination('/staff/appointments', technician), '/staff/maintenance-requests')
  assert.equal(safeDestination('/staff/appointments', guard), '/staff/appointments')
  assert.equal(safeDestination('/staff/maintenance-requests/12', guard), '/staff/appointments')
  for (const account of [resident, technician, guard]) assert.equal(safeDestination('/admin/settings', account), accountDestination(account))
})
test('return-to prevents external URLs, backslashes and wrong-role paths', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/admin', '/staff', '/resident', '/login', undefined]) assert.equal(safeDestination(value, user), '/account/profile')
  assert.equal(safeDestination('/account/profile', user), '/account/profile')
  assert.equal(safeDestination('/account/appointments', user), '/account/appointments')
  assert.equal(safeDestination('/admin/rooms?x=1', { ...user, role: 'admin' }), '/admin/rooms?x=1')
  assert.equal(safeDestination('/admin-other', { ...user, role: 'admin' }), '/admin')
})
function failure(status, data = {}, headers = {}) {
  return new AxiosError('private diagnostic', undefined, undefined, undefined, { status, data, headers })
}
test('API failures get safe Vietnamese messages, including retry-after and network', () => {
  for (const status of [401, 403, 409, 419, 422, 429, 500]) assert.equal(authErrorMessage(failure(status, { message: 'SQL secret' })).includes('SQL secret'), false)
  assert.match(authErrorMessage(failure(429, {}, { 'retry-after': '37' })), /37/)
  assert.match(authErrorMessage(new Error('sensitive')), /kết nối/)
})
test('422 maps only allowlisted server fields and keeps errors visible', () => {
  const mapped = []
  applyAuthErrors(failure(422, { errors: { identifier: ['Sai thông tin'], role: ['Admin'] } }), (field, error) => mapped.push([field, error.message]), ['identifier', 'password'])
  assert.deepEqual(mapped.map(([field]) => field), ['identifier', 'root'])
  assert.equal(mapped[0][1], 'Sai thông tin')
})


test('appointment navigation is shared by desktop/mobile without extending Admin or Guard menus', async () => {
  const { appointmentsDestination } = await import('../src/features/auth/types.ts')
  for (const role of ['user', 'resident', 'technician']) assert.equal(appointmentsDestination(role), '/account/appointments')
  for (const role of ['admin', 'guard']) assert.equal(appointmentsDestination(role), null)
})
