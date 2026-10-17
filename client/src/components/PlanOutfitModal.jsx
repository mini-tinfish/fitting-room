import { useState } from 'react'
import RetroModal from './RetroModal'
import OutfitStrip from './OutfitStrip'
import { isOutfitEmpty } from '../outfit'
import { formatDate, isDateKey, relativeDayLabel, toDateKey, upcomingDays } from '../dates'

// Pick a date (any future day, not just this week), an occasion and notes for an outfit.
// Used to plan a new outfit and to reschedule an existing plan (pass `plan`).
export default function PlanOutfitModal({
  closet,
  outfit,
  plan,
  defaultDate,
  title = '♡ Plan This Outfit',
  submitLabel = '♡ Add to My Week',
  onSubmit,
  onClose,
}) {
  const today = toDateKey()
  const [date, setDate] = useState(plan?.date || defaultDate || today)
  const [occasion, setOccasion] = useState(plan?.occasion || '')
  const [notes, setNotes] = useState(plan?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const empty = isOutfitEmpty(outfit)
  // An existing plan may keep its own (possibly past) date; anything new must be today or later.
  const dateOk = isDateKey(date) && (date >= today || date === plan?.date)

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    if (empty) {
      setError('Add at least one piece before planning this outfit.')
      return
    }
    if (!dateOk) {
      setError('Pick today or a future date.')
      return
    }

    setSaving(true)
    setError('')
    try {
      // The parent closes this window once the plan is saved.
      await onSubmit({ date, occasion: occasion.trim(), notes: notes.trim() })
    } catch {
      setError('Could not save this plan. Please try again.')
      setSaving(false)
    }
  }

  return (
    <RetroModal title={title} onClose={onClose}>
      <form className="od-form" onSubmit={handleSubmit}>
        <OutfitStrip outfit={outfit} closet={closet} />

        <fieldset className="od-field od-fieldset">
          <legend>When?</legend>
          <div className="od-chip-row">
            {upcomingDays(7, today).map((day) => (
              <button
                key={day}
                type="button"
                className="od-chip"
                aria-pressed={date === day}
                onClick={() => setDate(day)}
              >
                {relativeDayLabel(day, today)}
              </button>
            ))}
          </div>
          <label className="od-field">
            <span className="od-field-hint">…or any date on the calendar</span>
            <input
              type="date"
              min={plan?.date && plan.date < today ? plan.date : today}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          {dateOk && (
            <span className="od-field-hint">
              {formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </fieldset>

        <label className="od-field">
          Occasion (optional)
          <input
            placeholder="e.g. First date, Brunch, Holiday party"
            maxLength={80}
            value={occasion}
            onChange={(event) => setOccasion(event.target.value)}
          />
        </label>

        <label className="od-field">
          Notes (optional)
          <textarea
            placeholder="e.g. Dinner downtown, bring a jacket"
            maxLength={300}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {error && (
          <p className="od-error" role="alert">
            {error}
          </p>
        )}

        <button className="od-primary-btn" type="submit" disabled={saving || empty}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </form>
    </RetroModal>
  )
}
