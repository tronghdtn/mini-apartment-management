import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('cancelled final invoice reissue sends only source invoice revision and is exposed only for an unreplaced final', async () => {
  const api = await readFile(new URL('../src/features/invoices/api.ts', import.meta.url), 'utf8')
  const detail = await readFile(new URL('../src/features/invoices/InvoiceDetail.tsx', import.meta.url), 'utf8')
  assert.match(api, /post<\{ data: Invoice \}>\(`\/invoices\/\$\{id\}\/reissue`, \{ expected_revision \}\)/)
  assert.match(detail, /data\.type === 'final' && data\.status === 'cancelled' && !data\.replacement_invoice_id && data\.revision/)
  assert.match(detail, /Lập lại hóa đơn tất toán/)
  assert.match(detail, /navigate\(`\$\{base\}\/\$\{replacement\.id\}`\)/)
})
