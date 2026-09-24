import type { Difficulty, GameMode, WorldSettings, WorldSummary } from '../game/types'

export interface WorldCreationDraft extends WorldSettings {
  name: string
  seed: string
}

export interface WorldCreationScreenProps {
  worlds: readonly WorldSummary[]
  draft: WorldCreationDraft
  onDraftChange: (draft: WorldCreationDraft) => void
  onCreate: (draft: WorldCreationDraft) => void
  onLoad: (worldId: string) => void
  onDelete: (worldId: string) => void
  onBack?: () => void
  error?: string | null
  busy?: boolean
}

const GAME_MODES: readonly GameMode[] = ['survival', 'creative']
const DIFFICULTIES: readonly Difficulty[] = ['peaceful', 'easy', 'normal', 'hard']

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function WorldCreationScreen({
  worlds,
  draft,
  onDraftChange,
  onCreate,
  onLoad,
  onDelete,
  onBack,
  error,
  busy = false,
}: WorldCreationScreenProps) {
  const update = <Key extends keyof WorldCreationDraft>(key: Key, value: WorldCreationDraft[Key]) => {
    onDraftChange({ ...draft, [key]: value })
  }

  return (
    <main className="world-screen">
      <header className="world-screen__header">
        <div>
          <span className="eyebrow">World archive</span>
          <h1>Choose your wilderness</h1>
        </div>
        {onBack && <button className="world-screen__back" type="button" onClick={onBack}>Back</button>}
      </header>

      <div className="world-screen__layout">
        <section className="world-list" aria-labelledby="saved-worlds-title">
          <div className="world-list__heading">
            <h2 id="saved-worlds-title">Saved worlds</h2>
            <span>{worlds.length}</span>
          </div>
          {worlds.length === 0 && <p className="world-list__empty">No worlds yet. Create one to begin exploring.</p>}
          {worlds.map((world) => (
            <article className={`world-card${world.corrupted ? ' world-card--corrupted' : ''}`} key={world.id}>
              <div className="world-card__details">
                <h3>{world.name}</h3>
                <p>{world.corrupted ? 'Save data unavailable' : `Seed ${world.seed}`}</p>
                <div className="world-card__meta">
                  <span>{titleCase(world.settings.gameMode)}</span>
                  <span>{titleCase(world.settings.difficulty)}</span>
                  <span>{world.settings.renderDistance} chunk distance</span>
                  <time dateTime={new Date(world.updatedAt).toISOString()}>
                    Updated {new Date(world.updatedAt).toLocaleDateString()}
                  </time>
                </div>
              </div>
              <div className="world-card__actions">
                <button type="button" onClick={() => onLoad(world.id)} disabled={busy || world.corrupted}>Play</button>
                <button className="world-card__delete" type="button" onClick={() => onDelete(world.id)} disabled={busy} aria-label={`Delete ${world.name}`}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>

        <form
          className="world-create"
          onSubmit={(event) => {
            event.preventDefault()
            onCreate(draft)
          }}
        >
          <div className="world-create__heading">
            <span className="eyebrow">New expedition</span>
            <h2>Create world</h2>
          </div>
          <label className="world-field">
            <span>World name</span>
            <input value={draft.name} onChange={(event) => update('name', event.target.value)} maxLength={48} placeholder="Untamed World" required />
          </label>
          <label className="world-field">
            <span>Seed</span>
            <input value={draft.seed} onChange={(event) => update('seed', event.target.value)} maxLength={64} placeholder="Leave blank for a random seed" />
          </label>
          <label className="world-field">
            <span>Game mode</span>
            <select value={draft.gameMode} onChange={(event) => update('gameMode', event.target.value as GameMode)}>
              {GAME_MODES.map((mode) => <option value={mode} key={mode}>{titleCase(mode)}</option>)}
            </select>
          </label>
          <label className="world-field">
            <span>Difficulty</span>
            <select value={draft.difficulty} onChange={(event) => update('difficulty', event.target.value as Difficulty)} disabled={draft.gameMode === 'creative'}>
              {DIFFICULTIES.map((difficulty) => <option value={difficulty} key={difficulty}>{titleCase(difficulty)}</option>)}
            </select>
          </label>
          <label className="world-field world-field--range">
            <span>Render distance</span>
            <output>{draft.renderDistance} chunks</output>
            <input type="range" min={2} max={8} step={1} value={draft.renderDistance} onChange={(event) => update('renderDistance', event.target.valueAsNumber)} />
          </label>
          {error && <p className="world-create__error" role="alert">{error}</p>}
          <button className="world-create__submit" type="submit" disabled={busy || !draft.name.trim()}>
            {busy ? 'Preparing world...' : 'Create world'}
          </button>
        </form>
      </div>
    </main>
  )
}
