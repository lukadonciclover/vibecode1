export enum BlockType {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Sand = 4,
  Wood = 5,
  Leaves = 6,
  CraftingTable = 7,
  BerryBush = 8,
  CopperOre = 9,
  Silverstone = 10,
  CrystalOre = 11,
}

export const ALL_BLOCKS = [
  BlockType.Grass,
  BlockType.Dirt,
  BlockType.Stone,
  BlockType.Sand,
  BlockType.Wood,
  BlockType.Leaves,
  BlockType.CraftingTable,
  BlockType.BerryBush,
  BlockType.CopperOre,
  BlockType.Silverstone,
  BlockType.CrystalOre,
] as const

export const PLACEABLE_BLOCKS = [
  BlockType.Grass,
  BlockType.Dirt,
  BlockType.Stone,
  BlockType.Sand,
  BlockType.Wood,
  BlockType.Leaves,
  BlockType.CraftingTable,
] as const

export type PlaceableBlock = (typeof PLACEABLE_BLOCKS)[number]
export type ItemId =
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'sand'
  | 'wood_log'
  | 'leaves'
  | 'crafting_table'
  | 'copper_ore'
  | 'silverstone'
  | 'crystal_ore'
  | 'berry'
  | 'wood_planks'
  | 'stick'
  | 'wooden_pickaxe'
  | 'wooden_axe'
  | 'wooden_shovel'

export type InventoryCounts = Record<ItemId, number>
export type BlockChanges = Record<string, BlockType>

export interface PlayerPosition {
  x: number
  y: number
  z: number
}

export interface SaveData {
  version: 2
  seed: string
  position: PlayerPosition
  inventory: InventoryCounts
  changes: BlockChanges
  health: number
  hunger: number
  worldTime: number
  selectedItem: ItemId
  updatedAt: number
}

export const CHUNK_SIZE = 16
export const WORLD_HEIGHT = 24
export const WORLD_CHUNK_MIN = -2
export const WORLD_CHUNK_MAX = 1
