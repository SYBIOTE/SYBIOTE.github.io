import { useState, useCallback, type CSSProperties } from 'react'
import { useLocaleContent, saveLocaleContent, useResumeData, saveResumeData } from '../../../content/useContent'
import type { LocaleCode, LocaleContent, ExperienceJob, ResumeData } from '../../../content/types'
import { SaveButton } from '../components/SaveButton'
import { LocaleSelector } from '../components/LocaleSelector'

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

const sectionStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '1.25rem'
}

const sectionTitleStyle: CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: '1rem'
}

const fieldGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginBottom: '1rem'
}

const labelStyle: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.6)',
  marginBottom: '0.25rem'
}

const inputStyle: CSSProperties = {
  padding: '0.625rem',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
}

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '80px',
  resize: 'vertical'
}

const jobCardStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1rem'
}

const achievementItemStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  marginBottom: '0.5rem'
}

const achievementInputStyle: CSSProperties = {
  ...inputStyle,
  flex: 1
}

const removeButtonStyle: CSSProperties = {
  padding: '0.5rem',
  border: 'none',
  borderRadius: '4px',
  background: 'rgba(239, 68, 68, 0.2)',
  color: 'rgba(239, 68, 68, 0.8)',
  cursor: 'pointer',
  fontSize: '0.75rem'
}

const addButtonStyle: CSSProperties = {
  padding: '0.5rem 1rem',
  border: '1px dashed rgba(255, 255, 255, 0.2)',
  borderRadius: '6px',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.5)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  marginTop: '0.5rem'
}

const addSectionButtonStyle: CSSProperties = {
  padding: '1rem',
  border: '2px dashed rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.5)',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 500,
  width: '100%',
  marginTop: '0.5rem',
  transition: 'all 0.2s ease'
}

const deleteJobButtonStyle: CSSProperties = {
  padding: '0.375rem 0.75rem',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: '6px',
  background: 'transparent',
  color: 'rgba(239, 68, 68, 0.8)',
  cursor: 'pointer',
  fontSize: '0.7rem',
  fontWeight: 500,
  transition: 'all 0.2s ease'
}

const jobCardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.75rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
}

const leadershipItemStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  marginBottom: '0.75rem',
  padding: '0.75rem',
  background: 'rgba(255, 255, 255, 0.02)',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.06)'
}

const moveButtonStyle: CSSProperties = {
  padding: '0.25rem 0.5rem',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '4px',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.6)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  transition: 'all 0.2s ease'
}

export const ResumeEditor = () => {
  const locales = useLocaleContent()
  const resumeDataFromHook = useResumeData()
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>('en')
  const [content, setContent] = useState<LocaleContent>(locales.en)
  const [resumeData, setResumeData] = useState<ResumeData>(resumeDataFromHook)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Handle locale change
  const handleLocaleChange = (newLocale: LocaleCode) => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Switch locale anyway?')) {
        return
      }
    }
    setSelectedLocale(newLocale)
    setContent(locales[newLocale])
    setHasChanges(false)
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const [localeSuccess, resumeSuccess] = await Promise.all([
      saveLocaleContent(selectedLocale, content),
      saveResumeData(resumeData)
    ])
    setIsSaving(false)
    if (localeSuccess && resumeSuccess) {
      setHasChanges(false)
    }
    return localeSuccess && resumeSuccess
  }, [content, selectedLocale, resumeData])

  // Move job up in order
  const moveJobUp = (jobKey: string) => {
    setResumeData(prev => {
      const jobs = [...prev.jobs].sort((a, b) => a.order - b.order)
      const index = jobs.findIndex(j => j.id === jobKey)
      if (index <= 0) return prev
      
      // Swap orders
      const temp = jobs[index].order
      jobs[index].order = jobs[index - 1].order
      jobs[index - 1].order = temp
      
      return { ...prev, jobs }
    })
    setHasChanges(true)
  }

  // Move job down in order
  const moveJobDown = (jobKey: string) => {
    setResumeData(prev => {
      const jobs = [...prev.jobs].sort((a, b) => a.order - b.order)
      const index = jobs.findIndex(j => j.id === jobKey)
      if (index < 0 || index >= jobs.length - 1) return prev
      
      // Swap orders
      const temp = jobs[index].order
      jobs[index].order = jobs[index + 1].order
      jobs[index + 1].order = temp
      
      return { ...prev, jobs }
    })
    setHasChanges(true)
  }

  // Get sorted job keys based on resume data order
  const getSortedJobKeys = () => {
    const jobsFromData = [...resumeData.jobs].sort((a, b) => a.order - b.order)
    const orderedKeys = jobsFromData.map(j => j.id)
    const contentJobKeys = Object.keys(content.resume?.experience?.jobs || {})
    
    // Include jobs from content that might not be in resume data yet
    const extraKeys = contentJobKeys.filter(k => !orderedKeys.includes(k))
    return [...orderedKeys.filter(k => contentJobKeys.includes(k)), ...extraKeys]
  }

  const updateField = (path: string[], value: string | string[]) => {
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = newContent
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]]
      }
      obj[path[path.length - 1]] = value
      return newContent
    })
    setHasChanges(true)
  }

  const updateJobAchievement = (jobKey: string, index: number, value: string) => {
    const achievements = [...(content.resume.experience.jobs[jobKey]?.achievements || [])]
    achievements[index] = value
    updateField(['resume', 'experience', 'jobs', jobKey, 'achievements'], achievements)
  }

  const addJobAchievement = (jobKey: string) => {
    const achievements = [...(content.resume.experience.jobs[jobKey]?.achievements || []), '']
    updateField(['resume', 'experience', 'jobs', jobKey, 'achievements'], achievements)
  }

  const removeJobAchievement = (jobKey: string, index: number) => {
    const achievements = (content.resume.experience.jobs[jobKey]?.achievements || []).filter((_, i) => i !== index)
    updateField(['resume', 'experience', 'jobs', jobKey, 'achievements'], achievements)
  }

  // Add a new job
  const addJob = () => {
    const newKey = `newJob${Date.now()}`
    const maxOrder = resumeData.jobs.reduce((max, j) => Math.max(max, j.order), 0)
    
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (!newContent.resume) {
        newContent.resume = {} as LocaleContent['resume']
      }
      if (!newContent.resume.experience) {
        newContent.resume.experience = { title: 'Professional Experience', jobs: {} }
      }
      if (!newContent.resume.experience.jobs) {
        newContent.resume.experience.jobs = {}
      }
      newContent.resume.experience.jobs[newKey] = {
        title: 'New Position — Company Name',
        period: 'Start — End',
        achievements: ['First achievement']
      }
      return newContent
    })
    
    // Add to resume data with next order
    setResumeData(prev => ({
      ...prev,
      jobs: [...prev.jobs, { id: newKey, order: maxOrder + 1 }]
    }))
    
    setHasChanges(true)
  }

  // Delete a job
  const deleteJob = (jobKey: string) => {
    if (!confirm(`Are you sure you want to delete the job "${jobKey}"?`)) {
      return
    }
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (newContent.resume?.experience?.jobs) {
        delete newContent.resume.experience.jobs[jobKey]
      }
      return newContent
    })
    
    // Remove from resume data
    setResumeData(prev => ({
      ...prev,
      jobs: prev.jobs.filter(j => j.id !== jobKey)
    }))
    
    setHasChanges(true)
  }

  // Rename a job key
  const renameJobKey = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey) return
    // Check if new key already exists
    if (content.resume?.experience?.jobs?.[newKey]) {
      alert(`A job with key "${newKey}" already exists.`)
      return
    }
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (newContent.resume?.experience?.jobs?.[oldKey]) {
        // Copy data to new key
        newContent.resume.experience.jobs[newKey] = newContent.resume.experience.jobs[oldKey]
        // Delete old key
        delete newContent.resume.experience.jobs[oldKey]
      }
      return newContent
    })
    
    // Update resume data
    setResumeData(prev => ({
      ...prev,
      jobs: prev.jobs.map(j => j.id === oldKey ? { ...j, id: newKey } : j)
    }))
    
    setHasChanges(true)
  }

  // Add a leadership item
  const addLeadershipItem = () => {
    const newKey = `item${Date.now()}`
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (!newContent.resume) {
        newContent.resume = {} as LocaleContent['resume']
      }
      if (!newContent.resume.leadership) {
        newContent.resume.leadership = { title: 'Leadership and Achievements', items: {} }
      }
      if (!newContent.resume.leadership.items) {
        newContent.resume.leadership.items = {}
      }
      newContent.resume.leadership.items[newKey] = {
        text: 'New achievement or leadership item'
      }
      return newContent
    })
    setHasChanges(true)
  }

  // Delete a leadership item
  const deleteLeadershipItem = (itemKey: string) => {
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (newContent.resume?.leadership?.items) {
        delete newContent.resume.leadership.items[itemKey]
      }
      return newContent
    })
    setHasChanges(true)
  }

  // Rename a leadership item key
  const renameLeadershipKey = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey) return
    if (content.resume?.leadership?.items?.[newKey]) {
      alert(`An item with key "${newKey}" already exists.`)
      return
    }
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (newContent.resume?.leadership?.items?.[oldKey]) {
        newContent.resume.leadership.items[newKey] = newContent.resume.leadership.items[oldKey]
        delete newContent.resume.leadership.items[oldKey]
      }
      return newContent
    })
    setHasChanges(true)
  }

  // Update a leadership item field
  const updateLeadershipField = (itemKey: string, field: 'text' | 'link' | 'linkLabel', value: string) => {
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (newContent.resume?.leadership?.items?.[itemKey]) {
        const item = newContent.resume.leadership.items[itemKey]
        if (field === 'text') {
          item.text = value
        } else if (field === 'link') {
          item.link = value || undefined
        } else if (field === 'linkLabel') {
          item.linkLabel = value || undefined
        }
      }
      return newContent
    })
    setHasChanges(true)
  }

  const jobKeys = getSortedJobKeys()
  const leadershipKeys = Object.keys(content.resume?.leadership?.items || {})

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h2 style={titleStyle}>Resume Content</h2>
          <LocaleSelector value={selectedLocale} onChange={handleLocaleChange} />
        </div>
        <SaveButton
          onSave={handleSave}
          isSaving={isSaving}
          hasChanges={hasChanges}
        />
      </div>

      {/* Summary Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Summary</h3>
        <div style={fieldGroupStyle}>
          <div>
            <label style={labelStyle}>Title</label>
            <input
              style={inputStyle}
              value={content.resume?.summary?.title || ''}
              onChange={(e) => updateField(['resume', 'summary', 'title'], e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Content</label>
            <textarea
              style={textareaStyle}
              value={content.resume?.summary?.content || ''}
              onChange={(e) => updateField(['resume', 'summary', 'content'], e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Education Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Education</h3>
        <div style={fieldGroupStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Section Title</label>
              <input
                style={inputStyle}
                value={content.resume?.education?.title || ''}
                onChange={(e) => updateField(['resume', 'education', 'title'], e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Period</label>
              <input
                style={inputStyle}
                value={content.resume?.education?.period || ''}
                onChange={(e) => updateField(['resume', 'education', 'period'], e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Degree</label>
            <input
              style={inputStyle}
              value={content.resume?.education?.degree || ''}
              onChange={(e) => updateField(['resume', 'education', 'degree'], e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Institution</label>
            <input
              style={inputStyle}
              value={content.resume?.education?.institution || ''}
              onChange={(e) => updateField(['resume', 'education', 'institution'], e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Leadership and Achievements Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Leadership and Achievements</h3>
        <div style={fieldGroupStyle}>
          <div>
            <label style={labelStyle}>Section Title</label>
            <input
              style={inputStyle}
              value={content.resume?.leadership?.title || ''}
              onChange={(e) => updateField(['resume', 'leadership', 'title'], e.target.value)}
            />
          </div>
        </div>
        
        {leadershipKeys.map((itemKey) => {
          const item = content.resume?.leadership?.items?.[itemKey]
          if (!item) return null
          
          return (
            <div key={itemKey} style={{ ...leadershipItemStyle, flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ ...labelStyle, margin: 0, fontSize: '0.7rem' }}>Key:</label>
                  <input
                    style={{ ...inputStyle, width: '150px', padding: '0.375rem 0.5rem', fontSize: '0.75rem', fontFamily: 'monospace' }}
                    defaultValue={itemKey}
                    onBlur={(e) => renameLeadershipKey(itemKey, e.target.value)}
                    placeholder="itemKey"
                  />
                </div>
                <button
                  style={removeButtonStyle}
                  onClick={() => deleteLeadershipItem(itemKey)}
                  title="Delete item"
                >
                  ×
                </button>
              </div>
              
              <div>
                <label style={{ ...labelStyle, marginBottom: '0.25rem', display: 'block' }}>Text</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', width: '100%' }}
                  value={item.text || ''}
                  onChange={(e) => updateLeadershipField(itemKey, 'text', e.target.value)}
                  placeholder="Achievement or leadership item"
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ ...labelStyle, marginBottom: '0.25rem', display: 'block' }}>Link URL (optional)</label>
                  <input
                    style={inputStyle}
                    value={item.link || ''}
                    onChange={(e) => updateLeadershipField(itemKey, 'link', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: '0.25rem', display: 'block' }}>Link Label</label>
                  <input
                    style={inputStyle}
                    value={item.linkLabel || ''}
                    onChange={(e) => updateLeadershipField(itemKey, 'linkLabel', e.target.value)}
                    placeholder="link"
                  />
                </div>
              </div>
            </div>
          )
        })}
        
        <button
          style={addSectionButtonStyle}
          onClick={addLeadershipItem}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.4)'
            e.currentTarget.style.color = 'rgba(30, 136, 229, 0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
          }}
        >
          + Add Leadership Item
        </button>
      </div>

      {/* Experience Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Professional Experience</h3>
        {jobKeys.map((jobKey) => {
          const job = content.resume?.experience?.jobs?.[jobKey] as ExperienceJob | undefined
          if (!job) return null
          
          return (
            <div key={jobKey} style={jobCardStyle}>
              <div style={jobCardHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      style={moveButtonStyle}
                      onClick={() => moveJobUp(jobKey)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 136, 229, 0.2)'
                        e.currentTarget.style.color = 'rgba(30, 136, 229, 0.9)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                      }}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      style={moveButtonStyle}
                      onClick={() => moveJobDown(jobKey)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 136, 229, 0.2)'
                        e.currentTarget.style.color = 'rgba(30, 136, 229, 0.9)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                      }}
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <label style={{ ...labelStyle, margin: 0, fontSize: '0.7rem' }}>Key:</label>
                  <input
                    style={{ ...inputStyle, width: '150px', padding: '0.375rem 0.5rem', fontSize: '0.75rem', fontFamily: 'monospace' }}
                    defaultValue={jobKey}
                    onBlur={(e) => renameJobKey(jobKey, e.target.value)}
                    placeholder="jobKey"
                  />
                </div>
                <button
                  style={deleteJobButtonStyle}
                  onClick={() => deleteJob(jobKey)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  Delete Job
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Job Title</label>
                  <input
                    style={inputStyle}
                    value={job.title || ''}
                    onChange={(e) => updateField(['resume', 'experience', 'jobs', jobKey, 'title'], e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Period</label>
                  <input
                    style={inputStyle}
                    value={job.period || ''}
                    onChange={(e) => updateField(['resume', 'experience', 'jobs', jobKey, 'period'], e.target.value)}
                  />
                </div>
              </div>
              
              <label style={labelStyle}>Achievements</label>
              {(job.achievements || []).map((achievement: string, index: number) => (
                <div key={index} style={achievementItemStyle}>
                  <input
                    style={achievementInputStyle}
                    value={achievement}
                    onChange={(e) => updateJobAchievement(jobKey, index, e.target.value)}
                    placeholder={`Achievement ${index + 1}`}
                  />
                  <button
                    style={removeButtonStyle}
                    onClick={() => removeJobAchievement(jobKey, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                style={addButtonStyle}
                onClick={() => addJobAchievement(jobKey)}
              >
                + Add Achievement
              </button>
            </div>
          )
        })}
        
        <button
          style={addSectionButtonStyle}
          onClick={addJob}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.4)'
            e.currentTarget.style.color = 'rgba(30, 136, 229, 0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
          }}
        >
          + Add New Job
        </button>
      </div>
    </div>
  )
}

export default ResumeEditor
