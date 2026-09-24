import { ITEMS } from '../../data/items'
import { FUEL_VALUES, SMELTING_RECIPES, type SmeltingRecipe } from '../../data/smelting'
import { InventorySystem } from '../InventorySystem'
import type { BlockEntity, FurnaceState, ItemId, ItemStack } from '../types'

export type FurnaceSlot = 'input' | 'fuel' | 'output'

const COORDINATE_KEY = /^-?\d+,-?\d+,-?\d+$/
const EPSILON = 1e-9

export const furnaceKey = (x: number, y: number, z: number) => `${x},${y},${z}`

const recipeFor = (item: ItemId) => SMELTING_RECIPES.find((recipe) => recipe.input === item)

const copyStack = (stack: ItemStack | null): ItemStack | null => stack ? { ...stack } : null

const copyState = (state: FurnaceState): FurnaceState => ({
  type: 'furnace',
  input: copyStack(state.input),
  fuel: copyStack(state.fuel),
  output: copyStack(state.output),
  progress: state.progress,
  fuelRemaining: state.fuelRemaining,
})

/** Owns furnace slot contents and processing state at world-coordinate keys. */
export class FurnaceSystem {
  private readonly furnaces: Record<string, FurnaceState> = {}

  constructor(
    private readonly inventory: InventorySystem,
    initialEntities: Record<string, BlockEntity> = {},
  ) {
    for (const [key, entity] of Object.entries(initialEntities)) {
      if (COORDINATE_KEY.test(key) && entity?.type === 'furnace') this.furnaces[key] = this.sanitize(entity)
    }
  }

  createFurnace(x: number, y: number, z: number) {
    const key = furnaceKey(x, y, z)
    this.furnaces[key] ??= this.emptyState()
    return copyState(this.furnaces[key])
  }

  hasFurnace(x: number, y: number, z: number) {
    return furnaceKey(x, y, z) in this.furnaces
  }

  getState(x: number, y: number, z: number) {
    const state = this.furnaces[furnaceKey(x, y, z)]
    return state ? copyState(state) : null
  }

  insertInput(x: number, y: number, z: number, item: ItemId, quantity = 1) {
    if (!recipeFor(item)) return 0
    return this.insert(x, y, z, 'input', item, quantity)
  }

  insertFuel(x: number, y: number, z: number, item: ItemId, quantity = 1) {
    const fuelValue = FUEL_VALUES[item]
    if (!fuelValue || fuelValue <= 0) return 0
    return this.insert(x, y, z, 'fuel', item, quantity)
  }

  extractInput(x: number, y: number, z: number, quantity = Number.POSITIVE_INFINITY) {
    return this.extract(x, y, z, 'input', quantity)
  }

  extractFuel(x: number, y: number, z: number, quantity = Number.POSITIVE_INFINITY) {
    return this.extract(x, y, z, 'fuel', quantity)
  }

  extractOutput(x: number, y: number, z: number, quantity = Number.POSITIVE_INFINITY) {
    return this.extract(x, y, z, 'output', quantity)
  }

  /** Advances every furnace by delta seconds and returns the number of completed items. */
  tick(delta: number) {
    if (!Number.isFinite(delta) || delta <= 0) return 0
    let completed = 0
    for (const state of Object.values(this.furnaces)) completed += this.tickFurnace(state, delta)
    return completed
  }

  /** Returns all stored items to the inventory before deleting a furnace record. */
  removeFurnace(x: number, y: number, z: number) {
    const key = furnaceKey(x, y, z)
    const state = this.furnaces[key]
    if (!state) return false
    for (const slot of ['input', 'fuel', 'output'] as const) {
      const stack = state[slot]
      if (stack) this.inventory.add(stack.item, stack.count)
    }
    delete this.furnaces[key]
    return true
  }

  snapshot(): Record<string, FurnaceState> {
    return Object.fromEntries(Object.entries(this.furnaces).map(([key, state]) => [key, copyState(state)]))
  }

  private insert(x: number, y: number, z: number, slot: 'input' | 'fuel', item: ItemId, quantity: number) {
    const state = this.furnaces[furnaceKey(x, y, z)]
    if (!state || (state[slot] && state[slot].item !== item)) return 0
    const requested = this.quantity(quantity)
    const room = ITEMS[item].stackSize - (state[slot]?.count ?? 0)
    const available = this.inventory.snapshot()[item]
    const moved = this.inventory.has(item, Math.min(requested, room))
      ? Math.min(requested, room)
      : Math.min(requested, room, available)
    if (moved <= 0 || !this.inventory.remove(item, moved)) return 0

    state[slot] = { item, count: (state[slot]?.count ?? 0) + moved }
    return moved
  }

  private extract(x: number, y: number, z: number, slot: FurnaceSlot, quantity: number) {
    const state = this.furnaces[furnaceKey(x, y, z)]
    const stack = state?.[slot]
    if (!state || !stack) return 0
    const moved = Math.min(stack.count, this.quantity(quantity))
    if (moved <= 0) return 0

    this.inventory.add(stack.item, moved)
    stack.count -= moved
    if (stack.count === 0) state[slot] = null
    if (slot === 'input' && !state.input) state.progress = 0
    return moved
  }

  private tickFurnace(state: FurnaceState, delta: number) {
    let remaining = delta
    let completed = 0

    while (remaining > EPSILON) {
      const recipe = state.input ? recipeFor(state.input.item) : undefined
      if (!recipe) {
        state.progress = 0
        break
      }
      if (!this.outputHasRoom(state, recipe)) break
      if (state.progress + EPSILON >= recipe.duration) {
        this.completeRecipe(state, recipe)
        completed += 1
        continue
      }
      if (state.fuelRemaining <= EPSILON) {
        state.fuelRemaining = 0
        if (!this.consumeFuel(state)) break
      }

      const step = Math.min(remaining, recipe.duration - state.progress, state.fuelRemaining)
      if (step <= EPSILON) {
        state.progress = 0
        continue
      }
      state.progress += step
      state.fuelRemaining = Math.max(0, state.fuelRemaining - step)
      remaining -= step

      if (state.progress + EPSILON < recipe.duration) continue
      this.completeRecipe(state, recipe)
      completed += 1
    }

    return completed
  }

  private consumeFuel(state: FurnaceState) {
    if (!state.fuel) return false
    const value = FUEL_VALUES[state.fuel.item]
    if (!value || value <= 0) return false
    state.fuelRemaining = value
    state.fuel.count -= 1
    if (state.fuel.count === 0) state.fuel = null
    return true
  }

  private outputHasRoom(state: FurnaceState, recipe: SmeltingRecipe) {
    return !state.output || (
      state.output.item === recipe.output
      && state.output.count < ITEMS[recipe.output].stackSize
    )
  }

  private completeRecipe(state: FurnaceState, recipe: SmeltingRecipe) {
    if (!state.input) return
    state.input.count -= 1
    if (state.input.count === 0) state.input = null
    if (state.output) state.output.count += 1
    else state.output = { item: recipe.output, count: 1 }
    state.progress = 0
  }

  private sanitize(state: FurnaceState): FurnaceState {
    const input = this.sanitizeStack(state.input)
    const fuel = this.sanitizeStack(state.fuel)
    const output = this.sanitizeStack(state.output)
    const recipe = input ? recipeFor(input.item) : undefined
    return {
      type: 'furnace',
      input,
      fuel,
      output,
      progress: recipe && Number.isFinite(state.progress)
        ? Math.min(recipe.duration, Math.max(0, state.progress))
        : 0,
      fuelRemaining: Number.isFinite(state.fuelRemaining) ? Math.max(0, state.fuelRemaining) : 0,
    }
  }

  private sanitizeStack(stack: ItemStack | null): ItemStack | null {
    if (!stack || !(stack.item in ITEMS) || !Number.isFinite(stack.count)) return null
    const count = Math.min(ITEMS[stack.item].stackSize, Math.max(0, Math.floor(stack.count)))
    return count > 0 ? { item: stack.item, count } : null
  }

  private quantity(value: number) {
    if (value === Number.POSITIVE_INFINITY) return value
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  }

  private emptyState(): FurnaceState {
    return { type: 'furnace', input: null, fuel: null, output: null, progress: 0, fuelRemaining: 0 }
  }
}
