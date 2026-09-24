import type { BlockType } from '../types'
import { SmallStructureGenerator } from './smallStructures'
import type { BlockPlacement, ChunkQuery, StructureEnvironment, StructurePlan } from './types'
import { VillageGenerator } from './villages'

export class StructureGenerator {
  readonly smallStructures: SmallStructureGenerator
  readonly villages: VillageGenerator

  constructor(environment: StructureEnvironment) {
    this.smallStructures = new SmallStructureGenerator(environment)
    this.villages = new VillageGenerator(environment)
  }

  getStructuresForChunk(query: ChunkQuery): StructurePlan[]
  getStructuresForChunk(chunkX: number, chunkZ: number, chunkSize?: number): StructurePlan[]
  getStructuresForChunk(queryOrX: ChunkQuery | number, chunkZ?: number, size = 16): StructurePlan[] {
    const { chunkX, chunkZ: resolvedZ, chunkSize = size } = resolveChunkQuery(queryOrX, chunkZ, size)
    assertChunkSize(chunkSize)
    const minX = chunkX * chunkSize
    const minZ = resolvedZ * chunkSize
    const maxX = minX + chunkSize - 1
    const maxZ = minZ + chunkSize - 1
    return this.getStructuresInBounds(minX, maxX, minZ, maxZ)
  }

  getPlacementsForChunk(query: ChunkQuery): BlockPlacement[]
  getPlacementsForChunk(chunkX: number, chunkZ: number, chunkSize?: number): BlockPlacement[]
  getPlacementsForChunk(queryOrX: ChunkQuery | number, chunkZ?: number, size = 16): BlockPlacement[] {
    const query = resolveChunkQuery(queryOrX, chunkZ, size)
    const chunkSize = query.chunkSize ?? size
    assertChunkSize(chunkSize)
    const minX = query.chunkX * chunkSize
    const minZ = query.chunkZ * chunkSize
    const maxX = minX + chunkSize - 1
    const maxZ = minZ + chunkSize - 1
    const placements = new Map<string, BlockPlacement>()
    for (const plan of this.getStructuresInBounds(minX, maxX, minZ, maxZ)) {
      for (const placement of plan.placements) {
        if (placement.x < minX || placement.x > maxX || placement.z < minZ || placement.z > maxZ) continue
        placements.set(`${placement.x},${placement.y},${placement.z}`, placement)
      }
    }
    return [...placements.values()].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x)
  }

  getBlock(x: number, y: number, z: number): BlockType | undefined {
    const placement = this.getPlacementAt(x, y, z)
    return placement?.block
  }

  getPlacementAt(x: number, y: number, z: number): BlockPlacement | undefined {
    let result: BlockPlacement | undefined
    for (const plan of this.getStructuresInBounds(x, x, z, z)) {
      const placement = plan.placements.find((entry) => entry.x === x && entry.y === y && entry.z === z)
      if (placement) result = placement
    }
    return result
  }

  occupiesBlock(x: number, y: number, z: number): boolean {
    return this.getPlacementAt(x, y, z) !== undefined
  }

  private getStructuresInBounds(minX: number, maxX: number, minZ: number, maxZ: number): StructurePlan[] {
    const plans: StructurePlan[] = []
    this.scanCells(
      minX,
      maxX,
      minZ,
      maxZ,
      SmallStructureGenerator.cellSize,
      SmallStructureGenerator.queryMargin,
      (cellX, cellZ) => this.smallStructures.getStructureForCell(cellX, cellZ),
      plans,
    )
    this.scanCells(
      minX,
      maxX,
      minZ,
      maxZ,
      VillageGenerator.cellSize,
      VillageGenerator.queryMargin,
      (cellX, cellZ) => this.villages.getVillageForCell(cellX, cellZ),
      plans,
    )
    return plans.sort((a, b) => compareText(a.kind, b.kind) || compareText(a.id, b.id))
  }

  private scanCells(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    cellSize: number,
    margin: number,
    generate: (cellX: number, cellZ: number) => StructurePlan | undefined,
    output: StructurePlan[],
  ): void {
    const minCellX = Math.floor((minX - margin) / cellSize)
    const maxCellX = Math.floor((maxX + margin) / cellSize)
    const minCellZ = Math.floor((minZ - margin) / cellSize)
    const maxCellZ = Math.floor((maxZ + margin) / cellSize)
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
        const plan = generate(cellX, cellZ)
        if (plan && intersects(plan, minX, maxX, minZ, maxZ)) output.push(plan)
      }
    }
  }
}

function intersects(plan: StructurePlan, minX: number, maxX: number, minZ: number, maxZ: number): boolean {
  return plan.bounds.maxX >= minX
    && plan.bounds.minX <= maxX
    && plan.bounds.maxZ >= minZ
    && plan.bounds.minZ <= maxZ
}

function assertChunkSize(chunkSize: number): void {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new RangeError('chunkSize must be a positive integer')
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function resolveChunkQuery(queryOrX: ChunkQuery | number, chunkZ: number | undefined, chunkSize: number): ChunkQuery {
  if (typeof queryOrX !== 'number') return queryOrX
  if (chunkZ === undefined) throw new TypeError('chunkZ is required when chunkX is a number')
  return { chunkX: queryOrX, chunkZ, chunkSize }
}
