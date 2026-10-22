# 🎴 Đấu Trường Xóm Bất Ổn (Realtime Strategy Card Game)

> Game thẻ bài chiến thuật phong cách **Vietnamese Urban Pop-Art**, hỗ trợ 2 - 6 người chơi thời gian thực qua WebSocket hoặc đấu offline với Bot AI thông minh!

---

## 🚀 Hướng Dẫn Triển Khai Lên Cloud Server 24/7 (Miễn Phí)

Dự án đã được cấu hình sẵn **100% tương thích** với môi trường Cloud (Render.com, Railway.app, Glitch), tự động nhận diện cổng `$PORT`, hỗ trợ kết nối bảo mật `wss://` qua HTTPS và có sẵn endpoint `/health` kiểm tra trạng thái máy chủ.

### Cách 1: Triển khai trên Render.com (Khuyên dùng)
1. **Đẩy mã nguồn lên GitHub**:
   - Tạo một repository mới trên [GitHub](https://github.com/new) (ví dụ: `dau-truong-xom-bat-on`).
   - Đẩy toàn bộ thư mục dự án lên repo GitHub:
     ```bash
     git add .
     git commit -m "feat: Đấu Trường Xóm Bất Ổn - Cloud Deployment"
     git branch -M main
     git remote add origin https://github.com/<tai-khoan-github>/dau-truong-xom-bat-on.git
     git push -u origin main
     ```
2. **Tạo Web Service trên Render**:
   - Đăng nhập vào [Render.com](https://render.com/).
   - Bấm **New +** ➔ chọn **Web Service**.
   - Kết nối tới repository GitHub bạn vừa tạo.
3. **Cấu hình (Hoặc giữ nguyên mặc định từ `render.yaml`)**:
   - **Name**: `dai-chien-than-thoai-viet` (hoặc tên tùy thích)
   - **Environment**: `Node`
   - **Region**: `Singapore` (tối ưu độ trễ cho người chơi Việt Nam)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. **Bấm "Deploy Web Service"**:
   - Sau khoảng 1-2 phút, Render sẽ cấp tên miền cố định miễn phí (ví dụ `https://dai-chien-than-thoai-viet.onrender.com`).
   - Bạn có thể gửi liên kết này cho bạn bè mở trên trình duyệt điện thoại hoặc máy tính để vào chung một phòng và giao chiến 24/7!

---

### Cách 2: Triển khai trên Railway.app
1. Đăng nhập vào [Railway.app](https://railway.app/).
2. Chọn **New Project** ➔ **Deploy from GitHub repo**.
3. Chọn repo `dau-truong-xom-bat-on`.
4. Railway sẽ tự động đọc file `railway.json` và triển khai không cần cấu hình thêm.
5. Vào tab **Settings** ➔ **Networking** ➔ **Generate Domain** để lấy URL công khai.

---

### Cách 3: Chạy và Thử Nghiệm Trực Tiếp Tại Local
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Chạy kiểm thử tự động (138 bài test passing)
npm test

# 3. Khởi động Game Server
npm start
```
Mở trình duyệt truy cập: `http://localhost:3333`

---

## 🌟 Tính Năng Nổi Bật

- **96 Lá Bài Độc Bản Pop-Art**: Chiến Thần Cấp Thấp, Trùm Khu Phố, Huyền Thoại Dung Hợp, Đạo Cụ, Drama, Nghiệp Quật (Bẫy Úp), Ám Quẻ.
- **Authoritative Server Architecture**: Logic xử lý hoàn toàn trên máy chủ (`GameEngine.js`), phòng chống gian lận (`Anti-cheat Masking`), bảo mật lá bài trên tay.
- **WebSocket Thời Gian Thực**: Tự động chuyển đổi mượt mà giữa `ws://` (Local) và `wss://` (Cloud SSL).
- **Party Mode & Chill Mode**: Hỗ trợ chơi đông vui, biểu quyết Drama đời thực và cơ chế Hồn Ma Báo Oán khi bị loại.
- **Hệ Thống Âm Thanh & Voice Anime**: Tích hợp SFX đanh thép, tiếng còi xe, nhạc xóm trọ và lồng tiếng hô chiêu sống động.
