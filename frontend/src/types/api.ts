/** Định dạng bọc dữ liệu mặc định của Laravel API Resource. */
export interface ApiResource<T> {
  data: T
}

/** Lỗi validation (HTTP 422) do FormRequest của Laravel trả về. */
export interface ApiValidationError {
  message: string
  errors: Record<string, string[]>
}
