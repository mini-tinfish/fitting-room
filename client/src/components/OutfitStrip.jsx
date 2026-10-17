import { outfitPieces, SLOT_LABELS } from '../outfit'

// A row of small thumbnails, one per piece. Deleted pieces show a gentle placeholder.
export default function OutfitStrip({ outfit, closet, showNames = false }) {
  const pieces = outfitPieces(outfit, closet).filter((piece) => piece.id)

  if (pieces.length === 0) {
    return <p className="od-field-hint">No pieces in this outfit.</p>
  }

  return (
    <div className="od-outfit-strip">
      {pieces.map((piece) => {
        const label = piece.item?.name || SLOT_LABELS[piece.slot]
        return (
          <div className="od-outfit-thumb" key={`${piece.slot}-${piece.id}`}>
            {piece.item ? (
              <div className="od-outfit-thumb-image">
                <img src={piece.item.image} alt={label} />
              </div>
            ) : (
              <div
                className="od-outfit-thumb-image od-outfit-thumb-missing"
                title="This piece isn't in your closet anymore."
              >
                <span aria-hidden="true">?</span>
              </div>
            )}
            {(showNames || !piece.item) && (
              <span>{piece.item ? label : `${SLOT_LABELS[piece.slot]} removed`}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
