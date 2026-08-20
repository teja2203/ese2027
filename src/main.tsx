import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/tokens.css'
import './styles/globals.css'
import './styles/components.css'
import './styles/today.css'
import './styles/focus.css'
import './styles/plan.css'
import './styles/progress.css'
import './styles/blocks.css'
import './styles/you.css'
import './styles/premium.css'

const rootEl = document.getElementById('app')!

// Splash is a 5-second black screen; removed after first paint to avoid
// a blank gate, but we wait 5s minimum so the branded gate never flashes.
function dismissSplash() {
  const splash = document.getElementById('splash')
  if (!splash) return
  splash.remove()
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Dismiss splash after 5s floor — ensures the black gate is never visible
// longer than the intended intro period, while still avoiding a blank screen.
requestAnimationFrame(() => {
  setTimeout(dismissSplash, 5000)
})
