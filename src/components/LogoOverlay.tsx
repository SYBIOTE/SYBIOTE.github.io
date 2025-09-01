import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface LogoOverlayProps {
  name?: string
  photoSrc?: string
}

export const LogoOverlay = ({
  name,
  photoSrc = '/assets/img/profile-img.jpg'
}: LogoOverlayProps) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const displayName = name || t("core.name")

  return (
    <>
      <style>
        {`
          @keyframes fadeInExpand {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <div
        id="logo-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1002,
          padding: 'clamp(10px, 2vw, 20px)',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'auto'
        }}
      >
        <div
          id="logo-overlay-card"
          style={{
            position: 'relative',
            background: isExpanded 
              ? 'linear-gradient(180deg, rgba(30,136,229,0.12) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.06) 100%)'
              : 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            borderTop: isExpanded ? '1px solid rgba(59, 147, 224, 0.12)' : '1px solid rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '0.5rem',
            padding: isExpanded 
              ? 'clamp(16px, 2.5vw, 24px) clamp(20px, 3.5vw, 32px)'
              : 'clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)',
            boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.04)',
            transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            width: isExpanded ? 'min(92vw, 720px)' : 'fit-content',
            maxWidth: isExpanded ? '720px' : 'none',
            minWidth: isExpanded ? 'auto' : 'fit-content'
          }}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          <div
            id="logo-overlay-trigger"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'clamp(10px, 2vw, 16px)',
              cursor: 'pointer',
              transition: 'gap 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            <img
              id="logo-overlay-photo"
              style={{
                width: 'clamp(36px, 6vw, 56px)',
                height: 'clamp(36px, 6vw, 56px)',
                borderRadius: '50%',
                objectFit: 'cover',
                border: isExpanded 
                  ? '2px solid rgba(30,136,229,0.4)'
                  : '1px solid rgba(255,255,255,0.15)',
                boxShadow: isExpanded 
                  ? '0 0.25rem 0.5rem rgba(30,136,229,0.2)'
                  : '0 0.125rem 0.25rem rgba(0,0,0,0.04)',
                flexShrink: 0,
                transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
              }}
              src={photoSrc}
              alt={displayName}
            />
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              minWidth: 0,
              overflow: 'hidden',
              transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}>
              <span
                id="logo-overlay-name"
                style={{
                  color: 'white',
                  fontSize: 'clamp(14px, 2.2vw, 18px)',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  textShadow: isExpanded 
                    ? '0 1px 2px rgba(0,0,0,0.4), 0 0 8px rgba(30,136,229,0.3)'
                    : '0 1px 2px rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), text-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
              >
                {displayName}
              </span>
              <span
                id="logo-overlay-cue"
                style={{
                  color: isExpanded 
                    ? 'rgba(30,136,229,0.8)'
                    : 'rgba(255,255,255,0.55)',
                  fontSize: 'clamp(14px, 1.6vw, 20px)',
                  lineHeight: 1,
                  opacity: isExpanded ? 0.9 : 0.5,
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
                aria-hidden="true"
              >
                ▾
              </span>
            </div>
          </div>
          { isExpanded && (
            <div
              id="logo-overlay-expanded-content"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '16px',
                opacity: 1,
                animation: 'fadeInExpand 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                transform: 'translateY(0)',
                transformOrigin: 'top'
              }}
            >
            <div id="logo-overlay-about-header" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderTop: '1px solid rgba(30,136,229,0.2)',
              paddingTop: '12px'
            }}>
              <span id="logo-overlay-about-title" style={{ 
                fontWeight: 700, 
                fontSize: '0.95rem', 
                opacity: 0.9 
              }}>
                {t("profile.about.title")}
              </span>
              <span id="logo-overlay-about-summary" style={{ 
                fontSize: '0.85rem', 
                opacity: 0.7 
              }}>
                {t("profile.about.summary" , { name: t("core.name") })}
              </span>
            </div>
            
            <div id="logo-overlay-about-role" style={{ 
              fontSize: '0.9rem', 
              opacity: 0.95, 
              fontWeight: 600 
            }}>
              {t("core.role")}
            </div>
            
            <div id="logo-overlay-about-quote" style={{ 
              fontSize: '0.8rem', 
              opacity: 0.8, 
              fontStyle: 'italic',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '0.375rem',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              {t("profile.about.quote")}
            </div>
            
            <div id="logo-overlay-about-meta" style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '12px', 
              marginTop: '4px' 
            }}>
              <div id="logo-overlay-about-city" style={{
                fontSize: '0.8rem',
                opacity: 0.85,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.25rem',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <strong>{t("labels.city")}</strong> {t("core.city")}
              </div>
              <div id="logo-overlay-about-email" style={{
                fontSize: '0.8rem',
                opacity: 0.85,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.25rem',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <strong>{t("labels.email")}</strong> {t("core.email")}
              </div>
              <div id="logo-overlay-about-website" style={{
                fontSize: '0.8rem',
                opacity: 0.85,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.25rem',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <strong>{t("labels.website")}</strong> {t("core.website")}
              </div>
              <div id="logo-overlay-about-freelance" style={{
                fontSize: '0.8rem',
                opacity: 0.85,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.25rem',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <strong>{t("labels.freelance")}</strong> {t("core.freelance")}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  )
}
