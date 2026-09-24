export type DamageSource = 'fall' | 'enemy' | 'starvation' | 'void'

export class PlayerHealth {
  readonly max = 100
  private current: number

  constructor(initial = 100) {
    this.current = Math.max(0, Math.min(this.max, initial))
  }

  get value() {
    return this.current
  }

  get isDead() {
    return this.current <= 0
  }

  damage(amount: number, _source: DamageSource) {
    if (this.isDead || amount <= 0) return false
    this.current = Math.max(0, this.current - amount)
    return true
  }

  heal(amount: number) {
    if (this.isDead || amount <= 0 || this.current >= this.max) return false
    this.current = Math.min(this.max, this.current + amount)
    return true
  }

  restore() {
    this.current = this.max
  }
}
