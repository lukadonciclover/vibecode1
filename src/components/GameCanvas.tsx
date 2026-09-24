import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { BIOMES } from '../data/biomes'
import { BLOCKS } from '../data/blocks'
import { ITEMS } from '../data/items'
import { AudioManager } from '../game/AudioManager'
import { BlockManager } from '../game/BlockManager'
import { ChunkManager } from '../game/ChunkManager'
import { CombatSystem } from '../game/CombatSystem'
import { DayNightCycle } from '../game/DayNightCycle'
import { EnemyManager } from '../game/EnemyManager'
import { HungerSystem } from '../game/HungerSystem'
import { InventorySystem } from '../game/InventorySystem'
import { ItemDropSystem } from '../game/ItemDropSystem'
import { MiningSystem } from '../game/MiningSystem'
import { PlayerController } from '../game/PlayerController'
import { PlayerHealth, type DamageSource } from '../game/PlayerHealth'
import { SaveSystem } from '../game/SaveSystem'
import { ToolSystem } from '../game/ToolSystem'
import { VoxelRaycaster, type VoxelHit } from '../game/VoxelRaycaster'
import { WorldGenerator } from '../game/WorldGenerator'
import { BlockType, type ItemId, type PlayerPosition, type SaveData } from '../game/types'

export interface GameStatus {
  health: number
  hunger: number
  dead: boolean
  miningProgress: number
}

export interface HudStatus {
  fps: number
  position: PlayerPosition
  time: string
  phase: string
  biome: string
}

interface GameCanvasProps {
  seed: string
  savedWorld: SaveData | null
  inventory: InventorySystem
  selectedItem: ItemId
  inventoryOpen: boolean
  audio: AudioManager
  respawnRevision: number
  onInventoryChange: () => void
  onOpenCraftingTable: () => void
  onStatusChange: (status: GameStatus) => void
  onHudChange: (status: HudStatus) => void
}

interface RuntimeHandles {
  player: PlayerController
  health: PlayerHealth
  hunger: HungerSystem
  spawn: PlayerPosition
  cycle: DayNightCycle
  save: () => void
}

export function GameCanvas({
  seed,
  savedWorld,
  inventory,
  selectedItem,
  inventoryOpen,
  audio,
  respawnRevision,
  onInventoryChange,
  onOpenCraftingTable,
  onStatusChange,
  onHudChange,
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerRef = useRef<PlayerController | null>(null)
  const runtimeRef = useRef<RuntimeHandles | null>(null)
  const selectedRef = useRef(selectedItem)
  const inventoryOpenRef = useRef(inventoryOpen)
  const callbacksRef = useRef({ onInventoryChange, onOpenCraftingTable, onStatusChange, onHudChange })
  const [isLocked, setIsLocked] = useState(false)
  const [isDead, setIsDead] = useState((savedWorld?.health ?? 100) <= 0)

  selectedRef.current = selectedItem
  inventoryOpenRef.current = inventoryOpen
  callbacksRef.current = { onInventoryChange, onOpenCraftingTable, onStatusChange, onHudChange }

  useEffect(() => {
    playerRef.current?.setPaused(inventoryOpen || !isLocked || isDead)
    if ((inventoryOpen || isDead) && document.pointerLockElement) document.exitPointerLock()
  }, [inventoryOpen, isLocked, isDead])

  useEffect(() => {
    if (respawnRevision === 0) return
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.health.restore()
    runtime.player.teleport(runtime.spawn)
    setIsDead(false)
    callbacksRef.current.onStatusChange({
      health: runtime.health.value,
      hunger: runtime.hunger.value,
      dead: false,
      miningProgress: 0,
    })
    runtime.save()
  }, [respawnRevision])

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05

    const scene = new THREE.Scene()
    const skyColor = new THREE.Color(0x9ac3c4)
    const daySky = new THREE.Color(0x91bdc7)
    const nightSky = new THREE.Color(0x07111d)
    const twilightSky = new THREE.Color(0xb66c58)
    scene.background = skyColor
    scene.fog = new THREE.Fog(skyColor.clone(), 30, 72)
    const camera = new THREE.PerspectiveCamera(72, host.clientWidth / host.clientHeight, 0.05, 100)
    const generator = new WorldGenerator(seed)
    const blocks = new BlockManager(generator, savedWorld?.changes)
    const chunks = new ChunkManager(blocks)
    chunks.buildWorld()
    scene.add(chunks.group)

    const ambient = new THREE.HemisphereLight(0xcde9e4, 0x29251f, 1.5)
    const sun = new THREE.DirectionalLight(0xffedbd, 2.1)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -34
    sun.shadow.camera.right = 34
    sun.shadow.camera.top = 34
    sun.shadow.camera.bottom = -34
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 100
    sun.shadow.bias = -0.0004
    scene.add(ambient, sun, sun.target)

    const spawn = blocks.findSpawn()
    const start = savedWorld?.position ?? spawn
    const health = new PlayerHealth(savedWorld?.health)
    const hunger = new HungerSystem(savedWorld?.hunger)
    const cycle = new DayNightCycle(savedWorld?.worldTime)
    const mining = new MiningSystem()
    const combat = new CombatSystem()
    let lastStatusKey = ''
    let target: VoxelHit | null = null
    let enemyTarget: number | null = null
    let primaryHeld = false

    const publishStatus = (force = false) => {
      const status = {
        health: health.value,
        hunger: hunger.value,
        dead: health.isDead,
        miningProgress: Math.round(mining.progress * 20) / 20,
      }
      const key = `${status.health.toFixed(2)}:${status.hunger.toFixed(2)}:${status.dead}:${status.miningProgress}`
      if (force || key !== lastStatusKey) {
        lastStatusKey = key
        callbacksRef.current.onStatusChange(status)
      }
    }

    const damagePlayer = (amount: number, source: DamageSource) => {
      if (!health.damage(amount, source)) return
      audio.play('damage')
      publishStatus(true)
      if (health.isDead) {
        primaryHeld = false
        mining.cancel()
        setIsDead(true)
        playerRef.current?.setPaused(true)
        if (document.pointerLockElement) document.exitPointerLock()
      }
    }

    const player = new PlayerController(camera, canvas, blocks, start, {
      onLand: (fallDistance) => {
        if (fallDistance > 3.2) damagePlayer(Math.round((fallDistance - 3.2) * 8), 'fall')
      },
      onVoid: () => damagePlayer(100, 'void'),
      onJump: () => audio.play('jump'),
      onStep: () => audio.play('walk'),
    })
    player.setPaused(true)
    playerRef.current = player
    const voxelRaycaster = new VoxelRaycaster(blocks)
    const enemies = new EnemyManager(blocks, (amount) => damagePlayer(amount, 'enemy'))
    const drops = new ItemDropSystem(inventory, () => {
      callbacksRef.current.onInventoryChange()
    })
    scene.add(enemies.group, drops.group)

    const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.008, 1.008, 1.008))
    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xfff0a6, transparent: true, opacity: 0.95 })
    const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial)
    outline.visible = false
    outline.renderOrder = 5
    scene.add(outline)

    const save = () => {
      SaveSystem.save({
        version: 2,
        seed,
        position: player.getSerializablePosition(),
        inventory: inventory.snapshot(),
        changes: blocks.getChanges(),
        health: health.value,
        hunger: hunger.value,
        worldTime: cycle.time,
        selectedItem: selectedRef.current,
        updatedAt: Date.now(),
      })
    }
    runtimeRef.current = { player, health, hunger, spawn, cycle, save }
    publishStatus(true)

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas
      setIsLocked(locked)
      player.setPaused(!locked || inventoryOpenRef.current || health.isDead)
      if (!locked) {
        primaryHeld = false
        mining.cancel()
        publishStatus()
      }
    }

    const onMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        if (!inventoryOpenRef.current && !health.isDead) canvas.requestPointerLock()
        return
      }
      if (event.button === 0) {
        if (enemyTarget !== null) {
          if (combat.attack()) {
            const activeItem = inventory.has(selectedRef.current) ? selectedRef.current : 'grass'
            enemies.attack(enemyTarget, ToolSystem.attackDamage(activeItem), camera.position)
            audio.play('attack')
          }
          primaryHeld = false
        } else {
          primaryHeld = true
        }
        return
      }
      if (event.button !== 2 || !target) return
      const placeType = ITEMS[selectedRef.current].placeBlock
      if (placeType === undefined || !inventory.has(selectedRef.current)) return
      const position = target.block.clone().add(target.normal)
      const x = Math.floor(position.x)
      const y = Math.floor(position.y)
      const z = Math.floor(position.z)
      if (blocks.getBlock(x, y, z) !== BlockType.Air || player.intersectsBlock(x, y, z)) return
      if (!blocks.setBlock(x, y, z, placeType) || !inventory.remove(selectedRef.current)) return
      chunks.refreshAt(x, z)
      callbacksRef.current.onInventoryChange()
      audio.play('place')
      save()
    }

    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return
      primaryHeld = false
      mining.cancel()
      publishStatus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || health.isDead) return
      if (event.code === 'KeyF' && document.pointerLockElement === canvas && target?.type === BlockType.CraftingTable) {
        document.exitPointerLock()
        callbacksRef.current.onOpenCraftingTable()
      }
      if (event.code === 'KeyG' && inventory.has('berry') && hunger.eat(ITEMS.berry.food ?? 0)) {
        inventory.remove('berry')
        callbacksRef.current.onInventoryChange()
        audio.play('eat')
        publishStatus(true)
        save()
      }
    }

    const preventContextMenu = (event: MouseEvent) => event.preventDefault()
    const onResize = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const onBeforeUnload = () => save()
    document.addEventListener('pointerlockchange', onPointerLockChange)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('contextmenu', preventContextMenu)
    window.addEventListener('resize', onResize)
    window.addEventListener('beforeunload', onBeforeUnload)

    const clock = new THREE.Clock()
    const direction = new THREE.Vector3()
    let animationFrame = 0
    let frameCount = 0
    let fpsTime = performance.now()
    let lastHudTime = 0
    let statusTime = 0
    let shadowsEnabled = true
    let lowFpsSamples = 0
    let resolutionReduced = false

    const render = (time: number) => {
      animationFrame = requestAnimationFrame(render)
      const delta = Math.min(clock.getDelta(), 0.05)
      cycle.update(delta)
      combat.update(delta)
      player.update(delta)
      camera.getWorldDirection(direction)
      target = voxelRaycaster.cast(camera.position, direction)
      enemyTarget = enemies.target(camera)

      if (target) {
        outline.visible = enemyTarget === null
        outline.position.set(target.block.x + 0.5, target.block.y + 0.5, target.block.z + 0.5)
      } else {
        outline.visible = false
      }

      if (primaryHeld && !health.isDead && enemyTarget === null && target) {
        const activeItem = inventory.has(selectedRef.current) ? selectedRef.current : 'grass'
        const complete = mining.update(delta, { key: `${target.block.x},${target.block.y},${target.block.z}`, type: target.type }, activeItem)
        if (complete) {
          const { x, y, z } = target.block
          const removed = blocks.getBlock(x, y, z)
          if (removed !== BlockType.Air && blocks.setBlock(x, y, z, BlockType.Air)) {
            drops.spawn(BLOCKS[removed].drop, target.block)
            chunks.refreshAt(x, z)
            audio.play('break')
            save()
          }
          mining.cancel()
        }
      } else if (mining.progress > 0) {
        mining.cancel()
      }
      const progress = mining.progress
      outlineMaterial.color.setHSL(0.14 * (1 - progress), 0.78, 0.68)
      outlineMaterial.opacity = 0.7 + progress * 0.3

      const activeGameplay = document.pointerLockElement === canvas && !inventoryOpenRef.current && !health.isDead
      if (activeGameplay) {
        hunger.update(delta, () => damagePlayer(2, 'starvation'), () => {
          if (health.heal(1)) publishStatus()
        })
        enemies.update(delta, player.position, cycle.lighting.daylight)
      }
      drops.update(delta, player.position)

      const lighting = cycle.lighting
      sun.position.set(Math.cos(lighting.sunAngle) * 48, lighting.sunHeight * 48, Math.sin(lighting.sunAngle) * 32)
      sun.intensity = 0.06 + lighting.daylight * 2.2
      sun.castShadow = shadowsEnabled && lighting.daylight > 0.12
      ambient.intensity = 0.22 + lighting.daylight * 1.35
      skyColor.copy(nightSky).lerp(daySky, lighting.daylight)
      if (lighting.phase === 'Sunset' || lighting.phase === 'Sunrise') {
        const twilight = Math.max(0, 1 - Math.abs(lighting.daylight - 0.5) * 2)
        skyColor.lerp(twilightSky, twilight * 0.42)
      }
      ;(scene.fog as THREE.Fog).color.copy(skyColor)

      renderer.render(scene, camera)
      frameCount += 1
      statusTime += delta
      if (statusTime >= 0.1) {
        publishStatus()
        statusTime = 0
      }
      if (time - fpsTime >= 500) {
        const fps = Math.round((frameCount * 1000) / (time - fpsTime))
        lowFpsSamples = fps < 28 ? lowFpsSamples + 1 : 0
        if (shadowsEnabled && lowFpsSamples >= 3) {
          shadowsEnabled = false
          renderer.shadowMap.enabled = false
          sun.castShadow = false
          lowFpsSamples = 0
        } else if (!shadowsEnabled && !resolutionReduced && lowFpsSamples >= 3) {
          resolutionReduced = true
          renderer.setPixelRatio(Math.max(0.75, Math.min(window.devicePixelRatio, 1.6) * 0.75))
          renderer.setSize(host.clientWidth, host.clientHeight, false)
          lowFpsSamples = 0
        }
        if (time - lastHudTime >= 100) {
          const position = player.getSerializablePosition()
          callbacksRef.current.onHudChange({
            fps,
            position,
            time: lighting.clock,
            phase: lighting.phase,
            biome: BIOMES[generator.biomes.getBiome(Math.floor(position.x), Math.floor(position.z))].name,
          })
          lastHudTime = time
        }
        fpsTime = time
        frameCount = 0
      }
    }
    animationFrame = requestAnimationFrame(render)
    const autosave = window.setInterval(save, 3000)

    return () => {
      save()
      cancelAnimationFrame(animationFrame)
      window.clearInterval(autosave)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('contextmenu', preventContextMenu)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('beforeunload', onBeforeUnload)
      player.dispose()
      playerRef.current = null
      runtimeRef.current = null
      enemies.dispose()
      drops.dispose()
      chunks.dispose()
      outlineGeometry.dispose()
      outlineMaterial.dispose()
      renderer.dispose()
    }
  }, [audio, inventory, savedWorld, seed])

  return (
    <div className="game-canvas" ref={hostRef}>
      <canvas ref={canvasRef} />
      {!isLocked && !inventoryOpen && !isDead && (
        <button className="focus-prompt" type="button" onClick={() => canvasRef.current?.requestPointerLock()}>
          <span>Click to enter the wild</span>
          <small>ESC releases the pointer</small>
        </button>
      )}
    </div>
  )
}
