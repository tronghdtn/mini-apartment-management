import test from 'node:test'
import assert from 'node:assert/strict'
import { dashboardBuildingsSchema, dashboardCountPageSchema, dashboardAppointmentsSchema, dashboardPageSchema } from '../src/features/dashboard/schemas.ts'
import { dashboardQueues } from '../src/features/dashboard/activity.ts'

test('building counts are independent nonnegative totals, including empty buildings', () => {
  const data = { data: [{ id: 1, name: 'Tòa A', rooms_count: 4, rented_rooms_count: 1, available_rooms_count: 1 }], meta: { current_page: 1, last_page: 1, total: 1 } }
  assert.deepEqual(dashboardBuildingsSchema.parse(data), data)
  assert.equal(dashboardBuildingsSchema.safeParse({ ...data, data: [{ ...data.data[0], rented_rooms_count: -1 }] }).success, false)
  assert.equal(dashboardBuildingsSchema.safeParse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }).success, true)
})
test('building URL pagination rejects invalid or unsafe input', () => {
  assert.equal(dashboardPageSchema.parse('2'), 2)
  for (const page of ['0', '-1', '1.5', '01', '2147483648', '1&role=admin']) assert.equal(dashboardPageSchema.safeParse(page).success, false)
})
test('work queues use exact pending and due filters, with server totals beyond one page', () => {
  assert.equal(dashboardCountPageSchema.parse({ data: Array(20).fill({}), meta: { total: 41 } }).meta.total, 41)
  assert.equal(dashboardCountPageSchema.safeParse({ meta: { total: -1 } }).success, false)
  assert.deepEqual(dashboardQueues.map(q => q.params), [{ overdue: '1' }, { status: 'pending' }, { status: 'pending' }, { due: 'expiring' }, { due: 'overdue' }, { status: 'pending' }])
  assert.ok(dashboardQueues.every(q => q.href.startsWith('/admin/')))
})
test('today appointments retain only the displayed projection and use server total', () => {
  const item = { id: 1, code: 'APT-TEST', guest_name: 'Khách', guest_phone: 'private', preferred_at: '2026-11-03T02:00:00Z', status: 'confirmed', room: { id: 2, code: 'P101', building_name: 'Tòa A' }, admin_note: 'private' }
  const data = dashboardAppointmentsSchema.parse({ data: [item], meta: { total: 30 } })
  assert.equal(data.meta.total, 30)
  assert.equal('guest_phone' in data.data[0], false)
  assert.equal('admin_note' in data.data[0], false)
})
