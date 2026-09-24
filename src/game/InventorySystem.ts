import { BlockType, PLACEABLE_BLOCKS, type InventoryCounts, type PlaceableBlock } from './types'

const STARTING_QUANTITY = 24

export class InventorySystem {
  private readonly counts: InventoryCounts

  constructor(initial?: InventoryCounts) {
    this.counts = initial
      ? { ...initial }
      : PLACEABLE_BLOCKS.reduce((counts, type) => {
          counts[type] = STARTING_QUANTITY
          return counts
        }, {} as InventoryCounts)
  }

  add(type: BlockType, quantity = 1) {
    if (type === BlockType.Air) return
    this.counts[type as PlaceableBlock] += quantity
  }

  remove(type: PlaceableBlock, quantity = 1) {
    if (this.counts[type] < quantity) return false
    this.counts[type] -= quantity
    return true
  }

  has(type: PlaceableBlock) {
    return this.counts[type] > 0
  }

  snapshot(): InventoryCounts {
    return { ...this.counts }
  }
}
