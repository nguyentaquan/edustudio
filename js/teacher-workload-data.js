/**
 * BẢNG DỮ LIỆU ĐỊNH MỨC & KIÊM NHIỆM CHUẨN THÔNG TƯ 28/2009 & TT 15/2020 BGDĐT
 * TRƯỜNG THCS BÁN TRÚ CANH THUẬN - NĂM HỌC 2026 - 2027
 * Tác giả & Chủ quản Dự án: Thầy Nguyễn Tá Quan
 * 
 * Phản ánh đúng thực tế: GV vừa giảng dạy chuyên môn, vừa kiêm nhiệm 4-5 công việc 
 * hỗ trợ nhà trường, giúp cân bằng chuẩn xác định mức 19 tiết/tuần trên vnEdu/SMAS/CSDL ngành.
 */

export const TEACHER_WORKLOAD_ROLES = {
  "Nguyễn Tá Quan": {
    roles: [
      { name: "Chủ nhiệm lớp 8A1", code: "GVCN", reduced: 4, note: "Quản lý lớp bán trú, nề nếp sinh hoạt" },
      { name: "Phụ trách CNTT & Chuyển đổi số trường", code: "CNTT", reduced: 2, note: "Quản trị EduStudio, vnEdu, CSDL ngành" }
    ],
    standardQuota: 19
  },
  "Nguyễn Thanh Tuấn": {
    roles: [
      { name: "Tổ trưởng Tổ Tự Nhiên", code: "TTCM", reduced: 3, note: "Quản lý kế hoạch chuyên môn Tổ Tự Nhiên" }
    ],
    standardQuota: 19
  },
  "Lương Văn Tuấn": {
    roles: [
      { name: "Phó Hiệu trưởng / Bí thư Chi đoàn / Tổng phụ trách Đội", code: "BGH_DOAN", reduced: 16, note: "Công tác chỉ đạo quản lý & phong trào Đội Bán trú" }
    ],
    standardQuota: 19
  },
  "Nguyễn Đình Minh": {
    roles: [
      { name: "Tổ phó chuyên môn Tổ Tự Nhiên", code: "TPCM", reduced: 1, note: "Hỗ trợ quản lý chuyên môn Toán - KHTN" },
      { name: "Phụ trách Bồi dưỡng HSG Toán", code: "BD_HSG", reduced: 2, note: "Ôn luyện đội tuyển học sinh giỏi" }
    ],
    standardQuota: 19
  },
  "Hà Thị Thúy Hòa": {
    roles: [
      { name: "Phụ trách Phòng máy Tin học & Thiết bị số", code: "LAB_TIN", reduced: 4, note: "Bảo trì dàn máy tính, hệ thống mạng internet trường" },
      { name: "Phụ trách cổng thông tin điện tử / Thống kê EMIS", code: "EMIS", reduced: 3, note: "Khai báo dữ liệu cơ sở dữ liệu quốc gia" },
      { name: "Ban thanh tra nhân dân", code: "TTND", reduced: 2, note: "Giám sát thực hiện quy chế cơ quan" }
    ],
    standardQuota: 19
  },
  "Dương Thị Ngọc Lành": {
    roles: [
      { name: "Chủ nhiệm lớp 6A1", code: "GVCN", reduced: 4, note: "Quản lý học sinh đầu cấp bán trú" },
      { name: "Phụ trách Phòng thực hành KHTN (Sinh học)", code: "LAB_BIO", reduced: 1, note: "Chuẩn bị hóa chất, dụng cụ thí nghiệm" }
    ],
    standardQuota: 19
  },
  "Nguyễn Thị Hồng Phúc": {
    roles: [
      { name: "Chủ nhiệm lớp 8A2", code: "GVCN", reduced: 4, note: "Quản lý lớp bán trú Khối 8" },
      { name: "Phụ trách Phòng thí nghiệm Hóa học", code: "LAB_CHEM", reduced: 3, note: "Quản lý kho hóa chất và đồ dùng KHTN" }
    ],
    standardQuota: 19
  },
  "Nguyễn Thị Hồng Duyên": {
    roles: [
      { name: "Chủ nhiệm lớp 9A2", code: "GVCN", reduced: 4, note: "Chủ nhiệm học sinh cuối cấp thi vào 10" },
      { name: "Phụ trách Phòng thực hành Vật lý & Thiết bị Công nghệ", code: "LAB_PHYS", reduced: 3, note: "Bảo quản mô hình, đồ dùng thực hành" },
      { name: "Ủy viên Ban Khảo thí & Kiểm tra đánh giá", code: "KHAO_THI", reduced: 2, note: "Công tác coi thi, chấm thi tập trung" }
    ],
    standardQuota: 19
  },
  "Lê Quốc Thái": {
    roles: [
      { name: "Chủ tịch Công đoàn cơ sở", code: "CONG_DOAN", reduced: 4, note: "Chăm lo đời sống công đoàn viên" },
      { name: "Phụ trách Công tác Quản lý Học sinh Bán trú & Đời sống", code: "BAN_TRU", reduced: 9, note: "Giám sát giờ ăn, nghỉ trưa, sinh hoạt nội trú" }
    ],
    standardQuota: 19
  },
  "Nguyễn Tú Tài": {
    roles: [
      { name: "Phụ trách Sân bãi Thể chất & Dụng cụ TDTT", code: "SAN_TDTT", reduced: 2, note: "Bảo quản trang thiết bị thể thao, sân bóng" }
    ],
    standardQuota: 19
  },
  "Võ Thị Hồng Ánh": {
    roles: [
      { name: "Phụ trách Hỗ trợ Văn phòng & Kế toán Bán trú", code: "VP_KETOAN", reduced: 15, note: "Hồ sơ tài chính ăn ở học sinh bán trú" }
    ],
    standardQuota: 19
  },
  "Nguyễn Bá Công": {
    roles: [
      { name: "Chủ nhiệm lớp 9A1", code: "GVCN", reduced: 4, note: "Chủ nhiệm học sinh lớp 9 thi tốt nghiệp THCS" },
      { name: "Phụ trách Thư viện / Thiết bị môn Lịch sử - Địa lí", code: "TB_SU_DIA", reduced: 2, note: "Bản đồ, tranh ảnh giáo khoa" }
    ],
    standardQuota: 19
  },
  "Nguyễn Bá Hiền": {
    roles: [
      { name: "Chủ nhiệm lớp 7A1", code: "GVCN", reduced: 4, note: "Quản lý nề nếp học sinh bán trú Khối 7" }
    ],
    standardQuota: 19
  },
  "Đoàn Thị Hồ": {
    roles: [
      { name: "Chủ nhiệm lớp 6A2", code: "GVCN", reduced: 4, note: "Chủ nhiệm học sinh lớp 6 đầu cấp" },
      { name: "Trưởng ban Nữ công Công đoàn", code: "NU_CONG", reduced: 2, note: "Phong trào nữ giáo viên" },
      { name: "Phụ trách Phổ cập Giáo dục xã Canh Thuận", code: "PHO_CAP", reduced: 3, note: "Điều tra, rà soát phổ cập THCS địa phương" }
    ],
    standardQuota: 19
  },
  "Phạm Thị Nhàn": {
    roles: [
      { name: "Chủ nhiệm lớp 6A3", code: "GVCN", reduced: 4, note: "Chủ nhiệm học sinh bán trú 6A3" },
      { name: "Thư ký Hội đồng sư phạm trường", code: "THU_KY", reduced: 2, note: "Biên bản nghị quyết các phiên họp hội đồng" }
    ],
    standardQuota: 19
  },
  "Nguyễn Thị Nương": {
    roles: [
      { name: "Tổ trưởng Tổ Xã Hội", code: "TTCM", reduced: 3, note: "Chỉ đạo kế hoạch dạy học môn Văn, Sử, Địa, Ngoại ngữ" }
    ],
    standardQuota: 19
  },
  "Đoàn Văn Rích": {
    roles: [
      { name: "Phụ trách Công tác Tư vấn tâm lý học đường & Nề nếp Bán trú", code: "TU_VAN", reduced: 6, note: "Hỗ trợ học sinh dân tộc nội trú, bán trú" },
      { name: "Cố vấn Hoạt động Ngoài giờ lên lớp", code: "HIEP_HOI", reduced: 5, note: "Tổ chức hoạt động ngoại khóa, kỹ năng sống" }
    ],
    standardQuota: 19
  },
  "Lê Thị Anh Thư": {
    roles: [
      { name: "Phụ trách Phòng Thực hành Nghệ thuật (Âm nhạc - Mĩ thuật)", code: "LAB_ART", reduced: 1, note: "Bảo quản nhạc cụ, giá vẽ, màu vẽ" }
    ],
    standardQuota: 19
  },
  "Trần Thị Thanh Thảo": {
    roles: [
      { name: "Chủ nhiệm lớp 7A2", code: "GVCN", reduced: 4, note: "Chủ nhiệm lớp 7A2 bán trú" },
      { name: "Phụ trách Phòng Lab Ngoại ngữ & Thiết bị nghe nhìn", code: "LAB_ENG", reduced: 3, note: "Bảo dưỡng loa máy, đài cassette, tai nghe" }
    ],
    standardQuota: 19
  },
  "Trần Duy Trung": {
    roles: [
      { name: "Thư ký Chi bộ Đảng nhà trường", code: "CHI_BO", reduced: 2, note: "Hồ sơ công tác Đảng, nghị quyết chi bộ" }
    ],
    standardQuota: 19
  },
  "Thầy Tú (Công Nghệ)": {
    roles: [
      { name: "Phụ trách Vườn thực nghiệm Công nghệ nông nghiệp", code: "VUON_TN", reduced: 11, note: "Chăm sóc vườn cây, mô hình tưới tiêu thực hành" }
    ],
    standardQuota: 19
  }
};
