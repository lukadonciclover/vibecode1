import type { CSSProperties } from 'react'
import { CREATIVE_ITEMS, ITEMS, type ItemType } from '../data/items'
import type { ItemId } from '../game/types'

export type CreativeCategory = 'all' | ItemType
export type CreativeTakeAmount = 1 | 'stack'

export interface CreativeInventoryProps {
  query: string
  category: CreativeCategory
  onQueryChange: (query: string) => void
  onCategoryChange: (category: CreativeCategory) => void
  onTakeItem: (item: ItemId, amount: CreativeTakeAmount) => void
  onClose?: () => void
  items?: readonly ItemId[]
}

const CATEGORIES: readonly { id: CreativeCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'block', label: 'Blocks' },
  { id: 'material', label: 'Materials' },
  { id: 'tool', label: 'Tools' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'food', label: 'Food' },
  { id: 'armor', label: 'Armor' },
  { id: 'utility', label: 'Utility' },
]

export function CreativeInventory({
  query,
  category,
  onQueryChange,
  onCategoryChange,
  onTakeItem,
  onClose,
  items = CREATIVE_ITEMS,
}: CreativeInventoryProps) {
  const normalizedQuery = query.trim().toLowerCase()
  const filteredItems = items.filter((item) => {
    const definition = ITEMS[item]
    const inCategory = category === 'all' || definition.type === category
    const matchesQuery = !normalizedQuery
      || definition.name.toLowerCase().includes(normalizedQuery)
      || definition.description.toLowerCase().includes(normalizedQuery)
      || definition.id.includes(normalizedQuery)
    return inCategory && matchesQuery
  })

  return (
    <section className="creative-inventory" role="dialog" aria-modal="true" aria-labelledby="creative-inventory-title">
      <header className="creative-inventory__header">
        <div>
          <span className="eyebrow">Creative catalog</span>
          <h2 id="creative-inventory-title">All items</h2>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Close creative inventory">Close</button>}
      </header>

      <div className="creative-inventory__tools">
        <label className="creative-inventory__search">
          <span>Search catalog</span>
          <input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search items..." />
        </label>
        <div className="creative-inventory__categories" role="tablist" aria-label="Item category">
          {CATEGORIES.map((candidate) => (
            <button
              className={category === candidate.id ? 'is-active' : undefined}
              type="button"
              role="tab"
              aria-selected={category === candidate.id}
              onClick={() => onCategoryChange(candidate.id)}
              key={candidate.id}
            >
              {candidate.label}
            </button>
          ))}
        </div>
      </div>

      <div className="creative-inventory__grid">
        {filteredItems.length === 0 && <p className="creative-inventory__empty">No items match this search.</p>}
        {filteredItems.map((item) => {
          const definition = ITEMS[item]
          return (
            <article className="creative-item" key={item}>
              <span className="item-icon is-large" style={{ '--item-color': definition.color } as CSSProperties}>{definition.icon}</span>
              <div className="creative-item__copy">
                <strong>{definition.name}</strong>
                <small>{definition.description}</small>
              </div>
              <div className="creative-item__actions">
                <button type="button" onClick={() => onTakeItem(item, 1)} aria-label={`Take one ${definition.name}`}>+1</button>
                <button type="button" onClick={() => onTakeItem(item, 'stack')} aria-label={`Take a stack of ${definition.name}`}>+{definition.stackSize}</button>
              </div>
            </article>
          )
        })}
      </div>
      <footer className="creative-inventory__footer">{filteredItems.length} of {items.length} items</footer>
    </section>
  )
}
