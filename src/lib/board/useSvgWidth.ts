import { useLayoutEffect, useRef, useState } from 'react'

/** Match prototype widthOf(): container width minus padding, minimum 320. */
export function useSvgWidth(min = 320): [React.RefObject<HTMLElement>, number] {
  const ref = useRef<HTMLElement>(null!)
  const [w, setW] = useState(min)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setW(Math.max(min, Math.floor(rect.width - 4)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [min])
  return [ref, w]
}
