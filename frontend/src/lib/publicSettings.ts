import { useEffect, useState } from 'react'
import type { Setting } from '@/features/settings/types'
import { http } from '@/lib/http'
import { normalizePublicContact, type PublicContact } from '@/lib/publicContact'

export { telHrefOf } from '@/lib/publicContact'

export interface PublicSiteSettings {
  systemName: string
  contactPhone: string
  contactEmail: string
  bankName: string
  bankAccountNumber: string
  bankAccountHolder: string
  customQrDataUrl: string
}

const STORAGE_KEY = 'miniapart_site_settings_v1'
const QR_STORAGE_KEY = 'miniapart_custom_qr_v1'
const EVENT_NAME = 'miniapart:settings-updated'

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  systemName: 'MiniApart',
  // Không có hotline/email mặc định: khi chưa cấu hình, giao diện ẩn mục liên hệ thay vì hiện số giả.
  contactPhone: '',
  contactEmail: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
  customQrDataUrl: '',
}

export function readStoredSiteSettings(): PublicSiteSettings {
  if (typeof window === 'undefined') return DEFAULT_SITE_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const qr = window.localStorage.getItem(QR_STORAGE_KEY) ?? ''
    if (!raw) return { ...DEFAULT_SITE_SETTINGS, customQrDataUrl: qr }
    const parsed = JSON.parse(raw) as Partial<PublicSiteSettings>
    return {
      systemName: parsed.systemName?.trim() || DEFAULT_SITE_SETTINGS.systemName,
      contactPhone: parsed.contactPhone?.trim() || DEFAULT_SITE_SETTINGS.contactPhone,
      contactEmail: parsed.contactEmail?.trim() || DEFAULT_SITE_SETTINGS.contactEmail,
      bankName: parsed.bankName?.trim() || '',
      bankAccountNumber: parsed.bankAccountNumber?.trim() || '',
      bankAccountHolder: parsed.bankAccountHolder?.trim() || '',
      customQrDataUrl: qr,
    }
  } catch {
    return DEFAULT_SITE_SETTINGS
  }
}

export function syncSiteSettingsFromApi(settings: Setting[]): void {
  if (typeof window === 'undefined') return
  const map = new Map(settings.map(s => [s.key, s.value?.trim() ?? '']))
  const current = readStoredSiteSettings()
  const next: Omit<PublicSiteSettings, 'customQrDataUrl'> = {
    systemName: map.get('system.name') || DEFAULT_SITE_SETTINGS.systemName,
    contactPhone: map.get('system.contact_phone') ?? '',
    contactEmail: map.get('system.contact_email') ?? '',
    bankName: map.has('bank.name') ? (map.get('bank.name') ?? '') : current.bankName,
    bankAccountNumber: map.has('bank.account_number') ? (map.get('bank.account_number') ?? '') : current.bankAccountNumber,
    bankAccountHolder: map.has('bank.account_holder') ? (map.get('bank.account_holder') ?? '') : current.bankAccountHolder,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  } catch {
    // Ignore storage quota errors
  }
}

/** Ghi tên hệ thống, hotline, email từ API công khai vào bộ nhớ đệm; giữ nguyên phần ngân hàng đã có. */
export function applyPublicContact(contact: PublicContact): void {
  if (typeof window === 'undefined') return
  const current = readStoredSiteSettings()
  const next: Omit<PublicSiteSettings, 'customQrDataUrl'> = {
    ...normalizePublicContact(contact, DEFAULT_SITE_SETTINGS.systemName),
    bankName: current.bankName,
    bankAccountNumber: current.bankAccountNumber,
    bankAccountHolder: current.bankAccountHolder,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Bộ nhớ trình duyệt bị chặn: vẫn báo cập nhật để hook đọc lại phần còn dùng được.
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }))
}

let publicContactRequest: Promise<void> | null = null

/** Gọi `GET /public/settings` tối đa một lần mỗi lần tải trang; lỗi mạng giữ bộ nhớ đệm hiện có. */
export function loadPublicContact(): Promise<void> {
  publicContactRequest ??= http.get<{ data: PublicContact }>('/public/settings')
    .then(response => applyPublicContact(response.data.data))
    .catch(() => { publicContactRequest = null })
  return publicContactRequest
}

export function saveCustomQrDataUrl(dataUrl: string): void {
  if (typeof window === 'undefined') return
  try {
    if (dataUrl) window.localStorage.setItem(QR_STORAGE_KEY, dataUrl)
    else window.localStorage.removeItem(QR_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  } catch {
    // Ignore storage quota errors
  }
}

export function usePublicSettings(): PublicSiteSettings {
  const [state, setState] = useState<PublicSiteSettings>(() => readStoredSiteSettings())

  useEffect(() => {
    void loadPublicContact()
    const refresh = (event?: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as Omit<PublicSiteSettings, 'customQrDataUrl'> | undefined) : undefined
      setState(detail ? { ...readStoredSiteSettings(), ...detail } : readStoredSiteSettings())
    }
    window.addEventListener(EVENT_NAME, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT_NAME, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return state
}

const BANK_CODE_MAP: Array<[RegExp, string]> = [
  [/vietcombank|vcb|ngoai\s*thuong|ngoại\s*thương/i, 'VCB'],
  [/techcombank|tcb|ky\s*thuong|kỹ\s*thương/i, 'TCB'],
  [/\bmb\b|mbbank|quan\s*doi|quân\s*đội/i, 'MB'],
  [/bidv|dau\s*tu|đầu\s*tư/i, 'BIDV'],
  [/vietinbank|icb|cong\s*thuong|công\s*thương/i, 'ICB'],
  [/\bacb\b|a\s*chau|á\s*châu/i, 'ACB'],
  [/vpbank|vpb|viet\s*nam\s*thinh\s*vuong|việt\s*nam\s*thịnh\s*vượng/i, 'VPB'],
  [/tpbank|tpb|tien\s*phong|tiên\s*phong/i, 'TPB'],
  [/sacombank|stb|sai\s*gon\s*thuong\s*tin/i, 'STB'],
  [/agribank|vba|nong\s*nghiep|nông\s*nghiệp/i, 'VBA'],
  [/\bvib\b|quoc\s*te|quốc\s*tế/i, 'VIB'],
  [/\bshb\b|sai\s*gon\s*ha\s*noi/i, 'SHB'],
  [/\bmsb\b|hang\s*hai|hàng\s*hải/i, 'MSB'],
  [/hdbank|hdb/i, 'HDB'],
  [/\bocb\b|phuong\s*dong|phương\s*đông/i, 'OCB'],
  [/lpbank|lpb|loc\s*phat|lộc\s*phát|lienviet/i, 'LPB'],
  [/seabank|ssb/i, 'SEAB'],
  [/eximbank|eib/i, 'EIB'],
]

export function resolveVietQrBankCode(bankName: string | null | undefined): string {
  if (!bankName) return 'VCB'
  const trimmed = bankName.trim()
  for (const [pattern, code] of BANK_CODE_MAP) {
    if (pattern.test(trimmed)) return code
  }
  const token = trimmed.split(/\s+/)[0]?.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return token && token.length >= 2 && token.length <= 8 ? token : 'VCB'
}

export function buildVietQrUrl(params: {
  bankName?: string | null
  accountNumber?: string | null
  accountHolder?: string | null
  amount?: number | null
  transferContent?: string | null
}): string | null {
  const account = params.accountNumber?.trim()
  if (!account) return null
  const bankCode = resolveVietQrBankCode(params.bankName)
  const query = new URLSearchParams()
  if (typeof params.amount === 'number' && params.amount > 0) {
    query.set('amount', String(params.amount))
  }
  if (params.transferContent?.trim()) {
    query.set('addInfo', params.transferContent.trim())
  }
  if (params.accountHolder?.trim()) {
    query.set('accountName', params.accountHolder.trim())
  }
  const qs = query.toString()
  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(account)}-compact2.png${qs ? `?${qs}` : ''}`
}
