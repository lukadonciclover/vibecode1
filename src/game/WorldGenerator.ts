import { BIOMES } from '../data/biomes'
import { BiomeGenerator } from './BiomeGenerator'
import { CaveGenerator } from './CaveGenerator'
import { OreGenerator } from './OreGenerator'
import { SeededNoise } from './SeededNoise'
import { BlockType, CHUNK_SIZE, WORLD_HEIGHT } from './types'

export class WorldGenerator {
  private readonly noise: SeededNoise
  readonly biomes: BiomeGenerator
  private readonly caves: CaveGenerator
  private readonly ores: OreGenerator
  private readonly heightCache = new Map<string, number>()
  private readonly treeCache = new Map<string, boolean>()
  private readonly berryCache = new Map<string, boolean>()

  constructor(public readonly seed: string) {
    this.noise = new SeededNoise(seed)
    this.biomes = new BiomeGenerator(this.noise)
    this.caves = new CaveGenerator(this.noise)
    this.ores = new OreGenerator(this.noise)
  }

  getTerrainHeight(x: number, z: number) {
    const key = `${x},${z}`
    const cached = this.heightCache.get(key)
    if (cached !== undefined) return cached
    const broad = this.noise.fbm2D(x * 0.025, z * 0.025, 4)
    const detail = this.noise.fbm2D(x * 0.075 + 40, z * 0.075 - 25, 3)
    const strength = this.biomes.hillStrength(x, z)
    const height = Math.max(3, Math.min(15, Math.floor(6 + broad * 5 * strength + detail * 2 * strength)))
    this.heightCache.set(key, height)
    return height
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= WORLD_HEIGHT) return BlockType.Air
    const height = this.getTerrainHeight(x, z)
    const biome = this.biomes.getBiome(x, z)

    if (y <= height) {
      if (this.caves.isCave(x, y, z, height)) return BlockType.Air
      if (y === height) return biome === 'desert' ? BlockType.Sand : BlockType.Grass
      if (y >= height - 2) return biome === 'desert' ? BlockType.Sand : BlockType.Dirt
      return this.ores.getOre(x, y, z)
    }

    if (y === height + 1 && this.hasBerryBush(x, z)) return BlockType.BerryBush
    for (let tx = x - 2; tx <= x + 2; tx += 1) {
      for (let tz = z - 2; tz <= z + 2; tz += 1) {
        if (!this.hasTree(tx, tz)) continue
        const base = this.getTerrainHeight(tx, tz) + 1
        if (x === tx && z === tz && y >= base && y <= base + 3) return BlockType.Wood
        const dx = Math.abs(x - tx)
        const dz = Math.abs(z - tz)
        const dy = y - (base + 3)
        if (dy >= -1 && dy <= 2 && dx <= 2 && dz <= 2 && dx + dz + Math.max(dy, 0) < 4) return BlockType.Leaves
      }
    }
    return BlockType.Air
  }

  generateChunk(chunkX: number, chunkZ: number) {
    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
    for (let y = 0; y < WORLD_HEIGHT; y += 1) {
      for (let z = 0; z < CHUNK_SIZE; z += 1) {
        for (let x = 0; x < CHUNK_SIZE; x += 1) {
          const worldX = chunkX * CHUNK_SIZE + x
          const worldZ = chunkZ * CHUNK_SIZE + z
          blocks[x + CHUNK_SIZE * (z + CHUNK_SIZE * y)] = this.getBlock(worldX, y, worldZ)
        }
      }
    }
    return blocks
  }

  private hasTree(x: number, z: number) {
    const key = `${x},${z}`
    const cached = this.treeCache.get(key)
    if (cached !== undefined) return cached
    const biome = this.biomes.getBiome(x, z)
    if (biome === 'desert') {
      this.treeCache.set(key, false)
      return false
    }
    const candidate = this.noise.hash2D(x, z)
    if (candidate < BIOMES[biome].treeDensity) {
      this.treeCache.set(key, false)
      return false
    }
    const spacing = biome === 'forest' ? 1 : 2
    for (let dx = -spacing; dx <= spacing; dx += 1) {
      for (let dz = -spacing; dz <= spacing; dz += 1) {
        if ((dx !== 0 || dz !== 0) && this.noise.hash2D(x + dx, z + dz) > candidate) {
          this.treeCache.set(key, false)
          return false
        }
      }
    }
    this.treeCache.set(key, true)
    return true
  }

  private hasBerryBush(x: number, z: number) {
    const key = `${x},${z}`
    const cached = this.berryCache.get(key)
    if (cached !== undefined) return cached
    const biome = this.biomes.getBiome(x, z)
    const hasBerry = biome !== 'desert' && !this.hasTree(x, z) && this.noise.hash2D(x + 891, z - 427) > (biome === 'forest' ? 0.965 : 0.982)
    this.berryCache.set(key, hasBerry)
    return hasBerry
  }
}
