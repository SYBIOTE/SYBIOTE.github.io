// Minimal types for the parts of gaussian-splat-renderer-for-lam we use (package ships none).
declare module 'gaussian-splat-renderer-for-lam' {
  export type ChatState = 'Idle' | 'Listening' | 'Thinking' | 'Responding'

  export interface GaussianSplatRendererOptions {
    /** Called every frame; drives the built-in head motion clips */
    getChatState?: () => ChatState
    /** Called every frame; ARKit blendshape name -> weight (0..1) */
    getExpressionData?: () => Record<string, number>
    /** Hex string, e.g. '0x000000' */
    backgroundColor?: string
    /** Canvas clear alpha 0..1 (0 = transparent) */
    alpha?: number
    downloadProgress?: (progress: number) => void
    loadProgress?: (progress: number) => void
  }

  export class GaussianSplatRenderer {
    static getInstance(
      container: HTMLElement,
      assetPath: string,
      options?: GaussianSplatRendererOptions
    ): Promise<GaussianSplatRenderer | undefined>
    dispose(): void
  }
}
