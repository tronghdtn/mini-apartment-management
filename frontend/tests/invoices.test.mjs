import test from 'node:test'
import assert from 'node:assert/strict'
import { createInvoiceSchema, otherChargeSchema, invoiceReasonSchema, invoiceFiltersSchema } from '../src/features/invoices/schemas.ts'
test('invoice create requires first-of-month and strips server controlled fields', () => {
  const input={contract_id:23,period:'2026-10-01'}
  assert.deepEqual(createInvoiceSchema.parse({...input,total_amount:1,status:'paid',type:'final'}),input)
  for(const bad of [{contract_id:0},{contract_id:true},{period:'2026-10-02'},{period:'2026-02-30'}]) assert.equal(createInvoiceSchema.safeParse({...input,...bad}).success,false)
})
test('manual charge requires integer VND and lawful basis, no server metadata', () => {
  const input={description:'Khoản đã thỏa thuận',amount:1000,basis:'Thỏa thuận cụ thể'}
  assert.deepEqual(otherChargeSchema.parse({...input,meta:{actor_id:1},item_type:'damage'}),input)
  for(const bad of [{amount:0},{amount:-1},{amount:1.5},{amount:9007199254740992},{basis:' '},{description:''}]) assert.equal(otherChargeSchema.safeParse({...input,...bad}).success,false)
  assert.equal(invoiceReasonSchema.safeParse({reason:'  '}).success,false)
})
test('invoice filters preserve overdue as a derived flag and reject invalid pages', () => {
  const input={status:'issued',period:'2026-10-01',overdue:'1',page:'2'}
  assert.deepEqual(invoiceFiltersSchema.parse(input),input)
  assert.equal(invoiceFiltersSchema.safeParse({...input,status:'overdue'}).success,false)
  assert.equal(invoiceFiltersSchema.safeParse({...input,page:'0'}).success,false)
})
