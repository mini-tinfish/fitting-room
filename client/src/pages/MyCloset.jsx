
import { useRef, useState } from 'react'
import './MyCloset.css'
import { addItem, removeItem } from '../closetStore'
import { removeBackground } from '../api/removeBackground'

const categories = [
  { value: 'all', label: 'All' },
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'dress', label: 'Dresses' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessory', label: 'Accessories' },
]

const emptyItem = {
  name: '',
  category: 'top',
  color: '',
  warmth: 'medium',
  tags: '',
  image: '',
  backgroundRemoved: false,
}

// status: 'idle' | 'processing' | 'done' | 'failed' | 'original' (user chose to keep the original)
const emptyPhoto = { file: null, original: '', status: 'idle', error: '', retryable: false }

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function MyCloset({ clothes, setClothes }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

const [showUpload, setShowUpload] = useState(false)
const [uploadError, setUploadError] = useState('')
const [saving, setSaving] = useState(false)
const [removingId, setRemovingId] = useState(null)
const [closetError, setClosetError] = useState('')

const [newItem, setNewItem] = useState(emptyItem)
const [photo, setPhoto] = useState(emptyPhoto)
// Bumped for every new attempt so a slow, older result can't replace a newer photo.
const photoRequest = useRef(0)

const filteredClothes = clothes.filter((item) => {
  const matchesCategory =
    category === 'all' || item.category === category

  const query = search.toLowerCase().trim()

  // Items saved by the older closet screen may have no name, color, or tags.
  const matchesSearch =
    (item.name || '').toLowerCase().includes(query) ||
    (item.color || '').toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query) ||
    (item.category === 'shoes' && query === 'shoe') ||
    (item.category === 'top' && query === 'tops') ||
    (item.category === 'bottom' && query === 'bottoms') ||
    (item.category === 'dress' && query === 'dresses') ||
    (item.category === 'accessory' && query === 'accessories') ||
    (item.tags || []).some((tag) => tag.toLowerCase().includes(query))

  return matchesCategory && matchesSearch
})

async function runBackgroundRemoval(file) {
  const request = ++photoRequest.current

  // Nothing can be saved until the user has a processed image or picks the original.
  setNewItem((previous) => ({ ...previous, image: '', backgroundRemoved: false }))
  setPhoto((previous) => ({ ...previous, status: 'processing', error: '' }))

  try {
    const image = await removeBackground(file)
    if (request !== photoRequest.current) return
    setNewItem((previous) => ({ ...previous, image, backgroundRemoved: true }))
    setPhoto((previous) => ({ ...previous, status: 'done' }))
  } catch (error) {
    if (request !== photoRequest.current) return
    setPhoto((previous) => ({
      ...previous,
      status: 'failed',
      error: error.message,
      retryable: error.retryable !== false,
    }))
  }
}

function keepOriginalPhoto() {
  photoRequest.current++
  setNewItem((previous) => ({ ...previous, image: photo.original, backgroundRemoved: false }))
  setPhoto((previous) => ({ ...previous, status: 'original' }))
}

async function handlePhotoUpload(event) {
  const file = event.target.files?.[0]
  // Clear the input so choosing the same photo again still starts a new attempt.
  event.target.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    setUploadError('Please select an image.')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    setUploadError('Please choose an image under 5 MB.')
    return
  }

  setUploadError('')

  let original
  try {
    original = await readFile(file)
  } catch {
    setUploadError('Could not read this image.')
    return
  }

  setPhoto({ ...emptyPhoto, file, original })
  runBackgroundRemoval(file)
}

async function handleSaveClothing(event) {
  event.preventDefault()

  // Ignore extra clicks while the first save is still running.
  if (saving) return

  if (photo.status === 'processing') {
    setUploadError('Please wait for the background to finish removing.')
    return
  }

  if (photo.status === 'failed') {
    setUploadError('Choose Try Again or Keep Original Photo before saving.')
    return
  }

  if (!newItem.name.trim() || !newItem.image) {
    setUploadError('Please add a name and clothing photo.')
    return
  }

  // addItem() assigns the id, so none is set here.
  const item = {
    name: newItem.name.trim(),
    category: newItem.category,
    color: newItem.color.trim().toLowerCase(),
    warmth: newItem.warmth,
    tags: newItem.tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
    image: newItem.image,
    // false = the user chose to keep the original photo. Older items don't have this field.
    backgroundRemoved: newItem.backgroundRemoved,
  }

  setSaving(true)
  setUploadError('')

  let savedItem
  try {
    savedItem = await addItem(item)
  } catch {
    setUploadError('Could not save this item. Please try again.')
    return
  } finally {
    setSaving(false)
  }

  setClothes((previous) => [...previous, savedItem])

  setSearch('')
  setCategory('all')
  setShowUpload(false)
  setUploadError('')

  setNewItem(emptyItem)
  setPhoto(emptyPhoto)
}

async function handleRemove(id) {
  if (removingId) return

  setRemovingId(id)
  setClosetError('')

  try {
    await removeItem(id)
    setClothes((previous) => previous.filter((item) => item.id !== id))
  } catch {
    setClosetError('Could not remove this item. Please try again.')
  } finally {
    setRemovingId(null)
  }
}


  return (
    <div className="closet-window">
      <div className="closet-window-bar">
        <span>♡ MY WARDROBE ♡</span>
        <span aria-hidden="true">□ ×</span>
      </div>

      <div className="closet-window-content">
        <div className="closet-top-row">
          <p>{clothes.length} pieces in your closet</p>

<button
  className="closet-add-btn"
  type="button"
  onClick={() => setShowUpload(true)}
>
  + Add Clothing
</button>

        </div>

        <input
          className="closet-search"
          type="search"
          placeholder="Search your wardrobe..."
          aria-label="Search clothing"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="closet-categories">
          {categories.map((item) => (
            <button
              key={item.value}
              className={`closet-filter ${
                category === item.value ? 'selected' : ''
              }`}
              onClick={() => setCategory(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="closet-grid">
          {filteredClothes.map((item) => (
            <div className="clothing-card" key={item.id}>
              <div className="clothing-image">
                {item.image ? (
                  <img src={item.image} alt={item.name || item.category} />
                ) : (
                  <span aria-hidden="true">👗</span>
                )}
              </div>

              <h3>{item.name || item.category}</h3>
              <p>
                {item.category.toUpperCase()}
                {item.color && ` · ${item.color}`}
              </p>
              <div className="clothing-tags">
                {(item.tags || []).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <button
                className="clothing-remove-btn"
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={removingId !== null}
                aria-label={`Remove ${item.name || item.category}`}
              >
                {removingId === item.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>

        {closetError && (
          <p className="closet-upload-error" role="alert">
            {closetError}
          </p>
        )}

        {filteredClothes.length === 0 && (
          <p className="closet-empty">
            {clothes.length === 0
              ? 'Your closet is empty. Add your first piece! ♡'
              : 'No clothing matches your search. ♡'}
          </p>
        )}
      </div>
      
{showUpload && (
  <div className="closet-modal-overlay">
    <div
      className="closet-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="closet-modal-title"
    >
      <div className="closet-modal-header">
        <strong id="closet-modal-title">
          ♡ Add to My Closet
        </strong>

        <button
          type="button"
          aria-label="Close upload window"
          onClick={() => setShowUpload(false)}
        >
          ×
        </button>
      </div>

      <form
        className="closet-upload-form"
        onSubmit={handleSaveClothing}
      >
        <label
          className="closet-photo-upload"
          aria-busy={photo.status === 'processing'}
        >
          {photo.status === 'done' ? (
            <img
              className="closet-photo-transparent"
              src={newItem.image}
              alt="Clothing preview with the background removed"
            />
          ) : photo.original ? (
            <img
              className={photo.status === 'processing' ? 'closet-photo-processing' : ''}
              src={photo.original}
              alt="Original clothing photo"
            />
          ) : (
            <span>📷 Choose a clothing photo</span>
          )}

          {photo.original && (
            <span className="closet-field-hint">Tap to choose a different photo</span>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
          />
        </label>

        {photo.status === 'processing' && (
          <p className="closet-bg-status" role="status">
            <span className="closet-bg-spinner" aria-hidden="true" />
            Removing background...
          </p>
        )}

        {photo.status === 'done' && (
          <p className="closet-bg-status" role="status">
            ✓ Background removed! Check the preview, then save.
          </p>
        )}

        {photo.status === 'failed' && (
          <div className="closet-bg-panel">
            <p className="closet-upload-error" role="alert">
              {photo.error} Your photo hasn't been saved yet.
            </p>
            <div className="closet-bg-actions">
              {photo.retryable && (
                <button
                  className="closet-bg-btn"
                  type="button"
                  onClick={() => runBackgroundRemoval(photo.file)}
                >
                  Try Again
                </button>
              )}
              <button
                className="closet-bg-btn"
                type="button"
                onClick={keepOriginalPhoto}
              >
                Keep Original Photo
              </button>
            </div>
          </div>
        )}

        {photo.status === 'original' && (
          <div className="closet-bg-panel">
            <p className="closet-bg-status" role="status">
              Keeping the original photo. The background was not removed.
            </p>
            {photo.retryable && (
              <div className="closet-bg-actions">
                <button
                  className="closet-bg-btn"
                  type="button"
                  onClick={() => runBackgroundRemoval(photo.file)}
                >
                  Try Removing Again
                </button>
              </div>
            )}
          </div>
        )}

        <label>
          Clothing name
          <input
            required
            placeholder="e.g. Pink Cardigan"
            value={newItem.name}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                name: e.target.value,
              })
            }
          />
        </label>

        <div className="closet-form-row">
          <label>
            Category
            <select
              value={newItem.category}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  category: e.target.value,
                })
              }
            >
              <option value="top">Tops</option>
              <option value="bottom">Bottoms</option>
              <option value="dress">Dresses</option>
              <option value="shoes">Shoes</option>
              <option value="accessory">Accessories</option>
            </select>
          </label>

          <label>
            Warmth
            <select
              value={newItem.warmth}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  warmth: e.target.value,
                })
              }
            >
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="warm">Warm</option>
            </select>
          </label>
        </div>

        <label>
          Color
          <input
            placeholder="e.g. Pink"
            value={newItem.color}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                color: e.target.value,
              })
            }
          />
        </label>

        <label>
          Aesthetic tags
          <input
            placeholder="coquette, casual, y2k"
            aria-describedby="closet-tags-hint"
            value={newItem.tags}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                tags: e.target.value,
              })
            }
          />
          <span id="closet-tags-hint" className="closet-field-hint">
            Style Me matches these: 90s rom-com, clean girl, y2k, dark academia, streetwear.
          </span>
        </label>

        {uploadError && (
          <p className="closet-upload-error" role="alert">
            {uploadError}
          </p>
        )}

        <button
          className="closet-save-btn"
          type="submit"
          disabled={saving || photo.status === 'processing' || photo.status === 'failed'}
        >
          {photo.status === 'processing'
            ? 'Removing background…'
            : saving
              ? 'Saving…'
              : '♡ Save to Closet'}
        </button>
      </form>
    </div>
  </div>
)}

    </div>
  )
}
