import { ITEM_IDS } from '../data/items'
import type { InventoryCounts, ItemId } from './types'

const STARTING_ITEMS: Partial<Record<ItemId, number>> = {
  grass: 24,
  dirt: 24,
  stone: 24,
  sand: 24,
  wood_log: 24,
  leaves: 24,
}

export class InventorySystem {
  private readonly counts: InventoryCounts

  constructor(initial?: Partial<InventoryCounts>) {
    this.counts = Object.fromEntries(ITEM_IDS.map((item) => [item, Math.max(0, Math.floor(initial?.[item] ?? STARTING_ITEMS[item] ?? 0))])) as InventoryCounts
  }

  add(item: ItemId, quantity = 1) {
    if (quantity <= 0) return
    this.counts[item] += Math.floor(quantity)
  }

  remove(item: ItemId, quantity = 1) {
    if (quantity <= 0 || this.counts[item] < quantity) return false
    this.counts[item] -= Math.floor(quantity)
    return true
  }

  has(item: ItemId, quantity = 1) {
    return this.counts[item] >= quantity
  }

  snapshot(): InventoryCounts {
    return { ...this.counts }
  }
}
