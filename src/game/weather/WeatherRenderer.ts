import * as THREE from 'three'
import type { WeatherSnapshot } from './WeatherManager'

const PARTICLE_COUNT = 520

export class WeatherRenderer {
  readonly points: THREE.Points
  private readonly positions = new Float32Array(PARTICLE_COUNT * 3)
  private readonly geometry = new THREE.BufferGeometry()
  private readonly material = new THREE.PointsMaterial({ color: 0xa9c9d4, size: 0.07, transparent: true, opacity: 0, depthWrite: false })

  constructor() {
    for (let index = 0; index < PARTICLE_COUNT; index += 1) this.reset(index, new THREE.Vector3())
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
    this.points.name = 'Weather particles'
  }

  update(delta: number, player: THREE.Vector3, weather: WeatherSnapshot) {
    const count = Math.floor(PARTICLE_COUNT * weather.rainRate)
    this.geometry.setDrawRange(0, count)
    this.material.opacity = Math.min(0.72, weather.intensity * 0.7)
    this.points.visible = count > 0
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3
      this.positions[offset + 1] -= delta * (13 + weather.wind * 7)
      this.positions[offset] += delta * weather.wind * 0.7
      if (this.positions[offset + 1] < player.y - 2 || Math.abs(this.positions[offset] - player.x) > 15 || Math.abs(this.positions[offset + 2] - player.z) > 15) this.reset(index, player)
    }
    ;(this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  }

  dispose() { this.geometry.dispose(); this.material.dispose() }

  private reset(index: number, player: THREE.Vector3) {
    const offset = index * 3
    const angle = Math.random() * Math.PI * 2
    const distance = Math.sqrt(Math.random()) * 15
    this.positions[offset] = player.x + Math.cos(angle) * distance
    this.positions[offset + 1] = player.y + 5 + Math.random() * 13
    this.positions[offset + 2] = player.z + Math.sin(angle) * distance
  }
}
