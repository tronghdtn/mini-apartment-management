import { http, fetchCsrfCookie } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { AuthUser } from './types'
import type { LoginInput, RegisterInput } from './schemas'

export async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  const response = await http.get<ApiResource<AuthUser>>('/auth/me', { signal })
  return response.data.data
}

export async function login(input: LoginInput): Promise<AuthUser> {
  await fetchCsrfCookie()
  const response = await http.post<ApiResource<AuthUser>>('/auth/login', {
    identifier: input.identifier, password: input.password,
  })
  return response.data.data
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  await fetchCsrfCookie()
  const response = await http.post<ApiResource<AuthUser>>('/auth/register', {
    full_name: input.full_name, phone: input.phone, email: input.email.trim() || null,
    password: input.password, password_confirmation: input.password_confirmation,
  })
  return response.data.data
}

export async function logout(): Promise<void> {
  await fetchCsrfCookie()
  await http.post('/auth/logout')
}
