import { BLOCKS } from '../data/blocks'
import { TOOLS } from '../data/tools'
import type { BlockType, ItemId } from './types'

export class ToolSystem {
  static miningDuration(block: BlockType, selectedItem: ItemId) {
    if (block === 0) return 0
    const tool = TOOLS[selectedItem]
    const multiplier = tool?.effectiveBlockTypes.includes(block) ? tool.miningSpeedMultiplier : 1
    return BLOCKS[block].hardness / multiplier
  }

  static attackDamage(selectedItem: ItemId) {
    return TOOLS[selectedItem]?.attackDamage ?? 5
  }
}
