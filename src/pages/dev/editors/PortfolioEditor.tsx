import { useState, useCallback, type CSSProperties } from 'react'
import { usePortfolioContent, savePortfolioContent, getSortedPortfolioItems } from '../../../content/useContent'
import type { PortfolioItem, PortfolioContent, PortfolioLinkType } from '../../../content/types'
import { SaveButton } from '../components/SaveButton'
import { EditableCard } from '../components/EditableCard'

// Styles
const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem'
}

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const titleStyle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.95)'
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1rem'
}

const addButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '2rem',
  border: '2px dashed rgba(255, 255, 255, 0.2)',
  borderRadius: '12px',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.5)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.2s ease',
  minHeight: '200px'
}

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10001
}

const modalStyle: CSSProperties = {
  background: '#1a1d21',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  padding: '1.5rem',
  width: '90%',
  maxWidth: '700px',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  overflow: 'hidden'
}

const modalScrollAreaStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  paddingRight: '0.5rem'
}

const inputStyle: CSSProperties = {
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
}

const labelStyle: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.7)',
  marginBottom: '0.375rem',
  display: 'block'
}

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  marginTop: '0.5rem',
  paddingTop: '1rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
}

const cancelButtonStyle: CSSProperties = {
  padding: '0.625rem 1.25rem',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.7)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500
}

const saveModalButtonStyle: CSSProperties = {
  padding: '0.625rem 1.25rem',
  border: 'none',
  borderRadius: '8px',
  background: 'rgba(30, 136, 229, 0.8)',
  color: 'white',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500
}

// Section styles
const sectionStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '10px',
  padding: '1rem',
  border: '1px solid rgba(255, 255, 255, 0.08)'
}

const sectionTitleStyle: CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
}

const sectionContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
}

// List item styles
const listItemStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center'
}

const listInputStyle: CSSProperties = {
  ...inputStyle,
  flex: 1,
  padding: '0.5rem 0.75rem',
  fontSize: '0.8rem'
}

const smallButtonStyle: CSSProperties = {
  padding: '0.4rem 0.6rem',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '6px',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.7)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  transition: 'all 0.2s ease'
}

const addItemButtonStyle: CSSProperties = {
  ...smallButtonStyle,
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  color: 'rgba(30, 136, 229, 0.9)',
  borderColor: 'rgba(30, 136, 229, 0.3)'
}

const removeButtonStyle: CSSProperties = {
  ...smallButtonStyle,
  padding: '0.4rem',
  color: 'rgba(239, 68, 68, 0.8)',
  borderColor: 'rgba(239, 68, 68, 0.3)',
  background: 'rgba(239, 68, 68, 0.05)'
}

const selectStyle: CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.8rem',
  outline: 'none',
  minWidth: '100px'
}

const previewGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
  gap: '0.5rem',
  marginTop: '0.5rem'
}

const previewImageStyle: CSSProperties = {
  width: '100%',
  height: '60px',
  objectFit: 'cover',
  borderRadius: '6px',
  background: 'rgba(255, 255, 255, 0.05)'
}

const linkTypes: PortfolioLinkType[] = ['github', 'demo', 'itch', 'youtube', 'website', 'download']

interface EditModalProps {
  item: PortfolioItem | null
  allItems: PortfolioItem[]
  onSave: (item: PortfolioItem) => void
  onClose: () => void
  isNew?: boolean
}

const EditModal = ({ item, allItems, onSave, onClose, isNew }: EditModalProps) => {
  const [formData, setFormData] = useState<PortfolioItem>(
    item || { id: '', order: 0 }
  )

  const handleSubmit = () => {
    if (!formData.id.trim()) return
    // Clean up empty values
    const cleanedData: PortfolioItem = {
      id: formData.id,
      order: formData.order
    }
    if (formData.image) cleanedData.image = formData.image
    if (formData.videoId) cleanedData.videoId = formData.videoId
    if (formData.videos && formData.videos.length > 0) cleanedData.videos = formData.videos.filter(v => v.trim())
    if (formData.gallery && formData.gallery.length > 0) cleanedData.gallery = formData.gallery.filter(g => g.trim())
    if (formData.links && formData.links.length > 0) cleanedData.links = formData.links.filter(l => l.url.trim())
    if (formData.type === 'folder') {
      cleanedData.type = 'folder'
      if (formData.children && formData.children.length > 0) cleanedData.children = formData.children
    }
    onSave(cleanedData)
  }

  // Gallery handlers
  const addGalleryImage = () => {
    setFormData({ ...formData, gallery: [...(formData.gallery || []), ''] })
  }
  const updateGalleryImage = (index: number, value: string) => {
    const newGallery = [...(formData.gallery || [])]
    newGallery[index] = value
    setFormData({ ...formData, gallery: newGallery })
  }
  const removeGalleryImage = (index: number) => {
    const newGallery = [...(formData.gallery || [])]
    newGallery.splice(index, 1)
    setFormData({ ...formData, gallery: newGallery })
  }

  // Videos handlers
  const addVideo = () => {
    setFormData({ ...formData, videos: [...(formData.videos || []), ''] })
  }
  const updateVideo = (index: number, value: string) => {
    const newVideos = [...(formData.videos || [])]
    newVideos[index] = value
    setFormData({ ...formData, videos: newVideos })
  }
  const removeVideo = (index: number) => {
    const newVideos = [...(formData.videos || [])]
    newVideos.splice(index, 1)
    setFormData({ ...formData, videos: newVideos })
  }

  // Links handlers
  const addLink = () => {
    setFormData({ ...formData, links: [...(formData.links || []), { type: 'website', url: '' }] })
  }
  const updateLink = (index: number, field: 'type' | 'url', value: string) => {
    const newLinks = [...(formData.links || [])]
    if (field === 'type') {
      newLinks[index] = { ...newLinks[index], type: value as PortfolioLinkType }
    } else {
      newLinks[index] = { ...newLinks[index], url: value }
    }
    setFormData({ ...formData, links: newLinks })
  }
  const removeLink = (index: number) => {
    const newLinks = [...(formData.links || [])]
    newLinks.splice(index, 1)
    setFormData({ ...formData, links: newLinks })
  }

  // Children handlers (for folders)
  const addChild = () => {
    setFormData({ ...formData, children: [...(formData.children || []), ''] })
  }
  const updateChild = (index: number, value: string) => {
    const newChildren = [...(formData.children || [])]
    newChildren[index] = value
    setFormData({ ...formData, children: newChildren })
  }
  const removeChild = (index: number) => {
    const newChildren = [...(formData.children || [])]
    newChildren.splice(index, 1)
    setFormData({ ...formData, children: newChildren })
  }

  const availableChildren = allItems.filter(i => i.id !== formData.id && i.type !== 'folder')

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.125rem' }}>
          {isNew ? 'Add Portfolio Item' : 'Edit Portfolio Item'}
        </h3>

        <div style={modalScrollAreaStyle}>
          {/* Basic Info Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span>📋</span> Basic Info
            </div>
            <div style={sectionContentStyle}>
              <div>
                <label style={labelStyle}>ID (used for translations)</label>
                <input
                  style={inputStyle}
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., myProject"
                  disabled={!isNew}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Type</label>
                  <select
                    style={{ ...selectStyle, width: '100%' }}
                    value={formData.type || 'project'}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      type: e.target.value as 'folder' | 'project',
                      children: e.target.value === 'folder' ? (formData.children || []) : undefined
                    })}
                  >
                    <option value="project">Project</option>
                    <option value="folder">Folder</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Order</label>
                  <input
                    style={inputStyle}
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Media Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span>🖼️</span> Main Media
            </div>
            <div style={sectionContentStyle}>
              <div>
                <label style={labelStyle}>Cover Image URL</label>
                <input
                  style={inputStyle}
                  value={formData.image || ''}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value || undefined })}
                  placeholder="/assets/img/portfolio/image.png"
                />
              </div>
              <div>
                <label style={labelStyle}>Main YouTube Video ID</label>
                <input
                  style={inputStyle}
                  value={formData.videoId || ''}
                  onChange={(e) => setFormData({ ...formData, videoId: e.target.value || undefined })}
                  placeholder="e.g., dQw4w9WgXcQ"
                />
              </div>
              {(formData.image || formData.videoId) && (
                <div style={previewGridStyle}>
                  {formData.image && (
                    <img
                      src={formData.image}
                      alt="Preview"
                      style={previewImageStyle}
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                    />
                  )}
                  {formData.videoId && (
                    <img
                      src={`https://img.youtube.com/vi/${formData.videoId}/mqdefault.jpg`}
                      alt="Video thumbnail"
                      style={previewImageStyle}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Additional Videos Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span>🎬</span> Additional Videos
              <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 400 }}>
                ({(formData.videos || []).length})
              </span>
            </div>
            <div style={sectionContentStyle}>
              {(formData.videos || []).map((videoId, index) => (
                <div key={index} style={listItemStyle}>
                  <input
                    style={listInputStyle}
                    value={videoId}
                    onChange={(e) => updateVideo(index, e.target.value)}
                    placeholder="YouTube Video ID"
                  />
                  {videoId && (
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/default.jpg`}
                      alt="Thumbnail"
                      style={{ width: '40px', height: '30px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  )}
                  <button
                    style={removeButtonStyle}
                    onClick={() => removeVideo(index)}
                    title="Remove video"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button style={addItemButtonStyle} onClick={addVideo}>
                + Add Video
              </button>
            </div>
          </div>

          {/* Gallery Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span>📸</span> Image Gallery
              <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 400 }}>
                ({(formData.gallery || []).length})
              </span>
            </div>
            <div style={sectionContentStyle}>
              {(formData.gallery || []).map((img, index) => (
                <div key={index} style={listItemStyle}>
                  <input
                    style={listInputStyle}
                    value={img}
                    onChange={(e) => updateGalleryImage(index, e.target.value)}
                    placeholder="/assets/img/portfolio/image.png"
                  />
                  {img && (
                    <img
                      src={img}
                      alt="Preview"
                      style={{ width: '40px', height: '30px', objectFit: 'cover', borderRadius: '4px' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                    />
                  )}
                  <button
                    style={removeButtonStyle}
                    onClick={() => removeGalleryImage(index)}
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button style={addItemButtonStyle} onClick={addGalleryImage}>
                + Add Image
              </button>
            </div>
          </div>

          {/* Links Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <span>🔗</span> Links
              <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 400 }}>
                ({(formData.links || []).length})
              </span>
            </div>
            <div style={sectionContentStyle}>
              {(formData.links || []).map((link, index) => (
                <div key={index} style={listItemStyle}>
                  <select
                    style={selectStyle}
                    value={link.type}
                    onChange={(e) => updateLink(index, 'type', e.target.value)}
                  >
                    {linkTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <input
                    style={listInputStyle}
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                  />
                  <button
                    style={removeButtonStyle}
                    onClick={() => removeLink(index)}
                    title="Remove link"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button style={addItemButtonStyle} onClick={addLink}>
                + Add Link
              </button>
            </div>
          </div>

          {/* Children Section (for folders) */}
          {formData.type === 'folder' && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                <span>📁</span> Folder Children
                <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 400 }}>
                  ({(formData.children || []).length})
                </span>
              </div>
              <div style={sectionContentStyle}>
                {(formData.children || []).map((childId, index) => (
                  <div key={index} style={listItemStyle}>
                    <select
                      style={{ ...selectStyle, flex: 1 }}
                      value={childId}
                      onChange={(e) => updateChild(index, e.target.value)}
                    >
                      <option value="">-- Select item --</option>
                      {availableChildren.map(item => (
                        <option key={item.id} value={item.id}>{item.id}</option>
                      ))}
                    </select>
                    <button
                      style={removeButtonStyle}
                      onClick={() => removeChild(index)}
                      title="Remove child"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button style={addItemButtonStyle} onClick={addChild}>
                  + Add Child
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={buttonRowStyle}>
          <button style={cancelButtonStyle} onClick={onClose}>
            Cancel
          </button>
          <button
            style={saveModalButtonStyle}
            onClick={handleSubmit}
            disabled={!formData.id.trim()}
          >
            {isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const PortfolioEditor = () => {
  const content = usePortfolioContent()
  const [items, setItems] = useState<PortfolioItem[]>(() => getSortedPortfolioItems(content))
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const newContent: PortfolioContent = { items }
    const success = await savePortfolioContent(newContent)
    setIsSaving(false)
    if (success) {
      setHasChanges(false)
    }
    return success
  }, [items])

  const handleEditSave = useCallback((item: PortfolioItem) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === item.id)
      if (index >= 0) {
        const newItems = [...prev]
        newItems[index] = item
        return newItems
      } else {
        // New item
        const maxOrder = prev.reduce((max, i) => Math.max(max, i.order), 0)
        return [...prev, { ...item, order: maxOrder + 1 }]
      }
    })
    setEditingItem(null)
    setIsAddingNew(false)
    setHasChanges(true)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setHasChanges(true)
  }, [])

  const handleMoveUp = useCallback((id: string) => {
    setItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex((i) => i.id === id)
      if (index <= 0) return prev

      // Swap orders
      const temp = sorted[index].order
      sorted[index].order = sorted[index - 1].order
      sorted[index - 1].order = temp

      return sorted.sort((a, b) => a.order - b.order)
    })
    setHasChanges(true)
  }, [])

  const handleMoveDown = useCallback((id: string) => {
    setItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex((i) => i.id === id)
      if (index < 0 || index >= sorted.length - 1) return prev

      // Swap orders
      const temp = sorted[index].order
      sorted[index].order = sorted[index + 1].order
      sorted[index + 1].order = temp

      return sorted.sort((a, b) => a.order - b.order)
    })
    setHasChanges(true)
  }, [])

  const sortedItems = [...items].sort((a, b) => a.order - b.order)

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Portfolio Items</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
            {items.length} items • Translations are managed in the Translations tab
          </p>
        </div>
        <SaveButton
          onSave={handleSave}
          isSaving={isSaving}
          hasChanges={hasChanges}
        />
      </div>

      <div style={gridStyle}>
        {sortedItems.map((item, index) => {
          // Build a descriptive subtitle
          const parts: string[] = []
          if (item.type === 'folder') {
            parts.push(`📁 Folder (${item.children?.length || 0} items)`)
          } else {
            const videoCount = (item.videoId ? 1 : 0) + (item.videos?.length || 0)
            const imageCount = (item.image ? 1 : 0) + (item.gallery?.length || 0)
            if (videoCount > 0) parts.push(`🎬 ${videoCount} video${videoCount > 1 ? 's' : ''}`)
            if (imageCount > 0) parts.push(`📸 ${imageCount} image${imageCount > 1 ? 's' : ''}`)
            if (item.links?.length) parts.push(`🔗 ${item.links.length}`)
          }
          const subtitle = parts.length > 0 ? parts.join(' • ') : 'No media'
          
          return (
            <EditableCard
              key={item.id}
              title={item.id}
              subtitle={subtitle}
              image={item.image || (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg` : undefined)}
              onEdit={() => setEditingItem(item)}
              onDelete={() => handleDelete(item.id)}
              onMoveUp={index > 0 ? () => handleMoveUp(item.id) : undefined}
              onMoveDown={index < sortedItems.length - 1 ? () => handleMoveDown(item.id) : undefined}
            />
          )
        })}
        <button
          style={addButtonStyle}
          onClick={() => setIsAddingNew(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.5)'
            e.currentTarget.style.color = 'rgba(30, 136, 229, 0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
          }}
        >
          + Add Portfolio Item
        </button>
      </div>

      {(editingItem || isAddingNew) && (
        <EditModal
          item={isAddingNew ? null : editingItem}
          allItems={items}
          isNew={isAddingNew}
          onSave={handleEditSave}
          onClose={() => {
            setEditingItem(null)
            setIsAddingNew(false)
          }}
        />
      )}
    </div>
  )
}

export default PortfolioEditor
