import { BlockType, type ItemId, type PlaceableBlock } from '../game/types'
import type { ToolType } from './items'

export type BlockCategory = 'earth' | 'sand' | 'wood' | 'leaves' | 'stone' | 'plant' | 'crafted' | 'ore'

export interface BlockDefinition {
  label: string
  color: string
  side: string
  hardness: number
  category: BlockCategory
  drop: ItemId
  solid: boolean
  occludes: boolean
  preferredTool?: ToolType
  requiredTier?: number
  interactable?: 'crafting' | 'furnace' | 'chest'
  lightLevel?: number
}

const definition = (label: string, color: string, side: string, hardness: number, category: BlockCategory, drop: ItemId, solid = true, occludes = true, extra: Partial<BlockDefinition> = {}): BlockDefinition =>
  ({ label, color, side, hardness, category, drop, solid, occludes, ...extra })

export const BLOCKS: Record<Exclude<BlockType, BlockType.Air>, BlockDefinition> = {
  [BlockType.Grass]: definition('Grass', '#78a94c', '#657f3d', 0.3, 'earth', 'grass', true, true, { preferredTool: 'shovel' }),
  [BlockType.Dirt]: definition('Dirt', '#9a6844', '#7e5134', 0.4, 'earth', 'dirt', true, true, { preferredTool: 'shovel' }),
  [BlockType.Stone]: definition('Stone', '#8c9695', '#6e7879', 1.5, 'stone', 'stone', true, true, { preferredTool: 'pickaxe', requiredTier: 1 }),
  [BlockType.Sand]: definition('Sand', '#d7c27a', '#bca464', 0.3, 'sand', 'sand', true, true, { preferredTool: 'shovel' }),
  [BlockType.Wood]: definition('Wood Log', '#a97943', '#74502d', 0.8, 'wood', 'wood_log', true, true, { preferredTool: 'axe' }),
  [BlockType.Leaves]: definition('Leaves', '#497d45', '#335f38', 0.2, 'leaves', 'leaves', true, false, { preferredTool: 'axe' }),
  [BlockType.CraftingTable]: definition('Crafting Table', '#bd8747', '#755033', 0.8, 'crafted', 'crafting_table', true, true, { preferredTool: 'axe', interactable: 'crafting' }),
  [BlockType.BerryBush]: definition('Berry Bush', '#618947', '#9e4160', 0.2, 'plant', 'berry', false, false),
  [BlockType.CopperOre]: definition('Copper Ore', '#b8744d', '#737b77', 1.7, 'ore', 'copper_ore', true, true, { preferredTool: 'pickaxe', requiredTier: 2 }),
  [BlockType.Silverstone]: definition('Silverstone', '#b8c6ca', '#6d777a', 2, 'ore', 'silverstone', true, true, { preferredTool: 'pickaxe', requiredTier: 3 }),
  [BlockType.CrystalOre]: definition('Crystal Ore', '#8f77d2', '#536275', 2.3, 'ore', 'crystal_ore', true, true, { preferredTool: 'pickaxe', requiredTier: 4 }),
  [BlockType.WoodPlanks]: definition('Wood Planks', '#c89350', '#956738', 0.65, 'wood', 'wood_planks', true, true, { preferredTool: 'axe' }),
  [BlockType.Furnace]: definition('Furnace', '#697170', '#4f5757', 1.8, 'crafted', 'furnace', true, true, { preferredTool: 'pickaxe', requiredTier: 1, interactable: 'furnace' }),
  [BlockType.Chest]: definition('Chest', '#9f703b', '#704923', 0.7, 'crafted', 'chest', true, true, { preferredTool: 'axe', interactable: 'chest' }),
  [BlockType.Farmland]: definition('Farmland', '#76513a', '#5c3c2a', 0.35, 'earth', 'dirt', true, true, { preferredTool: 'shovel' }),
  [BlockType.CropYoung]: definition('Young Sungrain', '#83a84e', '#63853e', 0.1, 'plant', 'seeds', false, false),
  [BlockType.CropMature]: definition('Mature Sungrain', '#d6bc5d', '#9d8b44', 0.12, 'plant', 'wheat', false, false),
  [BlockType.Torch]: definition('Torch', '#f0b94f', '#9c6334', 0.05, 'crafted', 'torch', false, false, { lightLevel: 9 }),
  [BlockType.Fence]: definition('Fence', '#a67640', '#76502b', 0.65, 'wood', 'fence', true, false, { preferredTool: 'axe' }),
  [BlockType.Door]: definition('Door', '#a87a43', '#75502d', 0.55, 'wood', 'door', true, false, { preferredTool: 'axe' }),
  [BlockType.Bed]: definition('Bed', '#b74e54', '#744046', 0.4, 'crafted', 'bed', true, false),
  [BlockType.CoalOre]: definition('Ember Coal Ore', '#42464b', '#707776', 1.6, 'ore', 'coal', true, true, { preferredTool: 'pickaxe', requiredTier: 1 }),
  [BlockType.Path]: definition('Village Path', '#a68a5d', '#806b49', 0.35, 'earth', 'dirt', true, true, { preferredTool: 'shovel' }),
}

export const BLOCK_INFO = BLOCKS as Record<PlaceableBlock, BlockDefinition>
export const isSolidBlock = (type: BlockType) => type !== BlockType.Air && BLOCKS[type].solid
export const blockOccludes = (type: BlockType) => type !== BlockType.Air && BLOCKS[type].occludes
