import { BIOMES, type BiomeId } from '../data/biomes'
import { SeededNoise } from './SeededNoise'
import { BlockType, CHUNK_SIZE, WORLD_HEIGHT } from './types'
import { WorldGenerator } from './WorldGenerator'

/** Preserves the Phase 2 terrain algorithm for migrated saves. */
export class LegacyWorldGenerator extends WorldGenerator {
  private readonly legacyNoise: SeededNoise
  private readonly heights = new Map<string, number>()
  private readonly trees = new Map<string, boolean>()
  private readonly berries = new Map<string, boolean>()

  constructor(seed: string) {
    super(seed)
    this.legacyNoise = new SeededNoise(seed)
  }

  override getTerrainHeight(x: number, z: number) {
    const key = `${x},${z}`
    const cached = this.heights.get(key)
    if (cached !== undefined) return cached
    const broad = this.legacyNoise.fbm2D(x * 0.025, z * 0.025, 4)
    const detail = this.legacyNoise.fbm2D(x * 0.075 + 40, z * 0.075 - 25, 3)
    const strength = BIOMES[this.getLegacyBiome(x, z)].hillStrength
    const height = Math.max(3, Math.min(15, Math.floor(6 + broad * 5 * strength + detail * 2 * strength)))
    this.heights.set(key, height)
    return height
  }

  override getBiome(x: number, z: number) {
    return this.getLegacyBiome(x, z)
  }

  override getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= WORLD_HEIGHT) return BlockType.Air
    const height = this.getTerrainHeight(x, z)
    const biome = this.getLegacyBiome(x, z)
    if (y <= height) {
      if (this.isLegacyCave(x, y, z, height)) return BlockType.Air
      if (y === height) return biome === 'desert' ? BlockType.Sand : BlockType.Grass
      if (y >= height - 2) return biome === 'desert' ? BlockType.Sand : BlockType.Dirt
      return this.getLegacyOre(x, y, z)
    }
    if (y === height + 1 && this.hasLegacyBerryBush(x, z)) return BlockType.BerryBush
    for (let treeX = x - 2; treeX <= x + 2; treeX += 1) {
      for (let treeZ = z - 2; treeZ <= z + 2; treeZ += 1) {
        if (!this.hasLegacyTree(treeX, treeZ)) continue
        const base = this.getTerrainHeight(treeX, treeZ) + 1
        if (x === treeX && z === treeZ && y >= base && y <= base + 3) return BlockType.Wood
        const dx = Math.abs(x - treeX)
        const dz = Math.abs(z - treeZ)
        const dy = y - (base + 3)
        if (dy >= -1 && dy <= 2 && dx <= 2 && dz <= 2 && dx + dz + Math.max(dy, 0) < 4) return BlockType.Leaves
      }
    }
    return BlockType.Air
  }

  override generateChunk(chunkX: number, chunkZ: number) {
    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
    for (let y = 0; y < WORLD_HEIGHT; y += 1) {
      for (let z = 0; z < CHUNK_SIZE; z += 1) {
        for (let x = 0; x < CHUNK_SIZE; x += 1) {
          blocks[x + CHUNK_SIZE * (z + CHUNK_SIZE * y)] = this.getBlock(chunkX * CHUNK_SIZE + x, y, chunkZ * CHUNK_SIZE + z)
        }
      }
    }
    return blocks
  }

  override getStructuresForChunk() { return [] }
  override getNpcSpawnsForChunk() { return [] }
  override getLootAt() { return undefined }

  override clearCaches() {
    super.clearCaches()
    this.heights.clear()
    this.trees.clear()
    this.berries.clear()
  }

  private getLegacyBiome(x: number, z: number): BiomeId {
    const westToEast = Math.max(0, Math.min(1, (x + 32) / 63))
    const regionalNoise = this.legacyNoise.fbm2D(x * 0.026 + 180, z * 0.026 - 130, 3)
    const climate = westToEast * 0.7 + regionalNoise * 0.3
    return climate < 0.38 ? 'desert' : climate > 0.62 ? 'forest' : 'plains'
  }

  private isLegacyCave(x: number, y: number, z: number, surfaceHeight: number) {
    if (y < 2 || y >= surfaceHeight) return false
    const tunnel = this.legacyNoise.value3D(x * 0.105 + 33, y * 0.15 - 18, z * 0.105 + 71)
    const detail = this.legacyNoise.value3D(x * 0.19 - 90, y * 0.21 + 44, z * 0.19 - 20)
    if (tunnel * 0.72 + detail * 0.28 > 0.73) return true
    return this.legacyNoise.value2D(x * 0.08 - 220, z * 0.08 + 190) > 0.84 && y >= surfaceHeight - 3
  }

  private getLegacyOre(x: number, y: number, z: number) {
    const roll = this.legacyNoise.hash2D(x * 37 + y * 101, z * 43 - y * 73)
    if (y <= 5 && roll > 0.987) return BlockType.CrystalOre
    if (y <= 8 && roll > 0.974) return BlockType.Silverstone
    if (y <= 12 && roll > 0.945) return BlockType.CopperOre
    return BlockType.Stone
  }

  private hasLegacyTree(x: number, z: number) {
    const key = `${x},${z}`
    const cached = this.trees.get(key)
    if (cached !== undefined) return cached
    const biome = this.getLegacyBiome(x, z)
    const candidate = this.legacyNoise.hash2D(x, z)
    let result = biome !== 'desert' && candidate >= BIOMES[biome].treeDensity
    const spacing = biome === 'forest' ? 1 : 2
    for (let dx = -spacing; result && dx <= spacing; dx += 1) {
      for (let dz = -spacing; dz <= spacing; dz += 1) {
        if ((dx !== 0 || dz !== 0) && this.legacyNoise.hash2D(x + dx, z + dz) > candidate) {
          result = false
          break
        }
      }
    }
    this.trees.set(key, result)
    return result
  }

  private hasLegacyBerryBush(x: number, z: number) {
    const key = `${x},${z}`
    const cached = this.berries.get(key)
    if (cached !== undefined) return cached
    const biome = this.getLegacyBiome(x, z)
    const result = biome !== 'desert' && !this.hasLegacyTree(x, z)
      && this.legacyNoise.hash2D(x + 891, z - 427) > (biome === 'forest' ? 0.965 : 0.982)
    this.berries.set(key, result)
    return result
  }
}
