
import MyCloset from './pages/MyCloset'
import StyleMe from './pages/StyleMe'
import MyWeek from './pages/MyWeek'
import { useEffect, useState } from 'react'
import {
  addPlan,
  getCloset,
  getLooks,
  getPlans,
  removeLook,
  removePlan,
  saveLook,
  updatePlan,
} from './closetStore'
import { normalizeOutfit } from './outfit'
import './App.css'
import fittingRoomTitle from './assets/branding/fitting-room-title.png'
import lookbookLabel from './assets/navigation/lookbook.png'
import myWeekLabel from './assets/navigation/my_week.png'
import styleMeLabel from './assets/navigation/style_me.png'
import myClosetLabel from './assets/navigation/my_closet.png'
import myClosetIcon from './assets/navigation/my_closet_icon.png'
import styleMeIcon from './assets/navigation/style_me_icon.png'
import myWeekIcon from './assets/navigation/my_week_icon.png'
import lookbookIcon from './assets/navigation/lookbook_icon.png'
import LookbookGrid from './pages/MyLooks'

const tabs = [
  { id: 'closet', label: 'My Closet', icon: '👚', image: myClosetLabel, iconImage: myClosetIcon },
  { id: 'style', label: 'Style Me', icon: '✨', image: styleMeLabel, iconImage: styleMeIcon },
  { id: 'planner', label: 'My Week', icon: '📅', image: myWeekLabel, iconImage: myWeekIcon},
  { id: 'saved', label: 'Lookbook', icon: '♡', image: lookbookLabel, iconImage: lookbookIcon },
]

const emptyDraft = { mode: 'separates', picks: {}, accessories: [], editingPlan: null, planDate: null }

function App() {
  const [activeTab, setActiveTab] = useState('closet')
  const [closet, setCloset] = useState([])
  // Lookbook favorites and My Week plans live here too, so every page sees changes immediately.
  const [looks, setLooks] = useState([])
  const [plans, setPlans] = useState([])
  const [closetLoading, setClosetLoading] = useState(true)
  const [closetError, setClosetError] = useState('')
  // The outfit on Style Me's dressing room. Kept here so it survives switching tabs,
  // and so My Week / Lookbook can open an outfit in Style Me.
  const [styleDraft, setStyleDraft] = useState(emptyDraft)

  // Read saved clothes, looks and plans from IndexedDB. This only reads, so it never overwrites stored data.
  function fetchCloset(isCancelled = () => false) {
    Promise.all([getCloset(), getLooks(), getPlans()])
      .then(([items, savedLooks, savedPlans]) => {
        if (isCancelled()) return
        setCloset(items)
        setLooks(savedLooks)
        setPlans(savedPlans)
      })
      .catch(() => {
        if (!isCancelled()) setClosetError('Could not load your saved clothes.')
      })
      .finally(() => {
        if (!isCancelled()) setClosetLoading(false)
      })
  }

  useEffect(() => {
    let cancelled = false
    fetchCloset(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [])

  function retryLoadCloset() {
    setClosetLoading(true)
    setClosetError('')
    fetchCloset()
  }

  // Each change is written to IndexedDB first, then shown, so the screen never shows unsaved data.
  async function handleSaveLook(look) {
    const saved = await saveLook(look)
    setLooks((previous) => [...previous, saved])
    return saved
  }

  async function handleRemoveLook(id) {
    await removeLook(id)
    setLooks((previous) => previous.filter((look) => look.id !== id))
  }

  async function handleAddPlan(plan) {
    const saved = await addPlan(plan)
    setPlans((previous) => [...previous, saved])
    return saved
  }

  async function handleUpdatePlan(id, changes) {
    const updated = await updatePlan(id, changes)
    if (updated) setPlans((previous) => previous.map((plan) => (plan.id === id ? updated : plan)))
    return updated
  }

  async function handleRemovePlan(id) {
    await removePlan(id)
    setPlans((previous) => previous.filter((plan) => plan.id !== id))
    setStyleDraft((previous) => (previous.editingPlan?.id === id ? { ...previous, editingPlan: null } : previous))
  }

  // Put an outfit on the Style Me dressing room and switch to it.
  function openInStyleMe({ outfit, editingPlan = null, planDate = null }) {
    setStyleDraft((previous) => {
      if (!outfit) return { ...previous, editingPlan, planDate }
      const normalized = normalizeOutfit(outfit)
      return {
        mode: normalized.type,
        picks: { ...previous.picks, top: normalized.top, bottom: normalized.bottom, dress: normalized.dress, shoes: normalized.shoes },
        accessories: normalized.accessories,
        editingPlan,
        planDate,
      }
    })
    setActiveTab('style')
  }

  // Same gate on every page: wait for saved data so new saves can't race the initial load.
  function whenLoaded(content) {
    if (closetLoading) {
      return (
        <div className="placeholder-card">
          <p>Opening your wardrobe…</p>
        </div>
      )
    }
    if (closetError) {
      return (
        <div className="placeholder-card" role="alert">
          <p>{closetError}</p>
          <button type="button" onClick={retryLoadCloset}>
            Try again
          </button>
        </div>
      )
    }
    return content
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">YOUR DIGITAL WARDROBE</p>
          
<h1 className="title-wrap">
  <img
    src={fittingRoomTitle}
    alt="The Fitting Room"
    className="title-image"
  />
</h1>

        </div>
        
{/* Our original pixel-art cat mascot */}
<img
  src="/pwa-192x192.png"
  alt="The Fitting Room pixel cat mascot"
  className="mascot-logo"
/>

      </header>

      <main className="app-main">
        {activeTab === 'closet' && (
          <section className="page">
            <p className="eyebrow">WELCOME TO YOUR WARDROBE</p>
            <h2 className="page-title">
  <img
    src={myClosetLabel}
    alt="My Closet"
    className="page-title-image"
  />
</h2>
            <p>All your favorite pieces, in one little place.</p>

            {whenLoaded(<MyCloset clothes={closet} setClothes={setCloset} />)}
          </section>
        )}

        {activeTab === 'style' && (
          <section className="page">
            <p className="eyebrow">LET'S GET DRESSED</p>
            <h2 className="page-title">
  <img
    src={styleMeLabel}
    alt="Style Me"
    className="page-title-image"
  />
</h2>
            <p>Ask Darling for a look, pick a vibe, or flip through your pieces.</p>

            {whenLoaded(
              <StyleMe
                closet={closet}
                looks={looks}
                draft={styleDraft}
                setDraft={setStyleDraft}
                onSaveLook={handleSaveLook}
                onAddPlan={handleAddPlan}
                onUpdatePlan={handleUpdatePlan}
                onGoTo={setActiveTab}
              />
            )}
          </section>
        )}

        {activeTab === 'saved' && (
          <section className="page">
            <p className="eyebrow">THE LOOKBOOK</p>
            <h2 className="page-title">
  <img
    src={lookbookLabel}
    alt="Lookbook"
    className="page-title-image"
  />
</h2>
            <p>Keep the outfits you love.</p>

            {/* The Lookbook shows its own empty state only when nothing is saved. */}
            {whenLoaded(
              <LookbookGrid
                closet={closet}
                looks={looks}
                onRemoveLook={handleRemoveLook}
                onAddPlan={handleAddPlan}
                onRestyle={(outfit) => openInStyleMe({ outfit })}
                onGoTo={setActiveTab}
              />
            )}
          </section>
        )}

        
{activeTab === 'planner' && (
  <section className="page">
    <p className="eyebrow">YOUR WEEKLY LOOKBOOK</p>
    <h2 className="page-title">
  <img
    src={myWeekLabel}
    alt="My Week"
    className="page-title-image"
  />
</h2>
    <p>Seven days, seven looks. Plan what to wear!</p>

    {whenLoaded(
      <MyWeek
        closet={closet}
        looks={looks}
        plans={plans}
        onAddPlan={handleAddPlan}
        onUpdatePlan={handleUpdatePlan}
        onRemovePlan={handleRemovePlan}
        onEditOutfit={(plan) => openInStyleMe({ outfit: plan.outfit, editingPlan: plan })}
        onBuildForDate={(date) => openInStyleMe({ planDate: date })}
      />
    )}
  </section>
)}

      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            
{tab.iconImage ? (
  <img
    src={tab.iconImage}
    alt=""
    className="nav-icon-image"
  />
) : (
  <span className="nav-icon">{tab.icon}</span>
)}

            {tab.image ? (
  <img
    src={tab.image}
    alt=""
    className="nav-label-image"
  />
) : (
  <span>{tab.label}</span>
)}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App


