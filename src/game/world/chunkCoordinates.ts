import { CHUNK_SIZE } from '../types'

export const chunkKey = (chunkX: number, chunkZ: number) => `${chunkX},${chunkZ}`
export const blockChunk = (coordinate: number) => Math.floor(coordinate / CHUNK_SIZE)
export const localCoordinate = (coordinate: number, chunk: number) => coordinate - chunk * CHUNK_SIZE
export const localBlockKey = (localX: number, y: number, localZ: number) => `${localX},${y},${localZ}`
export const parseChunkKey = (key: string) => {
  const [x, z] = key.split(',').map(Number)
  return { x, z }
}
