import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App.tsx'
import './i18n/i18n' // Initialize i18next

import './styles/index.css'
import './styles/scrollbar.css'

// ✅ Redirect if running on GitHub Pages
if (window.location.hostname === "sybiote.github.io") {
  window.location.replace("https://rahulgh0sh.vercel.app/");
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
