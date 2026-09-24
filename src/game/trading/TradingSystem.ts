import { TRADES, type TradeDefinition } from '../../data/trades'
import { InventorySystem } from '../InventorySystem'

export class TradingSystem {
  private readonly uses: Record<string, number>
  constructor(private readonly inventory: InventorySystem, initial: Record<string, number> = {}) { this.uses = { ...initial } }

  canTrade(trade: TradeDefinition) {
    return (this.uses[trade.id] ?? 0) < trade.maxUses && trade.cost.every((stack) => this.inventory.has(stack.item, stack.count))
  }

  execute(tradeId: string) {
    const trade = TRADES.find((candidate) => candidate.id === tradeId)
    if (!trade || !this.canTrade(trade)) return false
    for (const stack of trade.cost) this.inventory.remove(stack.item, stack.count)
    for (const stack of trade.reward) this.inventory.add(stack.item, stack.count)
    this.uses[trade.id] = (this.uses[trade.id] ?? 0) + 1
    return true
  }

  snapshot() { return { ...this.uses } }
}
