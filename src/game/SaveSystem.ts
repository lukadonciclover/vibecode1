import type { SaveData } from './types'

const SAVE_KEY = 'wildcube:world:v1'

export class SaveSystem {
  static hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null
  }

  static load(): SaveData | null {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    try {
      const data = JSON.parse(raw) as SaveData
      return data.version === 1 && typeof data.seed === 'string' ? data : null
    } catch {
      return null
    }
  }

  static save(data: SaveData) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  }

  static clear() {
    localStorage.removeItem(SAVE_KEY)
  }
}
