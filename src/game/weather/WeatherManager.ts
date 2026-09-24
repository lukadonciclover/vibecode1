import type { BiomeId } from '../../data/biomes'
import {
  BIOME_WEATHER_WEIGHTS,
  DEFAULT_LIGHTNING_FLASH_DURATION,
  DEFAULT_LIGHTNING_INTERVAL,
  DEFAULT_WEATHER_TRANSITION_DURATION,
  DEFAULT_WORLD_TIME_CYCLE,
  WEATHER_DEFINITIONS,
  WEATHER_TYPES,
  type WeatherDurationRange,
  type WeatherType,
  type WeatherVisualProfile,
} from '../../data/weather'

export interface WeatherSnapshot extends WeatherVisualProfile {
  type: WeatherType
  lightning: boolean
}

export interface ThunderEvent {
  /** Absolute, unwrapped time on the manager's weather timeline. */
  at: number
  intensity: number
}

export type ThunderCallback = (event: ThunderEvent) => void

export interface WeatherManagerOptions {
  seed?: string | number
  durations?: Partial<Record<WeatherType, Partial<WeatherDurationRange>>>
  transitionDuration?: number
  /** Set to null when worldTime is monotonic and never wraps. */
  worldTimeCycle?: number | null
  lightningInterval?: Partial<WeatherDurationRange>
  lightningFlashDuration?: number
  onThunder?: ThunderCallback
}

export interface WeatherManagerConfig {
  durations: Record<WeatherType, WeatherDurationRange>
  transitionDuration: number
  worldTimeCycle: number | null
  lightningInterval: WeatherDurationRange
  lightningFlashDuration: number
}

export interface SerializedWeatherState {
  version: 1
  seed: string
  config: WeatherManagerConfig
  initialized: boolean
  timeline: number
  lastWorldTime: number | null
  type: WeatherType
  previousType: WeatherType
  transitionStartedAt: number
  periodEndsAt: number | null
  sequence: number
  lightningSequence: number
  nextLightningAt: number | null
  lightningUntil: number | null
}

const DEFAULT_SEED = 'wildcube-weather'

export class WeatherManager {
  private readonly seedKey: string
  private readonly seed: number
  private readonly config: WeatherManagerConfig
  private onThunder?: ThunderCallback
  private initialized = false
  private timeline = 0
  private lastWorldTime: number | null = null
  private type: WeatherType = 'clear'
  private previousType: WeatherType = 'clear'
  private transitionStartedAt = 0
  private periodEndsAt = Number.POSITIVE_INFINITY
  private sequence = 0
  private lightningSequence = 0
  private nextLightningAt: number | null = null
  private lightningUntil: number | null = null
  private lightningTriggered = false

  constructor(options: WeatherManagerOptions = {}) {
    this.seedKey = String(options.seed ?? DEFAULT_SEED)
    this.seed = this.hashSeed(this.seedKey)
    this.config = this.resolveConfig(options)
    this.onThunder = options.onThunder
  }

  /** Advances weather using world-time movement and returns render-ready values. */
  update(delta: number, worldTime: number, biome: BiomeId): WeatherSnapshot {
    const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0
    this.lightningTriggered = false

    if (!this.initialized) {
      this.timeline = Number.isFinite(worldTime) ? worldTime : 0
      this.lastWorldTime = Number.isFinite(worldTime) ? worldTime : null
      this.initialized = true
      this.transitionStartedAt = this.timeline
      this.periodEndsAt = this.timeline + this.sampleDuration('clear', this.sequence)
      this.sequence += 1
      return this.current
    }

    const elapsed = this.worldTimeElapsed(worldTime, safeDelta)
    this.advanceTo(this.timeline + elapsed, biome)
    return this.current
  }

  get current(): WeatherSnapshot {
    const profile = this.profileAt(this.timeline)
    const lightning = this.type === 'storm' && (
      this.lightningTriggered
      || (this.lightningUntil !== null && this.timeline <= this.lightningUntil)
    )
    return { type: this.type, ...profile, lightning }
  }

  setThunderCallback(callback?: ThunderCallback) {
    this.onThunder = callback
  }

  serialize(): SerializedWeatherState {
    return {
      version: 1,
      seed: this.seedKey,
      config: this.cloneConfig(),
      initialized: this.initialized,
      timeline: this.timeline,
      lastWorldTime: this.lastWorldTime,
      type: this.type,
      previousType: this.previousType,
      transitionStartedAt: this.transitionStartedAt,
      periodEndsAt: Number.isFinite(this.periodEndsAt) ? this.periodEndsAt : null,
      sequence: this.sequence,
      lightningSequence: this.lightningSequence,
      nextLightningAt: this.nextLightningAt,
      lightningUntil: this.lightningUntil,
    }
  }

  static deserialize(state: SerializedWeatherState, onThunder?: ThunderCallback): WeatherManager {
    if (state.version !== 1 || typeof state.seed !== 'string') {
      throw new Error('Unsupported weather state')
    }

    const manager = new WeatherManager({
      seed: state.seed,
      durations: state.config.durations,
      transitionDuration: state.config.transitionDuration,
      worldTimeCycle: state.config.worldTimeCycle,
      lightningInterval: state.config.lightningInterval,
      lightningFlashDuration: state.config.lightningFlashDuration,
      onThunder,
    })
    manager.restore(state)
    return manager
  }

  private advanceTo(targetTime: number, biome: BiomeId) {
    while (targetTime >= this.periodEndsAt) {
      this.processLightning(this.periodEndsAt)
      this.timeline = this.periodEndsAt
      this.beginPeriod(this.timeline, biome)
    }
    this.processLightning(targetTime)
    this.timeline = targetTime
  }

  private beginPeriod(startedAt: number, biome: BiomeId) {
    this.previousType = this.type
    this.type = this.selectWeather(biome, this.sequence)
    this.transitionStartedAt = startedAt
    this.periodEndsAt = startedAt + this.sampleDuration(this.type, this.sequence)
    this.sequence += 1
    this.lightningUntil = null

    if (this.type === 'storm') {
      this.scheduleLightning(startedAt)
    } else {
      this.nextLightningAt = null
    }
  }

  private processLightning(until: number) {
    if (this.type !== 'storm' || this.nextLightningAt === null) return

    while (this.nextLightningAt <= until && this.nextLightningAt < this.periodEndsAt) {
      const strikeAt = this.nextLightningAt
      this.lightningTriggered = true
      this.lightningUntil = strikeAt + this.config.lightningFlashDuration
      this.onThunder?.({ at: strikeAt, intensity: this.profileAt(strikeAt).intensity })
      this.scheduleLightning(strikeAt)
    }
  }

  private scheduleLightning(after: number) {
    const interval = this.sampleRange(
      this.config.lightningInterval,
      this.random(this.lightningSequence, 0x51f15e),
    )
    this.lightningSequence += 1
    this.nextLightningAt = after + interval
  }

  private selectWeather(biome: BiomeId, sequence: number): WeatherType {
    const weights = BIOME_WEATHER_WEIGHTS[biome]
    const total = WEATHER_TYPES.reduce((sum, weather) => sum + weights[weather], 0)
    let choice = this.random(sequence, 0x7f4a7c15) * total

    for (const weather of WEATHER_TYPES) {
      choice -= weights[weather]
      if (choice <= 0) return weather
    }
    return 'clear'
  }

  private sampleDuration(type: WeatherType, sequence: number) {
    return this.sampleRange(this.config.durations[type], this.random(sequence, 0x2c1b3c6d))
  }

  private sampleRange(range: WeatherDurationRange, random: number) {
    return range.min + (range.max - range.min) * random
  }

  private profileAt(time: number): WeatherVisualProfile {
    const from = WEATHER_DEFINITIONS[this.previousType].profile
    const to = WEATHER_DEFINITIONS[this.type].profile
    const duration = Math.min(this.config.transitionDuration, this.periodEndsAt - this.transitionStartedAt)
    const progress = duration <= 0 ? 1 : this.smoothstep((time - this.transitionStartedAt) / duration)
    return {
      intensity: this.lerp(from.intensity, to.intensity, progress),
      skyDarkening: this.lerp(from.skyDarkening, to.skyDarkening, progress),
      rainRate: this.lerp(from.rainRate, to.rainRate, progress),
      wind: this.lerp(from.wind, to.wind, progress),
    }
  }

  private worldTimeElapsed(worldTime: number, delta: number) {
    if (!Number.isFinite(worldTime)) return delta
    if (this.lastWorldTime === null) {
      this.lastWorldTime = worldTime
      return 0
    }

    const rawElapsed = worldTime - this.lastWorldTime
    this.lastWorldTime = worldTime
    if (this.config.worldTimeCycle === null) return Math.max(0, rawElapsed)

    const cycle = this.config.worldTimeCycle
    const wrapCount = Math.round((delta - rawElapsed) / cycle)
    return Math.max(0, rawElapsed + wrapCount * cycle)
  }

  private restore(state: SerializedWeatherState) {
    if (!this.validNumber(state.timeline) || !this.validNumber(state.transitionStartedAt)) {
      throw new Error('Invalid weather timeline')
    }
    if (!WEATHER_TYPES.includes(state.type) || !WEATHER_TYPES.includes(state.previousType)) {
      throw new Error('Invalid weather type')
    }

    this.initialized = state.initialized
    this.timeline = state.timeline
    this.lastWorldTime = state.lastWorldTime === null ? null : this.requireNumber(state.lastWorldTime)
    this.type = state.type
    this.previousType = state.previousType
    this.transitionStartedAt = state.transitionStartedAt
    this.periodEndsAt = state.periodEndsAt === null
      ? Number.POSITIVE_INFINITY
      : this.requireNumber(state.periodEndsAt)
    this.sequence = this.requireInteger(state.sequence)
    this.lightningSequence = this.requireInteger(state.lightningSequence)
    this.nextLightningAt = state.nextLightningAt === null ? null : this.requireNumber(state.nextLightningAt)
    this.lightningUntil = state.lightningUntil === null ? null : this.requireNumber(state.lightningUntil)

    if (this.initialized && this.periodEndsAt <= this.timeline) {
      throw new Error('Invalid weather period')
    }
  }

  private resolveConfig(options: WeatherManagerOptions): WeatherManagerConfig {
    const durations = {} as Record<WeatherType, WeatherDurationRange>
    for (const type of WEATHER_TYPES) {
      durations[type] = this.resolveRange(options.durations?.[type], WEATHER_DEFINITIONS[type].duration)
    }

    return {
      durations,
      transitionDuration: this.nonNegative(options.transitionDuration, DEFAULT_WEATHER_TRANSITION_DURATION),
      worldTimeCycle: options.worldTimeCycle === null
        ? null
        : this.positive(options.worldTimeCycle, DEFAULT_WORLD_TIME_CYCLE),
      lightningInterval: this.resolveRange(options.lightningInterval, DEFAULT_LIGHTNING_INTERVAL),
      lightningFlashDuration: this.nonNegative(options.lightningFlashDuration, DEFAULT_LIGHTNING_FLASH_DURATION),
    }
  }

  private resolveRange(
    value: Partial<WeatherDurationRange> | undefined,
    fallback: WeatherDurationRange,
  ): WeatherDurationRange {
    const min = this.positive(value?.min, fallback.min)
    const max = this.positive(value?.max, fallback.max)
    return min <= max ? { min, max } : { min: max, max: min }
  }

  private cloneConfig(): WeatherManagerConfig {
    return {
      durations: {
        clear: { ...this.config.durations.clear },
        rain: { ...this.config.durations.rain },
        storm: { ...this.config.durations.storm },
      },
      transitionDuration: this.config.transitionDuration,
      worldTimeCycle: this.config.worldTimeCycle,
      lightningInterval: { ...this.config.lightningInterval },
      lightningFlashDuration: this.config.lightningFlashDuration,
    }
  }

  private random(sequence: number, salt: number) {
    let value = this.seed ^ Math.imul(sequence + 1, 0x9e3779b1) ^ salt
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad)
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97)
    return ((value ^ (value >>> 15)) >>> 0) / 4294967296
  }

  private hashSeed(value: string) {
    let hash = 2166136261
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
  }

  private smoothstep(value: number) {
    const clamped = Math.max(0, Math.min(1, value))
    return clamped * clamped * (3 - 2 * clamped)
  }

  private lerp(from: number, to: number, amount: number) {
    return from + (to - from) * amount
  }

  private positive(value: number | undefined, fallback: number) {
    return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback
  }

  private nonNegative(value: number | undefined, fallback: number) {
    return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback
  }

  private validNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
  }

  private requireNumber(value: unknown) {
    if (!this.validNumber(value)) throw new Error('Invalid weather state number')
    return value
  }

  private requireInteger(value: unknown) {
    if (!this.validNumber(value) || !Number.isInteger(value) || value < 0) {
      throw new Error('Invalid weather state counter')
    }
    return value
  }
}
