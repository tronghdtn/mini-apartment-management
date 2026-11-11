import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePublicContact, telHrefOf } from '../src/lib/publicContact.ts'

test('public contact keeps configured values and never invents a hotline or email', () => {
  assert.deepEqual(normalizePublicContact({ system_name: ' MiniApart Test ', contact_phone: ' 0900 000 111 ', contact_email: ' lienhe@example.test ' }, 'MiniApart'),
    { systemName: 'MiniApart Test', contactPhone: '0900 000 111', contactEmail: 'lienhe@example.test' })
  assert.deepEqual(normalizePublicContact({ system_name: null, contact_phone: null, contact_email: '  ' }, 'MiniApart'),
    { systemName: 'MiniApart', contactPhone: '', contactEmail: '' })
})

test('tel links keep only digits and plus, and are empty when there is no hotline', () => {
  assert.equal(telHrefOf('+84 (28) 1234.5678'), 'tel:+842812345678')
  assert.equal(telHrefOf('0328929580'), 'tel:0328929580')
  assert.equal(telHrefOf(''), '')
  assert.equal(telHrefOf('chưa có'), '')
})
