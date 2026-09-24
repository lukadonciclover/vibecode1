import * as THREE from 'three'
import { BlockManager } from '../BlockManager'
import { BlockType, type PlayerPosition } from '../types'

export class LocalLightManager {
  readonly group = new THREE.Group()
  private readonly lights: THREE.PointLight[] = []
  private scanTimer = 0

  constructor(private readonly blocks: BlockManager, private readonly maximum = 8) {
    this.group.name = 'Nearby torch lights'
    for (let index = 0; index < maximum; index += 1) {
      const light = new THREE.PointLight(0xffb85c, 0, 9, 2)
      this.lights.push(light)
      this.group.add(light)
    }
  }

  update(delta: number, player: PlayerPosition) {
    this.scanTimer -= delta
    if (this.scanTimer > 0) return
    this.scanTimer = 1.5
    const found: Array<{ x: number; y: number; z: number; distance: number }> = []
    const radius = 12
    for (let x = Math.floor(player.x) - radius; x <= Math.floor(player.x) + radius; x += 1) {
      for (let z = Math.floor(player.z) - radius; z <= Math.floor(player.z) + radius; z += 1) {
        for (let y = Math.max(0, Math.floor(player.y) - 8); y <= Math.min(31, Math.floor(player.y) + 8); y += 1) {
          if (this.blocks.getBlock(x, y, z) !== BlockType.Torch) continue
          found.push({ x, y, z, distance: Math.hypot(x - player.x, y - player.y, z - player.z) })
        }
      }
    }
    found.sort((a, b) => a.distance - b.distance)
    this.lights.forEach((light, index) => {
      const torch = found[index]
      light.intensity = torch ? 1.65 : 0
      if (torch) light.position.set(torch.x + 0.5, torch.y + 0.7, torch.z + 0.5)
    })
  }
}
