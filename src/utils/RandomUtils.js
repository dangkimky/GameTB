/**
 * Tiện ích ngẫu nhiên có hỗ trợ Seed (Deterministic khi truyền seed cố định & Ngẫu nhiên thực sự khi tạo ván mới)
 */
export class RandomUtils {
  static _entropyCounter = 1;

  static generateFreshSeed() {
    this._entropyCounter = (this._entropyCounter + 1) & 0x7fffffff;
    const timePart = Date.now() & 0x7fffffff;
    const randPart = Math.floor(Math.random() * 0x7fffffff);
    const counterPart = Math.imul(this._entropyCounter, 0x9e3779b1) & 0x7fffffff;
    const combined = (timePart ^ randPart ^ counterPart) >>> 0;
    return combined === 0 ? 135792468 : combined;
  }

  constructor(seed = null) {
    const rawSeed = (seed !== null && seed !== undefined) ? Number(seed) : RandomUtils.generateFreshSeed();
    this.seed = (Number.isFinite(rawSeed) ? Math.abs(Math.floor(rawSeed)) : RandomUtils.generateFreshSeed()) || 987654321;
    this._state = (this.seed ^ 0x6d2b79f5) >>> 0;
  }

  // Thuật toán Mulberry32 kết hợp cập nhật seed (chu kỳ 2^32, phân phối đều tuyệt đối cho bộ bài 158 lá)
  next() {
    let t = (this._state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const val = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    this.seed = this._state >>> 0;
    return val;
  }

  nextInt(min, max) {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  flipCoin() {
    return this.next() >= 0.5;
  }

  shuffle(array) {
    const arr = [...array];
    // Thực hiện Fisher-Yates 2 lượt độc lập để đảm bảo phân tán hoàn toàn các lá bài cùng mã
    for (let pass = 0; pass < 2; pass++) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    return arr;
  }
}
