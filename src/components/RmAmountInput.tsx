import { useEffect, useRef, useState, type CSSProperties, type WheelEvent } from 'react'
import { formatRmAmountInput, parseRmAmountInput, RM_AMOUNT_INPUT_RE } from '@/lib/rmAmountInput'

type RmAmountInputProps = {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  className?: string
  style?: CSSProperties
  id?: string
  'aria-label'?: string
}

function blurOnWheel(e: WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur()
}

/** RM amount without number-input spinners or wheel nudging. */
export function RmAmountInput({ value, onChange, disabled, className, style, id, 'aria-label': ariaLabel }: RmAmountInputProps) {
  const [text, setText] = useState(() => formatRmAmountInput(value))
  const focused = useRef(false)

  useEffect(() => {
    if (focused.current) return
    setText(formatRmAmountInput(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      className={className}
      style={style}
      id={id}
      aria-label={ariaLabel}
      value={text}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        const parsed = parseRmAmountInput(text)
        if (parsed === 'invalid') {
          setText(formatRmAmountInput(value))
          return
        }
        onChange(parsed)
        setText(formatRmAmountInput(parsed))
      }}
      onWheel={blurOnWheel}
      onChange={(e) => {
        const v = e.target.value.replace(/,/g, '')
        if (v !== '' && !RM_AMOUNT_INPUT_RE.test(v)) return
        setText(v)
        const parsed = parseRmAmountInput(v)
        if (parsed !== 'invalid') onChange(parsed)
      }}
    />
  )
}

type RmAmountStringInputProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  style?: CSSProperties
  id?: string
  'aria-label'?: string
}

/** Same behaviour for string-backed RM fields (targets, commitments). */
export function RmAmountStringInput({
  value,
  onChange,
  disabled,
  className,
  style,
  id,
  'aria-label': ariaLabel,
}: RmAmountStringInputProps) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      className={className}
      style={style}
      id={id}
      aria-label={ariaLabel}
      value={value}
      onWheel={blurOnWheel}
      onChange={(e) => {
        const v = e.target.value.replace(/,/g, '')
        if (v === '' || RM_AMOUNT_INPUT_RE.test(v)) onChange(v)
      }}
    />
  )
}
