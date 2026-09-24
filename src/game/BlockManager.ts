import { WorldGenerator } from './WorldGenerator'
import {
  BlockType,
  type BlockChanges,
  CHUNK_SIZE,
  WORLD_CHUNK_MAX,
  WORLD_CHUNK_MIN,
  WORLD_HEIGHT,
} from './types'

export class BlockManager {
  private readonly chunks = new Map<string, Uint8Array>()
  private readonly changes: BlockChanges

  constructor(
    private readonly generator: WorldGenerator,
    initialChanges: BlockChanges = {},
  ) {
    this.changes = { ...initialChanges }
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (!this.isInsideWorld(x, y, z)) return BlockType.Air
    const change = this.changes[this.blockKey(x, y, z)]
    if (change !== undefined) return change

    const chunkX = Math.floor(x / CHUNK_SIZE)
    const chunkZ = Math.floor(z / CHUNK_SIZE)
    const chunk = this.getChunk(chunkX, chunkZ)
    const localX = x - chunkX * CHUNK_SIZE
    const localZ = z - chunkZ * CHUNK_SIZE
    return chunk[localX + CHUNK_SIZE * (localZ + CHUNK_SIZE * y)] as BlockType
  }

  setBlock(x: number, y: number, z: number, type: BlockType) {
    if (!this.isInsideWorld(x, y, z)) return false
    const key = this.blockKey(x, y, z)
    const generated = this.generator.getBlock(x, y, z)
    if (type === generated) delete this.changes[key]
    else this.changes[key] = type
    return true
  }

  getChanges(): BlockChanges {
    return { ...this.changes }
  }

  findSpawn() {
    for (let radius = 0; radius < 14; radius += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        for (let z = -radius; z <= radius; z += 1) {
          if (Math.abs(x) !== radius && Math.abs(z) !== radius) continue
          for (let y = WORLD_HEIGHT - 3; y >= 1; y -= 1) {
            const ground = this.getBlock(x, y, z)
            const clear = this.getBlock(x, y + 1, z) === BlockType.Air && this.getBlock(x, y + 2, z) === BlockType.Air
            if ((ground === BlockType.Grass || ground === BlockType.Sand) && clear) {
              return { x: x + 0.5, y: y + 1.01, z: z + 0.5 }
            }
          }
        }
      }
    }
    return { x: 0.5, y: WORLD_HEIGHT - 1, z: 0.5 }
  }

  private getChunk(chunkX: number, chunkZ: number) {
    const key = `${chunkX},${chunkZ}`
    let chunk = this.chunks.get(key)
    if (!chunk) {
      chunk = this.generator.generateChunk(chunkX, chunkZ)
      this.chunks.set(key, chunk)
    }
    return chunk
  }

  private isInsideWorld(x: number, y: number, z: number) {
    const min = WORLD_CHUNK_MIN * CHUNK_SIZE
    const max = (WORLD_CHUNK_MAX + 1) * CHUNK_SIZE
    return x >= min && x < max && z >= min && z < max && y >= 0 && y < WORLD_HEIGHT
  }

  private blockKey(x: number, y: number, z: number) {
    return `${x},${y},${z}`
  }
}
