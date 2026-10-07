import { useEffect, useRef, useState, type WheelEvent } from 'react'
import { formatRevenueYearsInput, parseRevenueYearsInput } from '@/lib/board/revenueYearAllocation'

type Props = {
  revenueYear: number
  revenueYear2: number | null | undefined
  disabled?: boolean
  onChange: (years: { revenueYear: number; revenueYear2: number | null }) => void
}

function blurOnWheel(e: WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur()
}

export function RevenueYearInput({ revenueYear, revenueYear2, disabled, onChange }: Props) {
  const [text, setText] = useState(() => formatRevenueYearsInput(revenueYear, revenueYear2))
  const focused = useRef(false)

  useEffect(() => {
    if (focused.current) return
    setText(formatRevenueYearsInput(revenueYear, revenueYear2))
  }, [revenueYear, revenueYear2])

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      value={text}
      placeholder="2026 or 2026 and 2027"
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        const parsed = parseRevenueYearsInput(text)
        if (parsed === 'invalid') {
          setText(formatRevenueYearsInput(revenueYear, revenueYear2))
          return
        }
        onChange({ revenueYear: parsed.revenueYear, revenueYear2: parsed.revenueYear2 })
        setText(formatRevenueYearsInput(parsed.revenueYear, parsed.revenueYear2))
      }}
      onWheel={blurOnWheel}
      onChange={(e) => setText(e.target.value)}
    />
  )
}
