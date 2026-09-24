export function DeathScreen({ onRespawn }: { onRespawn: () => void }) {
  return (
    <div className="death-screen" role="dialog" aria-modal="true" aria-label="You died">
      <span className="eyebrow">The wild reclaimed you</span>
      <h2>You fell</h2>
      <p>Your pack and world changes are safe.</p>
      <button type="button" className="primary-button" onClick={onRespawn}>Respawn</button>
    </div>
  )
}
