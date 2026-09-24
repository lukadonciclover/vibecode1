export class HungerSystem {
  readonly max = 100
  private current: number
  private starvationTimer = 0
  private regenerationTimer = 0

  constructor(initial = 100) {
    this.current = Math.max(0, Math.min(this.max, initial))
  }

  get value() {
    return this.current
  }

  update(delta: number, onStarve: () => void, onRegenerate: () => void) {
    this.current = Math.max(0, this.current - delta / 60)
    if (this.current === 0) {
      this.starvationTimer += delta
      if (this.starvationTimer >= 3) {
        this.starvationTimer = 0
        onStarve()
      }
    } else {
      this.starvationTimer = 0
    }

    if (this.current > 70) {
      this.regenerationTimer += delta
      if (this.regenerationTimer >= 3) {
        this.regenerationTimer = 0
        onRegenerate()
      }
    } else {
      this.regenerationTimer = 0
    }
  }

  eat(amount: number) {
    if (amount <= 0 || this.current >= this.max) return false
    this.current = Math.min(this.max, this.current + amount)
    return true
  }
}
