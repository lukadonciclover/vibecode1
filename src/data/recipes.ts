import type { ItemId } from '../game/types'

export type CraftingStation = 'inventory' | 'table'

export interface Recipe {
  id: string
  name: string
  station: CraftingStation
  ingredients: Partial<Record<ItemId, number>>
  output: { item: ItemId; quantity: number }
}

export const RECIPES: Recipe[] = [
  { id: 'planks', name: 'Saw Wood Planks', station: 'inventory', ingredients: { wood_log: 1 }, output: { item: 'wood_planks', quantity: 4 } },
  { id: 'sticks', name: 'Cut Sticks', station: 'inventory', ingredients: { wood_planks: 2 }, output: { item: 'stick', quantity: 4 } },
  { id: 'crafting-table', name: 'Build Crafting Table', station: 'inventory', ingredients: { wood_planks: 4 }, output: { item: 'crafting_table', quantity: 1 } },
  { id: 'wooden-pickaxe', name: 'Wooden Pickaxe', station: 'table', ingredients: { wood_planks: 2, stick: 2 }, output: { item: 'wooden_pickaxe', quantity: 1 } },
  { id: 'wooden-axe', name: 'Wooden Axe', station: 'table', ingredients: { wood_planks: 2, stick: 2 }, output: { item: 'wooden_axe', quantity: 1 } },
  { id: 'wooden-shovel', name: 'Wooden Shovel', station: 'table', ingredients: { wood_planks: 1, stick: 2 }, output: { item: 'wooden_shovel', quantity: 1 } },
]
