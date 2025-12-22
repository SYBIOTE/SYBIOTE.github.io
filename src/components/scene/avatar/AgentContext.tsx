import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { AgentService } from '../../../services/useAgent'

interface AgentContextValue {
  agent: AgentService
}

const AgentContext = createContext<AgentContextValue | null>(null)

export const useAgentContext = (): AgentService => {
  const context = useContext(AgentContext)
  if (!context) {
    throw new Error('useAgentContext must be used within AgentProvider')
  }
  return context.agent
}

interface AgentProviderProps {
  agent: AgentService
  children: ReactNode
}

export const AgentProvider = ({ agent, children }: AgentProviderProps) => {
  // Memoize context value to prevent rerenders when agent reference changes
  // This ensures only components that subscribe to agent state will rerender
  const contextValue = useMemo(() => ({ agent }), [agent])
  
  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  )
}