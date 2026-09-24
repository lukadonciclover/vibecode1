import { ITEM_IDS, ITEMS } from '../data/items'
import type { InventoryCounts, InventoryDurability, ItemId } from './types'

const SURVIVAL_START: Partial<Record<ItemId, number>> = {
  grass: 12, dirt: 12, wood_log: 8, berry: 4,
}

export class InventorySystem {
  private readonly counts: InventoryCounts
  private readonly durability: InventoryDurability
  private creative = false

  constructor(initial?: Partial<InventoryCounts>, initialDurability: InventoryDurability = {}, creative = false) {
    this.creative = creative
    this.counts = Object.fromEntries(ITEM_IDS.map((item) => [item, Math.max(0, Math.floor(initial?.[item] ?? (initial ? 0 : SURVIVAL_START[item] ?? 0)))])) as InventoryCounts
    this.durability = {}
    for (const item of ITEM_IDS) {
      const maximum = ITEMS[item].durability
      if (!maximum) continue
      const supplied = initialDurability[item]?.filter((value) => Number.isFinite(value) && value > 0).map((value) => Math.min(maximum, value)) ?? []
      while (supplied.length < this.counts[item]) supplied.push(maximum)
      this.durability[item] = supplied.slice(0, this.counts[item])
    }
  }

  setCreative(creative: boolean) {
    this.creative = creative
  }

  add(item: ItemId, quantity = 1) {
    const amount = Math.max(0, Math.floor(quantity))
    if (amount === 0) return
    this.counts[item] += amount
    const maximum = ITEMS[item].durability
    if (maximum) {
      const values = this.durability[item] ??= []
      for (let index = 0; index < amount; index += 1) values.push(maximum)
    }
  }

  remove(item: ItemId, quantity = 1) {
    if (this.creative) return true
    const amount = Math.max(0, Math.floor(quantity))
    if (amount === 0 || this.counts[item] < amount) return false
    this.counts[item] -= amount
    this.durability[item]?.splice(0, amount)
    return true
  }

  has(item: ItemId, quantity = 1) {
    return this.creative || this.counts[item] >= quantity
  }

  damageItem(item: ItemId, amount = 1) {
    if (this.creative || !ITEMS[item].durability || !this.has(item)) return { used: false, broken: false }
    const values = this.durability[item] ??= [ITEMS[item].durability!]
    values[0] -= Math.max(1, amount)
    if (values[0] > 0) return { used: true, broken: false }
    values.shift()
    this.counts[item] = Math.max(0, this.counts[item] - 1)
    return { used: true, broken: true }
  }

  getDurability(item: ItemId) {
    return this.durability[item]?.[0] ?? null
  }

  transferTo(target: InventorySystem, item: ItemId, quantity: number) {
    const amount = Math.min(this.counts[item], Math.max(0, Math.floor(quantity)))
    if (amount === 0 || !this.remove(item, amount)) return false
    target.add(item, amount)
    return true
  }

  snapshot(): InventoryCounts {
    return { ...this.counts }
  }

  durabilitySnapshot(): InventoryDurability {
    return Object.fromEntries(Object.entries(this.durability).map(([item, values]) => [item, [...values]])) as InventoryDurability
  }
}
