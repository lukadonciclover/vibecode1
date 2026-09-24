import * as THREE from 'three'
import { isSolidBlock } from '../data/blocks'
import { BlockManager } from './BlockManager'
import type { GameMode, PlayerPosition } from './types'

const PLAYER_RADIUS = 0.3
const PLAYER_HEIGHT = 1.78
const EYE_HEIGHT = 1.62
const WALK_SPEED = 4.6
const SPRINT_SPEED = 7.2
const JUMP_SPEED = 8.2
const GRAVITY = 24

export class PlayerController {
  readonly position: THREE.Vector3
  private readonly velocity = new THREE.Vector3()
  private readonly keys = new Set<string>()
  private yaw = 0
  private pitch = 0
  private grounded = false
  private paused = false
  private fallStartY: number
  private stepTimer = 0
  private flying = false
  private lastSpaceAt = 0

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly canvas: HTMLCanvasElement,
    private readonly blocks: BlockManager,
    start: PlayerPosition,
    private readonly options: {
      onLand?: (fallDistance: number) => void
      onVoid?: () => void
      onJump?: () => void
      onStep?: () => void
      onFlightChange?: (flying: boolean) => void
      gameMode?: GameMode
      mouseSensitivity?: number
    } = {},
  ) {
    this.position = new THREE.Vector3(start.x, start.y, start.z)
    this.camera.rotation.order = 'YXZ'
    this.fallStartY = start.y
    this.syncCamera()
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('mousemove', this.onMouseMove)
  }

  update(deltaSeconds: number) {
    if (this.paused) return
    const delta = Math.min(deltaSeconds, 0.05)
    const forward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0)
    const strafe = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0)
    const length = Math.hypot(forward, strafe) || 1
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED
    const wasGrounded = this.grounded

    this.velocity.x = ((-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * strafe) / length) * speed
    this.velocity.z = ((-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * strafe) / length) * speed
    if (this.flying) {
      this.velocity.y = ((this.keys.has('Space') ? 1 : 0) - (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1 : 0)) * SPRINT_SPEED
    } else {
      this.velocity.y -= GRAVITY * delta
    }

    this.moveAxis('x', this.velocity.x * delta)
    this.moveAxis('z', this.velocity.z * delta)
    this.grounded = this.flying
    this.moveAxis('y', this.velocity.y * delta)

    if (!this.flying && wasGrounded && !this.grounded) this.fallStartY = this.position.y
    if (!this.flying && !wasGrounded && this.grounded) this.options.onLand?.(Math.max(0, this.fallStartY - this.position.y))

    if (this.grounded && (forward !== 0 || strafe !== 0)) {
      this.stepTimer += delta * (speed / WALK_SPEED)
      if (this.stepTimer >= 0.42) {
        this.stepTimer = 0
        this.options.onStep?.()
      }
    } else {
      this.stepTimer = 0
    }

    if (this.position.y < -10) {
      this.options.onVoid?.()
    }
    this.syncCamera()
  }

  setPaused(paused: boolean) {
    this.paused = paused
    this.keys.clear()
  }

  setMouseSensitivity(sensitivity: number) {
    this.options.mouseSensitivity = Math.max(0.2, Math.min(3, sensitivity))
  }

  intersectsBlock(x: number, y: number, z: number) {
    return (
      this.position.x + PLAYER_RADIUS > x &&
      this.position.x - PLAYER_RADIUS < x + 1 &&
      this.position.y + PLAYER_HEIGHT > y &&
      this.position.y < y + 1 &&
      this.position.z + PLAYER_RADIUS > z &&
      this.position.z - PLAYER_RADIUS < z + 1
    )
  }

  getSerializablePosition(): PlayerPosition {
    return { x: this.position.x, y: this.position.y, z: this.position.z }
  }

  get isFlying() {
    return this.flying
  }

  get isFalling() {
    return !this.flying && !this.grounded && this.velocity.y < -1
  }

  teleport(position: PlayerPosition) {
    this.position.set(position.x, position.y, position.z)
    this.velocity.set(0, 0, 0)
    this.fallStartY = position.y
    this.syncCamera()
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    document.removeEventListener('mousemove', this.onMouseMove)
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (this.paused || document.pointerLockElement !== this.canvas) return
    this.keys.add(event.code)
    if (event.code === 'Space' && this.options.gameMode === 'creative' && !event.repeat) {
      const now = performance.now()
      if (now - this.lastSpaceAt < 320) {
        this.flying = !this.flying
        this.velocity.y = 0
        this.options.onFlightChange?.(this.flying)
      }
      this.lastSpaceAt = now
      if (this.flying) return
    }
    if (event.code === 'Space' && this.grounded) {
      this.velocity.y = JUMP_SPEED
      this.grounded = false
      this.fallStartY = this.position.y
      this.options.onJump?.()
    }
  }

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code)
  }

  private readonly onMouseMove = (event: MouseEvent) => {
    if (this.paused || document.pointerLockElement !== this.canvas) return
    const sensitivity = this.options.mouseSensitivity ?? 1
    this.yaw -= event.movementX * 0.0022 * sensitivity
    this.pitch -= event.movementY * 0.0022 * sensitivity
    this.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, this.pitch))
    this.camera.rotation.set(this.pitch, this.yaw, 0)
  }

  private moveAxis(axis: 'x' | 'y' | 'z', distance: number) {
    const steps = Math.max(1, Math.ceil(Math.abs(distance) / 0.08))
    const amount = distance / steps
    for (let step = 0; step < steps; step += 1) {
      this.position[axis] += amount
      if (!this.collides()) continue
      this.position[axis] -= amount
      if (axis === 'y') {
        if (distance < 0) this.grounded = true
        this.velocity.y = 0
      }
      return
    }
  }

  private collides() {
    const epsilon = 0.0001
    const minX = Math.floor(this.position.x - PLAYER_RADIUS + epsilon)
    const maxX = Math.floor(this.position.x + PLAYER_RADIUS - epsilon)
    const minY = Math.floor(this.position.y + epsilon)
    const maxY = Math.floor(this.position.y + PLAYER_HEIGHT - epsilon)
    const minZ = Math.floor(this.position.z - PLAYER_RADIUS + epsilon)
    const maxZ = Math.floor(this.position.z + PLAYER_RADIUS - epsilon)

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          if (isSolidBlock(this.blocks.getBlock(x, y, z))) return true
        }
      }
    }
    return false
  }

  private syncCamera() {
    this.camera.position.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z)
    this.camera.rotation.set(this.pitch, this.yaw, 0)
  }
}
