import { createContext, useContext, type ReactNode } from 'react'
import type { AgentService } from '../../../services/useAgent'

const AgentStateContext = createContext<AgentService['state'] | null>(null)
const AgentActionsContext = createContext<AgentService['actions'] | null>(null)
const AgentServicesContext = createContext<AgentService['services'] | null>(null)

export const useAgentState = () => {
  const v = useContext(AgentStateContext)
  if (!v) throw new Error('useAgentState must be used within AgentProvider')
  return v
}

export const useAgentActions = () => {
  const v = useContext(AgentActionsContext)
  if (!v) throw new Error('useAgentActions must be used within AgentProvider')
  return v
}

export const useAgentServices = () => {
  const v = useContext(AgentServicesContext)
  if (!v) throw new Error('useAgentServices must be used within AgentProvider')
  return v
}

export const AgentProvider = ({ agent, children }: { agent: AgentService; children: ReactNode }) => {
  return (
    <AgentStateContext.Provider value={agent.state}>
      <AgentActionsContext.Provider value={agent.actions}>
        <AgentServicesContext.Provider value={agent.services}>
          {children}
        </AgentServicesContext.Provider>
      </AgentActionsContext.Provider>
    </AgentStateContext.Provider>
  )
}