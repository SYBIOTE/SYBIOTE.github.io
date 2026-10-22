/**
 * What Rahul says when a visitor joins the call. Put together from a hello, a short intro and one
 * hook, each picked from a few variants, so it sounds like a person saying hi rather than a recording:
 * - by name if the visitor gave one, and by time of day ("Evening, Sam!")
 * - honest that it's Rahul's AI avatar, offering to walk through his human counterpart's projects
 * - returning visitors get "good to see you again" instead of the full introduction (it doesn't
 *   pretend to remember the last conversation; it can't)
 */

type Daypart = 'morning' | 'afternoon' | 'evening' | 'night'

interface Lines {
  hello: (name: string | null, daypart: Daypart) => string[]
  welcomeBack: (name: string | null) => string[]
  intro: string[]
  hooks: string[]
  returningHooks: string[]
}

const LINES: Record<string, Lines> = {
  en: {
    hello: (name, daypart) => {
      const day = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Hey' }[daypart]
      return name ? [`Hey ${name}!`, `${day}, ${name}!`, `Hi ${name}, thanks for dropping by.`] : ['Hey, welcome!', `${day}! Thanks for stopping by.`, 'Hi there, thanks for dropping by.']
    },
    welcomeBack: (name) => (name ? [`Hey ${name}, good to see you again.`, `${name}! Welcome back.`] : ['Welcome back!', 'Hey, good to see you again.']),
    intro: ["I'm Rahul's AI avatar.", "I'm Rahul's AI twin."],
    hooks: [
      "I can walk you through the projects my human counterpart has worked on and is currently working on."
    ],
    returningHooks: ['Anything you want to see this time?', "What's on your mind today?"]
  },
  de: {
    hello: (name, daypart) => {
      const day = { morning: 'Guten Morgen', afternoon: 'Hallo', evening: 'Guten Abend', night: 'Hey' }[daypart]
      return name ? [`Hey ${name}!`, `${day}, ${name}!`, `Hi ${name}, schön, dass du vorbeischaust.`] : ['Hey, willkommen!', `${day}! Schön, dass du da bist.`]
    },
    welcomeBack: (name) => (name ? [`Hey ${name}, schön, dich wiederzusehen.`, `${name}! Willkommen zurück.`] : ['Willkommen zurück!']),
    intro: ['Ich bin Rahuls KI-Avatar.', 'Ich bin Rahuls KI-Zwilling.'],
    hooks: [
      'Ich kann dir die Projekte zeigen, an denen mein menschliches Gegenstück gearbeitet hat und gerade arbeitet.'
    ],
    returningHooks: ['Was möchtest du dir diesmal ansehen?']
  },
  es: {
    hello: (name, daypart) => {
      const day = { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches', night: 'Hola' }[daypart]
      return name ? [`¡Hola, ${name}!`, `¡${day}, ${name}!`, `Hola, ${name}, gracias por pasarte.`] : ['¡Hola, bienvenido!', `¡${day}! Gracias por pasarte.`]
    },
    welcomeBack: (name) => (name ? [`Hola, ${name}, me alegra verte de nuevo.`, `¡${name}! Bienvenido de nuevo.`] : ['¡Bienvenido de nuevo!']),
    intro: ['Soy el avatar de IA de Rahul.', 'Soy el gemelo de IA de Rahul.'],
    hooks: [
      'Puedo enseñarte los proyectos en los que ha trabajado mi contraparte humana y en los que trabaja ahora.'
    ],
    returningHooks: ['¿Qué te gustaría ver esta vez?']
  },
  fr: {
    hello: (name, daypart) => {
      const day = { morning: 'Bonjour', afternoon: 'Bonjour', evening: 'Bonsoir', night: 'Salut' }[daypart]
      return name ? [`Salut ${name} !`, `${day}, ${name} !`, `Salut ${name}, merci de passer.`] : ['Salut, bienvenue !', `${day} ! Merci de passer.`]
    },
    welcomeBack: (name) => (name ? [`Salut ${name}, content de te revoir.`, `${name} ! Bon retour.`] : ['Bon retour !']),
    intro: ["Je suis l'avatar IA de Rahul.", "Je suis le jumeau IA de Rahul."],
    hooks: [
      'Je peux te présenter les projets sur lesquels mon homologue humain a travaillé, et ceux sur lesquels il travaille en ce moment.'
    ],
    returningHooks: ['Tu veux voir quoi cette fois ?']
  },
  hi: {
    hello: (name) => (name ? [`हाय ${name}!`, `नमस्ते ${name}, आने के लिए शुक्रिया।`] : ['हाय, आपका स्वागत है!', 'नमस्ते, आने के लिए शुक्रिया।']),
    welcomeBack: (name) => (name ? [`हाय ${name}, आपको फिर से देखकर अच्छा लगा।`] : ['फिर से स्वागत है!']),
    intro: ['मैं राहुल का AI अवतार हूं।', 'मैं राहुल का AI जुड़वां हूं।'],
    hooks: [
      'मैं आपको उन प्रोजेक्ट्स के बारे में बता सकता हूं जिन पर मेरे इंसानी समकक्ष ने काम किया है और अभी कर रहे हैं।'
    ],
    returningHooks: ['इस बार क्या देखना चाहेंगे?']
  },
  ja: {
    hello: (name, daypart) => {
      const day = { morning: 'おはようございます', afternoon: 'こんにちは', evening: 'こんばんは', night: 'こんばんは' }[daypart]
      return name ? [`${name}さん、${day}！`, `${name}さん、来てくれてありがとう。`] : [`${day}、ようこそ！`, '来てくれてありがとう。']
    },
    welcomeBack: (name) => (name ? [`${name}さん、また会えてうれしいです。`] : ['おかえりなさい！']),
    intro: ['ラフルのAIアバターです。', 'ラフルのAIツインです。'],
    hooks: [
      '僕の「人間版」がこれまで手がけてきたプロジェクトや、今取り組んでいることをご案内できます。'
    ],
    returningHooks: ['今日は何を見たいですか？']
  }
}

const daypartOf = (hour: number): Daypart => (hour >= 5 && hour < 12 ? 'morning' : hour < 17 && hour >= 12 ? 'afternoon' : hour >= 17 && hour < 22 ? 'evening' : 'night')

export interface GreetingOptions {
  name?: string
  /** UI language, e.g. 'de' or 'en-GB' */
  locale?: string
  /** The visitor has joined a call here before */
  returning?: boolean
  /** Local hour, 0-23 */
  hour?: number
  random?: () => number
}

/** Rahul's opening line for this visitor. */
export const buildGreeting = ({ name, locale = 'en', returning = false, hour = new Date().getHours(), random = Math.random }: GreetingOptions = {}): string => {
  const lines = LINES[locale.slice(0, 2).toLowerCase()] ?? LINES.en
  const pick = (options: string[]) => options[Math.floor(random() * options.length)]
  const guest = name?.trim() || null
  if (returning) return `${pick(lines.welcomeBack(guest))} ${pick(lines.returningHooks)}`
  return `${pick(lines.hello(guest, daypartOf(hour)))} ${pick(lines.intro)} ${pick(lines.hooks)}`
}

const VISITED_KEY = 'call.visitedAt'

/** Whether this browser has joined a call before; then remembers that it has. */
export const markVisit = (): boolean => {
  try {
    const before = localStorage.getItem(VISITED_KEY) !== null
    localStorage.setItem(VISITED_KEY, String(Date.now()))
    return before
  } catch {
    return false
  }
}
