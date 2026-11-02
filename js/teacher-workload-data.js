/**
 * BẢNG DỮ LIỆU ĐỊNH MỨC & KIÊM NHIỆM TRƯỜNG PHỔ THÔNG DÂN TỘC BÁN TRÚ (PTDTBT)
 * Căn cứ: Điều 6 Thông tư 28/2009/TT-BGDĐT & Thông tư 15/2020/TT-BGDĐT
 * TRƯỜNG THCS BÁN TRÚ CANH THUẬN - NĂM HỌC 2026 - 2027
 * Tác giả & Chủ quản Dự án: Thầy Nguyễn Tá Quan
 * 
 * ĐẶC THÙ TRƯỜNG BÁN TRÚ: ĐỊNH MỨC CHUẨN LÀ 17 TIẾT/TUẦN (KHÔNG PHẢI 19 TIẾT)
 * Thầy Nguyễn Tá Quan: Giảng dạy 13 tiết + Chủ nhiệm lớp 8A1 (4 tiết) = Đúng 17 tiết chuẩn!
 */

export const SCHOOL_QUOTA_STANDARD = 17; // Chuẩn định mức giáo viên trường PTDTBT THCS

export const TEACHER_WORKLOAD_ROLES = {
  "Nguyễn Tá Quan": {
    roles: [
      { name: "Chủ nhiệm lớp 8A1", code: "GVCN", reduced: 4, note: "Quản lý nề nếp & sinh hoạt học sinh bán trú lớp 8A1" }
    ],
    standardQuota: 17
  },
  "Nguyễn Thanh Tuấn": {
    roles: [
      { name: "Tổ trưởng Tổ Tự Nhiên", code: "TTCM", reduced: 1, note: "Quản lý kế hoạch chuyên môn Tổ Tự Nhiên (dạy 16t + 1t = 17t)" }
    ],
    standardQuota: 17
  },
  "Lương Văn Tuấn": {
    roles: [
      { name: "Phó Hiệu trưởng / Bí thư Chi đoàn / Tổng phụ trách Đội Bán trú", code: "BGH_DOAN", reduced: 14, note: "Công tác chỉ đạo quản lý & phong trào học sinh bán trú" }
    ],
    standardQuota: 17
  },
  "Nguyễn Đình Minh": {
    roles: [
      { name: "Tổ phó chuyên môn Tổ Tự Nhiên", code: "TPCM", reduced: 1, note: "Hỗ trợ quản lý chuyên môn Toán - KHTN (dạy 16t + 1t = 17t)" }
    ],
    standardQuota: 17
  },
  "Hà Thị Thúy Hòa": {
    roles: [
      { name: "Phụ trách Phòng máy Tin học & Thiết bị số", code: "LAB_TIN", reduced: 4, note: "Bảo trì dàn máy tính, hệ thống mạng internet trường" },
      { name: "Phụ trách cổng thông tin điện tử / Thống kê EMIS", code: "EMIS", reduced: 3, note: "Khai báo dữ liệu cơ sở dữ liệu quốc gia" }
    ],
    standardQuota: 17
  },
  "Dương Thị Ngọc Lành": {
    roles: [
      { name: "Chủ nhiệm lớp 6A1", code: "GVCN", reduced: 3, note: "Quản lý học sinh đầu cấp bán trú (dạy 14t + 3t = 17t)" }
    ],
    standardQuota: 17
  },
  "Nguyễn Thị Hồng Phúc": {
    roles: [
      { name: "Chủ nhiệm lớp 8A2", code: "GVCN", reduced: 4, note: "Quản lý lớp bán trú Khối 8" },
      { name: "Phụ trách Phòng thực hành Hóa - Sinh", code: "LAB_CHEM", reduced: 1, note: "Quản lý kho hóa chất và đồ dùng KHTN" }
    ],
    standardQuota: 17
  },
  "Nguyễn Thị Hồng Duyên": {
    roles: [
      { name: "Chủ nhiệm lớp 9A2", code: "GVCN", reduced: 4, note: "Chủ nhiệm học sinh cuối cấp bán trú" },
      { name: "Phụ trách Phòng thực hành Vật lý & Thiết bị Công nghệ", code: "LAB_PHYS", reduced: 3, note: "Bảo quản mô hình, đồ dùng thực hành" }
    ],
    standardQuota: 17
  },
  "Lê Quốc Thái": {
    roles: [
      { name: "Chủ tịch Công đoàn cơ sở", code: "CONG_DOAN", reduced: 3, note: "Chăm lo đời sống công đoàn viên" },
      { name: "Phụ trách Công tác Quản lý Học sinh Bán trú & Đời sống", code: "BAN_TRU", reduced: 8, note: "Giám sát giờ ăn, nghỉ trưa, sinh hoạt nội trú" }
    ],
    standardQuota: 17
  },
  "Nguyễn Tú Tài": {
    roles: [],
    standardQuota: 17 // Dạy 17 tiết (16t Thể chất + 1t HĐTN) -> Đạt 17t chuẩn
  },
  "Võ Thị Hồng Ánh": {
    roles: [
      { name: "Phụ trách Hỗ trợ Văn phòng & Kế toán Bán trú", code: "VP_KETOAN", reduced: 13, note: "Hồ sơ tài chính ăn ở học sinh bán trú (dạy 4t + 13t = 17t)" }
    ],
    standardQuota: 17
  },
  "Nguyễn Bá Công": {
    roles: [
      { name: "Chủ nhiệm lớp 9A1", code: "GVCN", reduced: 4, note: "Chủ nhiệm học sinh lớp 9 thi tốt nghiệp THCS (dạy 13t + 4t = 17t)" }
    ],
    standardQuota: 17
  },
  "Nguyễn Bá Hiền": {
    roles: [
      { name: "Chủ nhiệm lớp 7A1", code: "GVCN", reduced: 2, note: "Quản lý nề nếp học sinh bán trú Khối 7 (dạy 15t + 2t = 17t)" }
    ],
    standardQuota: 17
  },
  "Đoàn Thị Hồ": {
    roles: [
      { name: "Chủ nhiệm lớp 6A2", code: "GVCN", reduced: 4, note: "Chủ nhiệm học sinh lớp 6 đầu cấp" },
      { name: "Trưởng ban Nữ công & Phổ cập Giáo dục", code: "NU_CONG", reduced: 3, note: "Phong trào nữ GV & hồ sơ phổ cập xã (dạy 10t + 7t = 17t)" }
    ],
    standardQuota: 17
  },
  "Phạm Thị Nhàn": {
    roles: [
      { name: "Chủ nhiệm lớp 6A3", code: "GVCN", reduced: 4, note: "Chủ nhiệm học sinh bán trú 6A3 (dạy 13t + 4t = 17t)" }
    ],
    standardQuota: 17
  },
  "Nguyễn Thị Nương": {
    roles: [],
    standardQuota: 17 // Dạy 17 tiết (16t Văn + 1t GDCD) -> Đạt 17t chuẩn
  },
  "Đoàn Văn Rích": {
    roles: [
      { name: "Phụ trách Công tác Tư vấn tâm lý học đường & Nề nếp Bán trú", code: "TU_VAN", reduced: 5, note: "Hỗ trợ học sinh dân tộc nội trú, bán trú" },
      { name: "Cố vấn Hoạt động Ngoài giờ lên lớp", code: "HIEP_HOI", reduced: 4, note: "Tổ chức hoạt động ngoại khóa, kỹ năng sống (dạy 8t + 9t = 17t)" }
    ],
    standardQuota: 17
  },
  "Lê Thị Anh Thư": {
    roles: [],
    standardQuota: 17 // Dạy 18 tiết -> Thừa 1 tiết (tính thừa giờ)
  },
  "Trần Thị Thanh Thảo": {
    roles: [
      { name: "Chủ nhiệm lớp 7A2", code: "GVCN", reduced: 4, note: "Chủ nhiệm lớp 7A2 bán trú" },
      { name: "Phụ trách Phòng Lab Ngoại ngữ & Thiết bị nghe nhìn", code: "LAB_ENG", reduced: 1, note: "Bảo dưỡng thiết bị nghe nhìn (dạy 12t + 5t = 17t)" }
    ],
    standardQuota: 17
  },
  "Trần Duy Trung": {
    roles: [],
    standardQuota: 17 // Dạy 17 tiết (15t Anh + 2t HĐTN) -> Đạt 17t chuẩn
  },
  "Thầy Tú (Công Nghệ)": {
    roles: [
      { name: "Phụ trách Vườn thực nghiệm Công nghệ nông nghiệp", code: "VUON_TN", reduced: 9, note: "Chăm sóc mô hình tưới tiêu thực hành (dạy 8t + 9t = 17t)" }
    ],
    standardQuota: 17
  }
};
