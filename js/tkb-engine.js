import { TEACHER_WORKLOAD_ROLES } from './teacher-workload-data.js';
/**
 * ==============================================================================
 * EDUSTUDIO - XƯỞNG XẾP THỜI KHÓA BIỂU TOÀN TRƯỜNG THÔNG MINH GDPT 2018
 * THUẬT TOÁN AI CSP & ENGINE QUẢN LÝ DỮ LIỆU ĐA CHIỀU (LIVE EDITABLE)
 * ==============================================================================
 * Tác giả & Chủ quản: Thầy Nguyễn Tá Quan
 * Bản quyền: Hệ sinh thái EduStudio v3.10.32 GDMN & GDPT
 * ==============================================================================
 */

import { CANH_THUAN_TKB_DATA } from './canh-thuan-tkb-data.js?v=3.10.4';

export class SmartTKBEngine {
    constructor() {
        this.DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        this.PERIODS = [1, 2, 3, 4, 5]; // 5 tiết buổi sáng
        
        // Cấu trúc dữ liệu trường học
        this.schoolConfig = {
            schoolName: "Trường THCS Bán Trú Canh Thuận",
            academicYear: "2026 - 2027",
            semester: "Học kỳ I",
            applyFromDate: "02/11/2026",
            session: "Sáng (5 tiết/buổi)"
        };

        // Danh sách phòng học chức năng
        this.specialRooms = [
            { id: "room_tin", name: "Phòng Thực Hành Tin Học", capacity: 1, icon: "💻" },
            { id: "room_khtn", name: "Phòng Bộ Môn KHTN (Lab)", capacity: 1, icon: "🔬" },
            { id: "room_gdtc", name: "Sân Đa Năng / Thể Chất", capacity: 2, icon: "⚽" },
            { id: "room_amnhac", name: "Phòng Âm Nhạc / Mỹ Thuật", capacity: 1, icon: "🎨" }
        ];

        // Danh sách lớp học
        this.classes = ["6A1", "6A2", "6A3", "7A1", "7A2", "8A1", "8A2", "9A1", "9A2"];

        // Danh sách môn học chuẩn GDPT 2018 THCS (Bao gồm 3 môn: Lịch Sử & Địa Lí, Lịch Sử, Địa Lí)
        this.subjects = [
            { id: "toan", name: "Toán", periodsPerWeek: 4, doublePeriod: false, roomReq: null, color: "#1d4ed8" },
            { id: "van", name: "Ngữ Văn", periodsPerWeek: 4, doublePeriod: false, roomReq: null, color: "#b91c1c" },
            { id: "tienganh", name: "Tiếng Anh", periodsPerWeek: 3, doublePeriod: false, roomReq: null, color: "#047857" },
            { id: "khtn", name: "KHTN (Lý-Hóa-Sinh)", periodsPerWeek: 4, doublePeriod: true, roomReq: "room_khtn", color: "#6d28d9" },
            { id: "ls_dl", name: "Lịch Sử & Địa Lí", periodsPerWeek: 3, doublePeriod: false, roomReq: null, color: "#b45309" },
            { id: "lich_su", name: "Lịch Sử", periodsPerWeek: 2, doublePeriod: false, roomReq: null, color: "#9a3412" },
            { id: "dia_li", name: "Địa Lí", periodsPerWeek: 2, doublePeriod: false, roomReq: null, color: "#065f46" },
            { id: "hdtn", name: "HĐTN, HN", periodsPerWeek: 3, doublePeriod: false, roomReq: null, color: "#0e7490" },
            { id: "gdtc", name: "Giáo Dục Thể Chất", periodsPerWeek: 2, doublePeriod: true, roomReq: "room_gdtc", color: "#15803d" },
            { id: "tinhoc", name: "Tin Học", periodsPerWeek: 2, doublePeriod: true, roomReq: "room_tin", color: "#0369a1" },
            { id: "congnghe", name: "Công Nghệ", periodsPerWeek: 1, doublePeriod: false, roomReq: null, color: "#c2410c" },
            { id: "gdcd", name: "Giáo Dục Công Dân", periodsPerWeek: 1, doublePeriod: false, roomReq: null, color: "#4338ca" },
            { id: "amnhac", name: "Âm Nhạc", periodsPerWeek: 1, doublePeriod: false, roomReq: "room_amnhac", color: "#be185d" },
            { id: "mythuat", name: "Mĩ Thuật", periodsPerWeek: 1, doublePeriod: false, roomReq: "room_amnhac", color: "#9333ea" },
            { id: "gddp", name: "Giáo Dục Địa Phương", periodsPerWeek: 1, doublePeriod: false, roomReq: null, color: "#059669", priority: 5, periodsYear: 35, periodsSem1: 18, periodsSem2: 17 }
        ];

        // Phân công chuyên môn (PCCM)
        this.assignments = [];

        // Lịch kết quả [classId][dayIndex][periodIndex] = { subject, teacher, room, isFixed }
        this.timetable = {};
        
        // Cấu hình linh hoạt phân môn Lịch Sử - Địa Lí (Không khóa cứng 2-1 hay 1-2)
        this.lsdlConfig = {
            mode: 'custom', // 'custom' | 'parallel' | 'sem_block'
            hk1: { historyPeriods: 2, geographyPeriods: 1 },
            hk2: { historyPeriods: 1, geographyPeriods: 2 },
            hk1Weeks: 18,
            hk2Weeks: 17
        };

        // Cấu hình linh hoạt PPCT theo đơn vị Tuần (Không khóa cứng 35 tuần)
        this.ppctConfig = {
            hk1Weeks: 18,
            hk2Weeks: 17,
            totalWeeks: 35,
            weekPeriodsCustom: {} // Tùy chỉnh số tiết riêng cho từng tuần { "sub_grade": { weekNum: periods } }
        };
        // Khung Phân Phối Chương Trình & Kế Hoạch Bài Dạy Chi Tiết 35 Tuần (CV 5512)
        this.ppctLessons = {};

        // KHO LƯU TRỮ VÀ QUẢN LÝ TẤT CẢ CÁC BẢN TKB TRONG NĂM THEO THỜI ĐIỂM
        this.yearlySnapshots = {};
        this.activeSnapshotId = 'snapshot_week_9_13';

        // TÙY CHỌN RÀNG BUỘC & NGÀY NGHỈ THEO TỪNG GIÁO VIÊN CỤ THỂ (CODE RỘNG CHO PHÉP LỰA CHỌN)
        // Cấu trúc: { "Tên GV": { offDays: [0, 1...], avoidFirstPeriod: boolean, maxPeriodsPerDay: number, note: string } }
        this.teacherConstraints = {};

        // RÀNG BUỘC CỐ ĐỊNH TINH CHỈNH ĐƯỢC (KHÔNG KHÓA CỐ ĐỊNH THEO CHỈ ĐẠO CỦA THẦY QUAN)
        this.fixedConstraints = {
            lockFlagSalute: false, // Mặc định không khóa cứng chào cờ (cho phép trường tự chọn)
            flagSaluteDay: 0,      // Thứ Hai
            flagSalutePeriod: 0,   // Tiết 1
            lockClassMeeting: true, // Khóa sinh hoạt lớp cùng GVCN
            classMeetingDay: 5,     // Thứ Bảy
            classMeetingPeriod: 4,  // Tiết 5
            enableDoublePeriods: true, // Ưu tiên tiết đôi
            doublePeriodSubjects: ['Toán', 'Ngữ Văn', 'Tiếng Anh', 'Khoa học Tự nhiên', 'KHTN', 'Tin học']
        };

        // RÀNG BUỘC ƯU TIÊN SƯ PHẠM ĐẲNG CẤP (GDMN & GDPT)
        this.pedagogicalPriorities = {
            coreSubjectsGoldenPeriods: true, // Mức 1: Toán, Văn, Anh tiết vàng 1, 2, 3
            enableDoublePeriodsCore: true,   // Mức 2: Ưu tiên tiết đôi cho: Toán, Văn, Anh, KHTN
            doublePeriodSubjects: ['Toán', 'Ngữ Văn', 'Tiếng Anh', 'Khoa học Tự nhiên', 'KHTN'],
            pePeriods1to4: true,             // Mức 3: Ưu tiên GDTC từ tiết 1 đến tiết 4, tránh tiết 5
            noPEPeriod45: true,              // Tương thích ngược
            lsdlAlternating: true,           // Mức 4: So le Sử - Địa
            artsEndPeriods: true,            // Mức 5: Nghệ thuật tiết cuối buổi
            activitiesFlexible: true,        // Mức 6: Hoạt động linh hoạt
            gvcnOffDays: 2,                  // GVCN được nghỉ 1-2 buổi/tuần
            maxPeriodsPerDay: 4              // Tối đa 4 tiết/ngày/GV
        };

        // Tự động khôi phục dữ liệu TKB theo tài khoản người dùng đang đăng nhập
        this.loadState();
    }

    loadDefaultSampleData() {
        if (typeof CANH_THUAN_TKB_DATA !== 'undefined' && CANH_THUAN_TKB_DATA) {
            this.schoolConfig = JSON.parse(JSON.stringify(CANH_THUAN_TKB_DATA.schoolConfig));
            this.classes = [...CANH_THUAN_TKB_DATA.classes];
            this.teachers = CANH_THUAN_TKB_DATA.teachers || [];
            this.officialPCCM = CANH_THUAN_TKB_DATA.officialPCCM || [];
            this.assignments = JSON.parse(JSON.stringify(CANH_THUAN_TKB_DATA.assignments));
            this.timetable = JSON.parse(JSON.stringify(CANH_THUAN_TKB_DATA.timetable));
            this.initDefaultYearlySnapshots();
            this.purgeFlagSalute();
            this.saveState();
            return;
        }
        this.resetTimetableGrid();
    }

        // LOẠI BỎ TRIỆT ĐỂ TIẾT CHÀO CỜ & BỔ SUNG MÔN GIÁO DỤC ĐỊA PHƯƠNG
        // =========================================================================
    // HỆ THỐNG KHO LƯU TRỮ TẤT CẢ CÁC BẢN TKB CỦA NĂM THEO THỜI ĐIỂM (SNAPSHOTS)
    // =========================================================================

    /**
     * Khởi tạo bộ dữ liệu TKB mẫu theo các thời điểm chính trong năm học
     */
    initDefaultYearlySnapshots() {
        if (!this.yearlySnapshots) this.yearlySnapshots = {};

        const baseTimetable = this.timetable ? JSON.parse(JSON.stringify(this.timetable)) : {};
        const baseAssignments = this.assignments ? JSON.parse(JSON.stringify(this.assignments)) : [];

        // 1. TKB Giai Đoạn 2: Tuần 9 - 13 (Bản chuẩn hiện hành áp dụng từ 02/11/2026)
        if (!this.yearlySnapshots['snapshot_week_9_13']) {
            this.yearlySnapshots['snapshot_week_9_13'] = {
                id: 'snapshot_week_9_13',
                name: 'TKB Giai Đoạn 2: Tuần 9 - 13 (Từ 02/11/2026 - Chuẩn Hiện Hành)',
                shortName: 'Tuần 9 - 13',
                planType: 'WEEK_9_13',
                semester: 'Học kỳ I',
                applyFromDate: '02/11/2026',
                weekRange: 'Tuần 9 đến Tuần 13',
                savedAt: '02/11/2026',
                note: 'Bản chính thức trường THCS Bán Trú Canh Thuận',
                classes: [...this.classes],
                assignments: JSON.parse(JSON.stringify(baseAssignments)),
                timetable: JSON.parse(JSON.stringify(baseTimetable)),
                lsdlConfig: Object.assign({}, this.lsdlConfig)
            };
        }

        // 2. TKB Giai Đoạn 1: Tuần 1 - 8 (Giai đoạn đầu năm học từ 05/09/2026)
        if (!this.yearlySnapshots['snapshot_week_1_8']) {
            this.yearlySnapshots['snapshot_week_1_8'] = {
                id: 'snapshot_week_1_8',
                name: 'TKB Giai Đoạn 1: Tuần 1 - 8 (Từ Khai Giảng 05/09/2026)',
                shortName: 'Tuần 1 - 8',
                planType: 'WEEK_1_9',
                semester: 'Học kỳ I',
                applyFromDate: '05/09/2026',
                weekRange: 'Tuần 1 đến Tuần 8',
                savedAt: '05/09/2026',
                note: 'Bản TKB giai đoạn đầu năm liền kề trước',
                classes: [...this.classes],
                assignments: JSON.parse(JSON.stringify(baseAssignments)),
                timetable: JSON.parse(JSON.stringify(baseTimetable)),
                lsdlConfig: Object.assign({}, this.lsdlConfig)
            };
        }

        // 3. TKB Giai Đoạn 3: Tuần 14 - 18 (Sau Giữa Kỳ I - Từ 07/12/2026)
        if (!this.yearlySnapshots['snapshot_week_14_18']) {
            this.yearlySnapshots['snapshot_week_14_18'] = {
                id: 'snapshot_week_14_18',
                name: 'TKB Giai Đoạn 3: Tuần 14 - 18 (Sau Giữa Kỳ I - Từ 07/12/2026)',
                shortName: 'Tuần 14 - 18',
                planType: 'WEEK_10_18',
                semester: 'Học kỳ I',
                applyFromDate: '07/12/2026',
                weekRange: 'Tuần 14 đến Tuần 18',
                savedAt: '07/12/2026',
                note: 'Bản TKB tăng cường ôn tập cuối Học kỳ I',
                classes: [...this.classes],
                assignments: JSON.parse(JSON.stringify(baseAssignments)),
                timetable: JSON.parse(JSON.stringify(baseTimetable)),
                lsdlConfig: Object.assign({}, this.lsdlConfig)
            };
        }

        // 4. TKB Học Kỳ II: Tuần 19 - 35 (Từ 11/01/2027 - Hoán đổi Lịch sử 1t / Địa lí 2t)
        if (!this.yearlySnapshots['snapshot_hk2_full']) {
            // Tự động sinh TKB Học kỳ II nếu có phương thức
            let sem2Timetable = JSON.parse(JSON.stringify(baseTimetable));
            try {
                if (typeof this.generateSemester2Timetable === 'function') {
                    sem2Timetable = this.generateSemester2Timetable();
                }
            } catch(e) {}

            this.yearlySnapshots['snapshot_hk2_full'] = {
                id: 'snapshot_hk2_full',
                name: 'TKB Học Kỳ II: Tuần 19 - 35 (Từ 11/01/2027 - Sử 1t / Địa 2t)',
                shortName: 'Học Kỳ II (19-35)',
                planType: 'HK2',
                semester: 'Học kỳ II',
                applyFromDate: '11/01/2027',
                weekRange: 'Tuần 19 đến Tuần 35',
                savedAt: '11/01/2027',
                note: 'Bản TKB Học kỳ II hoán đổi Lịch sử 1t / Địa lí 2t chuẩn CV 1496/BGDĐT',
                classes: [...this.classes],
                assignments: JSON.parse(JSON.stringify(baseAssignments)),
                timetable: sem2Timetable,
                lsdlConfig: Object.assign({}, this.lsdlConfig, { hk2: { historyPeriods: 1, geographyPeriods: 2 } })
            };
        }
    }

    /**
     * Lưu trạng thái TKB hiện tại thành một bản thời điểm mới
     */
    saveCurrentAsSnapshot(name, weekRange = '', note = '') {
        if (!this.yearlySnapshots) this.yearlySnapshots = {};

        const id = 'snapshot_' + Date.now();
        const autoName = name && name.trim() ? name.trim() : (`TKB Thời Điểm ${new Date().toLocaleDateString('vi-VN')}`);
        const currentPlan = (this.schoolConfig && this.schoolConfig.schedulePlanType) || 'WEEK_9_13';
        const currentRange = weekRange || (this.schoolConfig && this.schoolConfig.applyWeekRange) || 'Tuần hiện hành';

        this.yearlySnapshots[id] = {
            id: id,
            name: autoName,
            shortName: autoName.slice(0, 20),
            planType: currentPlan,
            semester: (this.schoolConfig && this.schoolConfig.semester) || 'Học kỳ I',
            applyFromDate: (this.schoolConfig && this.schoolConfig.applyFromDate) || new Date().toLocaleDateString('vi-VN'),
            weekRange: currentRange,
            savedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            note: note || 'Bản lưu cá nhân của Thầy Cô',
            classes: [...this.classes],
            assignments: JSON.parse(JSON.stringify(this.assignments || [])),
            timetable: JSON.parse(JSON.stringify(this.timetable || {})),
            lsdlConfig: Object.assign({}, this.lsdlConfig || {})
        };

        this.activeSnapshotId = id;
        this.saveState();
        return { success: true, snapshot: this.yearlySnapshots[id] };
    }

    /**
     * Kích hoạt / Nạp lại TKB của một thời điểm bất kỳ
     */
    applySnapshot(snapshotId) {
        if (!this.yearlySnapshots || !this.yearlySnapshots[snapshotId]) {
            return { success: false, reason: "Không tìm thấy bản TKB thời điểm này" };
        }

        const snap = this.yearlySnapshots[snapshotId];
        this.timetable = JSON.parse(JSON.stringify(snap.timetable || {}));
        if (snap.assignments && snap.assignments.length > 0) {
            this.assignments = JSON.parse(JSON.stringify(snap.assignments));
        }
        if (snap.classes && snap.classes.length > 0) {
            this.classes = [...snap.classes];
        }
        if (snap.lsdlConfig) {
            this.lsdlConfig = Object.assign({}, snap.lsdlConfig);
        }
        if (!this.schoolConfig) this.schoolConfig = {};
        if (snap.planType) this.schoolConfig.schedulePlanType = snap.planType;
        if (snap.weekRange) this.schoolConfig.applyWeekRange = snap.weekRange;
        if (snap.semester) this.schoolConfig.semester = snap.semester;
        if (snap.applyFromDate) this.schoolConfig.applyFromDate = snap.applyFromDate;

        this.activeSnapshotId = snapshotId;
        this.purgeFlagSalute();
        this.saveState();

        return { success: true, snapshot: snap };
    }

    /**
     * Xóa một bản TKB khỏi kho
     */
    deleteSnapshot(snapshotId) {
        if (!this.yearlySnapshots || !this.yearlySnapshots[snapshotId]) return false;
        delete this.yearlySnapshots[snapshotId];
        if (this.activeSnapshotId === snapshotId) {
            const keys = Object.keys(this.yearlySnapshots);
            this.activeSnapshotId = keys.length > 0 ? keys[0] : null;
        }
        this.saveState();
        return true;
    }

    /**
     * Lấy danh sách tất cả các bản TKB của năm
     */
    getYearlySnapshotsList() {
        if (!this.yearlySnapshots || Object.keys(this.yearlySnapshots).length === 0) {
            this.initDefaultYearlySnapshots();
        }
        const list = Object.values(this.yearlySnapshots);

        // Hàm phân tích ngày định dạng DD/MM/YYYY
        const parseD = (s) => {
            if (!s) return 0;
            const parts = s.split('/');
            if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
            const t = new Date(s).getTime();
            return isNaN(t) ? 0 : t;
        };

        // Sắp xếp các bản TKB theo thứ tự ngày áp dụng tăng dần
        list.sort((a, b) => parseD(a.applyFromDate) - parseD(b.applyFromDate));

        // Tự động gán nhãn khoảng thời gian: Từ ngày D_i đến ngày D_{i+1}
        // (Ngày sau là ngày Áp dụng của TKB mới liền kề theo đúng chỉ đạo của Thầy Quan)
        for (let i = 0; i < list.length; i++) {
            const start = list[i].applyFromDate || '02/11/2026';
            if (i + 1 < list.length && list[i + 1].applyFromDate) {
                const nextDate = list[i + 1].applyFromDate;
                list[i].dateRangeLabel = `Từ ngày ${start} đến ngày ${nextDate}`;
            } else {
                list[i].dateRangeLabel = `Từ ngày ${start} đến nay`;
            }
            list[i].isActive = (list[i].id === this.activeSnapshotId);
        }

        return list;
    }

    purgeFlagSalute() {
        if (!this.timetable) return;
        for (const classId in this.timetable) {
            const classSchedule = this.timetable[classId];
            if (!Array.isArray(classSchedule)) continue;
            for (let d = 0; d < classSchedule.length; d++) {
                if (!Array.isArray(classSchedule[d])) continue;
                for (let p = 0; p < classSchedule[d].length; p++) {
                    const slot = classSchedule[d][p];
                    if (slot && (slot.subject === 'Chào Cờ' || slot.subject === 'Chào cờ' || slot.subject === 'SHDC')) {
                        classSchedule[d][p] = null;
                    }
                }
            }
        }
        // Đảm bảo môn Giáo Dục Địa Phương luôn có mặt trong danh sách subjects
        if (!this.subjects.some(s => s.name === 'Giáo Dục Địa Phương' || s.id === 'gddp' || s.name === 'Giáo dục địa phương')) {
            this.subjects.push({ id: "gddp", name: "Giáo Dục Địa Phương", periodsPerWeek: 1, doublePeriod: false, roomReq: null, color: "#059669", priority: 5, periodsYear: 35, periodsSem1: 18, periodsSem2: 17 });
        }

        // Bổ sung phân công môn Giáo Dục Địa Phương nếu chưa có
        if (Array.isArray(this.assignments) && this.classes && this.classes.length > 0) {
            const hasGDDP = this.assignments.some(a => (a.subject && (a.subject.includes('Địa Phương') || a.subject.includes('GDĐP') || a.subject.includes('GDDP'))));
            if (!hasGDDP) {
                for (const c of this.classes) {
                    const teacherName = (c.startsWith('6')) ? 'Phạm Thị Nhàn' : 'Lê Thị Anh Thư';
                    const shortTeacher = (c.startsWith('6')) ? 'Cô Nhàn' : 'Cô Thư';
                    this.assignments.push({
                        class: c,
                        subject: "Giáo Dục Địa Phương",
                        teacher: teacherName,
                        shortTeacher: shortTeacher,
                        periodsPerWeek: 1,
                        doublePeriod: false,
                        roomReq: null,
                        priority: 5
                    });
                }
            }
        }
    }

    resetTimetableGrid() {
        this.timetable = {};
        for (const classId of this.classes) {
            this.timetable[classId] = [];
            for (let d = 0; d < this.DAYS.length; d++) {
                this.timetable[classId][d] = [];
                for (let p = 0; p < this.PERIODS.length; p++) {
                    // BỎ TIẾT CHÀO CỜ: Tiết 1 sáng Thứ Hai (d=0, p=0) giải phóng thành tiết học bình thường, mở cho tất cả môn học
                    if (d === 5 && p === 4) {
                        this.timetable[classId][d][p] = {
                            subject: "Sinh Hoạt Lớp",
                            teacher: "GVCN",
                            room: null,
                            isFixed: true,
                            color: "#059669"
                        };
                    } else {
                        this.timetable[classId][d][p] = null;
                    }
                }
            }
        }
    }

    setSlot(classId, day, period, data) {
        if (!this.timetable[classId]) return { success: false, reason: "Lớp không tồn tại" };
        
        if (!data) {
            this.timetable[classId][day][period] = null;
            return { success: true };
        }

        const slotObj = {
            subject: data.subject,
            teacher: data.teacher,
            room: data.room || null,
            isDouble: !!data.isDouble,
            isFixed: !!data.isFixed,
            color: this.getSubjectColor(data.subject)
        };

        const oldCell = this.timetable[classId][day][period];
        this.timetable[classId][day][period] = slotObj;

        const conflicts = this.detectConflicts();
        if (conflicts.length > 0) {
            this.timetable[classId][day][period] = oldCell;
            return { 
                success: false, 
                reason: conflicts[0].message,
                conflicts: conflicts
            };
        }

        return { success: true };
    }

    addAssignment(assign) {
        this.assignments.push(assign);
    }

    updateAssignment(index, assign) {
        if (this.assignments[index]) {
            this.assignments[index] = assign;
        }
    }

    deleteAssignment(index) {
        if (this.assignments[index]) {
            this.assignments.splice(index, 1);
        }
    }

    addClass(className) {
        const clean = className.trim().toUpperCase();
        if (clean && !this.classes.includes(clean)) {
            this.classes.push(clean);
            this.classes.sort();
            this.resetTimetableGrid();
            return true;
        }
        return false;
    }

    removeClass(className) {
        const idx = this.classes.indexOf(className);
        if (idx !== -1) {
            this.classes.splice(idx, 1);
            delete this.timetable[className];
            this.assignments = this.assignments.filter(a => a.classId !== className);
            return true;
        }
        return false;
    }

    solveAutomatic() {
        const startTime = performance.now();
        this.resetTimetableGrid();

        let lessonsPool = [];

        // Bản đồ mức ưu tiên sư phạm từ danh mục môn học (Mức 1 đến 6)
        const subPriorityMap = {};
        (this.subjects || []).forEach(s => {
            subPriorityMap[s.name] = s.priority || 1;
            if (s.id) subPriorityMap[s.id] = s.priority || 1;
        });

        for (const assign of this.assignments) {
            let remainingPeriods = assign.periods;
            const subPrio = subPriorityMap[assign.subject] || (assign.roomReq ? 2 : 4);

            // Điểm ưu tiên xếp lịch: Mức 1 (Toán, Văn, Anh) -> 35 điểm; Mức 2 (Lab) -> 30 điểm...
            const basePrioScore = Math.max(10, 40 - (subPrio * 5));
            
            if (assign.doublePeriod && remainingPeriods >= 2) {
                lessonsPool.push({
                    assignId: `${assign.teacher}_${assign.subject}_${assign.classId}_double`,
                    teacher: assign.teacher,
                    subject: assign.subject,
                    classId: assign.classId,
                    roomReq: assign.roomReq,
                    length: 2,
                    pedagogicalPriority: subPrio,
                    priority: basePrioScore + 18 // Tiết kép luôn ưu tiên xếp trước để tìm được 2 tiết trống liền nhau
                });
                remainingPeriods -= 2;
            }

            while (remainingPeriods > 0) {
                lessonsPool.push({
                    assignId: `${assign.teacher}_${assign.subject}_${assign.classId}_single_${remainingPeriods}`,
                    teacher: assign.teacher,
                    subject: assign.subject,
                    classId: assign.classId,
                    roomReq: assign.roomReq,
                    length: 1,
                    pedagogicalPriority: subPrio,
                    priority: basePrioScore + (assign.roomReq ? 6 : 0) + (remainingPeriods >= 3 ? 3 : 0)
                });
                remainingPeriods -= 1;
            }
        }

        // Sắp xếp bài học theo thứ tự ưu tiên sư phạm đỉnh cao
        lessonsPool.sort((a, b) => b.priority - a.priority);

        let unassignedLessons = [];

        for (const lesson of lessonsPool) {
            const placed = this.findAndPlaceSlot(lesson);
            if (!placed) {
                unassignedLessons.push(lesson);
            }
        }

        const endTime = performance.now();
        const executionMs = Math.round(endTime - startTime);

        return {
            success: unassignedLessons.length === 0,
            executionMs: executionMs,
            totalLessons: lessonsPool.length,
            assignedCount: lessonsPool.length - unassignedLessons.length,
            unassignedCount: unassignedLessons.length,
            unassignedLessons: unassignedLessons
        };
    }

    findAndPlaceSlot(lesson) {
        const classId = lesson.classId;
        const length = lesson.length;
        const prio = lesson.pedagogicalPriority || 1;

        let candidateSlots = [];

        for (let d = 0; d < this.DAYS.length; d++) {
            for (let p = 0; p <= this.PERIODS.length - length; p++) {
                let slotEmpty = true;
                for (let k = 0; k < length; k++) {
                    if (this.timetable[classId][d][p + k] !== null) {
                        slotEmpty = false;
                        break;
                    }
                }
                if (!slotEmpty) continue;

                let teacherConflict = false;
                for (let k = 0; k < length; k++) {
                    if (this.isTeacherBusy(lesson.teacher, d, p + k)) {
                        teacherConflict = true;
                        break;
                    }
                }
                if (teacherConflict) continue;

                if (lesson.roomReq) {
                    let roomConflict = false;
                    for (let k = 0; k < length; k++) {
                        if (this.isRoomFull(lesson.roomReq, d, p + k)) {
                            roomConflict = true;
                            break;
                        }
                    }
                    if (roomConflict) continue;
                }

                const subjectCountInDay = this.countSubjectInDay(classId, lesson.subject, d);
                if (subjectCountInDay > 0 && length === 1 && subjectCountInDay >= 2) {
                    continue;
                }

                // KIỂM TRA RÀNG BUỘC CỐ ĐỊNH TINH CHỈNH (KHÔNG KHÓA CỨNG THEO CHỈ ĐẠO CỦA THẦY QUAN)
                if (this.fixedConstraints) {
                    if (this.fixedConstraints.lockFlagSalute) {
                        const fd = (this.fixedConstraints.flagSaluteDay !== undefined) ? parseInt(this.fixedConstraints.flagSaluteDay) : 0;
                        const fp = (this.fixedConstraints.flagSalutePeriod !== undefined) ? parseInt(this.fixedConstraints.flagSalutePeriod) : 0;
                        let hitFlag = false;
                        for (let k = 0; k < length; k++) {
                            if (d === fd && (p + k) === fp && lesson.subject !== 'Chào Cờ') {
                                hitFlag = true; break;
                            }
                        }
                        if (hitFlag) continue;
                    }
                    if (this.fixedConstraints.lockClassMeeting) {
                        const md = (this.fixedConstraints.classMeetingDay !== undefined) ? parseInt(this.fixedConstraints.classMeetingDay) : 5;
                        const mp = (this.fixedConstraints.classMeetingPeriod !== undefined) ? parseInt(this.fixedConstraints.classMeetingPeriod) : 4;
                        let hitMeeting = false;
                        for (let k = 0; k < length; k++) {
                            if (d === md && (p + k) === mp && !lesson.subject.includes('Sinh hoạt') && !lesson.subject.includes('SHL')) {
                                hitMeeting = true; break;
                            }
                        }
                        if (hitMeeting) continue;
                    }
                }

                // =========================================================================
                // CHẤM ĐIỂM SƯ PHẠM ĐẲNG CẤP (PEDAGOGICAL SCORING ENGINE)
                // =========================================================================
                let score = 100;

                // 1. Dàn đều môn trong tuần (tránh dồn ép học sinh)
                if (subjectCountInDay > 0) score -= 45;

                // 2. MỨC 1: CỐT LÕI (Toán, Ngữ Văn, Tiếng Anh) -> ƯU TIÊN TIẾT 1, 2, 3 SÁNG SỚM
                if (prio === 1 || lesson.subject === "Toán" || lesson.subject === "Ngữ Văn" || lesson.subject === "Tiếng Anh") {
                    if (p === 0 || p === 1 || p === 2) {
                        score += 60; // Tiết vàng tư duy cao khi học sinh tập trung nhất
                    } else if (p === 4) {
                        score -= 55; // Tuyệt đối tránh tiết 5 cuối buổi mệt mỏi
                    }
                }

                // 3. MỨC 2: TIẾT ĐÔI CHO MÔN: TOÁN, VĂN, ANH, KHTN (THEO CHỈ ĐẠO CỦA THẦY QUAN)
                const isDoubleCandidate = ['toán', 'toan', 'ngữ văn', 'ngu van', 'tiếng anh', 'tieng anh', 'khtn', 'khoa học tự nhiên', 'tin học'].some(s => (lesson.subject || '').toLowerCase().includes(s));
                if (prio === 2 || isDoubleCandidate || lesson.roomReq) {
                    if (length === 2) {
                        if (p === 0 || p === 1 || p === 2) score += 55; // Tiết đôi buổi sáng lý tưởng
                        else if (p >= 3) score -= 45;
                    }
                }

                // 4. MỨC 3: THỂ CHẤT (GDTC) -> ƯU TIÊN TỪ TIẾT 1 ĐẾN TIẾT 4, TRÁNH TIẾT 5 (THEO CHỈ ĐẠO THẦY QUAN)
                if (prio === 3 || (lesson.subject && (lesson.subject === "Giáo Dục Thể Chất" || lesson.subject === "GDTC" || lesson.subject.includes("Thể dục")))) {
                    if (p === 4) {
                        score -= 280; // Tránh tiết 5 cuối buổi nắng gắt mệt mỏi
                    } else if (p >= 0 && p <= 3) {
                        score += 65; // Ưu tiên từ Tiết 1 đến Tiết 4 sáng
                    }
                }

                // 5. MỨC 4: PHÂN MÔN GHÉP (Lịch Sử & Địa Lí) -> SO LE NGÀY NHỊP NHÀNG
                if (prio === 4 || lesson.subject.includes("Lịch Sử") || lesson.subject.includes("Địa Lí")) {
                    const otherSub = lesson.subject.includes("Sử") ? "Địa Lí" : "Lịch Sử";
                    if (this.countSubjectInDay(classId, otherSub, d) > 0) {
                        score -= 40; // Giãn cách 2 phân môn sang các ngày khác nhau
                    }
                }

                // 6. MỨC 5: NGHỆ THUẬT / GIẢM ÁP LỰC (Âm Nhạc, Mĩ Thuật, GDCD)
                if (prio === 5 || lesson.subject === "Âm Nhạc" || lesson.subject === "Mĩ Thuật" || lesson.subject === "Giáo Dục Công Dân") {
                    if (p === 2 || p === 3) score += 35; // Xếp giữa buổi để xả stress, cân bằng bán cầu não
                }

                // 7. Ưu tiên giáo viên liền tiết (tránh tiết trống lắt nhắt)
                if (this.isTeacherAdjacent(lesson.teacher, d, p, length)) {
                    score += 35;
                }

                candidateSlots.push({ day: d, period: p, score: score });
            }
        }

        if (candidateSlots.length === 0) return false;

        candidateSlots.sort((a, b) => b.score - a.score);
        const bestSlot = candidateSlots[0];
        const subColor = this.getSubjectColor(lesson.subject);

        for (let k = 0; k < length; k++) {
            this.timetable[classId][bestSlot.day][bestSlot.period + k] = {
                subject: lesson.subject,
                teacher: lesson.teacher,
                room: lesson.roomReq,
                isFixed: false,
                isDouble: length === 2,
                color: subColor
            };
        }

        return true;
    }

    // =========================================================================
    // HỆ THỐNG TÙY CHỈNH NGÀY NGHỈ & RÀNG BUỘC CHO TỪNG GIÁO VIÊN CỤ THỂ
    // =========================================================================

    /**
     * Đếm số tiết dạy thực tế của một giáo viên trong ngày
     */
    countTeacherPeriodsInDay(teacherName, day) {
        if (!teacherName || !this.timetable) return 0;
        const cleanName = teacherName.replace(/^(Thầy|Cô)\s+/i, '').trim();
        let count = 0;
        for (const c of this.classes) {
            if (!this.timetable[c] || !this.timetable[c][day]) continue;
            for (let p = 0; p < this.timetable[c][day].length; p++) {
                const cell = this.timetable[c][day][p];
                if (cell && (cell.teacher === teacherName || cell.shortTeacher === teacherName || cell.teacher === cleanName)) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Kiểm tra xem giáo viên có đăng ký nghỉ ngày này hay không
     */
    isTeacherOff(teacherName, day) {
        if (!teacherName) return false;
        const cleanName = teacherName.replace(/^(Thầy|Cô)\s+/i, '').trim();
        const tc = this.teacherConstraints[teacherName] || this.teacherConstraints[cleanName];
        if (tc && Array.isArray(tc.offDays) && tc.offDays.includes(day)) {
            return true;
        }
        const tObj = (this.teachers || []).find(t => t.fullName === teacherName || t.displayName === teacherName || t.shortName === teacherName || t.fullName === cleanName);
        if (tObj && Array.isArray(tObj.offDays) && tObj.offDays.includes(day)) {
            return true;
        }
        return false;
    }

    /**
     * Kiểm tra xem giáo viên có đăng ký tránh tiết 1 sáng hay không
     */
    isTeacherAvoidFirstPeriod(teacherName) {
        if (!teacherName) return false;
        const cleanName = teacherName.replace(/^(Thầy|Cô)\s+/i, '').trim();
        const tc = this.teacherConstraints[teacherName] || this.teacherConstraints[cleanName];
        return !!(tc && tc.avoidFirstPeriod);
    }

    /**
     * Lấy cấu hình ràng buộc của một giáo viên
     */
    getTeacherConstraints(teacherName) {
        if (!teacherName) return { offDays: [], avoidFirstPeriod: false, maxPeriodsPerDay: 4 };
        const cleanName = teacherName.replace(/^(Thầy|Cô)\s+/i, '').trim();
        return this.teacherConstraints[teacherName] || this.teacherConstraints[cleanName] || {
            offDays: [],
            avoidFirstPeriod: false,
            maxPeriodsPerDay: 4
        };
    }

    /**
     * Thiết lập ngày nghỉ cho một giáo viên (Thứ 2=0, Thứ 3=1, Thứ 4=2, Thứ 5=3, Thứ 6=4, Thứ 7=5)
     */
    setTeacherOffDay(teacherName, day, isOff) {
        if (!teacherName) return;
        const cleanName = teacherName.replace(/^(Thầy|Cô)\s+/i, '').trim();
        if (!this.teacherConstraints[teacherName]) {
            this.teacherConstraints[teacherName] = { offDays: [], avoidFirstPeriod: false, maxPeriodsPerDay: 4 };
        }
        const tc = this.teacherConstraints[teacherName];
        if (!Array.isArray(tc.offDays)) tc.offDays = [];

        if (isOff) {
            if (!tc.offDays.includes(day)) tc.offDays.push(day);
        } else {
            tc.offDays = tc.offDays.filter(d => d !== day);
        }
        this.teacherConstraints[cleanName] = Object.assign({}, tc);
        this.saveState();
    }

    /**
     * Cập nhật toàn bộ ràng buộc của giáo viên
     */
    updateTeacherConstraints(teacherName, newConstraints) {
        if (!teacherName) return;
        const cleanName = teacherName.replace(/^(Thầy|Cô)\s+/i, '').trim();
        this.teacherConstraints[teacherName] = Object.assign({}, newConstraints);
        this.teacherConstraints[cleanName] = Object.assign({}, newConstraints);
        this.saveState();
    }

    /**
     * KIỂM TRA GIÁO VIÊN CÓ BẬN TIẾT NÀY KHÔNG (TUÂN THỦ 100% NGÀY NGHỈ TÙY CHỌN)
     */
    isTeacherBusy(teacherName, day, period) {
        // 1. RÀNG BUỘC TỐI CAO: NẾU GIÁO VIÊN ĐÃ ĐƯỢC CHỌN CHO NGHỈ NGÀY NÀY THÌ TUYỆT ĐỐI BẬN 100%!
        if (this.isTeacherOff(teacherName, day)) {
            return true;
        }

        // 2. Tránh tiết 1 sáng cho giáo viên đăng ký
        if (period === 0 && this.isTeacherAvoidFirstPeriod(teacherName)) {
            return true;
        }

        // 3. Giới hạn số tiết tối đa trong ngày
        const tc = this.getTeacherConstraints(teacherName);
        const maxDaily = tc.maxPeriodsPerDay || 4;
        if (this.countTeacherPeriodsInDay(teacherName, day) >= maxDaily) {
            return true;
        }

        // 4. Trùng tiết với lớp khác
        const cleanName = teacherName.replace(/^(Thầy|Cô)\s+/i, '').trim();
        for (const c of this.classes) {
            const cell = this.timetable[c][day][period];
            if (cell && (cell.teacher === teacherName || cell.shortTeacher === teacherName || cell.teacher === cleanName)) {
                return true;
            }
        }
        return false;
    }

    isTeacherAdjacent(teacherName, day, period, length) {
        const prev = period - 1;
        const next = period + length;
        if (prev >= 0 && this.isTeacherBusy(teacherName, day, prev)) return true;
        if (next < this.PERIODS.length && this.isTeacherBusy(teacherName, day, next)) return true;
        return false;
    }

    isRoomFull(roomId, day, period) {
        const roomDef = this.specialRooms.find(r => r.id === roomId);
        const maxCapacity = roomDef ? roomDef.capacity : 1;
        let count = 0;

        for (const c of this.classes) {
            const cell = this.timetable[c][day][period];
            if (cell && cell.room === roomId) count++;
        }
        return count >= maxCapacity;
    }

    countSubjectInDay(classId, subjectName, day) {
        let count = 0;
        for (let p = 0; p < this.PERIODS.length; p++) {
            const cell = this.timetable[classId][day][p];
            if (cell && cell.subject === subjectName) count++;
        }
        return count;
    }

    getSubjectColor(subjectName) {
        if (!subjectName) return "#1d4ed8";
        const trimmed = subjectName.trim().toLowerCase();
        // 1. Khớp chính xác tên môn trước tiên
        const exact = this.subjects.find(s => s.name.toLowerCase() === trimmed);
        if (exact) return exact.color;
        // 2. Phân biệt rõ rệt 3 môn: Lịch Sử & Địa Lí, Lịch Sử, Địa Lí
        if (trimmed.includes('lịch sử') && (trimmed.includes('địa lí') || trimmed.includes('địa lý'))) return "#b45309";
        if (trimmed.includes('lịch sử')) return "#9a3412";
        if (trimmed.includes('địa lí') || trimmed.includes('địa lý')) return "#065f46";
        // 3. Khớp tiền tố thông thường
        const sub = this.subjects.find(s => trimmed.startsWith(s.name.toLowerCase()));
        return sub ? sub.color : "#1d4ed8";
    }

    /**
     * LẤY TOÀN BỘ DANH SÁCH GIÁO VIÊN TỪ KHAI BÁO PHÂN CÔNG CHUYÊN MÔN (PCCM)
     * Đồng bộ đa nguồn từ: officialPCCM, teachers, assignments, schoolConfig.homeroomTeachers
     * và tự động liên thông nạp từ CANH_THUAN_TKB_DATA nếu dữ liệu hiện hành bị thiếu.
     */
    getPCCMTeachers(forceSampleFallback = false) {
        const teacherMap = new Map();

        // 1. Quét từ officialPCCM (Bản Phân công chuyên môn chính thức)
        if (Array.isArray(this.officialPCCM) && this.officialPCCM.length > 0) {
            this.officialPCCM.forEach(t => {
                const rawName = t['Họ và tên'] || t.fullName || t.name || '';
                if (!rawName) return;
                const clean = rawName.replace(/^(Thầy|Cô)\s+/i, '').trim();
                const dept = t['Tổ bộ môn'] || t.department || '';
                const pc1 = t['Phân công HK I'] || '';
                const pc2 = t['Phân công HK II'] || '';
                const pc = pc1 || pc2 || '';
                teacherMap.set(clean, {
                    name: rawName,
                    cleanName: clean,
                    displayName: rawName,
                    shortName: t.shortName || '',
                    department: dept,
                    homeroom: t.homeroom || '',
                    subjects: pc ? pc.split('\n').join(' • ') : (t.subjects || ''),
                    pccmSummary: pc ? pc.split('\n').join(' • ') : ''
                });
            });
        }

        // 2. Quét từ teachers (Danh sách GV khai báo trong cấu hình trường)
        if (Array.isArray(this.teachers) && this.teachers.length > 0) {
            this.teachers.forEach(t => {
                const rawName = typeof t === 'string' ? t : (t.fullName || t.name || t.displayName || '');
                if (!rawName) return;
                const clean = rawName.replace(/^(Thầy|Cô)\s+/i, '').trim();
                const existing = teacherMap.get(clean) || {};
                const subs = Array.isArray(t.subjects) ? t.subjects.join(', ') : (t.subjects || t.subject || '');
                teacherMap.set(clean, {
                    name: existing.name || t.fullName || rawName,
                    cleanName: clean,
                    displayName: t.displayName || existing.displayName || rawName,
                    shortName: t.shortName || existing.shortName || '',
                    department: t.department || existing.department || '',
                    homeroom: t.homeroom || existing.homeroom || '',
                    subjects: existing.subjects || subs,
                    pccmSummary: existing.pccmSummary || subs
                });
            });
        }

        // 3. Quét từ assignments (Phân công chi tiết từng môn - từng lớp)
        if (Array.isArray(this.assignments) && this.assignments.length > 0) {
            this.assignments.forEach(a => {
                if (!a.teacher) return;
                const clean = a.teacher.replace(/^(Thầy|Cô)\s+/i, '').trim();
                const existing = teacherMap.get(clean) || {};
                const subjectStr = a.subject ? `${a.subject} (${a.classId || a.class || ''})` : '';
                let newSubs = existing.subjects || '';
                if (subjectStr && !newSubs.includes(a.subject)) {
                    newSubs = newSubs ? `${newSubs}, ${a.subject}` : a.subject;
                }
                teacherMap.set(clean, {
                    name: existing.name || a.teacher,
                    cleanName: clean,
                    displayName: existing.displayName || a.teacher,
                    shortName: existing.shortName || a.shortTeacher || '',
                    department: existing.department || a.department || '',
                    homeroom: existing.homeroom || '',
                    subjects: newSubs,
                    pccmSummary: existing.pccmSummary || newSubs
                });
            });
        }

        // 4. Bổ sung giáo viên chủ nhiệm từ schoolConfig.homeroomTeachers nếu có
        if (this.schoolConfig && this.schoolConfig.homeroomTeachers) {
            for (const [cls, teacherName] of Object.entries(this.schoolConfig.homeroomTeachers)) {
                if (!teacherName) continue;
                const clean = teacherName.replace(/^(Thầy|Cô)\s+/i, '').trim();
                if (teacherMap.has(clean)) {
                    const obj = teacherMap.get(clean);
                    if (!obj.homeroom) obj.homeroom = cls;
                } else {
                    teacherMap.set(clean, {
                        name: teacherName,
                        cleanName: clean,
                        displayName: teacherName,
                        shortName: '',
                        department: '',
                        homeroom: cls,
                        subjects: 'Chủ nhiệm ' + cls,
                        pccmSummary: 'Chủ nhiệm ' + cls
                    });
                }
            }
        }

        // 5. NẾU VẪN < 5 GIÁO VIÊN hoặc forceSampleFallback: Tự động khôi phục từ nguồn chuẩn CANH_THUAN_TKB_DATA
        if ((teacherMap.size < 5 || forceSampleFallback) && typeof CANH_THUAN_TKB_DATA !== 'undefined' && CANH_THUAN_TKB_DATA) {
            if (Array.isArray(CANH_THUAN_TKB_DATA.officialPCCM)) {
                CANH_THUAN_TKB_DATA.officialPCCM.forEach(t => {
                    const rawName = t['Họ và tên'];
                    if (!rawName) return;
                    const clean = rawName.replace(/^(Thầy|Cô)\s+/i, '').trim();
                    const pc = (t['Phân công HK I'] || '').split('\n').join(' • ');
                    const existing = teacherMap.get(clean) || {};
                    teacherMap.set(clean, {
                        name: rawName,
                        cleanName: clean,
                        displayName: rawName,
                        shortName: existing.shortName || '',
                        department: t['Tổ bộ môn'] || existing.department || '',
                        homeroom: existing.homeroom || '',
                        subjects: pc || existing.subjects || '',
                        pccmSummary: pc || existing.pccmSummary || ''
                    });
                });
            }
            if (Array.isArray(CANH_THUAN_TKB_DATA.teachers)) {
                CANH_THUAN_TKB_DATA.teachers.forEach(t => {
                    const clean = t.fullName.replace(/^(Thầy|Cô)\s+/i, '').trim();
                    const existing = teacherMap.get(clean) || {};
                    const subs = Array.isArray(t.subjects) ? t.subjects.join(', ') : (t.subjects || '');
                    teacherMap.set(clean, {
                        name: t.fullName,
                        cleanName: clean,
                        displayName: t.displayName || t.fullName,
                        shortName: t.shortName || existing.shortName || '',
                        department: t.department || existing.department || '',
                        homeroom: t.homeroom || existing.homeroom || '',
                        subjects: existing.subjects || subs,
                        pccmSummary: existing.pccmSummary || subs
                    });
                });
            }

            // Đồng bộ dữ liệu vào state hiện tại
            if (!this.teachers || this.teachers.length < 5) {
                this.teachers = CANH_THUAN_TKB_DATA.teachers ? JSON.parse(JSON.stringify(CANH_THUAN_TKB_DATA.teachers)) : [];
            }
            if (!this.officialPCCM || this.officialPCCM.length < 5) {
                this.officialPCCM = CANH_THUAN_TKB_DATA.officialPCCM ? JSON.parse(JSON.stringify(CANH_THUAN_TKB_DATA.officialPCCM)) : [];
            }
            if ((!this.assignments || this.assignments.length < 10) && CANH_THUAN_TKB_DATA.assignments) {
                this.assignments = JSON.parse(JSON.stringify(CANH_THUAN_TKB_DATA.assignments));
            }
        }

        // Chuyển Map thành mảng và sắp xếp chuẩn sư phạm:
        // Thầy Nguyễn Tá Quan lên đầu (👑), kế đến GVCN, sau đó theo Tổ Bộ Môn, rồi vần ABC tiếng Việt
        const list = Array.from(teacherMap.values());
        list.sort((a, b) => {
            const isQuanA = a.cleanName.includes('Tá Quan');
            const isQuanB = b.cleanName.includes('Tá Quan');
            if (isQuanA) return -1;
            if (isQuanB) return 1;

            // Ưu tiên GVCN
            if (a.homeroom && !b.homeroom) return -1;
            if (!a.homeroom && b.homeroom) return 1;

            // Theo tổ
            const deptA = a.department || '';
            const deptB = b.department || '';
            if (deptA !== deptB) return deptA.localeCompare(deptB, 'vi');

            return a.cleanName.localeCompare(b.cleanName, 'vi');
        });

        return list;
    }

    getAllTeachers() {
        const pccmTeachers = this.getPCCMTeachers();
        if (pccmTeachers && pccmTeachers.length > 0) {
            return pccmTeachers.map(t => t.name);
        }
        const set = new Set();
        for (const a of this.assignments) {
            if (a.teacher) set.add(a.teacher);
        }
        const list = Array.from(set);
        return list.sort((a, b) => {
            if (a.includes("Nguyễn Tá Quan")) return -1;
            if (b.includes("Nguyễn Tá Quan")) return 1;
            return a.localeCompare(b, 'vi');
        });
    }

    getTeacherTimetable(teacherName) {
        let grid = [];
        for (let d = 0; d < this.DAYS.length; d++) {
            grid[d] = [];
            for (let p = 0; p < this.PERIODS.length; p++) {
                grid[d][p] = null;
                for (const c of this.classes) {
                    const cell = this.timetable[c][d][p];
                    if (cell && cell.teacher === teacherName) {
                        grid[d][p] = {
                            subject: cell.subject,
                            classId: c,
                            room: cell.room,
                            color: cell.color,
                            isFixed: cell.isFixed
                        };
                        break;
                    }
                }
            }
        }
        return grid;
    }

    getRoomTimetable(roomId) {
        let grid = [];
        for (let d = 0; d < this.DAYS.length; d++) {
            grid[d] = [];
            for (let p = 0; p < this.PERIODS.length; p++) {
                grid[d][p] = [];
                for (const c of this.classes) {
                    const cell = this.timetable[c][d][p];
                    if (cell && cell.room === roomId) {
                        grid[d][p].push({
                            classId: c,
                            subject: cell.subject,
                            teacher: cell.teacher
                        });
                    }
                }
            }
        }
        return grid;
    }

    swapSlots(classId, d1, p1, d2, p2) {
        const cell1 = this.timetable[classId][d1][p1];
        const cell2 = this.timetable[classId][d2][p2];

        this.timetable[classId][d1][p1] = cell2;
        this.timetable[classId][d2][p2] = cell1;

        const conflicts = this.detectConflicts();
        if (conflicts.length > 0) {
            this.timetable[classId][d1][p1] = cell1;
            this.timetable[classId][d2][p2] = cell2;
            return { 
                success: false, 
                reason: `Xung đột: ${conflicts[0].message}`,
                conflicts: conflicts
            };
        }

        return { success: true };
    }

    detectConflicts() {
        let conflicts = [];

        for (let d = 0; d < this.DAYS.length; d++) {
            for (let p = 0; p < this.PERIODS.length; p++) {
                let teachersInSlot = {};
                for (const c of this.classes) {
                    const cell = this.timetable[c][d][p];
                    if (cell && cell.teacher && !cell.isFixed && cell.teacher !== "GVCN" && cell.teacher !== "Toàn trường") {
                        if (teachersInSlot[cell.teacher]) {
                            conflicts.push({
                                type: "teacher_overlap",
                                message: `Trùng giờ dạy: ${cell.teacher} cùng dạy ở lớp ${teachersInSlot[cell.teacher]} và ${c} vào ${this.DAYS[d]} - Tiết ${p + 1}`,
                                day: d,
                                period: p,
                                teacher: cell.teacher,
                                classes: [teachersInSlot[cell.teacher], c]
                            });
                        } else {
                            teachersInSlot[cell.teacher] = c;
                        }
                    }
                }
            }
        }

        for (let d = 0; d < this.DAYS.length; d++) {
            for (let p = 0; p < this.PERIODS.length; p++) {
                let roomUsage = {};
                for (const c of this.classes) {
                    const cell = this.timetable[c][d][p];
                    if (cell && cell.room) {
                        roomUsage[cell.room] = (roomUsage[cell.room] || 0) + 1;
                    }
                }

                for (const rId in roomUsage) {
                    const roomDef = this.specialRooms.find(r => r.id === rId);
                    const cap = roomDef ? roomDef.capacity : 1;
                    if (roomUsage[rId] > cap) {
                        conflicts.push({
                            type: "room_overflow",
                            message: `Quá tải phòng: ${roomDef.name} có ${roomUsage[rId]} lớp cùng đăng ký vào ${this.DAYS[d]} - Tiết ${p + 1} (Công suất tối đa: ${cap})`,
                            day: d,
                            period: p,
                            room: rId
                        });
                    }
                }
            }
        }

        return conflicts;
    }

    /**
     * Tự động lưu toàn bộ dữ liệu TKB vào bộ nhớ trình duyệt (LocalStorage)
     */
    getUserStorageKey(email = null) {
        let userEmail = email;
        if (!userEmail && window.app && window.app.currentUser && window.app.currentUser.email) {
            userEmail = window.app.currentUser.email;
        }
        if (!userEmail) userEmail = 'guest';
        return 'edustudio_tkb_data_' + userEmail.toLowerCase().trim();
    }

    /**
     * Tự động lưu toàn bộ dữ liệu TKB vào bộ nhớ trình duyệt theo tài khoản riêng biệt
     */
    saveState(email = null) {
        try {
            const key = this.getUserStorageKey(email);
            const data = {
                schoolConfig: this.schoolConfig,
                specialRooms: this.specialRooms,
                classes: this.classes,
                teachers: this.teachers || [],
                officialPCCM: this.officialPCCM || [],
                subjects: this.subjects,
                assignments: this.assignments,
                timetable: this.timetable,
                lsdlConfig: this.lsdlConfig,
                ppctConfig: this.ppctConfig,
                ppctLessons: this.ppctLessons || {},
                yearlySnapshots: this.yearlySnapshots || {},
                activeSnapshotId: this.activeSnapshotId || 'snapshot_week_9_13',
                teacherConstraints: this.teacherConstraints || {},
                fixedConstraints: this.fixedConstraints || {},
                pedagogicalPriorities: this.pedagogicalPriorities || {},
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch(e) {
            console.warn("Lỗi lưu dữ liệu TKB:", e);
            return false;
        }
    }

    /**
     * Tự động khôi phục dữ liệu TKB từ LocalStorage phân lập theo tài khoản
     */
    loadState(email = null) {
        try {
            const user = (window.app && window.app.currentUser) ? window.app.currentUser : null;
            const currentMail = (email || (user && user.email) || 'guest').toLowerCase().trim();
            const isAdmin = (currentMail === 'nguyentaquan@gmail.com');
            const key = this.getUserStorageKey(currentMail);

            let raw = localStorage.getItem(key);
            // Đối với Admin Thầy Quan, nếu chưa có key mới thì nạp từ legacy key
            if (!raw && isAdmin) {
                raw = localStorage.getItem('edustudio_tkb_canhthuan_official_v31028');
            }

            if (!raw) {
                if (isAdmin) {
                    this.loadDefaultSampleData();
                    return true;
                } else {
                    // Thành viên khác hoặc khách: Khởi tạo TKB mới sạch sẽ cho trường của họ
                    this.initCleanTimetableForUser(user);
                    return true;
                }
            }

            const data = JSON.parse(raw);
            if (!data || !data.classes || !data.timetable) {
                if (isAdmin) this.loadDefaultSampleData();
                else this.initCleanTimetableForUser(user);
                return true;
            }

            this.schoolConfig = data.schoolConfig || this.schoolConfig;
            this.specialRooms = data.specialRooms || this.specialRooms;
            this.classes = data.classes || [];
            this.teachers = data.teachers || [];
            this.officialPCCM = data.officialPCCM || [];
            this.subjects = data.subjects || this.subjects;
            this.assignments = data.assignments || [];
            this.timetable = data.timetable || {};
                    if (data.lsdlConfig) this.lsdlConfig = Object.assign({}, this.lsdlConfig, data.lsdlConfig);
                    if (data.ppctConfig) this.ppctConfig = Object.assign({}, this.ppctConfig, data.ppctConfig);
            this.ppctLessons = data.ppctLessons || {};
            this.yearlySnapshots = data.yearlySnapshots || {};
            this.activeSnapshotId = data.activeSnapshotId || 'snapshot_week_9_13';
            this.teacherConstraints = data.teacherConstraints || {};
            if (data.fixedConstraints) this.fixedConstraints = Object.assign({}, this.fixedConstraints, data.fixedConstraints);
            if (data.pedagogicalPriorities) this.pedagogicalPriorities = Object.assign({}, this.pedagogicalPriorities, data.pedagogicalPriorities);
            if (Object.keys(this.yearlySnapshots).length === 0) {
                this.initDefaultYearlySnapshots();
            }
            this.purgeFlagSalute();
            return true;
        } catch(e) {
            console.warn("Lỗi đọc dữ liệu TKB:", e);
            return false;
        }
    }

    initCleanTimetableForUser(user = null) {
        const schoolName = (user && user.school && user.school.trim()) ? user.school.trim() : "Trường Mầm Non / Phổ Thông Của Bạn";
        this.schoolConfig = {
            schoolName: schoolName,
            academicYear: "2026 - 2027",
            semester: "Học kỳ I",
            applyFromDate: "02/11/2026",
            session: "Sáng (5 tiết/buổi)",
            homeroomTeachers: {}
        };
        this.classes = ["6A1", "7A1", "8A1", "9A1"];
        this.teachers = [];
        this.officialPCCM = [];
        this.assignments = [];
        this.ppctLessons = {};
        this.resetTimetableGrid();
        this.saveState();
    }

    exportJSON() {
        return JSON.stringify({
            generator: "EduStudio v3.5.5 - Smart Timetable AI Master Package",
            author: "Thầy Nguyễn Tá Quan",
            version: "GDMN-GDPT-2026-v3.9.8",
            exportDate: new Date().toLocaleString('vi-VN'),
            schoolConfig: this.schoolConfig,
            pedagogicalPriorities: this.pedagogicalPriorities,
            subjects: this.subjects,
            specialRooms: this.specialRooms,
            classes: this.classes,
            teachers: this.teachers || [],
            officialPCCM: this.officialPCCM || [],
            assignments: this.assignments,
            timetable: this.timetable,
            timetableHK1: this.timetableHK1 || this.timetable,
            timetableHK2: this.timetableHK2 || null
        }, null, 2);
    }

    /**
     * Nạp lại CSDL từ file JSON sao lưu
     */
    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data && data.classes && data.timetable && data.assignments) {
                this.schoolConfig = data.schoolConfig || this.schoolConfig;
                if (data.pedagogicalPriorities) this.pedagogicalPriorities = data.pedagogicalPriorities;
                if (data.subjects && data.subjects.length > 0) {
            this.subjects = data.subjects;
            // Đảm bảo luôn đầy đủ bộ 3 môn: Lịch Sử & Địa Lí, Lịch Sử, Địa Lí
            if (!this.subjects.some(s => s.name === 'Lịch Sử' || s.id === 'lich_su')) {
                this.subjects.push({ id: "lich_su", name: "Lịch Sử", periodsPerWeek: 2, doublePeriod: false, roomReq: null, color: "#9a3412" });
            }
            if (!this.subjects.some(s => s.name === 'Địa Lí' || s.id === 'dia_li')) {
                this.subjects.push({ id: "dia_li", name: "Địa Lí", periodsPerWeek: 2, doublePeriod: false, roomReq: null, color: "#065f46" });
            }
            if (!this.subjects.some(s => s.name === 'Lịch Sử & Địa Lí' || s.id === 'ls_dl')) {
                this.subjects.push({ id: "ls_dl", name: "Lịch Sử & Địa Lí", periodsPerWeek: 3, doublePeriod: false, roomReq: null, color: "#b45309" });
            }
        }
                this.specialRooms = data.specialRooms || this.specialRooms;
                this.classes = data.classes;
                if (data.teachers && data.teachers.length > 0) this.teachers = data.teachers;
                if (data.officialPCCM && data.officialPCCM.length > 0) this.officialPCCM = data.officialPCCM;
                this.assignments = data.assignments;
                this.timetable = data.timetable;
                if (data.timetableHK1) this.timetableHK1 = data.timetableHK1;
                if (data.timetableHK2) this.timetableHK2 = data.timetableHK2;
                this.saveState();
                return { success: true };
                this.schoolConfig = data.schoolConfig || this.schoolConfig;
                this.specialRooms = data.specialRooms || this.specialRooms;
                this.classes = data.classes;
                this.assignments = data.assignments;
                this.timetable = data.timetable;
                this.saveState();
                return { success: true };
            }
            return { success: false, reason: "Định dạng file sao lưu không hợp lệ!" };
        } catch(e) {
            return { success: false, reason: e.message };
        }
    }

    /**
     * TÍNH NĂNG VŨ KHÍ: TỰ ĐỘNG SINH LỊCH BÁO GIẢNG TUẦN CHO GIÁO VIÊN
     * Tự động tính toán số tiết PPCT và chuẩn hóa tên bài dạy theo tuần
     */
    
    /**
     * ==============================================================================
     * HỆ THỐNG QUẢN LÝ PHÂN PHỐI CHƯƠNG TRÌNH (PPCT) & KẾ HOẠCH BÀI DẠY (CV 5512)
     * ==============================================================================
     */
    getPPCTLessons(subjectName, grade = '8') {
        const key = `${subjectName}_${grade}`;
        if (this.ppctLessons && this.ppctLessons[key] && this.ppctLessons[key].length > 0) {
            return this.ppctLessons[key];
        }
        return this.getDefaultPPCTSample(subjectName, grade);
    }

    savePPCTLessons(subjectName, grade, lessonsList) {
        if (!this.ppctLessons) this.ppctLessons = {};
        const key = `${subjectName}_${grade}`;
        this.ppctLessons[key] = lessonsList;
        this.saveState();
        return true;
    }

    getLessonByPPCT(subjectName, classId, periodNumber) {
        const grade = classId ? classId.replace(/\D/g, '') || '8' : '8';
        const key = `${subjectName}_${grade}`;
        const list = (this.ppctLessons && this.ppctLessons[key]) || this.getDefaultPPCTSample(subjectName, grade);
        if (list && list.length > 0) {
            const found = list.find(item => item.period === periodNumber);
            if (found) return found;
            if (list[periodNumber - 1]) return list[periodNumber - 1];
        }
        return null;
    }

    getDefaultPPCTSample(subjectName, grade = '8') {
        const sub = (subjectName || '').toLowerCase().trim();
        const gr = (grade || '8').toString().replace(/\D/g, '') || '8';
        const grLabel = `Lớp ${gr}`;

        // 1. MÔN HOẠT ĐỘNG TRẢI NGHIỆM, HƯỚNG NGHIỆP (105 TIẾT - 35 TUẦN x 3T)
        if (sub.includes('hđtn') || sub.includes('hdtn') || sub.includes('trải nghiệm')) {
            const topics = [];
            for (let w = 1; w <= 35; w++) {
                const p1 = (w - 1) * 3 + 1;
                const p2 = p1 + 1;
                const p3 = p1 + 2;
                topics.push({
                    period: p1, week: w,
                    title: `Sinh hoạt dưới cờ: Chủ đề rèn luyện tuần ${w} (${grLabel})`,
                    periodsCount: 1, equipment: "Cờ Đội, Loa, Thiết bị âm thanh",
                    room: "Sân trường", note: "SHDC"
                });
                topics.push({
                    period: p2, week: w,
                    title: `HĐGD theo chủ đề tuần ${w}: Rèn luyện bản thân & Hướng nghiệp (${grLabel})`,
                    periodsCount: 1, equipment: `SGK HĐTN ${gr}, Phiếu học tập`,
                    room: "Lớp học", note: "HĐGD"
                });
                topics.push({
                    period: p3, week: w,
                    title: `Sinh hoạt lớp: Sơ kết tuần ${w} & Kế hoạch tuần tiếp theo (${grLabel})`,
                    periodsCount: 1, equipment: "Sổ tay GVCN, Biên bản",
                    room: "Lớp học", note: "SHL"
                });
            }
            return topics;
        }

        // 2. MÔN TOÁN (140 TIẾT - 35 TUẦN x 4T)
        if (sub.includes('toán') || sub.includes('toan')) {
            let mathTopics = [];
            if (gr === '6') {
                mathTopics = [
                    "Tập hợp. Phần tử của tập hợp", "Tập hợp các số tự nhiên", "Các phép tính trong tập hợp số tự nhiên",
                    "Lũy thừa với số mũ tự nhiên", "Thứ tự thực hiện các phép tính", "Dấu hiệu chia hết cho 2, cho 5, cho 3, cho 9",
                    "Số nguyên tố. Hợp số. Phân tích ra thừa số nguyên tố", "Ước chung và Bội chung. ƯCLN & BCNN",
                    "Số nguyên âm và tập hợp các số nguyên", "Thứ tự trong tập hợp các số nguyên",
                    "Các phép tính cộng, trừ, nhân, chia số nguyên", "Hình tam giác đều, hình vuông, hình lục giác đều",
                    "Hình chữ nhật, hình thoi, hình bình hành, hình thang cân", "Chu vi và diện tích một số tứ giác",
                    "Phân số. Phân số bằng nhau. Tính chất cơ bản", "So sánh phân số và các phép tính phân số",
                    "Số thập phân và các phép tính số thập phân", "Tỉ số và tỉ số phần trăm. Bài toán thực tế",
                    "Điểm, đường thẳng, tia, đoạn thẳng", "Góc và số đo góc. Thống kê và xác suất thực nghiệm"
                ];
            } else if (gr === '7') {
                mathTopics = [
                    "Tập hợp các số hữu tỉ và các phép tính số hữu tỉ", "Số thập phân vô hạn tuần hoàn. Số thực",
                    "Căn bậc hai số học và giá trị tuyệt đối", "Góc ở vị trí đặc biệt. Tia phân giác của một góc",
                    "Hai đường thẳng song song và dấu hiệu nhận biết", "Định lí và chứng minh một định lí",
                    "Hình hộp chữ nhật và hình lập phương", "Hình lăng trụ đứng tam giác và tứ giác",
                    "Tổng các góc trong một tam giác", "Hai tam giác bằng nhau. Các trường hợp bằng nhau",
                    "Tam giác cân. Đường trung trực của đoạn thẳng", "Quan hệ giữa góc và cạnh đối diện trong tam giác",
                    "Các đường đồng quy trong tam giác (trung tuyến, phân giác, trung trực, cao)",
                    "Thu thập và phân loại dữ liệu", "Biểu đồ hình quạt tròn và biểu đồ đoạn thẳng",
                    "Biến cố và xác suất của biến cố trong trò chơi đơn giản"
                ];
            } else if (gr === '9') {
                mathTopics = [
                    "Căn bậc hai và căn thức bậc hai", "Liên hệ giữa phép nhân, phép chia và phép khai phương",
                    "Biến đổi đơn giản biểu thức chứa căn bậc hai", "Căn bậc ba và ứng dụng",
                    "Khái niệm hệ hai phương trình bậc nhất hai ẩn", "Giải hệ phương trình bằng phương pháp thế và cộng đại số",
                    "Giải bài toán bằng cách lập hệ phương trình", "Hàm số y = ax^2 (a khác 0) và đồ thị",
                    "Phương trình bậc hai một ẩn và công thức nghiệm", "Định lí Vi-ét và ứng dụng",
                    "Một số hệ thức về cạnh và đường cao trong tam giác vuông", "Tỉ số lượng giác của góc nhọn",
                    "Một số hệ thức về cạnh và góc trong tam giác vuông", "Sự xác định đường tròn. Tính chất đối xứng",
                    "Đường kính và dây của đường tròn. Tiếp tuyến của đường tròn", "Góc ở tâm. Số đo cung. Góc nội tiếp",
                    "Góc tạo bởi tia tiếp tuyến và dây cung. Tứ giác nội tiếp", "Độ dài đường tròn, cung tròn. Diện tích hình tròn",
                    "Hình trụ - Hình nón - Hình cầu (Diện tích và thể tích)", "Một số yếu tố xác suất và thống kê thực nghiệm"
                ];
            } else {
                // Khối 8 chuẩn
                mathTopics = [
                    "Bài 1: Đơn thức nhiều biến (Khái niệm & Bậc đơn thức)", "Bài 1: Đơn thức đồng dạng & Cộng trừ đơn thức",
                    "Bài 2: Đa thức nhiều biến (Khái niệm & Thu gọn đa thức)", "Bài 2: Tính giá trị của đa thức tại các giá trị cho trước",
                    "Bài 3: Phép cộng và phép trừ đa thức", "Luyện tập chung: Các phép tính trên đa thức nhiều biến",
                    "Bài 4: Phép nhân đơn thức với đa thức & Đa thức với đa thức", "Bài 5: Phép chia đa thức cho đơn thức",
                    "Bài 6: Hiệu hai bình phương. Bình phương của một tổng hay một hiệu", "Luyện tập hằng đẳng thức đáng nhớ số 1, 2, 3",
                    "Bài 7: Lập phương của một tổng. Lập phương của một hiệu", "Bài 8: Tổng và hiệu của hai lập phương",
                    "Bài 9: Phân tích đa thức thành nhân tử bằng phương pháp đặt nhân tử chung",
                    "Bài 9: Phân tích đa thức thành nhân tử bằng phương pháp dùng hằng đẳng thức",
                    "Bài 10: Tứ giác. Định lí về tổng các góc của một tứ giác", "Bài 11: Hình thang cân. Dấu hiệu nhận biết hình thang cân",
                    "Bài 12: Hình bình hành và hình thoi", "Bài 13: Hình chữ nhật và hình vuông",
                    "Định lí Thalès trong tam giác", "Đường trung bình của tam giác", "Tính chất đường phân giác của tam giác",
                    "Tam giác đồng dạng. Các trường hợp đồng dạng của tam giác", "Khái niệm hàm số và đồ thị của hàm số y = ax + b",
                    "Hệ số góc của đường thẳng y = ax + b", "Phương trình bậc nhất một ẩn và cách giải"
                ];
            }

            const list = [];
            for (let i = 1; i <= 140; i++) {
                const w = Math.ceil(i / 4);
                const tIdx = (i - 1) % mathTopics.length;
                list.push({
                    period: i, week: w,
                    title: `${mathTopics[tIdx]} (Tiết ${i})`,
                    periodsCount: 1, equipment: `SGK Toán ${gr}, Thước thẳng, Máy tính bỏ túi`,
                    room: "Lớp học", note: `Đại số & Hình học ${gr}`
                });
            }
            return list;
        }

        // 3. MÔN NGỮ VĂN (140 TIẾT - 35 TUẦN x 4T)
        if (sub.includes('văn') || sub.includes('van')) {
            const vanTopics = [
                `Bài 1: Đọc hiểu văn bản truyện (${grLabel})`, `Bài 1: Thực hành tiếng Việt`,
                `Bài 1: Viết bài văn tự sự / biểu cảm`, `Bài 1: Nói và nghe: Trình bày ý kiến`,
                `Bài 2: Đọc hiểu văn bản thơ (${grLabel})`, `Bài 2: Thực hành tiếng Việt - Biện pháp tu từ`,
                `Bài 2: Viết đoạn văn ghi lại cảm xúc về bài thơ`, `Bài 2: Nói và nghe: Trao đổi về một bài thơ`,
                `Bài 3: Đọc hiểu văn bản nghị luận xã hội`, `Bài 3: Thực hành tiếng Việt - Liên kết câu & đoạn văn`,
                `Bài 3: Viết bài văn nghị luận về một vấn đề đời sống`, `Bài 3: Nói và nghe: Thảo luận về vấn đề xã hội`,
                `Bài 4: Đọc hiểu văn bản thông tin`, `Bài 4: Thực hành tiếng Việt - Thuật ngữ & Nghĩa của từ`,
                `Bài 4: Viết biên bản hoặc văn bản thuyết minh`, `Bài 4: Nói và nghe: Báo cáo kết quả nghiên cứu`,
                `Ôn tập giữa học kỳ: Hệ thống hóa kiến thức đọc hiểu & tiếng Việt`, `Kiểm tra đánh giá giữa học kỳ`,
                `Bài 5: Đọc hiểu truyện ký / kịch bản văn học`, `Bài 5: Thực hành tiếng Việt - Câu rút gọn & câu đặc biệt`,
                `Bài 6: Vẻ đẹp quê hương đất nước qua tác phẩm văn học`, `Bài 6: Viết bài văn cảm thụ văn học`,
                `Ôn tập cuối học kỳ: Rèn luyện kỹ năng đọc hiểu - viết - nói nghe`, `Kiểm tra đánh giá cuối học kỳ`
            ];
            const list = [];
            for (let i = 1; i <= 140; i++) {
                const w = Math.ceil(i / 4);
                const tIdx = (i - 1) % vanTopics.length;
                list.push({
                    period: i, week: w,
                    title: `${vanTopics[tIdx]} (Tiết ${i})`,
                    periodsCount: 1, equipment: `SGK Ngữ Văn ${gr}, Phiếu học tập, Tranh ảnh`,
                    room: "Lớp học", note: `Ngữ Văn ${gr}`
                });
            }
            return list;
        }

        // 4. MÔN TIẾNG ANH (105 TIẾT - 35 TUẦN x 3T)
        if (sub.includes('anh')) {
            const engUnits = [
                `Unit 1: Getting Started (${grLabel})`, `Unit 1: A Closer Look 1 (Vocabulary & Pronunciation)`,
                `Unit 1: A Closer Look 2 (Grammar)`, `Unit 1: Communication`, `Unit 1: Skills 1 (Reading & Speaking)`,
                `Unit 1: Skills 2 (Listening & Writing)`, `Unit 1: Looking Back & Project`,
                `Unit 2: Getting Started`, `Unit 2: A Closer Look 1`, `Unit 2: A Closer Look 2`,
                `Unit 2: Communication`, `Unit 2: Skills 1`, `Unit 2: Skills 2`, `Unit 2: Looking Back & Project`,
                `Unit 3: Getting Started`, `Unit 3: A Closer Look 1`, `Unit 3: A Closer Look 2`,
                `Review 1: Language & Skills`, `Mid-term Test`,
                `Unit 4: Getting Started`, `Unit 4: A Closer Look 1`, `Unit 4: A Closer Look 2`,
                `Unit 5: Getting Started`, `Unit 5: Skills 1 & 2`,
                `Review 2: Language & Skills`, `End-of-term Test`
            ];
            const list = [];
            for (let i = 1; i <= 105; i++) {
                const w = Math.ceil(i / 3);
                const tIdx = (i - 1) % engUnits.length;
                list.push({
                    period: i, week: w,
                    title: `${engUnits[tIdx]} (Period ${i})`,
                    periodsCount: 1, equipment: `English ${gr} Student's Book, Audio CD, Flashcards`,
                    room: "Lớp học", note: `Tiếng Anh ${gr}`
                });
            }
            return list;
        }

        // 5. MÔN KHOA HỌC TỰ NHIÊN (140 TIẾT - 35 TUẦN x 4T)
        if (sub.includes('khtn') || sub.includes('tự nhiên')) {
            const khtnTopics = [
                `Mở đầu: Phương pháp và kỹ năng học tập KHTN ${gr}`, `An toàn và sử dụng thiết bị phòng thí nghiệm`,
                `Chủ đề 1: Chất và sự biến đổi của chất (${grLabel})`, `Thực hành quan sát hiện tượng và biến đổi chất`,
                `Chủ đề 2: Khối lượng, áp suất và lực trong đời sống`, `Thực hành đo đạc và khảo sát lực`,
                `Chủ đề 3: Năng lượng, công và công suất`, `Thực hành sử dụng đồng hồ đo điện & mạch điện cơ bản`,
                `Chủ đề 4: Tế bào và cơ thể sống (${grLabel})`, `Thực hành quan sát tiêu bản hiển vi`,
                `Chủ đề 5: Trao đổi chất và chuyển hóa năng lượng ở sinh vật`, `Thực hành thí nghiệm quang hợp và hô hấp`,
                `Chủ đề 6: Cảm ứng và điều hòa hoạt động cơ thể`, `Chủ đề 7: Sinh sản và phát triển ở sinh vật`,
                `Chủ đề 8: Trái đất và bầu trời (${grLabel})`, `Thực hành khám phá hiện tượng thiên văn học`
            ];
            const list = [];
            for (let i = 1; i <= 140; i++) {
                const w = Math.ceil(i / 4);
                const tIdx = (i - 1) % khtnTopics.length;
                list.push({
                    period: i, week: w,
                    title: `${khtnTopics[tIdx]} (Tiết ${i})`,
                    periodsCount: 1, equipment: `Dụng cụ, Hóa chất, Mô hình phòng Lab KHTN ${gr}`,
                    room: "room_khtn", note: `KHTN ${gr} (Lý - Hóa - Sinh)`
                });
            }
            return list;
        }

        // 6. MÔN LỊCH SỬ & ĐỊA LÍ (105 TIẾT - 35 TUẦN x 3T)
        if (sub.includes('lịch sử') || sub.includes('địa lí') || sub.includes('địa lý')) {
            const lsdlTopics = [
                `Phân môn Lịch sử: Khái quát tiến trình lịch sử (${grLabel})`,
                `Phân môn Địa lí: Vị trí địa lí, phạm vi lãnh thổ và bản đồ (${grLabel})`,
                `Phân môn Lịch sử: Các cuộc cách mạng và chuyển biến xã hội`,
                `Phân môn Địa lí: Địa hình, khoáng sản và tài nguyên thiên nhiên`,
                `Phân môn Lịch sử: Phong trào đấu tranh dựng nước và giữ nước`,
                `Phân môn Địa lí: Khí hậu, thủy văn và các đới thiên nhiên`,
                `Phân môn Lịch sử: Văn minh nhân loại và di sản văn hóa thế giới`,
                `Phân môn Địa lí: Dân cư, đô thị hóa và phát triển kinh tế`,
                `Chủ đề chung: Khám phá chủ quyền biển đảo Việt Nam (${grLabel})`,
                `Thực hành: Khai thác lược đồ lịch sử và Atlat Địa lí Việt Nam`
            ];
            const list = [];
            for (let i = 1; i <= 105; i++) {
                const w = Math.ceil(i / 3);
                const tIdx = (i - 1) % lsdlTopics.length;
                list.push({
                    period: i, week: w,
                    title: `${lsdlTopics[tIdx]} (Tiết ${i})`,
                    periodsCount: 1, equipment: `SGK Lịch sử & Địa lí ${gr}, Lược đồ, Atlat`,
                    room: "Lớp học", note: `Sử & Địa ${gr}`
                });
            }
            return list;
        }

        // 7. MÔN GIÁO DỤC THỂ CHẤT (70 TIẾT - 35 TUẦN x 2T)
        if (sub.includes('thể chất') || sub.includes('gdtc') || sub.includes('thể dục')) {
            const peTopics = [
                `Đội hình đội ngũ: Biến đổi đội hình và các động tác quay tại chỗ (${grLabel})`,
                `Bài thể dục phát triển chung / Thể dục liên hoàn (Động tác 1 - 8)`,
                `Chạy cự li ngắn: Kỹ thuật xuất phát thấp và chạy lao sau xuất phát`,
                `Chạy cự li ngắn: Kỹ thuật chạy giữa quãng và về đích`,
                `Chạy bền: Rèn luyện sức bền trên địa hình tự nhiên`,
                `Nhảy cao / Nhảy xa: Kỹ thuật chạy đà và giậm nhảy`,
                `Thể thao tự chọn: Kỹ thuật chuyền bóng và di chuyển cơ bản`,
                `Thể thao tự chọn: Kỹ thuật đập bóng / ném bóng / sút bóng cầu môn`,
                `Trò chơi vận động rèn luyện tố chất nhanh - mạnh - bền - khéo léo`,
                `Kiểm tra đánh giá thể lực theo tiêu chuẩn rèn luyện thân thể Bộ GD&ĐT`
            ];
            const list = [];
            for (let i = 1; i <= 70; i++) {
                const w = Math.ceil(i / 2);
                const tIdx = (i - 1) % peTopics.length;
                list.push({
                    period: i, week: w,
                    title: `${peTopics[tIdx]} (Tiết ${i})`,
                    periodsCount: 1, equipment: "Còi, Đồng hồ bấm giây, Bóng, Dây nhảy, Đệm",
                    room: "Sân đa năng / Thể chất", note: `GDTC ${gr}`
                });
            }
            return list;
        }

        // 8. MÔN TIN HỌC (35 - 70 TIẾT)
        if (sub.includes('tin')) {
            const tinTopics = [
                `Chủ đề A: Máy tính và cộng đồng (${grLabel})`,
                `Chủ đề B: Mạng máy tính và Internet - Dịch vụ đám mây an toàn`,
                `Chủ đề C: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin`,
                `Chủ đề D: Đạo đức, pháp luật và văn hóa ứng xử trong môi trường số`,
                `Chủ đề E: Ứng dụng tin học - Soạn thảo văn bản và bảng tính nâng cao`,
                `Chủ đề E: Xử lý số liệu, thống kê và vẽ biểu đồ trực quan`,
                `Chủ đề F: Giải quyết vấn đề với sự trợ giúp của máy tính - Thuật toán`,
                `Chủ đề F: Thực hành lập trình trực quan Scratch / Python (${grLabel})`
            ];
            const list = [];
            for (let i = 1; i <= 70; i++) {
                const w = Math.ceil(i / 2);
                const tIdx = (i - 1) % tinTopics.length;
                list.push({
                    period: i, week: w,
                    title: `${tinTopics[tIdx]} (Tiết ${i})`,
                    periodsCount: 1, equipment: "Phòng máy tính, Máy chiếu, Phần mềm chuyên dụng",
                    room: "room_tin", note: `Tin học ${gr}`
                });
            }
            return list;
        }

        // 9. MÔN CÔNG NGHỆ, GDCD, NGHỆ THUẬT, GDĐP
        const defaultPeriods = sub.includes('công nghệ') ? 35 :
                               sub.includes('công dân') || sub.includes('gdcd') ? 35 :
                               sub.includes('địa phương') || sub.includes('gdđp') ? 35 :
                               sub.includes('nghệ thuật') || sub.includes('nhạc') || sub.includes('mĩ thuật') ? 70 : 35;

        const genericList = [];
        for (let i = 1; i <= defaultPeriods; i++) {
            const w = Math.ceil(i / (defaultPeriods / 35));
            genericList.push({
                period: i, week: w,
                title: `Bài ${Math.ceil(i/2)}: Kế hoạch bài dạy môn ${subjectName} (${grLabel} - Tiết ${i})`,
                periodsCount: 1, equipment: `SGK ${subjectName} ${gr}, Thiết bị dạy học bộ môn`,
                room: "Lớp học", note: `Chuẩn GDPT 2018 - Tuần ${w}`
            });
        }
        return genericList;
    }

    generateTeachingSchedule(teacherName, weekNumber = 9) {
        const grid = this.getTeacherTimetable(teacherName);
        let scheduleRows = [];
        let ppctCounter = {}; // Đếm tiết PPCT cho từng môn/lớp

        // Giả lập tính toán tiết PPCT lũy kế đến tuần hiện tại
        // Tiết PPCT bắt đầu của tuần = (Tuần - 1) * số_tiết_tuần + 1
        for (const assign of this.assignments) {
            if (assign.teacher === teacherName) {
                const key = `${assign.subject}_${assign.classId}`;
                ppctCounter[key] = (weekNumber - 1) * assign.periods;
            }
        }

        for (let d = 0; d < this.DAYS.length; d++) {
            for (let p = 0; p < this.PERIODS.length; p++) {
                const cell = grid[d][p];
                if (cell) {
                    const key = `${cell.subject}_${cell.classId}`;
                    ppctCounter[key] = (ppctCounter[key] || 0) + 1;
                    const currentPPCT = ppctCounter[key];

                    // Tên bài dạy theo chuẩn SGK Kết Nối Tri Thức
                    // Lấy tên bài học chính xác từ kho PPCT chi tiết
                    const ppctLesson = this.getLessonByPPCT(cell.subject, cell.classId, currentPPCT);
                    let lessonTitle = ppctLesson && ppctLesson.title ? ppctLesson.title : `Bài học theo PPCT tiết ${currentPPCT}`;
                    if (!ppctLesson || !ppctLesson.title) {
                        if (cell.subject === 'HĐTN, HN') {
                            lessonTitle = `Chủ đề: Khám phá bản thân & Kỹ năng ứng phó (Tiết ${currentPPCT})`;
                        } else if (cell.subject === 'Tin Học') {
                            lessonTitle = `Chủ đề D: Đạo đức, pháp luật & văn hóa số (Tiết ${currentPPCT})`;
                        } else if (cell.subject === 'Toán') {
                            lessonTitle = `Đại số & Hình học trực quan (Tiết ${currentPPCT})`;
                        } else if (cell.subject === 'Ngữ Văn') {
                            lessonTitle = `Đọc hiểu văn bản & Thực hành tiếng Việt (Tiết ${currentPPCT})`;
                        }
                    }
                    if (cell.subject === 'HĐTN, HN') {
                        lessonTitle = `Chủ đề: Khám phá bản thân & Kỹ năng ứng phó (Tiết ${currentPPCT})`;
                    } else if (cell.subject === 'Tin Học') {
                        lessonTitle = `Chủ đề D: Đạo đức, pháp luật & văn hóa số (Tiết ${currentPPCT})`;
                    } else if (cell.subject === 'Toán') {
                        lessonTitle = `Đại số & Hình học trực quan (Tiết ${currentPPCT})`;
                    } else if (cell.subject === 'Ngữ Văn') {
                        lessonTitle = `Đọc hiểu văn bản & Thực hành tiếng Việt (Tiết ${currentPPCT})`;
                    }

                    const roomDef = cell.room ? this.specialRooms.find(r => r.id === cell.room) : null;

                    scheduleRows.push({
                        dayName: this.DAYS[d],
                        period: p + 1,
                        classId: cell.classId,
                        subject: cell.subject,
                        ppct: currentPPCT,
                        lessonTitle: lessonTitle,
                        equipment: roomDef ? roomDef.name : 'SGK, Máy chiếu, Phiếu HT',
                        note: cell.isFixed ? 'Tiết cố định' : ''
                    });
                }
            }
        }

        return {
            teacherName: teacherName,
            weekNumber: weekNumber,
            academicYear: this.schoolConfig.academicYear,
            schoolName: this.schoolConfig.schoolName,
            rows: scheduleRows
        };
    }

    /**
     * BÁO CÁO TOÀN DIỆN ĐỊNH MỨC & KIÊM NHIỆM 20 THẦY CÔ
     * Chuẩn Thông tư 28/2009/TT-BGDĐT & Thông tư 15/2020/TT-BGDĐT
     * Phản ánh đúng thực tế: GV vừa dạy chuyên môn vừa gánh 4-5 việc hỗ trợ trường
     */
    getTeacherWorkloadReport() {
        // Lấy danh sách phân công kiêm nhiệm lưu trong localStorage (nếu có tùy biến)
        let customRoles = {};
        try {
            const saved = localStorage.getItem('edustudio_custom_teacher_roles');
            if (saved) customRoles = JSON.parse(saved);
        } catch(e) {}

        const allTeachers = this.teachers && this.teachers.length > 0 ? this.teachers : [];
        
        // Thống kê số tiết giảng dạy thực tế từ TKB hiện tại
        const statsMap = {};
        for (const c of this.classes) {
            const grid = this.timetable[c];
            if (!grid) continue;
            for (let d = 0; d < this.DAYS.length; d++) {
                const dayList = grid[d] || (grid[String(d)] || []);
                for (let p = 0; p < dayList.length; p++) {
                    const cell = dayList[p];
                    if (cell && cell.teacher) {
                        const rawT = cell.teacher.replace(/Thầy\s+|Cô\s+/g, '').trim();
                        if (!statsMap[rawT]) {
                            statsMap[rawT] = { 
                                fullName: cell.teacher,
                                academicPeriods: 0, 
                                hdtnPeriods: 0,
                                academicSubjects: new Set(),
                                hdtnSubjects: new Set(),
                                classes: new Set()
                            };
                        }
                        const subj = cell.subject || '';
                        statsMap[rawT].classes.add(c);
                        if (subj.includes('Chào Cờ') || subj.includes('SHDC') || subj.includes('HĐCĐ') || subj.includes('SHL') || subj.includes('HĐTN')) {
                            statsMap[rawT].hdtnPeriods++;
                            statsMap[rawT].hdtnSubjects.add(subj);
                        } else {
                            statsMap[rawT].academicPeriods++;
                            statsMap[rawT].academicSubjects.add(subj);
                        }
                    }
                }
            }
        }

        // Tạo danh sách tổng hợp 21 Thầy Cô
        const report = [];
        
        const isCanhThuan = (this.schoolConfig?.schoolName || '').includes('Canh Thuận');
        let teacherNamesList = [];
        if (this.teachers && this.teachers.length > 0) {
            teacherNamesList = this.teachers.map(t => typeof t === 'string' ? t : (t.fullName || t.name));
        } else if (isCanhThuan) {
            teacherNamesList = [
                "Nguyễn Tá Quan", "Nguyễn Thanh Tuấn", "Lương Văn Tuấn", "Nguyễn Đình Minh", 
                "Hà Thị Thúy Hòa", "Dương Thị Ngọc Lành", "Nguyễn Thị Hồng Phúc", "Nguyễn Thị Hồng Duyên",
                "Lê Quốc Thái", "Nguyễn Tú Tài", "Võ Thị Hồng Ánh", "Nguyễn Bá Công",
                "Nguyễn Bá Hiền", "Đoàn Thị Hồ", "Phạm Thị Nhàn", "Nguyễn Thị Nương",
                "Đoàn Văn Rích", "Lê Thị Anh Thư", "Trần Thị Thanh Thảo", "Trần Duy Trung", "Thầy Tú (Công Nghệ)"
            ];
        }

        for (let i = 0; i < teacherNamesList.length; i++) {
            const tName = teacherNamesList[i];
            
            // Tìm thống kê dạy
            let teachStat = statsMap[tName];
            if (!teachStat) {
                // Thử tìm theo tên rút gọn
                for (const k in statsMap) {
                    if (tName.includes(k) || k.includes(tName)) {
                        teachStat = statsMap[k];
                        break;
                    }
                }
            }
            if (!teachStat) {
                teachStat = {
                    academicPeriods: 0,
                    hdtnPeriods: 0,
                    academicSubjects: new Set(),
                    hdtnSubjects: new Set(),
                    classes: new Set()
                };
            }

            // Lấy thông tin kiêm nhiệm từ default hoặc custom
            const defaultDef = (typeof TEACHER_WORKLOAD_ROLES !== 'undefined' && TEACHER_WORKLOAD_ROLES[tName]) ? TEACHER_WORKLOAD_ROLES[tName] : { roles: [], standardQuota: 17 };
            const currentRoles = customRoles[tName] || defaultDef.roles;
            const standardQuota = defaultDef.standardQuota || 17;

            const reducedTotal = currentRoles.reduce((sum, r) => sum + (r.reduced || 0), 0);
            const teachingTotal = teachStat.academicPeriods + teachStat.hdtnPeriods;
            const finalTotal = teachingTotal + reducedTotal;
            const diff = finalTotal - standardQuota;

            let status = 'standard'; // 'standard', 'surplus', 'deficit'
            let statusText = 'Đạt chuẩn 17 tiết';
            let badgeClass = 'badge-standard';

            if (diff > 0) {
                status = 'surplus';
                statusText = `Thừa +${diff} tiết`;
                badgeClass = 'badge-surplus';
            } else if (diff < 0) {
                status = 'deficit';
                statusText = `Thiếu ${diff} tiết`;
                badgeClass = 'badge-deficit';
            }

            // Xác định tổ bộ môn
            let dept = 'Tổ Tự Nhiên';
            if (["Nguyễn Bá Công", "Nguyễn Bá Hiền", "Đoàn Thị Hồ", "Phạm Thị Nhàn", "Nguyễn Thị Nương", "Đoàn Văn Rích", "Lê Thị Anh Thư", "Trần Thị Thanh Thảo", "Trần Duy Trung"].includes(tName)) {
                dept = 'Tổ Xã Hội';
            }

            report.push({
                index: i + 1,
                teacherName: tName,
                isQuan: tName.includes('Nguyễn Tá Quan'),
                department: dept,
                academicPeriods: teachStat.academicPeriods,
                academicSubjects: Array.from(teachStat.academicSubjects).join(', ') || '—',
                hdtnPeriods: teachStat.hdtnPeriods,
                hdtnSubjects: Array.from(teachStat.hdtnSubjects).join(', ') || '—',
                teachingTotal: teachingTotal,
                classes: Array.from(teachStat.classes).sort().join(', '),
                roles: currentRoles,
                reducedTotal: reducedTotal,
                finalTotal: finalTotal,
                standardQuota: standardQuota,
                diff: diff,
                status: status,
                statusText: statusText,
                badgeClass: badgeClass
            });
        }

        return report;
    }

    /**
     * Lấy trực tiếp thông tin Giáo viên chủ nhiệm (GVCN) của lớp từ Khai Báo Toàn Diện & PCCM
     * Cội nguồn dữ liệu duy nhất (Single Source of Truth)
     */
    getHomeroomTeacher(className) {
        if (!className) return null;
        const clean = className.trim().toUpperCase();
        const isCanhThuan = (this.schoolConfig?.schoolName || '').includes('Canh Thuận');

        // 1. Lấy trực tiếp từ Khai Báo Toàn Diện (schoolConfig.homeroomTeachers)
        if (this.schoolConfig?.homeroomTeachers?.[clean]) {
            const tName = this.schoolConfig.homeroomTeachers[clean];
            return {
                fullName: tName,
                isQuan: isCanhThuan && tName.includes('Tá Quan')
            };
        }

        // 2. Lấy trực tiếp từ Đội ngũ Giáo viên trong Khai Báo Toàn Diện (t.homeroom)
        if (this.teachers && Array.isArray(this.teachers) && this.teachers.length > 0) {
            const t = this.teachers.find(item => {
                const h = item.homeroom || item.homeroomClass;
                return h && h.trim().toUpperCase() === clean;
            });
            if (t) {
                const tName = t.fullName || t.displayName || t.name;
                return {
                    fullName: tName,
                    isQuan: isCanhThuan && tName.includes('Tá Quan')
                };
            }
        }

        // 3. Lấy trực tiếp từ Phân Công Chuyên Môn (PCCM) NẾU trường có giáo viên
        if (this.teachers && this.teachers.length > 0) {
            const report = this.getTeacherWorkloadReport ? this.getTeacherWorkloadReport() : [];
            for (const r of report) {
                if (r.roles && Array.isArray(r.roles)) {
                    for (const role of r.roles) {
                        const rName = (role.name || '').toUpperCase();
                        const rCode = (role.code || '').toUpperCase();
                        if ((rCode === 'GVCN' || rName.includes('CHỦ NHIỆM') || rName.includes('GVCN')) && rName.includes(clean)) {
                            return {
                                fullName: r.teacherName,
                                isQuan: isCanhThuan && (r.isQuan || r.teacherName.includes('Tá Quan'))
                            };
                        }
                    }
                }
            }
        }

        // Tuyệt đối không tự động gán giáo viên trường Canh Thuận cho trường khác
        return null;
    }

    updateTeacherWorkloadRoles(teacherName, newRoles) {
        let customRoles = {};
        try {
            const saved = localStorage.getItem('edustudio_custom_teacher_roles');
            if (saved) customRoles = JSON.parse(saved);
        } catch(e) {}

        customRoles[teacherName] = newRoles;
        try {
            localStorage.setItem('edustudio_custom_teacher_roles', JSON.stringify(customRoles));
            return true;
        } catch(e) {
            return false;
        }
    }

    /**
     * Khôi phục vai trò kiêm nhiệm mặc định chuẩn BGDĐT
     */
    resetTeacherWorkloadRoles() {
        try {
            localStorage.removeItem('edustudio_custom_teacher_roles');
            return true;
        } catch(e) {
            return false;
        }
    }

    /**
     * KIỂM TOÁN CHẤT LƯỢNG SƯ PHẠM THỜI KHÓA BIỂU (PEDAGOGICAL AUDIT)
     */
    getPedagogicalAudit() {
        const audit = {
            issues: [],
            positives: [],
            recommendations: []
        };

        // 1. Quét xung đột cứng
        const hardConflicts = this.detectConflicts();
        if (hardConflicts.length === 0) {
            audit.positives.push("✅ Tuyệt đối 0 xung đột trùng giáo viên hoặc quá tải phòng bộ môn.");
        } else {
            audit.issues.push(`⚠️ Có ${hardConflicts.length} xung đột trùng giáo viên cần giải quyết.`);
        }

        // 2. Quét kiểm toán HĐTN & SHL
        let scatteredSHLCount = 0;
        let middleWeekSHL = [];

        for (const c of this.classes) {
            const grid = this.timetable[c];
            if (!grid) continue;
            for (let d = 0; d < this.DAYS.length; d++) {
                const dayList = grid[d] || (grid[String(d)] || []);
                for (let p = 0; p < dayList.length; p++) {
                    const cell = dayList[p];
                    if (cell && (cell.subject === 'SHL' || cell.subject === 'Sinh Hoạt Lớp')) {
                        // Nếu không phải Thứ Bảy
                        if (d !== 5) {
                            scatteredSHLCount++;
                            middleWeekSHL.push(`Lớp ${c}: SHL rơi vào ${this.DAYS[d]} Tiết ${p+1} (${cell.teacher})`);
                        }
                    }
                }
            }
        }

        if (scatteredSHLCount > 0) {
            audit.issues.push(`⚠️ Có ${scatteredSHLCount} lớp có tiết Sinh Hoạt Lớp (SHL) rơi vào giữa tuần (không phải Thứ Bảy).`);
            audit.recommendations.push("💡 Nguyên nhân: Thầy Nguyễn Thanh Tuấn và Thầy Lương Văn Tuấn phải gánh SHL cho nhiều lớp để bù đủ định mức 19 tiết. Giải pháp căn cơ: Bù định mức bằng các nhiệm vụ kiêm nhiệm (Tổ trưởng, Đoàn Đội, Quản lý bán trú), trả tiết SHL về cho 9 GVCN của 9 lớp để đồng bộ 100% SHL vào Thứ Bảy Tiết 4.");
        } else {
            audit.positives.push("✅ 100% tiết Sinh Hoạt Lớp (SHL) được gom đồng bộ vào cuối tuần (Thứ Bảy).");
        }

        // 3. Quét Tiết Kép KHTN và Tin học
        let singleKHTNCount = 0;
        for (const c of this.classes) {
            const grid = this.timetable[c];
            if (!grid) continue;
            for (let d = 0; d < this.DAYS.length; d++) {
                const dayList = grid[d] || (grid[String(d)] || []);
                let khtnPeriodsInDay = 0;
                for (let p = 0; p < dayList.length; p++) {
                    const cell = dayList[p];
                    if (cell && (cell.subject === 'KHTN' || cell.subject.includes('Khoa học Tự nhiên'))) {
                        khtnPeriodsInDay++;
                    }
                }
                if (khtnPeriodsInDay === 1) singleKHTNCount++;
            }
        }

        if (singleKHTNCount > 0) {
            audit.issues.push(`⚠️ Có ${singleKHTNCount} buổi học môn KHTN bị xé lẻ 1 tiết (chưa ghép thành tiết kép 2 tiết liền để làm thí nghiệm thực hành).`);
            audit.recommendations.push("💡 Ưu tiên ghép môn KHTN (4 tiết/tuần) thành 2 buổi, mỗi buổi 2 tiết liền để giáo viên thuận lợi tổ chức thí nghiệm, thực hành theo chuẩn GDPT 2018.");
        } else {
            audit.positives.push("✅ Các môn thực hành KHTN và Tin học được tổ chức thành các tiết kép liền nhau đạt chuẩn sư phạm.");
        }

        return audit;
    }


    /**
     * THUẬT TOÁN HOÁN ĐỔI ĐỐI XỨNG HỌC KỲ II (SEMESTER 2 CSP ENGINE)
     * Giải bài toán PPCT môn ghép theo Công văn 5512 & CV 1496/BGDĐT:
     * - Học kỳ I (18 tuần): Lịch sử 2t + Địa lí 1t = 3t/tuần
     * - Học kỳ II (17 tuần): Lịch sử 1t + Địa lí 2t = 3t/tuần
     * -> Cả năm: Lịch sử 53t + Địa lí 52t = 105 tiết chuẩn GDPT 2018!
     */
    generateSemester2Timetable() {
        if (!this.timetableHK1) {
            this.timetableHK1 = JSON.parse(JSON.stringify(this.timetable));
        }

        const hk2 = JSON.parse(JSON.stringify(this.timetableHK1));
        const cfg = this.lsdlConfig || {
            hk1: { historyPeriods: 2, geographyPeriods: 1 },
            hk2: { historyPeriods: 1, geographyPeriods: 2 }
        };

        const targetHistHK2 = (cfg.hk2 && cfg.hk2.historyPeriods !== undefined) ? parseInt(cfg.hk2.historyPeriods) : 1;
        const targetGeoHK2 = (cfg.hk2 && cfg.hk2.geographyPeriods !== undefined) ? parseInt(cfg.hk2.geographyPeriods) : 2;

        for (const c of this.classes) {
            const grid = hk2[c];
            if (!grid) continue;

            let historySlots = [];
            let geographySlots = [];

            // Tìm vị trí các tiết Lịch sử và Địa lí trong tuần của lớp
            for (let d = 0; d < this.DAYS.length; d++) {
                const dayList = grid[d] || (grid[String(d)] || []);
                for (let p = 0; p < dayList.length; p++) {
                    const cell = dayList[p];
                    if (cell) {
                        const sName = (cell.subject || '').trim();
                        if (sName === 'Lịch Sử' || (sName.includes('Sử') && !sName.includes('Địa'))) {
                            historySlots.push({ day: d, period: p, cell: cell });
                        } else if (sName === 'Địa Lí' || (sName.includes('Địa') && !sName.includes('Sử'))) {
                            geographySlots.push({ day: d, period: p, cell: cell });
                        }
                    }
                }
            }

            // Tìm giáo viên Sử và Địa lí thực tế của lớp từ PCCM (không hardcode tên)
            let teacherHist = historySlots.length > 0 ? historySlots[0].cell.teacher : 'Giáo viên Lịch sử';
            let teacherGeo = geographySlots.length > 0 ? geographySlots[0].cell.teacher : 'Giáo viên Địa lí';

            if (this.assignments && this.assignments.length > 0) {
                const asHist = this.assignments.find(a => (a.classId === c || a.className === c) && (a.subjectId === 'lich_su' || (a.subjectName || '').includes('Sử')));
                if (asHist && asHist.teacherName) teacherHist = asHist.teacherName;
                const asGeo = this.assignments.find(a => (a.classId === c || a.className === c) && (a.subjectId === 'dia_li' || (a.subjectName || '').includes('Địa')));
                if (asGeo && asGeo.teacherName) teacherGeo = asGeo.teacherName;
            }

            const currentHistCount = historySlots.length;
            const currentGeoCount = geographySlots.length;

            // Nếu HK2 cần ít tiết Lịch sử hơn HK1 -> Chuyển bớt tiết Sử sang Địa lí
            if (currentHistCount > targetHistHK2 && targetGeoHK2 > currentGeoCount) {
                const diff = Math.min(currentHistCount - targetHistHK2, targetGeoHK2 - currentGeoCount);
                for (let i = 0; i < diff; i++) {
                    const slot = historySlots[historySlots.length - 1 - i];
                    if (slot && grid[slot.day] && grid[slot.day][slot.period]) {
                        grid[slot.day][slot.period] = {
                            subject: 'Địa Lí',
                            teacher: teacherGeo,
                            shortTeacher: teacherGeo.split(' ').pop(),
                            room: null,
                            isFixed: false,
                            color: '#065f46'
                        };
                    }
                }
            }
            // Nếu HK2 cần nhiều tiết Lịch sử hơn HK1 -> Chuyển bớt tiết Địa sang Lịch sử
            else if (targetHistHK2 > currentHistCount && currentGeoCount > targetGeoHK2) {
                const diff = Math.min(targetHistHK2 - currentHistCount, currentGeoCount - targetGeoHK2);
                for (let i = 0; i < diff; i++) {
                    const slot = geographySlots[geographySlots.length - 1 - i];
                    if (slot && grid[slot.day] && grid[slot.day][slot.period]) {
                        grid[slot.day][slot.period] = {
                            subject: 'Lịch Sử',
                            teacher: teacherHist,
                            shortTeacher: teacherHist.split(' ').pop(),
                            room: null,
                            isFixed: false,
                            color: '#9a3412'
                        };
                    }
                }
            }
        }

        this.timetableHK2 = hk2;
        return this.timetableHK2;
    }

    switchSemester(semester) {
        this.currentSemester = semester;
        if (!this.timetableHK1) {
            this.timetableHK1 = JSON.parse(JSON.stringify(this.timetable));
        }

        if (semester === 'HK2') {
            if (!this.timetableHK2) {
                this.generateSemester2Timetable();
            }
            this.timetable = JSON.parse(JSON.stringify(this.timetableHK2));
            this.schoolConfig.semester = "Học kỳ II";
            const cfg = this.lsdlConfig || { hk1: { historyPeriods: 2, geographyPeriods: 1 }, hk2: { historyPeriods: 1, geographyPeriods: 2 } };
            const pHist = cfg.hk2 ? cfg.hk2.historyPeriods : 1;
            const pGeo = cfg.hk2 ? cfg.hk2.geographyPeriods : 2;
            const w2 = (this.ppctConfig && this.ppctConfig.hk2Weeks) || 17;
            this.schoolConfig.note = `Áp dụng Học kỳ II (${w2} tuần) • Phân môn: Lịch sử ${pHist}t - Địa lí ${pGeo}t (Linh hoạt theo cấu hình)`;
        } else {
            // Mặc định HK1 hoặc Cả năm
            this.timetable = JSON.parse(JSON.stringify(this.timetableHK1));
            this.schoolConfig.semester = "Học kỳ I";
            const cfg1 = this.lsdlConfig || { hk1: { historyPeriods: 2, geographyPeriods: 1 }, hk2: { historyPeriods: 1, geographyPeriods: 2 } };
            const pHist1 = cfg1.hk1 ? cfg1.hk1.historyPeriods : 2;
            const pGeo1 = cfg1.hk1 ? cfg1.hk1.geographyPeriods : 1;
            const w1 = (this.ppctConfig && this.ppctConfig.hk1Weeks) || 18;
            this.schoolConfig.note = `Áp dụng Học kỳ I (${w1} tuần) • Phân môn: Lịch sử ${pHist1}t - Địa lí ${pGeo1}t (Linh hoạt theo cấu hình)`;
        }

        this.saveState();
        return this.timetable;
    }

    /**
     * BÁO CÁO QUYẾT TOÁN ĐỊNH MỨC CẢ NĂM HỌC (35 TUẦN - 595 TIẾT CHUẨN PTDTBT)
     */
    getAnnualWorkloadSettlement() {
        // Đảm bảo có cả dữ liệu HK1 và HK2
        if (!this.timetableHK1) this.timetableHK1 = JSON.parse(JSON.stringify(this.timetable));
        if (!this.timetableHK2) this.generateSemester2Timetable();

        // Lưu tạm trạng thái hiện tại
        const currentActiveTT = this.timetable;

        // Tính HK1
        this.timetable = this.timetableHK1;
        const repHK1 = this.getTeacherWorkloadReport();

        // Tính HK2
        this.timetable = this.timetableHK2;
        const repHK2 = this.getTeacherWorkloadReport();

        // Khôi phục
        this.timetable = currentActiveTT;

        // Bảng tổng hợp cả năm cho 21 giáo viên
        const annualReport = [];
        const STANDARD_ANNUAL_QUOTA = 17 * 35; // 595 tiết

        for (let i = 0; i < repHK1.length; i++) {
            const h1 = repHK1[i];
            const h2 = repHK2.find(x => x.teacherName === h1.teacherName) || h1;

            // Số tiết thực hiện trong năm = (Tổng tuần HK1 * 18) + (Tổng tuần HK2 * 17)
            const annualTeaching = (h1.teachingTotal * 18) + (h2.teachingTotal * 17);
            const annualReduced = (h1.reducedTotal * 18) + (h2.reducedTotal * 17);
            const annualFinal = annualTeaching + annualReduced;
            const diffAnnual = annualFinal - STANDARD_ANNUAL_QUOTA;

            let statusText = 'Đạt chuẩn 595 tiết/năm';
            if (diffAnnual > 0) {
                statusText = `Thừa +${diffAnnual} tiết/năm`;
            } else if (diffAnnual < 0) {
                statusText = `Thiếu ${diffAnnual} tiết/năm`;
            }

            annualReport.push({
                index: h1.index,
                teacherName: h1.teacherName,
                isQuan: h1.isQuan,
                department: h1.department,
                weeklyHK1: h1.finalTotal,
                weeklyHK2: h2.finalTotal,
                teachingHK1: h1.teachingTotal,
                teachingHK2: h2.teachingTotal,
                roles: h1.roles,
                annualTeaching: annualTeaching,
                annualReduced: annualReduced,
                annualFinal: annualFinal,
                standardAnnual: STANDARD_ANNUAL_QUOTA,
                diffAnnual: diffAnnual,
                statusText: statusText
            });
        }

        return annualReport;
    }


    /**
     * CẬP NHẬT CẤU HÌNH LINH HOẠT PHÂN MÔN LỊCH SỬ - ĐỊA LÍ
     */
    setLSDLConfig(newConfig) {
        if (!this.lsdlConfig) this.lsdlConfig = {};
        this.lsdlConfig = Object.assign(this.lsdlConfig, newConfig);
        this.timetableHK2 = null; // Reset để sinh lại theo tỷ lệ mới
        this.saveState();
        return this.lsdlConfig;
    }

    /**
     * CẬP NHẬT CẤU HÌNH TUẦN THỰC DẠY LINH HOẠT (KHÔNG CỐ ĐỊNH 35 TUẦN)
     */
    setPPCTWeekConfig(hk1Weeks, hk2Weeks) {
        if (!this.ppctConfig) this.ppctConfig = {};
        const w1 = parseInt(hk1Weeks) || 18;
        const w2 = parseInt(hk2Weeks) || 17;
        this.ppctConfig.hk1Weeks = w1;
        this.ppctConfig.hk2Weeks = w2;
        this.ppctConfig.totalWeeks = w1 + w2;
        if (this.schoolConfig) {
            this.schoolConfig.totalWeeks = this.ppctConfig.totalWeeks;
        }
        this.saveState();
        return this.ppctConfig;
    }

}
