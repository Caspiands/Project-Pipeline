/** Copy for the sign-in screens, kept in one place and reused from the prototype. */
export const AUTH_COPY = {
  wrongCredentials: 'That email and password do not match.',
  enterEmailAndPassword: 'Enter your email and password.',
  enterWorkEmail: 'Enter your work email.',
  enterCode: 'Enter the 6-digit code from the email.',
  codeSentFallback: 'Enter the 6-digit code we emailed you. It expires 10 minutes after it was sent.',
  codeSent: (hint: string, minutes: number) => `We sent a 6-digit code to ${hint}. It expires in ${minutes} minutes.`,
  resend: 'Send a new code',
  resendIn: (s: number) => `Send a new code (${s}s)`,
  sessionEnded: 'Your verified session has ended. Enter a new code.',
  signedOut: 'You are signed out.',
  deactivated: 'Your access is switched off or not set up yet. Contact the board admin.',
  resetSent: 'If that email has an account, a reset link is on its way. Open it on this device.',
  passwordTooShort: 'Use at least 10 characters.',
  passwordsDiffer: 'The two passwords do not match.',
  passwordSaved: 'Password saved. Now enter the code we email you.',
  statusCheckFailed: (detail: string) => `We could not check your sign-in. ${detail}`,
  needLink: 'Open the link from your invite or password-reset email on this device to set a password.',
} as const

/** Maps Supabase sign-in errors to copy that never reveals whether the email exists. */
export function signInErrorMessage(message: string): string {
  if (/invalid login|invalid credentials|email not confirmed|invalid_grant/i.test(message)) {
    return AUTH_COPY.wrongCredentials
  }
  return message
}
