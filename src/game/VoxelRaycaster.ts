import * as THREE from 'three'
import { BlockManager } from './BlockManager'
import { BlockType } from './types'

export interface VoxelHit {
  block: THREE.Vector3
  normal: THREE.Vector3
  type: BlockType
  distance: number
}

export class VoxelRaycaster {
  constructor(private readonly blocks: BlockManager) {}

  cast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance = 7): VoxelHit | null {
    const cell = new THREE.Vector3(Math.floor(origin.x), Math.floor(origin.y), Math.floor(origin.z))
    const step = new THREE.Vector3(Math.sign(direction.x), Math.sign(direction.y), Math.sign(direction.z))
    const delta = new THREE.Vector3(
      direction.x === 0 ? Infinity : Math.abs(1 / direction.x),
      direction.y === 0 ? Infinity : Math.abs(1 / direction.y),
      direction.z === 0 ? Infinity : Math.abs(1 / direction.z),
    )
    const distanceToBoundary = (coordinate: number, cellCoordinate: number, axisStep: number) =>
      axisStep > 0 ? cellCoordinate + 1 - coordinate : coordinate - cellCoordinate
    const side = new THREE.Vector3(
      delta.x * distanceToBoundary(origin.x, cell.x, step.x),
      delta.y * distanceToBoundary(origin.y, cell.y, step.y),
      delta.z * distanceToBoundary(origin.z, cell.z, step.z),
    )
    const normal = new THREE.Vector3()
    let distance = 0

    while (distance <= maxDistance) {
      const type = this.blocks.getBlock(cell.x, cell.y, cell.z)
      if (type !== BlockType.Air) return { block: cell.clone(), normal: normal.clone(), type, distance }

      if (side.x <= side.y && side.x <= side.z) {
        distance = side.x
        side.x += delta.x
        cell.x += step.x
        normal.set(-step.x, 0, 0)
      } else if (side.y <= side.z) {
        distance = side.y
        side.y += delta.y
        cell.y += step.y
        normal.set(0, -step.y, 0)
      } else {
        distance = side.z
        side.z += delta.z
        cell.z += step.z
        normal.set(0, 0, -step.z)
      }
    }
    return null
  }
}
