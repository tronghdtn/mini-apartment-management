/** Thông tin liên hệ công khai trả về từ `GET /api/v1/public/settings`. */
export interface PublicContact {
  system_name: string | null
  contact_phone: string | null
  contact_email: string | null
}

/** Chuẩn hóa dữ liệu API: giá trị trống thành chuỗi rỗng (giao diện ẩn mục đó), tên hệ thống lùi về tên mặc định. */
export function normalizePublicContact(contact: PublicContact, defaultName: string): { systemName: string; contactPhone: string; contactEmail: string } {
  return {
    systemName: contact.system_name?.trim() || defaultName,
    contactPhone: contact.contact_phone?.trim() ?? '',
    contactEmail: contact.contact_email?.trim() ?? '',
  }
}

/** `tel:` chỉ giữ chữ số và dấu +; chuỗi rỗng khi chưa có hotline. */
export function telHrefOf(phone: string): string {
  const digits = phone.replace(/[^0-9+]/g, '')
  return digits ? `tel:${digits}` : ''
}
