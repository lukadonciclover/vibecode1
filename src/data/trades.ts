import type { ItemId } from '../game/types'
import type { VillageProfession } from '../game/world/types'

export interface TradeStack {
  item: ItemId
  count: number
}

export interface TradeDefinition {
  id: string
  profession: VillageProfession
  cost: readonly TradeStack[]
  reward: readonly TradeStack[]
  maxUses: number
}

export const TRADES: readonly TradeDefinition[] = [
  { id: 'farmer-berries', profession: 'farmer', cost: [{ item: 'berry', count: 6 }], reward: [{ item: 'wood_planks', count: 2 }], maxUses: 8 },
  { id: 'farmer-supplies', profession: 'farmer', cost: [{ item: 'wood_planks', count: 3 }], reward: [{ item: 'berry', count: 8 }], maxUses: 6 },
  { id: 'lumberjack-planks', profession: 'lumberjack', cost: [{ item: 'wood_log', count: 4 }], reward: [{ item: 'wood_planks', count: 7 }], maxUses: 10 },
  { id: 'lumberjack-axe', profession: 'lumberjack', cost: [{ item: 'wood_planks', count: 6 }, { item: 'stick', count: 2 }], reward: [{ item: 'wooden_axe', count: 1 }], maxUses: 4 },
  { id: 'mason-stone', profession: 'mason', cost: [{ item: 'dirt', count: 10 }], reward: [{ item: 'stone', count: 5 }], maxUses: 10 },
  { id: 'mason-silverstone', profession: 'mason', cost: [{ item: 'stone', count: 12 }, { item: 'copper_ore', count: 2 }], reward: [{ item: 'silverstone', count: 1 }], maxUses: 3 },
  { id: 'toolsmith-pickaxe', profession: 'toolsmith', cost: [{ item: 'wood_planks', count: 5 }, { item: 'stick', count: 2 }], reward: [{ item: 'wooden_pickaxe', count: 1 }], maxUses: 4 },
  { id: 'toolsmith-shovel', profession: 'toolsmith', cost: [{ item: 'wood_planks', count: 3 }, { item: 'stick', count: 2 }], reward: [{ item: 'wooden_shovel', count: 1 }], maxUses: 5 },
] as const

export function getTradesForProfession(profession: VillageProfession): readonly TradeDefinition[] {
  return TRADES.filter((trade) => trade.profession === profession)
}
