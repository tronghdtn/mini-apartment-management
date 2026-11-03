import { createContext } from 'react'
import type { AuthUser } from './types'
import type { LoginInput, RegisterInput } from './schemas'
import type { ProfileNameInput, ChangePasswordInput } from './profileSchemas'

export type AccountNotice = 'password-updated' | 'profile-session-ended' | 'password-unknown'

export interface AuthContextValue {
  user: AuthUser | null
  status: 'loading' | 'anonymous' | 'authenticated' | 'error'
  error: string | null
  accountNotice: AccountNotice | null
  refresh: () => Promise<void>
  login: (input: LoginInput) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  logout: () => Promise<void>
  updateProfile: (input: ProfileNameInput) => Promise<AuthUser>
  changePassword: (input: ChangePasswordInput) => Promise<boolean>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
