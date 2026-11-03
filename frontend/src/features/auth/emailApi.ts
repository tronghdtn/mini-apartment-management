import { isAxiosError } from 'axios'
import { fetchCsrfCookie, http } from '@/lib/http'
import { authErrorMessage } from './errors'
import { changeEmailSchema, forgotPasswordSchema, resetPasswordSchema, verifyLinkSchema } from './emailSchemas'
import type { ChangeEmailInput, ForgotPasswordInput, ResetPasswordInput, VerifyLink } from './emailSchemas'

type Message = { message: string }

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<string> {
  const body = forgotPasswordSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.post<Message>('/auth/forgot-password', body)).data.message
}

export async function resetPassword(email: string, token: string, input: ResetPasswordInput): Promise<void> {
  const body = resetPasswordSchema.parse(input)
  await fetchCsrfCookie()
  await http.post('/auth/reset-password', { email, token, ...body })
}

export async function sendVerificationEmail(): Promise<string> {
  await fetchCsrfCookie()
  return (await http.post<Message>('/auth/email/verification-notification')).data.message
}

export async function verifyEmail(link: VerifyLink): Promise<string> {
  const body = verifyLinkSchema.parse(link)
  await fetchCsrfCookie()
  return (await http.post<Message>('/auth/email/verify', body)).data.message
}

export async function requestEmailChange(input: ChangeEmailInput): Promise<string> {
  const body = changeEmailSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.post<Message>('/auth/email/change', body)).data.message
}

export async function confirmEmailChange(token: string): Promise<string> {
  await fetchCsrfCookie()
  return (await http.post<Message>('/auth/email/change/confirm', { token })).data.message
}

/** Ưu tiên thông điệp nghiệp vụ tiếng Việt của Backend (liên kết hết hạn, đã xác minh, chưa gửi được email). */
export function emailErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response && [409, 422, 503].includes(error.response.status)) {
    const data: unknown = error.response.data
    if (data && typeof data === 'object') {
      const link = (data as { errors?: { link?: unknown } }).errors?.link
      if (Array.isArray(link) && typeof link[0] === 'string') return link[0]
      const message = (data as { message?: unknown }).message
      if (typeof message === 'string' && error.response.status !== 422) return message
    }
  }
  return authErrorMessage(error)
}
