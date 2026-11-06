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
            { id: "mythuat", name: "Mĩ Thuật", periodsPerWeek: 1, doublePeriod: false, roomReq: "room_amnhac", color: "#9333ea" }
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

        // Ràng buộc Ưu tiên Sư phạm Đẳng cấp (GDMN & GDPT)
        this.pedagogicalPriorities = {
            gvcnOffDays: 2, // GVCN được nghỉ 2 buổi/tuần
            noPEPeriod45: true, // Không xếp Thể dục tiết 4-5 nắng gắt
            maxPeriodsPerDay: 4, // Tối đa 4 tiết/ngày/GV tránh quá tải
            preferDoublePeriods: true, // Ưu tiên tiết đôi cho KHTN / Văn
            avoidFirstPeriodForYoungKids: true // Tránh tiết 1 sáng cho GV con nhỏ
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
            this.saveState();
            return;
        }
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

                // 3. MỨC 2: PHÒNG LAB / THÍ NGHIỆM (KHTN, Tin Học, Công Nghệ)
                if (prio === 2 || lesson.roomReq) {
                    if (length === 2) {
                        if (p === 1 || p === 2) score += 45; // Tiết đôi thực hành lý tưởng
                        else if (p >= 3) score -= 65;
                    }
                }

                // 4. MỨC 3: THỂ CHẤT & KHÍ HẬU (GDTC) -> BẢO VỆ SỨC KHỎE HỌC SINH
                if (prio === 3 || lesson.subject === "Giáo Dục Thể Chất") {
                    if (p === 3 || p === 4) {
                        score -= 280; // TUYỆT ĐỐI CẤM TIẾT 4 - 5 NẮNG GẮT TRƯA HÈ
                    } else if (p === 0 || p === 1) {
                        score += 70; // Ưu tiên tiết 1-2 sáng mát mẻ
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

    getAllTeachers() {
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
        
        // 1. MÔN HOẠT ĐỘNG TRẢI NGHIỆM, HƯỚNG NGHIỆP (105 TIẾT - 35 TUẦN x 3T)
        if (sub.includes('hđtn') || sub.includes('hdtn')) {
            const topics = [
                { w: 1, p: 1, t: "Sinh hoạt dưới cờ: Khám phá truyền thống nhà trường", type: "SHDC", eq: "Cờ, Loa, Khung kịch bản" },
                { w: 1, p: 2, t: "Hoạt động giáo dục theo chủ đề: Nhận diện cảm xúc & Bản thân", type: "HĐGD", eq: "Phiếu học tập, Tranh ảnh" },
                { w: 1, p: 3, t: "Sinh hoạt lớp: Bầu ban cán sự lớp & Xây dựng quy ước lớp", type: "SHL", eq: "Biên bản, Sổ tay cờ đỏ" },
                { w: 2, p: 4, t: "Sinh hoạt dưới cờ: Tự hào người học sinh Đội viên", type: "SHDC", eq: "Cờ Đội, Loa" },
                { w: 2, p: 5, t: "Hoạt động giáo dục theo chủ đề: Kỹ năng quản lý cảm xúc bản thân", type: "HĐGD", eq: "Phiếu bài tập rèn luyện" },
                { w: 2, p: 6, t: "Sinh hoạt lớp: Rèn luyện nền nếp học tập & Vệ sinh bán trú", type: "SHL", eq: "Kế hoạch tuần" },
                { w: 3, p: 7, t: "Sinh hoạt dưới cờ: Văn hóa ứng xử trong nhà trường", type: "SHDC", eq: "Tiểu phẩm" },
                { w: 3, p: 8, t: "Hoạt động giáo dục theo chủ đề: Xác định mục tiêu năm học", type: "HĐGD", eq: "Bảng mục tiêu cá nhân" },
                { w: 3, p: 9, t: "Sinh hoạt lớp: Sơ kết phong trào thi đua học tốt", type: "SHL", eq: "Sổ theo dõi thi đua" },
                { w: 4, p: 10, t: "Sinh hoạt dưới cờ: An toàn giao thông & Cổng trường bình yên", type: "SHDC", eq: "Mô hình biển báo" },
                { w: 4, p: 11, t: "Hoạt động giáo dục: Phòng chống bạo lực học đường & Kỹ năng ứng phó", type: "HĐGD", eq: "Video tình huống" },
                { w: 4, p: 12, t: "Sinh hoạt lớp: Rà soát nhiệm vụ tuần 4 & Đánh giá tháng 9", type: "SHL", eq: "Sổ tay chủ nhiệm" },
                { w: 5, p: 13, t: "Sinh hoạt dưới cờ: Phát động phong trào Đọc sách & Học tập suốt đời", type: "SHDC", eq: "Tủ sách măng non" },
                { w: 5, p: 14, t: "Hoạt động giáo dục: Khám phá khả năng tranh biện và tư duy logic", type: "HĐGD", eq: "Bảng tranh biện nhóm" },
                { w: 5, p: 15, t: "Sinh hoạt lớp: Tuyên dương cá nhân tích cực tuần 5", type: "SHL", eq: "Bảng vinh danh" },
                { w: 6, p: 16, t: "Sinh hoạt dưới cờ: Tôn vinh vẻ đẹp gia đình và lòng hiếu thảo", type: "SHDC", eq: "Bài hát gia đình" },
                { w: 6, p: 17, t: "Hoạt động giáo dục: Kỹ năng lắng nghe & Chia sẻ với cha mẹ", type: "HĐGD", eq: "Thiệp tri ân" },
                { w: 6, p: 18, t: "Sinh hoạt lớp: Kế hoạch phối hợp gia đình học sinh bán trú", type: "SHL", eq: "Phiếu liên lạc" },
                { w: 7, p: 19, t: "Sinh hoạt dưới cờ: Giao lưu tìm hiểu phong tục truyền thống địa phương", type: "SHDC", eq: "Trang phục dân tộc" },
                { w: 7, p: 20, t: "Hoạt động giáo dục: Xây dựng mối quan hệ bạn bè trong sáng, lành mạnh", type: "HĐGD", eq: "Bài tập tình huống" },
                { w: 7, p: 21, t: "Sinh hoạt lớp: Đánh giá nếp sống bán trú tháng 10", type: "SHL", eq: "Sổ chấm điểm phòng ở" },
                { w: 8, p: 22, t: "Sinh hoạt dưới cờ: Hưởng ứng phong trào Xanh - Sạch - Đẹp", type: "SHDC", eq: "Cây xanh mini" },
                { w: 8, p: 23, t: "Hoạt động giáo dục: Phân loại rác thải & Bảo vệ môi trường bán trú", type: "HĐGD", eq: "Túi phân loại rác" },
                { w: 8, p: 24, t: "Sinh hoạt lớp: Chuẩn bị nội dung kiểm tra giữa kỳ I", type: "SHL", eq: "Ma trận ôn tập" },
                { w: 9, p: 25, t: "Sinh hoạt dưới cờ: Tự tin bước vào kỳ kiểm tra giữa học kỳ I", type: "SHDC", eq: "Khẩu hiệu quyết tâm" },
                { w: 9, p: 26, t: "Hoạt động giáo dục: Kỹ năng giải tỏa căng thẳng mùa thi", type: "HĐGD", eq: "Bản đồ tư duy cảm xúc" },
                { w: 9, p: 27, t: "Sinh hoạt lớp: Đánh giá nền nếp sau tuần kiểm tra giữa kỳ", type: "SHL", eq: "Báo cáo tổng kết tuần 9" }
            ];
            
            // Tự động bổ sung các tuần còn lại đến tuần 35
            for (let w = 10; w <= 35; w++) {
                const p1 = (w - 1) * 3 + 1;
                const p2 = p1 + 1;
                const p3 = p1 + 2;
                topics.push({ w: w, p: p1, t: `Sinh hoạt dưới cờ: Chủ đề rèn luyện tuần ${w}`, type: "SHDC", eq: "Cờ, Loa, Thiết bị âm thanh" });
                topics.push({ w: w, p: p2, t: `Hoạt động giáo dục theo chủ đề tuần ${w}: Phát triển năng lực cá nhân`, type: "HĐGD", eq: "SGK HĐTN, Phiếu học tập" });
                topics.push({ w: w, p: p3, t: `Sinh hoạt lớp: Đánh giá kết quả tuần ${w} & Kế hoạch tuần tiếp theo`, type: "SHL", eq: "Sổ tay GVCN" });
            }
            return topics.map(item => ({
                period: item.p,
                week: item.w,
                title: item.t,
                periodsCount: 1,
                equipment: item.eq,
                room: item.type === 'SHDC' ? 'Sân trường' : 'Lớp học',
                note: item.type
            }));
        }

        // 2. MÔN TIN HỌC (70 TIẾT - 35 TUẦN x 2T)
        if (sub.includes('tin')) {
            let tinLessons = [];
            const titles = [
                "Chủ đề A: Máy tính và cộng đồng - Lịch sử phát triển thiết bị số",
                "Chủ đề A: Thông tin trong môi trường số và khả năng xử lý",
                "Chủ đề B: Mạng máy tính và Internet - Khái niệm dịch vụ đám mây",
                "Chủ đề B: Thực hành chia sẻ tài nguyên an toàn trên Google Drive",
                "Chủ đề D: Đạo đức, pháp luật và văn hóa trong môi trường số",
                "Chủ đề D: Phòng tránh lừa đảo và bảo vệ thông tin cá nhân trên mạng",
                "Chủ đề E: Ứng dụng tin học - Định dạng văn bản nâng cao với bảng biểu",
                "Chủ đề E: Thực hành thiết kế tài liệu học tập chuẩn GDPT",
                "Chủ đề E: Sử dụng phần mềm bảng tính Excel xử lý số liệu khảo sát",
                "Chủ đề E: Các hàm thống kê cơ bản trong phân tích dữ liệu học tập",
                "Chủ đề E: Vẽ biểu đồ trực quan hóa số liệu bảng tính",
                "Chủ đề E: Thực hành tổng hợp số liệu và in ấn báo cáo",
                "Chủ đề F: Giải quyết vấn đề với sự trợ giúp của máy tính - Thuật toán",
                "Chủ đề F: Cấu trúc tuần tự và cấu trúc rẽ nhánh trong lập trình trực quan",
                "Chủ đề F: Cấu trúc lặp và biến nhớ trong Scratch / Python",
                "Chủ đề F: Thực hành lập trình trò chơi học tập tương tác"
            ];
            for (let i = 1; i <= 70; i++) {
                const w = Math.ceil(i / 2);
                const titleIdx = (i - 1) % titles.length;
                tinLessons.push({
                    period: i,
                    week: w,
                    title: `${titles[titleIdx]} (Tiết ${i})`,
                    periodsCount: 1,
                    equipment: "Phòng máy tính, Máy chiếu, Phần mềm",
                    room: "room_tin",
                    note: "Thực hành phòng máy"
                });
            }
            return tinLessons;
        }

        // 3. MÔN TOÁN (140 TIẾT - 35 TUẦN x 4T)
        if (sub.includes('toán') || sub.includes('toan')) {
            let mathLessons = [];
            const sampleTitles = [
                "Bài 1: Đơn thức nhiều biến (Khái niệm & Bậc đơn thức)",
                "Bài 1: Đơn thức đồng dạng & Cộng trừ đơn thức",
                "Bài 2: Đa thức nhiều biến (Khái niệm & Thu gọn đa thức)",
                "Bài 2: Tính giá trị của đa thức tại các giá trị cho trước",
                "Bài 3: Phép cộng và phép trừ đa thức",
                "Luyện tập chung: Các phép tính trên đa thức nhiều biến",
                "Bài 4: Phép nhân đơn thức với đa thức & Đa thức với đa thức",
                "Bài 5: Phép chia đa thức cho đơn thức",
                "Bài 6: Hiệu hai bình phương. Bình phương của một tổng hay một hiệu",
                "Luyện tập hằng đẳng thức đáng nhớ số 1, 2, 3",
                "Bài 7: Lập phương của một tổng. Lập phương của một hiệu",
                "Bài 8: Tổng và hiệu của hai lập phương",
                "Bài 9: Phân tích đa thức thành nhân tử bằng phương pháp đặt nhân tử chung",
                "Bài 9: Phân tích đa thức thành nhân tử bằng phương pháp dùng hằng đẳng thức",
                "Bài 10: Tứ giác. Định lí về tổng các góc của một tứ giác",
                "Bài 11: Hình thang cân. Dấu hiệu nhận biết hình thang cân"
            ];
            for (let i = 1; i <= 140; i++) {
                const w = Math.ceil(i / 4);
                const tIdx = (i - 1) % sampleTitles.length;
                mathLessons.push({
                    period: i,
                    week: w,
                    title: `${sampleTitles[tIdx]} (Tiết ${i})`,
                    periodsCount: 1,
                    equipment: "SGK Toán 8, Thước thẳng, Máy tính bỏ túi",
                    room: "Lớp học",
                    note: "Đại số & Hình học"
                });
            }
            return mathLessons;
        }

        // 4. MÔN KHTN (140 TIẾT - 35 TUẦN x 4T)
        if (sub.includes('khtn')) {
            let khtnLessons = [];
            const khtnTitles = [
                "Mở đầu: Sử dụng hóa chất, dụng cụ và an toàn trong phòng thực hành",
                "Mở đầu: Viết báo cáo thực hành thí nghiệm KHTN",
                "Bài 1: Biến đổi vật lí và biến đổi hóa học",
                "Bài 2: Phản ứng hóa học và năng lượng trong phản ứng hóa học",
                "Bài 3: Định luật bảo toàn khối lượng và phương trình hóa học",
                "Luyện tập: Lập phương trình hóa học của phản ứng",
                "Bài 4: Khối lượng mol và tỉ khối của chất khí",
                "Bài 5: Dung dịch và nồng độ dung dịch (Nồng độ C% và CM)",
                "Bài 6: Tốc độ phản ứng và các yếu tố ảnh hưởng đến tốc độ phản ứng",
                "Bài 13: Khối lượng riêng và đơn vị đo khối lượng riêng",
                "Bài 14: Thực hành đo khối lượng riêng của vật rắn",
                "Bài 15: Tác dụng của áp suất lên chất lỏng và chất khí",
                "Bài 16: Lực đẩy Ác-si-mét và điều kiện vật nổi",
                "Bài 17: Áp suất khí quyển và ứng dụng trong đời sống"
            ];
            for (let i = 1; i <= 140; i++) {
                const w = Math.ceil(i / 4);
                const tIdx = (i - 1) % khtnTitles.length;
                khtnLessons.push({
                    period: i,
                    week: w,
                    title: `${khtnTitles[tIdx]} (Tiết ${i})`,
                    periodsCount: 1,
                    equipment: "Dụng cụ, Hóa chất, Mô hình phòng Lab",
                    room: "room_khtn",
                    note: "Vật lí - Hóa học - Sinh học"
                });
            }
            return khtnLessons;
        }

        // 5. MÔN LỊCH SỬ RIÊNG (52-70 TIẾT - CHUẨN GDPT 2018)
        if (sub === 'lịch sử' || (sub.includes('lịch sử') && !sub.includes('địa'))) {
            let histLessons = [];
            const histTitles = [
                "Bài 1: Nước Đại Việt thời Lê sơ - Tình hình chính trị, quân sự, luật pháp",
                "Bài 2: Tình hình kinh tế, xã hội nước Đại Việt thời Lê sơ",
                "Bài 3: Khởi nghĩa Lam Sơn (1418 - 1427) bùng nổ và toàn thắng",
                "Bài 4: Phong trào Tây Sơn - Lật đổ chính quyền chúa Nguyễn & chúa Trịnh",
                "Bài 5: Quang Trung đại phá quân Thanh & Chiến thắng Rạch Gầm - Xoài Mút",
                "Bài 6: Các cuộc cách mạng tư sản thời cận đại ở Châu Âu và Bắc Mỹ",
                "Bài 7: Phong trào công nhân quốc tế và sự ra đời của chủ nghĩa Mác",
                "Bài 8: Sự xâm lược của thực dân phương Tây vào các nước Đông Nam Á",
                "Bài 9: Phong trào Cần Vương và phong trào yêu nước chống thực dân Pháp",
                "Bài 10: Xã hội Việt Nam trong cuộc khai thác thuộc địa lần thứ nhất"
            ];
            for (let i = 1; i <= 70; i++) {
                const w = Math.ceil(i / 2);
                const tIdx = (i - 1) % histTitles.length;
                histLessons.push({
                    period: i,
                    week: w,
                    title: `${histTitles[tIdx]} (Tiết ${i})`,
                    periodsCount: 1,
                    equipment: "SGK Lịch sử, Bản đồ lịch sử, Tư liệu hình ảnh",
                    room: "Lớp học",
                    note: `Phân môn Lịch sử - Tuần ${w}`
                });
            }
            return histLessons;
        }

        // 6. MÔN ĐỊA LÍ RIÊNG (52-70 TIẾT - CHUẨN GDPT 2018)
        if (sub === 'địa lí' || sub === 'địa lý' || ((sub.includes('địa lí') || sub.includes('địa lý')) && !sub.includes('sử'))) {
            let geoLessons = [];
            const geoTitles = [
                "Bài 1: Vị trí địa lí và phạm vi lãnh thổ Việt Nam",
                "Bài 2: Địa hình Việt Nam - Đồi núi, đồng bằng và bờ biển",
                "Bài 3: Khoáng sản Việt Nam và vấn đề sử dụng hợp lí tài nguyên",
                "Bài 4: Khí hậu Việt Nam - Tính chất nhiệt đới gió mùa ẩm",
                "Bài 5: Thủy văn Việt Nam - Hệ thống sông ngòi và hồ đầm",
                "Bài 6: Thổ nhưỡng Việt Nam - Nhóm đất feralit và đất phù sa",
                "Bài 7: Sinh vật Việt Nam - Đa dạng sinh học và bảo tồn thiên nhiên",
                "Bài 8: Vùng biển đảo Việt Nam - Chủ quyền Hoàng Sa, Trường Sa & Kinh tế biển",
                "Bài 9: Các vùng kinh tế trọng điểm và phát triển bền vững",
                "Bài 10: Thực hành: Đọc bản đồ địa lí và phân tích biểu đồ khí hậu"
            ];
            for (let i = 1; i <= 70; i++) {
                const w = Math.ceil(i / 2);
                const tIdx = (i - 1) % geoTitles.length;
                geoLessons.push({
                    period: i,
                    week: w,
                    title: `${geoTitles[tIdx]} (Tiết ${i})`,
                    periodsCount: 1,
                    equipment: "SGK Địa lí, Atlat Địa lí Việt Nam, Quả địa cầu",
                    room: "Lớp học",
                    note: `Phân môn Địa lí - Tuần ${w}`
                });
            }
            return geoLessons;
        }

        // 7. CÁC MÔN HỌC KHÁC: TỰ ĐỘNG SINH KHUNG CHUẨN ĐẦU ĐỦ THEO SỐ TIẾT
        const periodsPerWeekMap = {
            'ngữ văn': 4, 'tiếng anh': 3, 'lịch sử & địa lí': 3, 'lịch sử và địa lí': 3,
            'lịch sử': 2, 'địa lí': 2, 'địa lý': 2,
            'giáo dục thể chất': 2, 'công nghệ': 1, 'giáo dục công dân': 1,
            'âm nhạc': 1, 'mĩ thuật': 1
        };
        let pPerWeek = 2;
        for (const [k, v] of Object.entries(periodsPerWeekMap)) {
            if (sub.includes(k)) { pPerWeek = v; break; }
        }
        const totalPeriods = pPerWeek * 35;
        let genericLessons = [];
        for (let i = 1; i <= totalPeriods; i++) {
            const w = Math.ceil(i / pPerWeek);
            genericLessons.push({
                period: i,
                week: w,
                title: `Bài học môn ${subjectName}: Nội dung chuẩn chương trình GDPT (Tiết ${i})`,
                periodsCount: 1,
                equipment: "SGK, Máy chiếu, Thiết bị dạy học bộ môn",
                room: "Lớp học",
                note: `Tuần ${w}`
            });
        }
        return genericLessons;
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
