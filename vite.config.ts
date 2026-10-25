import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import react from '@vitejs/plugin-react-swc'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { defineConfig, type PluginOption, type ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { buildSeo } from './scripts/seo.mjs'

// The folder this config lives in. (app-root-path guessed it from its own install location,
// which breaks with package managers that keep packages in a global store.)
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: path.join(projectRoot, '.env.local')
})

// Dev-only: recompile knowledge/*.md (what the AI twin knows) whenever one changes
function knowledgePlugin(): PluginOption {
  const compile = () => {
    try {
      execFileSync(process.execPath, [path.join(projectRoot, 'scripts/build-knowledge.mjs')], { stdio: 'inherit' })
    } catch {
      // the script already printed why
    }
  }
  return {
    name: 'knowledge',
    configureServer(server: ViteDevServer) {
      const dir = path.join(projectRoot, 'knowledge')
      compile()
      server.watcher.add(dir)
      const onChange = (file: string) => {
        if (file.startsWith(dir) && file.endsWith('.md')) compile()
      }
      server.watcher.on('add', onChange).on('change', onChange).on('unlink', onChange)
    }
  }
}

// Title, meta and share tags, JSON-LD and a crawlable copy of the content, from the content files
function seoPlugin(): PluginOption {
  return {
    name: 'seo',
    transformIndexHtml(html, ctx) {
      // Static pages like ai-twin.html carry their own tags
      if (ctx.path !== '/index.html') return html
      const { head, body } = buildSeo(projectRoot)
      return html.replace(/<title>.*?<\/title>/, head).replace('<div id="root"></div>', `<div id="root">${body}</div>`)
    }
  }
}

// Dev-only content API plugin
function contentApiPlugin(): PluginOption {
  return {
    name: 'content-api',
    configureServer(server: ViteDevServer) {
      // Parse JSON body helper
      const parseJsonBody = (req: IncomingMessage): Promise<unknown> => {
        return new Promise((resolve, reject) => {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              resolve(JSON.parse(body))
            } catch {
              reject(new Error('Invalid JSON'))
            }
          })
          req.on('error', reject)
        })
      }

      // Content API middleware
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || ''
        
        // Only handle /api/content routes
        if (!url.startsWith('/api/content')) {
          return next()
        }

        // Only handle POST requests
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const data = await parseJsonBody(req)
          const contentPath = url.replace('/api/content/', '')

          if (contentPath === 'portfolio') {
            // Save portfolio.json
            const filePath = path.join(projectRoot, 'src/content/data/portfolio.json')
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
            
            // Trigger HMR
            server.ws.send({ type: 'full-reload' })
            
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } else if (contentPath === 'resume') {
            // Save resume.json
            const filePath = path.join(projectRoot, 'src/content/data/resume.json')
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
            
            // Trigger HMR
            server.ws.send({ type: 'full-reload' })
            
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } else if (contentPath.startsWith('i18n/')) {
            // Save locale content file (editable content only)
            const locale = contentPath.replace('i18n/', '')
            const validLocales = ['en', 'de', 'es', 'fr', 'hi', 'ja']
            
            if (!validLocales.includes(locale)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid locale' }))
              return
            }

            // Write to the content/ subfolder (not ui/)
            const filePath = path.join(projectRoot, `src/i18n/locales/content/${locale}.json`)
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
            
            // Trigger HMR
            server.ws.send({ type: 'full-reload' })
            
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } else {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Unknown content type' }))
          }
        } catch (error) {
          console.error('Content API error:', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Failed to save content' }))
        }
      })
    }
  }
}

// Dev-only: serve the Vercel Functions in api/ (chat, tts) from the Vite dev server
function apiFunctionsPlugin(): PluginOption {
  return {
    name: 'api-functions',
    configureServer(server: ViteDevServer) {
      for (const name of ['chat', 'tts']) server.middlewares.use(`/api/${name}`, async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)

          const controller = new AbortController()
          res.on('close', () => controller.abort())

          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            // Skip HTTP/2 pseudo-headers (:method, :path, ...)
            if (typeof value === 'string' && !key.startsWith(':')) headers.set(key, value)
          }
          const request = new Request(`https://${req.headers.host}/api/${name}`, {
            method: req.method,
            headers,
            body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
            signal: controller.signal
          })

          const { default: handler } = await server.ssrLoadModule(`/api/${name}.ts`)
          const response: Response = await handler.fetch(request)

          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          if (response.body) {
            for await (const chunk of response.body) res.write(chunk)
          }
          res.end()
        } catch (error) {
          console.error(`API /${name} error:`, error)
          if (!res.headersSent) res.statusCode = 500
          res.end()
        }
      })
    }
  }
}

export default defineConfig(({ command }) => ({
  resolve: {
    dedupe: ['three'],
    alias: {
      three: path.resolve(projectRoot, 'node_modules/three')
    }
  },
  optimizeDeps: {
    include: ['three']
  },
  build: {
    rollupOptions: {
      input: {
        main: path.join(projectRoot, 'index.html'),
        aiTwin: path.join(projectRoot, 'ai-twin.html')
      }
    }
  },
  server: {
    host: true,
    ...(command === 'serve'
      ? {
          https: {
            key: fs.readFileSync(path.join(projectRoot, process.env.KEY || 'certs/key.pem')),
            cert: fs.readFileSync(path.join(projectRoot, process.env.CERT || 'certs/cert.pem'))
          }
        }
      : {})
  },
  plugins: [react(), seoPlugin(), knowledgePlugin(), contentApiPlugin(), apiFunctionsPlugin()]
}))
