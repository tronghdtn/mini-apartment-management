import test from 'node:test'
import assert from 'node:assert/strict'
import { userFiltersSchema, userPageSchema } from '../src/features/user-management/schemas.ts'
import { managedUserGenderLabel } from '../src/features/user-management/types.ts'

const empty = { role: '', status: '', has_active_contract: '', q: '' }

test('user filters permit all accounts or the five confirmed roles without creating another role', () => {
  assert.deepEqual(userFiltersSchema.parse(empty), empty)
  for (const role of ['user', 'resident', 'admin', 'technician', 'guard']) assert.equal(userFiltersSchema.safeParse({ ...empty, role }).success, true)
  for (const role of ['owner', 'staff', 'Admin', null, ['admin']]) assert.equal(userFiltersSchema.safeParse({ ...empty, role }).success, false)
})

test('status and active-contract filters remain separate explicit choices', () => {
  for (const status of ['', 'active', 'locked']) for (const has_active_contract of ['', '0', '1']) {
    assert.equal(userFiltersSchema.safeParse({ ...empty, status, has_active_contract }).success, true)
  }
  for (const change of [{ status: 'disabled' }, { status: false }, { has_active_contract: '2' }, { has_active_contract: 1 }, { has_active_contract: true }]) assert.equal(userFiltersSchema.safeParse({ ...empty, ...change }).success, false)
})

test('user search trims outer spaces while retaining literal percent underscore and backslash', () => {
  for (const q of ['%', '_', '\\', 'Tên người dùng', 'user@example.test', '0901234567']) {
    assert.equal(userFiltersSchema.parse({ ...empty, q: '  '+q+'  ' }).q, q)
  }
})

test('user search enforces 191 Unicode characters without counting a supplementary character twice', () => {
  for (const q of ['a'.repeat(191), 'ế'.repeat(191), '😀'.repeat(191)]) assert.equal(userFiltersSchema.safeParse({ ...empty, q }).success, true)
  for (const q of ['a'.repeat(192), 'ế'.repeat(192), '😀'.repeat(192), null, ['name']]) assert.equal(userFiltersSchema.safeParse({ ...empty, q }).success, false)
})

test('pagination accepts the supported integer range and never rounds an invalid page', () => {
  for (const page of [1, 20, 2147483647]) assert.equal(userPageSchema.safeParse(page).success, true)
  for (const page of [0, -1, 1.5, 2147483648, NaN, Infinity, '1', true, false]) assert.equal(userPageSchema.safeParse(page).success, false)
})

test('filter schema forwards only read filters and excludes profile or permission mutation fields', () => {
  assert.deepEqual(userFiltersSchema.parse({ ...empty, user_id: 9, id_number: 'private', password: 'private', new_role: 'admin', contract_id: 12 }), empty)
})

test('gender display preserves unknown values instead of inventing a legal profile value', () => {
  assert.equal(managedUserGenderLabel('male'), 'Nam')
  assert.equal(managedUserGenderLabel('female'), 'Nữ')
  assert.equal(managedUserGenderLabel('other'), 'Khác')
  assert.equal(managedUserGenderLabel(null), 'Chưa cập nhật')
  assert.equal(managedUserGenderLabel('legacy'), 'legacy')
  assert.equal(managedUserGenderLabel('__proto__'), '__proto__')
})
