
import { useState } from 'react'
import './MyCloset.css'

// Temporary sample data.
// TODO: Replace with real wardrobe data from App.jsx.
const sampleClothes = [
  {
    id: 'top1',
    name: 'Pink Cardigan',
    category: 'top',
    color: 'pink',
    warmth: 'light',
    tags: ['coquette', 'casual'],
    image: '',
  },
  {
    id: 'bottom1',
    name: 'Plaid Skirt',
    category: 'bottom',
    color: 'brown',
    warmth: 'medium',
    tags: ['dark academia'],
    image: '',
  },
  {
    id: 'shoes1',
    name: 'Mary Janes',
    category: 'shoes',
    color: 'black',
    warmth: 'medium',
    tags: ['vintage', 'coquette'],
    image: '',
  },
]

const categories = [
  { value: 'all', label: 'All' },
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'shoes', label: 'Shoes' },
]

export default function MyCloset({ clothes, setClothes }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

const [showUpload, setShowUpload] = useState(false)
const [uploadError, setUploadError] = useState('')

const [newItem, setNewItem] = useState({
  name: '',
  category: 'top',
  color: '',
  warmth: 'medium',
  tags: '',
  image: '',
})

const filteredClothes = clothes.filter((item) => {
  const matchesCategory =
    category === 'all' || item.category === category

  const query = search.toLowerCase().trim()

  const matchesSearch =
    item.name.toLowerCase().includes(query) ||
    item.color.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query) ||
    (item.category === 'shoes' && query === 'shoe') ||
    (item.category === 'top' && query === 'tops') ||
    (item.category === 'bottom' && query === 'bottoms') ||
    item.tags.some((tag) => tag.toLowerCase().includes(query))

  return matchesCategory && matchesSearch
})

function handlePhotoUpload(event) {
  const file = event.target.files?.[0]
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

  const reader = new FileReader()

  reader.onload = () => {
    setNewItem((previous) => ({
      ...previous,
      image: String(reader.result),
    }))
  }

  reader.onerror = () => {
    setUploadError('Could not read this image.')
  }

  reader.readAsDataURL(file)
}

function handleSaveClothing(event) {
  event.preventDefault()

  if (!newItem.name.trim() || !newItem.image) {
    setUploadError('Please add a name and clothing photo.')
    return
  }

  const item = {
    id: crypto.randomUUID(),
    name: newItem.name.trim(),
    category: newItem.category,
    color: newItem.color.trim().toLowerCase(),
    warmth: newItem.warmth,
    tags: newItem.tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
    image: newItem.image,
  }

  setClothes((previous) => [...previous, item])

  setSearch('')
  setCategory('all')
  setShowUpload(false)
  setUploadError('')

  setNewItem({
    name: '',
    category: 'top',
    color: '',
    warmth: 'medium',
    tags: '',
    image: '',
  })
}


  return (
    <div className="closet-window">
      <div className="closet-window-bar">
        <span>♡ MY WARDROBE ♡</span>
        <span aria-hidden="true">□ ×</span>
      </div>

      <div className="closet-window-content">
        <div className="closet-top-row">
          <p>{sampleClothes.length} pieces in your closet</p>

          {/* TODO: Connect the clothing upload form */}
          
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
                  <img src={item.image} alt={item.name} />
                ) : (
                  <span aria-hidden="true">👗</span>
                )}
              </div>

              <h3>{item.name}</h3>
              <p>
                {item.category.toUpperCase()} · {item.color}
              </p>
              <div className="clothing-tags">
                {item.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredClothes.length === 0 && (
          <p className="closet-empty">
            No clothing matches your search. ♡
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
        <label className="closet-photo-upload">
          {newItem.image ? (
            <img
              src={newItem.image}
              alt="Clothing preview"
            />
          ) : (
            <span>📷 Choose a clothing photo</span>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
          />
        </label>

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
              <option value="shoes">Shoes</option>
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
            value={newItem.tags}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                tags: e.target.value,
              })
            }
          />
        </label>

        {uploadError && (
          <p className="closet-upload-error" role="alert">
            {uploadError}
          </p>
        )}

        <button
          className="closet-save-btn"
          type="submit"
        >
          ♡ Save to Closet
        </button>
      </form>
    </div>
  </div>
)}

    </div>
  )
}
