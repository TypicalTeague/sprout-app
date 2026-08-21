import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA install (spec.md story 11) + a prerequisite for push (story 12).
// Feature-checked and fail-soft — a no-op in unsupported browsers and in
// the Vitest/jsdom test environment (no navigator.serviceWorker there).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sprout] service worker registration failed', err);
    });
  });
}
