import type { BiomeId } from './biomes'

export const WEATHER_TYPES = ['clear', 'rain', 'storm'] as const

export type WeatherType = (typeof WEATHER_TYPES)[number]

export interface WeatherDurationRange {
  min: number
  max: number
}

export interface WeatherVisualProfile {
  intensity: number
  skyDarkening: number
  rainRate: number
  wind: number
}

export interface WeatherDefinition {
  name: string
  duration: WeatherDurationRange
  profile: WeatherVisualProfile
}

export const WEATHER_DEFINITIONS = {
  clear: {
    name: 'Clear',
    duration: { min: 90, max: 210 },
    profile: { intensity: 0, skyDarkening: 0, rainRate: 0, wind: 0.12 },
  },
  rain: {
    name: 'Rain',
    duration: { min: 60, max: 150 },
    profile: { intensity: 0.68, skyDarkening: 0.42, rainRate: 0.7, wind: 0.42 },
  },
  storm: {
    name: 'Storm',
    duration: { min: 45, max: 100 },
    profile: { intensity: 1, skyDarkening: 0.78, rainRate: 1, wind: 1 },
  },
} as const satisfies Record<WeatherType, WeatherDefinition>

/** Relative probabilities used whenever a new weather period begins. */
export const BIOME_WEATHER_WEIGHTS = {
  desert: { clear: 0.965, rain: 0.03, storm: 0.005 },
  plains: { clear: 0.55, rain: 0.35, storm: 0.1 },
  forest: { clear: 0.32, rain: 0.52, storm: 0.16 },
} as const satisfies Record<BiomeId, Record<WeatherType, number>>

export const DEFAULT_WEATHER_TRANSITION_DURATION = 12
export const DEFAULT_LIGHTNING_INTERVAL: WeatherDurationRange = { min: 7, max: 19 }
export const DEFAULT_LIGHTNING_FLASH_DURATION = 0.18
export const DEFAULT_WORLD_TIME_CYCLE = 600
