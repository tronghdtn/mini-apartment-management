import test from 'node:test'
import assert from 'node:assert/strict'
import { appointmentBookingSchema, appointmentFiltersSchema, appointmentTimeSchema, vietnamAppointmentTime } from '../src/features/viewing-appointments/schemas.ts'

test('booking datetime stays Vietnam time regardless of browser timezone and validates calendar/hours', () => {
  assert.equal(vietnamAppointmentTime('2026-10-31T08:00'), '2026-10-31T08:00:00+07:00')
  assert.equal(appointmentTimeSchema.safeParse('2026-10-31T20:00').success, true)
  for (const value of ['2026-10-31T07:59', '2026-10-31T20:01', '2026-02-30T09:00', '2026-13-01T09:00', '', '2026-10-31T12:00Z']) assert.equal(appointmentTimeSchema.safeParse(value).success, false, value)
})
test('booking validates contact and honeypot; server remains final authority for future/room/owner', () => {
  const valid = { guest_name: 'Khách', guest_phone: '0901234567', preferred_at: '2026-10-31T09:00', website: '' }
  assert.equal(appointmentBookingSchema.safeParse(valid).success, true)
  assert.equal(appointmentBookingSchema.safeParse({ ...valid, guest_phone: '+84901234567' }).success, true)
  for (const patch of [{ guest_name: '' }, { guest_phone: 'abc' }, { website: 'bot' }]) assert.equal(appointmentBookingSchema.safeParse({ ...valid, ...patch }).success, false)
  assert.equal(appointmentFiltersSchema.safeParse({ status: 'confirmed', page: '2', date: '2026-10-31' }).success, true)
  for (const patch of [{ status: 'fake' }, { page: '0' }, { date: '2026-02-30' }]) assert.equal(appointmentFiltersSchema.safeParse({ status: 'all', page: '1', date: '', ...patch }).success, false)
})
