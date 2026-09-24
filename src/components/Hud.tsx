import type { PlayerPosition } from '../game/types'

interface HudProps {
  fps: number
  position: PlayerPosition
  seed: string
  time: string
  phase: string
  biome: string
}

export function Hud({ fps, position, seed, time, phase, biome }: HudProps) {
  return (
    <div className="hud-readout">
      <span>{fps} FPS</span>
      <span>X {Math.floor(position.x)} &nbsp; Y {Math.floor(position.y)} &nbsp; Z {Math.floor(position.z)}</span>
      <span>{time} / {phase} / {biome}</span>
      <span className="seed-label">SEED {seed}</span>
    </div>
  )
}
