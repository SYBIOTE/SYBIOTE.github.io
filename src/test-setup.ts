import { vi } from 'vitest'
import { logger } from './utils/logger'

// Mock logger warnings for cleaner test output
logger.warn = vi.fn()