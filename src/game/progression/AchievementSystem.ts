import {
  ACHIEVEMENTS,
  ACHIEVEMENT_IDS,
  type AchievementDefinition,
  type AchievementId,
} from '../../data/achievements'
import type { StatisticsSnapshot } from './StatisticsSystem'

export type AchievementProgressEvent =
  | { type: 'statistics'; statistics: StatisticsSnapshot }
  | { type: 'tool-crafted' }
  | { type: 'depth-reached'; y: number }
  | { type: 'harvest' }

export interface AchievementUnlockEvent {
  type: 'achievement-unlocked'
  achievementId: AchievementId
  title: string
  message: string
  achievement: AchievementDefinition
}

export type AchievementUnlockCallback = (event: AchievementUnlockEvent) => void

export interface AchievementSystemOptions {
  unlockedIds?: unknown
  onUnlock?: AchievementUnlockCallback
}

const VALID_IDS = new Set<string>(ACHIEVEMENT_IDS)

export class AchievementSystem {
  private readonly unlockedIds = new Set<AchievementId>()
  private readonly onUnlock?: AchievementUnlockCallback

  constructor(options: AchievementSystemOptions = {}) {
    this.onUnlock = options.onUnlock
    if (!Array.isArray(options.unlockedIds)) return
    for (const id of options.unlockedIds) {
      if (typeof id === 'string' && VALID_IDS.has(id)) this.unlockedIds.add(id as AchievementId)
    }
  }

  isUnlocked(id: AchievementId) {
    return this.unlockedIds.has(id)
  }

  handle(event: AchievementProgressEvent): AchievementUnlockEvent[] {
    const unlocks: AchievementUnlockEvent[] = []
    for (const achievement of ACHIEVEMENTS) {
      if (this.unlockedIds.has(achievement.id) || !this.matches(achievement, event)) continue
      const unlock = this.unlock(achievement)
      unlocks.push(unlock)
      this.onUnlock?.(unlock)
    }
    return unlocks
  }

  evaluate(statistics: StatisticsSnapshot) {
    return this.handle({ type: 'statistics', statistics })
  }

  recordToolCrafted() {
    return this.handle({ type: 'tool-crafted' })
  }

  recordDepth(y: number) {
    return this.handle({ type: 'depth-reached', y })
  }

  recordHarvest() {
    return this.handle({ type: 'harvest' })
  }

  snapshot(): AchievementId[] {
    return ACHIEVEMENT_IDS.filter((id) => this.unlockedIds.has(id))
  }

  private matches(achievement: AchievementDefinition, event: AchievementProgressEvent) {
    const criterion = achievement.criterion
    if (criterion.type === 'statistic') {
      return event.type === 'statistics' && event.statistics[criterion.statistic] >= criterion.target
    }
    if (criterion.type === 'depth-reached') {
      return event.type === 'depth-reached' && Number.isFinite(event.y) && event.y <= criterion.maximumY
    }
    return criterion.type === event.type
  }

  private unlock(achievement: AchievementDefinition): AchievementUnlockEvent {
    this.unlockedIds.add(achievement.id)
    return {
      type: 'achievement-unlocked',
      achievementId: achievement.id,
      title: 'Achievement Unlocked',
      message: achievement.name,
      achievement,
    }
  }
}
