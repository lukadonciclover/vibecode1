import * as THREE from 'three'
import { ITEMS } from '../data/items'
import { InventorySystem } from './InventorySystem'
import type { ItemId } from './types'

interface ItemDrop {
  item: ItemId
  mesh: THREE.Mesh
  baseY: number
  age: number
  phase: number
}

export class ItemDropSystem {
  readonly group = new THREE.Group()
  private readonly drops: ItemDrop[] = []
  private readonly geometry = new THREE.BoxGeometry(0.24, 0.24, 0.24)
  private readonly materials = new Map<ItemId, THREE.MeshLambertMaterial>()

  constructor(
    private readonly inventory: InventorySystem,
    private readonly onCollect: () => void,
  ) {
    this.group.name = 'Item drops'
  }

  spawn(item: ItemId, position: THREE.Vector3) {
    if (this.drops.length >= 50) this.collect(this.drops[0])
    let material = this.materials.get(item)
    if (!material) {
      material = new THREE.MeshLambertMaterial({ color: ITEMS[item].color })
      this.materials.set(item, material)
    }
    const mesh = new THREE.Mesh(this.geometry, material)
    mesh.position.copy(position).add(new THREE.Vector3(0.5, 0.45, 0.5))
    mesh.castShadow = true
    this.group.add(mesh)
    this.drops.push({ item, mesh, baseY: mesh.position.y, age: 0, phase: Math.random() * Math.PI * 2 })
  }

  update(delta: number, playerPosition: THREE.Vector3) {
    for (const drop of [...this.drops]) {
      drop.age += delta
      drop.mesh.rotation.y += delta * 2.2
      drop.mesh.position.y = drop.baseY + Math.sin(drop.age * 2.4 + drop.phase) * 0.08
      if (drop.age > 0.25 && drop.mesh.position.distanceTo(playerPosition) < 1.45) this.collect(drop)
    }
  }

  dispose() {
    this.geometry.dispose()
    for (const material of this.materials.values()) material.dispose()
    this.drops.length = 0
  }

  private collect(drop: ItemDrop) {
    this.inventory.add(drop.item)
    this.onCollect()
    this.group.remove(drop.mesh)
    const index = this.drops.indexOf(drop)
    if (index >= 0) this.drops.splice(index, 1)
  }
}
