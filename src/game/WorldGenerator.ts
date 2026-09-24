import { BIOMES } from '../data/biomes'
import { BiomeGenerator } from './BiomeGenerator'
import { CaveGenerator } from './CaveGenerator'
import { OreGenerator } from './OreGenerator'
import { SeededNoise } from './SeededNoise'
import { BlockType, CHUNK_SIZE, WORLD_HEIGHT } from './types'
import { StructureGenerator } from './world'
import type { LootSpawnPoint, NpcSpawnPoint, StructurePlan } from './world'

const CACHE_LIMIT = 8192

export class WorldGenerator {
  private readonly noise: SeededNoise
  readonly biomes: BiomeGenerator
  readonly structures: StructureGenerator
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
    this.structures = new StructureGenerator({
      seed,
      terrainHeight: (x, z) => this.getTerrainHeight(x, z),
      biomeAt: (x, z) => this.biomes.getBiome(x, z),
    })
  }

  getTerrainHeight(x: number, z: number) {
    const key = `${x},${z}`
    const cached = this.heightCache.get(key)
    if (cached !== undefined) return cached
    const continental = this.noise.fbm2D(x * 0.009, z * 0.009, 4)
    const detail = this.noise.fbm2D(x * 0.045 + 40, z * 0.045 - 25, 3)
    const strength = this.biomes.hillStrength(x, z)
    const height = Math.max(5, Math.min(WORLD_HEIGHT - 9, Math.floor(8 + continental * 10 * strength + detail * 3 * strength)))
    this.cache(this.heightCache, key, height)
    return height
  }

  getBiome(x: number, z: number) {
    return this.biomes.getBiome(x, z)
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= WORLD_HEIGHT) return BlockType.Air
    if (this.getLootAt(x, y, z)) return BlockType.Chest
    const structureBlock = this.structures.getBlock(x, y, z)
    return structureBlock ?? this.getNaturalBlock(x, y, z)
  }

  generateChunk(chunkX: number, chunkZ: number) {
    const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
    for (let y = 0; y < WORLD_HEIGHT; y += 1) {
      for (let z = 0; z < CHUNK_SIZE; z += 1) {
        for (let x = 0; x < CHUNK_SIZE; x += 1) {
          const worldX = chunkX * CHUNK_SIZE + x
          const worldZ = chunkZ * CHUNK_SIZE + z
          blocks[x + CHUNK_SIZE * (z + CHUNK_SIZE * y)] = this.getNaturalBlock(worldX, y, worldZ)
        }
      }
    }
    for (const placement of this.structures.getPlacementsForChunk(chunkX, chunkZ, CHUNK_SIZE)) {
      if (placement.y < 0 || placement.y >= WORLD_HEIGHT) continue
      const localX = placement.x - chunkX * CHUNK_SIZE
      const localZ = placement.z - chunkZ * CHUNK_SIZE
      blocks[localX + CHUNK_SIZE * (localZ + CHUNK_SIZE * placement.y)] = placement.block
    }
    for (const plan of this.getStructuresForChunk(chunkX, chunkZ)) {
      for (const loot of plan.loot) {
        if (Math.floor(loot.x / CHUNK_SIZE) !== chunkX || Math.floor(loot.z / CHUNK_SIZE) !== chunkZ || loot.y < 0 || loot.y >= WORLD_HEIGHT) continue
        const localX = loot.x - chunkX * CHUNK_SIZE
        const localZ = loot.z - chunkZ * CHUNK_SIZE
        blocks[localX + CHUNK_SIZE * (localZ + CHUNK_SIZE * loot.y)] = BlockType.Chest
      }
    }
    return blocks
  }

  getStructuresForChunk(chunkX: number, chunkZ: number): StructurePlan[] {
    return this.structures.getStructuresForChunk(chunkX, chunkZ, CHUNK_SIZE)
  }

  getNpcSpawnsForChunk(chunkX: number, chunkZ: number): NpcSpawnPoint[] {
    return this.getStructuresForChunk(chunkX, chunkZ).flatMap((plan) => plan.npcSpawns)
  }

  getLootAt(x: number, y: number, z: number): LootSpawnPoint | undefined {
    return this.getStructuresForChunk(Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE))
      .flatMap((plan) => plan.loot)
      .find((loot) => loot.x === x && loot.y === y && loot.z === z)
  }

  clearCaches() {
    this.heightCache.clear()
    this.treeCache.clear()
    this.berryCache.clear()
  }

  private getNaturalBlock(x: number, y: number, z: number): BlockType {
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

  private hasTree(x: number, z: number) {
    const key = `${x},${z}`
    const cached = this.treeCache.get(key)
    if (cached !== undefined) return cached
    const biome = this.biomes.getBiome(x, z)
    const candidate = this.noise.hash2D(x, z)
    let result = biome !== 'desert' && candidate >= BIOMES[biome].treeDensity
    const spacing = biome === 'forest' ? 1 : 2
    for (let dx = -spacing; result && dx <= spacing; dx += 1) {
      for (let dz = -spacing; dz <= spacing; dz += 1) {
        if ((dx !== 0 || dz !== 0) && this.noise.hash2D(x + dx, z + dz) > candidate) { result = false; break }
      }
    }
    this.cache(this.treeCache, key, result)
    return result
  }

  private hasBerryBush(x: number, z: number) {
    const key = `${x},${z}`
    const cached = this.berryCache.get(key)
    if (cached !== undefined) return cached
    const biome = this.biomes.getBiome(x, z)
    const result = biome !== 'desert' && !this.hasTree(x, z) && this.noise.hash2D(x + 891, z - 427) > (biome === 'forest' ? 0.965 : 0.982)
    this.cache(this.berryCache, key, result)
    return result
  }

  private cache<T>(map: Map<string, T>, key: string, value: T) {
    if (map.size >= CACHE_LIMIT) map.delete(map.keys().next().value as string)
    map.set(key, value)
  }
}
