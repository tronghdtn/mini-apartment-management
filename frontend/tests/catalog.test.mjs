import test from 'node:test'
import assert from 'node:assert/strict'
import { AxiosError } from 'axios'
import { buildingSchema } from '../src/features/buildings/schemas.ts'
import { roomSchema } from '../src/features/room-management/schemas.ts'
import { amenitySchema } from '../src/features/amenities/schemas.ts'
import { apiErrorMessage, applyApiErrors } from '../src/lib/apiErrors.ts'

const building = { name: ' Tòa Bình An ', address: ' 12 Nguyễn Trãi ', total_floors: 5, latitude: '', longitude: '', description: '' }
test('building accepts confirmed fields and trims required values', () => {
  const parsed = buildingSchema.parse(building)
  assert.equal(parsed.name, 'Tòa Bình An')
  assert.equal(parsed.address, '12 Nguyễn Trãi')
  assert.equal(parsed.latitude, '')
  for (const change of [{ name: ' ' }, { name: 'a'.repeat(151) }, { address: '' }, { address: 'a'.repeat(501) }]) assert.equal(buildingSchema.safeParse({ ...building, ...change }).success, false)
})
test('floor range matches unsigned small integer and disallows fractional/NaN', () => {
  for (const total_floors of [1, 65535]) assert.equal(buildingSchema.safeParse({ ...building, total_floors }).success, true)
  for (const total_floors of [0, -1, 1.5, 65536, NaN]) assert.equal(buildingSchema.safeParse({ ...building, total_floors }).success, false)
})
test('coordinates keep decimal strings and enforce geographic boundaries', () => {
  const parsed = buildingSchema.parse({ ...building, latitude: '-90.0000000', longitude: '180' })
  assert.equal(parsed.latitude, '-90.0000000')
  for (const change of [{ latitude: '90.1' }, { longitude: '-180.1' }, { latitude: 'NaN' }, { longitude: '1,5' }]) assert.equal(buildingSchema.safeParse({ ...building, ...change }).success, false)
})
test('amenity name is required and bounded, no invented category/status/money fields', () => {
  for (const name of ['', ' ', 'a'.repeat(121)]) assert.equal(amenitySchema.safeParse({ name, description: '' }).success, false)
  const parsed = amenitySchema.parse({ name: ' Camera ', description: '', category: 'room', status: 'active', price: 100 })
  assert.deepEqual(parsed, { name: 'Camera', description: '' })
})
test('API errors do not leak SQL or stack traces and handle 401/403/404/409/419/network', () => {
  for (const status of [401, 403, 404, 409, 419, 422, 429, 500]) {
    const error = new AxiosError('SQL secret', undefined, undefined, undefined, { status, data: { message: 'SELECT password' }, headers: {} })
    assert.ok(apiErrorMessage(error).length > 0)
    assert.equal(apiErrorMessage(error).includes('SELECT'), false)
  }
  assert.ok(apiErrorMessage(new Error('private')).includes('kết nối'))
})
test('422 field mapping ignores fields outside the submitted catalog form', () => {
  const error = new AxiosError('invalid', undefined, undefined, undefined, { status: 422, data: { errors: { name: ['Tên đã dùng'], role: ['admin'], description: 'malformed' } }, headers: {} })
  const fields = []
  applyApiErrors(error, (field, value) => fields.push([field, value.message]), ['name', 'description'])
  assert.deepEqual(fields.map(item => item[0]), ['name', 'root'])
  assert.equal(fields[0][1], 'Tên đã dùng')
})

const room = { building_id: 1, code: ' 101 ', floor_number: 1, area: '28.50', base_price: 3500000, deposit_amount: 3500000, max_occupants: 2, is_public: false, description: '' }
test('room metadata uses decimal string and integral VND with no status/contract payload', () => {
 const parsed=roomSchema.parse({ ...room, status: 'occupied', contract_id: 99 })
 assert.equal(parsed.code,'101');assert.equal(parsed.area,'28.50');assert.equal(parsed.base_price,3500000);assert.equal('status' in parsed,false);assert.equal('contract_id' in parsed,false)
})
test('room area and capacity boundaries reject invalid input', () => {
 for(const change of [{area:'0'},{area:'-1'},{area:'2.123'},{area:'1000000.00'},{max_occupants:0},{max_occupants:65536},{floor_number:0},{code:'x'.repeat(51)}])assert.equal(roomSchema.safeParse({...room,...change}).success,false)
})
test('room money is never rounded from fraction or unsafe integer', () => {
 for(const change of [{base_price:-1},{base_price:1.5},{base_price:Number.MAX_SAFE_INTEGER+1},{deposit_amount:-1},{deposit_amount:NaN}])assert.equal(roomSchema.safeParse({...room,...change}).success,false)
 assert.equal(roomSchema.safeParse({...room,base_price:0,deposit_amount:0}).success,true)
})
test('room requires a real building selection and explicit boolean public flag', () => {
 for(const change of [{building_id:0},{building_id:NaN},{is_public:'false'}])assert.equal(roomSchema.safeParse({...room,...change}).success,false)
})

test('TEXT descriptions count UTF-8 bytes and reject SQL overflow before submit', () => {
 for (const [schema, base] of [[buildingSchema, building], [amenitySchema, {name:'Camera',description:''}], [roomSchema, room]]) {
  for(const description of ['a'.repeat(65536),'ế'.repeat(21846)])assert.equal(schema.safeParse({...base,description}).success,false)
  for(const description of ['a'.repeat(65535),'ế'.repeat(21845)])assert.equal(schema.safeParse({...base,description}).success,true)
 }
})
