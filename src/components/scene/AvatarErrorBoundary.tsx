import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Called once if anything below throws while rendering */
  onError?: (error: unknown) => void
}

/** Contains a crash in the avatar renderer so the rest of the page keeps working. */
export class AvatarErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    logger.error('Avatar crashed:', error)
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
