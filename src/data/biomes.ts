export type BiomeId = 'plains' | 'forest' | 'desert'

export interface BiomeDefinition {
  name: string
  treeDensity: number
  hillStrength: number
}

export const BIOMES: Record<BiomeId, BiomeDefinition> = {
  plains: { name: 'Plains', treeDensity: 0.84, hillStrength: 0.75 },
  forest: { name: 'Forest', treeDensity: 0.7, hillStrength: 1 },
  desert: { name: 'Desert', treeDensity: 1, hillStrength: 0.55 },
}
