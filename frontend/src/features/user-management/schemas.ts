import { z } from 'zod'
import { registrationFields, passwordsMatch, passwordConfirmationRule } from '../../lib/accountSchemas.ts'

export const userFiltersSchema = z.object({
  role: z.enum(['', 'user', 'resident', 'admin', 'technician', 'guard'], { error: 'Vai trò không hợp lệ.' }),
  status: z.enum(['', 'active', 'locked'], { error: 'Trạng thái không hợp lệ.' }),
  has_active_contract: z.enum(['', '0', '1'], { error: 'Bộ lọc đang thuê không hợp lệ.' }),
  q: z.string().trim().refine(value => Array.from(value).length <= 191, 'Từ khóa tìm kiếm tối đa 191 ký tự.'),
})
export const userPageSchema = z.number().int('Số trang phải là số nguyên.').min(1, 'Số trang phải từ 1.').max(2147483647, 'Số trang vượt giới hạn.')
export type UserFilters = z.infer<typeof userFiltersSchema>

export const staffUserSchema = z.object({
  ...registrationFields,
  role: z.enum(['technician', 'guard'], { error: 'Chỉ được cấp tài khoản Kỹ thuật viên hoặc Bảo vệ.' }),
}).refine(passwordsMatch, passwordConfirmationRule)
export type StaffUserInput = z.infer<typeof staffUserSchema>

export const userStatusSchema = z.object({
  status: z.enum(['active', 'locked'], { error: 'Trạng thái tài khoản không hợp lệ.' }),
}).strict()

export const userNameSchema = z.object({ full_name: registrationFields.full_name }).strict()
export type UserNameInput = z.infer<typeof userNameSchema>
