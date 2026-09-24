import * as THREE from 'three'
import type { Difficulty } from '../types'
import { Entity } from './Entity'
import { EntityNavigation } from './EntityNavigation'
import { EntityAIState } from './types'

const DIFFICULTY_DAMAGE: Record<Difficulty, number> = {
  peaceful: 0,
  easy: 0.65,
  normal: 1,
  hard: 1.35,
}

export class EntityAI {
  private readonly desired = new THREE.Vector3()

  constructor(
    private readonly navigation: EntityNavigation,
    private readonly random: () => number,
  ) {}

  update(
    entity: Entity,
    delta: number,
    player: THREE.Vector3,
    difficulty: Difficulty,
    onAttack: (amount: number, knockback: THREE.Vector3) => void,
  ) {
    entity.stateTime += delta
    entity.attackCooldown = Math.max(0, entity.attackCooldown - delta)
    entity.sightTimer -= delta
    entity.decisionTimer -= delta
    entity.wanderTimer -= delta
    entity.fleeTimer -= delta
    const distance = this.horizontalDistance(entity.position, player)

    if (entity.sightTimer <= 0) {
      entity.sightTimer = 0.22 + this.random() * 0.28
      entity.hasLineOfSight = distance <= entity.definition.loseTargetRadius
        && this.navigation.hasLineOfSight(entity.position, entity.definition.size.height, player)
    }

    if (entity.definition.disposition === 'hostile') {
      this.updateHostileState(entity, player, distance)
    } else if (entity.definition.disposition === 'passive') {
      this.updatePassiveState(entity, player, distance)
    } else {
      this.updateNeutralState(entity)
    }

    if (entity.state === EntityAIState.ATTACK) {
      entity.steering.set(0, 0, 0)
      if (entity.attackCooldown <= 0 && entity.hasLineOfSight && distance <= entity.definition.attackRange) {
        entity.attackCooldown = entity.definition.attackCooldown
        const knockback = this.desired.copy(player).sub(entity.position).setY(0)
        if (knockback.lengthSq() > 0) knockback.normalize().multiplyScalar(2.6)
        onAttack(entity.definition.attackDamage * DIFFICULTY_DAMAGE[difficulty], knockback.clone())
      }
      return
    }

    const speedScale = this.chooseDirection(entity, player)
    if (entity.decisionTimer <= 0) {
      entity.decisionTimer = 0.18 + this.random() * 0.2
      this.navigation.steer(entity, this.desired)
    }
    this.navigation.move(entity, entity.definition.movementSpeed * speedScale, delta)
  }

  private updateHostileState(entity: Entity, player: THREE.Vector3, distance: number) {
    if (entity.hasLineOfSight && distance <= entity.definition.detectionRadius) {
      entity.lastKnownTarget.copy(player)
      entity.remembersTarget = true
      entity.setState(distance <= entity.definition.attackRange ? EntityAIState.ATTACK : EntityAIState.CHASE)
      return
    }
    if (entity.state === EntityAIState.ATTACK && distance > entity.definition.attackRange) {
      entity.setState(EntityAIState.CHASE)
    }
    if (entity.state === EntityAIState.ATTACK && !entity.hasLineOfSight) {
      entity.setState(EntityAIState.SEARCH)
    }
    if (entity.state === EntityAIState.CHASE && (!entity.hasLineOfSight || distance > entity.definition.loseTargetRadius)) {
      entity.setState(EntityAIState.SEARCH)
    }
    if (entity.state === EntityAIState.SEARCH) {
      const reached = this.horizontalDistance(entity.position, entity.lastKnownTarget) < 0.7
      if (reached || entity.stateTime >= entity.definition.searchDuration) {
        entity.remembersTarget = false
        entity.setState(EntityAIState.WANDER)
      }
      return
    }
    this.updateIdleAndWander(entity)
  }

  private updatePassiveState(entity: Entity, player: THREE.Vector3, distance: number) {
    if (entity.definition.fleeRadius > 0 && entity.hasLineOfSight && distance < entity.definition.fleeRadius) {
      entity.fleeing = true
      entity.fleeTimer = 2.5
      entity.lastKnownTarget.copy(player)
      entity.setState(EntityAIState.CHASE)
      return
    }
    if (entity.fleeing) {
      entity.lastKnownTarget.copy(player)
      if (entity.fleeTimer <= 0 && distance > entity.definition.fleeRadius * 1.4) {
        entity.fleeing = false
        entity.setState(EntityAIState.WANDER)
      }
      return
    }
    this.updateIdleAndWander(entity)
  }

  private updateNeutralState(entity: Entity) {
    if (entity.hasGoal) {
      if (this.horizontalDistance(entity.position, entity.goal) < 0.55) {
        entity.setGoal(null)
        entity.setState(EntityAIState.IDLE)
      } else {
        entity.setState(EntityAIState.WANDER)
      }
      return
    }
    this.updateIdleAndWander(entity)
  }

  private updateIdleAndWander(entity: Entity) {
    if (entity.hasGoal) return
    if (entity.state === EntityAIState.IDLE && entity.stateTime > 1.2 + this.random() * 2.2) {
      entity.heading = this.random() * Math.PI * 2
      entity.wanderTimer = 1.5 + this.random() * 3.5
      entity.setState(EntityAIState.WANDER)
    } else if (entity.state === EntityAIState.WANDER && entity.wanderTimer <= 0) {
      entity.setState(EntityAIState.IDLE)
    }
  }

  private chooseDirection(entity: Entity, player: THREE.Vector3) {
    if (entity.state === EntityAIState.CHASE) {
      const target = entity.fleeing ? player : entity.lastKnownTarget
      this.desired.copy(target).sub(entity.position).setY(0)
      if (entity.fleeing) this.desired.negate()
      this.desired.normalize()
      return entity.fleeing ? 1.45 : 1.12
    }
    if (entity.hasGoal) {
      this.desired.copy(entity.goal).sub(entity.position).setY(0).normalize()
      return 1
    }
    if (entity.state === EntityAIState.SEARCH && entity.remembersTarget) {
      this.desired.copy(entity.lastKnownTarget).sub(entity.position).setY(0).normalize()
      return 0.9
    }
    if (entity.state === EntityAIState.WANDER) {
      if (entity.position.distanceToSquared(entity.home) > entity.definition.wanderRadius ** 2) {
        this.desired.copy(entity.home).sub(entity.position).setY(0).normalize()
      } else {
        this.desired.set(Math.sin(entity.heading), 0, Math.cos(entity.heading))
      }
      return 0.55
    }
    this.desired.set(0, 0, 0)
    return 0
  }

  private horizontalDistance(a: THREE.Vector3, b: THREE.Vector3) {
    return Math.hypot(a.x - b.x, a.z - b.z)
  }
}
