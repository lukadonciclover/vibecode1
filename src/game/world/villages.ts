import { BlockType } from '../types'
import { hashInt, hashUnit } from './hash'
import { inspectSite, PlanBuilder, rotatePoint } from './plan'
import type { StructureEnvironment, StructurePlan, VillageProfession } from './types'

const CELL_SIZE = 72
const QUERY_MARGIN = 23
const VILLAGE_BOUNDS = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }
const HOUSE_SITES = [
  { x: -11, z: -9, rotation: 1 },
  { x: 11, z: -9, rotation: 3 },
  { x: -11, z: 9, rotation: 1 },
  { x: 11, z: 9, rotation: 3 },
] as const
const PROFESSIONS: readonly VillageProfession[] = ['farmer', 'lumberjack', 'mason', 'toolsmith']

export class VillageGenerator {
  static readonly cellSize = CELL_SIZE
  static readonly queryMargin = QUERY_MARGIN

  constructor(private readonly environment: StructureEnvironment) {}

  getVillageForCell(cellX: number, cellZ: number): StructurePlan | undefined {
    if (hashUnit(this.environment.seed, cellX, cellZ, 500) >= 0.11) return undefined
    const x = cellX * CELL_SIZE + hashInt(this.environment.seed, cellX, cellZ, 501, 18, CELL_SIZE - 18)
    const z = cellZ * CELL_SIZE + hashInt(this.environment.seed, cellX, cellZ, 502, 18, CELL_SIZE - 18)
    return this.generateAt(x, z, hashInt(this.environment.seed, cellX, cellZ, 503, 0, 3), `${cellX},${cellZ}`)
  }

  generateAt(x: number, z: number, rotation = 0, idSuffix = `${x},${z}`): StructurePlan | undefined {
    if (!isPlainsSite(this.environment, x, z)) return undefined
    const site = inspectSite(x, z, VILLAGE_BOUNDS, this.environment.terrainHeight, 3)
    if (!site) return undefined
    const id = `village:${idSuffix}`
    const builder = new PlanBuilder(id, 'village', x, z, site.baseY, rotation)
    buildPaths(builder, this.environment, x, z, rotation, site.baseY)

    const houseCount = hashInt(this.environment.seed, x, z, 510, 3, 4)
    for (let index = 0; index < houseCount; index += 1) {
      const house = HOUSE_SITES[index]
      const built = buildHouse(builder, this.environment, x, z, rotation, house.x, house.z, house.rotation)
      if (!built) continue
      const profession = PROFESSIONS[hashInt(this.environment.seed, x, z, 520 + index, 0, PROFESSIONS.length - 1)]
      builder.addNpc(`resident-${index}`, house.x, 1, house.z, profession)
    }
    buildFarm(builder, this.environment, 8, 0)
    builder.addNpc('farmer', 8, 1, 0, 'farmer')
    return builder.build()
  }
}

function buildPaths(
  builder: PlanBuilder,
  environment: StructureEnvironment,
  originX: number,
  originZ: number,
  rotation: number,
  baseY: number,
): void {
  for (let distance = -17; distance <= 17; distance += 1) {
    for (const [localX, localZ] of [[distance, 0], [0, distance]] as const) {
      const rotated = rotatePoint(localX, localZ, rotation)
      const groundY = Math.floor(environment.terrainHeight(originX + rotated.x, originZ + rotated.z))
      builder.set(localX, groundY + 1 - baseY, localZ, BlockType.Dirt)
      builder.set(localX, groundY + 2 - baseY, localZ, BlockType.Air)
    }
  }
}

function buildHouse(
  builder: PlanBuilder,
  environment: StructureEnvironment,
  villageX: number,
  villageZ: number,
  villageRotation: number,
  centerX: number,
  centerZ: number,
  facing: number,
): boolean {
  const center = rotatePoint(centerX, centerZ, villageRotation)
  const houseSite = inspectSite(villageX + center.x, villageZ + center.z, { minX: -2, maxX: 2, minZ: -2, maxZ: 2 }, environment.terrainHeight, 2)
  if (!houseSite) return false
  const localFloorY = 0
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dz = -2; dz <= 2; dz += 1) {
      const housePoint = rotatePoint(dx, dz, facing)
      const localX = centerX + housePoint.x
      const localZ = centerZ + housePoint.z
      builder.support(localX, localZ, environment.terrainHeight, BlockType.Stone)
      builder.set(localX, localFloorY, localZ, BlockType.Wood)
      for (let dy = 1; dy <= 3; dy += 1) {
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2
        builder.set(localX, localFloorY + dy, localZ, edge ? BlockType.Wood : BlockType.Air)
      }
      builder.set(localX, localFloorY + 4, localZ, BlockType.Leaves)
    }
  }
  const door = rotatePoint(0, -2, facing)
  builder.set(centerX + door.x, localFloorY + 1, centerZ + door.z, BlockType.Air)
  builder.set(centerX + door.x, localFloorY + 2, centerZ + door.z, BlockType.Air)
  return true
}

function buildFarm(builder: PlanBuilder, environment: StructureEnvironment, centerX: number, centerZ: number): void {
  for (let dx = -3; dx <= 3; dx += 1) {
    for (let dz = -3; dz <= 3; dz += 1) {
      builder.support(centerX + dx, centerZ + dz, environment.terrainHeight, BlockType.Dirt)
      builder.set(centerX + dx, 0, centerZ + dz, BlockType.Dirt)
      const crop = (dx !== 0 || dz !== 0) && (dx + dz) % 2 === 0
      builder.set(centerX + dx, 1, centerZ + dz, crop ? BlockType.BerryBush : BlockType.Air)
    }
  }
  for (let edge = -4; edge <= 4; edge += 1) {
    builder.set(centerX + edge, 1, centerZ - 4, BlockType.Wood)
    builder.set(centerX + edge, 1, centerZ + 4, BlockType.Wood)
    builder.set(centerX - 4, 1, centerZ + edge, BlockType.Wood)
    builder.set(centerX + 4, 1, centerZ + edge, BlockType.Wood)
  }
}

function isPlainsSite(environment: StructureEnvironment, x: number, z: number): boolean {
  const samples = [[0, 0], [-15, -15], [15, -15], [-15, 15], [15, 15]] as const
  return samples.every(([dx, dz]) => environment.biomeAt(x + dx, z + dz) === 'plains')
}
