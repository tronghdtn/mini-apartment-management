import { z } from 'zod'
import { registrationFields, passwordFitsBcrypt, passwordsMatch, passwordConfirmationRule } from '../../lib/accountSchemas.ts'

export const profileNameSchema = z.object({ full_name: registrationFields.full_name }).strict()
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại').refine(passwordFitsBcrypt, 'Mật khẩu không hợp lệ hoặc vượt 72 byte'),
  password: registrationFields.password,
  password_confirmation: registrationFields.password_confirmation,
}).strict().refine(passwordsMatch, passwordConfirmationRule)
  .refine(value => value.password !== value.current_password, { path: ['password'], message: 'Mật khẩu mới phải khác mật khẩu hiện tại' })

export type ProfileNameInput = z.infer<typeof profileNameSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
