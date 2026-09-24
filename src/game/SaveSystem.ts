import { ACHIEVEMENT_IDS } from '../data/achievements'
import { ITEM_IDS } from '../data/items'
import { InventorySystem } from './InventorySystem'
import { StatisticsSystem } from './progression'
import {
  BlockType,
  CHUNK_SIZE,
  DEFAULT_WORLD_SETTINGS,
  type BlockChanges,
  type Difficulty,
  type Equipment,
  type GameMode,
  type InventoryCounts,
  type ItemId,
  type ModifiedChunks,
  type PlayerPosition,
  type SaveData,
  type WorldSettings,
  type WorldSummary,
} from './types'
import { blockChunk, chunkKey, localBlockKey, localCoordinate } from './world/chunkCoordinates'

const INDEX_KEY = 'wildcube:worlds:index:v3'
const LEGACY_KEY = 'wildcube:world:v1'
const worldKey = (id: string) => `wildcube:world:${id}:v3`

interface WorldIndex { version: 1; worlds: WorldSummary[] }
interface LegacySave {
  version: 1 | 2
  seed: string
  position: PlayerPosition
  inventory: Record<string, number>
  changes: BlockChanges
  health?: number
  hunger?: number
  worldTime?: number
  selectedItem?: ItemId
  updatedAt: number
}

const LEGACY_ITEMS: Partial<Record<BlockType, ItemId>> = {
  [BlockType.Grass]: 'grass', [BlockType.Dirt]: 'dirt', [BlockType.Stone]: 'stone',
  [BlockType.Sand]: 'sand', [BlockType.Wood]: 'wood_log', [BlockType.Leaves]: 'leaves',
}
const EMPTY_EQUIPMENT: Equipment = { head: null, chest: null, legs: null, feet: null, offhand: null }

export class SaveSystem {
  private static error: string | null = null

  static get lastError() { return this.error }

  static listWorlds(): WorldSummary[] {
    this.migrateLegacy()
    try {
      const raw = localStorage.getItem(INDEX_KEY)
      if (!raw) return []
      const index = JSON.parse(raw) as WorldIndex
      if (index.version !== 1 || !Array.isArray(index.worlds)) throw new Error('The world index has an unsupported format.')
      this.error = null
      return index.worlds.filter((world) => world && typeof world.id === 'string' && typeof world.name === 'string').sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      this.error = `World list could not be loaded: ${this.message(error)}`
      return []
    }
  }

  static createWorld(options: { name: string; seed: string; gameMode: GameMode; difficulty: Difficulty; renderDistance: number }) {
    const now = Date.now()
    const id = globalThis.crypto?.randomUUID?.() ?? `${now.toString(36)}-${Math.random().toString(36).slice(2)}`
    const settings: WorldSettings = {
      gameMode: options.gameMode,
      difficulty: options.difficulty,
      renderDistance: Math.max(2, Math.min(8, Math.floor(options.renderDistance))),
    }
    const save = this.createEmpty(id, options.name.trim() || 'Untamed World', options.seed, settings, now)
    if (!this.save(save)) return null
    return save
  }

  static load(id?: string): SaveData | null {
    const worldId = id ?? this.listWorlds()[0]?.id
    if (!worldId) return null
    try {
      const raw = localStorage.getItem(worldKey(worldId))
      if (!raw) throw new Error('The world data is missing, but its world-list entry was preserved.')
      const parsed = JSON.parse(raw) as SaveData
      const validated = this.validate(parsed)
      this.error = null
      return validated
    } catch (error) {
      this.error = `World could not be loaded: ${this.message(error)}`
      return null
    }
  }

  static save(data: SaveData) {
    try {
      const validated = this.validate(data)
      localStorage.setItem(worldKey(validated.id), JSON.stringify(validated))
      const worlds = this.readIndex().filter((world) => world.id !== validated.id)
      worlds.push(this.summary(validated))
      localStorage.setItem(INDEX_KEY, JSON.stringify({ version: 1, worlds } satisfies WorldIndex))
      this.error = null
      return true
    } catch (error) {
      this.error = `World could not be saved: ${this.message(error)}`
      return false
    }
  }

  static deleteWorld(id: string) {
    try {
      const worlds = this.readIndex().filter((world) => world.id !== id)
      localStorage.setItem(INDEX_KEY, JSON.stringify({ version: 1, worlds } satisfies WorldIndex))
      localStorage.removeItem(worldKey(id))
      this.error = null
      return true
    } catch (error) {
      this.error = `World could not be deleted: ${this.message(error)}`
      return false
    }
  }

  static hasSave() { return this.listWorlds().length > 0 }

  private static createEmpty(id: string, name: string, seed: string, settings: WorldSettings, now: number): SaveData {
    return {
      version: 3, id, name, seed, generationVersion: 3, createdAt: now, updatedAt: now,
      settings, position: { x: 0.5, y: 0, z: 0.5 }, spawn: { x: 0.5, y: 0, z: 0.5 },
      inventory: new InventorySystem().snapshot(), durability: {}, equipment: { ...EMPTY_EQUIPMENT },
      modifiedChunks: {}, blockEntities: {}, crops: {}, health: 100, hunger: 100,
      worldTime: 180, totalWorldTime: 180, selectedItem: 'grass', achievements: [],
      statistics: new StatisticsSystem().snapshot(), visitedChunks: [], discoveredBiomes: [],
      tradeUses: {},
    }
  }

  private static validate(data: SaveData): SaveData {
    if (!data || data.version !== 3 || typeof data.id !== 'string' || typeof data.seed !== 'string') throw new Error('Unsupported save version.')
    const inventory = Object.fromEntries(ITEM_IDS.map((item) => [item, this.number(data.inventory?.[item], 0)])) as InventoryCounts
    const selectedItem = ITEM_IDS.includes(data.selectedItem) ? data.selectedItem : 'grass'
    const settings: WorldSettings = {
      gameMode: data.settings?.gameMode === 'creative' ? 'creative' : 'survival',
      difficulty: ['peaceful', 'easy', 'normal', 'hard'].includes(data.settings?.difficulty) ? data.settings.difficulty : DEFAULT_WORLD_SETTINGS.difficulty,
      renderDistance: Math.max(2, Math.min(8, this.number(data.settings?.renderDistance, 3))),
    }
    const achievements = Array.isArray(data.achievements) ? data.achievements.filter((id) => ACHIEVEMENT_IDS.includes(id)) : []
    return {
      ...data,
      name: typeof data.name === 'string' && data.name.trim() ? data.name.slice(0, 48) : 'Untamed World',
      generationVersion: data.generationVersion === 2 || data.id.startsWith('legacy-') ? 2 : 3,
      settings,
      position: this.position(data.position),
      spawn: this.position(data.spawn),
      inventory,
      durability: data.durability ?? {},
      equipment: { ...EMPTY_EQUIPMENT, ...data.equipment },
      modifiedChunks: this.modifiedChunks(data.modifiedChunks),
      blockEntities: data.blockEntities ?? {},
      crops: data.crops ?? {},
      health: Math.max(0, Math.min(100, this.number(data.health, 100))),
      hunger: Math.max(0, Math.min(100, this.number(data.hunger, 100))),
      worldTime: this.number(data.worldTime, 180),
      totalWorldTime: this.number(data.totalWorldTime, data.worldTime ?? 180),
      selectedItem,
      achievements,
      statistics: new StatisticsSystem(data.statistics).snapshot(),
      visitedChunks: this.stringArray(data.visitedChunks),
      discoveredBiomes: this.stringArray(data.discoveredBiomes),
      tradeUses: data.tradeUses && typeof data.tradeUses === 'object' ? data.tradeUses : {},
      createdAt: this.number(data.createdAt, Date.now()),
      updatedAt: this.number(data.updatedAt, Date.now()),
    }
  }

  private static migrateLegacy() {
    try {
      if (localStorage.getItem(INDEX_KEY) || !localStorage.getItem(LEGACY_KEY)) return
      const raw = localStorage.getItem(LEGACY_KEY)!
      const legacy = JSON.parse(raw) as LegacySave
      if (!legacy || (legacy.version !== 1 && legacy.version !== 2) || typeof legacy.seed !== 'string') return
      const now = Date.now()
      const id = `legacy-${now.toString(36)}`
      const save = this.createEmpty(id, 'Legacy World', legacy.seed, DEFAULT_WORLD_SETTINGS, now)
      save.generationVersion = 2
      save.position = this.position(legacy.position)
      save.spawn = { x: 0.5, y: 0, z: 0.5 }
      save.health = legacy.health ?? 100
      save.hunger = legacy.hunger ?? 100
      save.worldTime = legacy.worldTime ?? 180
      save.totalWorldTime = save.worldTime
      save.selectedItem = legacy.selectedItem && ITEM_IDS.includes(legacy.selectedItem) ? legacy.selectedItem : 'grass'
      const inventory = new InventorySystem({}).snapshot()
      if (legacy.version === 1) {
        for (const [block, count] of Object.entries(legacy.inventory ?? {})) {
          const item = LEGACY_ITEMS[Number(block) as BlockType]
          if (item) inventory[item] = this.number(count, 0)
        }
      } else {
        for (const item of ITEM_IDS) inventory[item] = this.number(legacy.inventory?.[item], 0)
      }
      save.inventory = inventory
      save.modifiedChunks = this.splitLegacyChanges(legacy.changes ?? {})
      if (this.save(save)) localStorage.setItem(`${LEGACY_KEY}:migrated`, raw)
    } catch (error) {
      this.error = `Legacy world migration failed; the original save was preserved: ${this.message(error)}`
    }
  }

  private static splitLegacyChanges(changes: BlockChanges): ModifiedChunks {
    const result: ModifiedChunks = {}
    for (const [key, type] of Object.entries(changes)) {
      const [x, y, z] = key.split(',').map(Number)
      if (![x, y, z, type].every(Number.isInteger)) continue
      const chunkX = blockChunk(x)
      const chunkZ = blockChunk(z)
      const keyForChunk = chunkKey(chunkX, chunkZ)
      result[keyForChunk] ??= {}
      result[keyForChunk][localBlockKey(localCoordinate(x, chunkX), y, localCoordinate(z, chunkZ))] = type
    }
    return result
  }

  private static modifiedChunks(value: ModifiedChunks | undefined) {
    if (!value || typeof value !== 'object') return {}
    const result: ModifiedChunks = {}
    for (const [key, changes] of Object.entries(value)) {
      if (!/^-?\d+,-?\d+$/.test(key) || !changes || typeof changes !== 'object') continue
      result[key] = Object.fromEntries(Object.entries(changes).filter(([local, type]) =>
        /^\d+,\d+,\d+$/.test(local) && Number.isInteger(type) && type >= BlockType.Air && type <= BlockType.Path,
      ))
    }
    return result
  }

  private static readIndex(): WorldSummary[] {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const index = JSON.parse(raw) as WorldIndex
    if (index.version !== 1 || !Array.isArray(index.worlds)) throw new Error('The world index is invalid.')
    return index.worlds
  }

  private static summary(data: SaveData): WorldSummary {
    return { id: data.id, name: data.name, seed: data.seed, settings: data.settings, createdAt: data.createdAt, updatedAt: data.updatedAt }
  }

  private static position(value: PlayerPosition | undefined): PlayerPosition {
    return value && [value.x, value.y, value.z].every(Number.isFinite) ? value : { x: 0.5, y: 0, z: 0.5 }
  }

  private static number(value: unknown, fallback: number) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback }
  private static stringArray(value: unknown) { return Array.isArray(value) ? [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))] : [] }
  private static message(error: unknown) { return error instanceof Error ? error.message : 'Unknown storage error.' }
}
