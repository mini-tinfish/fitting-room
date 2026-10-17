import { useEffect, useId, useRef } from 'react'
import './RetroModal.css'

// Pop-up window in the same style as the Add Clothing window.
// Closes on Escape or a click outside, and puts focus back where it was when it closes.
export default function RetroModal({ title, onClose, children, wide = false }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)

  // Keep the latest onClose without re-running the focus effect on every render.
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const previousFocus = document.activeElement
    dialogRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [])

  return (
    <div
      className="od-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`od-modal ${wide ? 'od-modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="od-modal-header">
          <strong id={titleId}>{title}</strong>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="od-modal-body">{children}</div>
      </div>
    </div>
  )
}
