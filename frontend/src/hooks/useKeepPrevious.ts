import { useState } from 'react'

/** Giá trị nên hiển thị: kết quả mới nếu đã có, nếu chưa thì giữ kết quả thành công trước đó. */
export function pickShown<T>(next: T | undefined, previous: T | undefined): { value: T | undefined; stale: boolean } {
  if (next !== undefined) return { value: next, stale: false }
  return { value: previous, stale: previous !== undefined }
}

/**
 * Giữ dữ liệu danh sách cũ trong lúc chờ request mới (đổi tab, bộ lọc, trang),
 * để bảng không bị thay bằng dòng "Đang tải…" rồi nhảy bố cục.
 * Chỉ truyền vào kết quả thành công; lỗi vẫn hiển thị ngay theo luồng của màn hình.
 */
export function useKeepPrevious<T>(next: T | undefined) {
  const [kept, setKept] = useState<T | undefined>(next)
  if (next !== undefined && next !== kept) setKept(next)
  return pickShown(next, kept)
}
