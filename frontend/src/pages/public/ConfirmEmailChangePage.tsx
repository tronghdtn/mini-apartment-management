import { useSearchParams } from 'react-router'
import { AuthCardShell } from '@/features/auth/AuthCardShell'
import { EmailLinkAction } from '@/features/auth/EmailLinkAction'
import { confirmEmailChange } from '@/features/auth/emailApi'

export function ConfirmEmailChangePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  return <AuthCardShell title="Xác nhận email mới">
    <EmailLinkAction description="Bấm nút bên dưới để dùng địa chỉ này làm email đăng nhập. Email cũ sẽ không còn dùng để đăng nhập."
      actionLabel="Xác nhận đổi email" invalid={token ? undefined : 'Liên kết xác nhận không đầy đủ.'} run={() => confirmEmailChange(token)} />
  </AuthCardShell>
}
