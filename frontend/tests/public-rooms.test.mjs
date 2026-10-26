import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyRoomFilters, publicRoomFiltersSchema, readRoomSearch, roomSearch } from '../src/features/rooms/schemas.ts'

test('public search round-trips every filter, multiple amenities, sorting and page without rewriting decimal strings', () => {
  const filters = { ...emptyRoomFilters, q: "%_ ' tòa nhà", building_id: '12', min_price: '0', max_price: '9007199254740991', min_area: '25.50', max_area: '32.00', min_occupants: '1', max_occupants: '3', amenity_ids: ['2', '9'], sort: 'area_desc' }
  const parsed = readRoomSearch(roomSearch(filters, 2))
  assert.equal(parsed.error, '')
  assert.equal(parsed.page, 2)
  assert.deepEqual(parsed.filters, filters)
  assert.deepEqual(roomSearch(emptyRoomFilters).toString(), '')
})

test('money filters are nonnegative exact integer strings; no fractional, scientific or unsafe amount', () => {
  for (const key of ['min_price', 'max_price']) {
    for (const value of ['', '0', '1', '9007199254740991']) assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, [key]: value }).success, true)
    for (const value of ['-1', '1.5', '1e6', '9007199254740992', 'NaN', null, true, 3000000]) assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, [key]: value }).success, false)
  }
})

test('price, area and capacity boundaries are inclusive and reject reversed ranges', () => {
  for (const kind of ['price', 'area', 'occupants']) {
    assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, [`min_${kind}`]: '2', [`max_${kind}`]: '2' }).success, true)
    assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, [`min_${kind}`]: '3', [`max_${kind}`]: '2' }).success, false)
  }
  assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, min_area: '25.10', max_area: '25.09' }).success, false)
  for (const value of ['1.001', '1000000', '-1', '1e2']) assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, min_area: value }).success, false)
  for (const value of ['0', '65536', '1.5']) assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, min_occupants: value }).success, false)
})

test('amenities use distinct positive identifiers; no labels or private-state controls enter the query', () => {
  for (const amenity_ids of [['1', '1'], ['0'], [''], ['wifi'], ['-1'], ['1.2'], ['9007199254740992']]) assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, amenity_ids }).success, false)
  for (const field of ['status', 'is_public', 'user_id', 'featured', 'unit_price']) assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, [field]: '1' }).success, false)
})

test('URL validation rejects hidden controls, duplicate scalar fields, bad sort and invalid pages', () => {
  for (const query of ['status=occupied', 'q=a&q=b', 'page=0', 'page=-1', 'page=1.1', 'page=2147483648', 'page=', 'sort=featured', 'amenity_ids[]=2&amenity_ids[]=2']) assert.notEqual(readRoomSearch(new URLSearchParams(query)).error, '', query)
  assert.equal(readRoomSearch(new URLSearchParams('page=2147483647')).error, '')
})

test('search trims only surrounding whitespace and uses Unicode character limits', () => {
  assert.equal(publicRoomFiltersSchema.parse({ ...emptyRoomFilters, q: "  %_ '  " }).q, "%_ '")
  assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, q: '😀'.repeat(191) }).success, true)
  assert.equal(publicRoomFiltersSchema.safeParse({ ...emptyRoomFilters, q: '😀'.repeat(192) }).success, false)
})

test('reading a previous URL restores all prior values and clearing filters resets page and sort', () => {
  const first = roomSearch({ ...emptyRoomFilters, amenity_ids: ['1', '2'], sort: 'price_desc' }, 3)
  const next = roomSearch({ ...emptyRoomFilters, q: 'A' })
  assert.equal(readRoomSearch(first).page, 3)
  assert.deepEqual(readRoomSearch(first).filters.amenity_ids, ['1', '2'])
  assert.equal(readRoomSearch(next).page, 1)
  assert.equal(readRoomSearch(next).filters.sort, '')
  assert.deepEqual(readRoomSearch(new URLSearchParams()).filters, emptyRoomFilters)
})

test('previously published buildingId and keyword links remain usable and produce only canonical API keys', () => {
  const old = readRoomSearch(new URLSearchParams('buildingId=29&keyword=PUB-01'))
  assert.equal(old.error, '')
  assert.equal(roomSearch(old.filters).toString(), 'q=PUB-01&building_id=29')
  for (const query of ['buildingId=1&building_id=2', 'keyword=A&q=B']) assert.notEqual(readRoomSearch(new URLSearchParams(query)).error, '')
})
