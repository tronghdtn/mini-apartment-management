import test from 'node:test'
import assert from 'node:assert/strict'
import {paymentProofSchema,directPaymentSchema,confirmPaymentSchema,rejectPaymentSchema,paymentFiltersSchema} from '../src/features/payments/schemas.ts'

test('unselected proof is rejected when RHF omits the field entirely', () => {
  for (const input of [{ amount: 1000 }, { amount: 1000, proof: undefined }, { amount: 1000, proof: null },
    { amount: 1000, proof: { type: 'image/png', size: 100 } }]) {
    const result = paymentProofSchema.safeParse(input)
    assert.equal(result.success, false)
    assert.ok(result.error.issues.some(issue => issue.path[0] === 'proof'))
  }
})

test('proof requires a real selected image within five MB and integer VND',()=>{
  const input={amount:1000,proof:new File(['png'],'proof.png',{type:'image/png'})}
  assert.equal(paymentProofSchema.safeParse(input).success,true)
  for(const bad of [{amount:0},{amount:true},{amount:1.5},{proof:undefined},{proof:new File(['text'],'proof.svg',{type:'image/svg+xml'})},{proof:new File([new Uint8Array(5*1024*1024+1)],'proof.png',{type:'image/png'})}])assert.equal(paymentProofSchema.safeParse({...input,...bad}).success,false)
  assert.equal(paymentProofSchema.safeParse({...input,proof:new File([new Uint8Array(5*1024*1024)],'proof.png',{type:'image/png'})}).success,true)
})
test('real receipt requires explicit confirmation and never accepts deposit as direct income',()=>{
  const input={amount:1000,method:'cash',confirmed_received:true}
  assert.equal(directPaymentSchema.safeParse(input).success,true)
  assert.equal(directPaymentSchema.safeParse({...input,confirmed_received:false}).success,false)
  assert.equal(directPaymentSchema.safeParse({...input,method:'deposit'}).success,false)
  assert.equal(confirmPaymentSchema.safeParse({confirmed_received:false}).success,false)
  assert.equal(rejectPaymentSchema.safeParse({reject_reason:' '}).success,false)
})
test('payment filters keep owner invoice scope and reject invented exception status',()=>{
  const input={status:'pending',method:'bank_transfer',page:'2',invoice_id:'29'}
  assert.deepEqual(paymentFiltersSchema.parse(input),input)
  for(const bad of [{status:'exceptions'},{page:'0'},{invoice_id:'NaN'}])assert.equal(paymentFiltersSchema.safeParse({...input,...bad}).success,false)
})
