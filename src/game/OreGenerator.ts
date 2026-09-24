import { BlockType } from './types'
import { SeededNoise } from './SeededNoise'

export class OreGenerator {
  constructor(private readonly noise: SeededNoise) {}

  getOre(x: number, y: number, z: number) {
    const roll = this.noise.hash2D(x * 37 + y * 101, z * 43 - y * 73)
    if (y <= 5 && roll > 0.987) return BlockType.CrystalOre
    if (y <= 8 && roll > 0.974) return BlockType.Silverstone
    if (y <= 12 && roll > 0.945) return BlockType.CopperOre
    return BlockType.Stone
  }
}
