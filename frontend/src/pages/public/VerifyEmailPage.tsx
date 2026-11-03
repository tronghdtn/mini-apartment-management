import { useSearchParams } from 'react-router'
import { AuthCardShell } from '@/features/auth/AuthCardShell'
import { EmailLinkAction } from '@/features/auth/EmailLinkAction'
import { verifyEmail } from '@/features/auth/emailApi'
import { verifyLinkSchema } from '@/features/auth/emailSchemas'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const link = verifyLinkSchema.safeParse({ id: params.get('id'), hash: params.get('hash'), expires: params.get('expires'), signature: params.get('signature') })
  return <AuthCardShell title="Xác minh email">
    <EmailLinkAction description="Bấm nút bên dưới để xác minh email của tài khoản." actionLabel="Xác minh email"
      invalid={link.success ? undefined : 'Liên kết xác minh không đầy đủ hoặc không hợp lệ.'} run={() => verifyEmail(link.data!)} />
  </AuthCardShell>
}
