import type { CSSProperties, MouseEvent } from 'react'
import { ITEMS } from '../data/items'
import { FUEL_VALUES, SMELTING_RECIPES } from '../data/smelting'
import type { FurnaceState, ItemStack } from '../game/types'

export type FurnaceSlot = 'input' | 'fuel' | 'output'
export type FurnaceSlotAction = 'insert' | 'take'
export type FurnaceTransferAmount = 'one' | 'half' | 'stack'

export interface FurnaceUIProps {
  furnace: FurnaceState
  onSlotAction: (slot: FurnaceSlot, action: FurnaceSlotAction, amount: FurnaceTransferAmount) => void
  onClose?: () => void
  canInsertInput?: boolean
  canInsertFuel?: boolean
}

function ItemSlot({ stack, label }: { stack: ItemStack | null; label: string }) {
  return (
    <div className={`furnace-slot${stack ? ' is-filled' : ''}`} aria-label={`${label}: ${stack ? `${stack.count} ${ITEMS[stack.item].name}` : 'empty'}`}>
      {stack ? (
        <>
          <span className="item-icon" style={{ '--item-color': ITEMS[stack.item].color } as CSSProperties}>{ITEMS[stack.item].icon}</span>
          <strong>{stack.count}</strong>
          <small>{ITEMS[stack.item].name}</small>
        </>
      ) : <span className="furnace-slot__empty">{label}</span>}
    </div>
  )
}

export function FurnaceUI({ furnace, onSlotAction, onClose, canInsertInput = true, canInsertFuel = true }: FurnaceUIProps) {
  const recipe = furnace.input ? SMELTING_RECIPES.find((candidate) => candidate.input === furnace.input?.item) : undefined
  const smeltMaximum = recipe?.duration ?? 1
  const smeltProgress = Math.max(0, Math.min(furnace.progress, smeltMaximum))
  const fuelMaximum = furnace.fuel ? (FUEL_VALUES[furnace.fuel.item] ?? Math.max(1, furnace.fuelRemaining)) : Math.max(1, furnace.fuelRemaining)
  const fuelProgress = Math.max(0, Math.min(furnace.fuelRemaining, fuelMaximum))
  const shiftedAmount = (event: MouseEvent<HTMLButtonElement>): FurnaceTransferAmount => event.shiftKey ? 'stack' : 'one'

  return (
    <section className="furnace-ui" role="dialog" aria-modal="true" aria-labelledby="furnace-title">
      <header className="furnace-ui__header">
        <div>
          <span className="eyebrow">Smelting station</span>
          <h2 id="furnace-title">Furnace</h2>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Close furnace">Close</button>}
      </header>

      <div className="furnace-ui__process">
        <div className="furnace-ui__column">
          <ItemSlot stack={furnace.input} label="Input" />
          <div className="furnace-ui__slot-actions">
            <button type="button" disabled={!canInsertInput} onClick={(event) => onSlotAction('input', 'insert', shiftedAmount(event))} title="Hold Shift to insert a full stack">Insert</button>
            <button type="button" disabled={!furnace.input} onClick={(event) => onSlotAction('input', 'take', shiftedAmount(event))} title="Hold Shift to take the full stack">Take</button>
            <button type="button" disabled={!furnace.input || furnace.input.count < 2} onClick={() => onSlotAction('input', 'take', 'half')}>Half</button>
          </div>
        </div>

        <div className="furnace-ui__meters">
          <div className="furnace-ui__meter">
            <span>Heat</span>
            <div role="progressbar" aria-label="Fuel remaining" aria-valuemin={0} aria-valuemax={fuelMaximum} aria-valuenow={fuelProgress}>
              <i style={{ width: `${(fuelProgress / fuelMaximum) * 100}%` }} />
            </div>
          </div>
          <span className="furnace-ui__flame" aria-hidden="true">Fire</span>
          <div className="furnace-ui__meter">
            <span>{recipe ? `${ITEMS[recipe.output].name} progress` : 'No valid recipe'}</span>
            <div role="progressbar" aria-label="Smelting progress" aria-valuemin={0} aria-valuemax={smeltMaximum} aria-valuenow={smeltProgress}>
              <i style={{ width: `${(smeltProgress / smeltMaximum) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="furnace-ui__column">
          <ItemSlot stack={furnace.output} label="Output" />
          <div className="furnace-ui__slot-actions">
            <button type="button" disabled={!furnace.output} onClick={(event) => onSlotAction('output', 'take', shiftedAmount(event))} title="Hold Shift to collect the full stack">Collect</button>
            <button type="button" disabled={!furnace.output || furnace.output.count < 2} onClick={() => onSlotAction('output', 'take', 'half')}>Half</button>
          </div>
        </div>
      </div>

      <div className="furnace-ui__fuel">
        <ItemSlot stack={furnace.fuel} label="Fuel" />
        <div className="furnace-ui__slot-actions">
          <button type="button" disabled={!canInsertFuel} onClick={(event) => onSlotAction('fuel', 'insert', shiftedAmount(event))} title="Hold Shift to insert a full stack">Insert fuel</button>
          <button type="button" disabled={!furnace.fuel} onClick={(event) => onSlotAction('fuel', 'take', shiftedAmount(event))} title="Hold Shift to take the full stack">Take</button>
          <button type="button" disabled={!furnace.fuel || furnace.fuel.count < 2} onClick={() => onSlotAction('fuel', 'take', 'half')}>Half</button>
        </div>
      </div>
    </section>
  )
}
