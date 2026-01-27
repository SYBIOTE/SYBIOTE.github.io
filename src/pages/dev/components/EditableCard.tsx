import type { CSSProperties } from 'react'

interface EditableCardProps {
  title: string
  subtitle?: string
  image?: string
  onEdit: () => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const cardStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  overflow: 'hidden',
  transition: 'all 0.2s ease'
}

const imageContainerStyle: CSSProperties = {
  width: '100%',
  height: '140px',
  background: 'rgba(255, 255, 255, 0.03)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden'
}

const imageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}

const noImageStyle: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.3)',
  fontSize: '0.75rem'
}

const contentStyle: CSSProperties = {
  padding: '0.875rem'
}

const titleStyle: CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.95)',
  marginBottom: '0.25rem'
}

const subtitleStyle: CSSProperties = {
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.5)'
}

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: '0.375rem',
  marginTop: '0.75rem'
}

const actionButtonStyle: CSSProperties = {
  flex: 1,
  padding: '0.5rem',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '6px',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.7)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  transition: 'all 0.2s ease'
}

const deleteButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  borderColor: 'rgba(239, 68, 68, 0.3)',
  color: 'rgba(239, 68, 68, 0.8)'
}

const moveButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  flex: 'none',
  width: '32px',
  padding: '0.5rem'
}

export const EditableCard = ({
  title,
  subtitle,
  image,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown
}: EditableCardProps) => {
  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
      }}
    >
      <div style={imageContainerStyle}>
        {image ? (
          <img
            src={image}
            alt={title}
            style={imageStyle}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <span style={noImageStyle}>No image</span>
        )}
      </div>

      <div style={contentStyle}>
        <div style={titleStyle}>{title}</div>
        {subtitle && <div style={subtitleStyle}>{subtitle}</div>}

        <div style={actionsStyle}>
          {onMoveUp && (
            <button
              style={moveButtonStyle}
              onClick={onMoveUp}
              title="Move up"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              style={moveButtonStyle}
              onClick={onMoveDown}
              title="Move down"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              ↓
            </button>
          )}
          <button
            style={actionButtonStyle}
            onClick={onEdit}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(30, 136, 229, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.4)'
              e.currentTarget.style.color = 'rgba(30, 136, 229, 1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
            }}
          >
            Edit
          </button>
          <button
            style={deleteButtonStyle}
            onClick={onDelete}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditableCard
