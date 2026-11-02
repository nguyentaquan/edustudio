/**
 * ==============================================================================
 * EDUSTUDIO - XƯỞNG XẾP THỜI KHÓA BIỂU TOÀN TRƯỜNG THÔNG MINH GDPT 2018
 * THUẬT TOÁN AI CSP & ENGINE QUẢN LÝ DỮ LIỆU ĐA CHIỀU (LIVE EDITABLE)
 * ==============================================================================
 * Tác giả & Chủ quản: Thầy Nguyễn Tá Quan
 * Bản quyền: Hệ sinh thái EduStudio v3.5.0 GDMN & GDPT
 * ==============================================================================
 */

import { CANH_THUAN_TKB_DATA } from './canh-thuan-tkb-data.js';

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

        // Tự động khôi phục dữ liệu đã lưu trong máy, nếu chưa có hoặc không phải Canh Thuận thì nạp chuẩn
        if (!this.loadState() || !this.timetable['8A1'] || this.classes.length !== 9) {
            this.loadDefaultSampleData();
        }
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
    saveState() {
        try {
            const data = {
                schoolConfig: this.schoolConfig,
                specialRooms: this.specialRooms,
                classes: this.classes,
                teachers: this.teachers || [],
                officialPCCM: this.officialPCCM || [],
                subjects: this.subjects,
                assignments: this.assignments,
                timetable: this.timetable,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('edustudio_tkb_canhthuan_tuan9_v2', JSON.stringify(data));
            return true;
        } catch(e) {
            console.warn("Lỗi lưu dữ liệu TKB:", e);
            return false;
        }
    }

    /**
     * Tự động khôi phục dữ liệu TKB từ LocalStorage
     */
    loadState() {
        try {
            const raw = localStorage.getItem('edustudio_tkb_canhthuan_tuan9_v2');
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (data && data.classes && data.timetable && data.assignments) {
                this.schoolConfig = data.schoolConfig || this.schoolConfig;
                this.specialRooms = data.specialRooms || this.specialRooms;
                this.classes = data.classes;
                this.teachers = (data.teachers && data.teachers.length > 0) ? data.teachers : (CANH_THUAN_TKB_DATA.teachers || []);
                this.officialPCCM = (data.officialPCCM && data.officialPCCM.length > 0) ? data.officialPCCM : (CANH_THUAN_TKB_DATA.officialPCCM || []);
                this.subjects = data.subjects || this.subjects;
                this.assignments = data.assignments;
                this.timetable = data.timetable;
                return true;
            }
        } catch(e) {
            console.warn("Lỗi đọc dữ liệu TKB:", e);
        }
        return false;
    }

    /**
     * Xuất toàn bộ CSDL trường học ra chuỗi JSON để sao lưu / nộp cấp trên
     */
    exportJSON() {
        return JSON.stringify({
            generator: "EduStudio v3.5.5 - Smart Timetable AI",
            author: "Thầy Nguyễn Tá Quan",
            exportDate: new Date().toLocaleString('vi-VN'),
            schoolConfig: this.schoolConfig,
            specialRooms: this.specialRooms,
            classes: this.classes,
            assignments: this.assignments,
            timetable: this.timetable
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
                    let lessonTitle = `Bài học theo PPCT tiết ${currentPPCT}`;
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
}
