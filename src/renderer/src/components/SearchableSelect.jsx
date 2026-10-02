import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// A searchable dropdown for long option lists (e.g. all 36 Indian states/UTs): click to open,
// type to filter, click an option to pick it. Styled to match the signup form's plain text
// inputs so it drops into the same field grid without looking out of place.
//
// The panel is rendered into document.body via a portal (positioned from the trigger's own
// bounding rect) rather than as a normal child: the signup card clips overflow for its
// decorative top-scan animation, which would otherwise cut the panel off.
export default function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  ariaInvalid
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [panelRect, setPanelRect] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const onDocClick = (e) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target) &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    // the panel is positioned from a snapshot of the trigger's rect, so close if the page
    // behind it scrolls — but scrolling *inside* the options list itself must not close it
    // (scroll events don't bubble, but they do reach window during the capture phase, so a
    // naive listener here would slam the dropdown shut the instant someone scrolled the list)
    const onScroll = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    const top = rect.bottom + 6
    // how much vertical room is actually below the trigger, capped at a sane max — computed as
    // a number and applied as an inline style below rather than relied on via CSS max-height,
    // since inline styles can't be lost to a stale stylesheet
    const listMaxHeight = Math.max(120, Math.min(280, window.innerHeight - top - 16 - 56))
    setPanelRect({ top, left: rect.left, width: rect.width, listMaxHeight })
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, query])

  return (
    <div className="field-select" ref={rootRef}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="field-select-trigger"
        aria-invalid={ariaInvalid}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={value ? 'field-select-trigger-label' : 'field-select-trigger-placeholder'}>
          {value || placeholder}
        </span>
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
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div
              className="field-select-options"
              style={{ maxHeight: panelRect.listMaxHeight, minHeight: 0, overflowY: 'scroll' }}
            >
              {filtered.length === 0 && <div className="field-select-empty">No matches</div>}
              {filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`field-select-option ${o === value ? 'field-select-option-selected' : ''}`}
                  onClick={() => {
                    onChange(o)
                    setOpen(false)
                  }}
                >
                  {o}
                  {o === value && (
                    <span className="field-select-option-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
