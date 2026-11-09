import test from 'node:test'
import assert from 'node:assert/strict'
import { isChunkLoadError, isConnectionRouteError } from '../src/lib/routeErrors.ts'

test('recognises page-code load failures from every major browser and Vite', () => {
  for (const message of [
    'Failed to fetch dynamically imported module: http://localhost:8080/assets/AdminInvoicesPage-abc.js',
    'error loading dynamically imported module: http://localhost:8080/assets/x.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/x.css',
  ]) {
    assert.equal(isChunkLoadError(new TypeError(message)), true, message)
  }
  const named = new Error('Loading chunk 3 failed')
  named.name = 'ChunkLoadError'
  assert.equal(isChunkLoadError(named), true)
})

test('ordinary render errors and non-errors are not treated as connection problems while online', () => {
  for (const error of [new Error('Cannot read properties of undefined'), 'Failed to fetch dynamically imported module', null, { message: 'Importing a module script failed.' }]) {
    assert.equal(isChunkLoadError(error), false)
    assert.equal(isConnectionRouteError(error, true), false)
  }
})

test('any route error while the browser reports offline is shown as a connection problem', () => {
  assert.equal(isConnectionRouteError(new Error('anything'), false), true)
  assert.equal(isConnectionRouteError(new TypeError('Failed to fetch dynamically imported module: /a.js'), true), true)
})
