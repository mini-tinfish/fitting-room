
import { useState } from 'react'
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
import { getOutfitRecommendation } from './api/stylist'

const tabs = [
  { id: 'closet', label: 'My Closet', icon: '👚', image: myClosetLabel, iconImage: myClosetIcon },
  { id: 'style', label: 'Style Me', icon: '✨', image: styleMeLabel, iconImage: styleMeIcon },
  { id: 'planner', label: 'My Week', icon: '📅', image: myWeekLabel, iconImage: myWeekIcon},
  { id: 'saved', label: 'Lookbook', icon: '♡', image: lookbookLabel, iconImage: lookbookIcon },
]


function App() {
  const [activeTab, setActiveTab] = useState('closet')
  const [closet] = useState([])
  const [occasion] = useState('')
  const [aesthetic] = useState('')
  const [weather] = useState('')
  const [loading, setLoading] = useState(false)
  const [recommendedIds, setRecommendedIds] = useState([])
  const [stylistNote, setStylistNote] = useState('')

  async function handleStyleMe() {
    setLoading(true);
    try {
      const result = await getOutfitRecommendation({ closet, occasion, aesthetic, weather });
      setRecommendedIds(result.selectedItemIds);
      setStylistNote(result.stylistComment);
    } catch {
      // Fallback logic: Pick 1 Top, 1 Bottom, and 1 Pair of Shoes randomly from closet
      const fallbackTop = closet.find(i => i.category === 'tops')?.id;
      const fallbackBottom = closet.find(i => i.category === 'bottoms')?.id;
      const fallbackShoes = closet.find(i => i.category === 'shoes')?.id;

      setRecommendedIds([fallbackTop, fallbackBottom, fallbackShoes].filter(Boolean));
      setStylistNote("Here's a quick staple combo from your wardrobe!");
    } finally {
      setLoading(false);
    }
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

            <div className="placeholder-card">
              <span className="placeholder-icon">👗</span>
              <h3>Your closet awaits!</h3>
              <p>Start adding your favorite clothing pieces.</p>
              {/* TODO: Connect to wardrobe upload functionality */}
              <button type="button" disabled>Add clothing — coming soon</button>
            </div>
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
            <p>Your personal stylist is almost ready.</p>

            <div className="placeholder-card">
              <span className="placeholder-icon">✨</span>
              <h3>Find your fit</h3>
              <p>Outfit recommendations based on your wardrobe, vibe, and weather.</p>
              <button type="button" onClick={handleStyleMe} disabled={loading}>
                {loading ? 'Styling…' : 'Generate outfit'}
              </button>

              {stylistNote && <p>{stylistNote}</p>}
              {recommendedIds.length > 0 && (
                <ul>
                  {recommendedIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              )}
            </div>
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

            <div className="placeholder-card">
              <span className="placeholder-icon">♡</span>
              <h3>No saved looks yet</h3>
              <p>Your favorite combinations will appear here.</p>
              {/* TODO: Connect saved outfits */}
            </div>
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

    <div className="week-grid">
      {Array.from({ length: 7 }, (_, index) => {
        const date = new Date()
        date.setDate(date.getDate() + index)

        return (
          <div className="day-card" key={index}>
            <span>
              {date.toLocaleDateString('en-US', {
                weekday: 'short',
              })}
            </span>
            <strong>{date.getDate()}</strong>
            <span>👗</span>
          </div>
        )
      })}
    </div>

    <div className="placeholder-card">
      <span className="placeholder-icon">📅</span>
      <h3>Your weekly fits await!</h3>
      <p>
        Soon you'll be able to assign outfits to each
        day and plan around the weather.
      </p>
      {/* TODO: Add outfit scheduling, weather, and Gemini. */}
    </div>
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


