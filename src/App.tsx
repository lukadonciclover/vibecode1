import { useEffect, useState } from 'react'
import { FUEL_VALUES, SMELTING_RECIPES } from './data/smelting'
import { HOTBAR_ITEMS, ITEM_IDS, ITEMS } from './data/items'
import type { CraftingStation, Recipe } from './data/recipes'
import type { VillageProfession } from './game/world'
import { AchievementToast } from './components/AchievementToast'
import { AchievementsUI } from './components/AchievementsUI'
import { ChestUI, type ChestTransferAmount, type ChestTransferDirection } from './components/ChestUI'
import { CreativeInventory, type CreativeCategory, type CreativeTakeAmount } from './components/CreativeInventory'
import { Crosshair } from './components/Crosshair'
import { DeathScreen } from './components/DeathScreen'
import { DebugOverlay, type DebugMetrics } from './components/DebugOverlay'
import { DialogueBox } from './components/DialogueBox'
import { EquipmentPanel, type EquipmentSlot } from './components/EquipmentPanel'
import { FurnaceUI, type FurnaceSlot, type FurnaceSlotAction, type FurnaceTransferAmount } from './components/FurnaceUI'
import { GameCanvas, type GameInteraction, type GameStatus, type HudStatus } from './components/GameCanvas'
import { HealthBar } from './components/HealthBar'
import { Hotbar } from './components/Hotbar'
import { Hud } from './components/Hud'
import { HungerBar } from './components/HungerBar'
import { Inventory } from './components/Inventory'
import { PauseMenu, type PauseMenuTab } from './components/PauseMenu'
import { SettingsMenu } from './components/SettingsMenu'
import { StatisticsUI } from './components/StatisticsUI'
import { TradingUI } from './components/TradingUI'
import { WorldCreationScreen, type WorldCreationDraft } from './components/WorldCreationScreen'
import { AudioManager } from './game/AudioManager'
import { CraftingSystem } from './game/CraftingSystem'
import { FurnaceSystem } from './game/crafting/FurnaceSystem'
import { InventorySystem } from './game/InventorySystem'
import { ArmorSystem } from './game/items/ArmorSystem'
import { AchievementSystem, type AchievementUnlockEvent } from './game/progression/AchievementSystem'
import { StatisticsSystem } from './game/progression/StatisticsSystem'
import { SaveSystem } from './game/SaveSystem'
import { SettingsSystem } from './game/SettingsSystem'
import { ChestSystem } from './game/storage/ChestSystem'
import { TradingSystem } from './game/trading/TradingSystem'
import { DEFAULT_USER_SETTINGS, type ItemId, type PlayerPosition, type SaveData, type UserSettings } from './game/types'

type Coordinate = Pick<PlayerPosition, 'x' | 'y' | 'z'>
type Panel =
  | { type: 'inventory'; station: CraftingStation }
  | { type: 'creative' }
  | { type: 'furnace'; position: Coordinate }
  | { type: 'chest'; position: Coordinate }
  | { type: 'dialogue'; name: string; profession: VillageProfession }
  | { type: 'trading'; name: string; profession: VillageProfession }
  | { type: 'pause' }

const DEFAULT_HUD: HudStatus = {
  fps: 0,
  position: { x: 0, y: 0, z: 0 },
  time: '12:00',
  phase: 'Day',
  biome: 'Plains',
}

const DEFAULT_DEBUG: DebugMetrics = {
  fps: 0,
  position: { x: 0, y: 0, z: 0 },
  biome: 'Plains',
  chunksLoaded: 0,
  entities: 0,
  seed: '',
}

function amountFor(count: number, amount: FurnaceTransferAmount | ChestTransferAmount) {
  if (amount === 'stack') return count
  if (amount === 'half') return Math.max(1, Math.ceil(count / 2))
  return 1
}

function Game({ saveData, initialSettings, onExit }: { saveData: SaveData; initialSettings: UserSettings; onExit: () => void }) {
  const creative = saveData.settings.gameMode === 'creative'
  const [inventory] = useState(() => new InventorySystem(saveData.inventory, saveData.durability, creative))
  const [crafting] = useState(() => new CraftingSystem(inventory))
  const [audio] = useState(() => new AudioManager())
  const [armor] = useState(() => new ArmorSystem(inventory, saveData.equipment))
  const [furnaces] = useState(() => new FurnaceSystem(inventory, saveData.blockEntities))
  const [chests] = useState(() => new ChestSystem(inventory, saveData.blockEntities))
  const [trading] = useState(() => new TradingSystem(inventory, saveData.tradeUses))
  const [statistics] = useState(() => new StatisticsSystem(saveData.statistics))
  const [toast, setToast] = useState<AchievementUnlockEvent | null>(null)
  const [achievements] = useState(() => new AchievementSystem({ unlockedIds: saveData.achievements, onUnlock: setToast }))
  const [revision, setRevision] = useState(0)
  const [selectedItem, setSelectedItem] = useState<ItemId>(saveData.selectedItem)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [pauseTab, setPauseTab] = useState<PauseMenuTab>('game')
  const [settings, setSettings] = useState(initialSettings)
  const [saveRevision, setSaveRevision] = useState(0)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [respawnRevision, setRespawnRevision] = useState(0)
  const [debugVisible, setDebugVisible] = useState(false)
  const [creativeQuery, setCreativeQuery] = useState('')
  const [creativeCategory, setCreativeCategory] = useState<CreativeCategory>('all')
  const [status, setStatus] = useState<GameStatus>({
    health: saveData.health,
    hunger: saveData.hunger,
    dead: saveData.health <= 0,
    miningProgress: 0,
    flying: false,
  })
  const [hud, setHud] = useState<HudStatus>({ ...DEFAULT_HUD, position: saveData.position })
  const [debug, setDebug] = useState<DebugMetrics>({ ...DEFAULT_DEBUG, seed: saveData.seed, position: saveData.position })
  const inventorySnapshot = inventory.snapshot()
  const paused = panel !== null || status.dead

  useEffect(() => () => audio.dispose(), [audio])

  useEffect(() => {
    audio.setVolume(settings.masterVolume * settings.soundVolume)
  }, [audio, settings.masterVolume, settings.soundVolume])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (status.dead || event.repeat) return
      if (event.code === 'F3') {
        event.preventDefault()
        setDebugVisible((visible) => !visible)
        return
      }
      if (event.code === 'Escape') {
        if (panel) setPanel(null)
        else setPanel({ type: 'pause' })
        return
      }
      if (event.code === 'KeyE') {
        if (panel?.type === 'inventory' || panel?.type === 'creative') setPanel(null)
        else if (!panel) setPanel(creative ? { type: 'creative' } : { type: 'inventory', station: 'inventory' })
        return
      }
      if (event.code.startsWith('Digit') && !panel) {
        const digit = Number(event.code.slice(5))
        const item = HOTBAR_ITEMS[digit === 0 ? 9 : digit - 1]
        if (item) setSelectedItem(item)
      }
    }
    const onWheel = (event: WheelEvent) => {
      if (paused) return
      event.preventDefault()
      setSelectedItem((current) => {
        const index = Math.max(0, HOTBAR_ITEMS.indexOf(current))
        return HOTBAR_ITEMS[(index + (event.deltaY > 0 ? 1 : -1) + HOTBAR_ITEMS.length) % HOTBAR_ITEMS.length]
      })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
    }
  }, [creative, panel, paused, status.dead])

  useEffect(() => {
    const timeout = toast ? window.setTimeout(() => setToast(null), 5000) : 0
    return () => window.clearTimeout(timeout)
  }, [toast])

  const changed = () => setRevision((value) => value + 1)

  const evaluateAchievements = () => achievements.evaluate(statistics.snapshot())

  const craft = (recipe: Recipe) => {
    const station = panel?.type === 'inventory' ? panel.station : 'inventory'
    if (!crafting.craft(recipe, station)) return
    statistics.recordItemCrafted(recipe.output.quantity)
    if (ITEMS[recipe.output.item].type === 'tool' || ITEMS[recipe.output.item].type === 'weapon') achievements.recordToolCrafted()
    evaluateAchievements()
    audio.play('craft')
    changed()
  }

  const handleInteraction = (interaction: GameInteraction) => {
    if (interaction.type === 'crafting') setPanel({ type: 'inventory', station: 'table' })
    if (interaction.type === 'furnace') setPanel({ type: 'furnace', position: interaction.position })
    if (interaction.type === 'chest') setPanel({ type: 'chest', position: interaction.position })
    if (interaction.type === 'npc') setPanel({ type: 'dialogue', name: interaction.npc.name, profession: interaction.npc.profession })
  }

  const handleFurnace = (slot: FurnaceSlot, action: FurnaceSlotAction, amount: FurnaceTransferAmount) => {
    if (panel?.type !== 'furnace') return
    const { x, y, z } = panel.position
    const state = furnaces.getState(x, y, z)
    if (!state) return
    if (action === 'insert') {
      const existing = slot === 'input' || slot === 'fuel' ? state[slot]?.item : undefined
      const valid = existing && inventorySnapshot[existing] > 0 ? existing : ITEM_IDS.find((item) => inventorySnapshot[item] > 0 && (slot === 'input'
        ? SMELTING_RECIPES.some((recipe) => recipe.input === item)
        : slot === 'fuel' && Boolean(FUEL_VALUES[item])))
      if (valid && slot === 'input') furnaces.insertInput(x, y, z, valid, amountFor(inventorySnapshot[valid], amount))
      if (valid && slot === 'fuel') furnaces.insertFuel(x, y, z, valid, amountFor(inventorySnapshot[valid], amount))
    } else {
      const stack = state[slot]
      const quantity = stack ? amountFor(stack.count, amount) : 0
      if (slot === 'input') furnaces.extractInput(x, y, z, quantity)
      if (slot === 'fuel') furnaces.extractFuel(x, y, z, quantity)
      if (slot === 'output') furnaces.extractOutput(x, y, z, quantity)
    }
    changed()
  }

  const handleChest = (item: ItemId, direction: ChestTransferDirection, amount: ChestTransferAmount) => {
    if (panel?.type !== 'chest') return
    const { x, y, z } = panel.position
    const chest = chests.get(x, y, z)
    const count = direction === 'to-chest' ? inventorySnapshot[item] : chest?.items[item] ?? 0
    const quantity = amountFor(count, amount)
    if (direction === 'to-chest') chests.transferToChest(x, y, z, item, quantity)
    else chests.transferToPlayer(x, y, z, item, quantity)
    changed()
  }

  const equip = (slot: EquipmentSlot, item: ItemId) => {
    const success = slot === 'offhand' ? armor.setOffhand(item) : armor.equip(item)
    if (success) changed()
  }

  const updateSettings = (next: UserSettings) => {
    setSettings(next)
    SettingsSystem.save(next)
    if (next.fullscreen && !document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => undefined)
    if (!next.fullscreen && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }

  const furnaceState = panel?.type === 'furnace' ? furnaces.getState(panel.position.x, panel.position.y, panel.position.z) : null
  const chestState = panel?.type === 'chest' ? chests.get(panel.position.x, panel.position.y, panel.position.z) : null
  const pausePanels = {
    settings: <SettingsMenu settings={settings} onChange={updateSettings} onReset={() => updateSettings(DEFAULT_USER_SETTINGS)} />,
    statistics: <StatisticsUI statistics={statistics.snapshot()} />,
    achievements: <AchievementsUI unlockedIds={achievements.snapshot()} statistics={statistics.snapshot()} />,
  }

  return (
    <main className="game-screen" data-revision={revision}>
      <GameCanvas
        saveData={saveData}
        inventory={inventory}
        armor={armor}
        furnaces={furnaces}
        chests={chests}
        trading={trading}
        statistics={statistics}
        achievements={achievements}
        selectedItem={selectedItem}
        paused={paused}
        settings={settings}
        audio={audio}
        respawnRevision={respawnRevision}
        saveRevision={saveRevision}
        onInventoryChange={changed}
        onSimulationChange={changed}
        onInteraction={handleInteraction}
        onStatusChange={setStatus}
        onHudChange={setHud}
        onDebugChange={setDebug}
        onSave={(success) => setSaveStatus(success ? 'World saved' : SaveSystem.lastError)}
      />
      <div className="game-ui">
        <Hud {...hud} seed={saveData.seed} showFps={settings.showFps} />
        {saveData.settings.gameMode === 'survival' && (
          <div className="survival-bars">
            <HealthBar value={status.health} max={100} />
            <HungerBar value={status.hunger} max={100} />
          </div>
        )}
        <button className="menu-button" type="button" onClick={() => setPanel({ type: 'pause' })}>Pause</button>
        {!paused && <Crosshair />}
        <Hotbar selected={selectedItem} inventory={inventorySnapshot} onSelect={setSelectedItem} />
        <div className="action-hint"><b>LMB</b> Mine / attack <b>RMB</b> Place / farm <b>F</b> Interact <b>G</b> Eat <b>E</b> Inventory</div>
        {status.flying && <div className="flight-indicator">Flying</div>}
        {status.miningProgress > 0 && <div className="mining-progress"><i style={{ width: `${status.miningProgress * 100}%` }} /></div>}
        <DebugOverlay metrics={debug} visible={debugVisible} version="Wildcube Phase 3" />

        {panel?.type === 'inventory' && (
          <div className="modal-layer">
            <Inventory
              inventory={inventorySnapshot}
              station={panel.station}
              recipes={crafting.recipesFor(panel.station)}
              canCraft={(recipe) => crafting.canCraft(recipe)}
              onCraft={craft}
              onSelectItem={setSelectedItem}
              onClose={() => setPanel(null)}
            />
            <EquipmentPanel
              equipment={armor.snapshot()}
              inventory={inventorySnapshot}
              onEquip={equip}
              onUnequip={(slot) => { if (armor.unequip(slot)) changed() }}
            />
          </div>
        )}
        {panel?.type === 'creative' && (
          <CreativeInventory
            query={creativeQuery}
            category={creativeCategory}
            onQueryChange={setCreativeQuery}
            onCategoryChange={setCreativeCategory}
            onTakeItem={(item: ItemId, amount: CreativeTakeAmount) => {
              inventory.add(item, amount === 'stack' ? ITEMS[item].stackSize : amount)
              setSelectedItem(item)
              changed()
            }}
            onClose={() => setPanel(null)}
          />
        )}
        {furnaceState && <FurnaceUI furnace={furnaceState} onSlotAction={handleFurnace} onClose={() => setPanel(null)} />}
        {chestState && <ChestUI chest={chestState} playerInventory={inventorySnapshot} onTransfer={handleChest} onClose={() => setPanel(null)} />}
        {panel?.type === 'dialogue' && (
          <DialogueBox
            speaker={panel.name}
            profession={panel.profession}
            text="The wilderness rewards those who prepare. I may have supplies to exchange."
            choices={[{ id: 'trade', label: 'Show me your trades' }, { id: 'leave', label: 'Goodbye' }]}
            onChoice={(choice) => choice.id === 'trade'
              ? setPanel({ type: 'trading', name: panel.name, profession: panel.profession })
              : setPanel(null)}
            onClose={() => setPanel(null)}
          />
        )}
        {panel?.type === 'trading' && (
          <TradingUI
            npcName={panel.name}
            profession={panel.profession}
            inventory={inventorySnapshot}
            uses={trading.snapshot()}
            onTrade={(trade) => {
              if (!trading.execute(trade.id)) return
              audio.play('craft')
              changed()
            }}
            onClose={() => setPanel(null)}
          />
        )}
        {panel?.type === 'pause' && (
          <PauseMenu
            activeTab={pauseTab}
            onTabChange={setPauseTab}
            onResume={() => setPanel(null)}
            onSave={() => { setSaveStatus('Saving...'); setSaveRevision((value) => value + 1) }}
            onQuit={onExit}
            panels={pausePanels}
            worldName={saveData.name}
            status={saveStatus}
          />
        )}
        {toast && <AchievementToast event={toast} onDismiss={() => setToast(null)} />}
        {status.dead && <DeathScreen onRespawn={() => setRespawnRevision((value) => value + 1)} />}
      </div>
    </main>
  )
}

export default function App() {
  const [settings, setSettings] = useState(() => SettingsSystem.load())
  const [worlds, setWorlds] = useState(() => SaveSystem.listWorlds())
  const [session, setSession] = useState<SaveData | null>(null)
  const [error, setError] = useState<string | null>(SaveSystem.lastError)
  const [draft, setDraft] = useState<WorldCreationDraft>({
    name: 'Untamed World',
    seed: '',
    gameMode: 'survival',
    difficulty: 'normal',
    renderDistance: settings.renderDistance,
  })

  if (session) {
    return (
      <Game
        key={session.id}
        saveData={session}
        initialSettings={settings}
        onExit={() => {
          if (document.pointerLockElement) document.exitPointerLock()
          const nextSettings = SettingsSystem.load()
          setSettings(nextSettings)
          setSession(null)
          setWorlds(SaveSystem.listWorlds())
        }}
      />
    )
  }

  return (
    <WorldCreationScreen
      worlds={worlds}
      draft={draft}
      onDraftChange={setDraft}
      error={error}
      onCreate={(next) => {
        const seed = next.seed.trim() || Math.random().toString(36).slice(2, 12)
        const save = SaveSystem.createWorld({ ...next, seed })
        if (!save) { setError(SaveSystem.lastError); return }
        const nextSettings = { ...settings, renderDistance: next.renderDistance }
        SettingsSystem.save(nextSettings)
        setSettings(nextSettings)
        setSession(save)
      }}
      onLoad={(id) => {
        const save = SaveSystem.load(id)
        if (save) {
          const nextSettings = { ...settings, renderDistance: save.settings.renderDistance }
          SettingsSystem.save(nextSettings)
          setSettings(nextSettings)
          setSession(save)
        }
        else setError(SaveSystem.lastError)
      }}
      onDelete={(id) => {
        const world = worlds.find((candidate) => candidate.id === id)
        if (!window.confirm(`Delete ${world?.name ?? 'this world'}? This cannot be undone.`)) return
        if (!SaveSystem.deleteWorld(id)) setError(SaveSystem.lastError)
        setWorlds(SaveSystem.listWorlds())
      }}
    />
  )
}
