import { BlockType, type ItemId } from '../game/types'

export interface ItemDefinition {
  name: string
  icon: string
  color: string
  placeBlock?: BlockType
  food?: number
}

export const ITEM_IDS: ItemId[] = [
  'grass', 'dirt', 'stone', 'sand', 'wood_log', 'leaves', 'crafting_table',
  'copper_ore', 'silverstone', 'crystal_ore', 'berry', 'wood_planks', 'stick',
  'wooden_pickaxe', 'wooden_axe', 'wooden_shovel',
]

export const ITEMS: Record<ItemId, ItemDefinition> = {
  grass: { name: 'Grass', icon: 'GR', color: '#78a94c', placeBlock: BlockType.Grass },
  dirt: { name: 'Dirt', icon: 'DI', color: '#9a6844', placeBlock: BlockType.Dirt },
  stone: { name: 'Stone', icon: 'ST', color: '#8c9695', placeBlock: BlockType.Stone },
  sand: { name: 'Sand', icon: 'SA', color: '#d7c27a', placeBlock: BlockType.Sand },
  wood_log: { name: 'Wood Log', icon: 'WL', color: '#a97943', placeBlock: BlockType.Wood },
  leaves: { name: 'Leaves', icon: 'LE', color: '#497d45', placeBlock: BlockType.Leaves },
  crafting_table: { name: 'Crafting Table', icon: 'CT', color: '#bd8747', placeBlock: BlockType.CraftingTable },
  copper_ore: { name: 'Copper Ore', icon: 'CO', color: '#b8744d' },
  silverstone: { name: 'Silverstone', icon: 'SV', color: '#b8c6ca' },
  crystal_ore: { name: 'Crystal Ore', icon: 'CR', color: '#8f77d2' },
  berry: { name: 'Wild Berry', icon: 'BE', color: '#bd4966', food: 14 },
  wood_planks: { name: 'Wood Planks', icon: 'PL', color: '#c89350' },
  stick: { name: 'Stick', icon: 'SK', color: '#9a6f43' },
  wooden_pickaxe: { name: 'Wooden Pickaxe', icon: 'PI', color: '#d1a15f' },
  wooden_axe: { name: 'Wooden Axe', icon: 'AX', color: '#c58f51' },
  wooden_shovel: { name: 'Wooden Shovel', icon: 'SH', color: '#bd8449' },
}

export const HOTBAR_ITEMS: ItemId[] = [
  'grass', 'dirt', 'stone', 'sand', 'wood_log', 'leaves', 'crafting_table',
  'wooden_pickaxe', 'wooden_axe', 'wooden_shovel',
]
