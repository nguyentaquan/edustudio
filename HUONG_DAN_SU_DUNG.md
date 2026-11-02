# EDUSTUDIO v2.2 - HỆ THỐNG ĐA PHƯƠNG TIỆN SƯ PHẠM MỞ
*Phiên bản: 2.2.0 Sư Phạm Toàn Diện - Tác giả & Quản trị: Thầy Nguyễn Tá Quan*

---

## 🌟 CÁC ĐIỂM NÂNG CẤP VỪA HOÀN TẤT (V2.2):

### 1. Cơ Cấu Lại Thanh Ngang Chuẩn Mực Sư Phạm:
Thứ tự các nhóm lệnh trên thanh ngang dưới Banner:
1. 🏠 **Trang Chủ**: Lối tắt nhanh, cẩm nang sư phạm và danh mục đề kiểm tra mới nhất.
2. 📊 **Kho Bài Giảng PPT**: *(Bổ sung đứng đầu tiên ngay sau Trang chủ)* Kho slide bài giảng tương tác 16:9, có thể nhúng trực tiếp trò chơi và video.
3. 🎮 **Kho Trò Chơi**: Sân khấu trò chơi Canvas Retina (Vòng quay, Hộp quà, Đua thuyền).
4. 📋 **Kho Đề**: *(Đổi từ Xưởng đề nhanh)* Tiếp nhận file Word (.docx), nhận diện ma trận đề và đáp án.
5. 🎬 **Kho Video**: *(Đổi từ Xưởng video ngắn)* Video ngắn 16:9 và 9:16, phụ đề phát sáng không hộp nền, nhép môi Lip-sync tự động.
6. 📁 **Kho Tư Liệu 5TB**: Quản lý 4 phân khu ổ `G:\My Drive\EduStudio_Data` *(chỉ hiện khi Admin Thầy Quan đăng nhập)*.

---

### 2. Cửa Sổ Thiết Kế & Tạo Trò Chơi Mới (Game Creator Studio):
* Nút lệnh nổi bật **`➕ TẠO TRÒ CHƠI MỚI`** ngay tại thanh công cụ trò chơi.
* **Đầy đủ các trường thông tin sư phạm:**
  - Tên trò chơi (VD: *Đua thuyền tri thức - Khởi động KHTN 8*).
  - Loại trò chơi: Đua thuyền tri thức / Vòng quay kỳ diệu / Hộp quà bí mật.
  - Môn học & Khối lớp.
  - Thời gian cho mỗi câu hỏi: 10s, 15s, 20s, 30s.
  - Âm thanh hiệu ứng (SFX): Bật/Tắt chuông báo, pháo hoa, nhạc vinh danh.
  - Danh sách câu hỏi động: Thêm/Xóa câu hỏi, sửa câu dẫn, sửa 4 đáp án A-B-C-D, chọn đáp án đúng, nút dán nhanh từ Word.
* **Nút Xem Trước (Live Preview):** Nhấn xem thử trực quan trò chơi vận hành ngay lập tức.
* **Nút XUẤT TRÒ CHƠI (Phân Quyền Thành Viên):**
  - **Quy tắc bảo mật:** Chỉ thành viên đã đăng nhập (hoặc Admin Thầy Quan) mới được quyền xuất file gói trò chơi độc lập về máy tính.
  - Khách chưa đăng nhập sẽ được nhắc nhở mở hộp thoại đăng nhập bằng Google.

---

### 3. Chuẩn Hóa Cơ Chế Trò Chơi "Đua Thuyền Tri Thức":
* **Màn hình chờ (Lobby):** Không tự động chạy liền; giáo viên và học sinh ổn định vị trí, bấm nút **"🚀 BẮT ĐẦU THỬ THÁCH"** thì đường đua mới xuất phát.
* **Ngắt timer an toàn:** Khi chuyển sang trang khác hoặc chuyển game, toàn bộ đồng hồ đếm ngược và tiến trình tự động dừng hẳn, xóa sạch bộ nhớ, không chạy ngầm.

---

## 🚀 KHỞI CHẠY ỨNG DỤNG (PORT 8050)
Thầy chỉ cần nhấp đúp file:
👉 `d:\TAQUAN\DU LIEU\EduStudio\start_app.bat`

Trình duyệt sẽ tự động mở trang web mới tại:
`http://localhost:8050`
