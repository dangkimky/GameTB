import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../../src/audio/AudioManager.js';

test('Hệ Thống Âm Thanh (AudioManager - Giai Đoạn 5)', async (t) => {
  await t.test('TEST-5.04: Bật / Tắt âm thanh (toggleMute) và lưu trạng thái', () => {
    const audio = new AudioManager();
    assert.equal(audio.isMuted, false);

    const muted = audio.toggleMute();
    assert.equal(muted, true);
    assert.equal(audio.isMuted, true);

    const unmuted = audio.toggleMute();
    assert.equal(unmuted, false);
    assert.equal(audio.isMuted, false);
  });

  await t.test('TEST-5.06: Điều chỉnh âm lượng độc lập cho Music, SFX, Voice', () => {
    const audio = new AudioManager();

    audio.setVolume('music', 0.4);
    assert.equal(audio.volumes.music, 0.4);

    audio.setVolume('sfx', 0.85);
    assert.equal(audio.volumes.sfx, 0.85);

    audio.setVolume('voice', 0.9);
    assert.equal(audio.volumes.voice, 0.9);

    // Giới hạn trong khoảng [0, 1]
    audio.setVolume('music', 1.5);
    assert.equal(audio.volumes.music, 1.0);
    audio.setVolume('sfx', -0.2);
    assert.equal(audio.volumes.sfx, 0.0);
  });

  await t.test('TEST-5.05: Bộ đệm giới hạn kênh âm thanh đồng thời (maxConcurrentSfx)', () => {
    const audio = new AudioManager();
    assert.equal(audio.maxConcurrentSfx, 6, 'Giới hạn tối đa 6 âm thanh cùng lúc để tránh méo tiếng');
    assert.equal(audio.activeSfxCount, 0);
  });

  await t.test('TEST-5.01: Bật / Tắt nhạc nền ambient', () => {
    const audio = new AudioManager();
    assert.equal(audio.musicPlaying, false);

    // startAmbientMusic bật cờ phát nhạc
    audio.startAmbientMusic();
    audio.stopAmbientMusic();
    assert.equal(audio.musicPlaying, false);
  });

  await t.test('TEST-5.03: Giọng hô chiêu (speakCallout) thực thi an toàn trong mọi môi trường', () => {
    const audio = new AudioManager();
    // Phải không quăng lỗi khi gọi các câu hô chiêu tiếng Việt
    assert.doesNotThrow(() => {
      audio.speakCallout('Gâu gâu!');
      audio.speakCallout('Chốt đơn!');
      audio.speakCallout('Ơ kìa?!');
      audio.speakCallout('Mách mẹ!');
    });
  });

  await t.test('TEST-5.02: Các hàm sinh âm thanh SFX tổng hợp sẵn sàng', () => {
    const audio = new AudioManager();
    assert.equal(typeof audio.playDrawCard, 'function');
    assert.equal(typeof audio.playCardPlay, 'function');
    assert.equal(typeof audio.playAttackClash, 'function');
    assert.equal(typeof audio.playTrapFlip, 'function');
    assert.equal(typeof audio.playDeflect, 'function');
    assert.equal(typeof audio.playFusion, 'function');
    assert.equal(typeof audio.playExplosion, 'function');
  });
});
