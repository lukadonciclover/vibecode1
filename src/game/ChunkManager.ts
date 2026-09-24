import * as THREE from 'three'
import { BLOCKS, blockOccludes } from '../data/blocks'
import { BlockManager } from './BlockManager'
import { ALL_BLOCKS, BlockType, CHUNK_SIZE, WORLD_HEIGHT } from './types'
import { blockChunk, chunkKey, parseChunkKey } from './world/chunkCoordinates'

const FACES = [
  { normal: [1, 0, 0], shade: 0.82, corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { normal: [-1, 0, 0], shade: 0.72, corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { normal: [0, 1, 0], shade: 1, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { normal: [0, -1, 0], shade: 0.58, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { normal: [0, 0, 1], shade: 0.9, corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { normal: [0, 0, -1], shade: 0.78, corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
] as const
const TRIANGLE_ORDER = [0, 1, 2, 0, 2, 3]

interface GeometryBucket { positions: number[]; normals: number[]; colors: number[] }
interface QueuedChunk { x: number; z: number; distance: number }
export interface ChunkStreamingSettings { renderDistance: number; loadDistance: number; unloadDistance: number }
export interface ChunkMetrics { loaded: number; rendered: number; queued: number; lastGenerationMs: number; triangles: number }

export class ChunkManager {
  readonly group = new THREE.Group()
  private readonly meshes = new Map<string, THREE.Mesh>()
  private readonly materials: THREE.MeshLambertMaterial[]
  private readonly materialIndex = new Map<BlockType, number>()
  private queue: QueuedChunk[] = []
  private queuedKeys = new Set<string>()
  private centerX = Number.NaN
  private centerZ = Number.NaN
  private lastGenerationMs = 0
  private triangleCount = 0

  constructor(
    private readonly blocks: BlockManager,
    private settings: ChunkStreamingSettings,
    private readonly onChunkLoaded?: (chunkX: number, chunkZ: number) => void,
  ) {
    this.group.name = 'Streamed voxel chunks'
    this.materials = ALL_BLOCKS.map((type, index) => {
      this.materialIndex.set(type, index)
      const transparent = !BLOCKS[type].occludes
      return new THREE.MeshLambertMaterial({
        color: BLOCKS[type].color,
        vertexColors: true,
        transparent,
        opacity: type === BlockType.Leaves ? 0.94 : transparent ? 0.88 : 1,
        alphaTest: transparent ? 0.05 : 0,
      })
    })
  }

  prime(worldX: number, worldZ: number) {
    this.centerX = blockChunk(worldX)
    this.centerZ = blockChunk(worldZ)
    this.blocks.loadChunk(this.centerX, this.centerZ)
    this.rebuildChunk(this.centerX, this.centerZ)
    this.onChunkLoaded?.(this.centerX, this.centerZ)
    this.reconcile()
  }

  update(worldX: number, worldZ: number, budgetMs = 4) {
    const nextX = blockChunk(worldX)
    const nextZ = blockChunk(worldZ)
    if (nextX !== this.centerX || nextZ !== this.centerZ) {
      this.centerX = nextX
      this.centerZ = nextZ
      this.reconcile()
    }
    const started = performance.now()
    let processed = 0
    while (this.queue.length > 0 && (processed === 0 || performance.now() - started < budgetMs)) {
      const queued = this.queue.shift()!
      const key = chunkKey(queued.x, queued.z)
      this.queuedKeys.delete(key)
      if (this.distanceFromCenter(queued.x, queued.z) > this.settings.loadDistance) continue
      const generatedAt = performance.now()
      this.blocks.loadChunk(queued.x, queued.z)
      if (this.distanceFromCenter(queued.x, queued.z) <= this.settings.renderDistance) this.rebuildChunk(queued.x, queued.z)
      this.lastGenerationMs = performance.now() - generatedAt
      this.onChunkLoaded?.(queued.x, queued.z)
      processed += 1
      if (processed >= 1) break
    }
  }

  setRenderDistance(renderDistance: number) {
    const render = Math.max(2, Math.min(8, Math.floor(renderDistance)))
    this.settings = { renderDistance: render, loadDistance: render + 1, unloadDistance: render + 2 }
    this.reconcile()
  }

  refreshAt(x: number, z: number) {
    const chunkX = blockChunk(x)
    const chunkZ = blockChunk(z)
    this.rebuildIfRendered(chunkX, chunkZ)
    const localX = x - chunkX * CHUNK_SIZE
    const localZ = z - chunkZ * CHUNK_SIZE
    if (localX === 0) this.rebuildIfRendered(chunkX - 1, chunkZ)
    if (localX === CHUNK_SIZE - 1) this.rebuildIfRendered(chunkX + 1, chunkZ)
    if (localZ === 0) this.rebuildIfRendered(chunkX, chunkZ - 1)
    if (localZ === CHUNK_SIZE - 1) this.rebuildIfRendered(chunkX, chunkZ + 1)
  }

  get metrics(): ChunkMetrics {
    return { loaded: this.blocks.loadedChunkCount, rendered: this.meshes.size, queued: this.queue.length, lastGenerationMs: this.lastGenerationMs, triangles: this.triangleCount }
  }

  dispose() {
    for (const mesh of this.meshes.values()) mesh.geometry.dispose()
    for (const material of this.materials) material.dispose()
    this.meshes.clear()
    this.queue = []
    this.queuedKeys.clear()
  }

  private reconcile() {
    this.queue = this.queue
      .map((entry) => ({ ...entry, distance: this.distanceFromCenter(entry.x, entry.z) }))
      .filter((entry) => entry.distance <= this.settings.loadDistance)
    this.queuedKeys = new Set(this.queue.map((entry) => chunkKey(entry.x, entry.z)))
    const wanted: QueuedChunk[] = []
    for (let x = this.centerX - this.settings.loadDistance; x <= this.centerX + this.settings.loadDistance; x += 1) {
      for (let z = this.centerZ - this.settings.loadDistance; z <= this.centerZ + this.settings.loadDistance; z += 1) {
        const distance = this.distanceFromCenter(x, z)
        if (distance > this.settings.loadDistance) continue
        const key = chunkKey(x, z)
        const needsMesh = distance <= this.settings.renderDistance && !this.meshes.has(key)
        if ((!this.blocks.hasChunk(x, z) || needsMesh) && !this.queuedKeys.has(key)) wanted.push({ x, z, distance })
      }
    }
    wanted.sort((a, b) => a.distance - b.distance)
    for (const entry of wanted) {
      this.queue.push(entry)
      this.queuedKeys.add(chunkKey(entry.x, entry.z))
    }
    this.queue.sort((a, b) => a.distance - b.distance)

    for (const [key, mesh] of [...this.meshes]) {
      const { x, z } = parseChunkKey(key)
      if (this.distanceFromCenter(x, z) <= this.settings.renderDistance) continue
      this.group.remove(mesh)
      this.triangleCount -= mesh.geometry.getAttribute('position').count / 3
      mesh.geometry.dispose()
      this.meshes.delete(key)
    }
    for (const key of this.blocks.residentChunkKeys) {
      const { x, z } = parseChunkKey(key)
      if (this.distanceFromCenter(x, z) > this.settings.unloadDistance) this.blocks.unloadChunk(x, z)
    }
  }

  private rebuildIfRendered(chunkX: number, chunkZ: number) {
    if (this.meshes.has(chunkKey(chunkX, chunkZ))) this.rebuildChunk(chunkX, chunkZ)
  }

  private rebuildChunk(chunkX: number, chunkZ: number) {
    const key = chunkKey(chunkX, chunkZ)
    const existing = this.meshes.get(key)
    if (existing) {
      this.group.remove(existing)
      this.triangleCount -= existing.geometry.getAttribute('position').count / 3
      existing.geometry.dispose()
    }
    const buckets: GeometryBucket[] = ALL_BLOCKS.map(() => ({ positions: [], normals: [], colors: [] }))
    const startX = chunkX * CHUNK_SIZE
    const startZ = chunkZ * CHUNK_SIZE
    for (let y = 0; y < WORLD_HEIGHT; y += 1) {
      for (let localZ = 0; localZ < CHUNK_SIZE; localZ += 1) {
        for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
          const worldX = startX + localX
          const worldZ = startZ + localZ
          const type = this.blocks.getBlock(worldX, y, worldZ)
          if (type === BlockType.Air) continue
          const material = this.materialIndex.get(type)
          if (material === undefined) continue
          const bucket = buckets[material]
          const skyShade = this.blocks.hasSkyAccess(worldX, y + 1, worldZ) ? 1 : 0.48
          for (const face of FACES) {
            const [nx, ny, nz] = face.normal
            if (blockOccludes(this.blocks.getBlock(worldX + nx, y + ny, worldZ + nz))) continue
            for (const index of TRIANGLE_ORDER) {
              const corner = face.corners[index]
              bucket.positions.push(localX + corner[0], y + corner[1], localZ + corner[2])
              bucket.normals.push(nx, ny, nz)
              const shade = face.shade * skyShade
              bucket.colors.push(shade, shade, shade)
            }
          }
        }
      }
    }
    const totalValues = buckets.reduce((total, bucket) => total + bucket.positions.length, 0)
    const positions = new Float32Array(totalValues)
    const normals = new Float32Array(totalValues)
    const colors = new Float32Array(totalValues)
    let valueOffset = 0
    const groups: Array<{ start: number; count: number; materialIndex: number }> = []
    buckets.forEach((bucket, materialIndex) => {
      positions.set(bucket.positions, valueOffset)
      normals.set(bucket.normals, valueOffset)
      colors.set(bucket.colors, valueOffset)
      const vertexCount = bucket.positions.length / 3
      if (vertexCount > 0) groups.push({ start: valueOffset / 3, count: vertexCount, materialIndex })
      valueOffset += bucket.positions.length
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    for (const group of groups) geometry.addGroup(group.start, group.count, group.materialIndex)
    geometry.computeBoundingSphere()
    const mesh = new THREE.Mesh(geometry, this.materials)
    mesh.name = `Chunk ${key}`
    mesh.position.set(startX, 0, startZ)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.meshes.set(key, mesh)
    this.group.add(mesh)
    this.triangleCount += geometry.getAttribute('position').count / 3
  }

  private distanceFromCenter(x: number, z: number) {
    return Math.max(Math.abs(x - this.centerX), Math.abs(z - this.centerZ))
  }
}
