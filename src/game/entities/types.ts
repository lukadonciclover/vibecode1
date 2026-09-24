import type * as THREE from 'three'
import type { BiomeId } from '../../data/biomes'
import type { BlockManager } from '../BlockManager'
import type { Difficulty, ItemId } from '../types'

export type EntityDisposition = 'passive' | 'hostile' | 'npc'
export type EntityHabitat = 'surface' | 'underground' | 'either'
export type EntityModel = 'quadruped' | 'bird' | 'crawler' | 'lurker' | 'humanoid'

export enum EntityAIState {
  IDLE = 'IDLE',
  WANDER = 'WANDER',
  CHASE = 'CHASE',
  ATTACK = 'ATTACK',
  SEARCH = 'SEARCH',
}

export interface EntityDropDefinition {
  item: ItemId
  min: number
  max: number
  chance?: number
}

export interface EntitySpawnRule {
  biomes: readonly BiomeId[] | 'any'
  daylight: readonly [min: number, max: number]
  habitat: EntityHabitat
  difficulties: readonly Difficulty[]
  minPlayerDistance: number
  maxPlayerDistance: number
  despawnDistance: number
  maxCount: number
  weight: number
}

export interface EntityDefinition {
  id: string
  name: string
  disposition: EntityDisposition
  model: EntityModel
  colors: {
    primary: number
    secondary: number
    accent: number
  }
  size: {
    radius: number
    height: number
    scale?: number
  }
  maxHealth: number
  movementSpeed: number
  detectionRadius: number
  loseTargetRadius: number
  attackRange: number
  attackDamage: number
  attackCooldown: number
  fleeRadius: number
  wanderRadius: number
  searchDuration: number
  spawn: EntitySpawnRule
  drops: readonly EntityDropDefinition[]
}

export interface EntityUpdateContext {
  playerPosition: THREE.Vector3
  daylight: number
  difficulty: Difficulty
}

export interface EntitySnapshot {
  id: number
  type: string
  name: string
  disposition: EntityDisposition
  state: EntityAIState
  health: number
  maxHealth: number
  position: THREE.Vector3
}

export interface EntityDrop {
  item: ItemId
  count: number
}

export interface EntityDeathEvent {
  entity: EntitySnapshot
  drops: readonly EntityDrop[]
}

export interface PlayerDamageEvent {
  amount: number
  source: EntitySnapshot
  knockback: THREE.Vector3
}

export interface EntityCallbacks {
  onPlayerDamage?: (event: PlayerDamageEvent) => void
  onEntityDeath?: (event: EntityDeathEvent) => void
  onDrop?: (drop: EntityDrop, position: THREE.Vector3, source: EntitySnapshot) => void
}

export interface EntityControllerContext {
  delta: number
  blocks: BlockManager
  playerPosition: THREE.Vector3
  daylight: number
  difficulty: Difficulty
}

export interface EntityController {
  update(entity: ControllableEntity, context: EntityControllerContext): boolean | void
}

export interface ControllableEntity {
  readonly id: number
  readonly type: string
  readonly definition: EntityDefinition
  readonly position: THREE.Vector3
  readonly health: number
  state: EntityAIState
  setGoal(position: THREE.Vector3 | null): void
}

export interface EntityManagerOptions extends EntityCallbacks {
  biomeAt?: (x: number, z: number) => BiomeId
  definitions?: readonly EntityDefinition[]
  /** Controllers can be keyed by entity type or by disposition (for example, `villager` or `npc`). */
  controllers?: Readonly<Record<string, EntityController | undefined>>
  maxEntities?: number
  spawnInterval?: readonly [min: number, max: number]
  spawnAttempts?: number
  random?: () => number
}

export interface EntityRaycastHit {
  id: number
  entity: EntitySnapshot
  distance: number
  point: THREE.Vector3
}

export interface EntityMetrics {
  active: number
  limit: number
  byType: Readonly<Record<string, number>>
  byState: Readonly<Record<EntityAIState, number>>
  spawnAttempts: number
  spawned: number
  despawned: number
  killed: number
}
