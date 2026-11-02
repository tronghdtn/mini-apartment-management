/** DB-D86: chỉ hỗ trợ nhập liệu; Laravel vẫn kiểm trạng thái và số lượng đã lưu. */
export function inactiveServiceQuantityError(status: 'active' | 'inactive', savedQuantity: string | undefined, quantity: number): string | undefined {
  if (status !== 'inactive') return undefined
  if (savedQuantity === undefined) return 'Không được đăng ký mới dịch vụ đã ngừng hoạt động.'
  // Đây là số lượng (không phải tiền), đã được schema giới hạn thành số nguyên an toàn.
  if (quantity > Number(savedQuantity)) return 'Dịch vụ đã ngừng hoạt động chỉ được giữ nguyên, giảm số lượng hoặc ngừng sử dụng.'
  return undefined
}
