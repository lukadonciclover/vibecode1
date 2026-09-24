import { ITEMS, type ToolType } from './items'
import type { ItemId } from '../game/types'

export interface ToolDefinition {
  name: string
  icon: string
  toolType: ToolType
  tier: number
  miningSpeedMultiplier: number
  attackDamage: number
  maxDurability: number
}

const speeds = [1, 2.5, 3.5, 4.5, 6]
export const TOOLS: Partial<Record<ItemId, ToolDefinition>> = Object.fromEntries(
  Object.values(ITEMS)
    .filter((entry) => entry.toolType)
    .map((entry) => [entry.id, {
      name: entry.name,
      icon: entry.icon,
      toolType: entry.toolType!,
      tier: entry.toolTier ?? 0,
      miningSpeedMultiplier: speeds[entry.toolTier ?? 0],
      attackDamage: entry.attackDamage ?? 5,
      maxDurability: entry.durability ?? 1,
    }]),
) as Partial<Record<ItemId, ToolDefinition>>
