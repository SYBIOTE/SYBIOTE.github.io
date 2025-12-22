import { createRoot } from 'react-dom/client'

import { App } from './app/App.tsx'
import './i18n/i18n' // Initialize i18next
import './utils/logger' // Initialize global logger

import './styles/index.css'
import './styles/scrollbar.css'

createRoot(document.getElementById('root')!).render(
  <App />
)
