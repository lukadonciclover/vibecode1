import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { BIOMES } from '../data/biomes'
import { BLOCKS } from '../data/blocks'
import { ITEMS } from '../data/items'
import { AudioManager } from '../game/AudioManager'
import { BlockManager } from '../game/BlockManager'
import { ChunkManager } from '../game/ChunkManager'
import { CombatSystem } from '../game/CombatSystem'
import { FurnaceSystem } from '../game/crafting/FurnaceSystem'
import { DayNightCycle } from '../game/DayNightCycle'
import { EntityManager } from '../game/entities/EntityManager'
import { NpcManager, type NpcSnapshot } from '../game/entities/NpcManager'
import { FarmingSystem } from '../game/farming/FarmingSystem'
import { HungerSystem } from '../game/HungerSystem'
import { InventorySystem } from '../game/InventorySystem'
import { ArmorSystem } from '../game/items/ArmorSystem'
import { ItemDropSystem } from '../game/ItemDropSystem'
import { LegacyWorldGenerator } from '../game/LegacyWorldGenerator'
import { MiningSystem } from '../game/MiningSystem'
import { PlayerController } from '../game/PlayerController'
import { PlayerHealth, type DamageSource } from '../game/PlayerHealth'
import { AchievementSystem } from '../game/progression/AchievementSystem'
import { StatisticsSystem } from '../game/progression/StatisticsSystem'
import { SaveSystem } from '../game/SaveSystem'
import { ChestSystem } from '../game/storage/ChestSystem'
import { ToolSystem } from '../game/ToolSystem'
import { TradingSystem } from '../game/trading/TradingSystem'
import { BlockType, CHUNK_SIZE, type ItemId, type PlayerPosition, type SaveData, type UserSettings } from '../game/types'
import { VoxelRaycaster, type VoxelHit } from '../game/VoxelRaycaster'
import { WeatherManager } from '../game/weather/WeatherManager'
import { WeatherRenderer } from '../game/weather/WeatherRenderer'
import { WorldGenerator } from '../game/WorldGenerator'
import { blockChunk, chunkKey, parseChunkKey } from '../game/world/chunkCoordinates'
import { LocalLightManager } from '../game/world/LocalLightManager'
import type { DebugMetrics } from './DebugOverlay'

export interface GameStatus {
  health: number
  hunger: number
  dead: boolean
  miningProgress: number
  flying: boolean
}

export interface HudStatus {
  fps: number
  position: PlayerPosition
  time: string
  phase: string
  biome: string
}

type BlockInteraction = { type: 'crafting' | 'furnace' | 'chest'; position: PlayerPosition }
export type GameInteraction = BlockInteraction | { type: 'npc'; npc: NpcSnapshot }

interface GameCanvasProps {
  saveData: SaveData
  inventory: InventorySystem
  armor: ArmorSystem
  furnaces: FurnaceSystem
  chests: ChestSystem
  trading: TradingSystem
  statistics: StatisticsSystem
  achievements: AchievementSystem
  selectedItem: ItemId
  paused: boolean
  settings: UserSettings
  audio: AudioManager
  respawnRevision: number
  saveRevision: number
  onInventoryChange: () => void
  onSimulationChange: () => void
  onInteraction: (interaction: GameInteraction) => void
  onStatusChange: (status: GameStatus) => void
  onHudChange: (status: HudStatus) => void
  onDebugChange: (metrics: DebugMetrics) => void
  onSave: (success: boolean) => void
}

interface RuntimeHandles {
  player: PlayerController
  health: PlayerHealth
  hunger: HungerSystem
  chunks: ChunkManager
  camera: THREE.PerspectiveCamera
  fog: THREE.Fog
  spawn: PlayerPosition
  save: () => boolean
}

const hungerRate = { peaceful: 0, easy: 0.75, normal: 1, hard: 1.35 } as const
const entityLimit = { peaceful: 14, easy: 18, normal: 24, hard: 30 } as const

export function GameCanvas(props: GameCanvasProps) {
  const {
    saveData, inventory, armor, furnaces, chests, trading, statistics, achievements,
    selectedItem, paused, settings, audio, respawnRevision, saveRevision,
  } = props
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runtimeRef = useRef<RuntimeHandles | null>(null)
  const selectedRef = useRef(selectedItem)
  const pausedRef = useRef(paused)
  const settingsRef = useRef(settings)
  const callbacksRef = useRef({
    onInventoryChange: props.onInventoryChange,
    onSimulationChange: props.onSimulationChange,
    onInteraction: props.onInteraction,
    onStatusChange: props.onStatusChange,
    onHudChange: props.onHudChange,
    onDebugChange: props.onDebugChange,
    onSave: props.onSave,
  })
  const [isLocked, setIsLocked] = useState(false)
  const [isDead, setIsDead] = useState(saveData.health <= 0)

  selectedRef.current = selectedItem
  pausedRef.current = paused
  settingsRef.current = settings
  callbacksRef.current = {
    onInventoryChange: props.onInventoryChange,
    onSimulationChange: props.onSimulationChange,
    onInteraction: props.onInteraction,
    onStatusChange: props.onStatusChange,
    onHudChange: props.onHudChange,
    onDebugChange: props.onDebugChange,
    onSave: props.onSave,
  }

  useEffect(() => {
    const runtime = runtimeRef.current
    runtime?.player.setPaused(paused || !isLocked || isDead)
    if ((paused || isDead) && document.pointerLockElement) document.exitPointerLock()
  }, [paused, isLocked, isDead])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.chunks.setRenderDistance(settings.renderDistance)
    runtime.player.setMouseSensitivity(settings.mouseSensitivity)
    runtime.camera.fov = settings.fov
    runtime.camera.far = Math.max(100, settings.renderDistance * CHUNK_SIZE * 1.6)
    runtime.fog.far = Math.max(72, settings.renderDistance * CHUNK_SIZE * 1.25)
    runtime.camera.updateProjectionMatrix()
  }, [settings.fov, settings.mouseSensitivity, settings.renderDistance])

  useEffect(() => {
    if (saveRevision === 0) return
    const success = runtimeRef.current?.save() ?? false
    callbacksRef.current.onSave(success)
  }, [saveRevision])

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
      flying: runtime.player.isFlying,
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
    const fog = new THREE.Fog(skyColor.clone(), 30, Math.max(72, settingsRef.current.renderDistance * CHUNK_SIZE * 1.25))
    scene.fog = fog
    const camera = new THREE.PerspectiveCamera(settingsRef.current.fov, host.clientWidth / host.clientHeight, 0.05, Math.max(100, settingsRef.current.renderDistance * CHUNK_SIZE * 1.6))
    const generator = saveData.generationVersion === 2
      ? new LegacyWorldGenerator(saveData.seed)
      : new WorldGenerator(saveData.seed)
    const blocks = new BlockManager(generator, saveData.modifiedChunks)
    const farming = new FarmingSystem(blocks, inventory, saveData.crops)
    const npcs = new NpcManager(blocks)
    const localLights = new LocalLightManager(blocks)

    const syncChunkContent = (chunkX: number, chunkZ: number) => {
      npcs.sync(generator.getNpcSpawnsForChunk(chunkX, chunkZ))
      for (const structure of generator.getStructuresForChunk(chunkX, chunkZ)) {
        for (const loot of structure.loot) {
          if (blocks.getBlock(loot.x, loot.y, loot.z) === BlockType.Chest) {
            chests.create(loot.x, loot.y, loot.z, { table: loot.table, seed: saveData.seed })
          }
        }
      }
    }
    const renderDistance = settingsRef.current.renderDistance
    const chunks = new ChunkManager(blocks, {
      renderDistance,
      loadDistance: renderDistance + 1,
      unloadDistance: renderDistance + 2,
    }, syncChunkContent)
    scene.add(chunks.group, npcs.group, localLights.group)

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

    const generatedSpawn = blocks.findSpawn()
    const spawn = saveData.spawn.y > 0 ? saveData.spawn : generatedSpawn
    const start = saveData.position.y > 0 ? saveData.position : spawn
    chunks.prime(start.x, start.z)
    const health = new PlayerHealth(saveData.health)
    const hunger = new HungerSystem(saveData.hunger)
    const cycle = new DayNightCycle(saveData.worldTime)
    const mining = new MiningSystem()
    const combat = new CombatSystem()
    const voxelRaycaster = new VoxelRaycaster(blocks)
    let totalWorldTime = Math.max(saveData.totalWorldTime, saveData.worldTime)
    let lastRecordedDay = Math.floor(totalWorldTime / 600)
    let lastStatusKey = ''
    let target: VoxelHit | null = null
    let entityTarget: number | null = null
    let npcTarget: NpcSnapshot | null = null
    let primaryHeld = false
    let rainSoundTimer = 0

    const publishStatus = (force = false) => {
      const status: GameStatus = {
        health: health.value,
        hunger: hunger.value,
        dead: health.isDead,
        miningProgress: Math.round(mining.progress * 20) / 20,
        flying: player.isFlying,
      }
      const key = `${status.health.toFixed(2)}:${status.hunger.toFixed(2)}:${status.dead}:${status.miningProgress}:${status.flying}`
      if (force || key !== lastStatusKey) {
        lastStatusKey = key
        callbacksRef.current.onStatusChange(status)
      }
    }

    const damagePlayer = (amount: number, source: DamageSource) => {
      if (saveData.settings.gameMode === 'creative') return
      const scaled = source === 'enemy'
        ? armor.reduceDamage(amount)
        : amount
      if (!health.damage(scaled, source)) return
      audio.play('damage')
      publishStatus(true)
      if (health.isDead) {
        statistics.recordDeath()
        achievements.evaluate(statistics.snapshot())
        callbacksRef.current.onSimulationChange()
        primaryHeld = false
        mining.cancel()
        setIsDead(true)
        if (document.pointerLockElement) document.exitPointerLock()
      }
    }

    const player = new PlayerController(camera, canvas, blocks, start, {
      gameMode: saveData.settings.gameMode,
      mouseSensitivity: settingsRef.current.mouseSensitivity,
      onFlightChange: () => publishStatus(true),
      onLand: (fallDistance) => {
        if (fallDistance > 3.2) damagePlayer(Math.round((fallDistance - 3.2) * 8), 'fall')
      },
      onVoid: () => {
        damagePlayer(100, 'void')
        if (!health.isDead) player.teleport(spawn)
      },
      onJump: () => audio.play('jump'),
      onStep: () => audio.play('walk'),
    })
    player.setPaused(true)

    const drops = new ItemDropSystem(inventory, callbacksRef.current.onInventoryChange)
    const entities = new EntityManager(blocks, {
      biomeAt: (x, z) => generator.getBiome(Math.floor(x), Math.floor(z)),
      maxEntities: entityLimit[saveData.settings.difficulty],
      onPlayerDamage: ({ amount }) => damagePlayer(amount, 'enemy'),
      onEntityDeath: ({ entity }) => {
        if (entity.disposition === 'hostile') statistics.recordEnemyDefeated()
        achievements.evaluate(statistics.snapshot())
        callbacksRef.current.onSimulationChange()
      },
      onDrop: (drop, position) => {
        for (let index = 0; index < drop.count; index += 1) drops.spawn(drop.item, position)
      },
    })
    scene.add(entities.group, drops.group)

    const weather = (() => {
      try {
        return saveData.weather
          ? WeatherManager.deserialize(saveData.weather, () => audio.play('thunder'))
          : new WeatherManager({ seed: saveData.seed, onThunder: () => audio.play('thunder') })
      } catch {
        return new WeatherManager({ seed: saveData.seed, onThunder: () => audio.play('thunder') })
      }
    })()
    const weatherRenderer = new WeatherRenderer()
    scene.add(weatherRenderer.points)

    const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.008, 1.008, 1.008))
    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xfff0a6, transparent: true, opacity: 0.95 })
    const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial)
    outline.visible = false
    outline.renderOrder = 5
    scene.add(outline)

    const visitedChunks = new Set(saveData.visitedChunks)
    const discoveredBiomes = new Set(saveData.discoveredBiomes)
    let previousPosition = player.position.clone()

    const save = () => SaveSystem.save({
      ...saveData,
      version: 3,
      generationVersion: saveData.generationVersion,
      updatedAt: Date.now(),
      settings: { ...saveData.settings, renderDistance: settingsRef.current.renderDistance },
      position: player.getSerializablePosition(),
      spawn,
      inventory: inventory.snapshot(),
      durability: inventory.durabilitySnapshot(),
      equipment: armor.snapshot(),
      modifiedChunks: blocks.getModifiedChunks(),
      blockEntities: { ...furnaces.snapshot(), ...chests.snapshot() },
      crops: farming.snapshot(),
      health: health.value,
      hunger: hunger.value,
      worldTime: cycle.time,
      totalWorldTime,
      selectedItem: selectedRef.current,
      achievements: achievements.snapshot(),
      statistics: statistics.snapshot(),
      visitedChunks: [...visitedChunks],
      discoveredBiomes: [...discoveredBiomes],
      weather: weather.serialize(),
      tradeUses: trading.snapshot(),
    })
    runtimeRef.current = { player, health, hunger, chunks, camera, fog, spawn, save }
    publishStatus(true)

    const refresh = (x: number, z: number) => chunks.refreshAt(x, z)
    const changedInventory = () => callbacksRef.current.onInventoryChange()
    const useTool = (item: ItemId) => {
      if (!ToolSystem.isTool(item)) return
      const result = inventory.damageItem(item)
      if (result.broken) audio.play('tool_break')
      if (result.used) changedInventory()
    }

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas
      setIsLocked(locked)
      player.setPaused(!locked || pausedRef.current || health.isDead)
      if (!locked) {
        primaryHeld = false
        mining.cancel()
        publishStatus()
      }
    }

    const onMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        if (!pausedRef.current && !health.isDead) canvas.requestPointerLock()
        return
      }
      if (event.button === 0) {
        if (entityTarget !== null) {
          if (combat.attack()) {
            const selected = inventory.has(selectedRef.current) ? selectedRef.current : 'grass'
            const critical = player.isFalling ? 1.5 : 1
            if (entities.attack(entityTarget, ToolSystem.attackDamage(selected) * critical, camera.position, critical > 1 ? 7 : 5)) {
              useTool(selected)
              audio.play('hit')
            }
          }
          primaryHeld = false
        } else {
          primaryHeld = true
        }
        return
      }
      if (event.button !== 2 || !target) return
      const selected = selectedRef.current
      const { x, y, z } = target.block
      if (ITEMS[selected].toolType === 'shovel' && farming.till(x, y, z)) {
        useTool(selected)
        refresh(x, z)
        statistics.recordBlockPlaced()
        achievements.evaluate(statistics.snapshot())
        audio.play('place')
        changedInventory()
        return
      }
      if (selected === 'seeds' && farming.plant(x, y, z, totalWorldTime)) {
        refresh(x, z)
        audio.play('place')
        changedInventory()
        return
      }
      const placeType = ITEMS[selected].placeableBlock
      if (placeType === undefined || !inventory.has(selected)) return
      const position = target.block.clone().add(target.normal)
      const placeX = Math.floor(position.x)
      const placeY = Math.floor(position.y)
      const placeZ = Math.floor(position.z)
      if (blocks.getBlock(placeX, placeY, placeZ) !== BlockType.Air || player.intersectsBlock(placeX, placeY, placeZ)) return
      if (!blocks.setBlock(placeX, placeY, placeZ, placeType) || !inventory.remove(selected)) return
      if (placeType === BlockType.Furnace) furnaces.createFurnace(placeX, placeY, placeZ)
      if (placeType === BlockType.Chest) chests.create(placeX, placeY, placeZ)
      refresh(placeX, placeZ)
      statistics.recordBlockPlaced()
      achievements.evaluate(statistics.snapshot())
      changedInventory()
      audio.play('place')
    }

    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return
      primaryHeld = false
      mining.cancel()
      publishStatus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || health.isDead || document.pointerLockElement !== canvas) return
      if (event.code === 'KeyF') {
        if (npcTarget) {
          callbacksRef.current.onInteraction({ type: 'npc', npc: npcTarget })
          return
        }
        if (!target) return
        const { x, y, z } = target.block
        if (target.type === BlockType.CraftingTable) callbacksRef.current.onInteraction({ type: 'crafting', position: { x, y, z } })
        if (target.type === BlockType.Furnace) {
          furnaces.createFurnace(x, y, z)
          callbacksRef.current.onInteraction({ type: 'furnace', position: { x, y, z } })
        }
        if (target.type === BlockType.Chest) {
          const loot = generator.getLootAt(x, y, z)
          chests.create(x, y, z, loot ? { table: loot.table, seed: saveData.seed } : undefined)
          callbacksRef.current.onInteraction({ type: 'chest', position: { x, y, z } })
        }
      }
      if (event.code === 'KeyG') {
        const selected = selectedRef.current
        const food = ITEMS[selected].foodValue && inventory.has(selected)
          ? selected
          : (Object.keys(ITEMS) as ItemId[]).find((item) => Boolean(ITEMS[item].foodValue) && inventory.has(item))
        if (food && hunger.eat(ITEMS[food].foodValue ?? 0)) {
          inventory.remove(food)
          statistics.recordFoodConsumed()
          achievements.evaluate(statistics.snapshot())
          changedInventory()
          audio.play('eat')
          publishStatus(true)
        }
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
    let statusTime = 0
    let shadowsEnabled = true
    let lowFpsSamples = 0
    let resolutionReduced = false

    const render = (time: number) => {
      animationFrame = requestAnimationFrame(render)
      const delta = Math.min(clock.getDelta(), 0.05)
      const activeGameplay = document.pointerLockElement === canvas && !pausedRef.current && !health.isDead
      chunks.update(player.position.x, player.position.z)

      if (activeGameplay) {
        cycle.update(delta)
        totalWorldTime += delta
        combat.update(delta)
        player.update(delta)
        hunger.update(delta, () => damagePlayer(2, 'starvation'), () => {
          if (health.heal(1)) publishStatus()
        }, saveData.settings.gameMode === 'creative' ? 0 : hungerRate[saveData.settings.difficulty])
        const completed = furnaces.tick(delta)
        if (completed > 0) callbacksRef.current.onSimulationChange()
        if (farming.update(totalWorldTime) > 0) {
          for (const key of blocks.takeDirtyChunks()) {
            const { x, z } = parseChunkKey(key)
            refresh(x * CHUNK_SIZE + 1, z * CHUNK_SIZE + 1)
          }
        }
        entities.update(delta, { playerPosition: player.position, daylight: cycle.lighting.daylight, difficulty: saveData.settings.difficulty })
        npcs.update(delta, player.position, (settingsRef.current.renderDistance + 2) * CHUNK_SIZE)

        const moved = Math.hypot(player.position.x - previousPosition.x, player.position.z - previousPosition.z)
        if (moved > 0 && moved < 2) statistics.recordDistanceTraveled(moved)
        previousPosition.copy(player.position)
        const position = player.getSerializablePosition()
        const currentChunk = chunkKey(blockChunk(position.x), blockChunk(position.z))
        if (!visitedChunks.has(currentChunk)) {
          visitedChunks.add(currentChunk)
          statistics.recordChunkVisited()
          callbacksRef.current.onSimulationChange()
        }
        const biome = generator.getBiome(Math.floor(position.x), Math.floor(position.z))
        if (!discoveredBiomes.has(biome)) {
          discoveredBiomes.add(biome)
          statistics.recordBiomeDiscovered()
          callbacksRef.current.onSimulationChange()
        }
        const day = Math.floor(totalWorldTime / 600)
        if (day > lastRecordedDay) {
          statistics.recordDaySurvived(day - lastRecordedDay)
          lastRecordedDay = day
          callbacksRef.current.onSimulationChange()
        }
        achievements.recordDepth(position.y)
        achievements.evaluate(statistics.snapshot())
      }

      camera.getWorldDirection(direction)
      target = voxelRaycaster.cast(camera.position, direction)
      const entityHit = entities.raycastTarget(camera)
      entityTarget = entityHit && (!target || entityHit.distance < target.distance) ? entityHit.id : null
      const npcHit = npcs.target(camera)
      npcTarget = npcHit && (!target || npcHit.position.distanceTo(camera.position) < target.distance) ? npcHit : null
      if (target) {
        outline.visible = entityTarget === null && npcTarget === null
        outline.position.set(target.block.x + 0.5, target.block.y + 0.5, target.block.z + 0.5)
      } else {
        outline.visible = false
      }

      if (activeGameplay && primaryHeld && entityTarget === null && target) {
        const selected = inventory.has(selectedRef.current) ? selectedRef.current : 'grass'
        const complete = mining.update(delta, { key: `${target.block.x},${target.block.y},${target.block.z}`, type: target.type }, selected, saveData.settings.gameMode === 'creative')
        if (complete) {
          const { x, y, z } = target.block
          const removed = blocks.getBlock(x, y, z)
          if (removed === BlockType.CropMature) {
            const result = farming.harvest(x, y, z)
            if (result) {
              achievements.recordHarvest()
              achievements.evaluate(statistics.snapshot())
              statistics.recordBlockMined()
              changedInventory()
              refresh(x, z)
            }
          } else if (removed !== BlockType.Air && blocks.setBlock(x, y, z, BlockType.Air)) {
            farming.removeCrop(x, y, z)
            if (removed === BlockType.Furnace) furnaces.removeFurnace(x, y, z)
            if (removed === BlockType.Chest) chests.remove(x, y, z)
            const harvest = ToolSystem.canHarvest(removed, selected)
            if (harvest.allowed && saveData.settings.gameMode !== 'creative') drops.spawn(BLOCKS[removed].drop, target.block)
            useTool(selected)
            statistics.recordBlockMined()
            achievements.evaluate(statistics.snapshot())
            refresh(x, z)
            audio.play('break')
          }
          mining.cancel()
        }
      } else if (mining.progress > 0) {
        mining.cancel()
      }
      const progress = mining.progress
      outlineMaterial.color.setHSL(0.14 * (1 - progress), 0.78, 0.68)
      outlineMaterial.opacity = 0.7 + progress * 0.3

      drops.update(delta, player.position)
      localLights.update(delta, player.getSerializablePosition())
      const currentBiome = generator.getBiome(Math.floor(player.position.x), Math.floor(player.position.z))
      const weatherState = activeGameplay ? weather.update(delta, cycle.time, currentBiome) : weather.current
      weatherRenderer.update(delta, player.position, weatherState)
      if (activeGameplay && weatherState.rainRate > 0.15) {
        rainSoundTimer -= delta
        if (rainSoundTimer <= 0) {
          audio.play('rain')
          rainSoundTimer = 2.2
        }
      }

      const lighting = cycle.lighting
      sun.position.set(Math.cos(lighting.sunAngle) * 48, lighting.sunHeight * 48, Math.sin(lighting.sunAngle) * 32)
      sun.intensity = (0.06 + lighting.daylight * 2.2) * (1 - weatherState.skyDarkening * 0.55)
      sun.castShadow = shadowsEnabled && lighting.daylight > 0.12
      ambient.intensity = (0.22 + lighting.daylight * 1.35) * (1 - weatherState.skyDarkening * 0.4)
      skyColor.copy(nightSky).lerp(daySky, lighting.daylight)
      if (lighting.phase === 'Sunset' || lighting.phase === 'Sunrise') {
        const twilight = Math.max(0, 1 - Math.abs(lighting.daylight - 0.5) * 2)
        skyColor.lerp(twilightSky, twilight * 0.42)
      }
      skyColor.multiplyScalar(1 - weatherState.skyDarkening * 0.35)
      if (weatherState.lightning) skyColor.lerp(new THREE.Color(0xdde8ff), 0.72)
      fog.color.copy(skyColor)

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
        const position = player.getSerializablePosition()
        const biomeName = BIOMES[currentBiome].name
        callbacksRef.current.onHudChange({ fps, position, time: lighting.clock, phase: lighting.phase, biome: biomeName })
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        callbacksRef.current.onDebugChange({
          fps,
          frameTime: fps > 0 ? 1000 / fps : 0,
          position,
          biome: biomeName,
          chunkX: blockChunk(position.x),
          chunkZ: blockChunk(position.z),
          chunksLoaded: chunks.metrics.loaded,
          entities: entities.metrics.active + npcs.count,
          triangles: renderer.info.render.triangles,
          memoryMb: memory ? memory.usedJSHeapSize / 1048576 : undefined,
          seed: saveData.seed,
          worldTime: lighting.clock,
          gameMode: saveData.settings.gameMode,
          difficulty: saveData.settings.difficulty,
          renderDistance: settingsRef.current.renderDistance,
        })
        fpsTime = time
        frameCount = 0
      }
    }
    animationFrame = requestAnimationFrame(render)
    const autosave = window.setInterval(save, 10000)

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
      runtimeRef.current = null
      entities.dispose()
      npcs.dispose()
      weatherRenderer.dispose()
      drops.dispose()
      chunks.dispose()
      outlineGeometry.dispose()
      outlineMaterial.dispose()
      renderer.dispose()
      generator.clearCaches()
    }
  }, [achievements, armor, audio, chests, furnaces, inventory, saveData, statistics, trading])

  return (
    <div className="game-canvas" ref={hostRef}>
      <canvas ref={canvasRef} />
      {!isLocked && !paused && !isDead && (
        <button className="focus-prompt" type="button" onClick={() => canvasRef.current?.requestPointerLock()}>
          <span>Click to enter the wild</span>
          <small>ESC pauses the game</small>
        </button>
      )}
    </div>
  )
}
