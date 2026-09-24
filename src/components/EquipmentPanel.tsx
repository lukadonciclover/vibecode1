import type { CSSProperties } from 'react'
import { ITEM_IDS, ITEMS } from '../data/items'
import type { ArmorSlot, Equipment, InventoryCounts, ItemId } from '../game/types'

export type EquipmentSlot = ArmorSlot | 'offhand'

export interface EquipmentPanelProps {
  equipment: Equipment
  inventory: Partial<InventoryCounts>
  onEquip: (slot: EquipmentSlot, item: ItemId) => void
  onUnequip: (slot: EquipmentSlot) => void
  disabled?: boolean
  title?: string
}

const SLOTS: readonly { id: EquipmentSlot; label: string }[] = [
  { id: 'head', label: 'Head' },
  { id: 'chest', label: 'Chest' },
  { id: 'legs', label: 'Legs' },
  { id: 'feet', label: 'Feet' },
  { id: 'offhand', label: 'Offhand' },
]

export function EquipmentPanel({ equipment, inventory, onEquip, onUnequip, disabled = false, title = 'Equipment' }: EquipmentPanelProps) {
  const armor = (['head', 'chest', 'legs', 'feet'] as const).reduce((total, slot) => {
    const item = equipment[slot]
    return total + (item ? ITEMS[item].armorValue ?? 0 : 0)
  }, 0)

  return (
    <section className="equipment-panel" aria-labelledby="equipment-title">
      <header className="equipment-panel__header">
        <div>
          <span className="eyebrow">Loadout</span>
          <h2 id="equipment-title">{title}</h2>
        </div>
        <strong>{armor} armor</strong>
      </header>

      <div className="equipment-panel__slots">
        {SLOTS.map((slot) => {
          const equipped = equipment[slot.id]
          const candidates = ITEM_IDS.filter((item) => {
            if ((inventory[item] ?? 0) <= 0 && item !== equipped) return false
            return slot.id === 'offhand' ? ITEMS[item].type !== 'armor' && !ITEMS[item].durability : ITEMS[item].armorSlot === slot.id
          })
          return (
            <div className={`equipment-slot${equipped ? ' is-equipped' : ''}`} key={slot.id}>
              <div className="equipment-slot__item">
                {equipped ? (
                  <span className="item-icon" style={{ '--item-color': ITEMS[equipped].color } as CSSProperties}>{ITEMS[equipped].icon}</span>
                ) : <span className="equipment-slot__empty" aria-hidden="true">-</span>}
                <span>
                  <small>{slot.label}</small>
                  <strong>{equipped ? ITEMS[equipped].name : 'Empty'}</strong>
                </span>
              </div>
              <select
                value={equipped ?? ''}
                disabled={disabled}
                aria-label={`${slot.label} equipment`}
                onChange={(event) => {
                  const item = event.target.value as ItemId
                  if (item) onEquip(slot.id, item)
                  else onUnequip(slot.id)
                }}
              >
                <option value="">Empty</option>
                {candidates.map((item) => <option value={item} key={item}>{ITEMS[item].name} ({inventory[item] ?? 0})</option>)}
              </select>
              {equipped && <button type="button" disabled={disabled} onClick={() => onUnequip(slot.id)}>Unequip</button>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
