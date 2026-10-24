# What the AI twin knows

Everything here is in your own words, written in the first person ("I built…"). The twin only states
what's written here and in the site content (resume, portfolio, services), so anything missing gets
"I don't know that one, email me".

Edit a file, then:
- `pnpm dev`: changes apply on the next message (no restart)
- push: the Vercel build compiles them (`pnpm knowledge` does it by hand)

## Files

| File | Loaded |
|---|---|
| `me.md`, `faq.md` | every message (`always: true`). Keep them short: they cost tokens on every reply |
| `work/<jobId>.md` | when that company comes up. Ids: niraAnimates, assethub, infiniteReality, etherealEngine, jioTesseract, prodigalTech |
| `projects/<projectId>.md` | when that project comes up (ids are the keys in `portfolio.items`). Adds to its extended description |
| `topics/<anything>.md` | when the visitor says one of its `aliases` |

Frontmatter (optional, at the very top):

```
---
always: true
aliases: open source, oss, contributions
---
```

`<!-- comments -->` are notes to yourself and never reach the twin. Headings with nothing under them
are dropped, so the templates are safe to leave half-filled.

Don't put anything here you wouldn't say to a stranger: visitors can get the twin to repeat it.
