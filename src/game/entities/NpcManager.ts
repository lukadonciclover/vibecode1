import * as THREE from 'three'
import { BlockManager } from '../BlockManager'
import type { NpcSpawnPoint, VillageProfession } from '../world'

export interface NpcSnapshot { id: string; name: string; profession: VillageProfession; position: THREE.Vector3 }
interface NpcRuntime extends NpcSnapshot { group: THREE.Group; origin: THREE.Vector3; heading: number; timer: number }

const NAMES = ['Aster', 'Bramble', 'Cora', 'Dune', 'Elowen', 'Flint', 'Grove', 'Hale']

export class NpcManager {
  readonly group = new THREE.Group()
  private readonly npcs = new Map<string, NpcRuntime>()
  private readonly bodyGeometry = new THREE.BoxGeometry(0.62, 0.9, 0.4)
  private readonly headGeometry = new THREE.BoxGeometry(0.48, 0.48, 0.48)
  private readonly bodyMaterials = new Map<VillageProfession, THREE.MeshLambertMaterial>()
  private readonly headMaterial = new THREE.MeshLambertMaterial({ color: 0xd5a878 })
  private readonly raycaster = new THREE.Raycaster()

  constructor(private readonly blocks: BlockManager) { this.group.name = 'Village residents' }

  sync(spawns: readonly NpcSpawnPoint[]) {
    for (const spawn of spawns) {
      if (this.npcs.has(spawn.id)) continue
      const group = new THREE.Group()
      const color = { farmer: 0x7f9851, lumberjack: 0x9b6845, mason: 0x778487, toolsmith: 0x9b5f4a }[spawn.profession]
      let material = this.bodyMaterials.get(spawn.profession)
      if (!material) { material = new THREE.MeshLambertMaterial({ color }); this.bodyMaterials.set(spawn.profession, material) }
      const body = new THREE.Mesh(this.bodyGeometry, material)
      body.position.y = 0.65
      const head = new THREE.Mesh(this.headGeometry, this.headMaterial)
      head.position.y = 1.33
      body.userData.npcId = spawn.id
      head.userData.npcId = spawn.id
      body.castShadow = head.castShadow = true
      group.add(body, head)
      group.position.set(spawn.x + 0.5, spawn.y, spawn.z + 0.5)
      this.group.add(group)
      const hash = [...spawn.id].reduce((sum, character) => sum + character.charCodeAt(0), 0)
      this.npcs.set(spawn.id, { id: spawn.id, name: NAMES[hash % NAMES.length], profession: spawn.profession, position: group.position, origin: group.position.clone(), group, heading: hash, timer: 1 })
    }
  }

  update(delta: number, player: THREE.Vector3, despawnDistance = 96) {
    for (const npc of [...this.npcs.values()]) {
      if (Math.hypot(npc.position.x - player.x, npc.position.z - player.z) > despawnDistance) {
        this.group.remove(npc.group)
        this.npcs.delete(npc.id)
        continue
      }
      if (npc.position.distanceTo(player) < 6) { npc.group.lookAt(player.x, npc.position.y, player.z); continue }
      npc.timer -= delta
      if (npc.timer <= 0) { npc.timer = 2 + (npc.id.length % 4); npc.heading += 1.7 }
      const nextX = npc.position.x + Math.cos(npc.heading) * delta * 0.45
      const nextZ = npc.position.z + Math.sin(npc.heading) * delta * 0.45
      if (Math.hypot(nextX - npc.origin.x, nextZ - npc.origin.z) > 6) { npc.heading += Math.PI; continue }
      const nextY = this.blocks.findSurfaceY(Math.floor(nextX), Math.floor(nextZ))
      if (Math.abs(nextY - npc.position.y) <= 1) npc.position.set(nextX, nextY, nextZ)
    }
  }

  target(camera: THREE.Camera) {
    this.raycaster.setFromCamera(new THREE.Vector2(), camera)
    this.raycaster.far = 5
    const hit = this.raycaster.intersectObject(this.group, true)[0]
    const id = hit?.object.userData.npcId as string | undefined
    const npc = id ? this.npcs.get(id) : undefined
    return npc ? { id: npc.id, name: npc.name, profession: npc.profession, position: npc.position.clone() } : null
  }

  get count() { return this.npcs.size }

  dispose() {
    this.bodyGeometry.dispose(); this.headGeometry.dispose(); this.headMaterial.dispose()
    for (const material of this.bodyMaterials.values()) material.dispose()
    this.npcs.clear()
  }
}
