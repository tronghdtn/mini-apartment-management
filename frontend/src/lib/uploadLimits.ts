/** Tổng kích thước file, chưa gồm phần đóng gói multipart của HTTP. */
export function uploadBudgetError(files: ReadonlyArray<{ size: number }>): string | undefined {
  if (files.length > 20) return 'Mỗi lần gửi tối đa 20 ảnh, gồm cả ảnh căn cứ miễn phí.'
  if (files.reduce((total, file) => total + file.size, 0) > 30 * 1024 * 1024) {
    return 'Tổng dung lượng ảnh mỗi lần gửi không được vượt quá 30 MB.'
  }
}
