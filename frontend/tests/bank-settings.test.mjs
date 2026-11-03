import test from 'node:test'
import assert from 'node:assert/strict'
import { systemSettingSchema } from '../src/features/settings/schemas.ts'

test('bank account number accepts empty (clear) or 6-20 ASCII digits only, matching DB-D94', () => {
  const schema = systemSettingSchema('bank.account_number')
  for (const value of ['', '123456', '12345678901234567890', '  0071000123456  ']) assert.equal(schema.safeParse({ value }).success, true, value)
  for (const value of ['12345', '123456789012345678901', '0071 000 123', '0071-000123', 'ABC123456', '１２３４５６']) assert.equal(schema.safeParse({ value }).success, false, value)
})

test('bank name and holder are limited to 100 Unicode characters', () => {
  for (const key of ['bank.name', 'bank.account_holder']) {
    const schema = systemSettingSchema(key)
    assert.equal(schema.safeParse({ value: 'ế'.repeat(100) }).success, true)
    assert.equal(schema.safeParse({ value: 'ế'.repeat(101) }).success, false)
  }
  assert.equal(systemSettingSchema('system.name').safeParse({ value: 'ế'.repeat(191) }).success, true)
})
