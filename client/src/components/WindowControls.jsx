import expandIcon from '../assets/buttons/expand_icon.png'
import exitIcon from '../assets/buttons/exit_icon.png'
import './WindowControls.css'

// The retro window title bars' expand + exit icons. Purely decorative: the page windows
// can't actually be resized or closed, so these are hidden from screen readers and not clickable.
export function WindowControls() {
  return (
    <span className="window-controls" aria-hidden="true">
      <img src={expandIcon} alt="" className="window-icon" />
      <img src={exitIcon} alt="" className="window-icon" />
    </span>
  )
}

// The exit artwork for popups' real close buttons. The button itself carries the
// accessible label and the click handler; this is just its picture.
export function CloseIcon() {
  return <img src={exitIcon} alt="" className="window-icon window-icon-close" />
}
