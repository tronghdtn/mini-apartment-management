import test from 'node:test'
import assert from 'node:assert/strict'
import { roomPhotoUploadSchema, roomPhotoListSchema } from '../src/features/room-photos/schemas.ts'
const png = size => new File([new Uint8Array(size)], 'test.png', { type: 'image/png' })
test('room photos accept exact file count and request budgets', () => {
  assert.equal(roomPhotoUploadSchema.safeParse({ photos: Array.from({ length: 20 }, () => png(1)) }).success, true)
  assert.equal(roomPhotoUploadSchema.safeParse({ photos: Array.from({ length: 6 }, () => png(5 * 1024 * 1024)) }).success, true)
})
test('room photos reject missing spoofed empty count and byte overflow', () => {
  for (const photos of [undefined, [], [null], ['fake'], [png(0)], [png(5 * 1024 * 1024 + 1)],
    [new File(['<svg/>'], 'fake.png', { type: 'image/svg+xml' })], Array.from({ length: 21 }, () => png(1)),
    [...Array.from({ length: 6 }, () => png(5 * 1024 * 1024)), png(1)]]) assert.equal(roomPhotoUploadSchema.safeParse({ photos }).success, false)
})
test('admin photo response urls stay on controlled image API', () => {
  assert.equal(roomPhotoListSchema.safeParse([]).success, true)
  const photo = { id: 1, url: '/api/v1/rooms/2/photos/1/content', is_cover: true, sort_order: 1 }
  assert.deepEqual(roomPhotoListSchema.parse([photo]), [photo])
  for (const url of ['javascript:alert(1)', 'https://third-party.invalid/image', '/storage/private/a.png']) assert.equal(roomPhotoListSchema.safeParse([{ ...photo, url }]).success, false)
})
