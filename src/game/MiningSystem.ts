import { ToolSystem } from './ToolSystem'
import type { BlockType, ItemId } from './types'

export interface MiningTarget {
  key: string
  type: BlockType
}

export class MiningSystem {
  private target: MiningTarget | null = null
  private elapsed = 0
  private duration = 0
  private selectedItem: ItemId | null = null

  begin(target: MiningTarget, selectedItem: ItemId) {
    if (this.target?.key === target.key && this.selectedItem === selectedItem) return
    this.target = target
    this.selectedItem = selectedItem
    this.elapsed = 0
    this.duration = ToolSystem.miningDuration(target.type, selectedItem)
  }

  update(delta: number, target: MiningTarget | null, selectedItem: ItemId) {
    if (!target) {
      this.cancel()
      return false
    }
    if (this.target?.key !== target.key || this.selectedItem !== selectedItem) this.begin(target, selectedItem)
    this.elapsed += delta
    return this.elapsed >= this.duration
  }

  cancel() {
    this.target = null
    this.elapsed = 0
    this.duration = 0
    this.selectedItem = null
  }

  get progress() {
    return this.target && this.duration > 0 ? Math.min(1, this.elapsed / this.duration) : 0
  }
}
