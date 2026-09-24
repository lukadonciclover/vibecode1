import { BlockType, type ArmorSlot, type ItemId } from '../game/types'

export type ItemType = 'block' | 'material' | 'tool' | 'weapon' | 'food' | 'armor' | 'utility'
export type ToolType = 'pickaxe' | 'axe' | 'shovel' | 'sword'

export interface ItemDefinition {
  id: ItemId
  name: string
  type: ItemType
  stackSize: number
  icon: string
  color: string
  description: string
  toolType?: ToolType
  toolTier?: number
  foodValue?: number
  placeableBlock?: BlockType
  durability?: number
  attackDamage?: number
  armorSlot?: ArmorSlot
  armorValue?: number
}

const item = (id: ItemId, definition: Omit<ItemDefinition, 'id'>): ItemDefinition => ({ id, ...definition })
const block = (id: ItemId, name: string, icon: string, color: string, placeableBlock: BlockType, description = `A placeable ${name.toLowerCase()} block.`) =>
  item(id, { name, icon, color, placeableBlock, description, type: 'block', stackSize: 64 })
const material = (id: ItemId, name: string, icon: string, color: string, description: string) =>
  item(id, { name, icon, color, description, type: 'material', stackSize: 64 })
const food = (id: ItemId, name: string, icon: string, color: string, foodValue: number) =>
  item(id, { name, icon, color, foodValue, description: `Restores ${foodValue} hunger.`, type: 'food', stackSize: 32 })
const tool = (id: ItemId, name: string, icon: string, color: string, toolType: ToolType, toolTier: number, durability: number, attackDamage: number) =>
  item(id, { name, icon, color, toolType, toolTier, durability, attackDamage, description: `Tier ${toolTier} ${toolType}.`, type: toolType === 'sword' ? 'weapon' : 'tool', stackSize: 1 })
const armor = (id: ItemId, name: string, icon: string, color: string, armorSlot: ArmorSlot, armorValue: number, durability: number) =>
  item(id, { name, icon, color, armorSlot, armorValue, durability, description: `${armorValue} points of protection.`, type: 'armor', stackSize: 1 })

export const ITEMS: Record<ItemId, ItemDefinition> = {
  grass: block('grass', 'Grass', 'GR', '#78a94c', BlockType.Grass),
  dirt: block('dirt', 'Dirt', 'DI', '#9a6844', BlockType.Dirt),
  stone: block('stone', 'Stone', 'ST', '#8c9695', BlockType.Stone),
  sand: block('sand', 'Sand', 'SA', '#d7c27a', BlockType.Sand),
  wood_log: block('wood_log', 'Wood Log', 'WL', '#a97943', BlockType.Wood),
  leaves: block('leaves', 'Leaves', 'LE', '#497d45', BlockType.Leaves),
  wood_planks: block('wood_planks', 'Wood Planks', 'PL', '#c89350', BlockType.WoodPlanks),
  crafting_table: block('crafting_table', 'Crafting Table', 'CT', '#bd8747', BlockType.CraftingTable, 'Unlocks advanced crafting recipes.'),
  furnace: block('furnace', 'Furnace', 'FU', '#697170', BlockType.Furnace, 'Smelts ore and cooks food over time.'),
  chest: block('chest', 'Chest', 'CH', '#9f703b', BlockType.Chest, 'Stores up to 27 item stacks.'),
  farmland: block('farmland', 'Farmland', 'FA', '#705139', BlockType.Farmland),
  torch: block('torch', 'Torch', 'TO', '#f0b94f', BlockType.Torch, 'A nearby local light source.'),
  fence: block('fence', 'Fence', 'FE', '#a67640', BlockType.Fence),
  door: block('door', 'Door', 'DO', '#a87a43', BlockType.Door),
  bed: block('bed', 'Bed', 'BD', '#b74e54', BlockType.Bed),
  copper_ore: material('copper_ore', 'Copper Ore', 'CO', '#b8744d', 'Smelt into copper ingots.'),
  silverstone: material('silverstone', 'Raw Silverstone', 'SV', '#b8c6ca', 'A dense metal-bearing stone.'),
  crystal_ore: material('crystal_ore', 'Raw Crystal', 'CR', '#8f77d2', 'A rare deep-earth crystal.'),
  coal: material('coal', 'Ember Coal', 'EC', '#42464b', 'Long-burning furnace fuel.'),
  copper_ingot: material('copper_ingot', 'Copper Ingot', 'CI', '#d48757', 'Refined copper for equipment.'),
  refined_silverstone: material('refined_silverstone', 'Refined Silverstone', 'RS', '#d3dcdd', 'A refined component for steel.'),
  crystal_shard: material('crystal_shard', 'Crystal Shard', 'CS', '#a996ee', 'A concentrated crystal fragment.'),
  steel_ingot: material('steel_ingot', 'Steel Ingot', 'SI', '#87969d', 'A strong advanced alloy.'),
  berry: food('berry', 'Wild Berry', 'BE', '#bd4966', 14),
  seeds: material('seeds', 'Seed Pack', 'SE', '#b1ba55', 'Plant on farmland to grow crops.'),
  wheat: material('wheat', 'Sungrain', 'WH', '#d6bc5d', 'A mature harvested crop.'),
  bread: food('bread', 'Sungrain Bread', 'BR', '#d29b55', 28),
  raw_meat: material('raw_meat', 'Raw Grazer Meat', 'RM', '#a94e4e', 'Cook before eating.'),
  cooked_meat: food('cooked_meat', 'Cooked Grazer Meat', 'CM', '#b66e42', 40),
  vegetable: food('vegetable', 'Root Vegetable', 'VE', '#d17c45', 20),
  leather: material('leather', 'Grazer Hide', 'HI', '#8d5f3d', 'Flexible material used for armor.'),
  stick: material('stick', 'Stick', 'SK', '#9a6f43', 'A basic tool handle.'),
  wooden_pickaxe: tool('wooden_pickaxe', 'Wood Pickaxe', 'PI', '#d1a15f', 'pickaxe', 1, 60, 6),
  wooden_axe: tool('wooden_axe', 'Wood Axe', 'AX', '#c58f51', 'axe', 1, 60, 9),
  wooden_shovel: tool('wooden_shovel', 'Wood Shovel', 'SH', '#bd8449', 'shovel', 1, 60, 5),
  wooden_sword: tool('wooden_sword', 'Wood Sword', 'SW', '#c79556', 'sword', 1, 75, 10),
  stone_pickaxe: tool('stone_pickaxe', 'Stone Pickaxe', 'PI', '#89918e', 'pickaxe', 2, 132, 8),
  stone_axe: tool('stone_axe', 'Stone Axe', 'AX', '#89918e', 'axe', 2, 132, 11),
  stone_shovel: tool('stone_shovel', 'Stone Shovel', 'SH', '#89918e', 'shovel', 2, 132, 7),
  stone_sword: tool('stone_sword', 'Stone Sword', 'SW', '#89918e', 'sword', 2, 160, 14),
  copper_pickaxe: tool('copper_pickaxe', 'Copper Pickaxe', 'PI', '#c97950', 'pickaxe', 3, 220, 10),
  copper_axe: tool('copper_axe', 'Copper Axe', 'AX', '#c97950', 'axe', 3, 220, 14),
  copper_shovel: tool('copper_shovel', 'Copper Shovel', 'SH', '#c97950', 'shovel', 3, 220, 9),
  copper_sword: tool('copper_sword', 'Copper Sword', 'SW', '#c97950', 'sword', 3, 260, 18),
  steel_pickaxe: tool('steel_pickaxe', 'Steel Pickaxe', 'PI', '#a9b7bc', 'pickaxe', 4, 420, 13),
  steel_axe: tool('steel_axe', 'Steel Axe', 'AX', '#a9b7bc', 'axe', 4, 420, 18),
  steel_shovel: tool('steel_shovel', 'Steel Shovel', 'SH', '#a9b7bc', 'shovel', 4, 420, 11),
  steel_sword: tool('steel_sword', 'Steel Sword', 'SW', '#a9b7bc', 'sword', 4, 500, 24),
  leather_helmet: armor('leather_helmet', 'Hide Hood', 'HD', '#8d5f3d', 'head', 2, 90),
  leather_chestplate: armor('leather_chestplate', 'Hide Vest', 'HV', '#8d5f3d', 'chest', 4, 120),
  leather_leggings: armor('leather_leggings', 'Hide Leggings', 'HL', '#8d5f3d', 'legs', 3, 110),
  leather_boots: armor('leather_boots', 'Hide Boots', 'HB', '#8d5f3d', 'feet', 2, 80),
  copper_helmet: armor('copper_helmet', 'Copper Helm', 'CH', '#c97950', 'head', 3, 160),
  copper_chestplate: armor('copper_chestplate', 'Copper Plate', 'CP', '#c97950', 'chest', 6, 220),
  copper_leggings: armor('copper_leggings', 'Copper Greaves', 'CG', '#c97950', 'legs', 5, 200),
  copper_boots: armor('copper_boots', 'Copper Boots', 'CB', '#c97950', 'feet', 3, 140),
  steel_helmet: armor('steel_helmet', 'Steel Helm', 'SH', '#a9b7bc', 'head', 5, 300),
  steel_chestplate: armor('steel_chestplate', 'Steel Plate', 'SP', '#a9b7bc', 'chest', 9, 420),
  steel_leggings: armor('steel_leggings', 'Steel Greaves', 'SG', '#a9b7bc', 'legs', 7, 380),
  steel_boots: armor('steel_boots', 'Steel Boots', 'SB', '#a9b7bc', 'feet', 4, 280),
}

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[]
export const CREATIVE_ITEMS = ITEM_IDS
export const HOTBAR_ITEMS: ItemId[] = ['grass', 'dirt', 'stone', 'wood_log', 'wood_planks', 'crafting_table', 'furnace', 'chest', 'torch', 'wooden_pickaxe']
