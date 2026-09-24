import * as THREE from 'three'
import { DEFAULT_ENTITY_DEFINITIONS } from '../../data/entities'
import { BlockManager } from '../BlockManager'
import { Entity } from './Entity'
import { EntityAI } from './EntityAI'
import { EntityNavigation } from './EntityNavigation'
import { EntitySpawner } from './EntitySpawner'
import { EntityVisuals } from './EntityVisuals'
import type {
  EntityCallbacks,
  EntityController,
  EntityDefinition,
  EntityDrop,
  EntityManagerOptions,
  EntityMetrics,
  EntityRaycastHit,
  EntitySnapshot,
  EntityUpdateContext,
} from './types'
import { EntityAIState } from './types'

const DEFAULT_LIMIT = 28

export class EntityManager {
  readonly group = new THREE.Group()
  private readonly entities = new Map<number, Entity>()
  private readonly definitions = new Map<string, EntityDefinition>()
  private readonly controllers: Readonly<Record<string, EntityController | undefined>>
  private readonly visuals = new EntityVisuals()
  private readonly navigation: EntityNavigation
  private readonly ai: EntityAI
  private readonly spawner: EntitySpawner
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2(0, 0)
  private readonly callbacks: EntityCallbacks
  private readonly random: () => number
  private readonly limit: number
  private nextId = 1
  private spawned = 0
  private despawned = 0
  private killed = 0
  private disposed = false

  constructor(
    private readonly blocks: BlockManager,
    options: EntityManagerOptions = {},
  ) {
    this.group.name = 'Entities'
    this.random = options.random ?? Math.random
    this.limit = Math.max(1, Math.floor(options.maxEntities ?? DEFAULT_LIMIT))
    this.callbacks = options
    this.controllers = options.controllers ?? {}
    this.navigation = new EntityNavigation(blocks, this.random)
    this.ai = new EntityAI(this.navigation, this.random)
    const interval = options.spawnInterval ?? [3.5, 6.5]
    this.spawner = new EntitySpawner(
      blocks,
      this.navigation,
      options.biomeAt ?? (() => 'plains'),
      this.random,
      interval,
      Math.max(1, Math.floor(options.spawnAttempts ?? 4)),
    )
    for (const definition of options.definitions ?? DEFAULT_ENTITY_DEFINITIONS) this.registerDefinition(definition)
  }

  update(deltaSeconds: number, context: EntityUpdateContext) {
    if (this.disposed || deltaSeconds <= 0) return
    const elapsed = Math.min(deltaSeconds, 0.1)

    for (const entity of [...this.entities.values()]) {
      const distance = Math.hypot(entity.position.x - context.playerPosition.x, entity.position.z - context.playerPosition.z)
      if (distance > entity.definition.spawn.despawnDistance
        || (context.difficulty === 'peaceful' && entity.definition.disposition === 'hostile')) {
        this.remove(entity, false)
        continue
      }

      const controller = this.controllers[entity.type] ?? this.controllers[entity.definition.disposition]
      const handled = controller?.update(entity, { delta: elapsed, blocks: this.blocks, ...context }) === true
      if (!handled) {
        this.ai.update(entity, elapsed, context.playerPosition, context.difficulty, (amount, knockback) => {
          if (amount <= 0) return
          this.callbacks.onPlayerDamage?.({ amount, knockback, source: entity.snapshot() })
        })
      }
    }

    this.spawner.update(
      deltaSeconds,
      context,
      [...this.definitions.values()],
      this.entities.size,
      this.limit,
      (type) => this.countType(type),
      (definition, position) => this.create(definition, position) !== null,
    )
  }

  registerDefinition(definition: EntityDefinition) {
    if (!definition.id || definition.maxHealth <= 0 || definition.spawn.maxCount < 0) {
      throw new Error(`Invalid entity definition: ${definition.id || '<missing id>'}`)
    }
    this.definitions.set(definition.id, definition)
  }

  spawn(type: string, position: THREE.Vector3) {
    const definition = this.definitions.get(type)
    if (!definition || this.entities.size >= this.limit || this.countType(type) >= definition.spawn.maxCount) return null
    return this.create(definition, position)?.snapshot() ?? null
  }

  setGoal(id: number, position: THREE.Vector3 | null) {
    const entity = this.entities.get(id)
    if (!entity) return false
    entity.setGoal(position)
    return true
  }

  damage(id: number, amount: number, origin?: THREE.Vector3, knockbackStrength = 5) {
    const entity = this.entities.get(id)
    if (!entity || !entity.damage(amount)) return false
    if (origin) {
      const direction = entity.position.clone().sub(origin).setY(0)
      if (direction.lengthSq() > 0) entity.knockback.addScaledVector(direction.normalize(), knockbackStrength)
      entity.lastKnownTarget.copy(origin)
      entity.remembersTarget = true
      if (entity.definition.disposition === 'passive') {
        entity.fleeing = true
        entity.fleeTimer = 3.5
      }
      entity.setState(EntityAIState.CHASE)
    }
    if (entity.health <= 0) this.kill(entity)
    return true
  }

  attack(id: number, damage: number, origin: THREE.Vector3, knockbackStrength = 5) {
    return this.damage(id, damage, origin, knockbackStrength)
  }

  raycastTarget(camera: THREE.Camera, maxDistance = 4.5): EntityRaycastHit | null {
    if (this.disposed) return null
    this.raycaster.setFromCamera(this.pointer, camera)
    this.raycaster.far = maxDistance
    const hit = this.raycaster.intersectObject(this.group, true)[0]
    const id = hit?.object.userData.entityId as number | undefined
    const entity = id === undefined ? undefined : this.entities.get(id)
    if (!hit || id === undefined || !entity) return null
    return { id, entity: entity.snapshot(), distance: hit.distance, point: hit.point.clone() }
  }

  target(camera: THREE.Camera, maxDistance = 4.5) {
    return this.raycastTarget(camera, maxDistance)?.id ?? null
  }

  getEntity(id: number): EntitySnapshot | null {
    return this.entities.get(id)?.snapshot() ?? null
  }

  getEntities() {
    return [...this.entities.values()].map((entity) => entity.snapshot())
  }

  despawn(id: number) {
    const entity = this.entities.get(id)
    if (!entity) return false
    this.remove(entity, false)
    return true
  }

  get metrics(): EntityMetrics {
    const byType: Record<string, number> = {}
    const byState = {
      [EntityAIState.IDLE]: 0,
      [EntityAIState.WANDER]: 0,
      [EntityAIState.CHASE]: 0,
      [EntityAIState.ATTACK]: 0,
      [EntityAIState.SEARCH]: 0,
    }
    for (const entity of this.entities.values()) {
      byType[entity.type] = (byType[entity.type] ?? 0) + 1
      byState[entity.state] += 1
    }
    return {
      active: this.entities.size,
      limit: this.limit,
      byType,
      byState,
      spawnAttempts: this.spawner.attempts,
      spawned: this.spawned,
      despawned: this.despawned,
      killed: this.killed,
    }
  }

  getMetrics() {
    return this.metrics
  }

  dispose() {
    if (this.disposed) return
    for (const entity of [...this.entities.values()]) this.remove(entity, false, false)
    this.visuals.dispose()
    this.group.removeFromParent()
    this.definitions.clear()
    this.disposed = true
  }

  private create(definition: EntityDefinition, position: THREE.Vector3) {
    if (this.disposed || this.entities.size >= this.limit || this.countType(definition.id) >= definition.spawn.maxCount) return null
    const id = this.nextId++
    const entity = new Entity(id, definition, this.visuals.create(definition, id), position)
    entity.heading = this.random() * Math.PI * 2
    this.entities.set(id, entity)
    this.group.add(entity.object)
    this.spawned += 1
    return entity
  }

  private kill(entity: Entity) {
    const snapshot = entity.snapshot()
    const drops = this.rollDrops(entity.definition)
    this.killed += 1
    this.remove(entity, true, false)
    this.callbacks.onEntityDeath?.({ entity: snapshot, drops })
    for (const drop of drops) this.callbacks.onDrop?.(drop, snapshot.position.clone(), snapshot)
  }

  private rollDrops(definition: EntityDefinition) {
    const drops: EntityDrop[] = []
    for (const drop of definition.drops) {
      if (this.random() > (drop.chance ?? 1)) continue
      const minimum = Math.max(0, Math.ceil(drop.min))
      const maximum = Math.max(minimum, Math.floor(drop.max))
      const count = minimum + Math.floor(this.random() * (maximum - minimum + 1))
      if (count > 0) drops.push({ item: drop.item, count })
    }
    return drops
  }

  private remove(entity: Entity, killed: boolean, countDespawn = true) {
    this.group.remove(entity.object)
    this.entities.delete(entity.id)
    if (!killed && countDespawn) this.despawned += 1
  }

  private countType(type: string) {
    let count = 0
    for (const entity of this.entities.values()) if (entity.type === type) count += 1
    return count
  }
}
