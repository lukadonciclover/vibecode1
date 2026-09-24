export type SoundEffect = 'walk' | 'jump' | 'break' | 'place' | 'damage' | 'attack' | 'craft' | 'eat'

const SOUND: Record<SoundEffect, [number, number, OscillatorType]> = {
  walk: [110, 0.035, 'sine'],
  jump: [220, 0.08, 'sine'],
  break: [85, 0.09, 'square'],
  place: [145, 0.055, 'triangle'],
  damage: [70, 0.15, 'sawtooth'],
  attack: [175, 0.06, 'square'],
  craft: [430, 0.11, 'triangle'],
  eat: [260, 0.08, 'sine'],
}

export class AudioManager {
  private context: AudioContext | null = null

  play(effect: SoundEffect) {
    try {
      this.context ??= new AudioContext()
      const [frequency, duration, type] = SOUND[effect]
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, this.context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.72), this.context.currentTime + duration)
      gain.gain.setValueAtTime(0.035, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration)
      oscillator.connect(gain).connect(this.context.destination)
      oscillator.start()
      oscillator.stop(this.context.currentTime + duration)
    } catch {
      // Browsers can deny audio before a user gesture; gameplay continues silently.
    }
  }

  dispose() {
    void this.context?.close()
    this.context = null
  }
}
