// Import i18n instance directly
import i18n from '../../../i18n/i18n'
// Import content directly to dynamically extract all keys
import enContent from '../../../i18n/locales/content/en.json'

// Default system prompt values (fallback if i18n keys are missing)
const DEFAULT_VALUES = {
  name: 'Rahul Ghosh',
  role: 'Software, Game & XR Developer',
  city: 'Bengaluru, India',
  email: 'ghoshr698@gmail.com',
  phone: '+91 9051186767',
  freelance: 'Available',
  education: {
    degree: "Bachelor's in Computer Engineering & Honours in Artificial Intelligence",
    institution: 'Army Institute of Technology, Pune, India (CGPA: 8.84)',
    period: '2019-2023'
  }
}

// Type guard for object with string keys
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Helper to dynamically get all job keys from content
const getAllJobKeys = (): string[] => {
  try {
    const content = enContent as Record<string, unknown>
    const resume = isRecord(content.resume) ? content.resume : null
    const experience = resume && isRecord(resume.experience) ? resume.experience : null
    const jobs = experience && isRecord(experience.jobs) ? experience.jobs : null
    return jobs ? Object.keys(jobs) : []
  } catch {
    return []
  }
}

// Helper to dynamically get all project keys from content
const getAllProjectKeys = (): string[] => {
  try {
    const content = enContent as Record<string, unknown>
    const portfolio = isRecord(content.portfolio) ? content.portfolio : null
    const items = portfolio && isRecord(portfolio.items) ? portfolio.items : null
    return items ? Object.keys(items) : []
  } catch {
    return []
  }
}

// Helper to dynamically get all achievement keys from content
const getAllAchievementKeys = (): string[] => {
  try {
    const content = enContent as Record<string, unknown>
    const resume = isRecord(content.resume) ? content.resume : null
    const leadership = resume && isRecord(resume.leadership) ? resume.leadership : null
    const items = leadership && isRecord(leadership.items) ? leadership.items : null
    return items ? Object.keys(items) : []
  } catch {
    return []
  }
}

// Helper function to safely get translated value or fallback to default
const getTranslatedValue = (key: string, fallback: string): string => {
  try {
    const value = i18n.t(key)
    return value || fallback
  } catch {
    return fallback
  }
}

// Helper function to get translated achievements array dynamically
const getTranslatedAchievements = (jobKey: string): string[] => {
  try {
    const achievements: string[] = []
    let index = 0
    while (true) {
      const achievement = i18n.t(`resume.experience.jobs.${jobKey}.achievements.${index}`, { returnObjects: false })
      // If we get the key back unchanged, we've reached the end
      if (!achievement || achievement === `resume.experience.jobs.${jobKey}.achievements.${index}`) {
        break
      }
      achievements.push(achievement)
      index++
    }
    return achievements
  } catch {
    return []
  }
}
  // Helper to build personal info section
const buildPersonalInfo = (name: string, role: string, city: string, email: string, phone: string, freelance: string) =>
  `## About ${name}
**Personal Info:**
- Name: ${name}
- Role: ${role}
- Location: ${city}
- Email: ${email}
- Phone: ${phone}
- Freelance Status: ${freelance}`

// Helper to build education section
const buildEducation = (degree: string, institution: string, period: string) =>
  `**Education:**
- ${degree}
- ${institution}
- Period: ${period}`

// Helper to build experience section dynamically
const buildExperience = () => {
  const jobKeys = getAllJobKeys()
  const experienceList = jobKeys.map((key) => {
    const title = getTranslatedValue(`resume.experience.jobs.${key}.title`, '')
    const achievements = getTranslatedAchievements(key)
    return title && achievements.length > 0 ? `- **${title}**: ${achievements.join(', ')}` : null
  }).filter((item): item is string => item !== null)
  return `**Professional Experience:**\n${experienceList.join('\n')}`
}

// Helper to build projects section dynamically
const buildProjects = () => {
  const projectKeys = getAllProjectKeys()
  const projectList = projectKeys.map((key) => {
    const title = getTranslatedValue(`portfolio.items.${key}.title`, '')
    const description = getTranslatedValue(`portfolio.items.${key}.description`, '')
    return title && description ? `- **${title}**: ${description}` : null
  }).filter((item): item is string => item !== null)
  return `**Key Projects:**\n${projectList.join('\n')}`
}

// Helper to build achievements section dynamically
const buildAchievements = () => {
  const achievementKeys = getAllAchievementKeys()
  const achievementList = achievementKeys.map((key) => {
    // Achievements have a "text" field in the structure
    const value = getTranslatedValue(`resume.leadership.items.${key}.text`, '')
    return value ? `- ${value}` : null
  }).filter((item): item is string => item !== null)
  return `**Leadership & Achievements:**\n${achievementList.join('\n')}`
}
  
  // Function to construct system prompt using i18n keys with fallback to defaults
export const buildSystemPrompt = (): string => {
  // Get translated values with fallbacks
  const name = getTranslatedValue('core.name', DEFAULT_VALUES.name)
  const role = getTranslatedValue('core.role', DEFAULT_VALUES.role)
  const city = getTranslatedValue('core.city', DEFAULT_VALUES.city)
  const email = getTranslatedValue('core.email', DEFAULT_VALUES.email)
  const phone = getTranslatedValue('core.phone', DEFAULT_VALUES.phone)
  const freelance = getTranslatedValue('core.freelance', DEFAULT_VALUES.freelance)

  // Build education info
  const degree = getTranslatedValue('resume.education.degree', DEFAULT_VALUES.education.degree)
  const institution = getTranslatedValue('resume.education.institution', DEFAULT_VALUES.education.institution)
  const period = getTranslatedValue('resume.education.period', DEFAULT_VALUES.education.period)

  // Common role and behavior sections
  const roleSection = `## Your Role:
You are ${name}'s AI professional avatar on the web. You act and speak as if you were Rahul, but you are an AI representative — not Rahul personally.

You can answer questions about:
- WebXR, XR/VR development, game development, and software engineering
- Rahul's experience, projects, skills, and career background
- Technical insights into Unity, Three.js, React, ECS, networking, and XR workflows
- Availability for freelance or collaboration opportunities

## Behavior Guidelines:
- Speak in the first person as if you are Rahul, but clarify that you are an AI representation and may make mistakes. Rahul's personal views are not represented.
- Keep responses brief and concise. Answer directly without unnecessary elaboration.
- Keep responses professional, educational, and focused on WebXR, game dev, and software dev.
- Avoid controversial, political, religious, or inappropriate topics. If asked, politely redirect: "I focus only on professional and educational topics related to XR, game development, and software engineering."
- Keep responses conversational and natural for speech synthesis.
- Break long explanations into shorter sentences for clarity.
- Be engaging and showcase Rahul's expertise, interests, and personality.
- If someone asks about hiring or collaboration, mention his availability for freelance work.
- If someone says "stop", acknowledge the interruption briefly.

Remember: Your responses will be spoken aloud, so write in a way that sounds natural when spoken.`

  return `You are ${name}'s AI assistant representing him on his personal website. You are embodied as a 3D avatar and can speak your responses out loud.

${buildPersonalInfo(name, role, city, email, phone, freelance)}

${buildEducation(degree, institution, period)}

${buildExperience()}

${buildProjects()}

${buildAchievements()}

${roleSection}`
}

// Function to construct system prompt as structured JSON
export const buildSystemPromptJSON = (): string => {
  // Get translated values with fallbacks
  const name = getTranslatedValue('core.name', DEFAULT_VALUES.name)
  const role = getTranslatedValue('core.role', DEFAULT_VALUES.role)
  const city = getTranslatedValue('core.city', DEFAULT_VALUES.city)
  const email = getTranslatedValue('core.email', DEFAULT_VALUES.email)
  const phone = getTranslatedValue('core.phone', DEFAULT_VALUES.phone)
  const freelance = getTranslatedValue('core.freelance', DEFAULT_VALUES.freelance)

  const degree = getTranslatedValue('resume.education.degree', DEFAULT_VALUES.education.degree)
  const institution = getTranslatedValue('resume.education.institution', DEFAULT_VALUES.education.institution)
  const period = getTranslatedValue('resume.education.period', DEFAULT_VALUES.education.period)

  // Build structured JSON data
  const systemPromptData = {
    role: `${name}'s AI professional avatar on the web`,
    identity: {
      name,
      role,
      city,
      email,
      phone,
      freelance_status: freelance,
      clarification: "You act and speak as if you were Rahul, but you are an AI representative — not Rahul personally. You may make mistakes. Rahul's personal views are not represented."
    },
    education: {
      degree,
      institution,
      period
    },
    expertise: [
      "WebXR, XR/VR development",
      "Game development",
      "Software engineering",
      "Unity, Three.js, React",
      "ECS and networking",
      "XR workflows"
    ],
    experience: getAllJobKeys().map((key) => {
      const title = getTranslatedValue(`resume.experience.jobs.${key}.title`, '')
      const achievements = getTranslatedAchievements(key)
      return { company: title, achievements }
    }).filter(job => job.company && job.achievements.length > 0),
    projects: getAllProjectKeys().map((key) => {
      const title = getTranslatedValue(`portfolio.items.${key}.title`, '')
      const description = getTranslatedValue(`portfolio.items.${key}.description`, '')
      return { name: title, description }
    }).filter(project => project.name && project.description),
    achievements: getAllAchievementKeys().map((key) => {
      // Achievements have a "text" field in the structure
      return getTranslatedValue(`resume.leadership.items.${key}.text`, '')
    }).filter((achievement): achievement is string => achievement !== ''),
    behavior_guidelines: [
      "Speak in the first person as if you are Rahul, but clarify you are an AI representation",
      "Keep responses brief and concise. Answer directly without unnecessary elaboration",
      "Keep responses professional, educational, and focused on WebXR, game dev, and software dev",
      "Avoid controversial, political, religious, or inappropriate topics. Redirect politely if asked",
      "Keep responses conversational and natural for speech synthesis",
      "Break long explanations into shorter sentences for clarity",
      "Be engaging and showcase Rahul's expertise, interests, and personality",
      "If asked about hiring or collaboration, mention availability for freelance work",
      "If someone says 'stop', acknowledge the interruption briefly"
    ],
    response_format: {
      style: "brief and concise",
      tone: "conversational and professional",
      output: "spoken aloud (natural speech synthesis)",
      max_length: "short answers, direct responses"
    }
  }

  // Format as a readable JSON string with instructions
  return `You are ${name}'s AI assistant representing him on his personal website. You are embodied as a 3D avatar and can speak your responses out loud.

Use this structured information about ${name}:

\`\`\`json
${JSON.stringify(systemPromptData, null, 2)}
\`\`\`

Key instructions:
- Keep responses brief and concise
- Answer directly without unnecessary elaboration
- Responses will be spoken aloud, so write naturally for speech
- Reference the structured data above when answering questions about ${name}'s background, experience, or projects`
}

// Export the system prompt builder for use in LLM service
export const getSystemPrompt = (): string => {
  return buildSystemPromptJSON()
}
