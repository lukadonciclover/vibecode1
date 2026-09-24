import type { Difficulty, GameMode, PlayerPosition } from '../game/types'

export interface DebugMetrics {
  fps: number
  frameTime?: number
  position: PlayerPosition
  facing?: string
  biome: string
  chunkX?: number
  chunkZ?: number
  chunksLoaded: number
  entities: number
  triangles?: number
  memoryMb?: number
  seed: string
  worldTime?: string
  gameMode?: GameMode
  difficulty?: Difficulty
  renderDistance?: number
}

export interface DebugOverlayProps {
  metrics: DebugMetrics
  visible: boolean
  version?: string
}

function coordinate(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

export function DebugOverlay({ metrics, visible, version = 'Wildcube' }: DebugOverlayProps) {
  if (!visible) return null

  return (
    <aside className="debug-overlay" aria-label="Debug metrics">
      <div className="debug-overlay__column">
        <strong>{version}</strong>
        <span>{Math.round(metrics.fps)} fps{metrics.frameTime !== undefined ? ` (${metrics.frameTime.toFixed(1)} ms)` : ''}</span>
        <span>XYZ: {coordinate(metrics.position.x)} / {coordinate(metrics.position.y)} / {coordinate(metrics.position.z)}</span>
        {(metrics.chunkX !== undefined || metrics.chunkZ !== undefined) && <span>Chunk: {metrics.chunkX ?? '?'} / {metrics.chunkZ ?? '?'}</span>}
        {metrics.facing && <span>Facing: {metrics.facing}</span>}
        <span>Biome: {metrics.biome}</span>
        {metrics.worldTime && <span>Time: {metrics.worldTime}</span>}
        <span>Seed: {metrics.seed}</span>
      </div>
      <div className="debug-overlay__column debug-overlay__column--right">
        <span>Chunks: {metrics.chunksLoaded.toLocaleString()}</span>
        <span>Entities: {metrics.entities.toLocaleString()}</span>
        {metrics.triangles !== undefined && <span>Triangles: {metrics.triangles.toLocaleString()}</span>}
        {metrics.memoryMb !== undefined && <span>Memory: {metrics.memoryMb.toFixed(1)} MB</span>}
        {metrics.renderDistance !== undefined && <span>Render distance: {metrics.renderDistance}</span>}
        {metrics.gameMode && <span>Mode: {metrics.gameMode}</span>}
        {metrics.difficulty && <span>Difficulty: {metrics.difficulty}</span>}
      </div>
    </aside>
  )
}
