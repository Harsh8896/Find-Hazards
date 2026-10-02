import { useEffect, useRef, useState } from 'react'

// A generic styled dropdown (button + floating panel with a checkmark on the selected option),
// used anywhere a plain native <select> would look out of place next to DateFilterSelect. Shares
// its visual language (and CSS classes) with DateFilterSelect so every admin dropdown matches.
export default function Select({ value, onChange, options, disabled, className = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const current = options.find((o) => o.value === value)

  return (
    <div className={`date-filter-select ${className}`} ref={rootRef}>
      <button
        type="button"
        className="date-filter-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="date-filter-select-trigger-label">{current?.label ?? ''}</span>
        <span className="date-filter-select-trigger-arrow" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && !disabled && (
        <div className="date-filter-select-panel">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`date-filter-select-option ${
                o.value === value ? 'date-filter-select-option-selected' : ''
              }`}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              <span className="date-filter-select-option-check" aria-hidden="true">
                {o.value === value ? '✓' : ''}
              </span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
