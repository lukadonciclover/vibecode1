import { BIOMES, type BiomeId } from '../data/biomes'
import { SeededNoise } from './SeededNoise'

export class BiomeGenerator {
  private readonly cache = new Map<string, BiomeId>()

  constructor(private readonly noise: SeededNoise) {}

  getBiome(x: number, z: number): BiomeId {
    const key = `${x},${z}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const westToEast = Math.max(0, Math.min(1, (x + 32) / 63))
    const regionalNoise = this.noise.fbm2D(x * 0.026 + 180, z * 0.026 - 130, 3)
    const climate = westToEast * 0.7 + regionalNoise * 0.3
    const biome = climate < 0.38 ? 'desert' : climate > 0.62 ? 'forest' : 'plains'
    this.cache.set(key, biome)
    return biome
  }

  hillStrength(x: number, z: number) {
    return BIOMES[this.getBiome(x, z)].hillStrength
  }
}
