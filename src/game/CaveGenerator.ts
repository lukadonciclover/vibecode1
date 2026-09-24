import { SeededNoise } from './SeededNoise'

export class CaveGenerator {
  constructor(private readonly noise: SeededNoise) {}

  isCave(x: number, y: number, z: number, surfaceHeight: number) {
    if (y < 2 || y >= surfaceHeight) return false
    const tunnel = this.noise.value3D(x * 0.105 + 33, y * 0.15 - 18, z * 0.105 + 71)
    const detail = this.noise.value3D(x * 0.19 - 90, y * 0.21 + 44, z * 0.19 - 20)
    if (tunnel * 0.72 + detail * 0.28 > 0.73) return true
    const entrance = this.noise.value2D(x * 0.08 - 220, z * 0.08 + 190)
    return entrance > 0.84 && y >= surfaceHeight - 3
  }
}
