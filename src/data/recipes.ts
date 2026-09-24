import type { ItemId } from '../game/types'

export type CraftingStation = 'inventory' | 'table'
export type RecipeCategory = 'tools' | 'weapons' | 'blocks' | 'food' | 'utility' | 'armor'
export interface Recipe { id: string; name: string; station: CraftingStation; category: RecipeCategory; ingredients: Partial<Record<ItemId, number>>; output: { item: ItemId; quantity: number } }

const recipe = (id: string, name: string, station: CraftingStation, category: RecipeCategory, ingredients: Partial<Record<ItemId, number>>, item: ItemId, quantity = 1): Recipe =>
  ({ id, name, station, category, ingredients, output: { item, quantity } })

export const RECIPES: Recipe[] = [
  recipe('planks', 'Saw Wood Planks', 'inventory', 'blocks', { wood_log: 1 }, 'wood_planks', 4),
  recipe('sticks', 'Cut Sticks', 'inventory', 'utility', { wood_planks: 2 }, 'stick', 4),
  recipe('crafting-table', 'Build Crafting Table', 'inventory', 'utility', { wood_planks: 4 }, 'crafting_table'),
  recipe('torch', 'Bind Torches', 'inventory', 'utility', { stick: 1, coal: 1 }, 'torch', 4),
  recipe('wood-pickaxe', 'Wood Pickaxe', 'table', 'tools', { wood_planks: 3, stick: 2 }, 'wooden_pickaxe'),
  recipe('wood-axe', 'Wood Axe', 'table', 'tools', { wood_planks: 3, stick: 2 }, 'wooden_axe'),
  recipe('wood-shovel', 'Wood Shovel', 'table', 'tools', { wood_planks: 1, stick: 2 }, 'wooden_shovel'),
  recipe('wood-sword', 'Wood Sword', 'table', 'weapons', { wood_planks: 2, stick: 1 }, 'wooden_sword'),
  recipe('furnace', 'Furnace', 'table', 'utility', { stone: 8 }, 'furnace'),
  recipe('chest', 'Storage Chest', 'table', 'utility', { wood_planks: 8 }, 'chest'),
  recipe('fence', 'Fence', 'table', 'blocks', { wood_planks: 4, stick: 2 }, 'fence', 3),
  recipe('door', 'Door', 'table', 'blocks', { wood_planks: 6 }, 'door'),
  recipe('bed', 'Bed', 'table', 'utility', { wood_planks: 3, leather: 3 }, 'bed'),
  recipe('bread', 'Sungrain Bread', 'table', 'food', { wheat: 3 }, 'bread'),
  ...(['pickaxe', 'axe', 'shovel', 'sword'] as const).flatMap((kind) => [
    recipe(`stone-${kind}`, `Stone ${kind}`, 'table', kind === 'sword' ? 'weapons' : 'tools', { stone: kind === 'shovel' ? 1 : kind === 'sword' ? 2 : 3, stick: 2 }, `stone_${kind}` as ItemId),
    recipe(`copper-${kind}`, `Copper ${kind}`, 'table', kind === 'sword' ? 'weapons' : 'tools', { copper_ingot: kind === 'shovel' ? 1 : kind === 'sword' ? 2 : 3, stick: 2 }, `copper_${kind}` as ItemId),
    recipe(`steel-${kind}`, `Steel ${kind}`, 'table', kind === 'sword' ? 'weapons' : 'tools', { steel_ingot: kind === 'shovel' ? 1 : kind === 'sword' ? 2 : 3, stick: 2 }, `steel_${kind}` as ItemId),
  ]),
  ...(['helmet', 'chestplate', 'leggings', 'boots'] as const).flatMap((piece, index) => {
    const amount = [5, 8, 7, 4][index]
    return [
      recipe(`leather-${piece}`, `Hide ${piece}`, 'table', 'armor', { leather: amount }, `leather_${piece}` as ItemId),
      recipe(`copper-${piece}`, `Copper ${piece}`, 'table', 'armor', { copper_ingot: amount }, `copper_${piece}` as ItemId),
      recipe(`steel-${piece}`, `Steel ${piece}`, 'table', 'armor', { steel_ingot: amount }, `steel_${piece}` as ItemId),
    ]
  }),
]
