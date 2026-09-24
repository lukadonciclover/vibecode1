import { InventorySystem } from '../InventorySystem'
import { BlockManager } from '../BlockManager'
import { BlockType, WORLD_HEIGHT, type CropState } from '../types'

export const CROP_STAGE_DURATION = 60
export const CROP_STAGE_COUNT = 4
export const MATURE_CROP_STAGE = CROP_STAGE_COUNT - 1

const COORDINATE_KEY = /^-?\d+,-?\d+,-?\d+$/

export interface HarvestResult {
  wheat: number
  seeds: number
}

export const cropKey = (x: number, y: number, z: number) => `${x},${y},${z}`

const coordinatesFromKey = (key: string) => key.split(',').map(Number) as [number, number, number]

/** Handles tilling, planting, total-time growth, and crop harvests. */
export class FarmingSystem {
  private readonly crops: Record<string, CropState> = {}

  constructor(
    private readonly blocks: BlockManager,
    private readonly inventory: InventorySystem,
    initialCrops: Record<string, CropState> = {},
  ) {
    for (const [key, crop] of Object.entries(initialCrops)) {
      if (!COORDINATE_KEY.test(key) || !crop) continue
      this.crops[key] = {
        plantedAt: Number.isFinite(crop.plantedAt) ? Math.max(0, crop.plantedAt) : 0,
        stage: Number.isFinite(crop.stage)
          ? Math.min(MATURE_CROP_STAGE, Math.max(0, Math.floor(crop.stage)))
          : 0,
      }
    }
  }

  till(x: number, y: number, z: number) {
    if (!this.validCoordinate(x, y, z) || y + 1 >= WORLD_HEIGHT) return false
    const ground = this.blocks.getBlock(x, y, z)
    if ((ground !== BlockType.Grass && ground !== BlockType.Dirt)
      || this.blocks.getBlock(x, y + 1, z) !== BlockType.Air) return false
    return this.blocks.setBlock(x, y, z, BlockType.Farmland)
  }

  /** Plants at y + 1, where x/y/z identify the farmland block. */
  plant(x: number, y: number, z: number, totalWorldTime: number) {
    if (!this.validCoordinate(x, y, z) || y + 1 >= WORLD_HEIGHT || !Number.isFinite(totalWorldTime)) return false
    const cropY = y + 1
    const key = cropKey(x, cropY, z)
    if (this.blocks.getBlock(x, y, z) !== BlockType.Farmland
      || this.blocks.getBlock(x, cropY, z) !== BlockType.Air
      || this.crops[key]
      || !this.inventory.remove('seeds', 1)) return false

    if (!this.blocks.setBlock(x, cropY, z, BlockType.CropYoung)) {
      this.inventory.add('seeds', 1)
      return false
    }
    this.crops[key] = { plantedAt: Math.max(0, totalWorldTime), stage: 0 }
    return true
  }

  /** Recomputes all stages from monotonic in-game total time. */
  update(totalWorldTime: number) {
    if (!Number.isFinite(totalWorldTime)) return 0
    let changed = 0

    for (const [key, crop] of Object.entries(this.crops)) {
      const [x, y, z] = coordinatesFromKey(key)
      const currentBlock = this.blocks.getBlock(x, y, z)
      if (this.blocks.getBlock(x, y - 1, z) !== BlockType.Farmland) {
        if (currentBlock === BlockType.CropYoung || currentBlock === BlockType.CropMature) {
          this.blocks.setBlock(x, y, z, BlockType.Air)
        }
        delete this.crops[key]
        changed += 1
        continue
      }
      if (currentBlock !== BlockType.CropYoung && currentBlock !== BlockType.CropMature) {
        delete this.crops[key]
        changed += 1
        continue
      }

      const elapsed = Math.max(0, totalWorldTime - crop.plantedAt)
      const stage = Math.min(MATURE_CROP_STAGE, Math.floor(elapsed / CROP_STAGE_DURATION))
      const desiredBlock = stage === MATURE_CROP_STAGE ? BlockType.CropMature : BlockType.CropYoung
      const stageChanged = crop.stage !== stage
      if (stageChanged) {
        crop.stage = stage
        changed += 1
      }
      if (currentBlock !== desiredBlock && this.blocks.setBlock(x, y, z, desiredBlock)) {
        if (!stageChanged) changed += 1
      }
    }

    return changed
  }

  /** Harvest coordinates identify the crop block, not the farmland below it. */
  harvest(x: number, y: number, z: number, random: () => number = Math.random): HarvestResult | null {
    const key = cropKey(x, y, z)
    const crop = this.crops[key]
    if (!crop || crop.stage < MATURE_CROP_STAGE || this.blocks.getBlock(x, y, z) !== BlockType.CropMature) return null
    if (!this.blocks.setBlock(x, y, z, BlockType.Air)) return null

    const result = { wheat: 1, seeds: random() < 0.6 ? 1 : 0 }
    this.inventory.add('wheat', result.wheat)
    if (result.seeds > 0) this.inventory.add('seeds', result.seeds)
    delete this.crops[key]
    return result
  }

  /** For external block-breaking paths that already changed the crop block. */
  removeCrop(x: number, y: number, z: number) {
    const key = cropKey(x, y, z)
    if (!this.crops[key]) return false
    delete this.crops[key]
    return true
  }

  getState(x: number, y: number, z: number) {
    const crop = this.crops[cropKey(x, y, z)]
    return crop ? { ...crop } : null
  }

  snapshot(): Record<string, CropState> {
    return Object.fromEntries(Object.entries(this.crops).map(([key, crop]) => [key, { ...crop }]))
  }

  private validCoordinate(x: number, y: number, z: number) {
    return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && y >= 0 && y < WORLD_HEIGHT
  }
}
