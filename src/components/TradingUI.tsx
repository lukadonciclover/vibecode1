import type { CSSProperties } from 'react'
import { ITEMS } from '../data/items'
import { getTradesForProfession, type TradeDefinition, type TradeStack } from '../data/trades'
import type { InventoryCounts } from '../game/types'
import type { VillageProfession } from '../game/world/types'

export interface TradingUIProps {
  profession: VillageProfession
  inventory: Partial<InventoryCounts>
  uses: Readonly<Partial<Record<string, number>>>
  onTrade: (trade: TradeDefinition) => void
  onClose?: () => void
  trades?: readonly TradeDefinition[]
  npcName?: string
  disabled?: boolean
}

const PROFESSION_NAMES: Record<VillageProfession, string> = {
  farmer: 'Farmer',
  lumberjack: 'Lumberjack',
  mason: 'Mason',
  toolsmith: 'Toolsmith',
}

function TradeItems({ stacks }: { stacks: readonly TradeStack[] }) {
  return (
    <div className="trade-items">
      {stacks.map((stack, index) => (
        <span className="trade-item" key={`${stack.item}-${index}`}>
          <span className="item-icon" style={{ '--item-color': ITEMS[stack.item].color } as CSSProperties}>{ITEMS[stack.item].icon}</span>
          <span>{stack.count} {ITEMS[stack.item].name}</span>
        </span>
      ))}
    </div>
  )
}

export function TradingUI({
  profession,
  inventory,
  uses,
  onTrade,
  onClose,
  trades = getTradesForProfession(profession),
  npcName,
  disabled = false,
}: TradingUIProps) {
  return (
    <section className="trading-ui" role="dialog" aria-modal="true" aria-labelledby="trading-title">
      <header className="trading-ui__header">
        <div>
          <span className="eyebrow">Village market</span>
          <h2 id="trading-title">{npcName ?? PROFESSION_NAMES[profession]}</h2>
          {npcName && <p>{PROFESSION_NAMES[profession]}</p>}
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Close trading">Close</button>}
      </header>

      <div className="trading-ui__list">
        {trades.length === 0 && <p className="trading-ui__empty">No trades are available.</p>}
        {trades.map((trade) => {
          const useCount = uses[trade.id] ?? 0
          const soldOut = useCount >= trade.maxUses
          const affordable = trade.cost.every((cost) => (inventory[cost.item] ?? 0) >= cost.count)
          return (
            <article className={`trade-card${soldOut ? ' is-sold-out' : ''}`} key={trade.id}>
              <div className="trade-card__exchange">
                <TradeItems stacks={trade.cost} />
                <span className="trade-card__arrow" aria-hidden="true">-&gt;</span>
                <TradeItems stacks={trade.reward} />
              </div>
              <div className="trade-card__action">
                <span>{useCount} / {trade.maxUses} used</span>
                <button type="button" onClick={() => onTrade(trade)} disabled={disabled || soldOut || !affordable}>
                  {soldOut ? 'Sold out' : affordable ? 'Trade' : 'Missing items'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
