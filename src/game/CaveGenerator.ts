import { SeededNoise } from './SeededNoise'

export class CaveGenerator {
  constructor(private readonly noise: SeededNoise) {}

  isCave(x: number, y: number, z: number, surfaceHeight: number) {
    if (y < 2 || y >= surfaceHeight) return false
    const tunnel = this.noise.value3D(x * 0.09 + 33, y * 0.13 - 18, z * 0.09 + 71)
    const detail = this.noise.value3D(x * 0.19 - 90, y * 0.21 + 44, z * 0.19 - 20)
    if (tunnel * 0.72 + detail * 0.28 > 0.735) return true
    const cavern = this.noise.value3D(x * 0.035 + 620, y * 0.065 - 90, z * 0.035 - 440)
    if (y < surfaceHeight - 3 && cavern > 0.79) return true

    const roomCellX = Math.floor(x / 20)
    const roomCellY = Math.floor(y / 9)
    const roomCellZ = Math.floor(z / 20)
    const roomChance = this.noise.hash2D(roomCellX * 79 + roomCellY * 17, roomCellZ * 83 - roomCellY * 13)
    if (roomChance > 0.94) {
      const centerX = roomCellX * 20 + 10
      const centerY = roomCellY * 9 + 4
      const centerZ = roomCellZ * 20 + 10
      const distance = ((x - centerX) / 5) ** 2 + ((y - centerY) / 3) ** 2 + ((z - centerZ) / 5) ** 2
      if (distance < 1) return true
    }

    const entrance = this.noise.value2D(x * 0.075 - 220, z * 0.075 + 190)
    return entrance > 0.86 && y >= surfaceHeight - 3
  }
}
