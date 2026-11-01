// Định dạng hiển thị dùng chung. Chỉ định dạng, không tính toán tiền.

const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh'

/** Số tiền VND (số nguyên đồng) → "3.500.000 ₫". */
export function formatVND(amount: number | bigint): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫'
}

/** Ngày lịch `YYYY-MM-DD` → `DD/MM/YYYY`; không đổi múi giờ vì DATE là ngày lịch Việt Nam. */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const parts = dateStr.slice(0, 10).split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hourCycle: 'h23',
})

/** Timestamp ISO-8601 (UTC từ API) → `HH:mm DD/MM/YYYY` theo giờ Việt Nam. */
export function formatDateTime(isoStr: string): string {
  if (!isoStr) return '—'
  const date = new Date(isoStr)
  if (Number.isNaN(date.getTime())) return isoStr
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateTimeFormatter.formatToParts(date).find((p) => p.type === type)?.value ?? ''
  return `${part('hour')}:${part('minute')} ${part('day')}/${part('month')}/${part('year')}`
}

const businessDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Ngày lịch hiện tại theo giờ Việt Nam, dạng `YYYY-MM-DD`, để so sánh với cột DATE. */
export function businessToday(now: Date = new Date()): string {
  return businessDateFormatter.format(now)
}
