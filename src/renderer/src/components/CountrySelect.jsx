import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import 'flag-icons/css/flag-icons.min.css'
import { COUNTRIES } from '../data/countries'

// Compact country picker (flag + dial code) that sits in front of the mobile number input.
// Same portaled-panel approach as SearchableSelect, for the same reason: the signup card
// clips overflow.
export default function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [panelRect, setPanelRect] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    const top = rect.bottom + 6
    setPanelRect({
      top,
      left: rect.left,
      width: Math.max(300, rect.width),
      listMaxHeight: Math.max(120, Math.min(280, window.innerHeight - top - 16 - 56))
    })
    searchRef.current?.focus()
    const close = () => setOpen(false)
    const onDocClick = (e) => {
      if (!triggerRef.current.contains(e.target) && !panelRef.current?.contains(e.target)) close()
    }
    const onKeyDown = (e) => e.key === 'Escape' && close()
    const onScroll = (e) => {
      if (!panelRef.current?.contains(e.target)) close() // scrolling the list itself is fine
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '')
    if (!q) return COUNTRIES
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dial.startsWith(q))
  }, [query])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="field-select-trigger country-trigger"
        aria-label={`Country: ${value.name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`fi fi-${value.iso}`} aria-hidden="true" />
        <span>+{value.dial}</span>
        <span className="field-select-trigger-arrow" aria-hidden="true">
          ▾
        </span>
      </button>

      {open &&
        panelRect &&
        createPortal(
          <div
            ref={panelRef}
            className="field-select-panel"
            style={{
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
              maxHeight: panelRect.listMaxHeight + 64
            }}
          >
            <input
              ref={searchRef}
              type="text"
              className="field-select-search"
              placeholder="Search country..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div
              className="field-select-options"
              style={{ maxHeight: panelRect.listMaxHeight, minHeight: 0, overflowY: 'scroll' }}
            >
              {filtered.length === 0 && <div className="field-select-empty">No matches</div>}
              {filtered.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  className={`field-select-option country-option ${
                    c.iso === value.iso ? 'field-select-option-selected' : ''
                  }`}
                  onClick={() => {
                    onChange(c)
                    setOpen(false)
                  }}
                >
                  <span className={`fi fi-${c.iso}`} aria-hidden="true" />
                  <span className="country-option-name">{c.name}</span>
                  <span className="country-option-dial">+{c.dial}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
