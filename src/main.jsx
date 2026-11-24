import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// PWA: keep the install prompt so we can show our own "Install app" button.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__installPrompt = e
  window.dispatchEvent(new Event('digibiz:installable'))
})
window.addEventListener('appinstalled', () => {
  window.__installPrompt = null
  window.dispatchEvent(new Event('digibiz:installable'))
})
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      // Make sure this build's bundles are available offline.
      const urls = [...document.querySelectorAll('script[src^="/assets/"], link[href^="/assets/"]')].map((el) => el.src || el.href)
      const cache = await caches.open('digibiz-runtime-v1')
      await Promise.all(urls.map(async (u) => (await cache.match(u)) || cache.add(u)))
    } catch {
      /* offline support is best-effort */
    }
  })
}
