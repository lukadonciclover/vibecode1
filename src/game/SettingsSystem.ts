import { DEFAULT_USER_SETTINGS, type UserSettings } from './types'

const SETTINGS_KEY = 'wildcube:settings:v1'

export class SettingsSystem {
  static load(): UserSettings {
    try {
      const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<UserSettings>
      return {
        renderDistance: this.clamp(value.renderDistance, 2, 8, DEFAULT_USER_SETTINGS.renderDistance),
        mouseSensitivity: this.clamp(value.mouseSensitivity, 0.2, 3, DEFAULT_USER_SETTINGS.mouseSensitivity),
        masterVolume: this.clamp(value.masterVolume, 0, 1, DEFAULT_USER_SETTINGS.masterVolume),
        musicVolume: this.clamp(value.musicVolume, 0, 1, DEFAULT_USER_SETTINGS.musicVolume),
        soundVolume: this.clamp(value.soundVolume, 0, 1, DEFAULT_USER_SETTINGS.soundVolume),
        fov: this.clamp(value.fov, 55, 100, DEFAULT_USER_SETTINGS.fov),
        fullscreen: Boolean(value.fullscreen),
        showFps: value.showFps !== false,
      }
    } catch { return { ...DEFAULT_USER_SETTINGS } }
  }

  static save(settings: UserSettings) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return true } catch { return false }
  }

  private static clamp(value: unknown, min: number, max: number, fallback: number) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
  }
}
