import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'

import { App } from './app/App.tsx'
import './i18n/i18n' // Initialize i18next
import './utils/logger' // Initialize global logger

import './styles/index.css'
import './styles/scrollbar.css'

// Lazy load DevPage only in development mode
// This ensures the dev panel code is completely excluded from production builds
const DevPage = import.meta.env.DEV
  ? lazy(() => import('./pages/dev/DevPage'))
  : () => null

// Create router with routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />
  },
  // Dev route - only functional in development mode
  ...(import.meta.env.DEV
    ? [
        {
          path: '/dev',
          element: (
            <Suspense fallback={<div style={{ background: '#0d0f11', height: '100vh' }} />}>
              <DevPage />
            </Suspense>
          )
        }
      ]
    : [])
])

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
