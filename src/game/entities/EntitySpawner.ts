import * as THREE from 'three'
import type { BiomeId } from '../../data/biomes'
import { BlockManager } from '../BlockManager'
import type { EntityDefinition, EntityUpdateContext } from './types'
import { EntityNavigation } from './EntityNavigation'

export class EntitySpawner {
  attempts = 0
  spawned = 0
  private timer: number

  constructor(
    private readonly blocks: BlockManager,
    private readonly navigation: EntityNavigation,
    private readonly biomeAt: (x: number, z: number) => BiomeId,
    private readonly random: () => number,
    private readonly interval: readonly [number, number],
    private readonly attemptsPerCycle: number,
  ) {
    this.timer = this.nextInterval()
  }

  update(
    delta: number,
    context: EntityUpdateContext,
    definitions: readonly EntityDefinition[],
    totalCount: number,
    limit: number,
    countType: (type: string) => number,
    spawn: (definition: EntityDefinition, position: THREE.Vector3) => boolean,
  ) {
    this.timer -= delta
    if (this.timer > 0 || totalCount >= limit) return
    this.timer = this.nextInterval()

    for (let attempt = 0; attempt < this.attemptsPerCycle && totalCount < limit; attempt += 1) {
      this.attempts += 1
      const eligible = definitions.filter((definition) => this.isGenerallyEligible(definition, context, countType))
      const definition = this.weightedChoice(eligible)
      if (!definition) return
      const position = this.findPosition(definition, context.playerPosition)
      if (!position || !this.positionMatches(definition, position, context)) continue
      if (spawn(definition, position)) {
        this.spawned += 1
        return
      }
    }
  }

  private isGenerallyEligible(definition: EntityDefinition, context: EntityUpdateContext, countType: (type: string) => number) {
    const [minLight, maxLight] = definition.spawn.daylight
    return context.daylight >= minLight
      && context.daylight <= maxLight
      && definition.spawn.difficulties.includes(context.difficulty)
      && countType(definition.id) < definition.spawn.maxCount
      && definition.spawn.weight > 0
  }

  private findPosition(definition: EntityDefinition, player: THREE.Vector3) {
    const rule = definition.spawn
    const angle = this.random() * Math.PI * 2
    const distance = rule.minPlayerDistance + this.random() * (rule.maxPlayerDistance - rule.minPlayerDistance)
    const x = Math.floor(player.x + Math.cos(angle) * distance)
    const z = Math.floor(player.z + Math.sin(angle) * distance)
    let underground = rule.habitat === 'underground'
    if (rule.habitat === 'either') underground = this.random() < 0.35

    if (underground) {
      const y = this.navigation.findUndergroundFloor(x, z, player.y, definition.size.radius, definition.size.height)
      return y === null ? null : new THREE.Vector3(x + 0.5, y, z + 0.5)
    }

    const y = this.blocks.findSurfaceY(x, z)
    if (!this.blocks.hasSkyAccess(x, y, z)) return null
    if (!this.navigation.canStand(x + 0.5, y, z + 0.5, definition.size.radius, definition.size.height)) return null
    return new THREE.Vector3(x + 0.5, y, z + 0.5)
  }

  private positionMatches(definition: EntityDefinition, position: THREE.Vector3, context: EntityUpdateContext) {
    const rule = definition.spawn
    const distance = Math.hypot(position.x - context.playerPosition.x, position.z - context.playerPosition.z)
    if (distance < rule.minPlayerDistance || distance > rule.maxPlayerDistance) return false
    if (rule.biomes !== 'any' && !rule.biomes.includes(this.biomeAt(position.x, position.z))) return false
    const underground = !this.blocks.hasSkyAccess(Math.floor(position.x), Math.floor(position.y), Math.floor(position.z))
    return rule.habitat === 'either'
      || (rule.habitat === 'underground' ? underground : !underground)
  }

  private weightedChoice(definitions: readonly EntityDefinition[]) {
    const total = definitions.reduce((sum, definition) => sum + definition.spawn.weight, 0)
    let choice = this.random() * total
    for (const definition of definitions) {
      choice -= definition.spawn.weight
      if (choice <= 0) return definition
    }
    return definitions.at(-1)
  }

  private nextInterval() {
    const [minimum, maximum] = this.interval
    return minimum + this.random() * Math.max(0, maximum - minimum)
  }
}
