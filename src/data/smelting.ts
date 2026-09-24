import type { ItemId } from '../game/types'

export interface SmeltingRecipe { input: ItemId; output: ItemId; duration: number }
export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { input: 'copper_ore', output: 'copper_ingot', duration: 8 },
  { input: 'silverstone', output: 'refined_silverstone', duration: 11 },
  { input: 'crystal_ore', output: 'crystal_shard', duration: 15 },
  { input: 'raw_meat', output: 'cooked_meat', duration: 7 },
  { input: 'refined_silverstone', output: 'steel_ingot', duration: 14 },
]
export const FUEL_VALUES: Partial<Record<ItemId, number>> = { wood_log: 8, wood_planks: 4, coal: 24 }
