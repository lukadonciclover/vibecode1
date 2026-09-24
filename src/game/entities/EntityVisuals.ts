import * as THREE from 'three'
import type { EntityDefinition } from './types'

type PaletteColor = keyof EntityDefinition['colors']
type Part = [color: PaletteColor, x: number, y: number, z: number, sx: number, sy: number, sz: number]

const QUADRUPED: readonly Part[] = [
  ['primary', 0, 0.82, 0, 0.9, 0.62, 1.25],
  ['secondary', 0, 1.12, -0.62, 0.62, 0.55, 0.62],
  ['primary', -0.31, 0.34, -0.36, 0.2, 0.68, 0.2],
  ['primary', 0.31, 0.34, -0.36, 0.2, 0.68, 0.2],
  ['primary', -0.31, 0.34, 0.37, 0.2, 0.68, 0.2],
  ['primary', 0.31, 0.34, 0.37, 0.2, 0.68, 0.2],
  ['accent', -0.16, 1.2, -0.94, 0.09, 0.09, 0.06],
  ['accent', 0.16, 1.2, -0.94, 0.09, 0.09, 0.06],
]

const BIRD: readonly Part[] = [
  ['primary', 0, 0.34, 0, 0.46, 0.45, 0.62],
  ['secondary', 0, 0.62, -0.2, 0.34, 0.34, 0.36],
  ['secondary', -0.35, 0.39, 0.02, 0.38, 0.08, 0.44],
  ['secondary', 0.35, 0.39, 0.02, 0.38, 0.08, 0.44],
  ['accent', 0, 0.6, -0.43, 0.12, 0.1, 0.2],
]

const CRAWLER: readonly Part[] = [
  ['primary', 0, 0.78, 0, 0.72, 0.62, 0.9],
  ['primary', 0, 1.25, -0.2, 0.58, 0.48, 0.58],
  ['secondary', -0.27, 0.29, -0.28, 0.18, 0.58, 0.18],
  ['secondary', 0.27, 0.29, -0.28, 0.18, 0.58, 0.18],
  ['secondary', -0.27, 0.29, 0.3, 0.18, 0.58, 0.18],
  ['secondary', 0.27, 0.29, 0.3, 0.18, 0.58, 0.18],
  ['accent', -0.14, 1.33, -0.5, 0.1, 0.1, 0.05],
  ['accent', 0.14, 1.33, -0.5, 0.1, 0.1, 0.05],
]

const LURKER: readonly Part[] = [
  ['primary', 0, 0.85, 0, 0.74, 0.92, 0.58],
  ['secondary', 0, 1.4, -0.05, 0.62, 0.5, 0.58],
  ['secondary', -0.29, 0.31, 0, 0.2, 0.62, 0.22],
  ['secondary', 0.29, 0.31, 0, 0.2, 0.62, 0.22],
  ['accent', -0.15, 1.45, -0.35, 0.1, 0.08, 0.05],
  ['accent', 0.15, 1.45, -0.35, 0.1, 0.08, 0.05],
]

const HUMANOID: readonly Part[] = [
  ['primary', 0, 0.94, 0, 0.62, 0.72, 0.36],
  ['secondary', 0, 1.52, 0, 0.48, 0.48, 0.48],
  ['primary', -0.39, 0.96, 0, 0.16, 0.7, 0.18],
  ['primary', 0.39, 0.96, 0, 0.16, 0.7, 0.18],
  ['secondary', -0.18, 0.32, 0, 0.2, 0.64, 0.22],
  ['secondary', 0.18, 0.32, 0, 0.2, 0.64, 0.22],
  ['accent', -0.12, 1.58, -0.26, 0.07, 0.07, 0.04],
  ['accent', 0.12, 1.58, -0.26, 0.07, 0.07, 0.04],
]

export class EntityVisuals {
  private readonly cube = new THREE.BoxGeometry(1, 1, 1)
  private readonly materials = new Map<number, THREE.MeshLambertMaterial>()

  create(definition: EntityDefinition, entityId: number) {
    const object = new THREE.Group()
    object.name = `${definition.name} ${entityId}`
    object.userData.entityId = entityId
    const parts = definition.model === 'quadruped' ? QUADRUPED
      : definition.model === 'bird' ? BIRD
        : definition.model === 'lurker' ? LURKER
          : definition.model === 'humanoid' ? HUMANOID
            : CRAWLER

    for (const [color, x, y, z, sx, sy, sz] of parts) {
      const mesh = new THREE.Mesh(this.cube, this.material(definition.colors[color]))
      mesh.position.set(x, y, z)
      mesh.scale.set(sx, sy, sz)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.entityId = entityId
      object.add(mesh)
    }
    object.scale.setScalar(definition.size.scale ?? 1)
    return object
  }

  dispose() {
    this.cube.dispose()
    for (const material of this.materials.values()) material.dispose()
    this.materials.clear()
  }

  private material(color: number) {
    let material = this.materials.get(color)
    if (!material) {
      material = new THREE.MeshLambertMaterial({ color })
      this.materials.set(color, material)
    }
    return material
  }
}
