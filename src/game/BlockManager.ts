import { isSolidBlock } from '../data/blocks'
import { WorldGenerator } from './WorldGenerator'
import { BlockType, CHUNK_SIZE, type ModifiedChunks, WORLD_HEIGHT } from './types'
import { blockChunk, chunkKey, localBlockKey, localCoordinate } from './world/chunkCoordinates'

export class BlockManager {
  private readonly residentChunks = new Map<string, Uint8Array>()
  private readonly modifiedChunks: ModifiedChunks
  private readonly dirtyChunks = new Set<string>()

  constructor(
    private readonly generator: WorldGenerator,
    initialChanges: ModifiedChunks = {},
  ) {
    this.modifiedChunks = Object.fromEntries(Object.entries(initialChanges).map(([key, changes]) => [key, { ...changes }]))
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (!this.validCoordinate(x, y, z)) return BlockType.Air
    const chunkX = blockChunk(x)
    const chunkZ = blockChunk(z)
    const localX = localCoordinate(x, chunkX)
    const localZ = localCoordinate(z, chunkZ)
    const key = chunkKey(chunkX, chunkZ)
    const change = this.modifiedChunks[key]?.[localBlockKey(localX, y, localZ)]
    if (change !== undefined) return change
    const chunk = this.residentChunks.get(key)
    if (chunk) return chunk[localX + CHUNK_SIZE * (localZ + CHUNK_SIZE * y)] as BlockType
    return this.generator.getBlock(x, y, z)
  }

  setBlock(x: number, y: number, z: number, type: BlockType) {
    if (!this.validCoordinate(x, y, z)) return false
    const chunkX = blockChunk(x)
    const chunkZ = blockChunk(z)
    const key = chunkKey(chunkX, chunkZ)
    const localKey = localBlockKey(localCoordinate(x, chunkX), y, localCoordinate(z, chunkZ))
    const generated = this.generator.getBlock(x, y, z)
    const changes = this.modifiedChunks[key] ??= {}
    if (type === generated) delete changes[localKey]
    else changes[localKey] = type
    if (Object.keys(changes).length === 0) delete this.modifiedChunks[key]
    this.dirtyChunks.add(key)
    return true
  }

  loadChunk(chunkX: number, chunkZ: number) {
    const key = chunkKey(chunkX, chunkZ)
    let chunk = this.residentChunks.get(key)
    if (!chunk) {
      chunk = this.generator.generateChunk(chunkX, chunkZ)
      this.residentChunks.set(key, chunk)
    }
    return chunk
  }

  unloadChunk(chunkX: number, chunkZ: number) {
    this.residentChunks.delete(chunkKey(chunkX, chunkZ))
  }

  hasChunk(chunkX: number, chunkZ: number) {
    return this.residentChunks.has(chunkKey(chunkX, chunkZ))
  }

  get loadedChunkCount() {
    return this.residentChunks.size
  }

  get residentChunkKeys() {
    return [...this.residentChunks.keys()]
  }

  getModifiedChunks(): ModifiedChunks {
    return Object.fromEntries(Object.entries(this.modifiedChunks).map(([key, changes]) => [key, { ...changes }]))
  }

  takeDirtyChunks() {
    const dirty = [...this.dirtyChunks]
    this.dirtyChunks.clear()
    return dirty
  }

  findSpawn(centerX = 0, centerZ = 0) {
    for (let radius = 0; radius < 20; radius += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        for (let offsetZ = -radius; offsetZ <= radius; offsetZ += 1) {
          if (Math.abs(offsetX) !== radius && Math.abs(offsetZ) !== radius) continue
          const x = centerX + offsetX
          const z = centerZ + offsetZ
          for (let y = WORLD_HEIGHT - 3; y >= 1; y -= 1) {
            const ground = this.getBlock(x, y, z)
            const clear = !isSolidBlock(this.getBlock(x, y + 1, z)) && !isSolidBlock(this.getBlock(x, y + 2, z))
            if ((ground === BlockType.Grass || ground === BlockType.Sand || ground === BlockType.Path) && clear) {
              return { x: x + 0.5, y: y + 1.01, z: z + 0.5 }
            }
          }
        }
      }
    }
    return { x: centerX + 0.5, y: WORLD_HEIGHT - 1, z: centerZ + 0.5 }
  }

  findSurfaceY(x: number, z: number) {
    for (let y = WORLD_HEIGHT - 2; y >= 0; y -= 1) {
      if (isSolidBlock(this.getBlock(x, y, z)) && !isSolidBlock(this.getBlock(x, y + 1, z))) return y + 1
    }
    return 1
  }

  hasSkyAccess(x: number, y: number, z: number) {
    for (let checkY = y; checkY < WORLD_HEIGHT; checkY += 1) {
      if (isSolidBlock(this.getBlock(x, checkY, z))) return false
    }
    return true
  }

  private validCoordinate(x: number, y: number, z: number) {
    return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && y >= 0 && y < WORLD_HEIGHT
  }
}
