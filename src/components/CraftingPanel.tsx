import { useState } from 'react'
import { ITEMS } from '../data/items'
import type { CraftingStation, Recipe, RecipeCategory } from '../data/recipes'
import type { InventoryCounts } from '../game/types'

interface CraftingPanelProps {
  station: CraftingStation
  recipes: Recipe[]
  inventory: InventoryCounts
  canCraft: (recipe: Recipe) => boolean
  onCraft: (recipe: Recipe) => void
}

export function CraftingPanel({ station, recipes, inventory, canCraft, onCraft }: CraftingPanelProps) {
  const categories = [...new Set(recipes.map((recipe) => recipe.category))]
  const [category, setCategory] = useState<RecipeCategory | 'all'>('all')
  const visibleRecipes = category === 'all' ? recipes : recipes.filter((recipe) => recipe.category === category)

  return (
    <section className="crafting-panel">
      <div className="crafting-heading">
        <span className="eyebrow">{station === 'table' ? 'Crafting table' : 'Field crafting'}</span>
        <h3>Recipes</h3>
      </div>
      <div className="crafting-categories" role="tablist" aria-label="Recipe category">
        {(['all', ...categories] as const).map((candidate) => (
          <button
            className={category === candidate ? 'is-active' : undefined}
            type="button"
            role="tab"
            aria-selected={category === candidate}
            onClick={() => setCategory(candidate)}
            key={candidate}
          >
            {candidate}
          </button>
        ))}
      </div>
      <div className="recipe-list">
        {visibleRecipes.map((recipe) => {
          const available = canCraft(recipe)
          const ingredients = Object.entries(recipe.ingredients)
            .map(([item, quantity]) => `${quantity} ${ITEMS[item as keyof typeof ITEMS].name}`)
            .join(' + ')
          return (
            <button type="button" className="recipe" disabled={!available} onClick={() => onCraft(recipe)} key={recipe.id}>
              <span className="item-icon" style={{ '--item-color': ITEMS[recipe.output.item].color } as React.CSSProperties}>{ITEMS[recipe.output.item].icon}</span>
              <span><strong>{recipe.name}</strong><small>{ingredients}</small></span>
              <b>{available ? `Make ${recipe.output.quantity}` : 'Missing'}</b>
            </button>
          )
        })}
      </div>
      {station === 'inventory' && <p className="table-note">Place a Crafting Table and aim at it while pressing F to make tools.</p>}
      <span className="inventory-total" aria-hidden="true">{Object.values(inventory).reduce((sum, count) => sum + count, 0)} items</span>
    </section>
  )
}
