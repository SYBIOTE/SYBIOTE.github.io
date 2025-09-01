/**
 * Viewport utilities for handling mobile browser UI elements
 * that can affect viewport dimensions
 */

export const setViewportHeight = () => {
  // Get the viewport height and multiply it by 1% to get a value for a vh unit
  const vh = window.innerHeight * 0.01;
  // Set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // Also set dynamic viewport units if supported
  if (CSS.supports('height', '100dvh')) {
    const dvh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--dvh', `${dvh}px`);
  }
};

export const initializeViewport = () => {
  // Set initial viewport height
  setViewportHeight();
  
  // Listen for resize events and update viewport height
  const handleResize = () => {
    setViewportHeight();
  };
  
  // Add event listener
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
  };
};

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  initializeViewport();
}
