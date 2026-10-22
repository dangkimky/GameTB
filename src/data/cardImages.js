/**
 * BỘ TẠO ĐỒ HỌA VECTOR NGHỆ THUẬT POP-ART ĐỘC BẢN CHO 120 MÃ THẺ BÀI THẦN THOẠI & SỰ TÍCH VIỆT NAM
 * Mỗi thẻ bài sở hữu một biểu tượng SVG đa lớp, hào quang ngũ hành & họa tiết trống đồng Đông Sơn
 */

export const CARD_ART_METADATA = {
  // NV: 8 Thẻ Đại Diện Thần Thoại Việt Nam (Có 2 phiên bản Sống và Hồn Ma Anh Linh)
  'NV-01': { name: 'Sơn Tinh — Tản Viên Sơn Thánh', aliveIcon: '⛰️', ghostIcon: '🌩️' },
  'NV-02': { name: 'Thủy Tinh — Chúa Tể Biển Khơi', aliveIcon: '🌊', ghostIcon: '🌀' },
  'NV-03': { name: 'Thánh Gióng — Phù Đổng Thiên Vương', aliveIcon: '🐎', ghostIcon: '🔥' },
  'NV-04': { name: 'Chử Đồng Tử — Tiên Ông Đầm Dạ Trạch', aliveIcon: '🪷', ghostIcon: '✨' },
  'NV-05': { name: 'Mẫu Thượng Ngàn — Chúa Sơn Lâm', aliveIcon: '🌿', ghostIcon: '🍃' },
  'NV-06': { name: 'Lạc Long Quân — Long Vương Đất Việt', aliveIcon: '🐉', ghostIcon: '🫧' },
  'NV-07': { name: 'Tổ Mẫu Âu Cơ — Bọc Trăm Trứng', aliveIcon: '🦢', ghostIcon: '🥚' },
  'NV-08': { name: 'Cóc Tía Kiện Trời — Cậu Ông Trời', aliveIcon: '🐸', ghostIcon: '⚡' },

  // CT: 32 Linh Thú & Con Vật Dân Gian Cấp Thấp
  'CT-01': { name: 'Chim Lạc Báo Tin', icon: '🦅' },
  'CT-02': { name: 'Khuyển Thần Đá Đầu Làng', icon: '🐕' },
  'CT-03': { name: 'Ngựa Sắt Phù Đổng Nhỏ', icon: '🐴' },
  'CT-04': { name: 'Cóc Tía Nghiến Răng', icon: '🐸' },
  'CT-05': { name: 'Ve Sầu Gọi Hè Ngân Vang', icon: '🦗' },
  'CT-06': { name: 'Trâu Vàng Hồ Tây', icon: '🐃' },
  'CT-07': { name: 'Cò Trắng Đầu Đình', icon: '🦩' },
  'CT-08': { name: 'Khỉ Vàng Núi Đá', icon: '🐒' },
  'CT-09': { name: 'Linh Miêu Mái Đình', icon: '🐈' },
  'CT-10': { name: 'Rùa Đá Đội Bia Văn Miếu', icon: '🐢' },
  'CT-11': { name: 'Chim Khách Báo Hỷ', icon: '🐦' },
  'CT-12': { name: 'Chó Phú Quốc Lưng Xoáy', icon: '🐶' },
  'CT-13': { name: 'Quạ Thần Cắp Ngọc Phương Nam', icon: '🐦‍⬛' },
  'CT-14': { name: 'Dế Mèn Phiêu Lưu Ký', icon: '🪳' },
  'CT-15': { name: 'Cá Chép Vượt Vũ Môn', icon: '🐟' },
  'CT-16': { name: 'Bồ Nông Ngậm Túi Thần', icon: '🦤' },
  'CT-17': { name: 'Tê Giác Một Sừng Rừng Nam', icon: '🦏' },
  'CT-18': { name: 'Chim Sẻ Gắp Thóc Giúp Tấm', icon: '🐤' },
  'CT-19': { name: 'Sếu Đầu Đỏ Đồng Tháp', icon: '🦢' },
  'CT-20': { name: 'Gà Trống Chín Cựa Gọi Mặt Trời', icon: '🐓' },
  'CT-21': { name: 'Đom Đóm Đèn Sách Trạng Nguyên', icon: '🐝' },
  'CT-22': { name: 'Hồ Ly Tinh Trắng Hồ Tây', icon: '🦊' },
  'CT-23': { name: 'Voi Chín Ngà Bản Đôn', icon: '🐘' },
  'CT-24': { name: 'Ngựa Chín Hồng Mao', icon: '🦄' },
  'CT-25': { name: 'Đàn Chim Lạc Hồng', icon: '🕊️' },
  'CT-26': { name: 'Nghê Đá Chầu Đền Thiêng', icon: '🦁' },
  'CT-27': { name: 'Sao La Sừng Kiếm Trường Sơn', icon: '🦌' },
  'CT-28': { name: 'Cá Ông Nam Hải Cứu Độ', icon: '🐋' },
  'CT-29': { name: 'Trăn Gấm Rừng U Minh', icon: '🐍' },
  'CT-30': { name: 'Gà Đông Tảo Tiến Vua', icon: '🐔' },
  'CT-31': { name: 'Rái Cá Sông Mê Kông', icon: '🦦' },
  'CT-32': { name: 'Hươu Sao Rừng Cúc Phương', icon: '🦌' },

  // TR: 16 Đại Yêu & Thần Thú Cấp Cao — Trùm Thần Thoại
  'TR-01': { name: 'Chằn Tinh Núi Đá Đòi Cống Phẩm', icon: '👹' },
  'TR-02': { name: 'Tinh Gà Trắng Cửu Đầu Thành Cổ Loa', icon: '🐓' },
  'TR-03': { name: 'Mộc Tinh Cây Chò Ngàn Năm', icon: '🌳' },
  'TR-04': { name: 'Ông Ba Mươi — Chúa Sơn Lâm', icon: '🐅' },
  'TR-05': { name: 'Thần Kim Quy — Rùa Vàng Hồ Gươm', icon: '🐢' },
  'TR-06': { name: 'Ngư Tinh Chín Đuôi Biển Đông', icon: '🦈' },
  'TR-07': { name: 'Dũng Sĩ Thạch Sanh Cung Vàng', icon: '🏹' },
  'TR-08': { name: 'Trùm Đầu Gấu Hắc Hổ Sơn Thần', icon: '🐯' },
  'TR-09': { name: 'Hồ Tinh Chín Đuôi Biến Hóa', icon: '🦊' },
  'TR-10': { name: 'Thần Sét Thiên Lôi Búa Đá', icon: '⚡' },
  'TR-11': { name: 'Thần Độc Cước Trấn Biển', icon: '🪓' },
  'TR-12': { name: 'Hỏa Kỳ Lân Phun Lửa Thiêng', icon: '🔥' },
  'TR-13': { name: 'Long Vương Đông Hải', icon: '🐲' },
  'TR-14': { name: 'Ông Đổng Khổng Lồ Gánh Núi', icon: '⛰️' },
  'TR-15': { name: 'Đại Bàng Chín Mỏ (Sự Tích Cây Khế)', icon: '🦅' },
  'TR-16': { name: 'Phượng Hoàng Lửa Núi Hồng Lĩnh', icon: '🐦‍🔥' },

  // DH: 12 Thần Thú Dung Hợp Huyền Thoại
  'DH-01': { name: 'Thiên Nhãn Thuận Phong Nhĩ', icon: '👁️' },
  'DH-02': { name: 'Thần Chó 3 Đầu Núi Tản Viên', icon: '🐕‍🦺' },
  'DH-03': { name: 'Trống Đồng Ngọc Lũ Cổ Thần', icon: '🥁' },
  'DH-04': { name: 'Thần Mã Phi Thiên Cưỡi Mây', icon: '🐎' },
  'DH-05': { name: 'Ma Vương Chí Phèo Làng Vũ Đại', icon: '🍶' },
  'DH-06': { name: 'Chúa Tể Sơn Lâm Thượng Ngàn', icon: '👑' },
  'DH-07': { name: 'Thần Rồng Cháu Tiên Bách Việt', icon: '🐉' },
  'DH-08': { name: 'Thạch Sanh Đại Chiến Chằn Tinh', icon: '⚔️' },
  'DH-09': { name: 'Tứ Linh Hội Tụ — Long Lân Quy Phụng', icon: '🌟' },
  'DH-10': { name: 'Kim Long Hóa Rồng Vượt Vũ Môn', icon: '🐲' },
  'DH-11': { name: 'Thánh Gióng Cưỡi Ngựa Sắt Phun Lửa', icon: '☄️' },
  'DH-12': { name: 'Sơn Tinh Dâng Núi Chặn Thủy Tinh', icon: '🏔️' },

  // DC: 14 Pháp Bảo & Cổ Vật Dân Gian
  'DC-01': { name: 'Dép Tổ Ong Thần Tốc — Nỏ Thần Liên Châu', icon: '🏹' },
  'DC-02': { name: 'Nồi Cơm Điện — Mai Rùa Vàng Kim Quy', icon: '🛡️' },
  'DC-03': { name: 'Roi Sắt Gãy Của Thánh Gióng', icon: '🦯' },
  'DC-04': { name: 'Tiếng Đàn Thạch Sanh Làm Quân Giặc Bủn Rủn', icon: '🪕' },
  'DC-05': { name: 'Áo Tơi Lá Cọ Phản Đòn', icon: '🧥' },
  'DC-06': { name: 'Bùa Trấn Yểm Rừng Thiêng', icon: '🧿' },
  'DC-07': { name: 'Tờ Giấy Ghi Nợ Sổ Nam Tào', icon: '📜' },
  'DC-08': { name: 'Niêu Cơm Thần Thạch Sanh', icon: '🍚' },
  'DC-09': { name: 'Túi Ba Gang Đựng Vàng (Cây Khế)', icon: '💰' },
  'DC-10': { name: 'Vòng Kim Cô Sơn Thần Chế Ngự', icon: '⭕' },
  'DC-11': { name: 'Gươm Thần Thuận Thiên Lê Lợi', icon: '🗡️' },
  'DC-12': { name: 'Bụi Tre Ngà Làng Phù Đổng', icon: '🎋' },
  'DC-13': { name: 'Trầu Cánh Phượng Tấm Cám', icon: '🌺' },
  'DC-14': { name: 'Cung Tên Vàng Lạc Việt', icon: '🏹' },

  // DR: 16 Phép Sự Tích Dân Gian
  'DR-01': { name: 'Sự Tích Sơn Tinh Thủy Tinh Đại Chiến', icon: '🌊' },
  'DR-02': { name: 'Sự Tích Lý Thông Tráo Công Thạch Sanh', icon: '🎭' },
  'DR-03': { name: 'Thủy Tinh Dâng Nước Lũ Cuốn Trôi', icon: '🌪️' },
  'DR-04': { name: 'Sự Tích Chú Cuội Cải Tử Hoàn Sinh', icon: '🌕' },
  'DR-05': { name: 'Sự Tích Cây Khế — Ăn Khế Trả Vàng', icon: '⭐' },
  'DR-06': { name: 'Mượn Đồ Quên Trả — Cướp Nỏ Thần Trọng Thủy', icon: '🧲' },
  'DR-07': { name: 'Sự Tích Hồn Trương Ba Da Hàng Thịt', icon: '☯️' },
  'DR-08': { name: 'Lễ Hội Đền Hùng Mở Tiệc Linh Đình', icon: '🥁' },
  'DR-09': { name: 'Chiếu Chỉ Thiên Đình Soi Thấu Bẫy', icon: '📜' },
  'DR-10': { name: 'Kế Ly Gián Cổ Loa Thành', icon: '⚡' },
  'DR-11': { name: 'Bốc Phốt Trống Kêu Oan Sân Đình', icon: '🔔' },
  'DR-12': { name: 'Táo Quân Cưỡi Cá Chép Về Trời', icon: '🐟' },
  'DR-13': { name: 'Sự Tích Bọc Trăm Trứng Nở Rộ', icon: '🥚' },
  'DR-14': { name: 'Sự Tích Bánh Chưng Bánh Giầy Lang Liêu', icon: '🟩' },
  'DR-15': { name: 'Sự Tích Cây Tre Trăm Đốt — Khắc Nhập!', icon: '🎋' },
  'DR-16': { name: 'Lễ Cầu Mưa Cóc Kiện Trời', icon: '🌧️' },

  // NQ: 16 Bẫy Thiên Cơ & Nghiệp Quật Cổ Tích
  'NQ-01': { name: 'Gương Phản Đòn Chiếu Yêu Đầm Dạ Trạch', icon: '🪞' },
  'NQ-02': { name: 'Tiếng Kêu Oan Thị Kính', icon: '🙏' },
  'NQ-03': { name: 'Nhìn Gì Mà Nhìn! — Mắt Thần Đền Cổ', icon: '👀' },
  'NQ-04': { name: 'Lý Thông Đổ Vỏ Cho Thằng Bên Cạnh', icon: '👉' },
  'NQ-05': { name: 'Camera Hành Trình — Sổ Thiên Đình Ghi Chép', icon: '📖' },
  'NQ-06': { name: 'Vỏ Quýt Dày Có Móng Tay Nhọn', icon: '🍊' },
  'NQ-07': { name: 'Giả Chết Bắt Quạ — Cuội Nằm Gốc Đa', icon: '🌳' },
  'NQ-08': { name: 'Mách Mẹ! — Lệnh Triệu Hồi Của Mẫu Thượng Ngàn', icon: '👑' },
  'NQ-09': { name: 'Cúp Nước Đột Xuất — Bẫy Đầm Lầy Dạ Trạch', icon: '🕸️' },
  'NQ-10': { name: 'Thu Phí Qua Đường — Trạm Gác Sơn Thần', icon: '🚧' },
  'NQ-11': { name: 'Cười Người Hôm Trước Hôm Sau Người Cười', icon: '😆' },
  'NQ-12': { name: 'Phép Biến Hình Quả Thị Của Tấm', icon: '🍑' },
  'NQ-13': { name: 'Hàng Giả Hàng Nhái — Lông Ngỗng Mỵ Châu', icon: '🪶' },
  'NQ-14': { name: 'Đồng Quy Vu Tận — Trọng Thủy Lao Giếng', icon: '💥' },
  'NQ-15': { name: 'Nói Có Sách Mách Có Chứng — Rùa Vàng Đòi Gươm', icon: '🐢' },
  'NQ-16': { name: 'Phút 89 Lật Kèo — Tiên Ông Hiện Hình Cứu Mạng', icon: '🧙‍♂️' },

  // AQ: 6 Bài Ám Quẻ Tâm Linh
  'AQ-01': { name: 'Gió Bấc Hú Đầu Đình', icon: '💨' },
  'AQ-02': { name: 'Tiếng Vọng Đầm Dạ Trạch', icon: '🌊' },
  'AQ-03': { name: 'Sương Mù Núi Tản Bóng Đè', icon: '🌫️' },
  'AQ-04': { name: 'Oan Hồn Làng Vũ Đại Đòi Nợ', icon: '🕯️' },
  'AQ-05': { name: 'Anh Linh Tổ Tiên Phù Hộ', icon: '🙏' },
  'AQ-06': { name: 'Ma Xó Bếp Lò Giấu Pháp Bảo', icon: '🏺' }
};

/**
 * Sinh chuỗi SVG vector nghệ thuật họa tiết Trống Đồng Đông Sơn cho từng thẻ bài
 */
export function getCardArtSvg(cardId, isGhost = false) {
  const safeId = (typeof cardId === 'string' && cardId) ? cardId : 'UNKNOWN';
  const meta = CARD_ART_METADATA[safeId] || { name: 'Linh Thẻ Việt', icon: '🐉' };
  const icon = (isGhost && meta.ghostIcon) ? meta.ghostIcon : (meta.icon || meta.aliveIcon || '🐉');

  let primaryColor = '#f59e0b';
  let secondaryColor = '#ef4444';
  let bgColor = '#1e1b4b';

  if (safeId.startsWith('NV')) {
    if (isGhost) {
      primaryColor = '#14b8a6';
      secondaryColor = '#065f46';
      bgColor = '#042f2e';
    } else {
      primaryColor = '#ec4899';
      secondaryColor = '#831843';
      bgColor = '#4a044e';
    }
  } else if (safeId.startsWith('TR')) {
    primaryColor = '#ef4444';
    secondaryColor = '#7f1d1d';
    bgColor = '#450a0a';
  } else if (safeId.startsWith('DH')) {
    primaryColor = '#f59e0b';
    secondaryColor = '#a855f7';
    bgColor = '#3b0764';
  } else if (safeId.startsWith('DC')) {
    primaryColor = '#10b981';
    secondaryColor = '#047857';
    bgColor = '#064e3b';
  } else if (safeId.startsWith('DR')) {
    primaryColor = '#3b82f6';
    secondaryColor = '#1d4ed8';
    bgColor = '#172554';
  } else if (safeId.startsWith('NQ')) {
    primaryColor = '#8b5cf6';
    secondaryColor = '#6d28d9';
    bgColor = '#2e1065';
  } else if (safeId.startsWith('AQ')) {
    primaryColor = '#14b8a6';
    secondaryColor = '#0f766e';
    bgColor = '#134e4a';
  }

  return `
    <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad-${safeId}-${isGhost ? 'g' : 'a'}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.88" />
          <stop offset="70%" stop-color="${secondaryColor}" stop-opacity="0.68" />
          <stop offset="100%" stop-color="${bgColor}" stop-opacity="0.96" />
        </radialGradient>
        <filter id="glow-${cardId}">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Vòng hào quang Trống Đồng Đông Sơn -->
      <circle cx="50" cy="50" r="43" fill="url(#grad-${cardId}-${isGhost ? 'g' : 'a'})" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="${primaryColor}" stroke-width="1.6" stroke-dasharray="5,2.5" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="${primaryColor}" stroke-width="0.9" opacity="0.55" />

      <!-- Tia mặt trời Lạc Việt 8 cánh -->
      <path d="M50 6 L53 36 L50 40 L47 36 Z" fill="${primaryColor}" opacity="0.45" />
      <path d="M94 50 L64 53 L60 50 L64 47 Z" fill="${primaryColor}" opacity="0.45" />
      <path d="M50 94 L47 64 L50 60 L53 64 Z" fill="${primaryColor}" opacity="0.45" />
      <path d="M6 50 L36 47 L40 50 L36 53 Z" fill="${primaryColor}" opacity="0.45" />

      <!-- Biểu tượng Linh Thú / Thần Thoại trung tâm -->
      <text x="50" y="62" font-size="34" text-anchor="middle" filter="url(#glow-${cardId})">
        ${icon}
      </text>
    </svg>
  `;
}
