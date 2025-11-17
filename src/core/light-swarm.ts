import type { LightAgent } from './light-agent.js'
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/**
 * Swarm management for multiple LightAgent instances
 */
export class LightSwarm {
  private agents: Map<string, LightAgent> = new Map()

  /**
   * Register one or more agents
   */
  registerAgent(...agents: LightAgent[]): void {
    for (const agent of agents) {
      if (this.agents.has(agent.name)) {
        agent.log('INFO', 'register_agent', {
          agent_name: agent.name,
          status: 'already_registered',
        })
      } else {
        this.agents.set(agent.name, agent)
        agent.log('INFO', 'register_agent', { agent_name: agent.name, status: 'registered' })
      }
    }
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): LightAgent | undefined {
    return this.agents.get(name)
  }

  /**
   * Run a specific agent
   */
  async run(
    agentName: string,
    query: string,
    options: {
      stream?: boolean
      user_id?: string
      history?: ChatMessage[]
    } = {}
  ): Promise<string | AsyncGenerator<string, void, unknown>> {
    const agent = this.agents.get(agentName)
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found.`)
    }

    return agent.run(query, {
      ...options,
      metadata: { swarm_context: true },
    })
  }

  /**
   * Run agent by instance
   */
  async runAgent(
    agent: LightAgent,
    query: string,
    options: {
      stream?: boolean
      user_id?: string
      history?: ChatMessage[]
    } = {}
  ): Promise<string | AsyncGenerator<string, void, unknown>> {
    if (!this.agents.has(agent.name)) {
      throw new Error(`Agent '${agent.name}' is not registered in this swarm.`)
    }

    return agent.run(query, {
      ...options,
      metadata: { swarm_context: true },
    })
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Map<string, LightAgent> {
    return new Map(this.agents)
  }

  /**
   * Get all agent names
   */
  getAgentNames(): string[] {
    return Array.from(this.agents.keys())
  }

  /**
   * Remove an agent
   */
  removeAgent(name: string): boolean {
    const removed = this.agents.delete(name)
    if (removed) {
      console.log(`Agent '${name}' removed from swarm.`)
    }
    return removed
  }

  /**
   * Check if agent exists
   */
  hasAgent(name: string): boolean {
    return this.agents.has(name)
  }

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.agents.size
  }
}
