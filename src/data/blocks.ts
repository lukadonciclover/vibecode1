import { BlockType, type ItemId, type PlaceableBlock } from '../game/types'

export type BlockCategory = 'earth' | 'sand' | 'wood' | 'leaves' | 'stone' | 'plant' | 'crafted'

export interface BlockDefinition {
  label: string
  color: string
  side: string
  hardness: number
  category: BlockCategory
  drop: ItemId
  solid: boolean
  occludes: boolean
}

export const BLOCKS: Record<Exclude<BlockType, BlockType.Air>, BlockDefinition> = {
  [BlockType.Grass]: { label: 'Grass', color: '#78a94c', side: '#657f3d', hardness: 0.3, category: 'earth', drop: 'grass', solid: true, occludes: true },
  [BlockType.Dirt]: { label: 'Dirt', color: '#9a6844', side: '#7e5134', hardness: 0.4, category: 'earth', drop: 'dirt', solid: true, occludes: true },
  [BlockType.Stone]: { label: 'Stone', color: '#8c9695', side: '#6e7879', hardness: 1.5, category: 'stone', drop: 'stone', solid: true, occludes: true },
  [BlockType.Sand]: { label: 'Sand', color: '#d7c27a', side: '#bca464', hardness: 0.3, category: 'sand', drop: 'sand', solid: true, occludes: true },
  [BlockType.Wood]: { label: 'Wood Log', color: '#a97943', side: '#74502d', hardness: 0.8, category: 'wood', drop: 'wood_log', solid: true, occludes: true },
  [BlockType.Leaves]: { label: 'Leaves', color: '#497d45', side: '#335f38', hardness: 0.2, category: 'leaves', drop: 'leaves', solid: true, occludes: false },
  [BlockType.CraftingTable]: { label: 'Crafting Table', color: '#bd8747', side: '#755033', hardness: 0.8, category: 'crafted', drop: 'crafting_table', solid: true, occludes: true },
  [BlockType.BerryBush]: { label: 'Berry Bush', color: '#618947', side: '#9e4160', hardness: 0.2, category: 'plant', drop: 'berry', solid: false, occludes: false },
  [BlockType.CopperOre]: { label: 'Copper Ore', color: '#b8744d', side: '#737b77', hardness: 1.7, category: 'stone', drop: 'copper_ore', solid: true, occludes: true },
  [BlockType.Silverstone]: { label: 'Silverstone', color: '#b8c6ca', side: '#6d777a', hardness: 2, category: 'stone', drop: 'silverstone', solid: true, occludes: true },
  [BlockType.CrystalOre]: { label: 'Crystal Ore', color: '#8f77d2', side: '#536275', hardness: 2.3, category: 'stone', drop: 'crystal_ore', solid: true, occludes: true },
}

export const BLOCK_INFO = BLOCKS as Record<PlaceableBlock, BlockDefinition>

export function isSolidBlock(type: BlockType) {
  return type !== BlockType.Air && BLOCKS[type].solid
}

export function blockOccludes(type: BlockType) {
  return type !== BlockType.Air && BLOCKS[type].occludes
}
