import { useEffect, useRef, useState } from 'react'
import { Crosshair } from './components/Crosshair'
import { GameCanvas } from './components/GameCanvas'
import { Hotbar } from './components/Hotbar'
import { Hud } from './components/Hud'
import { Inventory } from './components/Inventory'
import { MainMenu } from './components/MainMenu'
import { InventorySystem } from './game/InventorySystem'
import { SaveSystem } from './game/SaveSystem'
import { PLACEABLE_BLOCKS, type PlayerPosition, type SaveData } from './game/types'

interface Session {
  seed: string
  savedWorld: SaveData | null
}

function Game({ session, onExit }: { session: Session; onExit: () => void }) {
  const inventoryRef = useRef(new InventorySystem(session.savedWorld?.inventory))
  const [inventoryRevision, setInventoryRevision] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [fps, setFps] = useState(0)
  const [position, setPosition] = useState<PlayerPosition>(session.savedWorld?.position ?? { x: 0, y: 0, z: 0 })
  const selected = PLACEABLE_BLOCKS[selectedIndex]
  const inventory = inventoryRef.current.snapshot()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyE' && !event.repeat) {
        setInventoryOpen((open) => !open)
        return
      }
      if (event.code.startsWith('Digit')) {
        const index = Number(event.code.slice(5)) - 1
        if (index >= 0 && index < PLACEABLE_BLOCKS.length) setSelectedIndex(index)
      }
    }
    const onWheel = (event: WheelEvent) => {
      if (inventoryOpen) return
      event.preventDefault()
      setSelectedIndex((current) => (current + (event.deltaY > 0 ? 1 : -1) + PLACEABLE_BLOCKS.length) % PLACEABLE_BLOCKS.length)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
    }
  }, [inventoryOpen])

  return (
    <main className="game-screen">
      <GameCanvas
        seed={session.seed}
        savedWorld={session.savedWorld}
        inventory={inventoryRef.current}
        selected={selected}
        inventoryOpen={inventoryOpen}
        onInventoryChange={() => setInventoryRevision((revision) => revision + 1)}
        onHudChange={(nextFps, nextPosition) => {
          setFps(nextFps)
          setPosition(nextPosition)
        }}
      />
      <div className="game-ui" data-revision={inventoryRevision}>
        <Hud fps={fps} position={position} seed={session.seed} />
        <button className="menu-button" type="button" onClick={onExit}>Menu</button>
        {!inventoryOpen && <Crosshair />}
        <Hotbar selected={selected} inventory={inventory} onSelect={(type) => setSelectedIndex(PLACEABLE_BLOCKS.indexOf(type))} />
        <div className="action-hint"><b>LMB</b> Break <b>RMB</b> Place <b>Shift</b> Sprint</div>
        {inventoryOpen && <Inventory inventory={inventory} onClose={() => setInventoryOpen(false)} />}
      </div>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [canContinue, setCanContinue] = useState(() => SaveSystem.hasSave())

  if (session) {
    return (
      <Game
        key={`${session.seed}-${session.savedWorld?.updatedAt ?? 'new'}`}
        session={session}
        onExit={() => {
          if (document.pointerLockElement) document.exitPointerLock()
          setSession(null)
          setCanContinue(SaveSystem.hasSave())
        }}
      />
    )
  }

  return (
    <MainMenu
      canContinue={canContinue}
      onNewWorld={(seed) => {
        SaveSystem.clear()
        setSession({ seed, savedWorld: null })
      }}
      onContinue={() => {
        const savedWorld = SaveSystem.load()
        if (savedWorld) setSession({ seed: savedWorld.seed, savedWorld })
        else setCanContinue(false)
      }}
    />
  )
}
