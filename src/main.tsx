import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// @ts-ignore
import { registerSW } from 'virtual:pwa-register'

// Register the PWA service worker
registerSW({
  immediate: true,
  onRegistered(r: any) {
    // Optionally check for updates periodically
    if (r) {
      setInterval(() => {
        r.update()
      }, 60 * 60 * 1000 /* 1 hour */)
    }
  }
})

// Automatically reload the page when a new service worker takes over (e.g. after a Vercel deployment)
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
