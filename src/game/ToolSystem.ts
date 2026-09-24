import { BLOCKS } from '../data/blocks'
import { ITEMS } from '../data/items'
import { TOOLS } from '../data/tools'
import { BlockType, type ItemId } from './types'

export interface HarvestResult { allowed: boolean; slow: boolean }

export class ToolSystem {
  static miningDuration(block: BlockType, selectedItem: ItemId, creative = false) {
    if (block === BlockType.Air || creative) return 0
    const definition = BLOCKS[block]
    const tool = TOOLS[selectedItem]
    const matching = tool && definition.preferredTool === tool.toolType
    const multiplier = matching ? tool.miningSpeedMultiplier : 1
    const tierPenalty = this.canHarvest(block, selectedItem).slow ? 2.75 : 1
    return definition.hardness * tierPenalty / multiplier
  }

  static canHarvest(block: BlockType, selectedItem: ItemId): HarvestResult {
    if (block === BlockType.Air) return { allowed: false, slow: false }
    const definition = BLOCKS[block]
    if (!definition.requiredTier) return { allowed: true, slow: false }
    const tool = TOOLS[selectedItem]
    const allowed = tool?.toolType === definition.preferredTool && (tool?.tier ?? 0) >= definition.requiredTier
    return { allowed: Boolean(allowed), slow: !allowed }
  }

  static attackDamage(selectedItem: ItemId) {
    return ITEMS[selectedItem].attackDamage ?? 5
  }

  static isTool(item: ItemId) {
    return Boolean(TOOLS[item])
  }
}
