import * as THREE from 'three'
import type { EntityDefinition, EntitySnapshot } from './types'
import { EntityAIState } from './types'

export class Entity {
  readonly object: THREE.Group
  readonly knockback = new THREE.Vector3()
  readonly home = new THREE.Vector3()
  readonly steering = new THREE.Vector3()
  readonly lastKnownTarget = new THREE.Vector3()
  readonly goal = new THREE.Vector3()
  state = EntityAIState.IDLE
  stateTime = 0
  attackCooldown = 0
  decisionTimer = 0
  sightTimer = 0
  wanderTimer = 0
  heading = 0
  hasLineOfSight = false
  remembersTarget = false
  hasGoal = false
  fleeing = false
  fleeTimer = 0
  private currentHealth: number

  constructor(
    readonly id: number,
    readonly definition: EntityDefinition,
    object: THREE.Group,
    position: THREE.Vector3,
  ) {
    this.object = object
    this.object.position.copy(position)
    this.home.copy(position)
    this.currentHealth = definition.maxHealth
  }

  get type() {
    return this.definition.id
  }

  get position() {
    return this.object.position
  }

  get health() {
    return this.currentHealth
  }

  setGoal(position: THREE.Vector3 | null) {
    this.hasGoal = position !== null
    if (position) this.goal.copy(position)
  }

  setState(state: EntityAIState) {
    if (state === this.state) return
    this.state = state
    this.stateTime = 0
  }

  damage(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0 || this.currentHealth <= 0) return false
    this.currentHealth = Math.max(0, this.currentHealth - amount)
    const ratio = Math.max(0.72, this.currentHealth / this.definition.maxHealth)
    this.object.scale.setScalar(ratio * (this.definition.size.scale ?? 1))
    return true
  }

  snapshot(): EntitySnapshot {
    return {
      id: this.id,
      type: this.definition.id,
      name: this.definition.name,
      disposition: this.definition.disposition,
      state: this.state,
      health: this.currentHealth,
      maxHealth: this.definition.maxHealth,
      position: this.position.clone(),
    }
  }
}
