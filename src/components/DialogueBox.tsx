import type { VillageProfession } from '../game/world/types'

export interface DialogueChoice {
  id: string
  label: string
  disabled?: boolean
}

export interface DialogueBoxProps {
  speaker: string
  text: string
  onAdvance?: () => void
  onClose: () => void
  choices?: readonly DialogueChoice[]
  onChoice?: (choice: DialogueChoice) => void
  profession?: VillageProfession
  portrait?: string
  advanceLabel?: string
}

export function DialogueBox({
  speaker,
  text,
  onAdvance,
  onClose,
  choices = [],
  onChoice,
  profession,
  portrait,
  advanceLabel = 'Continue',
}: DialogueBoxProps) {
  return (
    <section className="dialogue-box" role="dialog" aria-modal="true" aria-labelledby="dialogue-speaker">
      <div className="dialogue-box__portrait" aria-hidden="true">
        {portrait ? <img src={portrait} alt="" /> : <span>{speaker.slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="dialogue-box__content">
        <header className="dialogue-box__header">
          <div>
            <h2 id="dialogue-speaker">{speaker}</h2>
            {profession && <span>{profession}</span>}
          </div>
          <button type="button" onClick={onClose} aria-label="End conversation">Close</button>
        </header>
        <p className="dialogue-box__text">{text}</p>
        {choices.length > 0 && (
          <div className="dialogue-box__choices">
            {choices.map((choice) => (
              <button type="button" disabled={choice.disabled || !onChoice} onClick={() => onChoice?.(choice)} key={choice.id}>
                {choice.label}
              </button>
            ))}
          </div>
        )}
        {onAdvance && <button className="dialogue-box__advance" type="button" onClick={onAdvance}>{advanceLabel}</button>}
      </div>
    </section>
  )
}
