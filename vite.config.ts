import fs from 'fs'
import path from 'path'
import react from '@vitejs/plugin-react-swc'
import packageRoot from 'app-root-path'
import dotenv from 'dotenv'
import { defineConfig, type PluginOption, type ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

dotenv.config({
  path: packageRoot.path + '/.env.local'
})

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
            const filePath = path.join(packageRoot.path, 'src/content/data/portfolio.json')
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
            
            // Trigger HMR
            server.ws.send({ type: 'full-reload' })
            
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } else if (contentPath === 'resume') {
            // Save resume.json
            const filePath = path.join(packageRoot.path, 'src/content/data/resume.json')
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
            const filePath = path.join(packageRoot.path, `src/i18n/locales/content/${locale}.json`)
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

export default defineConfig(({ command }) => ({
  resolve: {
    dedupe: ['three'],
    alias: {
      three: path.resolve(packageRoot.path, 'node_modules/three')
    }
  },
  optimizeDeps: {
    include: ['three']
  },
  server: {
    host: true,
    ...(command === 'serve'
      ? {
          https: {
            key: fs.readFileSync(path.join(packageRoot.path, process.env.KEY || 'certs/key.pem')),
            cert: fs.readFileSync(path.join(packageRoot.path, process.env.CERT || 'certs/cert.pem'))
          }
        }
      : {})
  },
  plugins: [react(), contentApiPlugin()]
}))
