/** MySQL TEXT lưu tối đa 65.535 byte; ký tự Unicode có thể chiếm nhiều byte UTF-8. */
export function fitsTextColumn(value: string): boolean {
  return new TextEncoder().encode(value).length <= 65535
}
