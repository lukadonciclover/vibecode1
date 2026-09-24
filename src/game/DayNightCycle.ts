export interface DayLighting {
  daylight: number
  sunHeight: number
  sunAngle: number
  phase: 'Day' | 'Sunset' | 'Night' | 'Sunrise'
  clock: string
}

const DAY_LENGTH_SECONDS = 600

export class DayNightCycle {
  private elapsed: number

  constructor(initialTime = DAY_LENGTH_SECONDS * 0.3) {
    this.elapsed = ((initialTime % DAY_LENGTH_SECONDS) + DAY_LENGTH_SECONDS) % DAY_LENGTH_SECONDS
  }

  update(delta: number) {
    this.elapsed = (this.elapsed + delta) % DAY_LENGTH_SECONDS
  }

  get time() {
    return this.elapsed
  }

  get lighting(): DayLighting {
    const progress = this.elapsed / DAY_LENGTH_SECONDS
    const sunAngle = progress * Math.PI * 2
    const sunHeight = Math.sin(sunAngle)
    const daylight = this.smoothstep(-0.22, 0.25, sunHeight)
    const hour = (progress * 24 + 6) % 24
    const minutes = Math.floor((hour % 1) * 60)
    let phase: DayLighting['phase'] = 'Night'
    if (hour >= 7 && hour < 18) phase = 'Day'
    else if (hour >= 18 && hour < 20) phase = 'Sunset'
    else if (hour >= 5 && hour < 7) phase = 'Sunrise'
    return {
      daylight,
      sunHeight,
      sunAngle,
      phase,
      clock: `${String(Math.floor(hour)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    }
  }

  private smoothstep(min: number, max: number, value: number) {
    const amount = Math.max(0, Math.min(1, (value - min) / (max - min)))
    return amount * amount * (3 - 2 * amount)
  }
}
