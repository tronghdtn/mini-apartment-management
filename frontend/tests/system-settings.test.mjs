import test from 'node:test'
import assert from 'node:assert/strict'
import { systemSettingSchema, daySettingSchema } from '../src/features/settings/schemas.ts'

test('system settings trim input, allow clearing, and reject non-text or control fields', () => {
  for (const key of ['system.name', 'system.contact_phone', 'system.contact_email']) {
    const schema = systemSettingSchema(key)
    assert.deepEqual(schema.parse({ value: '   ' }), { value: '' })
    for (const value of [null, 1, true, [], {}]) assert.equal(schema.safeParse({ value }).success, false)
    assert.equal(schema.safeParse({ value: '', role: 'admin' }).success, false)
  }
  assert.deepEqual(systemSettingSchema('system.name').parse({ value: '  Tòa nhà An  ' }), { value: 'Tòa nhà An' })
})

test('contact fields enforce approved lengths and email format without changing phone identity', () => {
  for (const value of ['ế'.repeat(191), '😀'.repeat(191)]) assert.equal(systemSettingSchema('system.name').safeParse({ value }).success, true)
  assert.equal(systemSettingSchema('system.name').safeParse({ value: 'a'.repeat(192) }).success, false)
  assert.equal(systemSettingSchema('system.contact_phone').parse({ value: ' +84 (28) 1234 5678 ' }).value, '+84 (28) 1234 5678')
  assert.equal(systemSettingSchema('system.contact_phone').safeParse({ value: '1'.repeat(31) }).success, false)
  assert.equal(systemSettingSchema('system.contact_email').parse({ value: ' contact@example.test ' }).value, 'contact@example.test')
  assert.equal(systemSettingSchema('system.contact_email').safeParse({ value: 'bad-email' }).success, false)
})

test('day settings retain their approved independent range', () => {
  for (const value of ['1', '365']) assert.equal(daySettingSchema.safeParse({ value }).success, true)
  for (const value of ['0', '366', '1.5', '']) assert.equal(daySettingSchema.safeParse({ value }).success, false)
})
