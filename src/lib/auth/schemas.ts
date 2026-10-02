import { z } from 'zod'
import { AUTH_COPY } from './messages'

export const signInSchema = z.object({
  email: z.string().trim().min(1, AUTH_COPY.enterEmailAndPassword).email('Enter a valid email address.'),
  password: z.string().min(1, AUTH_COPY.enterEmailAndPassword),
})
export type SignInValues = z.infer<typeof signInSchema>

export const resetSchema = z.object({
  email: z.string().trim().min(1, AUTH_COPY.enterWorkEmail).email('Enter a valid email address.'),
})
export type ResetValues = z.infer<typeof resetSchema>

/** Minimum 10 characters, typed twice. The server enforces the same minimum. */
export const passwordSchema = z
  .object({
    password: z.string().min(10, AUTH_COPY.passwordTooShort),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: AUTH_COPY.passwordsDiffer, path: ['confirm'] })
export type PasswordValues = z.infer<typeof passwordSchema>
