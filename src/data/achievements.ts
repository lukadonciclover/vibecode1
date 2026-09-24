export const ACHIEVEMENT_IDS = [
  'first-steps',
  'getting-started',
  'deep-below',
  'explorer',
  'monster-hunter',
  'farmer',
] as const

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number]

export type AchievementCriterion =
  | { type: 'statistic'; statistic: 'distanceTraveled' | 'biomesDiscovered' | 'enemiesDefeated'; target: number }
  | { type: 'tool-crafted' }
  | { type: 'depth-reached'; maximumY: number }
  | { type: 'harvest' }

export interface AchievementDefinition {
  id: AchievementId
  name: string
  description: string
  criterion: AchievementCriterion
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Travel 100 blocks.',
    criterion: { type: 'statistic', statistic: 'distanceTraveled', target: 100 },
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Craft your first tool.',
    criterion: { type: 'tool-crafted' },
  },
  {
    id: 'deep-below',
    name: 'Deep Below',
    description: 'Reach Y level 5 or lower.',
    criterion: { type: 'depth-reached', maximumY: 5 },
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Discover 3 biomes.',
    criterion: { type: 'statistic', statistic: 'biomesDiscovered', target: 3 },
  },
  {
    id: 'monster-hunter',
    name: 'Monster Hunter',
    description: 'Defeat 10 hostile enemies.',
    criterion: { type: 'statistic', statistic: 'enemiesDefeated', target: 10 },
  },
  {
    id: 'farmer',
    name: 'Farmer',
    description: 'Harvest your first crop.',
    criterion: { type: 'harvest' },
  },
]
