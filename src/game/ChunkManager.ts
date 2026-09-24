import * as THREE from 'three'
import { ALL_BLOCKS } from './types'
import { BLOCKS, blockOccludes } from '../data/blocks'
import { BlockManager } from './BlockManager'
import {
  BlockType,
  CHUNK_SIZE,
  WORLD_CHUNK_MAX,
  WORLD_CHUNK_MIN,
  WORLD_HEIGHT,
} from './types'

const FACES = [
  { normal: [1, 0, 0], shade: 0.82, corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { normal: [-1, 0, 0], shade: 0.72, corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { normal: [0, 1, 0], shade: 1, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { normal: [0, -1, 0], shade: 0.58, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { normal: [0, 0, 1], shade: 0.9, corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { normal: [0, 0, -1], shade: 0.78, corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
] as const

const TRIANGLE_ORDER = [0, 1, 2, 0, 2, 3]

interface GeometryBucket {
  positions: number[]
  normals: number[]
  colors: number[]
}

export class ChunkManager {
  readonly group = new THREE.Group()
  private readonly meshes = new Map<string, THREE.Mesh>()
  private readonly materials: THREE.MeshLambertMaterial[]
  private readonly materialIndex = new Map<BlockType, number>()

  constructor(private readonly blocks: BlockManager) {
    this.group.name = 'Voxel chunks'
    this.materials = ALL_BLOCKS.map((type, index) => {
      this.materialIndex.set(type, index)
      return new THREE.MeshLambertMaterial({
      color: BLOCKS[type].color,
      vertexColors: true,
      transparent: type === BlockType.Leaves || type === BlockType.BerryBush,
      opacity: type === BlockType.Leaves ? 0.94 : type === BlockType.BerryBush ? 0.88 : 1,
      alphaTest: type === BlockType.Leaves || type === BlockType.BerryBush ? 0.05 : 0,
    })
    })
  }

  buildWorld() {
    for (let chunkX = WORLD_CHUNK_MIN; chunkX <= WORLD_CHUNK_MAX; chunkX += 1) {
      for (let chunkZ = WORLD_CHUNK_MIN; chunkZ <= WORLD_CHUNK_MAX; chunkZ += 1) {
        this.rebuildChunk(chunkX, chunkZ)
      }
    }
  }

  refreshAt(x: number, z: number) {
    const chunkX = Math.floor(x / CHUNK_SIZE)
    const chunkZ = Math.floor(z / CHUNK_SIZE)
    this.rebuildChunk(chunkX, chunkZ)
    const localX = x - chunkX * CHUNK_SIZE
    const localZ = z - chunkZ * CHUNK_SIZE
    if (localX === 0) this.rebuildChunk(chunkX - 1, chunkZ)
    if (localX === CHUNK_SIZE - 1) this.rebuildChunk(chunkX + 1, chunkZ)
    if (localZ === 0) this.rebuildChunk(chunkX, chunkZ - 1)
    if (localZ === CHUNK_SIZE - 1) this.rebuildChunk(chunkX, chunkZ + 1)
  }

  dispose() {
    for (const mesh of this.meshes.values()) mesh.geometry.dispose()
    for (const material of this.materials) material.dispose()
    this.meshes.clear()
  }

  private rebuildChunk(chunkX: number, chunkZ: number) {
    if (chunkX < WORLD_CHUNK_MIN || chunkX > WORLD_CHUNK_MAX || chunkZ < WORLD_CHUNK_MIN || chunkZ > WORLD_CHUNK_MAX) return
    const key = `${chunkX},${chunkZ}`
    const existing = this.meshes.get(key)
    if (existing) {
      this.group.remove(existing)
      existing.geometry.dispose()
    }

    const buckets: GeometryBucket[] = ALL_BLOCKS.map(() => ({ positions: [], normals: [], colors: [] }))
    const startX = chunkX * CHUNK_SIZE
    const startZ = chunkZ * CHUNK_SIZE

    for (let y = 0; y < WORLD_HEIGHT; y += 1) {
      for (let z = startZ; z < startZ + CHUNK_SIZE; z += 1) {
        for (let x = startX; x < startX + CHUNK_SIZE; x += 1) {
          const type = this.blocks.getBlock(x, y, z)
          if (type === BlockType.Air) continue
          const index = this.materialIndex.get(type)
          if (index === undefined) continue
          const bucket = buckets[index]
          const skyShade = this.blocks.hasSkyAccess(x, y + 1, z) ? 1 : 0.52

          for (const face of FACES) {
            const [nx, ny, nz] = face.normal
            if (blockOccludes(this.blocks.getBlock(x + nx, y + ny, z + nz))) continue
            for (const index of TRIANGLE_ORDER) {
              const corner = face.corners[index]
              bucket.positions.push(x + corner[0], y + corner[1], z + corner[2])
              bucket.normals.push(nx, ny, nz)
              const shade = face.shade * skyShade
              bucket.colors.push(shade, shade, shade)
            }
          }
        }
      }
    }

    const positions: number[] = []
    const normals: number[] = []
    const colors: number[] = []
    const groups: Array<{ start: number; count: number; materialIndex: number }> = []
    let vertexStart = 0
    buckets.forEach((bucket, materialIndex) => {
      const vertexCount = bucket.positions.length / 3
      if (vertexCount > 0) groups.push({ start: vertexStart, count: vertexCount, materialIndex })
      positions.push(...bucket.positions)
      normals.push(...bucket.normals)
      colors.push(...bucket.colors)
      vertexStart += vertexCount
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    for (const group of groups) geometry.addGroup(group.start, group.count, group.materialIndex)
    geometry.computeBoundingSphere()

    const mesh = new THREE.Mesh(geometry, this.materials)
    mesh.name = `Chunk ${key}`
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.meshes.set(key, mesh)
    this.group.add(mesh)
  }
}
