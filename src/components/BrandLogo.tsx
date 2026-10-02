type BrandLogoProps = {
  /** `bar` = sticky header; `auth` = sign-in card (slightly larger). */
  variant?: 'bar' | 'auth'
  className?: string
}

/** CDS wordmark from company assets (local copy in /public). */
export function BrandLogo({ variant = 'bar', className = '' }: BrandLogoProps) {
  return (
    <img
      src="/cds-logo.png"
      alt="Caspian Digital Solutions"
      className={`brand-logo brand-logo--${variant}${className ? ` ${className}` : ''}`}
      width={662}
      height={120}
      decoding="async"
    />
  )
}
