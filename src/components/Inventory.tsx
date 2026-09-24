import { ITEM_IDS, ITEMS } from '../data/items'
import type { CraftingStation, Recipe } from '../data/recipes'
import type { InventoryCounts } from '../game/types'
import { CraftingPanel } from './CraftingPanel'

interface InventoryProps {
  inventory: InventoryCounts
  station: CraftingStation
  recipes: Recipe[]
  canCraft: (recipe: Recipe) => boolean
  onCraft: (recipe: Recipe) => void
  onClose: () => void
}

export function Inventory({ inventory, station, recipes, canCraft, onCraft, onClose }: InventoryProps) {
  return (
    <div className="inventory-backdrop" role="dialog" aria-modal="true" aria-label="Inventory and crafting">
      <section className={`inventory-panel ${station === 'table' ? 'is-expanded' : ''}`}>
        <header>
          <div>
            <span className="eyebrow">{station === 'table' ? 'Workbench open' : 'Field pack'}</span>
            <h2>Inventory</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close inventory">E</button>
        </header>
        <div className="inventory-layout">
          <div className="inventory-grid">
            {ITEM_IDS.filter((item) => inventory[item] > 0).map((item) => (
              <div className="inventory-item" key={item}>
                <span className="item-icon is-large" style={{ '--item-color': ITEMS[item].color } as React.CSSProperties}>{ITEMS[item].icon}</span>
                <span>{ITEMS[item].name}</span>
                <strong>{inventory[item]}</strong>
              </div>
            ))}
          </div>
          <CraftingPanel station={station} recipes={recipes} inventory={inventory} canCraft={canCraft} onCraft={onCraft} />
        </div>
      </section>
    </div>
  )
}
