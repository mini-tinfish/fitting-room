// Planned outfits store calendar days as local "YYYY-MM-DD" strings.
// Never build these with toISOString(): it converts to UTC and can move a plan to the day before or after.

export function toDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// new Date('2026-10-18') would be read as UTC midnight, so build the local date by hand.
export function fromDateKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toDateKey(fromDateKey(value)) === value
}

export function addDays(key, count) {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + count)
  return toDateKey(date)
}

// Whole days from a to b. Rounding absorbs the 23/25-hour days around daylight saving changes.
export function daysBetween(a, b) {
  return Math.round((fromDateKey(b) - fromDateKey(a)) / 86400000)
}

// Today plus the next (count - 1) days: a rolling window, not a fixed Monday–Sunday week.
export function upcomingDays(count = 7, start = toDateKey()) {
  return Array.from({ length: count }, (_, index) => addDays(start, index))
}

export function formatDate(key, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return fromDateKey(key).toLocaleDateString('en-US', options)
}

// "Today", "Tomorrow", or "Fri, Oct 23".
export function relativeDayLabel(key, today = toDateKey()) {
  const offset = daysBetween(today, key)
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  return formatDate(key)
}
