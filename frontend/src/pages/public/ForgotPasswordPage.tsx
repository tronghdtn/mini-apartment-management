import { AuthCardShell } from '@/features/auth/AuthCardShell'
import { ForgotPasswordForm } from '@/features/auth/PasswordRecoveryForms'

export function ForgotPasswordPage() {
  return <AuthCardShell title="Quên mật khẩu"><ForgotPasswordForm /></AuthCardShell>
}
