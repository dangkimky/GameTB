---
description: Workflow toàn diện cho Antigravity Agent để nâng cấp đồ họa riêng biệt cho 96 mã thẻ bài và lập trình hệ thống hiệu ứng tương tác vật lý trực tiếp trên sàn đấu (bay bài, cướp bài, phản đòn, dung hợp, lốc xoáy tráo bài) cho game Đấu Trường Xóm Bất Ổn.
---

# 🚀 ANTIGRAVITY WORKFLOW: NÂNG CẤP ĐỒ HỌA 96 LÁ BÀI & HIỆU ỨNG TƯƠNG TÁC SÀN ĐẤU (ON-BOARD VFX ENGINE)

File workflow này được thiết kế chuẩn cho **Antigravity Agent** (đặt tại `.agent/workflows/upgrade-card-art-and-vfx.md`). Khi kích hoạt, Agent sẽ tuần tự thực hiện từ khâu thiết kế hình ảnh đại diện (Avatar Art) riêng cho từng lá bài, dựng khung thẻ 2.5D Parallax Hologram, cho đến việc lập trình **Hệ thống Tọa Độ Sàn Đấu (Spatial DOM Flight & VFX Engine)** giúp mọi lá bài bay lượn, va chạm, cướp bóc và phản đòn mượt mà ngay trên bàn chơi ở tốc độ 60FPS.

## Giai Đoạn 1: Thiết Lập Kiến Trúc Tọa Độ Sàn Đấu & Hàng Đợi Hành Động (Spatial Arena & Action Sequencer)

> **Mục tiêu cho Agent:** Tuyệt đối không cập nhật DOM tức thời (instant state re-render) làm mất cảm giác vật lý. Mọi thay đổi trạng thái (bốc bài, cướp bài, tiêu diệt, trả bài về tay, tráo bẫy) phải đi qua **Action Queue Sequencer** để diễn hoạt trên lớp phủ tọa độ thực (`#arena-motion-layer`) trước khi cập nhật dữ liệu.

### Bước 1.1: Đăng ký định danh tọa độ (Spatial Zone Registry) cho toàn bộ bàn chơi
Agent cần gắn thuộc tính `data-zone-id` cố định cho mọi vị trí trên bàn chơi của cả 6 người chơi để truy xuất tọa độ `getBoundingClientRect()` bất cứ lúc nào:

| Khu vực trên sàn đấu | Định dạng `data-zone-id` | Vai trò trong diễn hoạt (Animation Target) |
| :--- | :--- | :--- |
| **Chồng Bài Bốc** | `zone-draw-pile` | Điểm xuất phát của mọi hiệu ứng bốc bài, chia bài đầu ván, tái chế. |
| **Bãi Rác (Mộ Bài)** | `zone-graveyard` | Điểm đến khi Chiến Thần vỡ vụn và điểm xuất phát khi *Lục Thùng Rác* / *Câu Cá*. |
| **Chồng Bài Huyền Thoại** | `zone-fusion-deck` | Điểm xuất phát của 8 thẻ Dung Hợp khi bay vào vòng xoáy hợp thể. |
| **Chồng Bài Ám Quẻ** | `zone-amque-deck` | Điểm phát tán sương mù và thẻ bài báo oán của Hồn Ma. |
| **Tay Người Chơi `p`** | `zone-player-${p}-hand` | Điểm xuất phát khi đánh bài và điểm đích khi cướp bài trên tay. |
| **Ô Chiến Thần `s` của `p`** | `zone-player-${p}-monster-${s}` | Tọa độ va chạm trực tiếp khi giao tranh, gắn Đạo Cụ, cướp Chiến Thần. |
| **Ô Nghiệp Quật `s` của `p`** | `zone-player-${p}-trap-${s}` | Tọa độ lật bẫy 3D, soi bài úp, hoặc gom bẫy xáo trộn khi *Cúp Điện*. |
| **Huy Hiệu Nhân Phẩm `p`** | `zone-player-${p}-hp` | Điểm đích của đòn đánh trực diện, ném dép, nổ bình gas và số máu nảy (`-2`, `+3`). |

### Bước 1.2: Xây dựng `ActionSequencer` (Hàng đợi bất đồng bộ `async/await`)
1. Tạo module `src/engine/ActionSequencer.js` quản lý mảng `queue = []`.
2. Mỗi hành động trong game được đóng gói thành một `VisualEvent`:
   `{ type: 'STEAL_CARD' | 'DIRECT_ATTACK' | 'TRAP_REFLECT' | 'SWAP_HANDS' | 'FUSION_SUMMON', sourceZone, targetZone, payload, duration }`.
3. Khóa thao tác bấm chồng (`isAnimating = true`) trong lúc diễn hoạt đang chạy (khoảng `350ms – 900ms`), phát âm thanh đồng bộ ở đúng khung hình va chạm (Impact Frame), sau đó mới gọi `commitStateChange()` và render lại giao diện.

## Giai Đoạn 2: Quy Trình Tạo Đồ Họa Riêng Biệt Cho Từng Lá Bài (96 Custom Card Art Pipeline)

> **Mục tiêu cho Agent:** Mỗi lá bài trong 96 mã thẻ (`NV-01`..`AQ-06`) phải có hình đại diện (Character/Item Illustration) độc bản, sắc nét, mang phong cách **Vietnamese Urban Pop-Art / 2.5D Comic Stylized** (tương tự độ chi tiết của *Hearthstone* / *Marvel Snap* nhưng đậm chất đường phố Việt Nam).

### Bước 2.1: Thiết lập Cấu trúc Lớp Thẻ Bài 2.5D (Multi-Layer Card Component)
Agent phải thiết kế mỗi thẻ bài gồm **5 lớp tách biệt** để tạo hiệu ứng chiều sâu 3D khi di chuột hoặc khi bay trên sân:
1. **Lớp 1 — Khung & Nền Phối Cảnh (`CardBackdrop`):** Nền cảnh khu phố Việt Nam (dây điện chằng chịt, mái tôn, quán trà đá, cổng xóm trọ, đèn đường vàng) chuyển động ngược chiều chuột (`translateZ(-10px)`).
2. **Lớp 2 — Hào Quang Hệ/Tộc (`TribeAuraLayer`):**
   * *Hệ Hóng Hớt:* Vòng sóng radar & ống nhòm xanh cyan xoay tròn.
   * *Hệ Quậy Phá:* Tia lửa điện & sóng âm thanh loa thùng màu đỏ cam.
   * *Hệ Tốc Độ:* Vệt gió xé không khí (speed lines) và tia chớp vàng.
   * *Hệ Ăn Vạ:* Hào quang khói tím hài hước kèm biểu tượng băng cá nhân.
3. **Lớp 3 — Nhân Vật / Đạo Cụ Chính (`CharacterCutout`):** Hình minh họa nhân vật được tách nền hoặc vẽ nổi bật ở trung tâm với hiệu ứng `translateZ(24px) scale(1.08)` khi hover (nhân vật nhô hẳn ra khỏi viền thẻ bài như *Marvel Snap*).
4. **Lớp 4 — Lớp Phủ Hologram & Ánh Kim (`HolographicShader`):** Sử dụng biến CSS `--pointer-x`, `--pointer-y` kết hợp `mix-blend-mode: color-dodge` để tạo vệt sáng lấp lánh cầu vồng trên các thẻ **Trùm Khu Phố (TR)** và **Huyền Thoại Dung Hợp (DH)**.
5. **Lớp 5 — Khung Thông Số & Huy Hiệu (`CardHUD`):** Huy hiệu Độ Chiến (⚔️) có hiệu ứng đập nhịp tim (pulse) khi được buff, dải sao cấp độ (1–7 sao) và khung mô tả chữ rõ nét trên nền kính mờ (`backdrop-filter: blur(8px)`).

### Bước 2.2: Quy chuẩn Prompt / Đồ họa Vector Chi Tiết cho 8 Nhóm Thẻ Bài
Khi Agent sử dụng công cụ sinh ảnh (`generate_image`) hoặc bộ vẽ Vector SVG đa lớp (`CardArtComposer`), phải tuân thủ bảng mô tả tạo hình riêng cho từng nhóm thẻ:

| Phân nhóm | Mã thẻ | Phong cách tạo hình nhân vật & Chi tiết nhận diện bắt buộc |
| :--- | :--- | :--- |
| **1. Đại Diện & Hồn Ma** | `NV-01` → `NV-06` | Thiết kế 2 trạng thái: Mặt Sống rực rỡ đầy quyền lực khu phố; Mặt Hồn Ma phát sáng xanh ngọc lục bảo (Spectral Teal), mắt phát sáng, bay lơ lửng cùng lồng đèn giấy. |
| **2. Dân Cư Cấp Thấp** | `CT-01` → `CT-24` | Tạo hình biểu cảm hài hước cường điệu: *Camera Chạy Bằng Cơm* (bà cô cầm ống nhòm thò đầu qua cửa sổ), *Chó Cỏ Đầu Đàn* (chó vàng đeo kính râm nhe răng), *Shipper* (bốc đầu xe máy chở thùng hàng bốc khói), *Bác Bảo Vệ* (ngồi ghế xếp ôm phích nước ngủ gật). |
| **3. Trùm Khu Phố** | `TR-01` → `TR-12` | Góc máy từ dưới hắt lên (Low-angle Hero Shot) tạo cảm giác áp đảo: *Bà Chủ Trọ* cầm quyển sổ tiền điện phát tia sét đỏ, *Chiến Thần Loa Kẹo Kéo* cưỡi loa thùng khổng lồ bắn sóng âm, *Bà Hỏa* cầm bình gas mini rực lửa. |
| **4. Huyền Thoại Dung Hợp** | `DH-01` → `DH-08` | Khung viền Vàng Kim – Tím Vũ Trụ, nhân vật có hiệu ứng đa đầu/đa tay hoặc cưỡi siêu phương tiện: *Thần Chó 3 Đầu Cerberus phiên bản Chó Cỏ*, *Tứ Đại Bà Tám* ngồi quanh bàn trà đá phát sóng vệ tinh. |
| **5. Bài Đạo Cụ** | `DC-01` → `DC-10` | Vật phẩm đặt trên bệ phóng năng lượng: *Dép Tổ Ong 100 Lỗ* tỏa kim quang, *Nồi Cơm Điện* đội như mũ sắt Spartan, *Tờ Giấy Ghi Nợ* quấn dây xích đen tím. |
| **6. Bài Drama (Phép)** | `DR-01` → `DR-14` | Cảnh hành động kịch tính toàn cảnh: *Cúp Điện Toàn Khu Phố* (cầu dao nổ tung trong bóng tối), *Mượn Đồ Quên Trả* (cánh tay cao su đeo găng đạo chích dùng nam châm hút đồ). |
| **7. Bài Nghiệp Quật (Bẫy)** | `NQ-01` → `NQ-16` | Tông màu Tím Huyền Bí – Đỏ Cảnh Báo: *Gương Phản Đòn* (tấm gương bát quái phản chiếu tia chớp), *Mách Mẹ!* (bóng lưng người mẹ khổng lồ cầm chổi lông gà đứng sau lưng). |
| **8. Bài Ám Quẻ** | `AQ-01` → `AQ-06` | Phong cách linh dị hài hước: Bàn tay ma trơi thổi tắt nến, bóng đè hài hước, ma xó thò tay giấu dép dưới gầm giường. |

## Giai Đoạn 3: Bảng Đặc Tả Hiệu Ứng Hành Động Trực Tiếp Trên Sàn Đấu (On-Board Spatial VFX Matrix)

> **Mục tiêu cho Agent:** Đây là phần quan trọng nhất. Mọi lá bài khi kích hoạt phải có **chuyển động vật lý nối liền giữa người tung chiêu và mục tiêu trên sàn đấu**, tuyệt đối không chỉ hiện thông báo chữ.

### 3.1. Nhóm Hiệu Ứng "Cướp Bài & Trấn Lột" (Card Steal / Magnet Pull Trajectory)
* **Áp dụng cho:** `DR-06 (Mượn Đồ Quên Trả)`, `TR-09 (Thánh Đa Cấp)`, `DH-01 (Tứ Đại Bà Tám)`, `DH-06 (Bà Trùm BĐS)`, `CT-04 (Thánh Ăn Vạ)`, `CT-08 (Mượn Bật Lửa)`, `NQ-02 (Ăn Vạ Giữa Đường)`, `NQ-10 (Thu Phí Qua Đường)`, `NQ-12 (Đánh Tráo Khái Niệm)`.
* **Kịch bản diễn hoạt từng khung hình (Frame-by-Frame Choreography):**
  1. **Khởi phát (`0ms – 200ms`):** Từ vị trí người chơi sử dụng (hoặc từ lá bài vừa lật), phóng ra một **tia kéo (Tractor Beam / Dây Nam Châm / Bàn Tay Đạo Chích SVG)** vươn thẳng tới tọa độ `targetZone` (tay đối thủ hoặc Ô Chiến Thần của đối thủ).
  2. **Khóa mục tiêu (`200ms – 350ms`):** Lá bài bị cướp tại sân/tay đối thủ nhấp nháy viền vàng, rung lắc mạnh (`rotate(-8deg -> 8deg)`) như đang cố giãy giụa chống cự, kèm hiệu ứng chữ nổi `"Ơ KÌA! CỦA TAO!"` ngay tại vị trí bị mất bài.
  3. **Bay về nơi cướp (`350ms – 800ms`):** Tạo một bản sao DOM (`FlyingCardClone`) tại đúng tọa độ `fromRect` của đối thủ. Điều khiển lá bài bay theo **đường cong Bezier bậc 2 (Parabolic Arc)** vút cao lên giữa màn hình, vừa bay vừa xoay lật 3D (`rotateY(360deg) scale(1.25)`), để lại đuôi hạt sáng (Particle Trail) bay thẳng về tọa độ `toRect` (tay hoặc Ô Chiến Thần của người cướp).
  4. **Hạ cánh (`800ms – 950ms`):** Lá bài đập xuống ô đích của người cướp với hiệu ứng sóng xung kích nhỏ (`shockwave ring`), phát âm thanh `"Xoẹt! Đã cuỗm!"` và cập nhật vào DOM thật.

### 3.2. Nhóm Hiệu Ứng "Gieo Quẻ, Bom Hàng & Đẩy Cục Nợ" (Curse & Bomb Delivery)
* **Áp dụng cho:** `DR-02 (Shipper Bom Hàng Nửa Đêm)`, `DH-08 (Thánh Bom Hàng)`, `DC-04 (Micro Hết Pin)`, `DC-07 (Tờ Giấy Ghi Nợ)`, `DC-10 (Vòng Kim Cô)`.
* **Kịch bản diễn hoạt:**
  1. Lá bài hoặc kiện hàng bốc khói đen được đóng dấu đỏ `"BOM HÀNG / CỤC NỢ"` ngay tại sân người tung.
  2. Một bóng xe máy Shipper xé gió lao vút ngang màn hình, ném kiện hàng theo quỹ đạo cầu vồng cắm thẳng xuống Ô Chiến Thần hoặc Huy Hiệu Nhân Phẩm của đối thủ.
  3. Khi chạm đích: Phát nổ khói đen tím (nếu là Bom Hàng) hoặc quấn **dây xích / vòng kim cô phát sáng** khóa chặt quanh viền Ô Chiến Thần của đối thủ. Mỗi đầu lượt khi trừ máu, sợi xích này giật tia sét đỏ rút máu bay từ ô bài sang thanh Nhân Phẩm.

### 3.3. Nhóm Hiệu Ứng "Lật Bẫy Nghiệp Quật & Bẻ Lái Đòn Đánh" (Trap Flip & Vector Deflection)
* **Áp dụng cho:** `NQ-01 (Gương Phản Đòn "Ơ Kìa?")`, `NQ-04 (Đổ Vỏ Cho Thằng Bên Cạnh)`, `NQ-05 (Camera Hành Trình)`, `NQ-08 (Mách Mẹ!)`, `NQ-14 (Đồng Quy Vu Tận)`.
* **Kịch bản diễn hoạt:**
  1. **Pha Lao Tới:** Chiến Thần tấn công của đối thủ nhấc khỏi ô sân của họ, lao vút về phía Ô Chiến Thần/Nhân Phẩm của người phòng thủ.
  2. **Pha Đứng Hình & Lật Bẫy (Freeze Frame):** Khi Chiến Thần tấn công còn cách mục tiêu `80px`, thời gian chậm lại (Slow-motion 0.2x), màn hình chớp tím cảnh báo. Lá bài đang úp ở Hàng Dưới của người thủ **dựng đứng 90 độ và lật ngửa 3D** kèm hiệu ứng còi hú.
  3. **Pha Phản Đòn Trực Quan:**
     * *Với `NQ-01 / NQ-04 (Chuyển mục tiêu sang người thứ 3)`:* Một tấm gương bát quái lấp lánh hiện ra trước mặt người thủ. Chiến Thần đang lao tới đập vào gương, bị **bẻ góc вектор bay xiên thẳng sang tọa độ của người chơi thứ 3** và phát nổ tại đó!
     * *Với `NQ-08 (Mách Mẹ! Trả bài về tay)`:* Một chiếc chổi lông gà khổng lồ quét ngang ô đấu, đánh văng lá bài Trùm của kẻ địch bay tít về lại khu vực Bài Trên Tay của chính kẻ đó!

### 3.4. Nhóm Hiệu Ứng "Hỗn Loạn Toàn Bàn & Ép Quyết Đấu" (Board-Wide Chaos & Forced Clash)
* **Áp dụng cho:** `DR-01 (Hội Đồng Quản Trị Khu Phố)`, `DR-03 (Cúp Điện Toàn Khu Phố)`, `DR-07 (Đổi Trắng Thay Đen)`, `DR-12 (Dọn Nhà Cuối Năm)`.
* **Kịch bản diễn hoạt:**
  * **Ép 2 đối thủ tự đánh nhau (`DR-01`):** Hai Chiến Thần từ hai góc bàn của hai đối thủ bị dây tơ vô hình kéo bổng lên, lao vào giữa tâm bàn đấu đâm sầm vào nhau (`Clash Impact`), bắn tia lửa điện tứ tung rồi văng ngược về chỗ cũ kèm số sát thương nảy đỏ rực.
  * **Cúp Điện Xáo Bẫy (`DR-03`):** Toàn bộ màn hình tối sầm lại trong `1.2s` (chỉ có 2 luồng đèn pin quét qua lại). Tất cả các lá bài Nghiệp Quật đang úp của 6 người chơi bay lên giữa bàn, xoay thành **vòng xoáy lốc xoáy (Tornado Vortex)** rồi bắn trả ngẫu nhiên về các ô bẫy của từng người trước khi đèn sáng trở lại!
  * **Hoán Đổi Bài Trên Tay (`DR-07`):** Toàn bộ dải bài trên tay bạn và toàn bộ bài trên tay đối thủ đồng loạt bay lên thành 2 luồng sáng đối lập, bay chéo qua nhau trên mặt bàn rồi xếp gọn vào tay người kia.

### 3.5. Nhóm Hiệu Ứng "Hiến Tế & Dung Hợp Huyền Thoại" (Tribute & Fusion Vortex)
* **Áp dụng cho:** `TR-01`..`TR-12` và `DH-01`..`DH-08`.
* **Kịch bản diễn hoạt:**
  1. Các lá bài nguyên liệu trên sân/tay hóa thành luồng sáng bay vào tâm màn hình.
  2. Với **Dung Hợp (`DH`)**: Hai lá nguyên liệu quay tròn quanh nhau tốc độ tăng dần, hợp nhất trong một vụ nổ cầu vồng Hologram.
  3. Lá bài Huyền Thoại từ `zone-fusion-deck` phóng to ra giữa màn hình rồi **đập mạnh từ trên cao xuống Ô Chiến Thần** (`scale(2.2 -> 1.0)`), tạo vết nứt sóng xung kích trên mặt bàn và làm rung nhẹ toàn bộ các lá bài khác đang nằm trên sân!

## Giai Đoạn 4: Mã Nguồn Mẫu Cho Hệ Thống Bay Bài & Tương Tác Sàn Đấu (Reference Code For Agent)

Agent hãy tích hợp trực tiếp module **`SpatialBoardAnimator`** dưới đây vào dự án để thực thi các quỹ đạo bay bài giữa các vùng tọa độ:

```javascript
/**
 * SpatialBoardAnimator — Hệ thống diễn hoạt lá bài bay giữa các tọa độ thực trên sàn đấu
 */
export class SpatialBoardAnimator {
  constructor(canvasVfxEngine) {
    this.vfx = canvasVfxEngine;
    this.layer = document.getElementById('arena-motion-layer') || this.createMotionLayer();
  }

  createMotionLayer() {
    const el = document.createElement('div');
    el.id = 'arena-motion-layer';
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;perspective:1200px;';
    document.body.appendChild(el);
    return el;
  }

  getZoneRect(zoneId) {
    const el = document.querySelector(`[data-zone-id="${zoneId}"]`);
    if (!el) {
      return { left: window.innerWidth / 2 - 60, top: window.innerHeight / 2 - 80, width: 120, height: 160 };
    }
    return el.getBoundingClientRect();
  }

  /**
   * Diễn hoạt lá bài bay theo đường cong Parabol từ vùng nguồn tới vùng đích
   * (Dùng cho: Cướp bài, Bốc bài, Bom hàng, Trả bài về tay, Lục thùng rác)
   */
  async flyCardBetweenZones({ fromZoneId, toZoneId, cardHtml, mode = 'STEAL', duration = 750 }) {
    const startRect = this.getZoneRect(fromZoneId);
    const endRect = this.getZoneRect(toZoneId);

    const flyer = document.createElement('div');
    flyer.innerHTML = cardHtml;
    flyer.style.cssText = `
      position: fixed;
      left: ${startRect.left}px;
      top: ${startRect.top}px;
      width: 140px;
      height: 196px;
      transform-origin: center center;
      will-change: transform, left, top;
      filter: drop-shadow(0 20px 30px rgba(0,0,0,0.65));
    `;
    this.layer.appendChild(flyer);

    // Nếu là hiệu ứng Cướp Bài: Lắc lư giãy giụa tại chỗ trước khi bị kéo bay đi
    if (mode === 'STEAL') {
      await flyer.animate([
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(1.15) rotate(-10deg)' },
        { transform: 'scale(1.15) rotate(10deg)' },
        { transform: 'scale(1.2) rotate(0deg)' }
      ], { duration: 240, easing: 'ease-in-out' }).finished;
    }

    // Tính điểm uốn Parabol (Control Point) cao hơn đường thẳng nối 2 điểm
    const midX = (startRect.left + endRect.left) / 2;
    const midY = Math.min(startRect.top, endRect.top) - 130;

    const keyframes = [
      {
        left: `${startRect.left}px`,
        top: `${startRect.top}px`,
        transform: 'translate3d(0,0,0) scale(1.1) rotateY(0deg) rotateZ(0deg)'
      },
      {
        left: `${midX}px`,
        top: `${midY}px`,
        transform: `translate3d(0,0,120px) scale(1.35) rotateY(${mode === 'STEAL' ? 180 : 0}deg) rotateZ(-8deg)`,
        offset: 0.5
      },
      {
        left: `${endRect.left}px`,
        top: `${endRect.top}px`,
        transform: 'translate3d(0,0,0) scale(1) rotateY(360deg) rotateZ(0deg)'
      }
    ];

    const anim = flyer.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });

    await anim.finished;
    if (this.vfx) {
      this.vfx.spawnParticles(
        endRect.left + endRect.width / 2,
        endRect.top + endRect.height / 2,
        mode === 'STEAL' ? '#facc15' : '#fb7185',
        32,
        mode === 'STEAL' ? 'CUỖM LUÔN!' : 'BÙM!'
      );
    }
    flyer.remove();
  }

  /**
   * Diễn hoạt Đòn Tấn Công bị Bẫy Nghiệp Quật bẻ lái sang Người Chơi Thứ 3
   * (Dùng cho: NQ-01 Gương Phản Đòn "Ơ Kìa?" & NQ-04 Đổ Vỏ Cho Thằng Bên Cạnh)
   */
  async deflectAttackToThirdParty({ attackerZoneId, defenderZoneId, thirdPartyZoneId, cardHtml }) {
    const atkRect = this.getZoneRect(attackerZoneId);
    const defRect = this.getZoneRect(defenderZoneId);
    const thirdRect = this.getZoneRect(thirdPartyZoneId);

    const flyer = document.createElement('div');
    flyer.innerHTML = cardHtml;
    flyer.style.cssText = `position:fixed;left:${atkRect.left}px;top:${atkRect.top}px;width:140px;height:196px;`;
    this.layer.appendChild(flyer);

    // Pha 1: Lao từ sân Kẻ Tấn Công tới sát mặt Người Phòng Thủ
    await flyer.animate([
      { left: `${atkRect.left}px`, top: `${atkRect.top}px`, transform: 'scale(1) rotate(0deg)' },
      { left: `${defRect.left}px`, top: `${defRect.top}px`, transform: 'scale(1.25) rotate(12deg)' }
    ], { duration: 360, easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)', fill: 'forwards' }).finished;

    // Hiện hiệu ứng Gương Phản Đòn tại vị trí Người Phòng Thủ
    if (this.vfx) {
      this.vfx.spawnParticles(defRect.left + 60, defRect.top + 60, '#c084fc', 45, '🪞 Ơ KÌA?! PHẢN ĐÒN!');
    }

    // Pha 2: Bị bật ngược theo góc phản xạ bay thẳng sang mặt Người Chơi Thứ 3
    await flyer.animate([
      { left: `${defRect.left}px`, top: `${defRect.top}px`, transform: 'scale(1.25) rotate(12deg)' },
      { left: `${thirdRect.left}px`, top: `${thirdRect.top}px`, transform: 'scale(1.1) rotate(-360deg)' }
    ], { duration: 480, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', fill: 'forwards' }).finished;

    if (this.vfx) {
      this.vfx.spawnParticles(thirdRect.left + 60, thirdRect.top + 40, '#f43f5e', 50, '💥 ĐỔ VỎ THÀNH CÔNG!');
    }
    flyer.remove();
  }
}
```

## Giai Đoạn 5: Quy Trình Kiểm Thử & Nghiệm Thu Tự Động Của Agent (Verification Checklist)

Trước khi hoàn tất nhiệm vụ trong Antigravity, Agent bắt buộc phải chạy qua danh sách kiểm tra tự động sau:

1. **Kiểm tra Độ phủ Đồ họa 96/96 Mã Thẻ:**
   * Chạy script kiểm tra toàn bộ 96 đối tượng trong `ALL_96_CARDS` đều có hình minh họa riêng biệt (không dùng chung ảnh lặp lại, có đủ hiệu ứng tầng nền, tầng nhân vật pop-out và lớp phủ Hologram).
2. **Kiểm tra 6 Kịch bản Bay Bài Trên Sàn Đấu (On-Board Flight Scenarios):**
   * Bốc bài từ `zone-draw-pile` bay vào `zone-player-hand`.
   * Cướp bài từ tay/sân đối thủ bay theo đường cong Parabol kèm hiệu ứng giãy giụa về sân mình (`DR-06`, `TR-09`, `NQ-02`).
   * Đẩy bài/đạo cụ xấu bay sang khóa chặt Ô Chiến Thần đối phương (`DR-02`, `DC-04`, `DC-07`, `DC-10`).
   * Lật bẫy phản đòn bẻ góc đường bay của Chiến Thần sang người chơi thứ 3 (`NQ-01`, `NQ-04`).
   * Gom toàn bộ bẫy úp vào lốc xoáy giữa bàn khi *Cúp Điện Toàn Khu Phố* (`DR-03`).
   * Ghép 2 thẻ nguyên liệu bay vào cổng xoáy Dung Hợp và đập thẻ Huyền Thoại xuống mặt bàn (`DH-01`..`DH-08`).
3. **Kiểm tra Hiệu năng & Tương thích Màn hình (60FPS & Responsive Bounding Box):**
   * Đảm bảo `getZoneRect()` luôn tính toán lại tọa độ chính xác khi người dùng thay đổi kích thước cửa sổ hoặc cuộn trang trên cả Desktop và Mobile.
