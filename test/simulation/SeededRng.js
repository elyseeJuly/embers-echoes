/**
 * 余烬回响 — T3 Headless 模拟用确定性 PRNG
 * ========================================
 * Mulberry32：跨 JS 运行时稳定、快速、非加密。
 * 参考：Beyond-the-Light-Cone/src/test/simulation/SeededRng.ts
 */
export class SeededRng {
  constructor(seed) {
    this.state = (seed >>> 0) || 1
  }

  /** 返回 [0, 1) 的伪随机浮点数 */
  random() {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let value = this.state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  /** 返回 [min, max] 的整数 */
  int(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Invalid integer range: ${min}..${max}`)
    }
    return min + Math.floor(this.random() * (max - min + 1))
  }

  /** 从长度为 length 的集合中选一个索引 */
  pickIndex(length) {
    if (!Number.isInteger(length) || length <= 0) {
      throw new RangeError(`Cannot choose from collection of length ${length}`)
    }
    return this.int(0, length - 1)
  }

  /** 从数组中选一个元素 */
  pick(arr) {
    return arr[this.pickIndex(arr.length)]
  }

  /** 派生一个新的、独立的 RNG（用于子流程隔离） */
  fork(salt) {
    const mixed = Math.imul((this.state ^ (salt >>> 0)) >>> 0, 0x9e3779b1) >>> 0
    return new SeededRng(mixed)
  }
}
