import { BlockType } from '../types'
import { hashInt, hashUnit } from './hash'
import { inspectSite, PlanBuilder } from './plan'
import type { StructureEnvironment, StructureKind, StructurePlan } from './types'

export type SmallStructureKind = Exclude<StructureKind, 'village'>

const CELL_SIZE = 24
const QUERY_MARGIN = 9
const SITE_BOUNDS = { minX: -3, maxX: 3, minZ: -3, maxZ: 3 }

export class SmallStructureGenerator {
  static readonly cellSize = CELL_SIZE
  static readonly queryMargin = QUERY_MARGIN

  constructor(private readonly environment: StructureEnvironment) {}

  getStructureForCell(cellX: number, cellZ: number): StructurePlan | undefined {
    if (hashUnit(this.environment.seed, cellX, cellZ, 100) >= 0.2) return undefined
    const x = cellX * CELL_SIZE + hashInt(this.environment.seed, cellX, cellZ, 101, 5, CELL_SIZE - 5)
    const z = cellZ * CELL_SIZE + hashInt(this.environment.seed, cellX, cellZ, 102, 5, CELL_SIZE - 5)
    const selector = hashUnit(this.environment.seed, cellX, cellZ, 103)
    const kind: SmallStructureKind = selector < 0.24
      ? 'ruin'
      : selector < 0.5
        ? 'cabin'
        : selector < 0.72
          ? 'watch_tower'
          : 'campsite'
    return this.generateAt(kind, x, z, hashInt(this.environment.seed, cellX, cellZ, 104, 0, 3), `${cellX},${cellZ}`)
  }

  generateAt(kind: SmallStructureKind, x: number, z: number, rotation = 0, idSuffix = `${x},${z}`): StructurePlan | undefined {
    const biome = this.environment.biomeAt(x, z)
    if (kind === 'cabin' && biome === 'desert') return undefined
    if (kind === 'campsite' && biome === 'forest') return undefined
    const site = inspectSite(x, z, SITE_BOUNDS, this.environment.terrainHeight, kind === 'watch_tower' ? 1 : 2)
    if (!site) return undefined
    const id = `small:${kind}:${idSuffix}`
    switch (kind) {
      case 'ruin': return buildRuin(this.environment, id, x, z, site.baseY, rotation)
      case 'cabin': return buildCabin(this.environment, id, x, z, site.baseY, rotation)
      case 'watch_tower': return buildWatchTower(this.environment, id, x, z, site.baseY, rotation)
      case 'campsite': return buildCampsite(this.environment, id, x, z, site.baseY, rotation)
    }
  }
}

function prepareFloor(builder: PlanBuilder, environment: StructureEnvironment, radiusX: number, radiusZ: number, block: BlockType): void {
  for (let x = -radiusX; x <= radiusX; x += 1) {
    for (let z = -radiusZ; z <= radiusZ; z += 1) {
      builder.support(x, z, environment.terrainHeight, block)
      builder.set(x, 0, z, block)
    }
  }
}

function buildRuin(environment: StructureEnvironment, id: string, x: number, z: number, baseY: number, rotation: number): StructurePlan {
  const builder = new PlanBuilder(id, 'ruin', x, z, baseY, rotation)
  prepareFloor(builder, environment, 3, 3, BlockType.Stone)
  for (let wallX = -3; wallX <= 3; wallX += 1) {
    for (let y = 1; y <= 3; y += 1) {
      if (hashUnit(environment.seed, x + wallX, z, 210 + y) > 0.28) builder.set(wallX, y, -3, BlockType.Stone)
      if (hashUnit(environment.seed, x + wallX, z, 220 + y) > 0.38) builder.set(wallX, y, 3, BlockType.Stone)
    }
  }
  for (let wallZ = -2; wallZ <= 2; wallZ += 1) {
    for (let y = 1; y <= 3; y += 1) {
      if (hashUnit(environment.seed, x, z + wallZ, 230 + y) > 0.3) builder.set(-3, y, wallZ, BlockType.Stone)
      if (hashUnit(environment.seed, x, z + wallZ, 240 + y) > 0.42) builder.set(3, y, wallZ, BlockType.Stone)
    }
  }
  builder.fill(-2, 2, 1, 3, -2, 2, BlockType.Air)
  builder.addLoot('cache', 1, 1, 1, 'rare_ruin')
  return builder.build()
}

function buildCabin(environment: StructureEnvironment, id: string, x: number, z: number, baseY: number, rotation: number): StructurePlan {
  const builder = new PlanBuilder(id, 'cabin', x, z, baseY, rotation)
  prepareFloor(builder, environment, 3, 2, BlockType.Wood)
  for (let wallX = -3; wallX <= 3; wallX += 1) {
    builder.fill(wallX, wallX, 1, 3, -2, -2, BlockType.Wood)
    builder.fill(wallX, wallX, 1, 3, 2, 2, BlockType.Wood)
  }
  for (let wallZ = -1; wallZ <= 1; wallZ += 1) {
    builder.fill(-3, -3, 1, 3, wallZ, wallZ, BlockType.Wood)
    builder.fill(3, 3, 1, 3, wallZ, wallZ, BlockType.Wood)
  }
  builder.fill(-2, 2, 1, 3, -1, 1, BlockType.Air)
  builder.fill(0, 0, 1, 2, -2, -2, BlockType.Air)
  builder.fill(-3, 3, 4, 4, -2, 2, BlockType.Leaves)
  builder.set(-2, 1, 1, BlockType.CraftingTable)
  builder.addLoot('shelf', 2, 1, 1, 'cabin')
  return builder.build()
}

function buildWatchTower(environment: StructureEnvironment, id: string, x: number, z: number, baseY: number, rotation: number): StructurePlan {
  const builder = new PlanBuilder(id, 'watch_tower', x, z, baseY, rotation)
  prepareFloor(builder, environment, 2, 2, BlockType.Stone)
  for (const pillarX of [-2, 2]) {
    for (const pillarZ of [-2, 2]) builder.fill(pillarX, pillarX, 1, 5, pillarZ, pillarZ, BlockType.Wood)
  }
  builder.fill(-2, 2, 4, 4, -2, 2, BlockType.Wood)
  builder.fill(-1, 1, 5, 7, -1, 1, BlockType.Air)
  for (let edge = -2; edge <= 2; edge += 1) {
    if (edge !== 0) {
      builder.set(edge, 5, -2, BlockType.Wood)
      builder.set(edge, 5, 2, BlockType.Wood)
      builder.set(-2, 5, edge, BlockType.Wood)
      builder.set(2, 5, edge, BlockType.Wood)
    }
  }
  builder.fill(-3, 3, 7, 7, -3, 3, BlockType.Leaves)
  builder.addLoot('lookout', 0, 5, 0, 'tower')
  return builder.build()
}

function buildCampsite(environment: StructureEnvironment, id: string, x: number, z: number, baseY: number, rotation: number): StructurePlan {
  const builder = new PlanBuilder(id, 'campsite', x, z, baseY, rotation)
  for (let localX = -3; localX <= 3; localX += 1) {
    for (let localZ = -3; localZ <= 3; localZ += 1) builder.set(localX, 1, localZ, BlockType.Air)
  }
  for (const [localX, localZ] of [[-1, 0], [0, -1], [1, 0], [0, 1], [0, 0], [-3, -2], [-2, -2], [2, 2], [3, 2]] as const) {
    builder.support(localX, localZ, environment.terrainHeight, BlockType.Stone)
  }
  builder.set(-1, 0, 0, BlockType.Stone)
  builder.set(0, 0, -1, BlockType.Stone)
  builder.set(1, 0, 0, BlockType.Stone)
  builder.set(0, 0, 1, BlockType.Stone)
  builder.set(0, 0, 0, BlockType.CraftingTable)
  builder.fill(-3, -2, 0, 0, -2, -2, BlockType.Wood)
  builder.fill(2, 3, 0, 0, 2, 2, BlockType.Wood)
  builder.addLoot('supplies', 2, 1, -2, 'cabin')
  return builder.build()
}
