/**
 * ==============================================================================
 * EDUSTUDIO - XƯỞNG XẾP THỜI KHÓA BIỂU TOÀN TRƯỜNG THÔNG MINH GDPT 2018
 * THUẬT TOÁN AI CSP & ENGINE QUẢN LÝ DỮ LIỆU ĐA CHIỀU (LIVE EDITABLE)
 * ==============================================================================
 * Tác giả & Chủ quản: Thầy Nguyễn Tá Quan
 * Bản quyền: Hệ sinh thái EduStudio v3.5.0 GDMN & GDPT
 * ==============================================================================
 */

export class SmartTKBEngine {
    constructor() {
        this.DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        this.PERIODS = [1, 2, 3, 4, 5]; // 5 tiết buổi sáng
        
        // Cấu trúc dữ liệu trường học
        this.schoolConfig = {
            schoolName: "Trường THCS Thực Nghiệm Sư Phạm",
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
        this.classes = ["6A", "6B", "7A", "7B", "8A", "8B", "9A", "9B"];

        // Danh sách môn học chuẩn GDPT 2018 THCS
        this.subjects = [
            { id: "toan", name: "Toán", periodsPerWeek: 4, doublePeriod: false, roomReq: null, color: "#1d4ed8" },
            { id: "van", name: "Ngữ Văn", periodsPerWeek: 4, doublePeriod: false, roomReq: null, color: "#b91c1c" },
            { id: "tienganh", name: "Tiếng Anh", periodsPerWeek: 3, doublePeriod: false, roomReq: null, color: "#047857" },
            { id: "khtn", name: "KHTN (Lý-Hóa-Sinh)", periodsPerWeek: 4, doublePeriod: true, roomReq: "room_khtn", color: "#6d28d9" },
            { id: "ls_dl", name: "Lịch Sử & Địa Lí", periodsPerWeek: 3, doublePeriod: false, roomReq: null, color: "#b45309" },
            { id: "hdtn", name: "HĐTN, HN", periodsPerWeek: 3, doublePeriod: false, roomReq: null, color: "#0e7490" },
            { id: "gdtc", name: "Giáo Dục Thể Chất", periodsPerWeek: 2, doublePeriod: true, roomReq: "room_gdtc", color: "#15803d" },
            { id: "tinhoc", name: "Tin Học", periodsPerWeek: 2, doublePeriod: true, roomReq: "room_tin", color: "#0369a1" },
            { id: "congnghe", name: "Công Nghệ", periodsPerWeek: 1, doublePeriod: false, roomReq: null, color: "#c2410c" },
            { id: "gdcd", name: "Giáo Dục Công Dân", periodsPerWeek: 1, doublePeriod: false, roomReq: null, color: "#4338ca" },
            { id: "amnhac", name: "Âm Nhạc", periodsPerWeek: 1, doublePeriod: false, roomReq: "room_amnhac", color: "#be185d" },
            { id: "mythuat", name: "Mĩ Thuật", periodsPerWeek: 1, doublePeriod: false, roomReq: "room_amnhac", color: "#9333ea" }
        ];

        // Phân công chuyên môn (PCCM)
        this.assignments = [];

        // Lịch kết quả [classId][dayIndex][periodIndex] = { subject, teacher, room, isFixed }
        this.timetable = {};

        // Khởi tạo dữ liệu mẫu chuẩn thực tế
        this.loadDefaultSampleData();
    }

    loadDefaultSampleData() {
        this.assignments = [
            // Khối 8 & 9 - Thầy Nguyễn Tá Quan phụ trách HĐTN và Tin học
            { teacher: "Thầy Nguyễn Tá Quan", subject: "HĐTN, HN", classId: "8A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Nguyễn Tá Quan", subject: "HĐTN, HN", classId: "8B", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Nguyễn Tá Quan", subject: "Tin Học", classId: "8A", periods: 2, doublePeriod: true, roomReq: "room_tin" },
            { teacher: "Thầy Nguyễn Tá Quan", subject: "Tin Học", classId: "8B", periods: 2, doublePeriod: true, roomReq: "room_tin" },

            // Môn Toán
            { teacher: "Thầy Trần Văn Toán", subject: "Toán", classId: "6A", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Trần Văn Toán", subject: "Toán", classId: "6B", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Cô Lê Thị Đại Số", subject: "Toán", classId: "7A", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Cô Lê Thị Đại Số", subject: "Toán", classId: "7B", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Phạm Hình Học", subject: "Toán", classId: "8A", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Phạm Hình Học", subject: "Toán", classId: "8B", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Hoàng Văn Tích", subject: "Toán", classId: "9A", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Hoàng Văn Tích", subject: "Toán", classId: "9B", periods: 4, doublePeriod: false, roomReq: null },

            // Ngữ Văn
            { teacher: "Cô Nguyễn Thị Văn", subject: "Ngữ Văn", classId: "6A", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Cô Nguyễn Thị Văn", subject: "Ngữ Văn", classId: "6B", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Cô Bùi Thu Cúc", subject: "Ngữ Văn", classId: "7A", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Cô Bùi Thu Cúc", subject: "Ngữ Văn", classId: "7B", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Cô Phan Mỹ Linh", subject: "Ngữ Văn", classId: "8A", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Cô Phan Mỹ Linh", subject: "Ngữ Văn", classId: "8B", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Đỗ Xuân Văn", subject: "Ngữ Văn", classId: "9A", periods: 4, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Đỗ Xuân Văn", subject: "Ngữ Văn", classId: "9B", periods: 4, doublePeriod: false, roomReq: null },

            // Tiếng Anh
            { teacher: "Cô Sarah Minh Trang", subject: "Tiếng Anh", classId: "6A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Sarah Minh Trang", subject: "Tiếng Anh", classId: "6B", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Sarah Minh Trang", subject: "Tiếng Anh", classId: "7A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Sarah Minh Trang", subject: "Tiếng Anh", classId: "7B", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Vũ Quốc Anh", subject: "Tiếng Anh", classId: "8A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Vũ Quốc Anh", subject: "Tiếng Anh", classId: "8B", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Vũ Quốc Anh", subject: "Tiếng Anh", classId: "9A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Vũ Quốc Anh", subject: "Tiếng Anh", classId: "9B", periods: 3, doublePeriod: false, roomReq: null },

            // KHTN (Lý - Hóa - Sinh)
            { teacher: "Thầy Ngô Khoa Học", subject: "KHTN (Lý-Hóa-Sinh)", classId: "6A", periods: 4, doublePeriod: true, roomReq: "room_khtn" },
            { teacher: "Thầy Ngô Khoa Học", subject: "KHTN (Lý-Hóa-Sinh)", classId: "6B", periods: 4, doublePeriod: true, roomReq: "room_khtn" },
            { teacher: "Cô Đặng Sinh Học", subject: "KHTN (Lý-Hóa-Sinh)", classId: "7A", periods: 4, doublePeriod: true, roomReq: "room_khtn" },
            { teacher: "Cô Đặng Sinh Học", subject: "KHTN (Lý-Hóa-Sinh)", classId: "7B", periods: 4, doublePeriod: true, roomReq: "room_khtn" },
            { teacher: "Cô Đặng Sinh Học", subject: "KHTN (Lý-Hóa-Sinh)", classId: "8A", periods: 4, doublePeriod: true, roomReq: "room_khtn" },
            { teacher: "Cô Đặng Sinh Học", subject: "KHTN (Lý-Hóa-Sinh)", classId: "8B", periods: 4, doublePeriod: true, roomReq: "room_khtn" },
            { teacher: "Thầy Ngô Khoa Học", subject: "KHTN (Lý-Hóa-Sinh)", classId: "9A", periods: 4, doublePeriod: true, roomReq: "room_khtn" },
            { teacher: "Thầy Ngô Khoa Học", subject: "KHTN (Lý-Hóa-Sinh)", classId: "9B", periods: 4, doublePeriod: true, roomReq: "room_khtn" },

            // Lịch Sử & Địa Lí
            { teacher: "Thầy Sử Địa Nam", subject: "Lịch Sử & Địa Lí", classId: "6A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Sử Địa Nam", subject: "Lịch Sử & Địa Lí", classId: "6B", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Sử Địa Nam", subject: "Lịch Sử & Địa Lí", classId: "7A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Sử Địa Nam", subject: "Lịch Sử & Địa Lí", classId: "7B", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Mai Địa Lý", subject: "Lịch Sử & Địa Lí", classId: "8A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Mai Địa Lý", subject: "Lịch Sử & Địa Lí", classId: "8B", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Mai Địa Lý", subject: "Lịch Sử & Địa Lí", classId: "9A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Mai Địa Lý", subject: "Lịch Sử & Địa Lí", classId: "9B", periods: 3, doublePeriod: false, roomReq: null },

            // Giáo Dục Thể Chất
            { teacher: "Thầy Thể Thao Huy", subject: "Giáo Dục Thể Chất", classId: "6A", periods: 2, doublePeriod: true, roomReq: "room_gdtc" },
            { teacher: "Thầy Thể Thao Huy", subject: "Giáo Dục Thể Chất", classId: "6B", periods: 2, doublePeriod: true, roomReq: "room_gdtc" },
            { teacher: "Thầy Thể Thao Huy", subject: "Giáo Dục Thể Chất", classId: "7A", periods: 2, doublePeriod: true, roomReq: "room_gdtc" },
            { teacher: "Thầy Thể Thao Huy", subject: "Giáo Dục Thể Chất", classId: "7B", periods: 2, doublePeriod: true, roomReq: "room_gdtc" },
            { teacher: "Thầy Thể Thao Huy", subject: "Giáo Dục Thể Chất", classId: "8A", periods: 2, doublePeriod: true, roomReq: "room_gdtc" },
            { teacher: "Thầy Thể Thao Huy", subject: "Giáo Dục Thể Chất", classId: "8B", periods: 2, doublePeriod: true, roomReq: "room_gdtc" },
            { teacher: "Thầy Thể Thao Huy", subject: "Giáo Dục Thể Chất", classId: "9A", periods: 2, doublePeriod: true, roomReq: "room_gdtc" },
            { teacher: "Thầy Thể Thao Huy", subject: "Giáo Dục Thể Chất", classId: "9B", periods: 2, doublePeriod: true, roomReq: "room_gdtc" },

            // Tin Học (Khối 6, 7, 9)
            { teacher: "Cô IT Thu Hà", subject: "Tin Học", classId: "6A", periods: 2, doublePeriod: true, roomReq: "room_tin" },
            { teacher: "Cô IT Thu Hà", subject: "Tin Học", classId: "6B", periods: 2, doublePeriod: true, roomReq: "room_tin" },
            { teacher: "Cô IT Thu Hà", subject: "Tin Học", classId: "7A", periods: 2, doublePeriod: true, roomReq: "room_tin" },
            { teacher: "Cô IT Thu Hà", subject: "Tin Học", classId: "7B", periods: 2, doublePeriod: true, roomReq: "room_tin" },
            { teacher: "Cô IT Thu Hà", subject: "Tin Học", classId: "9A", periods: 2, doublePeriod: true, roomReq: "room_tin" },
            { teacher: "Cô IT Thu Hà", subject: "Tin Học", classId: "9B", periods: 2, doublePeriod: true, roomReq: "room_tin" },

            // HĐTN (Khối 6, 7, 9)
            { teacher: "Cô Đoàn Đội Hằng", subject: "HĐTN, HN", classId: "6A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Đoàn Đội Hằng", subject: "HĐTN, HN", classId: "6B", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Đoàn Đội Hằng", subject: "HĐTN, HN", classId: "7A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Đoàn Đội Hằng", subject: "HĐTN, HN", classId: "7B", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Đoàn Đội Hằng", subject: "HĐTN, HN", classId: "9A", periods: 3, doublePeriod: false, roomReq: null },
            { teacher: "Cô Đoàn Đội Hằng", subject: "HĐTN, HN", classId: "9B", periods: 3, doublePeriod: false, roomReq: null },

            // Nghệ thuật & Công nghệ & GDCD
            { teacher: "Cô Họa Sĩ Mỹ Linh", subject: "Mĩ Thuật", classId: "8A", periods: 1, doublePeriod: false, roomReq: "room_amnhac" },
            { teacher: "Cô Họa Sĩ Mỹ Linh", subject: "Mĩ Thuật", classId: "8B", periods: 1, doublePeriod: false, roomReq: "room_amnhac" },
            { teacher: "Thầy Nhạc Trưởng Nam", subject: "Âm Nhạc", classId: "8A", periods: 1, doublePeriod: false, roomReq: "room_amnhac" },
            { teacher: "Thầy Nhạc Trưởng Nam", subject: "Âm Nhạc", classId: "8B", periods: 1, doublePeriod: false, roomReq: "room_amnhac" },
            { teacher: "Cô Đạo Đức An", subject: "Giáo Dục Công Dân", classId: "8A", periods: 1, doublePeriod: false, roomReq: null },
            { teacher: "Cô Đạo Đức An", subject: "Giáo Dục Công Dân", classId: "8B", periods: 1, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Kỹ Thuật Bách", subject: "Công Nghệ", classId: "8A", periods: 1, doublePeriod: false, roomReq: null },
            { teacher: "Thầy Kỹ Thuật Bách", subject: "Công Nghệ", classId: "8B", periods: 1, doublePeriod: false, roomReq: null }
        ];

        this.resetTimetableGrid();
    }

    resetTimetableGrid() {
        this.timetable = {};
        for (const classId of this.classes) {
            this.timetable[classId] = [];
            for (let d = 0; d < this.DAYS.length; d++) {
                this.timetable[classId][d] = [];
                for (let p = 0; p < this.PERIODS.length; p++) {
                    if (d === 0 && p === 0) {
                        this.timetable[classId][d][p] = {
                            subject: "Chào Cờ",
                            teacher: "Toàn trường",
                            room: null,
                            isFixed: true,
                            color: "#dc2626"
                        };
                    } else if (d === 5 && p === 4) {
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

        for (const assign of this.assignments) {
            let remainingPeriods = assign.periods;
            
            if (assign.doublePeriod && remainingPeriods >= 2) {
                lessonsPool.push({
                    assignId: `${assign.teacher}_${assign.subject}_${assign.classId}_double`,
                    teacher: assign.teacher,
                    subject: assign.subject,
                    classId: assign.classId,
                    roomReq: assign.roomReq,
                    length: 2,
                    priority: 10
                });
                remainingPeriods -= 2;
            }

            while (remainingPeriods > 0) {
                const prio = assign.roomReq ? 8 : (assign.periods >= 4 ? 6 : 4);
                lessonsPool.push({
                    assignId: `${assign.teacher}_${assign.subject}_${assign.classId}_single_${remainingPeriods}`,
                    teacher: assign.teacher,
                    subject: assign.subject,
                    classId: assign.classId,
                    roomReq: assign.roomReq,
                    length: 1,
                    priority: prio
                });
                remainingPeriods -= 1;
            }
        }

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

                let score = 100;
                if (subjectCountInDay > 0) score -= 40;
                if (length === 2 && p >= 4) score -= 100;
                if (lesson.subject === "Giáo Dục Thể Chất" && (p === 3 || p === 4)) score -= 30;
                if ((lesson.subject === "Toán" || lesson.subject === "Ngữ Văn" || lesson.subject === "KHTN (Lý-Hóa-Sinh)") && (p === 0 || p === 1 || p === 2)) {
                    score += 25;
                }
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

    isTeacherBusy(teacherName, day, period) {
        for (const c of this.classes) {
            const cell = this.timetable[c][day][period];
            if (cell && cell.teacher === teacherName) return true;
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
        const sub = this.subjects.find(s => s.name === subjectName || subjectName.startsWith(s.name));
        return sub ? sub.color : "#1d4ed8";
    }

    getAllTeachers() {
        const set = new Set();
        for (const a of this.assignments) {
            if (a.teacher) set.add(a.teacher);
        }
        return Array.from(set).sort();
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
}
