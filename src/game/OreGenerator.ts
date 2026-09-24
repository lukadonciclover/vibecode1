import { BlockType } from './types'
import { SeededNoise } from './SeededNoise'

export class OreGenerator {
  constructor(private readonly noise: SeededNoise) {}

  getOre(x: number, y: number, z: number) {
    const cluster = (salt: number, scale: number) => this.noise.value3D(x * scale + salt, y * scale * 1.25 - salt, z * scale + salt * 0.5)
    if (y <= 7 && cluster(310, 0.22) > 0.78) return BlockType.CrystalOre
    if (y <= 13 && cluster(190, 0.19) > 0.75) return BlockType.Silverstone
    if (y <= 20 && cluster(80, 0.17) > 0.71) return BlockType.CopperOre
    if (y <= 24 && cluster(30, 0.15) > 0.69) return BlockType.CoalOre
    return BlockType.Stone
  }
}
