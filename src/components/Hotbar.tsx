import { HOTBAR_ITEMS, ITEMS } from '../data/items'
import type { InventoryCounts, ItemId } from '../game/types'

interface HotbarProps {
  selected: ItemId
  inventory: InventoryCounts
  onSelect: (item: ItemId) => void
}

export function Hotbar({ selected, inventory, onSelect }: HotbarProps) {
  return (
    <div className="hotbar" aria-label="Item hotbar">
      {HOTBAR_ITEMS.map((item, index) => (
        <button
          className={`hotbar-slot ${selected === item ? 'is-selected' : ''}`}
          key={item}
          onClick={() => onSelect(item)}
          title={`${index === 9 ? 0 : index + 1}: ${ITEMS[item].name}`}
          type="button"
        >
          <span className="slot-key">{index === 9 ? 0 : index + 1}</span>
          <span className="item-icon" style={{ '--item-color': ITEMS[item].color } as React.CSSProperties}>{ITEMS[item].icon}</span>
          <strong>{inventory[item] || ''}</strong>
        </button>
      ))}
    </div>
  )
}
