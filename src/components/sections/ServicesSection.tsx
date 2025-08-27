import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const container: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '0.75rem 0rem',
  color: '#E6EAF2',
  overflowY: 'auto',
  overflowX: 'hidden'
}

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '0.6rem'
}

const card: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '0.75rem',
  backdropFilter: 'blur(8px)',
  transition: 'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease',
  cursor: 'pointer'
}

const cardHover: CSSProperties = {
  transform: 'translateY(-2px)',
  borderColor: 'rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)'
}



export const ServicesSection = () => {
  const { t } = useTranslation()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const services = [
    { id: 'gameDevelopment', name: t('services.items.gameDevelopment.name'), desc: t('services.items.gameDevelopment.desc') },
    { id: 'xrDevelopment', name: t('services.items.xrDevelopment.name'), desc: t('services.items.xrDevelopment.desc') },
    { id: 'gameEngineProgramming', name: t('services.items.gameEngineProgramming.name'), desc: t('services.items.gameEngineProgramming.desc') },
    { id: '3dModelling', name: t('services.items.3dModelling.name'), desc: t('services.items.3dModelling.desc') },
    { id: 'gameBackend', name: t('services.items.gameBackend.name'), desc: t('services.items.gameBackend.desc') },
    { id: 'gameTesting', name: t('services.items.gameTesting.name'), desc: t('services.items.gameTesting.desc') }
  ]

  return (
    <div style={container}  className='no-scrollbar'>
      <div style={grid}>
        {services.map((s, index) => (
          <div
            key={s.id}
            style={{
              ...card,
              ...(hoveredIndex === index ? cardHover : {})
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div style={{ fontWeight: 600, color: '#E6EAF2' }}>{s.name}</div>
            <div style={{ color: '#A8B3C8', fontSize: '0.9rem', marginTop: '0.25rem' }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ServicesSection


