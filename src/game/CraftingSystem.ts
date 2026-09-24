import { RECIPES, type CraftingStation, type Recipe } from '../data/recipes'
import { InventorySystem } from './InventorySystem'

export class CraftingSystem {
  constructor(private readonly inventory: InventorySystem) {}

  recipesFor(station: CraftingStation) {
    return RECIPES.filter((recipe) => recipe.station === 'inventory' || station === 'table')
  }

  canCraft(recipe: Recipe) {
    return Object.entries(recipe.ingredients).every(([item, quantity]) =>
      this.inventory.has(item as Parameters<InventorySystem['has']>[0], quantity),
    )
  }

  craft(recipe: Recipe, station: CraftingStation) {
    if (!this.recipesFor(station).includes(recipe) || !this.canCraft(recipe)) return false
    for (const [item, quantity] of Object.entries(recipe.ingredients)) {
      this.inventory.remove(item as Parameters<InventorySystem['remove']>[0], quantity)
    }
    this.inventory.add(recipe.output.item, recipe.output.quantity)
    return true
  }
}
