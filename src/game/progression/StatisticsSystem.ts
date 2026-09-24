export interface StatisticsSnapshot {
  blocksMined: number
  blocksPlaced: number
  enemiesDefeated: number
  distanceTraveled: number
  itemsCrafted: number
  daysSurvived: number
  deaths: number
  foodConsumed: number
  chunksVisited: number
  biomesDiscovered: number
}

export type StatisticName = keyof StatisticsSnapshot

export const STATISTIC_NAMES = [
  'blocksMined',
  'blocksPlaced',
  'enemiesDefeated',
  'distanceTraveled',
  'itemsCrafted',
  'daysSurvived',
  'deaths',
  'foodConsumed',
  'chunksVisited',
  'biomesDiscovered',
] as const satisfies readonly StatisticName[]

const INTEGER_STATISTICS = new Set<StatisticName>(STATISTIC_NAMES.filter((name) => name !== 'distanceTraveled'))
const MAX_COUNT = Number.MAX_SAFE_INTEGER

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeValue(name: StatisticName, value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0
  return INTEGER_STATISTICS.has(name) ? Math.min(MAX_COUNT, Math.floor(value)) : value
}

export class StatisticsSystem {
  private readonly values: StatisticsSnapshot

  constructor(initial?: unknown) {
    const source = isRecord(initial) ? initial : {}
    this.values = Object.fromEntries(
      STATISTIC_NAMES.map((name) => [name, safeValue(name, source[name])]),
    ) as unknown as StatisticsSnapshot
  }

  get(name: StatisticName) {
    return this.values[name]
  }

  increment(name: StatisticName, amount = 1) {
    if (!Number.isFinite(amount) || amount <= 0) return this.values[name]
    const increment = INTEGER_STATISTICS.has(name) ? Math.floor(amount) : amount
    if (increment === 0) return this.values[name]
    const maximum = INTEGER_STATISTICS.has(name) ? MAX_COUNT : Number.MAX_VALUE
    this.values[name] = Math.min(maximum, this.values[name] + increment)
    return this.values[name]
  }

  recordBlockMined(count = 1) {
    return this.increment('blocksMined', count)
  }

  recordBlockPlaced(count = 1) {
    return this.increment('blocksPlaced', count)
  }

  recordEnemyDefeated(count = 1) {
    return this.increment('enemiesDefeated', count)
  }

  recordDistanceTraveled(distance: number) {
    return this.increment('distanceTraveled', distance)
  }

  recordItemCrafted(count = 1) {
    return this.increment('itemsCrafted', count)
  }

  recordDaySurvived(count = 1) {
    return this.increment('daysSurvived', count)
  }

  recordDeath(count = 1) {
    return this.increment('deaths', count)
  }

  recordFoodConsumed(count = 1) {
    return this.increment('foodConsumed', count)
  }

  recordChunkVisited(count = 1) {
    return this.increment('chunksVisited', count)
  }

  recordBiomeDiscovered(count = 1) {
    return this.increment('biomesDiscovered', count)
  }

  snapshot(): StatisticsSnapshot {
    return { ...this.values }
  }
}
