export class CombatSystem {
  private cooldown = 0

  update(delta: number) {
    this.cooldown = Math.max(0, this.cooldown - delta)
  }

  attack() {
    if (this.cooldown > 0) return false
    this.cooldown = 0.45
    return true
  }
}
