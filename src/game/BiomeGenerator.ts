import { BIOMES, type BiomeId } from '../data/biomes'
import { SeededNoise } from './SeededNoise'

export class BiomeGenerator {
  constructor(private readonly noise: SeededNoise) {}

  getBiome(x: number, z: number): BiomeId {
    const temperature = this.noise.fbm2D(x * 0.004 + 180, z * 0.004 - 130, 4)
    const moisture = this.noise.fbm2D(x * 0.006 - 410, z * 0.006 + 270, 3)
    if (temperature > 0.62 && moisture < 0.5) return 'desert'
    if (moisture > 0.59) return 'forest'
    return 'plains'
  }

  hillStrength(x: number, z: number) {
    return BIOMES[this.getBiome(x, z)].hillStrength
  }
}
