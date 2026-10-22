/**
 * BỘ DỮ LIỆU ĐẦY ĐỦ 120 MÃ THẺ BÀI — ĐẤU TRƯỜNG THẦN THOẠI & SỰ TÍCH VIỆT NAM
 * Chủ đề: Linh Thú, Con Vật Dân Gian, Sự Tích Cổ Tích & Thần Thoại Việt Nam
 * Tổng số mã thẻ độc bản: 120 mã thẻ (8 Đại Diện + 32 Linh Thú Cấp Thấp + 16 Đại Yêu/Thần Thú Cấp Cao + 12 Thần Thú Dung Hợp + 14 Pháp Bảo + 16 Phép Sự Tích + 16 Bẫy Thiên Cơ + 6 Ám Quẻ Tâm Linh)
 * Tổng số lá bài vật lý: 184 lá (158 lá Bộ Bài Chính + 8 Đại Diện + 12 Dung Hợp + 6 Ám Quẻ)
 */

export const CARD_TYPES = {
  CHARACTER: 'CHARACTER',           // Thẻ Đại Diện Thần Thoại (NV)
  LOW_MONSTER: 'LOW_MONSTER',       // Linh Thú & Thú Dân Gian Cấp Thấp (CT)
  HIGH_MONSTER: 'HIGH_MONSTER',     // Đại Yêu & Thần Thú Cấp Cao (TR)
  FUSION_MONSTER: 'FUSION_MONSTER', // Thần Thú Dung Hợp Huyền Thoại (DH)
  EQUIPMENT: 'EQUIPMENT',           // Pháp Bảo & Cổ Vật Dân Gian (DC)
  DRAMA: 'DRAMA',                   // Phép Sự Tích Dân Gian (DR)
  TRAP: 'TRAP',                     // Bẫy Thiên Cơ & Nghiệp Quật (NQ)
  CURSE: 'CURSE',                   // Ám Quẻ Tâm Linh (AQ)
};

export const TRIBES = {
  HONG_HOT: 'HONG_HOT',   // Hệ Linh Giác / Điềm Báo (Chim Lạc, Cá Ông, Rùa Vàng)
  QUAY_PHA: 'QUAY_PHA',   // Hệ Dũng Mãnh / Sơn Lâm (Hổ Thần, Voi Chín Ngà, Gà Chín Cựa)
  TOC_DO: 'TOC_DO',       // Hệ Thần Tốc / Phi Thiên (Ngựa Sắt, Sao La, Cá Chép Vượt Vũ Môn)
  AN_VA: 'AN_VA',         // Hệ Huyền Bí / Linh Quy (Cóc Tía, Nghê Đá, Hồ Ly)
};

export const ALL_96_CARDS = {
  // ==========================================
  // PHẦN 1: THẺ ĐẠI DIỆN THẦN THOẠI VIỆT NAM (8 MÃ - 8 LÁ)
  // ==========================================
  'NV-01': {
    id: 'NV-01',
    name: 'Sơn Tinh — Tản Viên Sơn Thánh',
    type: CARD_TYPES.CHARACTER,
    copies: 1,
    aliveAbility: 'Đầu lượt của mình, dùng phép nhãn thông nhìn thấu 1 lá Bẫy Thiên Cơ đang úp của bất kỳ đối thủ nào.',
    ghostAbility: 'Mỗi đầu lượt, chỉ định người chơi đang có nhiều Điểm Nhân Phẩm nhất phải lật ngửa 1 lá bài trên tay cho cả bàn xem.'
  },
  'NV-02': {
    id: 'NV-02',
    name: 'Thủy Tinh — Chúa Tể Biển Khơi',
    type: CARD_TYPES.CHARACTER,
    copies: 1,
    aliveAbility: 'Khi bạn phát động Phép Sự Tích (Drama), được bốc thêm 1 lá rồi bỏ 1 lá trên tay (tối đa 1 lần/lượt).',
    ghostAbility: 'Mỗi đầu lượt, rút 1 lá Ám Quẻ và được quyền cho 1 người chơi bất kỳ bốc thêm 1 lá bài từ chồng bài chung.'
  },
  'NV-03': {
    id: 'NV-03',
    name: 'Thánh Gióng — Phù Đổng Thiên Vương',
    type: CARD_TYPES.CHARACTER,
    copies: 1,
    aliveAbility: 'Giáp Sắt Hộ Thân: Khi bị đánh trực diện lúc trống sân, sát thương nhận vào luôn giảm đi 1 (tối thiểu nhận 1).',
    ghostAbility: 'Mỗi đầu lượt, chọn 1 Linh Thú trên sân của bất kỳ ai và làm giảm 1 Độ Chiến của nó cho đến hết vòng.'
  },
  'NV-04': {
    id: 'NV-04',
    name: 'Chử Đồng Tử — Tiên Ông Đầm Dạ Trạch',
    type: CARD_TYPES.CHARACTER,
    copies: 1,
    aliveAbility: 'Hóa Phép Lâu Đài: Bạn được phép úp tối đa 3 lá Bẫy Thiên Cơ trên sân thay vì 2 lá như người thường.',
    ghostAbility: 'Mỗi đầu lượt, được tráo đổi vị trí 2 lá Bẫy Thiên Cơ đang úp của hai người chơi khác nhau trên bàn.'
  },
  'NV-05': {
    id: 'NV-05',
    name: 'Mẫu Thượng Ngàn — Chúa Sơn Lâm',
    type: CARD_TYPES.CHARACTER,
    copies: 1,
    aliveAbility: 'Lộc Rừng Bất Tận: Giới hạn bài trên tay cuối lượt của bạn là 7 lá thay vì 6 lá.',
    ghostAbility: 'Mỗi đầu lượt, ban lộc lấy 1 lá bài từ Bãi Rác đưa lên tay cho người chơi đang có ít Điểm Nhân Phẩm nhất.'
  },
  'NV-06': {
    id: 'NV-06',
    name: 'Lạc Long Quân — Long Vương Đất Việt',
    type: CARD_TYPES.CHARACTER,
    copies: 1,
    aliveAbility: 'Hòa Hiếu Bách Việt: Một lần mỗi vòng, bạn có thể nhận 1 lá bài cống phẩm từ người chơi khác; trong lượt đó bạn không tấn công họ.',
    ghostAbility: 'Mỗi đầu lượt, chỉ định 2 người chơi còn sống; nếu hai người đó giao chiến trong vòng này, Linh Thú tấn công được +1 Độ Chiến.'
  },
  'NV-07': {
    id: 'NV-07',
    name: 'Tổ Mẫu Âu Cơ — Bọc Trăm Trứng',
    type: CARD_TYPES.CHARACTER,
    copies: 1,
    aliveAbility: 'Huyết Thống Tiên Rồng: Một lần mỗi lượt, bạn có thể hồi sinh 1 Linh Thú Cấp Thấp từ Bãi Rác lên thẳng tay mình.',
    ghostAbility: 'Mỗi đầu lượt, hồi +1 Điểm Nhân Phẩm cho người chơi đang có ít Điểm Nhân Phẩm nhất trên bàn đấu.'
  },
  'NV-08': {
    id: 'NV-08',
    name: 'Cóc Tía Kiện Trời — Cậu Ông Trời',
    type: CARD_TYPES.CHARACTER,
    copies: 1,
    aliveAbility: 'Gọi Mưa Gọi Gió: Một lần mỗi lượt, kích hoạt để nhận thêm +1 lượt Triệu Hồi Thường và bốc 1 lá bài.',
    ghostAbility: 'Mỗi đầu lượt, giáng sấm sét làm giảm 1 Độ Chiến của Linh Thú mạnh nhất trên bàn đấu.'
  },

  // ==========================================
  // PHẦN 2: LINH THÚ & CON VẬT DÂN GIAN CẤP THẤP (32 MÃ - 60 LÁ)
  // ==========================================
  'CT-01': {
    id: 'CT-01',
    name: 'Chim Lạc Báo Tin',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.HONG_HOT,
    power: 2,
    copies: 2,
    description: 'Khi vừa triệu hồi: Bay lượn soi thấu, bắt người chơi ngồi bên trái ngửa toàn bộ bài trên tay trong 10 giây.'
  },
  'CT-02': {
    id: 'CT-02',
    name: 'Khuyển Thần Đá Đầu Làng',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.QUAY_PHA,
    power: 3,
    copies: 2,
    realLifeAction: 'BARK',
    description: 'Khi tuyên bố tấn công, phát uy tiếng sủa trấn yểm giúp Linh Thú này được +2 Độ Chiến trong pha giao tranh đó.'
  },
  'CT-03': {
    id: 'CT-03',
    name: 'Ngựa Sắt Phù Đổng Nhỏ',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.TOC_DO,
    power: 2,
    copies: 2,
    description: 'Khi tấn công, tung đồng xu âm dương: Nếu thắng sẽ phi nước đại đánh thẳng vào Nhân Phẩm đối thủ bỏ qua Linh Thú chắn đường.'
  },
  'CT-04': {
    id: 'CT-04',
    name: 'Cóc Tía Nghiến Răng',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.AN_VA,
    power: 1,
    copies: 2,
    description: 'Khi bị tiêu diệt bởi đòn tấn công: Trời giáng phạt bắt kẻ vừa đánh bại Cóc Tía phải đền cho bạn 1 lá bài trên tay họ.'
  },
  'CT-05': {
    id: 'CT-05',
    name: 'Ve Sầu Gọi Hè Ngân Vang',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.QUAY_PHA,
    power: 2,
    copies: 2,
    description: 'Chừng nào Ve Sầu còn ngân vang trên sân, không ai được sử dụng các Phép Sự Tích Hồi Nhân Phẩm (DR-08, DR-14).'
  },
  'CT-06': {
    id: 'CT-06',
    name: 'Trâu Vàng Hồ Tây',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.QUAY_PHA,
    power: 3,
    copies: 2,
    description: 'Được +1 Độ Chiến nếu trên sân bạn không có lá Bẫy Thiên Cơ nào đang úp.'
  },
  'CT-07': {
    id: 'CT-07',
    name: 'Cò Trắng Đầu Đình',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.HONG_HOT,
    power: 1,
    copies: 2,
    description: 'Khi vừa triệu hồi: Cắp lộc về làng, giúp bạn bốc ngay 1 lá bài từ chồng bài chung.'
  },
  'CT-08': {
    id: 'CT-08',
    name: 'Khỉ Vàng Núi Đá',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.AN_VA,
    power: 2,
    copies: 2,
    description: 'Khi vừa triệu hồi: Nhanh tay cuỗm 1 Pháp Bảo Đạo Cụ đang gắn trên sân đối thủ chuyển sang trang bị cho chính mình.'
  },
  'CT-09': {
    id: 'CT-09',
    name: 'Linh Miêu Mái Đình',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.TOC_DO,
    power: 2,
    copies: 2,
    description: 'Miễn nhiễm với Phép Sự Tích từ đối thủ. Lần đầu tiên bị đánh bại, bật nhảy quay lại trên tay chủ sở hữu thay vì vào Bãi Rác.'
  },
  'CT-10': {
    id: 'CT-10',
    name: 'Rùa Đá Đội Bia Văn Miếu',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.AN_VA,
    power: 3,
    copies: 2,
    description: 'Linh Quy Trấn Giữ: Không chủ động tuyên bố tấn công, nhưng được +2 Độ Chiến vững như bàn thạch khi đỡ đòn.'
  },
  'CT-11': {
    id: 'CT-11',
    name: 'Chim Khách Báo Hỷ',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.HONG_HOT,
    power: 1,
    copies: 2,
    description: 'Mỗi khi người chơi ngồi bên cạnh bốc thêm bài ngoài giai đoạn bốc bài thường, bạn cũng được hưởng ké lộc bốc 1 lá.'
  },
  'CT-12': {
    id: 'CT-12',
    name: 'Chó Phú Quốc Lưng Xoáy',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.TOC_DO,
    power: 3,
    copies: 2,
    description: 'Nếu trên sân có bất kỳ Linh Thú nào thuộc hệ Dũng Mãnh (Quậy Phá), Chó Phú Quốc được +1 Độ Chiến.'
  },
  'CT-13': {
    id: 'CT-13',
    name: 'Quạ Thần Cắp Ngọc Phương Nam',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.HONG_HOT,
    power: 2,
    copies: 2,
    realLifeAction: 'CHOT_DON',
    description: 'Tuyệt kỹ trên sân (1 lần/lượt): Bỏ 1 lá bài trên tay để quắp bay 1 lá bài trên tay của đối thủ xuống Bãi Rác.'
  },
  'CT-14': {
    id: 'CT-14',
    name: 'Dế Mèn Phiêu Lưu Ký',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.AN_VA,
    power: 1,
    copies: 2,
    description: 'Ý Chí Quật Cường: Nếu bạn đang là người có ít Điểm Nhân Phẩm nhất bàn, Dế Mèn bùng nổ được +3 Độ Chiến.'
  },
  'CT-15': {
    id: 'CT-15',
    name: 'Cá Chép Vượt Vũ Môn',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.TOC_DO,
    power: 2,
    copies: 2,
    description: 'Vượt mọi thác ghềnh: Có thể tấn công bất chấp mọi hiệu ứng khóa đòn đánh hoặc đóng băng trên bàn.'
  },
  'CT-16': {
    id: 'CT-16',
    name: 'Bồ Nông Ngậm Túi Thần',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.HONG_HOT,
    power: 2,
    copies: 2,
    description: 'Khi vừa triệu hồi: Lặn xuống Bãi Rác và vớt lại 1 lá Pháp Bảo Đạo Cụ bất kỳ đưa lên tay bạn.'
  },
  'CT-17': {
    id: 'CT-17',
    name: 'Tê Giác Một Sừng Rừng Nam',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.QUAY_PHA,
    power: 2,
    copies: 2,
    description: 'Khi vừa triệu hồi: Húc tung và phá hủy ngay lập tức 1 lá Bẫy Thiên Cơ đang úp của đối thủ.'
  },
  'CT-18': {
    id: 'CT-18',
    name: 'Chim Sẻ Gắp Thóc Giúp Tấm',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.HONG_HOT,
    power: 2,
    copies: 2,
    description: 'Cuối lượt của bạn, nhặt 1 lá bài trên cùng của Bãi Rác xếp gọn xuống đáy chồng bài bốc.'
  },
  'CT-19': {
    id: 'CT-19',
    name: 'Sếu Đầu Đỏ Đồng Tháp',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.AN_VA,
    power: 2,
    copies: 2,
    description: 'Khi Sếu Đầu Đỏ đánh bại Linh Thú đối thủ, vũ điệu linh thiêng giúp bạn hồi +1 Điểm Nhân Phẩm.'
  },
  'CT-20': {
    id: 'CT-20',
    name: 'Gà Trống Chín Cựa Gọi Mặt Trời',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.QUAY_PHA,
    power: 3,
    copies: 2,
    description: 'Khi vừa triệu hồi: Tiếng gáy bình minh xóa sạch mọi trạng thái Đóng Băng / Khóa Đòn Đánh cho toàn bộ Linh Thú trên bàn.'
  },
  'CT-21': {
    id: 'CT-21',
    name: 'Đom Đóm Đèn Sách Trạng Nguyên',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.HONG_HOT,
    power: 1,
    copies: 1,
    description: 'Khi ở trên sân, ánh sáng trí tuệ giúp tăng thêm +1 sát thương cho mọi lá Phép Sự Tích gây sát thương của bạn.'
  },
  'CT-22': {
    id: 'CT-22',
    name: 'Hồ Ly Tinh Trắng Hồ Tây',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.QUAY_PHA,
    power: 3,
    copies: 1,
    description: 'Khi tấn công trực diện vào người chơi trống sân, tiếng hồ cầm mê hoặc bắt đối thủ phải bỏ thêm 1 lá bài trên tay.'
  },
  'CT-23': {
    id: 'CT-23',
    name: 'Voi Chín Ngà Bản Đôn',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.AN_VA,
    power: 2,
    copies: 1,
    takesBothSlots: true,
    description: 'Thân hình khổng lồ chiếm cả 2 Ô Linh Thú của bạn, nhưng cản phá mọi sát thương vượt trội đánh vào nó về 0.'
  },
  'CT-24': {
    id: 'CT-24',
    name: 'Ngựa Chín Hồng Mao',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.TOC_DO,
    power: 1,
    copies: 1,
    description: 'Lễ vật sính lễ Sơn Tinh: Khi dùng lá này làm nguyên liệu Hiến Tế gọi Thần Thú Cấp Cao, bạn được bốc ngay 2 lá bài!'
  },
  'CT-25': {
    id: 'CT-25',
    name: 'Đàn Chim Lạc Hồng',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.TOC_DO,
    power: 3,
    copies: 2,
    canSwarm: true,
    description: 'Gọi Bầy Liên Hoàn: Khi vừa triệu hồi, nếu sân bạn còn ô trống và trên tay có Linh Thú Cấp Thấp, tự động triệu hồi miễn phí thêm 1 Linh Thú đó lên sân!'
  },
  'CT-26': {
    id: 'CT-26',
    name: 'Nghê Đá Chầu Đền Thiêng',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.AN_VA,
    power: 3,
    copies: 2,
    canSwarm: true,
    description: 'Khi vừa triệu hồi: Ban phước Hộ Pháp cộng +1 Độ Chiến cho toàn bộ Linh Thú phe bạn đang đứng trên sân.'
  },
  'CT-27': {
    id: 'CT-27',
    name: 'Sao La Sừng Kiếm Trường Sơn',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.TOC_DO,
    power: 3,
    copies: 2,
    freeSwarmSummon: true,
    description: 'Kỳ Thú Đại Ngàn: Có thể Triệu Hồi Gọi Bầy miễn phí (không tốn lượt triệu hồi thường) và bốc 1 lá bài nếu bạn đã có Linh Thú trên sân.'
  },
  'CT-28': {
    id: 'CT-28',
    name: 'Cá Ông Nam Hải Cứu Độ',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.HONG_HOT,
    power: 3,
    copies: 2,
    canSwarm: true,
    description: 'Khi vừa triệu hồi: Sóng lành vượt biển, hồi ngay +1 Điểm Nhân Phẩm cho bạn và bốc 1 lá bài mới.'
  },
  'CT-29': {
    id: 'CT-29',
    name: 'Trăn Gấm Rừng U Minh',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.QUAY_PHA,
    power: 3,
    copies: 2,
    description: 'Khi vừa triệu hồi: Cuộn mình siết chặt làm 1 Linh Thú của đối thủ bị Đóng Băng, không thể tấn công trong lượt kế tiếp.'
  },
  'CT-30': {
    id: 'CT-30',
    name: 'Gà Đông Tảo Tiến Vua',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.QUAY_PHA,
    power: 3,
    copies: 2,
    freeSwarmSummon: true,
    description: 'Cặp Chân Rồng Vảy Thịt: Có thể Triệu Hồi Gọi Bầy miễn phí và nhận thêm +1 Độ Chiến ngay trong lượt vừa xuất trận.'
  },
  'CT-31': {
    id: 'CT-31',
    name: 'Rái Cá Sông Mê Kông',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.HONG_HOT,
    power: 2,
    copies: 2,
    canSwarm: true,
    description: 'Khi vừa triệu hồi: Lặn xuống Bãi Rác cứu 1 Linh Thú Cấp Thấp bất kỳ gọi thẳng lên ô trống trên sân của bạn!'
  },
  'CT-32': {
    id: 'CT-32',
    name: 'Hươu Sao Rừng Cúc Phương',
    type: CARD_TYPES.LOW_MONSTER,
    tribe: TRIBES.TOC_DO,
    power: 2,
    copies: 2,
    canSwarm: true,
    description: 'Khi vừa triệu hồi: Mở lối rừng sâu, lập tức làm mới lượt Triệu Hồi Thường để bạn được triệu hồi thêm 1 Linh Thú nữa trong lượt này!'
  },

  // ==========================================
  // PHẦN 3: ĐẠI YÊU & THẦN THÚ CẤP CAO — TRÙM THẦN THOẠI (16 MÃ - 24 LÁ)
  // ==========================================
  'TR-01': {
    id: 'TR-01',
    name: 'Chằn Tinh Núi Đá Đòi Cống Phẩm',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 2,
    description: 'Đầu mỗi lượt của bạn: Các người chơi khác phải cống nạp cho bạn 1 lá bài trên tay (tối đa nhận 2 lá) hoặc bị Chằn Tinh trừ 1 Điểm Nhân Phẩm.'
  },
  'TR-02': {
    id: 'TR-02',
    name: 'Tinh Gà Trắng Cửu Đầu Thành Cổ Loa',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 2,
    realLifeAction: 'SING',
    description: 'Khi tuyên bố tấn công, tiếng hú ma mị làm sụp đổ phòng tuyến, vô hiệu hóa toàn bộ Bẫy Thiên Cơ của mục tiêu trong pha đánh đó.'
  },
  'TR-03': {
    id: 'TR-03',
    name: 'Mộc Tinh Cây Chò Ngàn Năm',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 2,
    description: 'Khi vừa triệu hồi: Rễ cây khổng lồ quét sạch toàn bộ Pháp Bảo Đạo Cụ đang gắn trên sân của tất cả người chơi khác vào Bãi Rác.'
  },
  'TR-04': {
    id: 'TR-04',
    name: 'Ông Ba Mươi — Chúa Sơn Lâm',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 4,
    copies: 2,
    description: 'Mãnh Hổ Liên Hoàn Vồ: Có thể tấn công 2 lần trong cùng một lượt vào các mục tiêu trên bàn đấu.'
  },
  'TR-05': {
    id: 'TR-05',
    name: 'Thần Kim Quy — Rùa Vàng Hồ Gươm',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 4,
    copies: 2,
    description: 'Khi vừa triệu hồi: Hồi ngay +2 Điểm Nhân Phẩm cho bạn và rước 1 lá Bẫy Thiên Cơ từ Bãi Rác úp thẳng xuống sân.'
  },
  'TR-06': {
    id: 'TR-06',
    name: 'Ngư Tinh Chín Đuôi Biển Đông',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 1,
    description: 'Khi Ngư Tinh tiêu diệt Linh Thú của đối thủ, sóng thần cuộn trào gây thêm 1 sát thương xuyên giáp thẳng vào Điểm Nhân Phẩm của đối thủ đó.'
  },
  'TR-07': {
    id: 'TR-07',
    name: 'Dũng Sĩ Thạch Sanh Cung Vàng',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 4,
    copies: 1,
    description: 'Nếu bị tiêu diệt bởi đòn tấn công hoặc Bẫy, nghĩa khí Thạch Sanh triệu hồi miễn phí 1 Linh Thú Cấp Thấp từ tay hoặc Bãi Rác lên sân.'
  },
  'TR-08': {
    id: 'TR-08',
    name: 'Trùm Đầu Gấu Hắc Hổ Sơn Thần',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 1,
    description: 'Uy Áp Chúa Sơn Lâm: Đối thủ không thể chọn Linh Thú khác trên sân bạn làm mục tiêu tấn công nếu Hắc Hổ Sơn Thần vẫn còn đứng sừng sững.'
  },
  'TR-09': {
    id: 'TR-09',
    name: 'Hồ Tinh Chín Đuôi Biến Hóa',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 4,
    copies: 1,
    description: 'Tuyệt kỹ trên sân (1 lần/lượt): Hóa phép đưa 1 lá bài trên tay bạn cho đối thủ để mê hoặc rút lấy 2 lá bài ngẫu nhiên từ trên tay người đó.'
  },
  'TR-10': {
    id: 'TR-10',
    name: 'Thần Sét Thiên Lôi Búa Đá',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 1,
    description: 'Khi có 2 người chơi khác giao chiến, Thiên Lôi giáng búa phân xử: Trừ của cả 2 người đó mỗi người 1 Điểm Nhân Phẩm (1 lần/vòng).'
  },
  'TR-11': {
    id: 'TR-11',
    name: 'Thần Độc Cước Trấn Biển',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 4,
    copies: 1,
    description: 'Chừng nào Thần Độc Cước còn trên sân, không đối thủ nào được phép nhìn hay lật Bẫy Thiên Cơ trong Giai đoạn Bày Trò (Main Phase).'
  },
  'TR-12': {
    id: 'TR-12',
    name: 'Hỏa Kỳ Lân Phun Lửa Thiêng',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 2,
    description: 'Cuối lượt của bạn, tụ hỏa khí giảm 1 Độ Chiến. Khi Độ Chiến giảm về 2 hoặc khi bị tiêu diệt: Nổ tung biển lửa, trừ 2 Điểm Nhân Phẩm của mọi người chơi có Linh Thú trên sân!'
  },
  'TR-13': {
    id: 'TR-13',
    name: 'Long Vương Đông Hải',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 1,
    description: 'Khi vừa triệu hồi: Hồi +2 Điểm Nhân Phẩm cho bạn và tự động gắn miễn phí 1 Pháp Bảo Đạo Cụ từ Bãi Rác lên thẳng Long Vương!'
  },
  'TR-14': {
    id: 'TR-14',
    name: 'Ông Đổng Khổng Lồ Gánh Núi',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 1,
    freeSwarmSummon: true,
    description: 'Thần Lực Dời Non: Có thể Triệu Hồi Đặc Biệt thẳng từ trên tay mà không cần Hiến Tế nếu đối thủ đang có Linh Thú trên sân!'
  },
  'TR-15': {
    id: 'TR-15',
    name: 'Đại Bàng Chín Mỏ (Sự Tích Cây Khế)',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 2,
    description: 'Ăn Khế Trả Vàng: Khi vừa triệu hồi, giúp bạn bốc 2 lá bài mới và triệu hồi miễn phí thêm 1 Linh Thú Cấp Thấp từ trên tay lên sân!'
  },
  'TR-16': {
    id: 'TR-16',
    name: 'Phượng Hoàng Lửa Núi Hồng Lĩnh',
    type: CARD_TYPES.HIGH_MONSTER,
    power: 5,
    copies: 2,
    description: 'Khi vừa triệu hồi: Lửa thiêng tái sinh hồi +1 Điểm Nhân Phẩm và cộng +2 Độ Chiến cho toàn bộ Linh Thú phe bạn đang có trên sân!'
  },

  // ==========================================
  // PHẦN 4: THẦN THÚ DUNG HỢP HUYỀN THOẠI (12 MÃ - 12 LÁ)
  // ==========================================
  'DH-01': {
    id: 'DH-01',
    name: 'Thiên Nhãn Thuận Phong Nhĩ',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 6,
    copies: 1,
    recipe: { type: 'TWO_SAME_TRIBE', tribe: TRIBES.HONG_HOT },
    description: 'Khi vừa giáng lâm: Nhìn thấu vạn dặm, soi toàn bộ bài trên tay đối thủ và thu phục ngay 1 lá bài mạnh nhất về tay mình.'
  },
  'DH-02': {
    id: 'DH-02',
    name: 'Thần Chó 3 Đầu Núi Tản Viên',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 7,
    copies: 1,
    recipe: { type: 'SPECIFIC_PAIR', cards: ['CT-02', 'CT-12'] },
    realLifeAction: 'BARK_THREE',
    description: 'Hợp thể Khuyển Thần Đá & Chó Phú Quốc: Khi tấn công sẽ càn quét đánh lan cùng lúc vào 2 đối thủ khác nhau trên bàn đấu!'
  },
  'DH-03': {
    id: 'DH-03',
    name: 'Trống Đồng Ngọc Lũ Cổ Thần',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 6,
    copies: 1,
    recipe: { type: 'TRIBE_PLUS_CARD_TYPE', tribe: TRIBES.QUAY_PHA, cardType: CARD_TYPES.EQUIPMENT },
    description: 'Miễn nhiễm với mọi Phép Sự Tích. Đầu mỗi lượt của bạn, tiếng trống đồng chấn động bắt mỗi đối thủ phải bỏ 1 lá bài hoặc mất 1 Điểm Nhân Phẩm.'
  },
  'DH-04': {
    id: 'DH-04',
    name: 'Thần Mã Phi Thiên Cưỡi Mây',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 6,
    copies: 1,
    recipe: { type: 'TWO_SAME_TRIBE', tribe: TRIBES.TOC_DO },
    description: 'Tung vó vượt chín tầng mây: Luôn có thể tấn công trực diện vào Điểm Nhân Phẩm của đối thủ bất chấp Linh Thú chắn đường.'
  },
  'DH-05': {
    id: 'DH-05',
    name: 'Ma Vương Chí Phèo Làng Vũ Đại',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 6,
    copies: 1,
    recipe: { type: 'TWO_SAME_TRIBE', tribe: TRIBES.AN_VA },
    description: 'Bất cứ khi nào nhận sát thương hoặc bị tiêu diệt trong giao tranh, kẻ gây ra phải gánh chịu gấp đôi lượng sát thương Nhân Phẩm đó.'
  },
  'DH-06': {
    id: 'DH-06',
    name: 'Chúa Tể Sơn Lâm Thượng Ngàn',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 7,
    copies: 1,
    recipe: { type: 'CARD_PLUS_ANY_MONSTER', cardId: 'TR-01' },
    description: 'Uy linh thống lĩnh muôn thú: Thu phục quyền điều khiển 1 Linh Thú Cấp Thấp của đối thủ sang sân của bạn ngay khi vừa Dung Hợp.'
  },
  'DH-07': {
    id: 'DH-07',
    name: 'Thần Rồng Cháu Tiên Bách Việt',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 7,
    copies: 1,
    recipe: { type: 'OWN_MONSTER_PLUS_STOLEN_MONSTER' },
    description: 'Khi vừa xuất hiện: Hồi +3 Điểm Nhân Phẩm cho bạn và giáng phạt trừ 2 Điểm Nhân Phẩm của người bị lấy nguyên liệu.'
  },
  'DH-08': {
    id: 'DH-08',
    name: 'Thạch Sanh Đại Chiến Chằn Tinh',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 6,
    copies: 1,
    recipe: { type: 'SPECIFIC_PAIR', cards: ['CT-03', 'CT-13'] },
    description: 'Tuyệt kỹ trên sân (1 lần/lượt): Quăng 1 lá bài từ Bãi Rác vào thẳng Ô Linh Thú của đối thủ biến thành hình nhân 0 Độ Chiến để bạn chém lấy sát thương!'
  },
  'DH-09': {
    id: 'DH-09',
    name: 'Tứ Linh Hội Tụ — Long Lân Quy Phụng',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 7,
    copies: 1,
    recipe: { type: 'TWO_DIFFERENT_TRIBES' },
    description: 'Dung hợp dễ tiếp cận (2 Linh Thú khác Hệ bất kỳ): Khi giáng lâm, hồi +2 Điểm Nhân Phẩm, bốc 1 lá bài và cộng +1 Độ Chiến toàn sân!'
  },
  'DH-10': {
    id: 'DH-10',
    name: 'Kim Long Hóa Rồng Vượt Vũ Môn',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 7,
    copies: 1,
    recipe: { type: 'TRIBE_PAIR', tribes: [TRIBES.HONG_HOT, TRIBES.TOC_DO] },
    description: 'Ghép từ 1 Linh Thú Hệ Linh Giác + 1 Hệ Thần Tốc: Khi giáng lâm giúp bạn bốc 2 lá bài và gọi miễn phí 1 Linh Thú Cấp Thấp từ tay lên sân!'
  },
  'DH-11': {
    id: 'DH-11',
    name: 'Thánh Gióng Cưỡi Ngựa Sắt Phun Lửa',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 8,
    copies: 1,
    recipe: { type: 'BOSS_PLUS_EQUIPMENT' },
    description: 'Ghép từ 1 Thần Thú Cấp Cao + 1 Pháp Bảo Đạo Cụ: Khi xuất trận thiêu rụi ngay 1 Linh Thú của đối thủ và trừ 2 Điểm Nhân Phẩm của họ!'
  },
  'DH-12': {
    id: 'DH-12',
    name: 'Sơn Tinh Dâng Núi Chặn Thủy Tinh',
    type: CARD_TYPES.FUSION_MONSTER,
    power: 7,
    copies: 1,
    recipe: { type: 'TRIBE_PAIR', tribes: [TRIBES.QUAY_PHA, TRIBES.AN_VA] },
    description: 'Ghép từ 1 Linh Thú Hệ Dũng Mãnh + 1 Hệ Huyền Bí: Khi xuất trận hồi +2 Điểm Nhân Phẩm và bảo hộ toàn đội hình được +2 Độ Chiến!'
  },

  // ==========================================
  // PHẦN 5: PHÁP BẢO & CỔ VẬT DÂN GIAN — TRANG BỊ (14 MÃ - 24 LÁ)
  // ==========================================
  'DC-01': {
    id: 'DC-01',
    name: 'Dép Tổ Ong Thần Tốc — Nỏ Thần Liên Châu',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    powerBonus: 2,
    copies: 2,
    description: 'Tăng +2 Độ Chiến. Nếu Linh Thú đang trang bị bị tiêu diệt, bắn trả tên thần trừ 1 Điểm Nhân Phẩm của kẻ tấn công.'
  },
  'DC-02': {
    id: 'DC-02',
    name: 'Nồi Cơm Điện — Mai Rùa Vàng Kim Quy',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    powerBonus: 1,
    copies: 2,
    description: 'Tăng +1 Độ Chiến. Bảo vệ Linh Thú khỏi bị tiêu diệt trong lần đầu tiên thua giao tranh (sau đó Mai Rùa Vàng hóa giải vào Bãi Rác).'
  },
  'DC-03': {
    id: 'DC-03',
    name: 'Roi Sắt Gãy Của Thánh Gióng',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    powerBonusVsLow: 2,
    copies: 2,
    description: 'Tăng +2 Độ Chiến khi tấn công các Linh Thú Cấp Thấp.'
  },
  'DC-04': {
    id: 'DC-04',
    name: 'Tiếng Đàn Thạch Sanh Làm Quân Giặc Bủn Rủn',
    type: CARD_TYPES.EQUIPMENT,
    target: 'ENEMY',
    powerBonus: -2,
    copies: 2,
    description: 'Gắn vào Linh Thú đối thủ: Làm giảm -2 Độ Chiến và vô hiệu hóa toàn bộ kỹ năng hiệu ứng của Linh Thú đó.'
  },
  'DC-05': {
    id: 'DC-05',
    name: 'Áo Tơi Lá Cọ Phản Đòn',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    copies: 1,
    description: 'Gai nhọn hộ thân phản lại 1 điểm sát thương vào kẻ tấn công mỗi khi Linh Thú mang Áo Tơi bị đánh.'
  },
  'DC-06': {
    id: 'DC-06',
    name: 'Bùa Trấn Yểm Rừng Thiêng',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    powerBonus: 1,
    copies: 2,
    description: 'Tăng +1 Độ Chiến. Khi Linh Thú này tấn công, đối thủ bị phong ấn không thể kích hoạt nội tại của hệ Linh Giác hoặc Huyền Bí.'
  },
  'DC-07': {
    id: 'DC-07',
    name: 'Tờ Giấy Ghi Nợ Sổ Nam Tào',
    type: CARD_TYPES.EQUIPMENT,
    target: 'ENEMY',
    copies: 2,
    description: 'Gắn vào Linh Thú đối thủ: Đầu mỗi lượt của chủ sở hữu Linh Thú đó, họ bị trừ 1 Điểm Nhân Phẩm (không thể dùng lá này làm nguyên liệu Hiến Tế!).'
  },
  'DC-08': {
    id: 'DC-08',
    name: 'Niêu Cơm Thần Thạch Sanh',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    powerBonus: 1,
    hpBonus: 1,
    copies: 2,
    description: 'Ăn hết lại đầy: Khi vừa trang bị, hồi ngay +1 Điểm Nhân Phẩm cho bạn và tăng +1 Độ Chiến cho Linh Thú.'
  },
  'DC-09': {
    id: 'DC-09',
    name: 'Túi Ba Gang Đựng Vàng (Cây Khế)',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    copies: 1,
    description: 'Giúp Linh Thú của bạn thu chiến lợi phẩm, cướp luôn 1 lá Pháp Bảo Đạo Cụ của đối thủ khi đánh thắng Linh Thú của họ.'
  },
  'DC-10': {
    id: 'DC-10',
    name: 'Vòng Kim Cô Sơn Thần Chế Ngự',
    type: CARD_TYPES.EQUIPMENT,
    target: 'ENEMY',
    copies: 2,
    description: 'Gắn vào Linh Thú đối thủ: Linh Thú đó không thể tấn công bạn, mà bắt buộc phải tấn công một người chơi khác nếu còn mục tiêu.'
  },
  'DC-11': {
    id: 'DC-11',
    name: 'Gươm Thần Thuận Thiên Lê Lợi',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    powerBonus: 2,
    copies: 2,
    description: 'Tăng +2 Độ Chiến. Hào quang Thuận Thiên lập tức cho phép bạn thực hiện thêm +1 lượt Triệu Hồi Thường ngay trong lượt này!'
  },
  'DC-12': {
    id: 'DC-12',
    name: 'Bụi Tre Ngà Làng Phù Đổng',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    powerBonus: 1,
    copies: 2,
    description: 'Tăng +1 Độ Chiến cho Linh Thú và giúp bạn bốc ngay 1 lá bài từ chồng bài chung khi vừa trang bị.'
  },
  'DC-13': {
    id: 'DC-13',
    name: 'Trầu Cánh Phượng Tấm Cám',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    powerBonus: 1,
    hpBonus: 2,
    copies: 1,
    description: 'Duyên lành cổ tích: Tăng +1 Độ Chiến cho Linh Thú và hồi ngay +2 Điểm Nhân Phẩm cho bạn khi trang bị.'
  },
  'DC-14': {
    id: 'DC-14',
    name: 'Cung Tên Vàng Lạc Việt',
    type: CARD_TYPES.EQUIPMENT,
    target: 'SELF',
    powerBonus: 2,
    copies: 1,
    description: 'Tăng +2 Độ Chiến và bắn tên thần gây ngay 1 sát thương Nhân Phẩm cho đối thủ đang có nhiều máu nhất bàn khi vừa trang bị!'
  },

  // ==========================================
  // PHẦN 6: PHÉP SỰ TÍCH DÂN GIAN — DRAMA TỨC THỜI (16 MÃ - 26 LÁ)
  // ==========================================
  'DR-01': {
    id: 'DR-01',
    name: 'Sự Tích Sơn Tinh Thủy Tinh Đại Chiến',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Chỉ định 2 người chơi đang có Linh Thú trên sân: Ép 2 Linh Thú mạnh nhất của họ phải lao vào quyết đấu ngay lập tức (tính sát thương Nhân Phẩm như thật!).'
  },
  'DR-02': {
    id: 'DR-02',
    name: 'Sự Tích Lý Thông Tráo Công Thạch Sanh',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Đẩy 1 Linh Thú trên sân bạn sang Ô trống của đối thủ làm nội gián: Trừ ngay 1 Điểm Nhân Phẩm của họ, mỗi đầu lượt tiếp tục trừ 1 HP và cấm đánh bạn.'
  },
  'DR-03': {
    id: 'DR-03',
    name: 'Thủy Tinh Dâng Nước Lũ Cuốn Trôi',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Cơn đại hồng thủy cuốn toàn bộ các lá Bẫy Thiên Cơ đang úp trên bàn, xáo trộn ngẫu nhiên rồi chia trả lại cho từng người!'
  },
  'DR-04': {
    id: 'DR-04',
    name: 'Sự Tích Chú Cuội Cải Tử Hoàn Sinh',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Dùng lá cây đa thần của Chú Cuội tìm trong Bãi Rác và hồi sinh 1 lá bài bất kỳ đưa thẳng lên tay bạn.'
  },
  'DR-05': {
    id: 'DR-05',
    name: 'Sự Tích Cây Khế — Ăn Khế Trả Vàng',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Đếm số người chơi đang có nhiều Điểm Nhân Phẩm hơn bạn: Đại Bàng chở bạn đi lấy số lá bài tương ứng (bốc tối đa 3 lá).'
  },
  'DR-06': {
    id: 'DR-06',
    name: 'Mượn Đồ Quên Trả — Cướp Nỏ Thần Trọng Thủy',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Mượn 1 Linh Thú của đối thủ sang sân bạn cho đến hết lượt này. Nó có thể tấn công chủ cũ hoặc làm nguyên liệu Hiến Tế / Dung Hợp luôn!'
  },
  'DR-07': {
    id: 'DR-07',
    name: 'Sự Tích Hồn Trương Ba Da Hàng Thịt',
    type: CARD_TYPES.DRAMA,
    copies: 1,
    description: 'Hoán đổi toàn bộ số bài trên tay của bạn với số bài trên tay của 1 người chơi khác trên bàn.'
  },
  'DR-08': {
    id: 'DR-08',
    name: 'Lễ Hội Đền Hùng Mở Tiệc Linh Đình',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Toàn thể người chơi cùng hồi +2 Điểm Nhân Phẩm và bốc 1 lá bài, riêng người chủ trì mở hội được bốc 2 lá bài.'
  },
  'DR-09': {
    id: 'DR-09',
    name: 'Chiếu Chỉ Thiên Đình Soi Thấu Bẫy',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Chọn 1 đối thủ: Bắt buộc họ phải công khai toàn bộ các lá Bẫy Thiên Cơ đang úp trên sân cho cả bàn biết.'
  },
  'DR-10': {
    id: 'DR-10',
    name: 'Kế Ly Gián Cổ Loa Thành',
    type: CARD_TYPES.DRAMA,
    copies: 1,
    description: 'Tiêu diệt ngay lập tức 1 Linh Thú trên sân đối thủ nếu trên sân người đó đang dàn trận đủ 2 Linh Thú.'
  },
  'DR-11': {
    id: 'DR-11',
    name: 'Bốc Phốt Trống Kêu Oan Sân Đình',
    type: CARD_TYPES.DRAMA,
    copies: 1,
    realLifeAction: 'VOTE',
    description: 'Đánh trống sân đình xét xử 1 đối thủ: Cả bàn bỏ phiếu phán xử làm người bị xét xử mất ngay 2 Điểm Nhân Phẩm!'
  },
  'DR-12': {
    id: 'DR-12',
    name: 'Táo Quân Cưỡi Cá Chép Về Trời',
    type: CARD_TYPES.DRAMA,
    copies: 1,
    description: 'Tất cả người chơi dọn sạch toàn bộ bài cũ trên tay vào Bãi Rác, sau đó mỗi người bốc lại đúng 4 lá bài lộc đầu xuân.'
  },
  'DR-13': {
    id: 'DR-13',
    name: 'Sự Tích Bọc Trăm Trứng Nở Rộ',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Triệu hồi miễn phí tối đa 2 Linh Thú Cấp Thấp từ trên tay bạn lên sân trong cùng một lượt để tạo thế bầy đàn áp đảo!'
  },
  'DR-14': {
    id: 'DR-14',
    name: 'Sự Tích Bánh Chưng Bánh Giầy Lang Liêu',
    type: CARD_TYPES.DRAMA,
    copies: 2,
    description: 'Dâng lễ vật trời đất: Hồi +2 Điểm Nhân Phẩm cho bản thân và thanh tẩy mọi hiệu ứng bất lợi đang bám trên Linh Thú của bạn.'
  },
  'DR-15': {
    id: 'DR-15',
    name: 'Sự Tích Cây Tre Trăm Đốt — Khắc Nhập!',
    type: CARD_TYPES.DRAMA,
    copies: 1,
    description: 'Hô vang "Khắc nhập! Khắc nhập!": Triệu hồi đặc biệt tối đa 2 Linh Thú Cấp Thấp từ Bãi Rác hoặc trên tay lên sân bạn và cộng +1 Độ Chiến cho toàn đội!'
  },
  'DR-16': {
    id: 'DR-16',
    name: 'Lễ Cầu Mưa Cóc Kiện Trời',
    type: CARD_TYPES.DRAMA,
    copies: 1,
    description: 'Mưa thuận gió hòa: Bạn được bốc ngay 2 lá bài mới và được phép thực hiện thêm +1 lượt Triệu Hồi Thường ngay trong lượt này!'
  },

  // ==========================================
  // PHẦN 7: BẪY THIÊN CƠ & NGHIỆP QUẬT CỔ TÍCH (16 MÃ - 24 LÁ)
  // ==========================================
  'NQ-01': {
    id: 'NQ-01',
    name: 'Gương Phản Đòn Chiếu Yêu Đầm Dạ Trạch',
    type: CARD_TYPES.TRAP,
    copies: 2,
    trigger: 'ON_ATTACKED',
    description: 'Khi bạn bị tuyên bố tấn công: Gương thần phản chiếu hủy đòn đánh vào bạn và dội toàn bộ sát thương ngược lại kẻ tấn công!'
  },
  'NQ-02': {
    id: 'NQ-02',
    name: 'Tiếng Kêu Oan Thị Kính',
    type: CARD_TYPES.TRAP,
    copies: 2,
    trigger: 'ON_MONSTER_DESTROYED',
    description: 'Khi Linh Thú của bạn bị tiêu diệt: Bắt kẻ vừa ra tay phải bồi thường cho bạn 2 lá bài ngẫu nhiên từ trên tay họ.'
  },
  'NQ-03': {
    id: 'NQ-03',
    name: 'Nhìn Gì Mà Nhìn! — Mắt Thần Đền Cổ',
    type: CARD_TYPES.TRAP,
    copies: 2,
    trigger: 'OPPONENT_LOOK_OR_PROVOKE',
    realLifeAction: 'STARE_DETECTED',
    description: 'Bẫy Tâm Lý: Lật lên bất cứ lúc nào để trừng phạt đối thủ tò mò nhìn trộm bẫy úp của bạn, trừ ngay 2 Điểm Nhân Phẩm của kẻ đó!'
  },
  'NQ-04': {
    id: 'NQ-04',
    name: 'Lý Thông Đổ Vỏ Cho Thằng Bên Cạnh',
    type: CARD_TYPES.TRAP,
    copies: 2,
    trigger: 'ABOUT_TO_TAKE_DAMAGE',
    realLifeAction: 'SHOUT_TAI_NO',
    description: 'Khi bạn sắp mất Điểm Nhân Phẩm: Đẩy toàn bộ sát thương sang một đối thủ khác trên bàn hứng chịu thay cho bạn!'
  },
  'NQ-05': {
    id: 'NQ-05',
    name: 'Camera Hành Trình — Sổ Thiên Đình Ghi Chép',
    type: CARD_TYPES.TRAP,
    copies: 2,
    trigger: 'ON_SPELL_OR_TRAP_ACTIVATED',
    description: 'Khi đối thủ tung Phép Sự Tích hoặc lật Bẫy: Vô hiệu hóa hoàn toàn lá bài đó và tống thẳng vào Bãi Rác!'
  },
  'NQ-06': {
    id: 'NQ-06',
    name: 'Vỏ Quýt Dày Có Móng Tay Nhọn',
    type: CARD_TYPES.TRAP,
    copies: 2,
    trigger: 'ON_MONSTER_ATTACKED',
    powerBonus: 3,
    description: 'Khi Linh Thú của bạn bị tấn công: Linh Thú đó bất ngờ bộc phát thần lực được cộng thêm +3 Độ Chiến trong pha giao tranh này!'
  },
  'NQ-07': {
    id: 'NQ-07',
    name: 'Giả Chết Bắt Quạ — Cuội Nằm Gốc Đa',
    type: CARD_TYPES.TRAP,
    copies: 2,
    trigger: 'ON_DIRECT_ATTACK',
    description: 'Khi bạn bị đánh trực diện vào Nhân Phẩm: Hóa giải hoàn toàn sát thương đòn đánh đó và giúp bạn bốc thêm 1 lá bài!'
  },
  'NQ-08': {
    id: 'NQ-08',
    name: 'Mách Mẹ! — Lệnh Triệu Hồi Của Mẫu Thượng Ngàn',
    type: CARD_TYPES.TRAP,
    copies: 1,
    trigger: 'ON_ATTACKED_BY_BOSS_OR_FUSION',
    description: 'Khi bị Thần Thú Cấp Cao hoặc Dung Hợp tấn công: Đuổi ngay lá Trùm / Dung Hợp đó về lại tay chủ sở hữu (hoặc Chồng Dung Hợp) và hủy đòn đánh!'
  },
  'NQ-09': {
    id: 'NQ-09',
    name: 'Cúp Nước Đột Xuất — Bẫy Đầm Lầy Dạ Trạch',
    type: CARD_TYPES.TRAP,
    copies: 1,
    trigger: 'ON_OPPONENT_SUMMON',
    description: 'Khi đối thủ vừa triệu hồi Linh Thú: Linh Thú đó sa lầy đóng băng, không thể tấn công cho đến hết vòng kế tiếp.'
  },
  'NQ-10': {
    id: 'NQ-10',
    name: 'Thu Phí Qua Đường — Trạm Gác Sơn Thần',
    type: CARD_TYPES.TRAP,
    copies: 2,
    trigger: 'ON_ANY_ATTACK_DECLARED',
    description: 'Khi đối thủ tuyên bố tấn công: Bắt kẻ tấn công phải nộp cho bạn 1 lá bài trên tay làm lộ phí; nếu họ rỗng túi không có bài nộp thì hủy đòn đánh!'
  },
  'NQ-11': {
    id: 'NQ-11',
    name: 'Cười Người Hôm Trước Hôm Sau Người Cười',
    type: CARD_TYPES.TRAP,
    copies: 1,
    trigger: 'ON_LAUGH_DETECTED',
    realLifeAction: 'LAUGH_DETECTED',
    description: 'Bẫy Tâm Lý: Lật lên quật lại kẻ đắc ý chế giễu bạn, trừ 2 Điểm Nhân Phẩm của đối thủ và hồi lại +1 Điểm Nhân Phẩm cho bạn!'
  },
  'NQ-12': {
    id: 'NQ-12',
    name: 'Phép Biến Hình Quả Thị Của Tấm',
    type: CARD_TYPES.TRAP,
    copies: 1,
    trigger: 'ON_MONSTER_ATTACKED',
    description: 'Khi Linh Thú của bạn bị tấn công: Hoán đổi quyền sở hữu Linh Thú đang bị đánh với 1 Linh Thú Cấp Thấp của người chơi thứ 3 ra hứng đòn thay!'
  },
  'NQ-13': {
    id: 'NQ-13',
    name: 'Hàng Giả Hàng Nhái — Lông Ngỗng Mỵ Châu',
    type: CARD_TYPES.TRAP,
    copies: 1,
    trigger: 'ON_CARD_STOLEN',
    description: 'Khi đối thủ dùng phép cướp bài trên tay hoặc trên sân của bạn: Chặn đứng hành động cướp đó và phạt kẻ cướp phải tự vứt 1 lá bài vào Bãi Rác!'
  },
  'NQ-14': {
    id: 'NQ-14',
    name: 'Đồng Quy Vu Tận — Trọng Thủy Lao Giếng',
    type: CARD_TYPES.TRAP,
    copies: 1,
    trigger: 'ON_MONSTER_BATTLE_LOST',
    description: 'Khi Linh Thú của bạn thua giao tranh: Kéo theo luôn Linh Thú vừa đánh thắng của đối thủ xuống Bãi Rác, và cả hai người chơi cùng mất 1 Điểm Nhân Phẩm.'
  },
  'NQ-15': {
    id: 'NQ-15',
    name: 'Nói Có Sách Mách Có Chứng — Rùa Vàng Đòi Gươm',
    type: CARD_TYPES.TRAP,
    copies: 1,
    trigger: 'ON_OPPONENT_BONUS_DRAW',
    description: 'Khi đối thủ bốc thêm bài nhờ hiệu ứng thẻ: Bạn cũng được Rùa Vàng ban lộc bốc ngay 2 lá bài từ chồng bài chung.'
  },
  'NQ-16': {
    id: 'NQ-16',
    name: 'Phút 89 Lật Kèo — Tiên Ông Hiện Hình Cứu Mạng',
    type: CARD_TYPES.TRAP,
    copies: 1,
    trigger: 'ON_LETHAL_DAMAGE',
    description: 'Khi Điểm Nhân Phẩm của bạn sắp bị trừ về 0: Tiên Ông cứu mạng giữ Điểm Nhân Phẩm ở mức 1 Điểm và giúp bạn bốc ngay 2 lá bài lật thế cờ!'
  },

  // ==========================================
  // PHẦN 8: BÀI ÁM QUẺ — ĐẶC QUYỀN HỒN MA ANH LINH (6 MÃ - 6 LÁ)
  // ==========================================
  'AQ-01': {
    id: 'AQ-01',
    name: 'Gió Bấc Hú Đầu Đình',
    type: CARD_TYPES.CURSE,
    copies: 1,
    description: 'Hồn Ma chọn người chơi đang có nhiều Điểm Nhân Phẩm nhất: Cuốn bay 1 lá Bẫy Thiên Cơ đang úp của người đó vào Bãi Rác.'
  },
  'AQ-02': {
    id: 'AQ-02',
    name: 'Tiếng Vọng Đầm Dạ Trạch',
    type: CARD_TYPES.CURSE,
    copies: 1,
    description: 'Hồn Ma lấy 1 lá bài từ tay người nhiều Điểm Nhân Phẩm nhất tráo đổi ngang với 1 lá bài trên tay người ít Điểm Nhân Phẩm nhất.'
  },
  'AQ-03': {
    id: 'AQ-03',
    name: 'Sương Mù Núi Tản Bóng Đè',
    type: CARD_TYPES.CURSE,
    copies: 1,
    description: 'Trong vòng chơi này, tất cả Thần Thú có Độ Chiến từ 5 trở lên đều bị sương mù làm suy yếu -1 Độ Chiến.'
  },
  'AQ-04': {
    id: 'AQ-04',
    name: 'Oan Hồn Làng Vũ Đại Đòi Nợ',
    type: CARD_TYPES.CURSE,
    copies: 1,
    description: 'Hồn Ma chỉ định kẻ đã tung đòn kết liễu mình: Kẻ đó phải nộp 1 lá bài trên tay hoặc bị trừ 1 Điểm Nhân Phẩm.'
  },
  'AQ-05': {
    id: 'AQ-05',
    name: 'Anh Linh Tổ Tiên Phù Hộ',
    type: CARD_TYPES.CURSE,
    copies: 1,
    description: 'Hồn Ma ban phước cho 1 người chơi còn sống: Toàn bộ Linh Thú của người đó được +2 Độ Chiến trong lượt kế tiếp.'
  },
  'AQ-06': {
    id: 'AQ-06',
    name: 'Ma Xó Bếp Lò Giấu Pháp Bảo',
    type: CARD_TYPES.CURSE,
    copies: 1,
    description: 'Hồn Ma thò tay gỡ 1 lá Pháp Bảo Đạo Cụ đang gắn trên sân bất kỳ ai và giấu nó vào Bãi Rác.'
  }
};

export const ALL_120_CARDS = ALL_96_CARDS;
export const ALL_CARDS = ALL_96_CARDS;

/**
 * Tạo danh sách toàn bộ các lá bài vật lý cho Bộ Bài Chính (158 lá)
 */
export function createMainDeckInstances() {
  const instances = [];
  let uid = 1;

  for (const card of Object.values(ALL_96_CARDS)) {
    // Chỉ lấy các thẻ thuộc bộ bài chính (CT, TR, DC, DR, NQ)
    if ([
      CARD_TYPES.LOW_MONSTER,
      CARD_TYPES.HIGH_MONSTER,
      CARD_TYPES.EQUIPMENT,
      CARD_TYPES.DRAMA,
      CARD_TYPES.TRAP
    ].includes(card.type)) {
      for (let i = 0; i < card.copies; i++) {
        instances.push({
          instanceId: `card-${uid++}`,
          cardId: card.id,
          name: card.name,
          type: card.type,
          tribe: card.tribe || null,
          basePower: card.power || 0,
          equippedItems: [],
          statusEffects: [],
          wasStolenTurn: null
        });
      }
    }
  }

  return instances;
}

/**
 * Danh sách 12 lá Thần Thú Dung Hợp Huyền Thoại
 */
export function getFusionDeckCards() {
  return Object.values(ALL_96_CARDS).filter(c => c.type === CARD_TYPES.FUSION_MONSTER);
}

/**
 * Danh sách 6 lá Bài Ám Quẻ Tâm Linh
 */
export function getCurseDeckCards() {
  return Object.values(ALL_96_CARDS).filter(c => c.type === CARD_TYPES.CURSE);
}

/**
 * Danh sách 8 Thẻ Đại Diện Thần Thoại
 */
export function getCharacterCards() {
  return Object.values(ALL_96_CARDS).filter(c => c.type === CARD_TYPES.CHARACTER);
}
