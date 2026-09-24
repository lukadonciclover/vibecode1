import { ITEMS } from '../../data/items'
import { rollLoot, type LootTableId } from '../../data/loot'
import { InventorySystem } from '../InventorySystem'
import type { BlockEntity, ChestState, ItemId } from '../types'

export const chestKey = (x: number, y: number, z: number) => `${x},${y},${z}`

export class ChestSystem {
  private readonly chests: Record<string, ChestState> = {}

  constructor(private readonly inventory: InventorySystem, initial: Record<string, BlockEntity> = {}) {
    for (const [key, entity] of Object.entries(initial)) {
      if (entity.type === 'chest') this.chests[key] = { ...entity, items: { ...entity.items } }
    }
  }

  create(x: number, y: number, z: number, loot?: { table: LootTableId; seed: string }) {
    const key = chestKey(x, y, z)
    if (!this.chests[key]) {
      const items: Partial<Record<ItemId, number>> = {}
      if (loot) for (const stack of rollLoot(loot.table, loot.seed, x, y, z)) items[stack.item] = (items[stack.item] ?? 0) + stack.count
      this.chests[key] = { type: 'chest', items, capacity: 27, lootTable: loot?.table, lootClaimed: Boolean(loot) }
    }
    return this.get(x, y, z)!
  }

  get(x: number, y: number, z: number) {
    const chest = this.chests[chestKey(x, y, z)]
    return chest ? { ...chest, items: { ...chest.items } } : null
  }

  transferToChest(x: number, y: number, z: number, item: ItemId, quantity: number) {
    if (ITEMS[item].durability) return 0
    const chest = this.chests[chestKey(x, y, z)]
    if (!chest) return 0
    const occupied = Object.values(chest.items).filter((count) => (count ?? 0) > 0).length
    const current = chest.items[item] ?? 0
    if (current === 0 && occupied >= chest.capacity) return 0
    const moved = Math.min(Math.max(0, Math.floor(quantity)), ITEMS[item].stackSize - current, this.inventory.snapshot()[item])
    if (moved <= 0 || !this.inventory.remove(item, moved)) return 0
    chest.items[item] = current + moved
    return moved
  }

  transferToPlayer(x: number, y: number, z: number, item: ItemId, quantity: number) {
    const chest = this.chests[chestKey(x, y, z)]
    const current = chest?.items[item] ?? 0
    const moved = Math.min(current, Math.max(0, Math.floor(quantity)))
    if (!chest || moved <= 0) return 0
    this.inventory.add(item, moved)
    chest.items[item] = current - moved
    if (chest.items[item] === 0) delete chest.items[item]
    return moved
  }

  remove(x: number, y: number, z: number) {
    const key = chestKey(x, y, z)
    const chest = this.chests[key]
    if (!chest) return false
    for (const [item, count] of Object.entries(chest.items)) this.inventory.add(item as ItemId, count ?? 0)
    delete this.chests[key]
    return true
  }

  snapshot(): Record<string, ChestState> {
    return Object.fromEntries(Object.entries(this.chests).map(([key, chest]) => [key, { ...chest, items: { ...chest.items } }]))
  }
}
