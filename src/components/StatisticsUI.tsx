import type { StatisticName, StatisticsSnapshot } from '../game/progression/StatisticsSystem'

export interface StatisticsUIProps {
  statistics: StatisticsSnapshot
  title?: string
}

const STATISTICS: readonly { id: StatisticName; label: string; format?: (value: number) => string }[] = [
  { id: 'blocksMined', label: 'Blocks mined' },
  { id: 'blocksPlaced', label: 'Blocks placed' },
  { id: 'itemsCrafted', label: 'Items crafted' },
  { id: 'distanceTraveled', label: 'Distance traveled', format: (value) => `${Math.floor(value).toLocaleString()} blocks` },
  { id: 'enemiesDefeated', label: 'Enemies defeated' },
  { id: 'daysSurvived', label: 'Days survived' },
  { id: 'deaths', label: 'Deaths' },
  { id: 'foodConsumed', label: 'Food consumed' },
  { id: 'chunksVisited', label: 'Chunks visited' },
  { id: 'biomesDiscovered', label: 'Biomes discovered' },
]

export function StatisticsUI({ statistics, title = 'Statistics' }: StatisticsUIProps) {
  return (
    <section className="statistics-ui" aria-labelledby="statistics-title">
      <header className="statistics-ui__header">
        <span className="eyebrow">Expedition record</span>
        <h2 id="statistics-title">{title}</h2>
      </header>
      <dl className="statistics-ui__grid">
        {STATISTICS.map(({ id, label, format }) => (
          <div className="statistics-ui__stat" key={id}>
            <dt>{label}</dt>
            <dd>{format ? format(statistics[id]) : statistics[id].toLocaleString()}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
