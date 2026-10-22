/**
 * ActionSequencer — Hàng đợi xử lý bất đồng bộ tuần tự, ngăn ngừa click chồng chéo (Race conditions)
 * Đảm bảo hạ cờ isAnimating = false TRƯỚC KHI resolve Promise để UI render mở khóa thao tác tức thì 100%.
 */
export class ActionSequencer {
  constructor() {
    this.queue = [];
    this.isAnimating = false;
    this.listeners = [];
  }

  /**
   * Đưa một hành động diễn hoạt vào hàng đợi
   */
  enqueue(actionFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ actionFn, resolve, reject });

      if (!this.isAnimating) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isAnimating = false;
      this.notifyListeners('IDLE');
      return;
    }

    this.isAnimating = true;
    this.notifyListeners('BUSY');

    const { actionFn, resolve, reject } = this.queue.shift();
    let result;
    let error = null;
    let hasError = false;

    try {
      result = await actionFn();
    } catch (err) {
      hasError = true;
      error = err;
      console.error('Lỗi khi diễn hoạt hành động trong ActionSequencer:', err);
    }

    // Hạ cờ isAnimating = false TRƯỚC KHI gọi resolve() nếu hàng đợi đã hết
    // để mọi lệnh this.render() trong khối finally sau await sequencer.enqueue() nhận thấy isBusy() === false ngay lập tức.
    if (this.queue.length === 0) {
      this.isAnimating = false;
      this.notifyListeners('IDLE');
    }

    if (hasError) {
      reject(error);
    } else {
      resolve(result);
    }

    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners(status) {
    for (const listener of this.listeners) {
      listener({ isAnimating: this.isAnimating, queueLength: this.queue.length, status });
    }
  }

  clear() {
    this.queue = [];
    this.isAnimating = false;
    this.notifyListeners('IDLE');
  }
}
