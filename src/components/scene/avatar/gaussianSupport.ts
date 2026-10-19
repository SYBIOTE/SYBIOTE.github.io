/** The LAM Gaussian head renderer needs WebGL2. */
export const supportsGaussianHead = (): boolean => {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}
