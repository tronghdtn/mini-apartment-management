import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isAxiosError } from 'axios'
import * as api from './api'
import { AuthContext } from './authContext'
import type { AuthContextValue, AccountNotice } from './authContext'
import type { AuthUser } from './types'
import type { LoginInput, RegisterInput } from './schemas'
import type { ProfileNameInput, ChangePasswordInput } from './profileSchemas'
import { authErrorMessage } from './errors'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [error, setError] = useState<string | null>(null)
  const [accountNotice, setAccountNotice] = useState<AccountNotice | null>(null)
  const currentUser = useRef<AuthUser | null>(null)
  // Epoch thay đổi khi có thao tác Auth; request /me cũ không được xóa phiên mới.
  const revision = useRef(0)
  const refreshSequence = useRef(0)
  const pendingMutation = useRef<number | null>(null)
  const clear = useCallback((notice?: AccountNotice) => {
    revision.current++
    currentUser.current = null
    setUser(null)
    setStatus('anonymous')
    setError(null)
    if (notice !== undefined) setAccountNotice(notice)
  }, [])
  const invalidatePending = useCallback(() => { revision.current++ }, [])
  const refresh = useCallback(async () => {
    if (pendingMutation.current !== null) return
    const epoch = revision.current
    const sequence = ++refreshSequence.current
    // Revalidate nền giữ trang/form đang mở; chỉ bootstrap mới chặn toàn trang.
    if (!currentUser.current) setStatus('loading')
    setError(null)
    try {
      const current = await api.getCurrentUser()
      if (epoch !== revision.current || sequence !== refreshSequence.current) return
      if (current.status !== 'active') { clear(); return }
      currentUser.current = current
      setUser(current)
      setStatus('authenticated')
    } catch (failure) {
      if (epoch !== revision.current || sequence !== refreshSequence.current) return
      if (isAxiosError(failure) && [401, 403, 419].includes(failure.response?.status ?? 0)) clear()
      else {
        setError(authErrorMessage(failure))
        setStatus(currentUser.current ? 'authenticated' : 'error')
      }
    }
  }, [clear])

  useEffect(() => {
    void Promise.resolve().then(refresh)
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => {
      invalidatePending()
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, invalidatePending])

  const authenticate = async <T,>(input: T, action: (value: T) => Promise<AuthUser>) => {
    setAccountNotice(null)
    const epoch = ++revision.current
    pendingMutation.current = epoch
    try {
      const current = await action(input)
      if (epoch !== revision.current) throw new Error('Authentication request superseded')
      ++revision.current
      currentUser.current = current
      setUser(current)
      setStatus('authenticated')
      setError(null)
      return current
    } catch (failure) {
      if (epoch === revision.current) setStatus(currentUser.current ? 'authenticated' : 'anonymous')
      throw failure
    } finally {
      if (pendingMutation.current === epoch) pendingMutation.current = null
    }
  }
  const login = (input: LoginInput) => authenticate(input, api.login)
  const register = (input: RegisterInput) => authenticate(input, api.register)
  const logout = async () => {
    setAccountNotice(null)
    const epoch = ++revision.current
    pendingMutation.current = epoch
    try { await api.logout(); clear() }
    catch (failure) {
      if (isAxiosError(failure) && failure.response?.status === 401) clear()
      else throw failure
    } finally {
      if (pendingMutation.current === epoch) pendingMutation.current = null
    }
  }
  const updateProfile = (input: ProfileNameInput) => {
    if (pendingMutation.current !== null) throw new Error('Một thao tác tài khoản đang được xử lý.')
    return authenticate(input, api.updateProfile)
  }
  const changePassword = async (input: ChangePasswordInput) => {
    if (pendingMutation.current !== null) return false
    const epoch = ++revision.current
    pendingMutation.current = epoch
    try {
      await api.changePassword(input)
      if (epoch !== revision.current) return false
      clear('password-updated')
      return true
    }
    catch (failure) {
      if (epoch !== revision.current) return false
      // A lost response may follow a committed change. Re-authenticate rather than resend credentials automatically.
      const statusCode = isAxiosError(failure) ? failure.response?.status : undefined
      if (![422, 429, 419].includes(statusCode ?? 0)) clear([401, 403, 409].includes(statusCode ?? 0) ? 'profile-session-ended' : 'password-unknown')
      throw failure
    } finally { if (pendingMutation.current === epoch) pendingMutation.current = null }
  }
  return <AuthContext.Provider value={{ user, status, error, accountNotice, refresh, login, register, logout, updateProfile, changePassword }}>{children}</AuthContext.Provider>
}
