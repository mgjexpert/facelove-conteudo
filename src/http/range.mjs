// Extracted from the MEGA Packs PoC. MEGAJS uses inclusive start/end offsets.
export function resolveByteRange(header, size, maxChunk = 2 * 1024 * 1024) {
  if (!Number.isSafeInteger(size) || size < 0) throw new TypeError('Invalid asset size')
  if (size === 0) return header ? null : { status: 200, start: 0, end: -1 }
  if (!header) return { status: 200, start: 0, end: size - 1 }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) return null
  let start, end
  if (!match[1]) {
    const suffix = Number(match[2])
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Number(match[2]) : size - 1
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return null
  return { status: 206, start, end: Math.min(end, size - 1, start + maxChunk - 1) }
}
