/**
 * ScreenShake — Hiệu ứng rung chấn màn hình khi giao tranh, nổ bình gas hoặc đập thẻ bài
 */

export class ScreenShake {
  static shake(targetElement = document.getElementById('arena-root'), intensity = 10, duration = 400) {
    if (!targetElement) return Promise.resolve();

    return new Promise((resolve) => {
      const startTime = performance.now();
      const originalTransform = targetElement.style.transform || '';

      function animateShake(now) {
        const elapsed = now - startTime;
        if (elapsed < duration) {
          const decay = 1 - (elapsed / duration); // Giảm dần cường độ rung theo thời gian
          const dx = (Math.random() - 0.5) * intensity * decay * 2;
          const dy = (Math.random() - 0.5) * intensity * decay * 2;
          targetElement.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(animateShake);
        } else {
          targetElement.style.transform = originalTransform;
          resolve();
        }
      }

      requestAnimationFrame(animateShake);
    });
  }
}
