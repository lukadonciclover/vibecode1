import type { BiomeId } from '../../data/biomes'
import type { LootTableId } from '../../data/loot'
import type { BlockType } from '../types'

export type StructureKind = 'ruin' | 'cabin' | 'watch_tower' | 'campsite' | 'village'
export type VillageProfession = 'farmer' | 'lumberjack' | 'mason' | 'toolsmith'
export type TerrainHeightCallback = (x: number, z: number) => number
export type BiomeCallback = (x: number, z: number) => BiomeId

export interface WorldPoint {
  x: number
  y: number
  z: number
}

export interface HorizontalBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface StructureBounds extends HorizontalBounds {
  minY: number
  maxY: number
}

export interface BlockPlacement extends WorldPoint {
  block: BlockType
}

export interface LootSpawnPoint extends WorldPoint {
  id: string
  table: LootTableId
}

export interface NpcSpawnPoint extends WorldPoint {
  id: string
  profession: VillageProfession
}

export interface StructurePlan {
  id: string
  kind: StructureKind
  origin: WorldPoint
  bounds: StructureBounds
  placements: readonly BlockPlacement[]
  loot: readonly LootSpawnPoint[]
  npcSpawns: readonly NpcSpawnPoint[]
}

export interface StructureEnvironment {
  seed: string
  terrainHeight: TerrainHeightCallback
  biomeAt: BiomeCallback
}

export interface ChunkQuery {
  chunkX: number
  chunkZ: number
  chunkSize?: number
}

export interface SiteInspection {
  minHeight: number
  maxHeight: number
  baseY: number
}
