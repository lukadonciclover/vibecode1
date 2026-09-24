import type { CSSProperties, MouseEvent } from 'react'
import { ITEM_IDS, ITEMS } from '../data/items'
import type { ChestState, InventoryCounts, ItemId } from '../game/types'

export type ChestTransferDirection = 'to-chest' | 'to-player'
export type ChestTransferAmount = 'one' | 'half' | 'stack'

export interface ChestUIProps {
  chest: ChestState
  playerInventory: Partial<InventoryCounts>
  onTransfer: (item: ItemId, direction: ChestTransferDirection, amount: ChestTransferAmount) => void
  onClose?: () => void
  title?: string
}

interface ItemRowProps {
  item: ItemId
  count: number
  direction: ChestTransferDirection
  onTransfer: ChestUIProps['onTransfer']
}

function ItemRow({ item, count, direction, onTransfer }: ItemRowProps) {
  const destination = direction === 'to-chest' ? 'chest' : 'inventory'
  const transfer = (event: MouseEvent<HTMLButtonElement>) => {
    onTransfer(item, direction, event.shiftKey ? 'stack' : 'one')
  }

  return (
    <div className="chest-item">
      <span className="item-icon" style={{ '--item-color': ITEMS[item].color } as CSSProperties}>{ITEMS[item].icon}</span>
      <span className="chest-item__name">{ITEMS[item].name}</span>
      <strong>{count}</strong>
      <button type="button" onClick={() => onTransfer(item, direction, 'half')} disabled={count < 2} aria-label={`Move half of ${ITEMS[item].name} to ${destination}`}>Half</button>
      <button type="button" onClick={transfer} title="Hold Shift to move the full stack" aria-label={`Move ${ITEMS[item].name} to ${destination}`}>Move</button>
    </div>
  )
}

export function ChestUI({ chest, playerInventory, onTransfer, onClose, title = 'Chest' }: ChestUIProps) {
  const chestItems = ITEM_IDS.filter((item) => (chest.items[item] ?? 0) > 0)
  const playerItems = ITEM_IDS.filter((item) => (playerInventory[item] ?? 0) > 0)

  return (
    <section className="chest-ui" role="dialog" aria-modal="true" aria-labelledby="chest-title">
      <header className="chest-ui__header">
        <div>
          <span className="eyebrow">Storage</span>
          <h2 id="chest-title">{title}</h2>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Close chest">Close</button>}
      </header>

      <div className="chest-ui__layout">
        <section className="chest-ui__section" aria-labelledby="chest-contents-title">
          <div className="chest-ui__section-heading">
            <h3 id="chest-contents-title">Chest</h3>
            <span>{chestItems.length} / {chest.capacity} stacks</span>
          </div>
          <div className="chest-ui__items">
            {chestItems.length === 0 && <p className="chest-ui__empty">This chest is empty.</p>}
            {chestItems.map((item) => <ItemRow item={item} count={chest.items[item] ?? 0} direction="to-player" onTransfer={onTransfer} key={item} />)}
          </div>
        </section>

        <section className="chest-ui__section" aria-labelledby="player-inventory-title">
          <div className="chest-ui__section-heading">
            <h3 id="player-inventory-title">Inventory</h3>
            <span>Hold Shift for full stack</span>
          </div>
          <div className="chest-ui__items">
            {playerItems.length === 0 && <p className="chest-ui__empty">Your inventory is empty.</p>}
            {playerItems.map((item) => <ItemRow item={item} count={playerInventory[item] ?? 0} direction="to-chest" onTransfer={onTransfer} key={item} />)}
          </div>
        </section>
      </div>
    </section>
  )
}
