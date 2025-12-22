/// <reference types="vite/client" />

// Global logger type declaration
declare global {
  interface Window {
    logger: {
      log: (...args: unknown[]) => void;
      error: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
      info: (...args: unknown[]) => void;
      debug: (...args: unknown[]) => void;
    };
  }
  
  // Also make it available as a global variable (not just window.logger)
  const logger: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
  };
}

export {};
