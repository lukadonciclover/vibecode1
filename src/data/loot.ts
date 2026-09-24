import type { ItemId } from '../game/types'
import { hashInt, hashUnit } from '../game/world/hash'

export type LootTableId = 'cabin' | 'tower' | 'rare_ruin'

export interface LootTableEntry {
  item: ItemId
  min: number
  max: number
  weight: number
}

export interface LootTable {
  rolls: readonly [min: number, max: number]
  entries: readonly LootTableEntry[]
}

export interface LootStack {
  item: ItemId
  count: number
}

export const LOOT_TABLES: Readonly<Record<LootTableId, LootTable>> = {
  cabin: {
    rolls: [2, 4],
    entries: [
      { item: 'berry', min: 2, max: 6, weight: 28 },
      { item: 'wood_planks', min: 2, max: 5, weight: 24 },
      { item: 'stick', min: 2, max: 5, weight: 22 },
      { item: 'wooden_axe', min: 1, max: 1, weight: 8 },
      { item: 'wooden_shovel', min: 1, max: 1, weight: 8 },
      { item: 'copper_ore', min: 1, max: 2, weight: 10 },
    ],
  },
  tower: {
    rolls: [2, 4],
    entries: [
      { item: 'stone', min: 3, max: 8, weight: 24 },
      { item: 'stick', min: 3, max: 7, weight: 20 },
      { item: 'berry', min: 1, max: 4, weight: 18 },
      { item: 'copper_ore', min: 1, max: 3, weight: 18 },
      { item: 'wooden_pickaxe', min: 1, max: 1, weight: 12 },
      { item: 'silverstone', min: 1, max: 1, weight: 8 },
    ],
  },
  rare_ruin: {
    rolls: [3, 5],
    entries: [
      { item: 'copper_ore', min: 2, max: 5, weight: 28 },
      { item: 'silverstone', min: 1, max: 3, weight: 24 },
      { item: 'crystal_ore', min: 1, max: 2, weight: 12 },
      { item: 'stone', min: 4, max: 10, weight: 20 },
      { item: 'wooden_pickaxe', min: 1, max: 1, weight: 8 },
      { item: 'wooden_axe', min: 1, max: 1, weight: 8 },
    ],
  },
}

export function rollLoot(tableId: LootTableId, seed: string, x: number, y: number, z: number): LootStack[] {
  const table = LOOT_TABLES[tableId]
  const coordinateSalt = Math.imul(Math.floor(y), 15485863)
  const rollCount = hashInt(seed, x, z, 700 + coordinateSalt, table.rolls[0], table.rolls[1])
  const totalWeight = table.entries.reduce((total, entry) => total + entry.weight, 0)
  const totals = new Map<ItemId, number>()

  for (let roll = 0; roll < rollCount; roll += 1) {
    let target = hashUnit(seed, x, z, 710 + coordinateSalt + roll * 2) * totalWeight
    let selected = table.entries[table.entries.length - 1]
    for (const entry of table.entries) {
      target -= entry.weight
      if (target < 0) {
        selected = entry
        break
      }
    }
    const count = hashInt(seed, x, z, 711 + coordinateSalt + roll * 2, selected.min, selected.max)
    totals.set(selected.item, (totals.get(selected.item) ?? 0) + count)
  }

  return [...totals.entries()].map(([item, count]) => ({ item, count }))
}
