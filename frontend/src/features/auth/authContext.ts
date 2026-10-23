import { createContext } from 'react'
import type { AuthUser } from './types'
import type { LoginInput, RegisterInput } from './schemas'

export interface AuthContextValue {
  user: AuthUser | null
  status: 'loading' | 'anonymous' | 'authenticated' | 'error'
  error: string | null
  refresh: () => Promise<void>
  login: (input: LoginInput) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
