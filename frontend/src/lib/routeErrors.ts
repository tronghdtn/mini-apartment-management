// Thông điệp trình duyệt khi không tải được mã trang tách riêng (import động):
// Chrome/Edge "Failed to fetch dynamically imported module", Firefox "error loading dynamically imported module",
// Safari "Importing a module script failed", Vite "Unable to preload CSS".
const CHUNK_LOAD_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
]

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === 'ChunkLoadError') return true
  return CHUNK_LOAD_PATTERNS.some(pattern => pattern.test(error.message))
}

/** Lỗi route do mất kết nối: không tải được mã trang, hoặc trình duyệt đang báo offline. */
export function isConnectionRouteError(error: unknown, online: boolean): boolean {
  return !online || isChunkLoadError(error)
}
