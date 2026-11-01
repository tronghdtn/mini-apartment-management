import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationFiltersSchema } from '../src/features/notifications/schemas.ts'
import { withoutNotificationPage } from '../src/features/notifications/filters.ts'

test('reading the last unread page resets notification paging without mutating the current URL',()=>{
  const current=new URLSearchParams('status=unread&page=2&source=invoice')
  assert.equal(withoutNotificationPage(current).toString(),'status=unread&source=invoice')
  assert.equal(current.get('page'),'2')
})

test('account notification paging never resets the appointment filters sharing its URL',()=>{
  const current=new URLSearchParams('status=confirmed&page=3&notice_status=unread&notice_page=2')
  assert.equal(withoutNotificationPage(current,'notice_').toString(),'status=confirmed&page=3&notice_status=unread')
  assert.equal(current.get('notice_page'),'2')
})
test('notification filters support owned all/unread pages and reject invalid URL parameters',()=>{
  assert.deepEqual(notificationFiltersSchema.parse({status:'unread',page:'2'}),{status:'unread',page:'2'})
  for(const input of [{status:'admin',page:'1'},{status:'all',page:'0'},{status:'all',page:'2147483648'},{status:'all',page:'1.5'}]) {
    assert.equal(notificationFiltersSchema.safeParse(input).success,false)
  }
})
