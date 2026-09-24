import * as THREE from 'three'
import { NIGHT_CRAWLER } from '../data/enemies'
import { BlockManager } from './BlockManager'
import { WORLD_CHUNK_MAX, WORLD_CHUNK_MIN, CHUNK_SIZE } from './types'

interface Enemy {
  id: number
  group: THREE.Group
  health: number
  attackCooldown: number
  wanderAngle: number
  wanderTimer: number
  knockback: THREE.Vector3
}

export class EnemyManager {
  readonly group = new THREE.Group()
  private readonly enemies: Enemy[] = []
  private readonly raycaster = new THREE.Raycaster()
  private readonly bodyGeometry = new THREE.BoxGeometry(0.72, 0.62, 0.9)
  private readonly headGeometry = new THREE.BoxGeometry(0.58, 0.48, 0.58)
  private readonly legGeometry = new THREE.BoxGeometry(0.18, 0.45, 0.18)
  private readonly bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x564370 })
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xc8f37b })
  private readonly eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.04)
  private spawnTimer = 4
  private nextId = 1

  constructor(
    private readonly blocks: BlockManager,
    private readonly onPlayerDamage: (amount: number) => void,
  ) {
    this.group.name = 'Night Crawlers'
  }

  update(delta: number, playerPosition: THREE.Vector3, daylight: number) {
    this.spawnTimer -= delta
    if (daylight < 0.22 && this.spawnTimer <= 0 && this.enemies.length < 6) {
      this.spawnTimer = 7 + Math.random() * 7
      this.spawnNear(playerPosition)
    }

    for (const enemy of [...this.enemies]) {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta)
      const toPlayer = new THREE.Vector3().subVectors(playerPosition, enemy.group.position)
      const distance = Math.hypot(toPlayer.x, toPlayer.z)
      let moveX = 0
      let moveZ = 0
      if (distance <= NIGHT_CRAWLER.detectionRadius) {
        moveX = toPlayer.x / Math.max(distance, 0.001)
        moveZ = toPlayer.z / Math.max(distance, 0.001)
      } else {
        enemy.wanderTimer -= delta
        if (enemy.wanderTimer <= 0) {
          enemy.wanderTimer = 2 + Math.random() * 4
          enemy.wanderAngle += (Math.random() - 0.5) * 2.5
        }
        moveX = Math.cos(enemy.wanderAngle) * 0.35
        moveZ = Math.sin(enemy.wanderAngle) * 0.35
      }

      const speed = NIGHT_CRAWLER.movementSpeed * delta
      const nextX = enemy.group.position.x + moveX * speed + enemy.knockback.x * delta
      const nextZ = enemy.group.position.z + moveZ * speed + enemy.knockback.z * delta
      const nextY = this.blocks.findSurfaceY(Math.floor(nextX), Math.floor(nextZ))
      if (Math.abs(nextY - enemy.group.position.y) <= 1.1) {
        enemy.group.position.set(nextX, nextY, nextZ)
      }
      enemy.knockback.multiplyScalar(Math.max(0, 1 - delta * 7))
      if (moveX !== 0 || moveZ !== 0) enemy.group.rotation.y = Math.atan2(moveX, moveZ)

      if (distance < 1.25 && enemy.attackCooldown === 0) {
        enemy.attackCooldown = NIGHT_CRAWLER.attackCooldown
        this.onPlayerDamage(NIGHT_CRAWLER.attackDamage)
      }
      if (daylight > 0.8 && distance > 22) this.remove(enemy)
    }
  }

  target(camera: THREE.Camera) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    this.raycaster.far = 4.5
    const hit = this.raycaster.intersectObjects(this.group.children, true)[0]
    if (!hit) return null
    const id = hit.object.userData.enemyId as number | undefined
    return id === undefined ? null : id
  }

  attack(id: number, damage: number, origin: THREE.Vector3) {
    const enemy = this.enemies.find((candidate) => candidate.id === id)
    if (!enemy) return false
    enemy.health -= damage
    const direction = enemy.group.position.clone().sub(origin).setY(0).normalize()
    enemy.knockback.addScaledVector(direction, 5)
    enemy.group.scale.setScalar(Math.max(0.75, enemy.health / NIGHT_CRAWLER.maxHealth))
    if (enemy.health <= 0) this.remove(enemy)
    return true
  }

  dispose() {
    for (const enemy of [...this.enemies]) this.remove(enemy)
    this.bodyGeometry.dispose()
    this.headGeometry.dispose()
    this.legGeometry.dispose()
    this.eyeGeometry.dispose()
    this.bodyMaterial.dispose()
    this.eyeMaterial.dispose()
  }

  private spawnNear(player: THREE.Vector3) {
    const angle = Math.random() * Math.PI * 2
    const distance = 11 + Math.random() * 10
    const min = WORLD_CHUNK_MIN * CHUNK_SIZE + 2
    const max = (WORLD_CHUNK_MAX + 1) * CHUNK_SIZE - 3
    const x = Math.max(min, Math.min(max, Math.floor(player.x + Math.cos(angle) * distance)))
    const z = Math.max(min, Math.min(max, Math.floor(player.z + Math.sin(angle) * distance)))
    const y = this.blocks.findSurfaceY(x, z)
    if (!this.blocks.hasSkyAccess(x, y, z) || Math.hypot(x - player.x, z - player.z) < 8) return

    const id = this.nextId++
    const group = new THREE.Group()
    const addPart = (geometry: THREE.BufferGeometry, material: THREE.Material, px: number, py: number, pz: number) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(px, py, pz)
      mesh.castShadow = true
      mesh.userData.enemyId = id
      group.add(mesh)
    }
    addPart(this.bodyGeometry, this.bodyMaterial, 0, 0.78, 0)
    addPart(this.headGeometry, this.bodyMaterial, 0, 1.26, -0.18)
    addPart(this.eyeGeometry, this.eyeMaterial, -0.14, 1.33, -0.48)
    addPart(this.eyeGeometry, this.eyeMaterial, 0.14, 1.33, -0.48)
    for (const [lx, lz] of [[-0.23, -0.26], [0.23, -0.26], [-0.23, 0.27], [0.23, 0.27]]) {
      addPart(this.legGeometry, this.bodyMaterial, lx, 0.25, lz)
    }
    group.position.set(x + 0.5, y, z + 0.5)
    this.group.add(group)
    this.enemies.push({ id, group, health: NIGHT_CRAWLER.maxHealth, attackCooldown: 0, wanderAngle: angle, wanderTimer: 1, knockback: new THREE.Vector3() })
  }

  private remove(enemy: Enemy) {
    this.group.remove(enemy.group)
    const index = this.enemies.indexOf(enemy)
    if (index >= 0) this.enemies.splice(index, 1)
  }
}
