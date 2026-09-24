const UINT32_RANGE = 0x1_0000_0000

export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function hashCoordinates(seed: string | number, x: number, z: number, salt = 0): number {
  let hash = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)
  hash ^= Math.imul(Math.floor(x), 374761393)
  hash ^= Math.imul(Math.floor(z), 668265263)
  hash ^= Math.imul(Math.floor(salt), 1442695041)
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  hash = Math.imul(hash ^ (hash >>> 16), 2246822519)
  return (hash ^ (hash >>> 13)) >>> 0
}

export function hashUnit(seed: string | number, x: number, z: number, salt = 0): number {
  return hashCoordinates(seed, x, z, salt) / UINT32_RANGE
}

export function hashInt(
  seed: string | number,
  x: number,
  z: number,
  salt: number,
  min: number,
  max: number,
): number {
  const low = Math.ceil(Math.min(min, max))
  const high = Math.floor(Math.max(min, max))
  return low + Math.floor(hashUnit(seed, x, z, salt) * (high - low + 1))
}
