import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DevPanel } from './DevPanel'

/**
 * Dev Page - Only accessible in development mode
 * Redirects to home in production
 */
export const DevPage = () => {
  const navigate = useNavigate()

  // Redirect to home if not in dev mode
  useEffect(() => {
    if (!import.meta.env.DEV) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  // Don't render anything in production
  if (!import.meta.env.DEV) {
    return null
  }

  return <DevPanel onClose={() => navigate('/')} />
}

export default DevPage
