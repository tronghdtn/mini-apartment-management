import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { maintenanceAssignmentSchema, maintenanceCreateSchema, maintenanceNoteSchema, maintenanceUpdateSchema } from '../src/features/maintenance-requests/schemas.ts'

const image = (type = 'image/png', size = 1024) => ({ name: 'repair.png', type, size })

test('maintenance TEXT fields respect UTF-8 bytes at and above MySQL capacity', () => {
  for (const text of ['x'.repeat(65535), '😀'.repeat(16383) + 'abc']) {
    assert.equal(Buffer.byteLength(text, 'utf8'), 65535)
    assert.equal(maintenanceCreateSchema.safeParse({ title: 'Sự cố', description: text, priority: 'normal' }).success, true)
    assert.equal(maintenanceNoteSchema.safeParse({ note: text }).success, true)
    assert.equal(maintenanceAssignmentSchema.safeParse({ assigned_to: 1, admin_note: text }).success, true)
    assert.equal(maintenanceUpdateSchema.safeParse({ priority: 'normal', admin_note: text }).success, true)
  }
  for (const text of ['x'.repeat(65536), '😀'.repeat(16384)]) {
    assert.equal(maintenanceCreateSchema.safeParse({ title: 'Sự cố', description: text, priority: 'normal' }).success, false)
    assert.equal(maintenanceNoteSchema.safeParse({ note: text }).success, false)
    assert.equal(maintenanceAssignmentSchema.safeParse({ assigned_to: 1, admin_note: text }).success, false)
    assert.equal(maintenanceUpdateSchema.safeParse({ priority: 'normal', admin_note: text }).success, false)
  }
})

test('admin note update allows blank notes and validates priority without accepting actor fields', () => {
  assert.deepEqual(maintenanceUpdateSchema.parse({ priority: 'normal', admin_note: ' ', user_id: 1 }), { priority: 'normal', admin_note: '' })
  assert.equal(maintenanceUpdateSchema.safeParse({ priority: 'critical', admin_note: '' }).success, false)
})

test('resident request requires real title, description and an approved initial priority', () => {
  const result = maintenanceCreateSchema.safeParse({
    title: '  Vòi nước rò  ', description: ' Nước chảy dưới bồn rửa. ', priority: 'urgent',
    photos: undefined, user_id: 999, room_id: 999, status: 'resolved',
  })
  assert.equal(result.success, true)
  assert.deepEqual(result.data, { title: 'Vòi nước rò', description: 'Nước chảy dưới bồn rửa.', priority: 'urgent', photos: undefined })
  for (const input of [
    { title: ' ', description: 'Có lỗi', priority: 'normal' },
    { title: 'Có lỗi', description: ' ', priority: 'normal' },
    { title: 'Có lỗi', description: 'Mô tả', priority: 'critical' },
    { title: 'x'.repeat(151), description: 'Mô tả', priority: 'normal' },
  ]) assert.equal(maintenanceCreateSchema.safeParse(input).success, false)
})

test('request photo validation follows private upload count, type and size limits', () => {
  const valid = { title: 'Mất điện', description: 'Đèn không sáng', priority: 'high', photos: [image('image/jpeg', 5 * 1024 * 1024)] }
  assert.equal(maintenanceCreateSchema.safeParse(valid).success, true)
  assert.equal(maintenanceCreateSchema.safeParse({ ...valid, photos: Array.from({ length: 6 }, () => image()) }).success, false)
  assert.equal(maintenanceCreateSchema.safeParse({ ...valid, photos: [image('image/gif')] }).success, false)
  assert.equal(maintenanceCreateSchema.safeParse({ ...valid, photos: [image('image/png', 5 * 1024 * 1024 + 1)] }).success, false)
})

test('admin assignment and processing notes require valid identifiers and nonblank reasons', () => {
  assert.equal(maintenanceAssignmentSchema.safeParse({ assigned_to: 12, priority: 'urgent', admin_note: '' }).success, true)
  assert.equal(maintenanceAssignmentSchema.safeParse({ assigned_to: 0, priority: 'normal', admin_note: '' }).success, false)
  assert.equal(maintenanceAssignmentSchema.safeParse({ assigned_to: 2.5, priority: 'normal', admin_note: '' }).success, false)
  assert.equal(maintenanceNoteSchema.safeParse({ note: '  Đã kiểm tra và khắc phục. ' }).data.note, 'Đã kiểm tra và khắc phục.')
  assert.equal(maintenanceNoteSchema.safeParse({ note: '  ' }).success, false)
})

test('all resident, admin and technician pages use the shared real API workflows', async () => {
  const pages = [
    'src/pages/resident/ResidentRequestsPage.tsx', 'src/pages/resident/ResidentRequestNewPage.tsx', 'src/pages/resident/ResidentRequestDetailPage.tsx',
    'src/pages/admin/AdminMaintenancePage.tsx', 'src/pages/admin/AdminMaintenanceDetailPage.tsx',
    'src/pages/staff/TechnicianTasksPage.tsx', 'src/pages/staff/TechnicianTaskDetailPage.tsx',
  ]
  for (const page of pages) {
    const source = await readFile(new URL(`../${page}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /UnavailableWorkspace|@\/mocks/)
    assert.match(source, /MaintenanceRequest(?:List|Detail|Form)/)
  }
  const api = await readFile(new URL('../src/features/maintenance-requests/api.ts', import.meta.url), 'utf8')
  for (const endpoint of ['/maintenance-requests/context', '/maintenance-requests', '/assign', '/start', '/resolve', '/reject', '/reopen']) {
    assert.ok(api.includes(endpoint), `Missing API endpoint ${endpoint}`)
  }
})
