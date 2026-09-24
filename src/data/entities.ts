import type { EntityDefinition } from '../game/entities/types'

export const MEADOW_GRAZER: EntityDefinition = {
  id: 'meadow_grazer',
  name: 'Meadow Grazer',
  disposition: 'passive',
  model: 'quadruped',
  colors: { primary: 0xb58a58, secondary: 0xe4c990, accent: 0x3b3028 },
  size: { radius: 0.48, height: 1.35, scale: 1 },
  maxHealth: 20,
  movementSpeed: 1.25,
  detectionRadius: 8,
  loseTargetRadius: 13,
  attackRange: 0,
  attackDamage: 0,
  attackCooldown: 1,
  fleeRadius: 5.5,
  wanderRadius: 12,
  searchDuration: 3,
  spawn: {
    biomes: ['plains'], daylight: [0.42, 1], habitat: 'surface',
    difficulties: ['peaceful', 'easy', 'normal', 'hard'],
    minPlayerDistance: 10, maxPlayerDistance: 30, despawnDistance: 42,
    maxCount: 7, weight: 1.25,
  },
  drops: [
    { item: 'raw_meat', min: 1, max: 2 },
    { item: 'leather', min: 0, max: 1, chance: 0.7 },
  ],
}

export const FOREST_BIRD: EntityDefinition = {
  id: 'forest_bird',
  name: 'Forest Bird',
  disposition: 'passive',
  model: 'bird',
  colors: { primary: 0x497e69, secondary: 0xc7a95b, accent: 0x252b32 },
  size: { radius: 0.25, height: 0.65, scale: 0.72 },
  maxHealth: 8,
  movementSpeed: 1.8,
  detectionRadius: 9,
  loseTargetRadius: 14,
  attackRange: 0,
  attackDamage: 0,
  attackCooldown: 1,
  fleeRadius: 6.5,
  wanderRadius: 10,
  searchDuration: 2.5,
  spawn: {
    biomes: ['forest'], daylight: [0.3, 1], habitat: 'surface',
    difficulties: ['peaceful', 'easy', 'normal', 'hard'],
    minPlayerDistance: 9, maxPlayerDistance: 28, despawnDistance: 40,
    maxCount: 8, weight: 1.4,
  },
  drops: [{ item: 'raw_meat', min: 0, max: 1, chance: 0.35 }],
}

export const NIGHT_CRAWLER: EntityDefinition = {
  id: 'night_crawler',
  name: 'Night Crawler',
  disposition: 'hostile',
  model: 'crawler',
  colors: { primary: 0x564370, secondary: 0x352a4b, accent: 0xc8f37b },
  size: { radius: 0.42, height: 1.5, scale: 1 },
  maxHealth: 30,
  movementSpeed: 1.55,
  detectionRadius: 13,
  loseTargetRadius: 19,
  attackRange: 1.3,
  attackDamage: 9,
  attackCooldown: 1.35,
  fleeRadius: 0,
  wanderRadius: 16,
  searchDuration: 5,
  spawn: {
    biomes: 'any', daylight: [0, 0.28], habitat: 'surface',
    difficulties: ['easy', 'normal', 'hard'],
    minPlayerDistance: 11, maxPlayerDistance: 31, despawnDistance: 46,
    maxCount: 6, weight: 1,
  },
  drops: [{ item: 'coal', min: 0, max: 2, chance: 0.55 }],
}

export const CAVE_LURKER: EntityDefinition = {
  id: 'cave_lurker',
  name: 'Cave Lurker',
  disposition: 'hostile',
  model: 'lurker',
  colors: { primary: 0x65716d, secondary: 0x3f4948, accent: 0xf08b52 },
  size: { radius: 0.46, height: 1.65, scale: 1.05 },
  maxHealth: 38,
  movementSpeed: 1.25,
  detectionRadius: 11,
  loseTargetRadius: 17,
  attackRange: 1.35,
  attackDamage: 12,
  attackCooldown: 1.6,
  fleeRadius: 0,
  wanderRadius: 13,
  searchDuration: 6,
  spawn: {
    biomes: 'any', daylight: [0, 1], habitat: 'underground',
    difficulties: ['easy', 'normal', 'hard'],
    minPlayerDistance: 8, maxPlayerDistance: 27, despawnDistance: 38,
    maxCount: 5, weight: 0.75,
  },
  drops: [
    { item: 'coal', min: 1, max: 2, chance: 0.8 },
    { item: 'crystal_shard', min: 0, max: 1, chance: 0.12 },
  ],
}

export const ENTITY_DEFINITIONS = {
  [MEADOW_GRAZER.id]: MEADOW_GRAZER,
  [FOREST_BIRD.id]: FOREST_BIRD,
  [NIGHT_CRAWLER.id]: NIGHT_CRAWLER,
  [CAVE_LURKER.id]: CAVE_LURKER,
} as const

export const DEFAULT_ENTITY_DEFINITIONS: readonly EntityDefinition[] = Object.values(ENTITY_DEFINITIONS)
