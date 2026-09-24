import { BlockType } from '../types'
import type {
  BlockPlacement,
  HorizontalBounds,
  LootSpawnPoint,
  NpcSpawnPoint,
  SiteInspection,
  StructureBounds,
  StructureKind,
  StructurePlan,
  TerrainHeightCallback,
  WorldPoint,
} from './types'

export interface LocalPoint {
  x: number
  y: number
  z: number
}

export function rotatePoint(x: number, z: number, rotation: number): { x: number; z: number } {
  switch (((rotation % 4) + 4) % 4) {
    case 1: return { x: -z, z: x }
    case 2: return { x: -x, z: -z }
    case 3: return { x: z, z: -x }
    default: return { x, z }
  }
}

export function inspectSite(
  originX: number,
  originZ: number,
  bounds: HorizontalBounds,
  terrainHeight: TerrainHeightCallback,
  maxRise: number,
): SiteInspection | undefined {
  let minHeight = Number.POSITIVE_INFINITY
  let maxHeight = Number.NEGATIVE_INFINITY
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      const height = Math.floor(terrainHeight(originX + x, originZ + z))
      if (!Number.isFinite(height)) return undefined
      minHeight = Math.min(minHeight, height)
      maxHeight = Math.max(maxHeight, height)
      if (maxHeight - minHeight > maxRise) return undefined
    }
  }
  return { minHeight, maxHeight, baseY: maxHeight + 1 }
}

export class PlanBuilder {
  private readonly blocks = new Map<string, BlockPlacement>()
  readonly loot: LootSpawnPoint[] = []
  readonly npcSpawns: NpcSpawnPoint[] = []

  constructor(
    private readonly id: string,
    private readonly kind: StructureKind,
    private readonly originX: number,
    private readonly originZ: number,
    private readonly baseY: number,
    private readonly rotation = 0,
  ) {}

  set(localX: number, localY: number, localZ: number, block: BlockType): void {
    const rotated = rotatePoint(localX, localZ, this.rotation)
    const placement = {
      x: this.originX + rotated.x,
      y: this.baseY + localY,
      z: this.originZ + rotated.z,
      block,
    }
    this.blocks.set(`${placement.x},${placement.y},${placement.z}`, placement)
  }

  fill(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number,
    block: BlockType,
  ): void {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        for (let x = minX; x <= maxX; x += 1) this.set(x, y, z, block)
      }
    }
  }

  support(localX: number, localZ: number, terrainHeight: TerrainHeightCallback, block: BlockType): void {
    const rotated = rotatePoint(localX, localZ, this.rotation)
    const worldX = this.originX + rotated.x
    const worldZ = this.originZ + rotated.z
    const groundY = Math.floor(terrainHeight(worldX, worldZ))
    for (let worldY = groundY + 1; worldY < this.baseY; worldY += 1) {
      this.set(localX, worldY - this.baseY, localZ, block)
    }
  }

  addLoot(id: string, localX: number, localY: number, localZ: number, table: LootSpawnPoint['table']): void {
    this.loot.push({ id: `${this.id}:${id}`, ...this.toWorld(localX, localY, localZ), table })
  }

  addNpc(id: string, localX: number, localY: number, localZ: number, profession: NpcSpawnPoint['profession']): void {
    this.npcSpawns.push({ id: `${this.id}:${id}`, ...this.toWorld(localX, localY, localZ), profession })
  }

  build(): StructurePlan {
    const placements = [...this.blocks.values()].sort(comparePoints)
    const points: WorldPoint[] = [...placements, ...this.loot, ...this.npcSpawns]
    const bounds = getBounds(points, { x: this.originX, y: this.baseY, z: this.originZ })
    return {
      id: this.id,
      kind: this.kind,
      origin: { x: this.originX, y: this.baseY, z: this.originZ },
      bounds,
      placements,
      loot: this.loot,
      npcSpawns: this.npcSpawns,
    }
  }

  private toWorld(localX: number, localY: number, localZ: number): WorldPoint {
    const rotated = rotatePoint(localX, localZ, this.rotation)
    return { x: this.originX + rotated.x, y: this.baseY + localY, z: this.originZ + rotated.z }
  }
}

function comparePoints(a: WorldPoint, b: WorldPoint): number {
  return a.y - b.y || a.z - b.z || a.x - b.x
}

function getBounds(points: readonly WorldPoint[], fallback: WorldPoint): StructureBounds {
  let minX = fallback.x
  let maxX = fallback.x
  let minY = fallback.y
  let maxY = fallback.y
  let minZ = fallback.z
  let maxZ = fallback.z
  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
    minZ = Math.min(minZ, point.z)
    maxZ = Math.max(maxZ, point.z)
  }
  return { minX, maxX, minY, maxY, minZ, maxZ }
}
