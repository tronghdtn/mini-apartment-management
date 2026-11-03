import { Link, useSearchParams } from 'react-router'
import { AuthCardShell } from '@/features/auth/AuthCardShell'
import { ResetPasswordForm } from '@/features/auth/PasswordRecoveryForms'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? '', token = params.get('token') ?? ''
  return <AuthCardShell title="Đặt lại mật khẩu">
    {email && token ? <ResetPasswordForm email={email} token={token} />
      : <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Liên kết đặt lại mật khẩu không đầy đủ. <Link to="/forgot-password" className="font-bold underline">Gửi lại liên kết</Link></p>}
  </AuthCardShell>
}
