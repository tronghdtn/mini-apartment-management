import test from 'node:test'
import assert from 'node:assert/strict'
import { AxiosError } from 'axios'
import { apiActionMessage, apiBusinessMessage, apiErrorMessage, applyApiErrors } from '../src/lib/apiErrors.ts'

const failure = (status, data) => new AxiosError('failed', undefined, undefined, undefined, { status, data, headers: {} })

test('duplicate monthly invoice shows the backend reason instead of the generic conflict text', () => {
  const error = failure(409, { message: 'Đã có hóa đơn tháng chưa hủy cho hợp đồng/kỳ này.' })
  assert.equal(apiActionMessage(error), 'Đã có hóa đơn tháng chưa hủy cho hợp đồng/kỳ này. Tải lại dữ liệu trước khi thử lại.')
})

test('a 422 business rule without field errors surfaces its message at form level', () => {
  const error = failure(422, { message: 'Ngày bàn giao thực tế không được nằm trong tương lai.', exception: 'HttpException', trace: [] })
  assert.equal(apiBusinessMessage(error), 'Ngày bàn giao thực tế không được nằm trong tương lai.')
  const fields = []
  applyApiErrors(error, (field, value) => fields.push([field, value.message]), ['actual_end_date'])
  assert.deepEqual(fields, [['root', 'Ngày bàn giao thực tế không được nằm trong tương lai.']])
})

test('422 validation with field errors keeps the generic summary so fields carry the detail', () => {
  const error = failure(422, { message: 'Ngày bàn giao không hợp lệ. (and 1 more error)', errors: { actual_end_date: ['Ngày bàn giao không hợp lệ.'] } })
  assert.equal(apiBusinessMessage(error), null)
  assert.equal(apiActionMessage(error), apiErrorMessage(error))
})

test('technical or oversized server messages never reach the form', () => {
  for (const message of ['SQLSTATE[23000]: Integrity constraint', 'Call to undefined method in /var/www/html/app/Foo.php', 'Symfony Exception', 'a'.repeat(301), '', 42, undefined]) {
    for (const status of [409, 422]) assert.equal(apiBusinessMessage(failure(status, { message })), null, `${status} ${message}`)
  }
  for (const status of [401, 403, 404, 500]) assert.equal(apiActionMessage(failure(status, { message: 'Bí mật nội bộ' })).includes('Bí mật'), false)
  assert.ok(apiActionMessage(new Error('private')).includes('kết nối'))
})
