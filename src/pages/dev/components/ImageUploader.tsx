import { useState, useRef, type CSSProperties, useCallback } from 'react'

interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  placeholder?: string
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
}

const previewContainerStyle: CSSProperties = {
  width: '100%',
  height: '120px',
  borderRadius: '8px',
  overflow: 'hidden',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative'
}

const imageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}

const placeholderStyle: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.3)',
  fontSize: '0.75rem'
}

const inputRowStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem'
}

const inputStyle: CSSProperties = {
  flex: 1,
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.8rem',
  outline: 'none'
}

const uploadButtonStyle: CSSProperties = {
  padding: '0.5rem 0.875rem',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '6px',
  background: 'rgba(255, 255, 255, 0.08)',
  color: 'rgba(255, 255, 255, 0.8)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap'
}

const errorStyle: CSSProperties = {
  color: 'rgba(239, 68, 68, 0.8)',
  fontSize: '0.7rem'
}

export const ImageUploader = ({ value, onChange, placeholder = 'Image URL' }: ImageUploaderProps) => {
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // For now, we'll use a data URL approach
      // In production, you'd upload to a server or CDN
      const reader = new FileReader()
      reader.onload = () => {
        // Create a suggested path for the user
        const suggestedPath = `/assets/img/portfolio/${file.name}`
        onChange(suggestedPath)
        setUploading(false)
        
        // Show info about manual file placement
        alert(`Image selected: ${file.name}\n\nTo use this image:\n1. Copy the image to: public${suggestedPath}\n2. The URL has been set to: ${suggestedPath}`)
      }
      reader.onerror = () => {
        setError('Failed to read file')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Failed to process image')
      setUploading(false)
    }
  }, [onChange])

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    onChange(e.target.value)
  }

  return (
    <div style={containerStyle}>
      <div style={previewContainerStyle}>
        {value ? (
          <img
            src={value}
            alt="Preview"
            style={imageStyle}
            onError={() => setError('Failed to load image')}
          />
        ) : (
          <span style={placeholderStyle}>No image</span>
        )}
      </div>

      <div style={inputRowStyle}>
        <input
          style={inputStyle}
          value={value || ''}
          onChange={handleUrlChange}
          placeholder={placeholder}
        />
        <button
          style={uploadButtonStyle}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          }}
        >
          {uploading ? 'Processing...' : 'Browse'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {error && <span style={errorStyle}>{error}</span>}
    </div>
  )
}

export default ImageUploader
