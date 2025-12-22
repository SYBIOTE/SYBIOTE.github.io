/**
 * Logger utility that only logs in development mode
 * Uses Vite's import.meta.env.DEV to check if we're in development
 * 
 * Available globally as `logger` (no import needed)
 * Also available as a named export for explicit imports
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};

// Make logger globally available (both window.logger and global logger)
if (typeof window !== 'undefined') {
  window.logger = logger;
  // Also make it available as a global variable for convenience
  (globalThis as typeof globalThis & { logger: typeof logger }).logger = logger;
}

