import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { BlockManager } from '../game/BlockManager'
import { ChunkManager } from '../game/ChunkManager'
import { InventorySystem } from '../game/InventorySystem'
import { PlayerController } from '../game/PlayerController'
import { SaveSystem } from '../game/SaveSystem'
import { VoxelRaycaster, type VoxelHit } from '../game/VoxelRaycaster'
import { WorldGenerator } from '../game/WorldGenerator'
import { BlockType, type PlaceableBlock, type PlayerPosition, type SaveData } from '../game/types'

interface GameCanvasProps {
  seed: string
  savedWorld: SaveData | null
  inventory: InventorySystem
  selected: PlaceableBlock
  inventoryOpen: boolean
  onInventoryChange: () => void
  onHudChange: (fps: number, position: PlayerPosition) => void
}

export function GameCanvas({
  seed,
  savedWorld,
  inventory,
  selected,
  inventoryOpen,
  onInventoryChange,
  onHudChange,
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerRef = useRef<PlayerController | null>(null)
  const selectedRef = useRef(selected)
  const inventoryOpenRef = useRef(inventoryOpen)
  const callbacksRef = useRef({ onInventoryChange, onHudChange })
  const [isLocked, setIsLocked] = useState(false)

  selectedRef.current = selected
  inventoryOpenRef.current = inventoryOpen
  callbacksRef.current = { onInventoryChange, onHudChange }

  useEffect(() => {
    playerRef.current?.setPaused(inventoryOpen || !isLocked)
    if (inventoryOpen && document.pointerLockElement) document.exitPointerLock()
  }, [inventoryOpen, isLocked])

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x9ac3c4)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x9ac3c4)
    scene.fog = new THREE.Fog(0x9ac3c4, 34, 76)
    const camera = new THREE.PerspectiveCamera(72, host.clientWidth / host.clientHeight, 0.05, 100)
    const generator = new WorldGenerator(seed)
    const blocks = new BlockManager(generator, savedWorld?.changes)
    const chunks = new ChunkManager(blocks)
    chunks.buildWorld()
    scene.add(chunks.group)

    const ambient = new THREE.HemisphereLight(0xd9f4ef, 0x544735, 1.7)
    const sun = new THREE.DirectionalLight(0xfff2c7, 2.15)
    sun.position.set(-18, 30, 12)
    scene.add(ambient, sun)

    const start = savedWorld?.position ?? blocks.findSpawn()
    const player = new PlayerController(camera, canvas, blocks, start)
    player.setPaused(true)
    playerRef.current = player
    const voxelRaycaster = new VoxelRaycaster(blocks)
    let target: VoxelHit | null = null

    const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.008, 1.008, 1.008))
    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xfff0a6, transparent: true, opacity: 0.95 })
    const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial)
    outline.visible = false
    outline.renderOrder = 5
    scene.add(outline)

    const save = () => {
      SaveSystem.save({
        version: 1,
        seed,
        position: player.getSerializablePosition(),
        inventory: inventory.snapshot(),
        changes: blocks.getChanges(),
        updatedAt: Date.now(),
      })
    }

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas
      setIsLocked(locked)
      player.setPaused(!locked || inventoryOpenRef.current)
    }

    const onMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        if (!inventoryOpenRef.current) canvas.requestPointerLock()
        return
      }
      if (!target) return

      if (event.button === 0) {
        const { x, y, z } = target.block
        const removed = blocks.getBlock(x, y, z)
        if (removed === BlockType.Air || !blocks.setBlock(x, y, z, BlockType.Air)) return
        inventory.add(removed)
        chunks.refreshAt(x, z)
        callbacksRef.current.onInventoryChange()
        save()
      }

      if (event.button === 2) {
        const position = target.block.clone().add(target.normal)
        const x = Math.floor(position.x)
        const y = Math.floor(position.y)
        const z = Math.floor(position.z)
        const selectedBlock = selectedRef.current
        if (blocks.getBlock(x, y, z) !== BlockType.Air || player.intersectsBlock(x, y, z)) return
        if (!inventory.has(selectedBlock) || !blocks.setBlock(x, y, z, selectedBlock)) return
        inventory.remove(selectedBlock)
        chunks.refreshAt(x, z)
        callbacksRef.current.onInventoryChange()
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
    canvas.addEventListener('contextmenu', preventContextMenu)
    window.addEventListener('resize', onResize)
    window.addEventListener('beforeunload', onBeforeUnload)

    const clock = new THREE.Clock()
    const direction = new THREE.Vector3()
    let animationFrame = 0
    let frameCount = 0
    let fpsTime = performance.now()
    let lastHudTime = 0

    const render = (time: number) => {
      animationFrame = requestAnimationFrame(render)
      player.update(clock.getDelta())
      camera.getWorldDirection(direction)
      target = voxelRaycaster.cast(camera.position, direction)
      if (target) {
        outline.visible = true
        outline.position.set(target.block.x + 0.5, target.block.y + 0.5, target.block.z + 0.5)
      } else {
        outline.visible = false
      }

      renderer.render(scene, camera)
      frameCount += 1
      if (time - fpsTime >= 500) {
        const fps = Math.round((frameCount * 1000) / (time - fpsTime))
        if (time - lastHudTime >= 100) {
          callbacksRef.current.onHudChange(fps, player.getSerializablePosition())
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
      canvas.removeEventListener('contextmenu', preventContextMenu)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('beforeunload', onBeforeUnload)
      player.dispose()
      playerRef.current = null
      chunks.dispose()
      outlineGeometry.dispose()
      outlineMaterial.dispose()
      renderer.dispose()
    }
  }, [inventory, savedWorld, seed])

  return (
    <div className="game-canvas" ref={hostRef}>
      <canvas ref={canvasRef} />
      {!isLocked && !inventoryOpen && (
        <button className="focus-prompt" type="button" onClick={() => canvasRef.current?.requestPointerLock()}>
          <span>Click to enter the wild</span>
          <small>ESC releases the pointer</small>
        </button>
      )}
    </div>
  )
}
