import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationFiltersSchema } from '../src/features/notifications/schemas.ts'
test('notification filters support owned all/unread pages and reject invalid URL parameters',()=>{
  assert.deepEqual(notificationFiltersSchema.parse({status:'unread',page:'2'}),{status:'unread',page:'2'})
  for(const input of [{status:'admin',page:'1'},{status:'all',page:'0'},{status:'all',page:'2147483648'},{status:'all',page:'1.5'}]) {
    assert.equal(notificationFiltersSchema.safeParse(input).success,false)
  }
})
