import { ITEMS } from '../../data/items'
import { InventorySystem } from '../InventorySystem'
import type { ArmorSlot, Equipment, ItemId } from '../types'

const EMPTY: Equipment = { head: null, chest: null, legs: null, feet: null, offhand: null }

export class ArmorSystem {
  private readonly equipment: Equipment

  constructor(private readonly inventory: InventorySystem, initial?: Partial<Equipment>) {
    this.equipment = { ...EMPTY, ...initial }
    for (const slot of ['head', 'chest', 'legs', 'feet'] as ArmorSlot[]) {
      const item = this.equipment[slot]
      if (item && ITEMS[item].armorSlot !== slot) this.equipment[slot] = null
    }
  }

  equip(item: ItemId) {
    const slot = ITEMS[item].armorSlot
    if (!slot || !this.inventory.remove(item)) return false
    const current = this.equipment[slot]
    if (current) this.inventory.add(current)
    this.equipment[slot] = item
    return true
  }

  unequip(slot: ArmorSlot | 'offhand') {
    const item = this.equipment[slot]
    if (!item) return false
    this.inventory.add(item)
    this.equipment[slot] = null
    return true
  }

  setOffhand(item: ItemId) {
    if (!this.inventory.remove(item)) return false
    if (this.equipment.offhand) this.inventory.add(this.equipment.offhand)
    this.equipment.offhand = item
    return true
  }

  reduceDamage(amount: number) {
    const armor = (['head', 'chest', 'legs', 'feet'] as ArmorSlot[]).reduce((total, slot) => {
      const item = this.equipment[slot]
      return total + (item ? ITEMS[item].armorValue ?? 0 : 0)
    }, 0)
    return Math.max(1, amount * (1 - Math.min(0.72, armor * 0.025)))
  }

  snapshot(): Equipment { return { ...this.equipment } }
}
