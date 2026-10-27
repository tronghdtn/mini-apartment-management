import test from 'node:test'
import assert from 'node:assert/strict'
import { daySettingSchema } from '../src/features/settings/schemas.ts'

test('days keep exact integer boundaries 1 to 365 and trim surrounding whitespace', () => {
  for (const value of ['1', '5', '30', '365']) assert.equal(daySettingSchema.safeParse({ value }).success, true)
  assert.deepEqual(daySettingSchema.parse({ value: ' 30 ' }), { value: '30' })
})

test('days reject blank zero negative fractional scientific and non-string input before any request', () => {
  for (const value of ['', ' ', '0', '366', '-1', '1.5', '1e2', 'Infinity', null, true, 5, ['5']]) {
    assert.equal(daySettingSchema.safeParse({ value }).success, false)
  }
})

test('day forms cannot submit keys bank data or other server-controlled configuration', () => {
  for (const field of ['key', 'group', 'type', 'id', 'bank.account_number', 'system.name']) {
    assert.equal(daySettingSchema.safeParse({ value: '5', [field]: 'test' }).success, false)
  }
})
