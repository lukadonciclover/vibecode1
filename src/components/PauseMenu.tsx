import type { ReactNode } from 'react'

export type PauseMenuTab = 'game' | 'settings' | 'statistics' | 'achievements'

export interface PauseMenuProps {
  activeTab: PauseMenuTab
  onTabChange: (tab: PauseMenuTab) => void
  onResume: () => void
  onSave?: () => void
  onQuit: () => void
  panels?: Partial<Record<PauseMenuTab, ReactNode>>
  worldName?: string
  saveDisabled?: boolean
  status?: string | null
}

const TABS: readonly { id: PauseMenuTab; label: string }[] = [
  { id: 'game', label: 'Game' },
  { id: 'settings', label: 'Settings' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'achievements', label: 'Achievements' },
]

export function PauseMenu({
  activeTab,
  onTabChange,
  onResume,
  onSave,
  onQuit,
  panels,
  worldName = 'Current world',
  saveDisabled = false,
  status,
}: PauseMenuProps) {
  return (
    <div className="pause-menu" role="dialog" aria-modal="true" aria-labelledby="pause-menu-title">
      <section className="pause-menu__panel">
        <header className="pause-menu__header">
          <div>
            <span className="eyebrow">Game paused</span>
            <h2 id="pause-menu-title">{worldName}</h2>
          </div>
          <button className="pause-menu__resume" type="button" onClick={onResume}>Resume</button>
        </header>

        <nav className="pause-menu__tabs" aria-label="Pause menu">
          {TABS.map((tab) => (
            <button
              className={activeTab === tab.id ? 'is-active' : undefined}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              key={tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="pause-menu__content" role="tabpanel">
          {panels?.[activeTab] ?? (activeTab === 'game' ? (
            <div className="pause-menu__game-tab">
              <h3>Paused</h3>
              <p>Your world waits exactly as you left it.</p>
              <div className="pause-menu__controls">
                <span><kbd>WASD</kbd> Move</span>
                <span><kbd>Space</kbd> Jump</span>
                <span><kbd>E</kbd> Inventory</span>
                <span><kbd>Esc</kbd> Resume</span>
              </div>
            </div>
          ) : <p className="pause-menu__empty">No panel was provided for this tab.</p>)}
        </div>

        <footer className="pause-menu__footer">
          {status && <p role="status">{status}</p>}
          <div className="pause-menu__actions">
            {onSave && <button type="button" onClick={onSave} disabled={saveDisabled}>Save world</button>}
            <button className="pause-menu__quit" type="button" onClick={onQuit}>Save and quit</button>
          </div>
        </footer>
      </section>
    </div>
  )
}
