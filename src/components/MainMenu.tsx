import { useState } from 'react'

interface MainMenuProps {
  canContinue: boolean
  onNewWorld: (seed: string) => void
  onContinue: () => void
}

function randomSeed() {
  const parts = ['moss', 'ember', 'fern', 'quartz', 'drift', 'cedar', 'cloud', 'rill']
  const first = parts[Math.floor(Math.random() * parts.length)]
  const second = parts[Math.floor(Math.random() * parts.length)]
  return `${first}-${second}-${Math.floor(100 + Math.random() * 900)}`
}

export function MainMenu({ canContinue, onNewWorld, onContinue }: MainMenuProps) {
  const [seed, setSeed] = useState(randomSeed)

  return (
    <main className="main-menu">
      <div className="menu-landscape" aria-hidden="true">
        <div className="sun-disc" />
        <div className="hill hill-far" />
        <div className="hill hill-near" />
        <div className="menu-cubes"><i /><i /><i /><i /><i /></div>
      </div>
      <section className="menu-card">
        <div className="brand-mark"><i /><i /><i /></div>
        <span className="eyebrow">An untamed voxel sandbox</span>
        <h1>Wildcube</h1>
        <p className="menu-copy">Shape a small procedural wilderness, one block at a time.</p>

        <label className="seed-input">
          <span>World seed</span>
          <input value={seed} onChange={(event) => setSeed(event.target.value)} maxLength={40} />
          <button type="button" onClick={() => setSeed(randomSeed())} aria-label="Generate a random seed">↻</button>
        </label>

        <div className="menu-actions">
          <button className="primary-button" type="button" onClick={() => onNewWorld(seed.trim() || randomSeed())}>New world</button>
          <button className="secondary-button" type="button" onClick={onContinue} disabled={!canContinue}>Continue world</button>
        </div>

        <div className="control-hints">
          <span><kbd>WASD</kbd> Move</span>
          <span><kbd>Space</kbd> Jump</span>
          <span><kbd>E</kbd> Pack</span>
          <span><kbd>Mouse</kbd> Mine / fight</span>
        </div>
      </section>
      <footer>Local save · Survival sandbox · v0.2</footer>
    </main>
  )
}
