import { BlockType, type ItemId } from '../game/types'

export interface ToolDefinition {
  name: string
  icon: string
  miningSpeedMultiplier: number
  effectiveBlockTypes: readonly BlockType[]
  attackDamage: number
}

export const TOOLS: Partial<Record<ItemId, ToolDefinition>> = {
  wooden_pickaxe: {
    name: 'Wooden Pickaxe', icon: 'PI', miningSpeedMultiplier: 2.5,
    effectiveBlockTypes: [BlockType.Stone, BlockType.CopperOre, BlockType.Silverstone, BlockType.CrystalOre], attackDamage: 8,
  },
  wooden_axe: {
    name: 'Wooden Axe', icon: 'AX', miningSpeedMultiplier: 2.5,
    effectiveBlockTypes: [BlockType.Wood, BlockType.CraftingTable], attackDamage: 12,
  },
  wooden_shovel: {
    name: 'Wooden Shovel', icon: 'SH', miningSpeedMultiplier: 2.5,
    effectiveBlockTypes: [BlockType.Dirt, BlockType.Grass, BlockType.Sand], attackDamage: 7,
  },
}
