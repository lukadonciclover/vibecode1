import * as THREE from 'three'
import { isSolidBlock } from '../../data/blocks'
import { BlockManager } from '../BlockManager'
import { WORLD_HEIGHT } from '../types'
import { Entity } from './Entity'

const TEST_DISTANCE = 0.7
const LOS_STEP = 0.3

export class EntityNavigation {
  private readonly candidate = new THREE.Vector3()
  private readonly testDirection = new THREE.Vector3()
  private readonly losPoint = new THREE.Vector3()

  constructor(
    private readonly blocks: BlockManager,
    private readonly random: () => number = Math.random,
  ) {}

  hasLineOfSight(from: THREE.Vector3, fromHeight: number, target: THREE.Vector3) {
    const start = this.candidate.copy(from)
    start.y += fromHeight * 0.72
    const direction = this.testDirection.set(target.x, target.y + 1.35, target.z).sub(start)
    const distance = direction.length()
    if (distance <= LOS_STEP) return true
    direction.divideScalar(distance)

    for (let traveled = LOS_STEP; traveled < distance - LOS_STEP; traveled += LOS_STEP) {
      const point = this.losPoint.copy(start).addScaledVector(direction, traveled)
      if (isSolidBlock(this.blocks.getBlock(Math.floor(point.x), Math.floor(point.y), Math.floor(point.z)))) return false
    }
    return true
  }

  steer(entity: Entity, desired: THREE.Vector3) {
    if (desired.lengthSq() < 0.0001) return entity.steering.set(0, 0, 0)
    const angle = Math.atan2(desired.x, desired.z)
    const leftFirst = this.random() < 0.5 ? 1 : -1
    const offsets = [0, leftFirst * Math.PI / 4, -leftFirst * Math.PI / 4, leftFirst * Math.PI / 2, -leftFirst * Math.PI / 2, Math.PI]

    for (const offset of offsets) {
      this.testDirection.set(Math.sin(angle + offset), 0, Math.cos(angle + offset))
      const x = entity.position.x + this.testDirection.x * TEST_DISTANCE
      const z = entity.position.z + this.testDirection.z * TEST_DISTANCE
      if (this.standingY(entity, x, z) !== null) return entity.steering.copy(this.testDirection)
    }
    return entity.steering.set(0, 0, 0)
  }

  move(entity: Entity, speed: number, delta: number) {
    const dx = entity.steering.x * speed * delta + entity.knockback.x * delta
    const dz = entity.steering.z * speed * delta + entity.knockback.z * delta
    let moved = false

    if (dx !== 0 || dz !== 0) {
      moved = this.tryMove(entity, entity.position.x + dx, entity.position.z + dz)
      if (!moved && dx !== 0) moved = this.tryMove(entity, entity.position.x + dx, entity.position.z)
      if (!moved && dz !== 0) moved = this.tryMove(entity, entity.position.x, entity.position.z + dz)
    }
    entity.knockback.multiplyScalar(Math.max(0, 1 - delta * 7))
    if (moved && entity.steering.lengthSq() > 0.001) {
      entity.object.rotation.y = Math.atan2(entity.steering.x, entity.steering.z) + Math.PI
    }
  }

  findUndergroundFloor(x: number, z: number, centerY: number, radius: number, height: number) {
    const center = Math.max(1, Math.min(WORLD_HEIGHT - 2, Math.floor(centerY)))
    for (let offset = 0; offset < WORLD_HEIGHT; offset += 1) {
      for (const y of offset === 0 ? [center] : [center - offset, center + offset]) {
        if (y < 1 || y >= WORLD_HEIGHT - height) continue
        if (this.canStand(x + 0.5, y, z + 0.5, radius, height) && !this.blocks.hasSkyAccess(x, y, z)) return y
      }
    }
    return null
  }

  canStand(x: number, y: number, z: number, radius: number, height: number) {
    const groundY = Math.floor(y - 0.05)
    const minX = Math.floor(x - radius)
    const maxX = Math.floor(x + radius)
    const minZ = Math.floor(z - radius)
    const maxZ = Math.floor(z + radius)
    const topY = Math.floor(y + height - 0.05)
    let supported = false

    for (let blockX = minX; blockX <= maxX; blockX += 1) {
      for (let blockZ = minZ; blockZ <= maxZ; blockZ += 1) {
        supported ||= isSolidBlock(this.blocks.getBlock(blockX, groundY, blockZ))
        for (let blockY = Math.floor(y + 0.05); blockY <= topY; blockY += 1) {
          if (isSolidBlock(this.blocks.getBlock(blockX, blockY, blockZ))) return false
        }
      }
    }
    return supported
  }

  private tryMove(entity: Entity, x: number, z: number) {
    const y = this.standingY(entity, x, z)
    if (y === null) return false
    entity.position.set(x, y, z)
    return true
  }

  private standingY(entity: Entity, x: number, z: number) {
    const base = Math.floor(entity.position.y)
    for (const offset of [1, 0, -1, -2]) {
      const y = base + offset
      if (y < 1 || y >= WORLD_HEIGHT - entity.definition.size.height) continue
      if (this.canStand(x, y, z, entity.definition.size.radius, entity.definition.size.height)) return y
    }
    return null
  }
}
