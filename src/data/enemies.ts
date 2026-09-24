export interface EnemyDefinition {
  name: string
  maxHealth: number
  movementSpeed: number
  detectionRadius: number
  attackDamage: number
  attackCooldown: number
}

export const NIGHT_CRAWLER: EnemyDefinition = {
  name: 'Night Crawler',
  maxHealth: 30,
  movementSpeed: 1.55,
  detectionRadius: 13,
  attackDamage: 9,
  attackCooldown: 1.35,
}
