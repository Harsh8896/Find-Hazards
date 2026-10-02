import { useEffect, useRef, useState } from 'react'

// A dropdown with exactly two choices: "All-Time" or "Select Date". Picking "Select Date"
// opens a native date picker (input[type=date]) so the admin can jump straight to any day,
// instead of scrolling/searching a list that grows by one entry per day the game is played.
export default function DateFilterSelect({
  value, // 'all_time' | 'YYYY-MM-DD'
  onChange,
  disabled,
  className = '',
  formatDate, // (isoDate) => display label, e.g. "26 Sept 2026 (Today)"
  maxDate // 'YYYY-MM-DD', optional upper bound for the date picker
}) {
  const [open, setOpen] = useState(false)
  const [pickingDate, setPickingDate] = useState(false)
  const rootRef = useRef(null)
  const dateInputRef = useRef(null)

  const isDay = value !== 'all_time'
  const label = isDay ? `Day-wise — ${formatDate(value)}` : 'All-Time (every game ever played)'

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

  useEffect(() => {
    if (!pickingDate) return
    const input = dateInputRef.current
    if (!input) return
    input.focus()
    try {
      input.showPicker?.()
    } catch {
      // some platforms restrict showPicker(); the input is still focused and usable
    }
  }, [pickingDate])

  const handleDateChange = (e) => {
    const v = e.target.value
    if (v) {
      onChange(v)
      setOpen(false)
    }
  }

  return (
    <div className={`date-filter-select ${className}`} ref={rootRef}>
      <button
        type="button"
        className="date-filter-select-trigger"
        disabled={disabled}
        onClick={() => {
          setPickingDate(false)
          setOpen((v) => !v)
        }}
      >
        <span className="date-filter-select-trigger-label">{label}</span>
        <span className="date-filter-select-trigger-arrow" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && !disabled && (
        <div className="date-filter-select-panel">
          <button
            type="button"
            className={`date-filter-select-option ${!isDay ? 'date-filter-select-option-selected' : ''}`}
            onClick={() => {
              onChange('all_time')
              setOpen(false)
            }}
          >
            <span className="date-filter-select-option-check" aria-hidden="true">
              {!isDay ? '✓' : ''}
            </span>
            All-Time (every game ever played)
          </button>

          <button
            type="button"
            className={`date-filter-select-option ${isDay ? 'date-filter-select-option-selected' : ''}`}
            onClick={() => setPickingDate(true)}
          >
            <span className="date-filter-select-option-check" aria-hidden="true">
              {isDay ? '✓' : ''}
            </span>
            {isDay ? `Select Date — ${formatDate(value)}` : 'Select Date'}
          </button>

          {pickingDate && (
            <input
              ref={dateInputRef}
              type="date"
              className="date-filter-select-date-input"
              value={isDay ? value : ''}
              max={maxDate}
              onChange={handleDateChange}
            />
          )}
        </div>
      )}
    </div>
  )
}
