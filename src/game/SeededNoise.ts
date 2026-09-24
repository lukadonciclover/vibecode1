function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

export class SeededNoise {
  readonly seed: number

  constructor(value: string) {
    let hash = 2166136261
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    this.seed = hash >>> 0
  }

  value2D(x: number, z: number) {
    const x0 = Math.floor(x)
    const z0 = Math.floor(z)
    const tx = smoothstep(x - x0)
    const tz = smoothstep(z - z0)
    const a = this.hash2D(x0, z0)
    const b = this.hash2D(x0 + 1, z0)
    const c = this.hash2D(x0, z0 + 1)
    const d = this.hash2D(x0 + 1, z0 + 1)
    return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * tz
  }

  value3D(x: number, y: number, z: number) {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const z0 = Math.floor(z)
    const tx = smoothstep(x - x0)
    const ty = smoothstep(y - y0)
    const tz = smoothstep(z - z0)
    const sample = (dx: number, dy: number, dz: number) => this.hash3D(x0 + dx, y0 + dy, z0 + dz)
    const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount
    const low = lerp(lerp(sample(0, 0, 0), sample(1, 0, 0), tx), lerp(sample(0, 0, 1), sample(1, 0, 1), tx), tz)
    const high = lerp(lerp(sample(0, 1, 0), sample(1, 1, 0), tx), lerp(sample(0, 1, 1), sample(1, 1, 1), tx), tz)
    return lerp(low, high, ty)
  }

  fbm2D(x: number, z: number, octaves: number) {
    let value = 0
    let amplitude = 0.55
    let frequency = 1
    let total = 0
    for (let octave = 0; octave < octaves; octave += 1) {
      value += this.value2D(x * frequency, z * frequency) * amplitude
      total += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    return value / total
  }

  hash2D(x: number, z: number) {
    let value = Math.imul(x, 374761393) + Math.imul(z, 668265263) + this.seed
    value = Math.imul(value ^ (value >>> 13), 1274126177)
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295
  }

  private hash3D(x: number, y: number, z: number) {
    let value = Math.imul(x, 374761393) ^ Math.imul(y, 1442695041) ^ Math.imul(z, 668265263) ^ this.seed
    value = Math.imul(value ^ (value >>> 13), 1274126177)
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295
  }
}
