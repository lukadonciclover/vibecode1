import type { AchievementUnlockEvent } from '../game/progression/AchievementSystem'

export interface AchievementToastProps {
  event: AchievementUnlockEvent
  onDismiss?: () => void
}

export function AchievementToast({ event, onDismiss }: AchievementToastProps) {
  return (
    <aside className="achievement-toast" role="status" aria-live="polite">
      <span className="achievement-toast__mark" aria-hidden="true">A</span>
      <div className="achievement-toast__copy">
        <span>{event.title}</span>
        <strong>{event.message}</strong>
        <p>{event.achievement.description}</p>
      </div>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label={`Dismiss ${event.achievement.name} achievement`}>Close</button>}
    </aside>
  )
}
