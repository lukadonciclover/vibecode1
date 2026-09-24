import type { AchievementId } from '../data/achievements'
import type { SerializedWeatherState } from './weather'
import type { StatisticsSnapshot } from './progression'

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
  WoodPlanks = 12,
  Furnace = 13,
  Chest = 14,
  Farmland = 15,
  CropYoung = 16,
  CropMature = 17,
  Torch = 18,
  Fence = 19,
  Door = 20,
  Bed = 21,
  CoalOre = 22,
  Path = 23,
}

export const ALL_BLOCKS = Array.from({ length: BlockType.Path }, (_, index) => index + 1) as Exclude<BlockType, BlockType.Air>[]

export const PLACEABLE_BLOCKS = [
  BlockType.Grass, BlockType.Dirt, BlockType.Stone, BlockType.Sand, BlockType.Wood,
  BlockType.Leaves, BlockType.WoodPlanks, BlockType.CraftingTable, BlockType.Furnace,
  BlockType.Chest, BlockType.Farmland, BlockType.Torch, BlockType.Fence, BlockType.Door,
  BlockType.Bed,
] as const

export type PlaceableBlock = (typeof PLACEABLE_BLOCKS)[number]
export type ItemId =
  | 'grass' | 'dirt' | 'stone' | 'sand' | 'wood_log' | 'leaves' | 'wood_planks'
  | 'crafting_table' | 'furnace' | 'chest' | 'farmland' | 'torch' | 'fence' | 'door' | 'bed'
  | 'copper_ore' | 'silverstone' | 'crystal_ore' | 'coal'
  | 'copper_ingot' | 'refined_silverstone' | 'crystal_shard' | 'steel_ingot'
  | 'berry' | 'seeds' | 'wheat' | 'bread' | 'raw_meat' | 'cooked_meat' | 'vegetable' | 'leather'
  | 'stick'
  | 'wooden_pickaxe' | 'wooden_axe' | 'wooden_shovel' | 'wooden_sword'
  | 'stone_pickaxe' | 'stone_axe' | 'stone_shovel' | 'stone_sword'
  | 'copper_pickaxe' | 'copper_axe' | 'copper_shovel' | 'copper_sword'
  | 'steel_pickaxe' | 'steel_axe' | 'steel_shovel' | 'steel_sword'
  | 'leather_helmet' | 'leather_chestplate' | 'leather_leggings' | 'leather_boots'
  | 'copper_helmet' | 'copper_chestplate' | 'copper_leggings' | 'copper_boots'
  | 'steel_helmet' | 'steel_chestplate' | 'steel_leggings' | 'steel_boots'

export type InventoryCounts = Record<ItemId, number>
export type InventoryDurability = Partial<Record<ItemId, number[]>>
export type BlockChanges = Record<string, BlockType>
export type ModifiedChunks = Record<string, BlockChanges>
export type GameMode = 'survival' | 'creative'
export type Difficulty = 'peaceful' | 'easy' | 'normal' | 'hard'
export type ArmorSlot = 'head' | 'chest' | 'legs' | 'feet'
export type Equipment = Record<ArmorSlot, ItemId | null> & { offhand: ItemId | null }

export interface PlayerPosition {
  x: number
  y: number
  z: number
}

export interface ItemStack {
  item: ItemId
  count: number
}

export interface FurnaceState {
  type: 'furnace'
  input: ItemStack | null
  fuel: ItemStack | null
  output: ItemStack | null
  progress: number
  fuelRemaining: number
}

export interface ChestState {
  type: 'chest'
  items: Partial<Record<ItemId, number>>
  capacity: number
  lootTable?: string
  lootClaimed?: boolean
}

export type BlockEntity = FurnaceState | ChestState

export interface CropState {
  plantedAt: number
  stage: number
}

export interface WorldSettings {
  gameMode: GameMode
  difficulty: Difficulty
  renderDistance: number
}

export interface UserSettings {
  renderDistance: number
  mouseSensitivity: number
  masterVolume: number
  musicVolume: number
  soundVolume: number
  fov: number
  fullscreen: boolean
  showFps: boolean
}

export interface SaveData {
  version: 3
  id: string
  name: string
  seed: string
  generationVersion: 2 | 3
  createdAt: number
  updatedAt: number
  settings: WorldSettings
  position: PlayerPosition
  spawn: PlayerPosition
  inventory: InventoryCounts
  durability: InventoryDurability
  equipment: Equipment
  modifiedChunks: ModifiedChunks
  blockEntities: Record<string, BlockEntity>
  crops: Record<string, CropState>
  health: number
  hunger: number
  worldTime: number
  totalWorldTime: number
  selectedItem: ItemId
  achievements: AchievementId[]
  statistics: StatisticsSnapshot
  visitedChunks: string[]
  discoveredBiomes: string[]
  weather?: SerializedWeatherState
  tradeUses: Record<string, number>
}

export interface WorldSummary {
  id: string
  name: string
  seed: string
  settings: WorldSettings
  createdAt: number
  updatedAt: number
  corrupted?: boolean
}

export const CHUNK_SIZE = 16
export const WORLD_HEIGHT = 32
export const DEFAULT_WORLD_SETTINGS: WorldSettings = { gameMode: 'survival', difficulty: 'normal', renderDistance: 3 }
export const DEFAULT_USER_SETTINGS: UserSettings = {
  renderDistance: 3,
  mouseSensitivity: 1,
  masterVolume: 0.8,
  musicVolume: 0.45,
  soundVolume: 0.8,
  fov: 72,
  fullscreen: false,
  showFps: true,
}
