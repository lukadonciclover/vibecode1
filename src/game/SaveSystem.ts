import { ITEM_IDS } from '../data/items'
import { InventorySystem } from './InventorySystem'
import { BlockType, type BlockChanges, type InventoryCounts, type ItemId, type PlayerPosition, type SaveData } from './types'

const SAVE_KEY = 'wildcube:world:v1'

interface LegacySave {
  version: 1
  seed: string
  position: PlayerPosition
  inventory: Record<string, number>
  changes: BlockChanges
  updatedAt: number
}

const LEGACY_ITEMS: Partial<Record<BlockType, ItemId>> = {
  [BlockType.Grass]: 'grass',
  [BlockType.Dirt]: 'dirt',
  [BlockType.Stone]: 'stone',
  [BlockType.Sand]: 'sand',
  [BlockType.Wood]: 'wood_log',
  [BlockType.Leaves]: 'leaves',
}

export class SaveSystem {
  static hasSave() {
    return this.load() !== null
  }

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as SaveData | LegacySave
      if (!data || typeof data.seed !== 'string') return null
      if (data.version === 1) return this.migrate(data)
      if (data.version !== 2) return null
      return this.validate(data)
    } catch {
      return null
    }
  }

  static save(data: SaveData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      // Storage can be unavailable or full; gameplay should not crash.
    }
  }

  static clear() {
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      // Ignore unavailable storage.
    }
  }

  private static migrate(data: LegacySave): SaveData {
    const inventory = new InventorySystem({}).snapshot()
    for (const [legacyType, count] of Object.entries(data.inventory ?? {})) {
      const item = LEGACY_ITEMS[Number(legacyType) as BlockType]
      if (item) inventory[item] = this.safeNumber(count, 0)
    }
    return {
      version: 2,
      seed: data.seed,
      position: this.validPosition(data.position),
      inventory,
      changes: data.changes ?? {},
      health: 100,
      hunger: 100,
      worldTime: 180,
      selectedItem: 'grass',
      updatedAt: this.safeNumber(data.updatedAt, Date.now()),
    }
  }

  private static validate(data: SaveData): SaveData {
    const inventory = Object.fromEntries(ITEM_IDS.map((item) => [item, this.safeNumber(data.inventory?.[item], 0)])) as InventoryCounts
    const changes = Object.fromEntries(Object.entries(data.changes ?? {}).filter(([key, type]) =>
      /^-?\d+,-?\d+,-?\d+$/.test(key) && Number.isInteger(type) && type >= BlockType.Air && type <= BlockType.CrystalOre,
    )) as BlockChanges
    return {
      ...data,
      position: this.validPosition(data.position),
      inventory,
      changes,
      health: Math.max(0, Math.min(100, this.safeNumber(data.health, 100))),
      hunger: Math.max(0, Math.min(100, this.safeNumber(data.hunger, 100))),
      worldTime: this.safeNumber(data.worldTime, 180),
      selectedItem: ITEM_IDS.includes(data.selectedItem) ? data.selectedItem : 'grass',
      updatedAt: this.safeNumber(data.updatedAt, Date.now()),
    }
  }

  private static validPosition(position: PlayerPosition): PlayerPosition {
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z)) return position
    return { x: 0.5, y: 20, z: 0.5 }
  }

  private static safeNumber(value: unknown, fallback: number) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback
  }
}
