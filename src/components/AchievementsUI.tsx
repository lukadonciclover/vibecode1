import { ACHIEVEMENTS, type AchievementDefinition, type AchievementId } from '../data/achievements'
import type { StatisticsSnapshot } from '../game/progression/StatisticsSystem'

export interface AchievementsUIProps {
  unlockedIds: readonly AchievementId[]
  statistics?: StatisticsSnapshot
  achievements?: readonly AchievementDefinition[]
  title?: string
}

function progressFor(achievement: AchievementDefinition, statistics?: StatisticsSnapshot) {
  if (achievement.criterion.type !== 'statistic' || !statistics) return null
  const current = Math.min(statistics[achievement.criterion.statistic], achievement.criterion.target)
  return { current, target: achievement.criterion.target, percent: (current / achievement.criterion.target) * 100 }
}

export function AchievementsUI({
  unlockedIds,
  statistics,
  achievements = ACHIEVEMENTS,
  title = 'Achievements',
}: AchievementsUIProps) {
  const unlocked = new Set(unlockedIds)

  return (
    <section className="achievements-ui" aria-labelledby="achievements-title">
      <header className="achievements-ui__header">
        <div>
          <span className="eyebrow">Milestones</span>
          <h2 id="achievements-title">{title}</h2>
        </div>
        <strong>{unlockedIds.length} / {achievements.length}</strong>
      </header>
      <div className="achievements-ui__list">
        {achievements.map((achievement) => {
          const isUnlocked = unlocked.has(achievement.id)
          const progress = progressFor(achievement, statistics)
          return (
            <article className={`achievement-card ${isUnlocked ? 'is-unlocked' : 'is-locked'}`} key={achievement.id}>
              <span className="achievement-card__mark" aria-hidden="true">{isUnlocked ? 'OK' : '?'}</span>
              <div className="achievement-card__copy">
                <h3>{achievement.name}</h3>
                <p>{achievement.description}</p>
                {!isUnlocked && progress && (
                  <div className="achievement-card__progress">
                    <div role="progressbar" aria-label={`${achievement.name} progress`} aria-valuemin={0} aria-valuemax={progress.target} aria-valuenow={progress.current}>
                      <i style={{ width: `${progress.percent}%` }} />
                    </div>
                    <span>{Math.floor(progress.current)} / {progress.target}</span>
                  </div>
                )}
              </div>
              <span className="achievement-card__status">{isUnlocked ? 'Unlocked' : 'Locked'}</span>
            </article>
          )
        })}
      </div>
    </section>
  )
}
