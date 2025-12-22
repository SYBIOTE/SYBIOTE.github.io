// Test setup file for vitest
import { vi } from 'vitest'

// Mock logger warnings for cleaner test output
global.logger.warn = vi.fn()
