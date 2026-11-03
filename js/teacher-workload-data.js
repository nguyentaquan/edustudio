/**
 * BẢNG DỮ LIỆU ĐỊNH MỨC & KIÊM NHIỆM TRƯỜNG PHỔ THÔNG DÂN TỘC BÁN TRÚ (PTDTBT)
 * Căn cứ: Điều 6 Thông tư 28/2009/TT-BGDĐT & Thông tư 15/2020/TT-BGDĐT
 * TRƯỜNG THCS BÁN TRÚ CANH THUẬN - NĂM HỌC 2026 - 2027
 * NGUỒN VĂN BẢN GỐC: D:\TAQUAN\DU LIEU\GIAO AN\100826 DỰ KIẾN PCCM NH 26-27.xls
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
      { name: "Tổ trưởng Tổ Tự Nhiên (TTCM)", code: "TTCM", reduced: 3, note: "Quản lý kế hoạch chuyên môn Tổ Tự Nhiên" },
      { name: "Phổ cập giáo dục (PCGD)", code: "PCGD", reduced: 1, note: "Công tác PCGD" }
    ],
    standardQuota: 17
  },
  "Lương Văn Tuấn": {
    roles: [
      { name: "Hiệu trưởng / Bí thư Chi bộ", code: "BGH_BTCB", reduced: 15, note: "Công tác quản lý điều hành trường bán trú" }
    ],
    standardQuota: 17
  },
  "Nguyễn Đình Minh": {
    roles: [
      { name: "Tổ phó chuyên môn Tổ Tự Nhiên (TPCM)", code: "TPCM", reduced: 1, note: "Hỗ trợ quản lý chuyên môn Toán - KHTN" }
    ],
    standardQuota: 17
  },
  "Hà Thị Thúy Hòa": {
    roles: [
      { name: "Chủ nhiệm lớp 6A2", code: "GVCN", reduced: 4, note: "Quản lý nề nếp & sinh hoạt học sinh bán trú lớp 6A2" },
      { name: "Phụ trách CNTT & Phòng máy Tin học", code: "LAB_TIN", reduced: 3, note: "Bảo trì dàn máy tính & quản trị hệ thống" }
    ],
    standardQuota: 17
  },
  "Dương Thị Ngọc Lành": {
    roles: [
      { name: "Chủ nhiệm lớp 6A1", code: "GVCN", reduced: 4, note: "Quản lý nề nếp & sinh hoạt học sinh bán trú lớp 6A1" }
    ],
    standardQuota: 17
  },
  "Nguyễn Thị Hồng Phúc": {
    roles: [
      { name: "Chủ nhiệm lớp 7A2", code: "GVCN", reduced: 4, note: "Quản lý nề nếp & sinh hoạt học sinh bán trú lớp 7A2" }
    ],
    standardQuota: 16
  },
  "Nguyễn Thị Hồng Duyên": {
    roles: [
      { name: "Chủ nhiệm lớp 9A1", code: "GVCN", reduced: 4, note: "Chủ nhiệm học sinh lớp 9 thi tốt nghiệp THCS" },
      { name: "Phụ trách Phòng Bộ môn KHTN (Lab)", code: "LAB_KHTN", reduced: 3, note: "Quản lý hóa chất, thiết bị thực hành KHTN" }
    ],
    standardQuota: 17
  },
  "Lê Quốc Thái": {
    roles: [
      { name: "Tổng phụ trách Đội TNTP HCM", code: "TPT_DOI", reduced: 13, note: "Chỉ đạo phong trào Đội & hoạt động bán trú" }
    ],
    standardQuota: 17
  },
  "Nguyễn Tú Tài": {
    roles: [
      { name: "Phổ cập giáo dục (PCGD)", code: "PCGD", reduced: 1, note: "Công tác điều tra phổ cập GD" }
    ],
    standardQuota: 17
  },
  "Võ Thị Hồng Ánh": {
    roles: [
      { name: "Giáo viên hợp đồng", code: "GV_HD", reduced: 0, note: "Giảng dạy theo tiết hợp đồng" }
    ],
    standardQuota: 4
  },
  "Nguyễn Bá Công": {
    roles: [
      { name: "Tổ trưởng Tổ Xã Hội (TTCM)", code: "TTCM", reduced: 3, note: "Quản lý chuyên môn Tổ Xã Hội" },
      { name: "Thư ký Hội đồng", code: "TKHD", reduced: 1, note: "Ghi biên bản nghị quyết hội đồng trường" }
    ],
    standardQuota: 17
  },
  "Nguyễn Bá Hiền": {
    roles: [
      { name: "Chủ nhiệm lớp 8A2", code: "GVCN", reduced: 4, note: "Quản lý nề nếp & sinh hoạt học sinh bán trú lớp 8A2" }
    ],
    standardQuota: 17
  },
  "Đoàn Thị Hồ": {
    roles: [
      { name: "Chủ nhiệm lớp 9A2", code: "GVCN", reduced: 4, note: "Quản lý nề nếp học sinh cuối cấp bán trú lớp 9A2" }
    ],
    standardQuota: 17
  },
  "Phạm Thị Nhàn": {
    roles: [
      { name: "Chủ nhiệm lớp 6A3", code: "GVCN", reduced: 4, note: "Quản lý học sinh đầu cấp bán trú lớp 6A3" }
    ],
    standardQuota: 17
  },
  "Nguyễn Thị Nương": {
    roles: [
      { name: "Phổ cập giáo dục (PCGD)", code: "PCGD", reduced: 1, note: "Công tác phổ cập giáo dục" }
    ],
    standardQuota: 17
  },
  "Đoàn Văn Rích": {
    roles: [
      { name: "Phổ cập giáo dục (PCGD)", code: "PCGD", reduced: 1, note: "Công tác phổ cập giáo dục" }
    ],
    standardQuota: 17
  },
  "Lê Thị Anh Thư": {
    roles: [
      { name: "Phổ cập giáo dục (PCGD)", code: "PCGD", reduced: 1, note: "Công tác phổ cập giáo dục" }
    ],
    standardQuota: 17
  },
  "Trần Thị Thanh Thảo": {
    roles: [
      { name: "Chủ nhiệm lớp 7A1", code: "GVCN", reduced: 4, note: "Quản lý nề nếp & sinh hoạt học sinh bán trú lớp 7A1" },
      { name: "Tổ phó chuyên môn Tổ Xã Hội (TPCM)", code: "TPCM", reduced: 1, note: "Hỗ trợ chuyên môn Tổ Xã Hội" }
    ],
    standardQuota: 17
  },
  "Trần Duy Trung": {
    roles: [
      { name: "Phổ cập giáo dục (PCGD)", code: "PCGD", reduced: 1, note: "Công tác phổ cập giáo dục" }
    ],
    standardQuota: 17
  },
  "Thầy Tú (Công Nghệ)": {
    roles: [
      { name: "Giáo viên hợp đồng", code: "GV_HD", reduced: 0, note: "Giảng dạy Công nghệ hợp đồng" }
    ],
    standardQuota: 8
  }
};
