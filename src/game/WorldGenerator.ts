import { BlockType, CHUNK_SIZE, WORLD_HEIGHT } from './types'

function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

export class WorldGenerator {
  private readonly numericSeed: number

  constructor(public readonly seed: string) {
    this.numericSeed = this.hashString(seed)
  }

  getTerrainHeight(x: number, z: number) {
    const broad = this.fbm(x * 0.025, z * 0.025, 4)
    const detail = this.fbm(x * 0.075 + 40, z * 0.075 - 25, 3)
    return Math.max(3, Math.min(15, Math.floor(6 + broad * 5 + detail * 2)))
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= WORLD_HEIGHT) return BlockType.Air

    const height = this.getTerrainHeight(x, z)
    if (y <= height) {
      const sandy = this.noise(x * 0.08 + 90, z * 0.08 - 90) > 0.66
      if (y === height) return sandy ? BlockType.Sand : BlockType.Grass
      if (y >= height - 2) return sandy ? BlockType.Sand : BlockType.Dirt
      return BlockType.Stone
    }

    for (let tx = x - 2; tx <= x + 2; tx += 1) {
      for (let tz = z - 2; tz <= z + 2; tz += 1) {
        if (!this.hasTree(tx, tz)) continue
        const base = this.getTerrainHeight(tx, tz) + 1
        if (x === tx && z === tz && y >= base && y <= base + 3) return BlockType.Wood

        const dx = Math.abs(x - tx)
        const dz = Math.abs(z - tz)
        const dy = y - (base + 3)
        const canopy = dy >= -1 && dy <= 2 && dx <= 2 && dz <= 2 && dx + dz + Math.max(dy, 0) < 4
        if (canopy) return BlockType.Leaves
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
    if (this.noise(x * 0.08 + 90, z * 0.08 - 90) > 0.66) return false
    const candidate = this.hash2D(x, z)
    if (candidate < 0.84) return false

    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dz = -2; dz <= 2; dz += 1) {
        if ((dx !== 0 || dz !== 0) && this.hash2D(x + dx, z + dz) > candidate) return false
      }
    }
    return true
  }

  private fbm(x: number, z: number, octaves: number) {
    let value = 0
    let amplitude = 0.55
    let frequency = 1
    let total = 0
    for (let octave = 0; octave < octaves; octave += 1) {
      value += this.noise(x * frequency, z * frequency) * amplitude
      total += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    return value / total
  }

  private noise(x: number, z: number) {
    const x0 = Math.floor(x)
    const z0 = Math.floor(z)
    const tx = smoothstep(x - x0)
    const tz = smoothstep(z - z0)
    const a = this.hash2D(x0, z0)
    const b = this.hash2D(x0 + 1, z0)
    const c = this.hash2D(x0, z0 + 1)
    const d = this.hash2D(x0 + 1, z0 + 1)
    const top = a + (b - a) * tx
    const bottom = c + (d - c) * tx
    return top + (bottom - top) * tz
  }

  private hash2D(x: number, z: number) {
    let value = Math.imul(x, 374761393) + Math.imul(z, 668265263) + this.numericSeed
    value = Math.imul(value ^ (value >>> 13), 1274126177)
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295
  }

  private hashString(value: string) {
    let hash = 2166136261
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
  }
}
