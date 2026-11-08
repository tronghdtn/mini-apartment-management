import test from 'node:test'
import assert from 'node:assert/strict'
import { pickShown } from '../src/hooks/useKeepPrevious.ts'

test('shows fresh data as soon as it arrives', () => {
  const previous = { page: 1 }
  const next = { page: 2 }
  assert.deepEqual(pickShown(next, previous), { value: next, stale: false })
  assert.deepEqual(pickShown(next, undefined), { value: next, stale: false })
})

test('keeps previous data marked stale while the next request is pending', () => {
  const previous = { page: 1 }
  assert.deepEqual(pickShown(undefined, previous), { value: previous, stale: true })
})

test('first load has nothing to show and is not stale', () => {
  assert.deepEqual(pickShown(undefined, undefined), { value: undefined, stale: false })
})
