import { useEffect, useState } from 'react'
import PlanOutfitModal from '../components/PlanOutfitModal'
import RetroModal from '../components/RetroModal'
import OutfitStrip from '../components/OutfitStrip'
import { SLOT_LABELS, normalizeOutfit, outfitPieces } from '../outfit'
import { daysBetween, formatDate, relativeDayLabel, toDateKey, upcomingDays } from '../dates'
import plusButtonImage from '../assets/buttons/outfit_weekday_plus.png'
import pushPinImage from '../assets/buttons/push_pin_weekly.png'
import './MyWeek.css'

// My Week shows today plus the next six days, rolling forward every day.
// Plans further ahead stay saved and slide into view once their date is within the week.
export default function MyWeek({ closet, looks, plans, onAddPlan, onUpdatePlan, onRemovePlan, onEditOutfit, onBuildForDate }) {
  const [today, setToday] = useState(() => toDateKey())
  // { kind: 'day' | 'choose' | 'fromLook' | 'reschedule' | 'view', date?, look?, plan? }
  const [dialog, setDialog] = useState(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [message, setMessage] = useState('')

  // Move the window forward if the app stays open past midnight or is reopened on a new day.
  useEffect(() => {
    function refresh() {
      setToday(toDateKey())
    }
    const timer = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const days = upcomingDays(7, today)
  const lastDay = days[days.length - 1]
  const sorted = [...plans].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || '')
  )
  const plansOn = (day) => sorted.filter((plan) => plan.date === day)
  const later = sorted.filter((plan) => plan.date > lastDay)
  // Re-read live, so the day pop-up updates when a plan in it is removed or moved.
  const dayDialogPlans = dialog?.kind === 'day' ? plansOn(dialog.date) : []

  function whereItShows(date) {
    if (date > lastDay) return ` It will show up here when ${formatDate(date)} is within the week.`
    return ''
  }

  async function handleAddFromLook(look, { date, occasion, notes }) {
    // The plan gets its own copy of the ids, so the Lookbook favorite never changes.
    await onAddPlan({ date, occasion, notes, outfit: normalizeOutfit(look.itemIds), lookId: look.id })
    setDialog(null)
    setMessage(`📅 Planned for ${formatDate(date)}.${whereItShows(date)}`)
  }

  async function handleReschedule(plan, { date, occasion, notes }) {
    const updated = await onUpdatePlan(plan.id, { date, occasion, notes })
    if (!updated) throw new Error('Plan not found')
    setDialog(null)
    setMessage(`📅 Saved for ${formatDate(date)}.${whereItShows(date)}`)
  }

  async function handleRemove(plan) {
    if (removingId) return
    setRemovingId(plan.id)
    try {
      await onRemovePlan(plan.id)
      setMessage('Removed from My Week.')
      if (dialog?.plan?.id === plan.id) setDialog(null)
    } catch {
      setMessage('Could not remove this plan. Please try again.')
    } finally {
      setRemovingId(null)
      setConfirmRemoveId(null)
    }
  }

  function jumpTo(day) {
    document.getElementById(`week-day-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cardProps = {
    closet,
    confirmRemoveId,
    removingId,
    onView: (plan) => setDialog({ kind: 'view', plan }),
    onReschedule: (plan) => setDialog({ kind: 'reschedule', plan }),
    onEdit: onEditOutfit,
    onAskRemove: setConfirmRemoveId,
    onRemove: handleRemove,
  }

  return (
    <div className="my-week">
      <div className="week-grid">
        {days.map((day) => {
          const dayPlans = plansOn(day)
          const weekday = formatDate(day, { weekday: 'long' })
          // The card holds two buttons (a button can't sit inside another):
          // the day and date scroll to that day on the corkboard; the plus opens its outfits.
          return (
            <div
              className={`day-card ${day === today ? 'is-today' : ''} ${dayPlans.length ? 'has-plans' : ''}`}
              key={day}
            >
              <button
                type="button"
                className="day-card-jump"
                onClick={() => jumpTo(day)}
                aria-label={`${formatDate(day, { weekday: 'long', month: 'long', day: 'numeric' })}: ${
                  dayPlans.length ? `${dayPlans.length} planned` : 'nothing planned'
                }`}
              >
                <span>{formatDate(day, { weekday: 'short' })}</span>
                <strong>{Number(day.slice(8))}</strong>
              </button>
              {dayPlans.length > 0 && (
                <button
                  type="button"
                  className="day-card-plus"
                  onClick={() => setDialog({ kind: 'day', date: day })}
                  aria-haspopup="dialog"
                  aria-label={
                    dayPlans.length === 1
                      ? `View the outfit planned for ${weekday}`
                      : `View ${dayPlans.length} outfits planned for ${weekday}`
                  }
                >
                  <img src={plusButtonImage} alt="" />
                  {dayPlans.length > 1 && (
                    <span className="day-card-count" aria-hidden="true">
                      {dayPlans.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {message && (
        <p className="week-message" role="status">
          {message}
        </p>
      )}

      <div className="week-board">
        {days.map((day) => {
          const dayPlans = plansOn(day)
          return (
            <section className="week-day" id={`week-day-${day}`} key={day} aria-labelledby={`week-day-title-${day}`}>
              <header className="week-day-header">
                <h3 id={`week-day-title-${day}`}>
                  {relativeDayLabel(day, today)}
                  {daysBetween(today, day) < 2 && (
                    <span> · {formatDate(day, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                  )}
                </h3>
                <button type="button" className="od-chip" onClick={() => setDialog({ kind: 'choose', date: day })}>
                  + Plan
                </button>
              </header>

              {dayPlans.length === 0 ? (
                <p className="week-day-empty">Nothing planned yet ♡</p>
              ) : (
                <div className="week-day-plans">
                  {dayPlans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} {...cardProps} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {later.length > 0 && (
        <details className="week-later">
          <summary>
            Coming up later · {later.length} planned {later.length === 1 ? 'outfit' : 'outfits'}
          </summary>
          <p className="week-day-empty">These stay saved and appear in your week as the date gets closer.</p>
          <div className="week-day-plans">
            {later.map((plan) => (
              <PlanCard key={plan.id} plan={plan} showDate {...cardProps} />
            ))}
          </div>
        </details>
      )}

      {/* Opened by a weekday's plus button: every outfit planned that day, as the same
          corkboard cards (View, Change date, Edit outfit, Remove all work from here). */}
      {dialog?.kind === 'day' && (
        <RetroModal
          title={`♡ Planned for ${formatDate(dialog.date, { weekday: 'long', month: 'short', day: 'numeric' })}`}
          onClose={() => setDialog(null)}
          wide
        >
          <div className="od-form">
            {dayDialogPlans.length === 0 ? (
              <p className="od-field-hint">Nothing is planned for this day anymore.</p>
            ) : (
              <div className="week-day-plans">
                {dayDialogPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} {...cardProps} />
                ))}
              </div>
            )}
            <button type="button" className="od-secondary-btn" onClick={() => setDialog({ kind: 'choose', date: dialog.date })}>
              + Plan another outfit
            </button>
          </div>
        </RetroModal>
      )}

      {dialog?.kind === 'choose' && (
        <RetroModal title={`♡ Plan an outfit · ${relativeDayLabel(dialog.date, today)}`} onClose={() => setDialog(null)} wide>
          <div className="od-form">
            <button type="button" className="od-primary-btn" onClick={() => onBuildForDate(dialog.date)}>
              ✧ Build a new outfit in Style Me
            </button>
            <div>
              <p className="od-field">Or pick a look from your Lookbook</p>
              {looks.length === 0 ? (
                <p className="od-field-hint">No saved looks yet. Save one from Style Me first.</p>
              ) : (
                <div className="week-look-picker">
                  {looks.map((look) => (
                    <button
                      type="button"
                      key={look.id}
                      className="week-look-option"
                      onClick={() => setDialog({ kind: 'fromLook', date: dialog.date, look })}
                    >
                      <OutfitStrip outfit={look.itemIds} closet={closet} />
                      <span>
                        {look.aesthetic} · {look.weather}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </RetroModal>
      )}

      {dialog?.kind === 'fromLook' && (
        <PlanOutfitModal
          closet={closet}
          outfit={dialog.look.itemIds}
          defaultDate={dialog.date}
          onSubmit={(details) => handleAddFromLook(dialog.look, details)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'reschedule' && (
        <PlanOutfitModal
          closet={closet}
          outfit={dialog.plan.outfit}
          plan={dialog.plan}
          title="♡ Change Plan"
          submitLabel="♡ Save Changes"
          onSubmit={(details) => handleReschedule(dialog.plan, details)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'view' && (
        <RetroModal title={`♡ ${dialog.plan.occasion || 'Planned outfit'}`} onClose={() => setDialog(null)}>
          <div className="od-form">
            <p className="od-field-hint">
              {formatDate(dialog.plan.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="week-view-pieces">
              {outfitPieces(dialog.plan.outfit, closet)
                .filter((piece) => piece.id)
                .map((piece) => (
                  <div className="week-view-piece" key={`${piece.slot}-${piece.id}`}>
                    <div className="week-view-image">
                      {piece.item ? <img src={piece.item.image} alt={piece.item.name || piece.slot} /> : <span>?</span>}
                    </div>
                    <div>
                      <strong>{SLOT_LABELS[piece.slot]}</strong>
                      <div>{piece.item ? piece.item.name || piece.item.category : "This piece isn't in your closet anymore."}</div>
                    </div>
                  </div>
                ))}
            </div>
            {dialog.plan.notes && <p className="week-notes">{dialog.plan.notes}</p>}
            <div className="week-card-actions">
              <button type="button" className="od-secondary-btn" onClick={() => setDialog({ kind: 'reschedule', plan: dialog.plan })}>
                Change date
              </button>
              <button type="button" className="od-secondary-btn" onClick={() => onEditOutfit(dialog.plan)}>
                Edit outfit
              </button>
            </div>
          </div>
        </RetroModal>
      )}
    </div>
  )
}

// One planned outfit, pinned to the corkboard.
function PlanCard({ plan, closet, showDate = false, confirmRemoveId, removingId, onView, onReschedule, onEdit, onAskRemove, onRemove }) {
  const names = outfitPieces(plan.outfit, closet)
    .filter((piece) => piece.item)
    .map((piece) => piece.item.name || piece.item.category)
  const confirming = confirmRemoveId === plan.id

  return (
    <article className="plan-card">
      <img className="plan-pin" src={pushPinImage} alt="" />
      {showDate && <span className="plan-date">{formatDate(plan.date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</span>}
      <strong className="plan-title">{plan.occasion || 'Planned outfit'}</strong>
      <button type="button" className="plan-preview" onClick={() => onView(plan)} aria-label={`View ${plan.occasion || 'planned outfit'}`}>
        <OutfitStrip outfit={plan.outfit} closet={closet} />
      </button>
      {names.length > 0 && <p className="plan-names">{names.join(' · ')}</p>}
      {plan.notes && <p className="week-notes">{plan.notes}</p>}

      {confirming ? (
        <div className="week-card-actions" role="group" aria-label="Confirm removal">
          <span>Remove this plan?</span>
          <button type="button" className="od-chip" onClick={() => onRemove(plan)} disabled={removingId === plan.id}>
            {removingId === plan.id ? 'Removing…' : 'Yes, remove'}
          </button>
          <button type="button" className="od-chip" onClick={() => onAskRemove(null)}>
            Keep it
          </button>
        </div>
      ) : (
        <div className="week-card-actions">
          <button type="button" className="od-chip" onClick={() => onView(plan)}>
            View
          </button>
          <button type="button" className="od-chip" onClick={() => onReschedule(plan)}>
            Change date
          </button>
          <button type="button" className="od-chip" onClick={() => onEdit(plan)}>
            Edit outfit
          </button>
          <button type="button" className="od-chip" onClick={() => onAskRemove(plan.id)}>
            Remove
          </button>
        </div>
      )}
    </article>
  )
}
