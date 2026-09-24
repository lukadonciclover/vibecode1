export enum BlockType {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Sand = 4,
  Wood = 5,
  Leaves = 6,
}

export const PLACEABLE_BLOCKS = [
  BlockType.Grass,
  BlockType.Dirt,
  BlockType.Stone,
  BlockType.Sand,
  BlockType.Wood,
  BlockType.Leaves,
] as const

export type PlaceableBlock = (typeof PLACEABLE_BLOCKS)[number]
export type InventoryCounts = Record<PlaceableBlock, number>
export type BlockChanges = Record<string, BlockType>

export interface PlayerPosition {
  x: number
  y: number
  z: number
}

export interface SaveData {
  version: 1
  seed: string
  position: PlayerPosition
  inventory: InventoryCounts
  changes: BlockChanges
  updatedAt: number
}

export const BLOCK_INFO: Record<PlaceableBlock, { label: string; color: string; side: string }> = {
  [BlockType.Grass]: { label: 'Grass', color: '#78a94c', side: '#657f3d' },
  [BlockType.Dirt]: { label: 'Dirt', color: '#9a6844', side: '#7e5134' },
  [BlockType.Stone]: { label: 'Stone', color: '#8c9695', side: '#6e7879' },
  [BlockType.Sand]: { label: 'Sand', color: '#d7c27a', side: '#bca464' },
  [BlockType.Wood]: { label: 'Wood', color: '#a97943', side: '#74502d' },
  [BlockType.Leaves]: { label: 'Leaves', color: '#497d45', side: '#335f38' },
}

export const CHUNK_SIZE = 16
export const WORLD_HEIGHT = 24
export const WORLD_CHUNK_MIN = -2
export const WORLD_CHUNK_MAX = 1
