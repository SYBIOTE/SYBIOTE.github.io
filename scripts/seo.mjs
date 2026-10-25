/**
 * What search engines, link previews and AI crawlers get from index.html, built from the same content
 * files the app shows (English only: the site has one URL, and the language is picked in the browser).
 *
 * - head: title, description, canonical, Open Graph / Twitter tags and JSON-LD (Person, WebSite and
 *   the AI twin Service)
 * - body: the profile, services, featured projects, experience and contact links as plain HTML inside
 *   #root. React replaces it on mount, so visitors only see it if the app hasn't started after a
 *   couple of seconds (no JS, or a very slow load); crawlers that don't run JS read it straight away.
 *
 * The `seo` block in the English content file holds the title, description, share image and the
 * profiles to list as sameAs (LinkedIn and X come from `core`).
 */

import fs from 'fs'
import path from 'path'

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])

// JSON-LD goes inside <script>, so only "</" needs breaking up
const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/<\//g, '<\\/')}</script>`

export const buildSeo = (root) => {
  const en = readJson(path.join(root, 'src/i18n/locales/content/en.json'))
  const portfolio = readJson(path.join(root, 'src/content/data/portfolio.json'))
  const { core, seo, services, resume } = en
  const url = core.website
  const image = new URL(seo.image, url).href
  const sameAs = [core.linkedin, core.x, ...(seo.sameAs ?? [])].filter(Boolean)
  const [city, country] = core.city.split(',').map((s) => s.trim())
  const serviceItems = Object.values(services.items)
  const twin = services.items.aiTwin

  const featured = portfolio.items
    .filter((item) => item.featured)
    .sort((a, b) => a.order - b.order)
    .map((item) => ({ ...en.portfolio.items[item.id], link: item.links?.[0]?.url }))
    .filter((item) => item.title)

  const person = {
    '@type': 'Person',
    '@id': `${url}#person`,
    name: core.name,
    url,
    image,
    jobTitle: core.role,
    description: resume.summary.content.split('\n')[0],
    address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: country },
    sameAs,
    knowsAbout: serviceItems.map((s) => s.name)
  }

  const head = [
    `<title>${escape(seo.title)}</title>`,
    `<meta name="description" content="${escape(seo.description)}" />`,
    `<link rel="canonical" href="${escape(url)}" />`,
    `<meta name="theme-color" content="#1a1a1a" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:site_name" content="${escape(core.name)}" />`,
    `<meta property="og:title" content="${escape(seo.title)}" />`,
    `<meta property="og:description" content="${escape(seo.description)}" />`,
    `<meta property="og:url" content="${escape(url)}" />`,
    `<meta property="og:image" content="${escape(image)}" />`,
    `<meta property="og:image:alt" content="${escape(core.name)}" />`,
    // The share image is a portrait photo, which the large card would crop badly
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escape(seo.title)}" />`,
    `<meta name="twitter:description" content="${escape(seo.description)}" />`,
    `<meta name="twitter:image" content="${escape(image)}" />`,
    jsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        person,
        { '@type': 'WebSite', '@id': `${url}#website`, url, name: core.name, publisher: { '@id': `${url}#person` } },
        ...(twin
          ? [{ '@type': 'Service', name: twin.name, description: twin.desc, provider: { '@id': `${url}#person` }, url: `${url}ai-twin` }]
          : [])
      ]
    }),
    `<style>.seo-fallback{max-width:720px;margin:0 auto;padding:32px 16px;color:#e8eaed;background:#1a1a1a;font:15px/1.6 system-ui,sans-serif;animation:seo-in .3s 2.5s both}.seo-fallback a{color:#8ab4f8}@keyframes seo-in{from{opacity:0}to{opacity:1}}</style>`
  ].join('\n    ')

  const list = (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
  const jobs = Object.values(resume.experience.jobs)

  const body = `<main class="seo-fallback">
      <h1>${escape(core.name)}</h1>
      <p>${escape(core.role)} · ${escape(core.city)}</p>
      ${resume.summary.content.split('\n').map((line) => `<p>${escape(line)}</p>`).join('\n      ')}
      <h2>${escape(services.intro)}</h2>
      ${list(serviceItems.map((s) => `<strong>${s === twin ? `<a href="/ai-twin">${escape(s.name)}</a>` : escape(s.name)}</strong>: ${escape(s.desc)}`))}
      <h2>Projects</h2>
      ${list(featured.map((p) => `<strong>${p.link ? `<a href="${escape(p.link)}">${escape(p.title)}</a>` : escape(p.title)}</strong>: ${escape(p.description)}`))}
      <h2>${escape(resume.experience.title)}</h2>
      ${list(jobs.map((j) => `${escape(j.title)} (${escape(j.period)})`))}
      <h2>Contact</h2>
      ${list([`<a href="mailto:${escape(core.email)}">${escape(core.email)}</a>`, ...sameAs.map((u) => `<a href="${escape(u)}">${escape(u.replace(/^https?:\/\/(www\.)?/, ''))}</a>`)])}
    </main>`

  return { head, body }
}
