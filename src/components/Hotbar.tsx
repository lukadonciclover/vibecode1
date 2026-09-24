import { BLOCK_INFO, PLACEABLE_BLOCKS, type InventoryCounts, type PlaceableBlock } from '../game/types'

interface HotbarProps {
  selected: PlaceableBlock
  inventory: InventoryCounts
  onSelect: (type: PlaceableBlock) => void
}

export function Hotbar({ selected, inventory, onSelect }: HotbarProps) {
  return (
    <div className="hotbar" aria-label="Block hotbar">
      {PLACEABLE_BLOCKS.map((type, index) => (
        <button
          className={`hotbar-slot ${selected === type ? 'is-selected' : ''}`}
          key={type}
          onClick={() => onSelect(type)}
          title={`${index + 1}: ${BLOCK_INFO[type].label}`}
          type="button"
        >
          <span className="slot-key">{index + 1}</span>
          <span
            className="block-swatch"
            style={{ '--block-top': BLOCK_INFO[type].color, '--block-side': BLOCK_INFO[type].side } as React.CSSProperties}
          />
          <strong>{inventory[type]}</strong>
        </button>
      ))}
    </div>
  )
}
