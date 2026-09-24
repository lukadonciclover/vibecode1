import { BLOCK_INFO, PLACEABLE_BLOCKS, type InventoryCounts } from '../game/types'

interface InventoryProps {
  inventory: InventoryCounts
  onClose: () => void
}

export function Inventory({ inventory, onClose }: InventoryProps) {
  return (
    <div className="inventory-backdrop" role="dialog" aria-modal="true" aria-label="Inventory">
      <section className="inventory-panel">
        <header>
          <div>
            <span className="eyebrow">Field pack</span>
            <h2>Inventory</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close inventory">E</button>
        </header>
        <div className="inventory-grid">
          {PLACEABLE_BLOCKS.map((type) => (
            <div className="inventory-item" key={type}>
              <span
                className="block-swatch is-large"
                style={{ '--block-top': BLOCK_INFO[type].color, '--block-side': BLOCK_INFO[type].side } as React.CSSProperties}
              />
              <span>{BLOCK_INFO[type].label}</span>
              <strong>{inventory[type]}</strong>
            </div>
          ))}
        </div>
        <p>Break blocks to collect them. Place blocks from the active hotbar slot.</p>
      </section>
    </div>
  )
}
