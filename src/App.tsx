import { useEffect, useState } from 'react'
import { HOTBAR_ITEMS } from './data/items'
import type { CraftingStation, Recipe } from './data/recipes'
import { Crosshair } from './components/Crosshair'
import { DeathScreen } from './components/DeathScreen'
import { GameCanvas, type GameStatus, type HudStatus } from './components/GameCanvas'
import { HealthBar } from './components/HealthBar'
import { Hotbar } from './components/Hotbar'
import { Hud } from './components/Hud'
import { HungerBar } from './components/HungerBar'
import { Inventory } from './components/Inventory'
import { MainMenu } from './components/MainMenu'
import { AudioManager } from './game/AudioManager'
import { CraftingSystem } from './game/CraftingSystem'
import { InventorySystem } from './game/InventorySystem'
import { SaveSystem } from './game/SaveSystem'
import type { ItemId, SaveData } from './game/types'

interface Session {
  seed: string
  savedWorld: SaveData | null
}

function Game({ session, onExit }: { session: Session; onExit: () => void }) {
  const [inventory] = useState(() => new InventorySystem(session.savedWorld?.inventory))
  const [crafting] = useState(() => new CraftingSystem(inventory))
  const [audio] = useState(() => new AudioManager())
  const [inventoryRevision, setInventoryRevision] = useState(0)
  const [selectedItem, setSelectedItem] = useState<ItemId>(session.savedWorld?.selectedItem ?? 'grass')
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [craftingStation, setCraftingStation] = useState<CraftingStation>('inventory')
  const [respawnRevision, setRespawnRevision] = useState(0)
  const [status, setStatus] = useState<GameStatus>({
    health: session.savedWorld?.health ?? 100,
    hunger: session.savedWorld?.hunger ?? 100,
    dead: (session.savedWorld?.health ?? 100) <= 0,
    miningProgress: 0,
  })
  const [hud, setHud] = useState<HudStatus>({ fps: 0, position: session.savedWorld?.position ?? { x: 0, y: 0, z: 0 }, time: '12:00', phase: 'Day', biome: 'Plains' })
  const inventorySnapshot = inventory.snapshot()

  useEffect(() => () => audio.dispose(), [audio])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (status.dead) return
      if (event.code === 'KeyE' && !event.repeat) {
        setCraftingStation('inventory')
        setInventoryOpen((open) => !open)
        return
      }
      if (event.code.startsWith('Digit') && !inventoryOpen) {
        const digit = Number(event.code.slice(5))
        const index = digit === 0 ? 9 : digit - 1
        if (HOTBAR_ITEMS[index]) setSelectedItem(HOTBAR_ITEMS[index])
      }
    }
    const onWheel = (event: WheelEvent) => {
      if (inventoryOpen || status.dead) return
      event.preventDefault()
      setSelectedItem((current) => {
        const currentIndex = Math.max(0, HOTBAR_ITEMS.indexOf(current))
        return HOTBAR_ITEMS[(currentIndex + (event.deltaY > 0 ? 1 : -1) + HOTBAR_ITEMS.length) % HOTBAR_ITEMS.length]
      })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
    }
  }, [inventoryOpen, status.dead])

  const craft = (recipe: Recipe) => {
    if (!crafting.craft(recipe, craftingStation)) return
    audio.play('craft')
    setInventoryRevision((revision) => revision + 1)
  }

  return (
    <main className="game-screen">
      <GameCanvas
        seed={session.seed}
        savedWorld={session.savedWorld}
        inventory={inventory}
        selectedItem={selectedItem}
        inventoryOpen={inventoryOpen}
        audio={audio}
        respawnRevision={respawnRevision}
        onInventoryChange={() => setInventoryRevision((revision) => revision + 1)}
        onOpenCraftingTable={() => {
          setCraftingStation('table')
          setInventoryOpen(true)
        }}
        onStatusChange={setStatus}
        onHudChange={setHud}
      />
      <div className="game-ui" data-revision={inventoryRevision}>
        <Hud {...hud} seed={session.seed} />
        <div className="survival-bars">
          <HealthBar value={status.health} max={100} />
          <HungerBar value={status.hunger} max={100} />
        </div>
        <button className="menu-button" type="button" onClick={onExit}>Menu</button>
        {!inventoryOpen && !status.dead && <Crosshair />}
        <Hotbar selected={selectedItem} inventory={inventorySnapshot} onSelect={setSelectedItem} />
        <div className="action-hint"><b>LMB</b> Mine / attack <b>RMB</b> Place <b>F</b> Table <b>G</b> Eat berry</div>
        {status.miningProgress > 0 && <div className="mining-progress"><i style={{ width: `${status.miningProgress * 100}%` }} /></div>}
        {inventoryOpen && (
          <Inventory
            inventory={inventorySnapshot}
            station={craftingStation}
            recipes={crafting.recipesFor(craftingStation)}
            canCraft={(recipe) => crafting.canCraft(recipe)}
            onCraft={craft}
            onClose={() => setInventoryOpen(false)}
          />
        )}
        {status.dead && <DeathScreen onRespawn={() => setRespawnRevision((revision) => revision + 1)} />}
      </div>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [canContinue, setCanContinue] = useState(() => SaveSystem.hasSave())

  useEffect(() => {
    if (!session) setCanContinue(SaveSystem.hasSave())
  }, [session])

  if (session) {
    return (
      <Game
        key={`${session.seed}-${session.savedWorld?.updatedAt ?? 'new'}`}
        session={session}
        onExit={() => {
          if (document.pointerLockElement) document.exitPointerLock()
          setSession(null)
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
