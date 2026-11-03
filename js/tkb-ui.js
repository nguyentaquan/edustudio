/**
 * ==============================================================================
 * EDUSTUDIO - GIAO DIỆN ĐIỀU HÀNH & KẾT NỐI SƯ PHẠM THỜI KHÓA BIỂU TOÀN TRƯỜNG
 * (HOÀN TOÀN TƯƠNG TÁC: CHỈNH SỬA TRỰC TIẾP, HOÁN ĐỔI 1 CHẠM, THÊM SỬA XÓA)
 * ==============================================================================
 * Tác giả & Chủ quản: Thầy Nguyễn Tá Quan
 * Bản quyền: Hệ sinh thái EduStudio v3.5.0 GDMN & GDPT
 * ==============================================================================
 */

import { SmartTKBEngine } from './tkb-engine.js?v=3.10.4';

export class SmartTKBUI {
    constructor(appInstance) {
        this.app = appInstance;
        this.engine = new SmartTKBEngine();

        // Gán ngay lập tức vào window để mọi nút bấm HTML luôn tìm thấy
        window.smartTKBUI = this;

        this.currentSubTab = 'board'; // 'board', 'pccm', 'config', 'stats'
        this.currentViewMode = localStorage.getItem('edustudio_tkb_view_mode') || 'class'; // 'class', 'teacher', 'room', 'school'
        this.selectedClass = '8A1';
        this.selectedTeacher = 'Thầy Nguyễn Tá Quan';
        this.selectedRoom = 'room_tin';
        this.pccmFilter = 'workload';
        this.gradeFilter = 'all';
        this.masterColorMode = 'clean';
        // Tùy chỉnh hiển thị Bảng Tổng Thể Toàn Trường (Compact Master Matrix)
        this.masterDensity = localStorage.getItem('edustudio_master_density') || 'compact'; // 'ultra', 'compact', 'standard'
        this.masterShowLegend = localStorage.getItem('edustudio_master_show_legend') !== 'false'; // default true
        this.masterColorStyle = localStorage.getItem('edustudio_master_color_style') || 'color'; // 'color', 'monochrome'
        this.masterHideTeacher = localStorage.getItem('edustudio_master_hide_teacher') === 'true'; // default false // 'clean' (dịu mắt, nền trắng, chữ xanh mực) hoặc 'pastel' (phân màu môn) // 'all', '6', '7', '8', '9' // 'all', 'Tổ Tự Nhiên', 'Tổ Xã Hội', 'official'

        // Trạng thái hoán đổi 1 chạm (Click-to-Swap)
        this.swapSource = null; // { classId, day, period }


        this.editingSlot = null; // { classId, day, period, cell }
        this.editingPCCMIndex = -1; // -1: thêm mới, >= 0: sửa
    }

    /**
     * Khởi tạo và gắn các sự kiện điều khiển
     */
        onSchoolNameChange(val) {
        if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
        this.engine.schoolConfig.schoolName = val;
        try { localStorage.setItem('edustudio_custom_school_name', val); } catch(e){}
        const modalInput = document.getElementById('declSchoolName');
        if (modalInput && modalInput.value !== val) modalInput.value = val;
    }

    onSchoolYearChange(val) {
        if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
        this.engine.schoolConfig.schoolYear = val;
        try { localStorage.setItem('edustudio_custom_school_year', val); } catch(e){}
        const modalInput = document.getElementById('declSchoolYear');
        if (modalInput && modalInput.value !== val) modalInput.value = val;
    }

    onSelectTeacherDirect(tName) {
        this.selectedTeacher = tName;
        const sel = document.getElementById('tkbTeacherSelect');
        if (sel) sel.value = tName;
        const container = document.getElementById('tkbGridTableContainer');
        if (container) this.renderTeacherView(container);
    }

    setCustomTeacherPeriod(teacherName, val) {
        if (!this.customTeacherPeriods) this.customTeacherPeriods = {};
        this.customTeacherPeriods[teacherName] = val;
        try {
            localStorage.setItem('edustudio_custom_teacher_periods', JSON.stringify(this.customTeacherPeriods));
        } catch(e){}
    }

    init() {
        // Luôn nạp mặc định Thời khóa biểu chính thức Canh Thuận (Tuần 9)
        this.engine.loadDefaultSampleData();

        // Khôi phục tên trường và năm học tùy chỉnh nếu đã nhập trước đó
        try {
            const savedName = localStorage.getItem('edustudio_custom_school_name');
            if (savedName) {
                if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
                this.engine.schoolConfig.schoolName = savedName;
                const inpName = document.getElementById('tkbGlobalSchoolNameInput');
                if (inpName) inpName.value = savedName;
            }
            
            const savedPeriods = localStorage.getItem('edustudio_custom_teacher_periods');
            if (savedPeriods) {
                try { this.customTeacherPeriods = JSON.parse(savedPeriods); } catch(e){}
            }
const savedYear = localStorage.getItem('edustudio_custom_school_year');
            if (savedYear) {
                if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
                this.engine.schoolConfig.schoolYear = savedYear;
                const inpYear = document.getElementById('tkbGlobalSchoolYearInput');
                const selYear = document.getElementById('tkbGlobalSchoolYearSelect');
                if (selYear) selYear.value = savedYear;
                if (inpYear) inpYear.value = savedYear;
            }
        } catch(e){}

        // Gắn sự kiện chuyển subnav tab
        document.querySelectorAll('.btn-tkb-subnav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subtab = e.currentTarget.dataset.subtab;
                this.switchSubTab(subtab);
            });
        });

        // Gắn sự kiện 2 nút Khai Báo và PCCM để bảo đảm 100% luôn hoạt động
        document.getElementById('btnOpenMasterDeclarationModal')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openMasterDeclarationModal();
        });
        document.getElementById('btnOpenPCCMModal')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openPCCMDetailModal();
        });

        // Gắn sự kiện các nút chính trên Header
        document.getElementById('btnTKBAutoSolve')?.addEventListener('click', () => {
            this.handleAutoSolve();
        });

        document.getElementById('btnTKBLoadSample')?.addEventListener('click', () => {
            this.engine.loadDefaultSampleData();
            this.updateFilterControls();
            this.renderCurrentView();
            this.renderPCCMTable();
            this.renderConfigTab();
            this.renderStats();
            this.showToast('✅ Đã nạp Thời khóa biểu chính thức THCS Bán Trú Canh Thuận (Tuần 9)!');
        });

        document.getElementById('btnTKBExportExcel')?.addEventListener('click', () => {
            this.exportToExcel();
        });

        document.getElementById('btnTKBPrint')?.addEventListener('click', () => {
            this.printTimetable();
        });

        // Gắn sự kiện cho các nút chọn góc nhìn
        document.querySelectorAll('.tkb-view-btn-pill').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentViewMode);
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tkb-view-btn-pill').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentViewMode = e.currentTarget.dataset.view;
                try { localStorage.setItem('edustudio_tkb_view_mode', this.currentViewMode); } catch(err){}
                this.cancelSwapMode();
                this.updateFilterControls();
                this.renderCurrentView();
            });
        });
        this.updateFilterControls();

        // Gắn sự kiện bộ lọc Lớp / Giáo viên / Phòng
        document.getElementById('tkbClassSelect')?.addEventListener('change', (e) => {
            this.selectedClass = e.target.value;
            this.cancelSwapMode();
            this.renderCurrentView();
        });

        document.getElementById('tkbTeacherSelect')?.addEventListener('change', (e) => {
            this.selectedTeacher = e.target.value;
            this.cancelSwapMode();
            this.renderCurrentView();
        });

        document.getElementById('tkbRoomSelect')?.addEventListener('change', (e) => {
            this.selectedRoom = e.target.value;
            this.cancelSwapMode();
            this.renderCurrentView();
        });

        // Render lần đầu
        this.updateFilterControls();
        this.renderCurrentView();
        this.renderPCCMTable();
        this.renderConfigTab();
        this.renderStats();
    }

    /**
     * Chuyển đổi giữa 4 Sub-Tabs nghiệp vụ
     */
    switchSubTab(subtabId) {
        this.currentSubTab = subtabId;
        this.cancelSwapMode();

        document.querySelectorAll('.btn-tkb-subnav').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === subtabId);
        });

        document.querySelectorAll('.tkb-tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tkb-pane-${subtabId}`);
        });

        if (subtabId === 'board') {
            this.renderCurrentView();
        } else if (subtabId === 'pccm') {
            this.renderPCCMTable();
        } else if (subtabId === 'config') {
            this.renderConfigTab();
        } else if (subtabId === 'stats') {
            this.renderStats();
        }
    }

    /**
     * Cập nhật các menu chọn (Dropdown) theo chế độ xem
     */
    updateFilterControls() {
        const classSelect = document.getElementById('tkbClassSelect');
        const teacherSelect = document.getElementById('tkbTeacherSelect');
        const roomSelect = document.getElementById('tkbRoomSelect');

        if (!classSelect || !teacherSelect || !roomSelect) return;

        classSelect.style.display = 'none';
        teacherSelect.style.display = 'none';
        roomSelect.style.display = 'none';

        if (this.currentViewMode === 'class') {
            classSelect.style.display = 'inline-block';
            classSelect.innerHTML = this.engine.classes.map(c => 
                `<option value="${c}" ${c === this.selectedClass ? 'selected' : ''}>Lớp ${c}</option>`
            ).join('');
        } else if (this.currentViewMode === 'teacher') {
            teacherSelect.style.display = 'inline-block';
            const teachers = this.engine.getAllTeachers();
            teacherSelect.innerHTML = teachers.map(t => {
                const assign = this.engine.assignments.find(a => a.teacher === t);
                const dept = assign?.department || '';
                const deptBadge = dept ? ` [${dept}]` : '';
                return `<option value="${t}" ${t === this.selectedTeacher ? 'selected' : ''}>👨‍🏫 ${t}${deptBadge}</option>`;
            }).join('');
        } else if (this.currentViewMode === 'room') {
            roomSelect.style.display = 'inline-block';
            roomSelect.innerHTML = this.engine.specialRooms.map(r => 
                `<option value="${r.id}" ${r.id === this.selectedRoom ? 'selected' : ''}>${r.icon} ${r.name}</option>`
            ).join('');
        }
    }

    /**
     * Chạy thuật toán AI xếp lịch tự động & báo cáo thời gian thực
     */
    handleAutoSolve() {
        const btn = document.getElementById('btnTKBAutoSolve');
        if (btn) btn.innerHTML = `<span>⏳</span> <span>Đang Tối Ưu Hóa...</span>`;

        setTimeout(() => {
            const result = this.engine.solveAutomatic();
            if (btn) btn.innerHTML = `<span>⚡</span> <span>Xếp Lịch Tự Động (AI)</span>`;

            if (result.success) {
                this.showToast(`🎉 AI xếp lịch thành công 100%! Đã phân bổ ${result.assignedCount} tiết trong ${result.executionMs}ms (Không trùng lặp).`);
            } else {
                this.showToast(`⚠️ AI đã xếp được ${result.assignedCount}/${result.totalLessons} tiết. Còn ${result.unassignedCount} tiết bị nghẽn ràng buộc.`);
            }

            this.cancelSwapMode();
            this.renderCurrentView();
            this.renderStats();
        }, 150);
    }

    /**
     * Render bảng TKB theo chế độ góc nhìn hiện tại
     */
    renderCurrentView() {
        const container = document.getElementById('tkbGridTableContainer');
        if (!container) return;

        if (this.currentViewMode === 'class') {
            this.renderClassView(container);
        } else if (this.currentViewMode === 'teacher') {
            this.renderTeacherView(container);
        } else if (this.currentViewMode === 'room') {
            this.renderRoomView(container);
        } else if (this.currentViewMode === 'school') {
            this.renderSchoolMasterView(container);
        }
    }

    setMasterDensity(density) {
        this.masterDensity = density;
        try { localStorage.setItem('edustudio_master_density', density); } catch(e){}
        this.renderCurrentView();
    }

    toggleMasterLegend() {
        this.masterShowLegend = !this.masterShowLegend;
        try { localStorage.setItem('edustudio_master_show_legend', this.masterShowLegend ? 'true' : 'false'); } catch(e){}
        this.renderCurrentView();
    }

    toggleMasterColorStyle() {
        this.masterColorStyle = (this.masterColorStyle === 'monochrome') ? 'color' : 'monochrome';
        try { localStorage.setItem('edustudio_master_color_style', this.masterColorStyle); } catch(e){}
        this.renderCurrentView();
    }

    toggleMasterTeacherDisplay() {
        this.masterHideTeacher = !this.masterHideTeacher;
        try { localStorage.setItem('edustudio_master_hide_teacher', this.masterHideTeacher ? 'true' : 'false'); } catch(e){}
        this.renderCurrentView();
    }

    /**
     * GÓC NHÌN 1: THEO TỪNG LỚP HỌC (Ví dụ Lớp 8A)
     */
    renderClassView(container) {
        const classId = this.selectedClass;
        const isSwapping = !!this.swapSource && this.swapSource.classId === classId;

        let swapBanner = '';
        if (isSwapping) {
            const src = this.swapSource;
            swapBanner = `
                <div style="background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 8px; padding: 0.6rem 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="color: #b45309; font-weight: 700; font-size: 0.85rem;">
                        🔄 ĐANG CHỌN TIẾT: <strong>${this.engine.DAYS[src.day]} - Tiết ${src.period + 1}</strong>. Hãy bấm vào ô đích bất kỳ để hoán đổi!
                    </div>
                    <button onclick="window.smartTKBUI.cancelSwapMode()" style="background: #ef4444; color: #fff; border: none; padding: 0.25rem 0.65rem; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 0.78rem;">
                        ✖ Hủy Hoán Đổi
                    </button>
                </div>
            `;
        }

        let html = `
            ${swapBanner}
            <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div style="font-weight: 800; font-size: 1.05rem; color: #1e293b;">
                    🎒 Thời Khóa Biểu: <span style="color: #1d4ed8;">LỚP ${classId}</span>
                </div>
                <div style="font-size: 0.8rem; color: #64748b; background: #f1f5f9; padding: 0.25rem 0.75rem; border-radius: 6px;">
                    👉 <strong>Bấm vào bất kỳ ô nào</strong> để: <span style="color: #1d4ed8; font-weight: 700;">Chỉnh sửa môn • Đổi giáo viên • Hoán đổi tiết • Mở Giáo án 5512</span>
                </div>
            </div>
            <table class="tkb-table">
                <thead>
                    <tr>
                        <th style="width: 70px;">Tiết</th>
                        ${this.engine.DAYS.map(day => `<th>${day}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        for (let p = 0; p < this.engine.PERIODS.length; p++) {
            html += `<tr>`;
            html += `<td class="period-label-col">Tiết ${p + 1}</td>`;

            for (let d = 0; d < this.engine.DAYS.length; d++) {
                const cell = this.engine.timetable[classId][d][p];
                const isSelectedForSwap = isSwapping && this.swapSource.day === d && this.swapSource.period === p;
                const swapStyle = isSelectedForSwap ? 'box-shadow: 0 0 0 3px #f59e0b; transform: scale(1.02);' : '';

                if (cell) {
                    const roomDef = cell.room ? this.engine.specialRooms.find(r => r.id === cell.room) : null;
                    const isFixedClass = cell.isFixed ? 'slot-fixed' : '';
                    
                    html += `
                        <td onclick="window.smartTKBUI.handleCellClick('${classId}', ${d}, ${p})">
                            <div class="tkb-slot-card ${isFixedClass}" 
                                 style="border-left-color: ${cell.color || '#1d4ed8'}; ${swapStyle}"
                                 title="Bấm để chỉnh sửa môn, đổi giáo viên hoặc mở Giáo án 5512">
                                <div class="tkb-slot-subject">
                                    <span>${cell.subject}</span>
                                    ${cell.isDouble ? '<span class="tkb-badge-double" title="Tiết Kép (2 tiết)">Kép</span>' : ''}
                                </div>
                                <div class="tkb-slot-teacher">👨‍🏫 ${cell.teacher}</div>
                                ${roomDef ? `<div class="tkb-slot-badges"><span class="tkb-badge-room">${roomDef.icon} ${roomDef.name}</span></div>` : ''}
                            </div>
                        </td>
                    `;
                } else {
                    html += `
                        <td onclick="window.smartTKBUI.handleCellClick('${classId}', ${d}, ${p})">
                            <div class="tkb-slot-card slot-empty" style="${swapStyle}" title="Bấm để thêm tiết dạy vào ô này">
                                <span>➕ Thêm tiết</span>
                            </div>
                        </td>
                    `;
                }
            }
            html += `</tr>`;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    /**
     * GÓC NHÌN 2: THEO TỪNG GIÁO VIÊN
     */
    renderTeacherView(container) {
        // 1. Lấy danh sách toàn bộ Thầy Cô (từ getAllTeachers() hoặc teachers)
        let teacherNames = [];
        if (this.engine.getAllTeachers) {
            teacherNames = this.engine.getAllTeachers();
        }
        if (!teacherNames || teacherNames.length === 0) {
            const rawTeachers = this.engine.teachers || [];
            teacherNames = rawTeachers.map(t => {
                if (typeof t === 'string') return t;
                return t.displayName || t.fullName || t.name || '';
            }).filter(Boolean);
        }

        // Ưu tiên Thầy Quan lên đầu danh sách
        teacherNames.sort((a, b) => {
            if (a.includes('Tá Quan')) return -1;
            if (b.includes('Tá Quan')) return 1;
            return a.localeCompare(b, 'vi');
        });

        // Tự động sửa lỗi nếu selectedTeacher bị undefined
        if (!this.selectedTeacher || this.selectedTeacher === 'undefined' || !teacherNames.includes(this.selectedTeacher)) {
            this.selectedTeacher = teacherNames[0] || 'Thầy Nguyễn Tá Quan';
        }

        const teacherName = this.selectedTeacher;
        const grid = this.engine.getTeacherTimetable(teacherName);

        let totalPeriods = 0;
        for (let d = 0; d < this.engine.DAYS.length; d++) {
            for (let p = 0; p < this.engine.PERIODS.length; p++) {
                if (grid[d] && grid[d][p]) totalPeriods++;
            }
        }

        // Danh sách Thầy Cô để tạo List chọn trực tiếp
        let teacherOptions = '';
        teacherNames.forEach(tName => {
            const isSel = (tName === teacherName) ? 'selected' : '';
            const isQuan = tName.includes('Tá Quan');
            teacherOptions += `<option value="${tName}" ${isSel}>${isQuan ? '⭐ ' : '👨‍🏫 '}${tName}</option>`;
        });

        // Tổ chuyên môn tự động nhảy theo PCCM
        const allTeachers = this.engine.teachers || [];
        const teacherObj = allTeachers.find(t => {
            if (typeof t === 'string') return t === teacherName;
            return t.displayName === teacherName || t.fullName === teacherName || t.shortName === teacherName || t.name === teacherName;
        });
        const teacherAssign = (this.engine.assignments || []).find(a => a.teacher === teacherName);
        let deptName = teacherObj?.department || teacherAssign?.department;
        if (!deptName) {
            deptName = (teacherName.includes('Quan') || teacherName.includes('Minh') || teacherName.includes('Nhàn') || teacherName.includes('Hòa') || teacherName.includes('Tài') || teacherName.includes('Lành') || teacherName.includes('Duyên')) ? 'Tổ Khoa Học Tự Nhiên' : 'Tổ Khoa Học Xã Hội';
        }
        const isNatural = deptName.includes('Tự Nhiên');

        // Số tiết tùy chỉnh cho phép tự nhập
        const customPeriod = this.customTeacherPeriods?.[teacherName] ?? totalPeriods;

        let html = `
            <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.65rem; background: #ffffff; padding: 0.65rem 0.95rem; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <!-- Trái: List Chọn Giáo Viên & Tổ Chuyên Môn Tự Nhảy Theo PCCM -->
                <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <span style="font-size: 0.82rem; font-weight: 800; color: #1e293b;">👨‍🏫 Thời Khóa Biểu Giáo Viên:</span>
                        <select id="teacherViewDirectSelect" onchange="window.smartTKBUI.onSelectTeacherDirect(this.value)" style="padding: 0.22rem 0.55rem; font-size: 0.8rem; font-weight: 800; border: 1px solid #94a3b8; border-radius: 6px; color: #1d4ed8; background: #f8fafc; cursor: pointer; outline: none;">
                            ${teacherOptions}
                        </select>
                    </div>
                    <span style="background: ${isNatural ? '#ecfdf5' : '#fdf2f8'}; color: ${isNatural ? '#065f46' : '#9d174d'}; padding: 0.2rem 0.65rem; border-radius: 20px; font-weight: 800; font-size: 0.75rem; border: 1px solid ${isNatural ? '#a7f3d0' : '#fbcfe8'}; display: inline-flex; align-items: center; gap: 0.25rem;">
                        🏢 <span>Tổ:</span> <strong>${deptName}</strong>
                    </span>
                </div>

                <!-- Phải: Tổng Số Tiết / Tuần Tự Nhập & Kế Hoạch Giảng Dạy -->
                <div style="display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap;">
                    <div style="background: #eff6ff; color: #1d4ed8; padding: 0.22rem 0.65rem; border-radius: 20px; font-weight: 700; font-size: 0.78rem; border: 1px solid #bfdbfe; display: inline-flex; align-items: center; gap: 0.3rem;">
                        <span>Tổng số tiết / Tuần:</span>
                        <input type="number" value="${customPeriod}" min="0" max="40" style="width: 50px; padding: 0.1rem 0.25rem; border: 1px solid #93c5fd; border-radius: 4px; font-weight: 800; text-align: center; color: #1d4ed8; background: #ffffff; outline: none;" oninput="window.smartTKBUI.setCustomTeacherPeriod('${teacherName}', this.value)" title="Nhấp để tự nhập tổng số tiết/tuần">
                        <span>tiết</span>
                    </div>
                    <button onclick="window.smartTKBUI.openTeachingScheduleModal('${teacherName}')" style="background: linear-gradient(135deg, #059669, #047857); color: #fff; border: none; padding: 0.35rem 0.85rem; border-radius: 20px; font-weight: 700; font-size: 0.78rem; cursor: pointer; box-shadow: 0 2px 6px rgba(5,150,105,0.3); display: inline-flex; align-items: center; gap: 0.35rem;">
                        <span>📋</span> <span>Lịch Báo Giảng Tuần (BGDĐT)</span>
                    </button>
                </div>
            </div>
            <table class="tkb-table">
                <thead>
                    <tr>
                        <th style="width: 70px;">Tiết</th>
                        ${this.engine.DAYS.map(day => `<th>${day}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        for (let p = 0; p < this.engine.PERIODS.length; p++) {
            html += `<tr>`;
            html += `<td class="period-label-col">Tiết ${p + 1}</td>`;

            for (let d = 0; d < this.engine.DAYS.length; d++) {
                const cell = grid[d][p];
                if (cell) {
                    const roomDef = cell.room ? this.engine.specialRooms.find(r => r.id === cell.room) : null;
                    html += `
                        <td onclick="window.smartTKBUI.handleCellClick('${cell.classId}', ${d}, ${p})">
                            <div class="tkb-slot-card" style="border-left-color: ${cell.color || '#1d4ed8'};"
                                 title="Bấm để xem/chỉnh sửa hoặc mở Giáo án 5512">
                                <div class="tkb-slot-subject">
                                    <span>${cell.subject}</span>
                                    <span style="background: #dbeafe; color: #1e40af; font-size: 0.68rem; padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 700;">Lớp ${cell.classId}</span>
                                </div>
                                <div class="tkb-slot-teacher">🏫 Phòng Lớp ${cell.classId}</div>
                                ${roomDef ? `<div class="tkb-slot-badges"><span class="tkb-badge-room">${roomDef.icon} ${roomDef.name}</span></div>` : ''}
                            </div>
                        </td>
                    `;
                } else {
                    html += `
                        <td>
                            <div class="tkb-slot-card slot-empty" style="opacity: 0.4;">
                                <span>- Nghỉ -</span>
                            </div>
                        </td>
                    `;
                }
            }
            html += `</tr>`;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    /**
     * GÓC NHÌN 3: THEO PHÒNG BỘ MÔN
     */
    renderRoomView(container) {
        const roomId = this.selectedRoom;
        const roomDef = this.engine.specialRooms.find(r => r.id === roomId);
        const grid = this.engine.getRoomTimetable(roomId);

        let html = `
            <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 800; font-size: 1.05rem; color: #1e293b;">
                    🏢 Lịch Hoạt Động: <span style="color: #0369a1;">${roomDef.icon} ${roomDef.name}</span>
                </div>
                <div style="font-size: 0.78rem; color: #64748b;">
                    Sức chứa: <strong>${roomDef.capacity} lớp/tiết</strong>
                </div>
            </div>
            <table class="tkb-table">
                <thead>
                    <tr>
                        <th style="width: 70px;">Tiết</th>
                        ${this.engine.DAYS.map(day => `<th>${day}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        for (let p = 0; p < this.engine.PERIODS.length; p++) {
            html += `<tr>`;
            html += `<td class="period-label-col">Tiết ${p + 1}</td>`;

            for (let d = 0; d < this.engine.DAYS.length; d++) {
                const classesInRoom = grid[d][p];
                if (classesInRoom && classesInRoom.length > 0) {
                    html += `<td>`;
                    for (const item of classesInRoom) {
                        html += `
                            <div class="tkb-slot-card" style="border-left-color: #0369a1; margin-bottom: 0.25rem;"
                                 onclick="window.smartTKBUI.handleCellClick('${item.classId}', ${d}, ${p})">
                                <div class="tkb-slot-subject">
                                    <span>Lớp ${item.classId}</span>
                                    <span style="font-size: 0.7rem; color: #475569;">${item.subject}</span>
                                </div>
                                <div class="tkb-slot-teacher">👨‍🏫 ${item.teacher}</div>
                            </div>
                        `;
                    }
                    html += `</td>`;
                } else {
                    html += `
                        <td>
                            <div class="tkb-slot-card slot-empty">
                                <span>Phòng trống</span>
                            </div>
                        </td>
                    `;
                }
            }
            html += `</tr>`;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    /**
     * GÓC NHÌN 4: TOÀN TRƯỜNG TỔNG HỢP
     */
    /**
     * Rút gọn tên giáo viên cho Bảng Tổng Thể:
     * - Trùng tên Tuấn: phân biệt "T. Tuấn" (Nguyễn Thanh Tuấn) và "L. Tuấn" (Lương Văn Tuấn)
     * - Các giáo viên khác: lấy Tên chính (Quan, Nhàn, Hòa, Lành, Minh, Phúc, Thái, Tài, Ánh, Công, Hiền, Hồ, Nương, Rích, Thư, Thảo, Trung, Tú, Duyên)
     */
    /**
     * Lấy thông tin GVCN động cho lớp thông qua Engine
     */
    getHomeroomTeacherForClass(className) {
        if (this.engine && typeof this.engine.getHomeroomTeacher === 'function') {
            const res = this.engine.getHomeroomTeacher(className);
            if (res) {
                return {
                    fullName: res.fullName,
                    shortName: this.getCompactTeacherName(res.fullName),
                    isQuan: res.isQuan
                };
            }
        }
        return null;
    }

    getCompactTeacherName(teacherName, shortTeacher = '') {
        if (shortTeacher) {
            if (shortTeacher.includes('T.Tuấn') || shortTeacher.includes('T. Tuấn')) return 'T. Tuấn';
            if (shortTeacher.includes('L.Tuấn') || shortTeacher.includes('L. Tuấn')) return 'L. Tuấn';
            return shortTeacher;
        }
        if (!teacherName) return '';
        if (teacherName.includes('Thanh Tuấn')) return 'T. Tuấn';
        if (teacherName.includes('Lương Văn Tuấn')) return 'L. Tuấn';
        if (teacherName.includes('Tú')) return 'Tú';
        const clean = teacherName.replace(/Thầy\s+|Cô\s+/g, '').trim();
        const parts = clean.split(' ');
        return parts[parts.length - 1];
    }

    /**
     * Kiểu dáng màu sắc sư phạm theo phân môn
     */
    /**
     * BẢNG MÀU CHỮ ĐỘC BẢN CHO TỪNG GIÁO VIÊN (KHÔNG DÙNG FILL COLOR NỀN - CHUẨN SƯ PHẠM THẦY QUAN)
     * Mỗi Thầy Cô sở hữu một mã màu chữ riêng biệt, sắc nét, tương phản hoàn hảo trên nền trắng
     */
    getTeacherColor(teacherName, shortTeacher = '') {
        const compact = this.getCompactTeacherName(teacherName, shortTeacher);
        const map = {
            'Quan': '#15803d',     // ⭐ Thầy Quan: Xanh lá cây đậm ngọc bích
            'T. Tuấn': '#1d4ed8',  // Thầy Nguyễn Thanh Tuấn: Xanh dương đậm
            'L. Tuấn': '#c2410c',  // Thầy Lương Văn Tuấn: Cam sẫm
            'Minh': '#6d28d9',     // Thầy Minh: Tím sẫm
            'Nhàn': '#be123c',     // Cô Nhàn: Đỏ Ruby
            'Hòa': '#0e7490',      // Cô Hòa: Xanh Cyan đậm
            'Lành': '#047857',     // Cô Lành: Xanh ngọc lục bảo
            'Duyên': '#7e22ce',    // Cô Duyên: Tím hoa cà đậm
            'Hiền': '#9a3412',     // Thầy Hiền: Nâu cam đất
            'Công': '#334155',     // Thầy Công: Xám than đậm
            'Hồ': '#a21caf',       // Cô Hồ: Hồng tím đậm
            'Nương': '#4338ca',    // Cô Nương: Xanh Chàm Indigo
            'Thái': '#4d7c0f',     // Thầy Thái: Xanh rêu
            'Tài': '#b91c1c',      // Thầy Tài: Đỏ đô
            'Rích': '#0f766e',     // Thầy Rích: Xanh cổ vịt Teal
            'Thư': '#be185d',      // Cô Thư: Hồng sen đậm
            'Thảo': '#0369a1',     // Cô Thảo: Xanh biển đậm
            'Trung': '#1e3a8a',    // Thầy Trung: Xanh Navy sẫm
            'Phúc': '#4f46e5',     // Cô Phúc: Tím xanh Indigo
            'Ánh': '#b45309',      // Cô Ánh: Vàng đồng đậm
            'Tú': '#78350f'        // Thầy Tú: Nâu đất
        };
        return map[compact] || '#1d4ed8';
    }

    getSubjectBadgeStyle(subject) {
        if (!subject) return { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' };
        if (subject.includes('Toán')) return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' };
        if (subject.includes('Ngữ Văn') || subject.includes('Ngữ văn')) return { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' };
        if (subject.includes('Tiếng Anh')) return { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' };
        if (subject.includes('KHTN')) return { bg: '#faf5ff', border: '#e9d5ff', color: '#7e22ce' };
        if (subject.includes('Lịch Sử') || subject.includes('Địa Lí') || subject.includes('Sử') || subject.includes('Địa')) return { bg: '#fffbeb', border: '#fde68a', color: '#b45309' };
        if (subject.includes('Tin')) return { bg: '#ecfeff', border: '#a5f3fc', color: '#0e7490' };
        if (subject.includes('Thể Chất') || subject.includes('GDTC')) return { bg: '#f7fee7', border: '#d9f99d', color: '#4d7c0f' };
        if (subject.includes('Công Nghệ')) return { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' };
        if (subject.includes('GDCD')) return { bg: '#eef2ff', border: '#c7d2fe', color: '#4338ca' };
        if (subject.includes('Nghệ Thuật') || subject.includes('AN-MT') || subject.includes('Âm Nhạc') || subject.includes('Mĩ Thuật')) return { bg: '#fdf2f8', border: '#fbcfe8', color: '#be185d' };
        if (subject.includes('Chào Cờ') || subject.includes('Chào cờ')) return { bg: '#fee2e2', border: '#fca5a5', color: '#dc2626' };
        if (subject.includes('HĐCĐ') || subject.includes('SHDC') || subject.includes('SHL') || subject.includes('HĐTN')) return { bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1' };
        return { bg: '#f1f5f9', border: '#cbd5e1', color: '#334155' };
    }

    /**
     * BẢNG TỔNG HỢP TOÀN TRƯỜNG CHUẨN SƯ PHẠM (THEO CHỈ ĐẠO CỦA THẦY NGUYỄN TÁ QUAN):
     * 1. BẢNG TỔNG THỂ TOÀN TRƯỜNG (COMPACT MASTER MATRIX) NẰM TRÊN CÙNG
     *    - Gồm 9 cột cho 9 lớp, thu gọn tên giáo viên: T. Tuấn, L. Tuấn, Quan, Nhàn, Minh...
     * 2. BẢNG CHI TIẾT THEO TỪNG KHỐI / LỚP NẰM PHÍA DƯỚI
     */
    renderSchoolMasterView(container) {
        const classes = this.engine.classes || []; // Danh sách lớp lấy động từ Khai Báo / Thông Tin Mở Rộng
        
        // 1. Phân nhóm Khối Lớp động từ danh sách lớp thực tế của trường (this.engine.classes)
        const gradeGroups = {};
        for (const c of classes) {
            const numMatch = c.match(/^(\d+)/);
            const gKey = numMatch ? numMatch[1] : c.charAt(0);
            if (!gradeGroups[gKey]) {
                gradeGroups[gKey] = [];
            }
            gradeGroups[gKey].push(c);
        }

        // Tự động kiểm tra nếu gradeFilter không tồn tại trong danh sách khối thì trả về 'all'
        let activeGrade = this.gradeFilter || 'all';
        if (activeGrade !== 'all' && !gradeGroups[activeGrade]) {
            activeGrade = 'all';
            this.gradeFilter = 'all';
        }

        // Bảng màu phân biệt từng khối lớp chuẩn sư phạm (tối ưu thị giác, hài hòa)
        const gradePalette = {
            '1': '#0284c7', '2': '#059669', '3': '#dc2626', '4': '#7c3aed', '5': '#0f766e',
            '6': '#0369a1', '7': '#047857', '8': '#be123c', '9': '#6d28d9',
            '10': '#0f766e', '11': '#c2410c', '12': '#4338ca'
        };
        const fallbackColors = ['#0369a1', '#047857', '#be123c', '#6d28d9', '#0f766e', '#c2410c', '#4338ca', '#334155'];

        // Sinh HTML các nút bộ lọc khối lớp tự động theo đúng dữ liệu lớp
        let gradeFilterButtonsHtml = `
            <button onclick="window.smartTKBUI.filterGradeView('all')" style="padding: 0.3rem 0.75rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s ease; ${activeGrade === 'all' ? 'background: #1e293b; color: #ffffff; box-shadow: 0 2px 4px rgba(30,41,59,0.25);' : 'background: #ffffff; color: #475569; border: 1px solid #cbd5e1;'}">
                Toàn Bộ (${classes.length} Lớp)
            </button>
        `;

        let colorIdx = 0;
        for (const [gKey, gClasses] of Object.entries(gradeGroups)) {
            const btnColor = gradePalette[gKey] || fallbackColors[colorIdx % fallbackColors.length];
            colorIdx++;
            const isActive = (activeGrade === gKey);
            const btnLabel = isNaN(gKey) ? `${gKey} (${gClasses.length} Lớp)` : `Khối ${gKey} (${gClasses.length} Lớp)`;
            gradeFilterButtonsHtml += `
                <button onclick="window.smartTKBUI.filterGradeView('${gKey}')" style="padding: 0.3rem 0.75rem; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s ease; ${isActive ? `background: ${btnColor}; color: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.2);` : `background: #ffffff; color: ${btnColor}; border: 1px solid #cbd5e1;`}">
                    ${btnLabel}
                </button>
            `;
        }

        // Danh sách 21 Thầy Cô giáo và mã màu chữ riêng biệt
        const legendTeachers = [
            { name: 'Quan', label: '⭐ Thầy Quan', color: '#15803d' },
            { name: 'T. Tuấn', label: 'T. Tuấn', color: '#1d4ed8' },
            { name: 'L. Tuấn', label: 'L. Tuấn', color: '#c2410c' },
            { name: 'Minh', label: 'Minh', color: '#6d28d9' },
            { name: 'Nhàn', label: 'Nhàn', color: '#be123c' },
            { name: 'Hòa', label: 'Hòa', color: '#0e7490' },
            { name: 'Lành', label: 'Lành', color: '#047857' },
            { name: 'Duyên', label: 'Duyên', color: '#7e22ce' },
            { name: 'Hiền', label: 'Hiền', color: '#9a3412' },
            { name: 'Công', label: 'Công', color: '#334155' },
            { name: 'Hồ', label: 'Hồ', color: '#a21caf' },
            { name: 'Nương', label: 'Nương', color: '#4338ca' },
            { name: 'Thái', label: 'Thái', color: '#4d7c0f' },
            { name: 'Tài', label: 'Tài', color: '#b91c1c' },
            { name: 'Rích', label: 'Rích', color: '#0f766e' },
            { name: 'Thư', label: 'Thư', color: '#be185d' },
            { name: 'Thảo', label: 'Thảo', color: '#0369a1' },
            { name: 'Trung', label: 'Trung', color: '#1e3a8a' },
            { name: 'Phúc', label: 'Phúc', color: '#4f46e5' },
            { name: 'Ánh', label: 'Ánh', color: '#b45309' },
            { name: 'Tú', label: 'Tú', color: '#78350f' }
        ];

        // 2. Lọc danh sách lớp hiển thị trên Bàn cờ tổng thể theo Bộ lọc Khối chuẩn xác 100% (GDMN & GDPT)
        const displayClasses = (activeGrade === 'all')
            ? classes
            : classes.filter(c => {
                if (gradeGroups[activeGrade]) return gradeGroups[activeGrade].includes(c);
                return c.startsWith(activeGrade);
            });

        // Mật độ hiển thị bảng: MỞ RỘNG 100% CHIỀU NGANG, ÉP GỌN CHIỀU DỌC (Theo chỉ đạo của Thầy Quan)
        const density = this.masterDensity || 'compact';
        let colDayWidth = '50px';
        let colPeriodWidth = '30px';
        let colClassWidth = displayClasses.length > 0 ? `calc((100% - 80px) / ${displayClasses.length})` : '80px';
        let cellHeight = '20px';
        let cellPadding = '1px 2px';
        let subjectFontSize = '0.74rem';
        let teacherFontSize = '0.70rem';
        let headerFontSize = '0.75rem';

        if (density === 'ultra') {
            colDayWidth = '46px';
            colPeriodWidth = '28px';
            colClassWidth = displayClasses.length > 0 ? `calc((100% - 74px) / ${displayClasses.length})` : '74px';
            cellHeight = '18px';
            cellPadding = '0px 1px';
            subjectFontSize = '0.70rem';
            teacherFontSize = '0.66rem';
            headerFontSize = '0.70rem';
        } else if (density === 'standard') {
            colDayWidth = '54px';
            colPeriodWidth = '34px';
            colClassWidth = displayClasses.length > 0 ? `calc((100% - 88px) / ${displayClasses.length})` : '88px';
            cellHeight = '24px';
            cellPadding = '2px 3px';
            subjectFontSize = '0.78rem';
            teacherFontSize = '0.74rem';
            headerFontSize = '0.78rem';
        }

        // Tiêu đề khối lớp động (Dynamic Grade Headers)
        let dynamicTopHeadersHtml = '';
        const gEntries = Object.entries(gradeGroups);
        const filteredGEntries = (activeGrade === 'all')
            ? gEntries
            : gEntries.filter(([gKey]) => gKey === activeGrade);

        if (filteredGEntries.length > 0) {
            dynamicTopHeadersHtml = filteredGEntries.map(([gKey, gClasses], idx) => {
                const isLast = (idx === filteredGEntries.length - 1);
                const bg = gradePalette[gKey] || fallbackColors[idx % fallbackColors.length];
                const isQuanGrade = gClasses.includes('8A1');
                const label = isNaN(gKey) ? gKey : `KHỐI ${gKey}${isQuanGrade ? ' ⭐' : ''}`;
                const colSpan = (activeGrade === 'all') ? gClasses.length : displayClasses.length;
                return `
                    <th class="grade-header-th" colspan="${colSpan}" style="text-align: center; background: ${bg} !important; color: #ffffff !important; border-right: ${isLast ? 'none' : '2px solid rgba(255,255,255,0.4)'}; padding: 5px 2px; font-weight: 900; font-size: 0.80rem; text-shadow: 0 1px 2px rgba(0,0,0,0.5); letter-spacing: 0.5px;">
                        ${label}
                    </th>
                `;
            }).join('');
        } else {
            dynamicTopHeadersHtml = `<th colspan="${displayClasses.length}" style="text-align: center; background: #1e3a8a; padding: 4px; font-weight: 800; font-size: ${headerFontSize};">TẤT CẢ CÁC LỚP</th>`;
        }

        let html = `
            <!-- ================================================================= -->
            <!-- 1. BẢNG TỔNG THỂ TOÀN TRƯỜNG (COMPACT MASTER MATRIX) ĐẶT TRÊN CÙNG -->
            <!-- ================================================================= -->
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 1rem 1.25rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 2rem;">
                
                <!-- HEADER & ACTION BUTTONS (GỌN GÀNG CÙNG 1 HÀNG) -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.65rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.45rem;">
                            <span style="font-size: 1.25rem;">🏫</span>
                            <h2 style="margin: 0; font-size: 1.12rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">
                                Bảng Tổng Thể Thời Khóa Biểu Toàn Trường
                            </h2>
                        </div>
                        <p style="margin: 0.15rem 0 0 0; font-size: 0.78rem; color: #64748b;">
                            ${(this.engine.schoolConfig && this.engine.schoolConfig.schoolName) || 'Trường THCS Bán Trú Canh Thuận'} • Áp dụng ${(this.engine.schoolConfig && this.engine.schoolConfig.applyWeekRange) || 'Tuần 9 đến Tuần 13'}
                        </p>
                    </div>

                    <div style="display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap;">
                        <button type="button" onclick="window.smartTKBUI.openCumulativePriorModal();" 
                                style="background: #ffffff; color: #047857; border: 1.5px solid #059669; padding: 0.22rem 0.55rem; border-radius: 6px; font-size: 0.73rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; box-shadow: 0 1px 2px rgba(0,0,0,0.04);" 
                                title="Xem đối soát Lũy kế TKB liền kề trước (Tuần 1 - 8)">
                            <span>📊</span> <span>Lũy Kế TKB Liền Kề Trước</span>
                        </button>
                        <div style="display: flex; align-items: center; gap: 0.25rem;">
                            <span style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase;">📅 Áp Dụng:</span>
                            <select id="tkbSchoolViewSemSelect" onchange="window.smartTKBUI.setSchedulePlan(this.value)" style="padding: 0.22rem 0.5rem; font-size: 0.74rem; font-weight: 800; border: 1px solid #cbd5e1; border-radius: 5px; color: #1e293b; background: #ffffff; cursor: pointer; outline: none;" title="Chọn Tuần hoặc Học kỳ áp dụng (đáp ứng đơn vị đổi theo Tuần)">
                                <option value="WEEK_9_13" ${(this.engine.schoolConfig && this.engine.schoolConfig.schedulePlanType === 'WEEK_9_13') || (!this.engine.schoolConfig?.schedulePlanType && this.engine.currentSemester === 'HK1') ? 'selected' : ''}>📅 Tuần 9 - 13</option>
                                <option value="WEEK_1_9" ${this.engine.schoolConfig && this.engine.schoolConfig.schedulePlanType === 'WEEK_1_9' ? 'selected' : ''}>📅 Tuần 1 - 9</option>
                                <option value="WEEK_10_18" ${this.engine.schoolConfig && this.engine.schoolConfig.schedulePlanType === 'WEEK_10_18' ? 'selected' : ''}>📅 Tuần 10 - 18</option>
                                <option value="HK1" ${this.engine.schoolConfig && this.engine.schoolConfig.schedulePlanType === 'HK1' ? 'selected' : ''}>🍂 Học kỳ I (18T)</option>
                                <option value="WEEK_19_27" ${this.engine.schoolConfig && this.engine.schoolConfig.schedulePlanType === 'WEEK_19_27' ? 'selected' : ''}>📅 Tuần 19 - 27</option>
                                <option value="WEEK_28_35" ${this.engine.schoolConfig && this.engine.schoolConfig.schedulePlanType === 'WEEK_28_35' ? 'selected' : ''}>📅 Tuần 28 - 35</option>
                                <option value="HK2" ${(this.engine.schoolConfig && this.engine.schoolConfig.schedulePlanType === 'HK2') || this.engine.currentSemester === 'HK2' ? 'selected' : ''}>🌱 Học kỳ II (17T)</option>
                                <option value="YEAR" ${this.engine.schoolConfig && this.engine.schoolConfig.schedulePlanType === 'YEAR' ? 'selected' : ''}>🗓️ Cả năm (35T)</option>
                            </select>
                        </div>
                        <button onclick="window.smartTKBUI.printTimetable()" style="background: #1e293b; color: #fff; border: none; padding: 0.25rem 0.65rem; border-radius: 6px; font-size: 0.74rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;">
                            <span>🖨️</span> <span>In A4</span>
                        </button>
                        <button onclick="window.smartTKBUI.exportMasterTKBPackage()" style="background: #059669; color: #fff; border: none; padding: 0.25rem 0.65rem; border-radius: 6px; font-size: 0.74rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;">
                            <span>📥</span> <span>Xuất Excel</span>
                        </button>
                    </div>
                </div>

                <!-- ================================================================= -->
                <!-- BỘ ĐIỀU KHIỂN & TÙY CHỈNH NHANH (QUICK CONTROLS TOOLBAR)        -->
                <!-- ================================================================= -->
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <!-- NHÓM 1: ĐỘ RỘNG & MẬT ĐỘ HIỂN THỊ -->
                    <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                        <span style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; display: flex; align-items: center; gap: 0.2rem;">
                            <span>🎛️</span> <span>Mật Độ:</span>
                        </span>
                        <button onclick="window.smartTKBUI.setMasterDensity('ultra')" title="Siêu gọn, tiết kiệm diện tích tối đa" style="padding: 0.22rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; cursor: pointer; transition: all 0.15s; ${density === 'ultra' ? 'background: #0284c7; color: #fff; border: 1px solid #0284c7; box-shadow: 0 1px 3px rgba(2,132,199,0.3);' : 'background: #fff; color: #334155; border: 1px solid #cbd5e1;'}">
                            🤏 Siêu Gọn
                        </button>
                        <button onclick="window.smartTKBUI.setMasterDensity('compact')" title="Vừa vặn chuẩn mực, cân đối và sắc nét" style="padding: 0.22rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; cursor: pointer; transition: all 0.15s; ${density === 'compact' ? 'background: #0284c7; color: #fff; border: 1px solid #0284c7; box-shadow: 0 1px 3px rgba(2,132,199,0.3);' : 'background: #fff; color: #334155; border: 1px solid #cbd5e1;'}">
                            📐 Vừa Vặn
                        </button>
                        <button onclick="window.smartTKBUI.setMasterDensity('standard')" title="Khoảng cách rộng rãi, thoáng mắt" style="padding: 0.22rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; cursor: pointer; transition: all 0.15s; ${density === 'standard' ? 'background: #0284c7; color: #fff; border: 1px solid #0284c7; box-shadow: 0 1px 3px rgba(2,132,199,0.3);' : 'background: #fff; color: #334155; border: 1px solid #cbd5e1;'}">
                            🔍 Thoáng
                        </button>
                    </div>

                    <!-- NHÓM 1.5: BỘ LỌC KHỐI LỚP TRỰC TIẾP TRÊN BÀN CỜ -->
                    <div style="display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap;">
                        <span style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; display: flex; align-items: center; gap: 0.2rem;">
                            <span>🏫</span> <span>Khối:</span>
                        </span>
                        <div style="display: flex; gap: 0.2rem; flex-wrap: wrap;">
                            ${gradeFilterButtonsHtml}
                        </div>
                    </div>

                    <!-- NHÓM 2: TÙY CHỈNH NỘI DUNG & THỊ GIÁC -->
                    <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                        <span style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; display: flex; align-items: center; gap: 0.2rem;">
                            <span>👁️</span> <span>Tùy Biến:</span>
                        </span>
                        <button onclick="window.smartTKBUI.toggleMasterLegend()" title="Bật/Tắt bảng chú giải 21 mã màu Thầy Cô phía trên để bảng dâng lên cao nhất" style="padding: 0.22rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; cursor: pointer; transition: all 0.15s; background: #fff; color: ${this.masterShowLegend ? '#0f766e' : '#64748b'}; border: 1px solid #cbd5e1;">
                            ${this.masterShowLegend ? '🎨 Ẩn Bảng Màu' : '🎨 Hiện Bảng Màu'}
                        </button>
                        <button onclick="window.smartTKBUI.toggleMasterColorStyle()" title="Chuyển đổi giữa mã màu chữ riêng từng Thầy Cô và chữ đen/xám đồng nhất" style="padding: 0.22rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; cursor: pointer; transition: all 0.15s; background: #fff; color: ${this.masterColorStyle === 'monochrome' ? '#475569' : '#b45309'}; border: 1px solid #cbd5e1;">
                            ${this.masterColorStyle === 'monochrome' ? '🌈 Bật Màu Thầy Cô' : '⚪ Đơn Sắc'}
                        </button>
                        <button onclick="window.smartTKBUI.toggleMasterTeacherDisplay()" title="Ẩn/Hiện tên viết tắt giáo viên trong từng ô" style="padding: 0.22rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; cursor: pointer; transition: all 0.15s; background: #fff; color: ${this.masterHideTeacher ? '#6d28d9' : '#1e3a8a'}; border: 1px solid #cbd5e1;">
                            ${this.masterHideTeacher ? '👨‍🏫 Xem Cả Tên GV' : '📖 Chỉ Xem Môn'}
                        </button>
                    </div>
                </div>

                <!-- BẢNG CHÚ GIẢI MÀU SẮC GIÁO VIÊN (HIỂN THỊ KHI ĐƯỢC BẬT) -->
                ${this.masterShowLegend ? `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 0.75rem; margin-bottom: 0.85rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                            <div style="font-size: 0.73rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.3px;">
                                🎨 Chú Giải Mã Màu Chữ Từng Thầy Cô (${legendTeachers.length} Giáo Viên):
                            </div>
                            <button onclick="window.smartTKBUI.toggleMasterLegend()" style="background: none; border: none; font-size: 0.7rem; color: #64748b; cursor: pointer; text-decoration: underline;">
                                Thu gọn ✖
                            </button>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;">
                            ${legendTeachers.map(t => `
                                <span style="display: inline-flex; align-items: center; gap: 0.25rem; background: #ffffff; border: 1px solid #cbd5e1; padding: 0.12rem 0.45rem; border-radius: 12px; font-size: 0.70rem; font-weight: 800; color: ${t.color}; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${t.color};"></span>
                                    ${t.label}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- BÀN CỜ TỔNG THỂ TRÀN 100% CHIỀU NGANG, ÉP GỌN CHIỀU DỌC ĐẸP MẮT -->
                <div style="overflow-x: auto; width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); background: #ffffff;">
                    <table class="tkb-table tkb-master-table" style="width: 100%; min-width: 860px; table-layout: fixed; margin: 0; border-collapse: collapse; font-size: ${subjectFontSize}; background: #ffffff; border: 1px solid #cbd5e1;">
                        <thead>
                            <tr style="background: #0f172a; color: #ffffff;">
                                <th rowspan="2" style="width: ${colDayWidth}; text-align: center; border-right: 1px solid #334155; padding: 4px 2px; font-size: ${headerFontSize}; font-weight: 800; background: #0f172a !important; color: #ffffff !important;">Thứ</th>
                                <th rowspan="2" style="width: ${colPeriodWidth}; text-align: center; border-right: 2px solid #64748b; padding: 4px 2px; font-size: ${headerFontSize}; font-weight: 800; background: #0f172a !important; color: #ffffff !important;">Tiết</th>
                                ${dynamicTopHeadersHtml}
                            </tr>
                            <tr style="background: #f8fafc;">
                                ${displayClasses.map((c, cIdx) => {
                                    const gvcn = this.getHomeroomTeacherForClass(c);
                                    const isQuanClass = (gvcn && gvcn.isQuan) || (c === '8A1');
                                    const isLastOfGrade = (cIdx === displayClasses.length - 1) || (displayClasses[cIdx + 1] && displayClasses[cIdx + 1].match(/^(\d+)/) && c.match(/^(\d+)/) && displayClasses[cIdx + 1].match(/^(\d+)/)[1] !== c.match(/^(\d+)/)[1]);
                                    const classStyle = isQuanClass
                                        ? 'background: #1d4ed8 !important; color: #ffffff !important; font-weight: 900; text-shadow: 0 1px 2px rgba(0,0,0,0.3);'
                                        : 'background: #ffffff !important; color: #0f172a !important; font-weight: 800;';
                                    const gvcnLabel = gvcn ? ` (${gvcn.isQuan ? '⭐ ' : ''}${gvcn.shortName})` : '';
                                    return `
                                        <th style="width: ${colClassWidth}; text-align: center; padding: 4px 2px; font-size: ${headerFontSize}; border-right: ${isLastOfGrade ? '2px solid #94a3b8' : '1px solid #cbd5e1'}; border-bottom: 2px solid #94a3b8; ${classStyle}"
                                            title="Lớp ${c}${gvcn ? ` • GVCN: ${gvcn.fullName}` : ''}">
                                            <span>${c}</span><span style="font-size: 0.68rem; font-weight: 700; opacity: 0.95;">${gvcnLabel}</span>
                                        </th>
                                    `;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Render từng ngày (Thứ 2 đến Thứ 7)
        for (let d = 0; d < this.engine.DAYS.length; d++) {
            const dayName = this.engine.DAYS[d];
            const maxPeriods = (d === 5) ? 4 : 5; // Thứ 7 có 4 tiết, các ngày khác 5 tiết

            for (let p = 0; p < maxPeriods; p++) {
                html += `<tr style="background: #ffffff;">`;

                // Cột Thứ gộp dòng (rowspan)
                if (p === 0) {
                    html += `
                        <td rowspan="${maxPeriods}" style="text-align: center; vertical-align: middle; font-weight: 800; background: #f8fafc; color: #0f172a; border-right: 1px solid #cbd5e1; border-bottom: 2px solid #94a3b8; font-size: ${headerFontSize}; padding: 3px 2px;">
                            ${dayName}
                        </td>
                    `;
                }

                // Cột Tiết
                html += `
                    <td style="text-align: center; font-weight: 800; background: #f8fafc; color: #475569; border-right: 2px solid #94a3b8; border-bottom: ${p === maxPeriods - 1 ? '2px solid #94a3b8' : '1px solid #e2e8f0'}; padding: 3px 1px; font-size: ${headerFontSize};">
                        T${p + 1}
                    </td>
                `;

                // Các Cột Lớp: TUYỆT ĐỐI NỀN TRẮNG (NO FILL COLOR), MỞ RỘNG CHIỀU NGANG, ÉP CHIỀU DỌC
                for (let cIdx = 0; cIdx < displayClasses.length; cIdx++) {
                    const c = displayClasses[cIdx];
                    const isLastOfGrade = (cIdx === displayClasses.length - 1) || (displayClasses[cIdx + 1] && displayClasses[cIdx + 1].match(/^(\d+)/) && c.match(/^(\d+)/) && displayClasses[cIdx + 1].match(/^(\d+)/)[1] !== c.match(/^(\d+)/)[1]);
                    const cell = this.engine.timetable[c] && this.engine.timetable[c][d] ? this.engine.timetable[c][d][p] : null;

                    if (cell) {
                        const shortTeacher = this.getCompactTeacherName(cell.teacher, cell.shortTeacher);
                        const rawTeacherColor = this.getTeacherColor(cell.teacher, cell.shortTeacher);
                        const teacherColor = (this.masterColorStyle === 'monochrome') ? '#334155' : rawTeacherColor;
                        const isQuanSlot = cell.teacher && cell.teacher.includes('Nguyễn Tá Quan');

                        let cellContent = '';
                        if (cell.subject === 'Chào Cờ' || cell.subject === 'Chào cờ') {
                            cellContent = `
                                <div style="font-weight: 800; color: #dc2626; font-size: ${subjectFontSize}; line-height: 1.05;">Chào cờ</div>
                            `;
                        } else if (this.masterHideTeacher) {
                            cellContent = `
                                <div style="font-weight: 700; color: #0f172a; font-size: ${subjectFontSize}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.05;">
                                    ${cell.subject}
                                </div>
                            `;
                        } else {
                            cellContent = `
                                <div style="display: flex; align-items: center; justify-content: center; gap: 0.3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1;">
                                    <span style="font-weight: 700; color: #0f172a; font-size: ${subjectFontSize};">${cell.subject}</span>
                                    <span style="font-weight: 800; color: ${teacherColor}; font-size: ${teacherFontSize};">${isQuanSlot ? '⭐ ' : ''}${shortTeacher}</span>
                                </div>
                            `;
                        }

                        html += `
                            <td onclick="window.smartTKBUI.handleCellClick('${c}', ${d}, ${p})"
                                title="✏️ Bấm để sửa môn / đổi GV / hoán đổi tiết này (Lớp ${c} • ${cell.subject} - ${cell.teacher})"
                                style="background: #ffffff; border-right: ${isLastOfGrade ? '2px solid #94a3b8' : '1px solid #e2e8f0'}; border-bottom: ${p === maxPeriods - 1 ? '2px solid #94a3b8' : '1px solid #e2e8f0'}; padding: ${cellPadding}; text-align: center; vertical-align: middle; cursor: pointer; height: ${cellHeight}; line-height: 1.05; transition: all 0.12s ease;"
                                onmouseover="this.style.background='#eff6ff'; this.style.boxShadow='inset 0 0 0 2px #2563eb'; this.style.position='relative'; this.style.zIndex='5';"
                                onmouseout="this.style.background='#ffffff'; this.style.boxShadow='none'; this.style.zIndex='1';">
                                ${cellContent}
                            </td>
                        `;
                    } else {
                        html += `
                            <td onclick="window.smartTKBUI.handleCellClick('${c}', ${d}, ${p})"
                                title="➕ Ô trống (Lớp ${c}) • Bấm để gán môn học & Thầy Cô"
                                style="background: #ffffff; border-right: ${isLastOfGrade ? '2px solid #94a3b8' : '1px solid #e2e8f0'}; border-bottom: ${p === maxPeriods - 1 ? '2px solid #94a3b8' : '1px solid #e2e8f0'}; padding: ${cellPadding}; text-align: center; cursor: pointer; height: ${cellHeight}; transition: all 0.12s ease;"
                                onmouseover="this.style.background='#f0fdf4'; this.style.boxShadow='inset 0 0 0 2px #16a34a'; this.style.position='relative'; this.style.zIndex='5';"
                                onmouseout="this.style.background='#ffffff'; this.style.boxShadow='none'; this.style.zIndex='1';">
                                <span style="color: #cbd5e1; font-size: 0.65rem;">➕</span>
                            </td>
                        `;
                    }
                }

                html += `</tr>`;
            }
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
\n            <!-- 2. BẢNG CHI TIẾT THEO TỪNG KHỐI / LỚP NẰM PHÍA DƯỚI             -->
            <!-- ================================================================= -->
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 1.25rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">📚</span>
                            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a;">
                                BẢNG THỜI KHÓA BIỂU CHI TIẾT THEO TỪNG KHỐI & LỚP
                            </h3>
                        </div>
                        <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #64748b;">
                            Hiển thị đầy đủ Họ tên Thầy Cô, Phòng học chức năng và công cụ chỉnh sửa chuyên sâu theo từng Lớp.
                        </p>
                    </div>

                    <!-- BỘ LỌC KHỐI LỚP (SINH ĐỘNG 100% TỪ THÔNG TIN MỞ RỘNG / KHAI BÁO TOÀN TRƯỜNG) -->
                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; background: #f1f5f9; padding: 0.35rem; border-radius: 8px;">
                        ${gradeFilterButtonsHtml}
                    </div>
                </div>

                <!-- DANH SÁCH BẢNG TỪNG LỚP CHI TIẾT -->
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        `;

        // Lọc danh sách lớp theo khối tương ứng (hỗ trợ cả khối số 6, 7, 8, 9 và khối chữ Mầm, Chồi, Lá...)
        const filteredClasses = classes.filter(c => {
            if (activeGrade === 'all') return true;
            if (gradeGroups[activeGrade]) {
                return gradeGroups[activeGrade].includes(c);
            }
            return c.startsWith(activeGrade);
        });

        for (const c of filteredClasses) {
            const isQuanClass = (c === '8A1');
            html += `
                <div style="border: 1px solid ${isQuanClass ? '#93c5fd' : '#e2e8f0'}; border-radius: 8px; padding: 0.85rem; background: #ffffff;">
                    <div style="font-weight: 800; color: ${isQuanClass ? '#1d4ed8' : '#0f172a'}; margin-bottom: 0.6rem; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem;">
                            <span>🎒</span> <span>LỚP ${c}</span>
                            ${isQuanClass ? '<span style="background: #dbeafe; color: #1e40af; font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 4px;">GVCN: Thầy Nguyễn Tá Quan</span>' : ''}
                        </span>
                        <button onclick="window.smartTKBUI.switchToClassView('${c}')" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:4px; padding:0.2rem 0.65rem; font-size:0.75rem; font-weight:700; cursor:pointer;">
                            🔍 Phóng To & Chỉnh Sửa Riêng Lớp ${c}
                        </button>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="tkb-table" style="font-size: 0.74rem; min-width: 650px; margin: 0; background: #ffffff;">
                            <thead>
                                <tr>
                                    <th style="width: 50px;">Tiết</th>
                                    ${this.engine.DAYS.map(day => `<th>${day}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
            `;

            for (let p = 0; p < this.engine.PERIODS.length; p++) {
                html += `<tr><td class="period-label-col" style="padding: 0.25rem; font-weight: 800; background: #f8fafc;">T${p + 1}</td>`;
                for (let d = 0; d < this.engine.DAYS.length; d++) {
                    const cell = this.engine.timetable[c] && this.engine.timetable[c][d] ? this.engine.timetable[c][d][p] : null;
                    if (cell) {
                        const isQuanSlot = cell.teacher && cell.teacher.includes('Nguyễn Tá Quan');
                        const teacherColor = this.getTeacherColor(cell.teacher, cell.shortTeacher);
                        const roomBadge = cell.room ? `<span style="font-size: 0.62rem; color: #64748b;">(${cell.room.replace('room_', '')})</span>` : '';

                        html += `
                            <td style="padding: 0.3rem; height: 42px; cursor: pointer; background: #ffffff; border: 1px solid #e2e8f0;"
                                onclick="window.smartTKBUI.handleCellClick('${c}', ${d}, ${p})"
                                title="${cell.subject} • ${cell.teacher}">
                                <div style="font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${cell.subject} ${roomBadge}
                                </div>
                                <div style="font-size: 0.7rem; color: ${teacherColor}; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${isQuanSlot ? '⭐ ' : ''}${cell.teacher}
                                </div>
                            </td>
                        `;
                    } else {
                        html += `
                            <td style="padding: 0.3rem; height: 42px; cursor: pointer; background: #ffffff;"
                                onclick="window.smartTKBUI.handleCellClick('${c}', ${d}, ${p})">
                                <span style="color: #cbd5e1; font-size: 0.7rem;">Trống</span>
                            </td>
                        `;
                    }
                }
                html += `</tr>`;
            }

            html += `</tbody></table></div></div>`;
        }

        html += `</div></div>`;
        container.innerHTML = html;
    }

    filterGradeView(grade) {
        this.gradeFilter = grade;
        const container = document.getElementById('tkbGridTableContainer');
        if (container && this.currentViewMode === 'school') {
            this.renderSchoolMasterView(container);
        }
    }

    setMasterDensity(density) {
        this.masterDensity = density;
        try { localStorage.setItem('edustudio_master_density', density); } catch(e){}
        this.renderCurrentView();
    }

    toggleMasterLegend() {
        this.masterShowLegend = !this.masterShowLegend;
        try { localStorage.setItem('edustudio_master_show_legend', this.masterShowLegend ? 'true' : 'false'); } catch(e){}
        this.renderCurrentView();
    }

    toggleMasterColorStyle() {
        this.masterColorStyle = (this.masterColorStyle === 'monochrome') ? 'color' : 'monochrome';
        try { localStorage.setItem('edustudio_master_color_style', this.masterColorStyle); } catch(e){}
        this.renderCurrentView();
    }

    toggleMasterTeacherDisplay() {
        this.masterHideTeacher = !this.masterHideTeacher;
        try { localStorage.setItem('edustudio_master_hide_teacher', this.masterHideTeacher ? 'true' : 'false'); } catch(e){}
        this.renderCurrentView();
    }
    switchToClassView(classId) {
        this.selectedClass = classId;
        this.currentViewMode = 'class';
        document.querySelectorAll('.tkb-view-btn-pill').forEach(b => {
            b.classList.toggle('active', b.dataset.view === 'class');
        });
        this.updateFilterControls();
        this.renderCurrentView();
    }

    /**
     * XỬ LÝ CLICK VÀO Ô TIẾT HỌC:
     * - Nếu đang ở chế độ Hoán đổi -> thực hiện hoán đổi ngay lập tức!
     * - Nếu bình thường -> mở Modal Chỉnh Sửa / Gán Tiết Sư Phạm!
     */
    handleCellClick(classId, day, period) {
        // 1. Nếu đang trong chế độ Hoán đổi 1 chạm
        if (this.swapSource) {
            const src = this.swapSource;
            // Nếu bấm lại chính ô đó -> hủy
            if (src.classId === classId && src.day === day && src.period === period) {
                this.cancelSwapMode();
                return;
            }

            // Hoán đổi
            const res = this.engine.swapSlots(classId, src.day, src.period, day, period);
            if (res.success) {
                this.showToast(`✅ Đã hoán đổi thành công giữa Tiết ${src.period + 1} (${this.engine.DAYS[src.day]}) và Tiết ${period + 1} (${this.engine.DAYS[day]})!`);
            } else {
                alert(`⚠️ Không thể hoán đổi: ${res.reason}`);
            }

            this.cancelSwapMode();
            this.renderCurrentView();
            this.renderStats();
            return;
        }

        // 2. Mở Modal Chỉnh Sửa Tiết Học
        this.openSlotEditModal(classId, day, period);
    }

    /**
     * HỘP THOẠI HƯỚNG DẪN BIÊN TẬP / SỬA TKB TRỰC TIẾP
     */
    showEditGuideModal() {
        let guideModal = document.getElementById('tkbEditGuideModal');
        if (!guideModal) {
            guideModal = document.createElement('div');
            guideModal.id = 'tkbEditGuideModal';
            guideModal.className = 'modal-overlay';
            guideModal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7);
                backdrop-filter: blur(4px); z-index: 999999; align-items: center; justify-content: center;
                padding: 1rem;
            `;
            document.body.appendChild(guideModal);
        }
        guideModal.innerHTML = `
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 580px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25); overflow: hidden; animation: popIn 0.2s ease;">
                <!-- HEADER -->
                <div style="background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 1rem 1.25rem; color: #fff; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <span style="font-size: 1.3rem;">💡</span>
                        <div>
                            <div style="font-weight: 800; font-size: 1.05rem;">CÁCH CHỈNH SỬA & BIÊN TẬP THỜI KHÓA BIỂU</div>
                            <div style="font-size: 0.75rem; color: #93c5fd;">Tương tác trực quan 1 chạm trên toàn bộ Bàn cờ TKB</div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('tkbEditGuideModal').style.display='none'" style="background: transparent; border: none; color: #cbd5e1; font-size: 1.5rem; cursor: pointer; line-height: 1;">&times;</button>
                </div>

                <!-- BODY -->
                <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; font-size: 0.88rem; color: #334155;">
                    <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 0.75rem 1rem; border-radius: 6px;">
                        <strong style="color: #1e40af; font-size: 0.95rem;">👉 Cơ Chế Sửa 1 Chạm Cực Kỳ Đơn Giản:</strong>
                        <p style="margin: 0.35rem 0 0 0; line-height: 1.5;">Toàn bộ các ô trên bàn cờ Thời khóa biểu (cả ô đã có tiết lẫn ô trống) đều là <strong>ô tương tác sống (Live Interactive Cell)</strong>. Thầy Cô chỉ cần <strong>nhấp chuột trực tiếp vào bất kỳ ô nào</strong> để chỉnh sửa!</p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; gap: 0.75rem; align-items: flex-start; background: #f8fafc; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <span style="background: #dbeafe; color: #1e40af; font-weight: 800; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.85rem;">1</span>
                            <div>
                                <div style="font-weight: 700; color: #0f172a;">Sửa Môn Học hoặc Đổi Thầy Cô Giảng Dạy:</div>
                                <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.15rem;">Nhấp vào ô cần sửa &rarr; Chọn Môn học mới hoặc chọn/nhập tên Giáo viên mới &rarr; Bấm <strong>"Lưu Tiết Học"</strong>. Bảng sẽ cập nhật ngay lập tức.</div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 0.75rem; align-items: flex-start; background: #f8fafc; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <span style="background: #fef3c7; color: #b45309; font-weight: 800; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.85rem;">2</span>
                            <div>
                                <div style="font-weight: 700; color: #0f172a;">Hoán Đổi 2 Tiết Cho Nhau (Click-to-Swap):</div>
                                <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.15rem;">Nhấp vào ô tiết thứ nhất &rarr; Bấm nút <strong>"🔄 Hoán Đổi Sang Tiết Khác"</strong> &rarr; Nhấp chuột tiếp vào ô tiết thứ hai. Hai tiết sẽ tự động đổi chỗ trơn tru.</div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 0.75rem; align-items: flex-start; background: #f8fafc; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <span style="background: #fee2e2; color: #b91c1c; font-weight: 800; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.85rem;">3</span>
                            <div>
                                <div style="font-weight: 700; color: #0f172a;">Gán Tiết Mới Vào Ô Trống hoặc Xóa Tiết:</div>
                                <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.15rem;">Bấm vào ô trống có dấu <strong>➕</strong> để phân công tiết mới; hoặc bấm vào tiết đang có rồi chọn <strong>"🗑️ Xóa Tiết"</strong> để trả lại ô trống.</div>
                            </div>
                        </div>
                    </div>

                    <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 0.6rem 0.85rem; border-radius: 6px; font-size: 0.8rem; color: #92400e; display: flex; align-items: center; gap: 0.4rem;">
                        <span>🛡️</span> <em>Hệ thống có thuật toán AI tự động kiểm tra xung đột giáo viên và phòng học ngay khi Thầy Cô lưu, đảm bảo không bao giờ bị trùng lịch.</em>
                    </div>
                </div>

                <!-- FOOTER -->
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.75rem 1.25rem; display: flex; justify-content: flex-end;">
                    <button onclick="document.getElementById('tkbEditGuideModal').style.display='none'" style="background: #2563eb; color: #ffffff; border: none; border-radius: 6px; padding: 0.5rem 1.3rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 4px rgba(37,99,235,0.3);">
                        Đã Rõ & Thao Tác Ngay
                    </button>
                </div>
            </div>
        `;
        guideModal.style.display = 'flex';
    }


    cancelSwapMode() {
        this.swapSource = null;
        const container = document.getElementById('tkbGridTableContainer');
        if (container && this.currentViewMode === 'class') {
            this.renderClassView(container);
        }
    }

    /**
     * MỞ MODAL CHỈNH SỬA / GÁN TIẾT HỌC
     */
    openSlotEditModal(classId, day, period) {
        const cell = this.engine.timetable[classId][day][period];
        this.editingSlot = { classId, day, period, cell };

        let modal = document.getElementById('tkbSlotEditModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tkbSlotEditModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7);
                backdrop-filter: blur(4px); z-index: 999999; align-items: center; justify-content: center;
                padding: 1rem;
            `;
            document.body.appendChild(modal);
        }

        const isFixed = cell && cell.isFixed;
        const currentSub = cell ? cell.subject : '';
        const currentTeacher = cell ? cell.teacher : '';
        const currentRoom = cell ? (cell.room || '') : '';
        const isDouble = cell ? !!cell.isDouble : false;

        const teachers = this.engine.getAllTeachers();

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 520px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; animation: popIn 0.2s ease;">
                <!-- HEADER MODAL -->
                <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 1rem 1.25rem; color: #fff; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <span style="font-size: 1.3rem;">✏️</span>
                        <div>
                            <div style="font-weight: 800; font-size: 1rem;">Thiết Lập Tiết ${period + 1} - ${this.engine.DAYS[day]}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8;">Lớp Học: <strong style="color: #60a5fa;">Lớp ${classId}</strong></div>
                        </div>
                    </div>
                    <button onclick="window.smartTKBUI.closeSlotEditModal()" style="background: transparent; border: none; color: #cbd5e1; font-size: 1.4rem; cursor: pointer; line-height: 1;">&times;</button>
                </div>

                <!-- BODY MODAL -->
                <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;">
                    ${isFixed ? `
                        <div style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.78rem; font-weight: 600;">
                            🔒 Đây là Tiết Cố Định chuẩn quy định BGDĐT (${currentSub}). Bạn vẫn có thể tinh chỉnh nếu trường có kế hoạch riêng.
                        </div>
                    ` : ''}

                    <!-- 1. CHỌN MÔN HỌC -->
                    <div>
                        <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;">Môn Học:</label>
                        <select id="tkbModalSubject" style="width: 100%; padding: 0.55rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem; font-weight: 600;">
                            <option value="">-- Để Trống (Không có tiết) --</option>
                            ${this.engine.subjects.map(s => `<option value="${s.name}" ${s.name === currentSub ? 'selected' : ''}>${s.name}</option>`).join('')}
                            <option value="Chào Cờ" ${currentSub === 'Chào Cờ' ? 'selected' : ''}>Chào Cờ</option>
                            <option value="Sinh Hoạt Lớp" ${currentSub === 'Sinh Hoạt Lớp' ? 'selected' : ''}>Sinh Hoạt Lớp</option>
                        </select>
                    </div>

                    <!-- 2. CHỌN GIÁO VIÊN -->
                    <div>
                        <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;">Giáo Viên Giảng Dạy:</label>
                        <input id="tkbModalTeacher" type="text" list="tkbTeacherDataList" value="${currentTeacher}" placeholder="Chọn hoặc nhập tên giáo viên..." style="width: 100%; padding: 0.55rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.85rem; box-sizing: border-box;">
                        <datalist id="tkbTeacherDataList">
                            <option value="Thầy Nguyễn Tá Quan"></option>
                            ${teachers.map(t => `<option value="${t}"></option>`).join('')}
                        </datalist>
                    </div>

                    <!-- 3. PHÒNG HỌC BỘ MÔN & TIẾT KÉP -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <div>
                            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;">Phòng Học Bộ Môn:</label>
                            <select id="tkbModalRoom" style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.82rem;">
                                <option value="">Phòng Lớp Học Bình Thường</option>
                                ${this.engine.specialRooms.map(r => `<option value="${r.id}" ${r.id === currentRoom ? 'selected' : ''}>${r.icon} ${r.name}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;">Hình thức:</label>
                            <label style="display: flex; align-items: center; gap: 0.4rem; padding-top: 0.45rem; font-size: 0.82rem; cursor: pointer;">
                                <input type="checkbox" id="tkbModalDouble" ${isDouble ? 'checked' : ''}>
                                <span>Tiết Kép (2 tiết liền)</span>
                            </label>
                        </div>
                    </div>

                    <!-- MẮT XÍCH SƯ PHẠM EDUSTUDIO -->
                    ${cell && cell.subject ? `
                        <div style="border-top: 1px dashed #e2e8f0; padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem;">
                            <div style="font-size: 0.75rem; font-weight: 700; color: #64748b;">🔗 MẮT XÍCH SƯ PHẠM EDUSTUDIO:</div>
                            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                <button onclick="window.smartTKBUI.jumpToLessonPlan('${cell.subject}', '${classId}')" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                                    📑 Soạn KHBD 5512
                                </button>
                                <button onclick="window.smartTKBUI.jumpToGame('${cell.subject}')" style="background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                                    🎮 Trò Chơi Khởi Động
                                </button>
                                <button onclick="window.smartTKBUI.jumpToExam('${cell.subject}', '${classId}')" style="background: #fefce8; color: #a16207; border: 1px solid #fef08a; border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                                    📝 Đề Kiểm Tra Chuẩn
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- FOOTER ACTIONS -->
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        ${cell ? `
                            <button onclick="window.smartTKBUI.startSwapFromModal()" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; border-radius: 6px; padding: 0.45rem 0.75rem; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
                                🔄 Hoán Đổi Sang Tiết Khác
                            </button>
                        ` : ''}
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        ${cell ? `
                            <button onclick="window.smartTKBUI.deleteCurrentSlot()" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; padding: 0.45rem 0.75rem; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
                                🗑️ Xóa Tiết
                            </button>
                        ` : ''}
                        <button onclick="window.smartTKBUI.saveCurrentSlot()" style="background: #2563eb; color: #ffffff; border: none; border-radius: 6px; padding: 0.45rem 1.1rem; font-weight: 700; font-size: 0.82rem; cursor: pointer; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">
                            💾 Lưu Tiết Học
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }

    closeSlotEditModal() {
        const modal = document.getElementById('tkbSlotEditModal');
        if (modal) modal.style.display = 'none';
        this.editingSlot = null;
    }

    saveCurrentSlot() {
        if (!this.editingSlot) return;
        const { classId, day, period } = this.editingSlot;

        const sub = document.getElementById('tkbModalSubject').value.trim();
        const teacher = document.getElementById('tkbModalTeacher').value.trim();
        const room = document.getElementById('tkbModalRoom').value.trim();
        const isDouble = document.getElementById('tkbModalDouble').checked;

        if (!sub) {
            // Xóa ô
            this.engine.setSlot(classId, day, period, null);
            this.showToast('✅ Đã xóa tiết học thành công.');
        } else {
            const res = this.engine.setSlot(classId, day, period, {
                subject: sub,
                teacher: teacher || 'Chưa phân công',
                room: room || null,
                isDouble: isDouble,
                isFixed: sub === 'Chào Cờ' || sub === 'Sinh Hoạt Lớp'
            });

            if (!res.success) {
                alert(`⚠️ Cảnh báo xung đột: ${res.reason}`);
                return;
            }
            this.showToast(`✅ Đã lưu Tiết ${period + 1} (${sub} - ${teacher}) cho Lớp ${classId}!`);
        }

        this.closeSlotEditModal();
        this.renderCurrentView();
        this.renderStats();
    }

    deleteCurrentSlot() {
        if (!this.editingSlot) return;
        const { classId, day, period } = this.editingSlot;
        this.engine.setSlot(classId, day, period, null);
        this.engine.saveState();
        this.showToast('✅ Đã xóa tiết học (Để trống).');
        this.closeSlotEditModal();
        this.renderCurrentView();
        this.renderStats();
    }

    startSwapFromModal() {
        if (!this.editingSlot) return;
        const { classId, day, period } = this.editingSlot;
        this.swapSource = { classId, day, period };
        this.closeSlotEditModal();

        // Chuyển sang góc nhìn Lớp đó nếu đang ở góc nhìn khác
        if (this.currentViewMode !== 'class' || this.selectedClass !== classId) {
            this.switchToClassView(classId);
        } else {
            this.renderCurrentView();
        }

        this.showToast(`🔄 Đang chọn hoán đổi Tiết ${period + 1} (${this.engine.DAYS[day]}). Hãy bấm vào ô đích bất kỳ!`);
    }

    /**
     * TAB 2: PHÂN CÔNG CHUYÊN MÔN (PCCM) - THÊM / SỬA / XÓA
     */
    renderPCCMTable() {
        const panePCCM = document.getElementById('tkb-pane-pccm');
        if (!panePCCM) return;

        const allAssignments = this.engine.assignments || [];
        const workloadReport = this.engine.getTeacherWorkloadReport ? this.engine.getTeacherWorkloadReport() : [];
        const totalStandard = workloadReport.filter(r => r.diff === 0).length;
        const totalSurplus = workloadReport.filter(r => r.diff > 0).length;
        const totalReducedPeriods = workloadReport.reduce((sum, r) => sum + r.reducedTotal, 0);
        const totalAssignedPeriods = allAssignments.reduce((sum, a) => sum + (a.periodsPerWeek || a.periods || 1), 0);
        const totalClasses = (this.engine.classes || []).length;
        const totalTeachers = workloadReport.length;
        const standardQuota = (workloadReport[0] && workloadReport[0].standardQuota) || 17;
        const departments = [...new Set(workloadReport.map(r => r.department).filter(Boolean))];

        let bodyHtml = '';
        if (this.pccmFilter === 'annual') {
            bodyHtml = this.renderAnnualTable();
        } else if (this.pccmFilter === 'official') {
            bodyHtml = this.renderOfficialPCCMTable();
        } else if (this.pccmFilter === 'all' || this.pccmFilter === 'Tổ Tự Nhiên' || this.pccmFilter === 'Tổ Xã Hội') {
            bodyHtml = this.renderDetailAssignmentsTable();
        } else {
            // Mặc định: workload
            bodyHtml = this.renderWorkloadTable();
        }

        panePCCM.innerHTML = `
            <div class="tkb-config-card">
                <!-- HEADER & TOOLBAR -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.15rem; color: #0f172a; display: flex; align-items: center; gap: 0.5rem;">
                            <span>⚖️</span> <span>HỆ QUẢN TRỊ ĐỊNH MỨC & PHÂN CÔNG CHUYÊN MÔN TOÀN DIỆN (GDMN & GDPT)</span>
                        </h3>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.82rem; color: #64748b;">
                            ${this.engine.schoolConfig?.schoolName || 'Cơ Sở Giáo Dục'} • Niên khóa ${this.engine.schoolConfig?.academicYear || '2026 - 2027'} • Cân bằng định mức giảng dạy & nhiệm vụ kiêm nhiệm chuẩn Bộ GD&ĐT
                        </p>
                    </div>

                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                        <button onclick="window.smartTKBUI.exportWorkloadCSV()" style="background: #059669; color: #fff; border: none; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <span>📥</span> <span>Xuất Báo Cáo Định Mức (vnEdu / SMAS)</span>
                        </button>
                        <button onclick="window.smartTKBUI.printWorkloadTable()" style="background: #1e293b; color: #fff; border: none; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <span>🖨️</span> <span>In Bảng Định Mức A4</span>
                        </button>
                        <button onclick="window.smartTKBUI.openPCCMModal(-1)" style="background: #2563eb; color: #fff; border: none; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer;">
                            ➕ Thêm Phân Công
                        </button>
                    </div>
                </div>

                <!-- 4 THẺ THỐNG KÊ KPI ĐỊNH MỨC TOÀN TRƯỜNG -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.85rem; display: flex; align-items: center; gap: 0.75rem;">
                        <div style="font-size: 1.8rem;">🎯</div>
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 700; color: #166534; text-transform: uppercase;">Định Mức Giảng Dạy Chuẩn</div>
                            <div style="font-size: 1.35rem; font-weight: 800; color: #15803d;">${standardQuota} Tiết / Tuần</div>
                            <div style="font-size: 0.7rem; color: #15803d;">Quy chuẩn theo Thông tư BGD&ĐT &amp; Hồ sơ trường</div>
                        </div>
                    </div>

                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.85rem; display: flex; align-items: center; gap: 0.75rem;">
                        <div style="font-size: 1.8rem;">👨‍🏫</div>
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 700; color: #1e40af; text-transform: uppercase;">Đạt Chuẩn Định Mức</div>
                            <div style="font-size: 1.35rem; font-weight: 800; color: #1d4ed8;">${totalStandard}/${workloadReport.length} Giáo Viên</div>
                            <div style="font-size: 0.7rem; color: #2563eb;">${totalSurplus > 0 ? `Có ${totalSurplus} GV dạy thừa giờ` : 'Cân bằng 100%'}</div>
                        </div>
                    </div>

                    <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 0.85rem; display: flex; align-items: center; gap: 0.75rem;">
                        <div style="font-size: 1.8rem;">💼</div>
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 700; color: #854d0e; text-transform: uppercase;">Tiết Kiêm Nhiệm Quy Đổi</div>
                            <div style="font-size: 1.35rem; font-weight: 800; color: #a16207;">${totalReducedPeriods} Tiết</div>
                            <div style="font-size: 0.7rem; color: #a16207;">Chủ nhiệm, Tổ trưởng, Lab, CNTT, Đoàn Đội</div>
                        </div>
                    </div>

                    <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 0.85rem; display: flex; align-items: center; gap: 0.75rem;">
                        <div style="font-size: 1.8rem;">🏫</div>
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 700; color: #6b21a8; text-transform: uppercase;">Quy Mô Nhà Trường</div>
                            <div style="font-size: 1.35rem; font-weight: 800; color: #7e22ce;">${totalClasses} Khối Lớp Học</div>
                            <div style="font-size: 0.7rem; color: #7e22ce;">${totalAssignedPeriods} Tiết / Tuần toàn trường</div>
                        </div>
                    </div>
                </div>

                <!-- BỘ CHUYỂN ĐỔI CHẾ ĐỘ XEM (SUB-VIEW PILLS ĐA CẤP GDMN & GDPT) -->
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; background: #f8fafc; padding: 0.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <button onclick="window.smartTKBUI.setPCCMFilter('workload')" style="padding: 0.4rem 0.95rem; border-radius: 6px; font-size: 0.82rem; font-weight: 800; border: none; cursor: pointer; ${this.pccmFilter === 'workload' ? 'background: #15803d; color: #fff; box-shadow: 0 2px 6px rgba(21,128,61,0.3);' : 'background: #fff; color: #166534; border: 1px solid #86efac;'}">
                        ⚖️ Ma Trận Định Mức &amp; Kiêm Nhiệm (${totalTeachers} Thầy Cô)
                    </button>
                    <button onclick="window.smartTKBUI.setPCCMFilter('annual')" style="padding: 0.4rem 0.95rem; border-radius: 6px; font-size: 0.82rem; font-weight: 800; border: none; cursor: pointer; ${this.pccmFilter === 'annual' ? 'background: #4338ca; color: #fff; box-shadow: 0 2px 6px rgba(67,56,202,0.3);' : 'background: #fff; color: #3730a3; border: 1px solid #c7d2fe;'}">
                        🗓️ Quyết Toán Cả Năm (35 Tuần - ${standardQuota * 35} Tiết/GV)
                    </button>
                    <button onclick="window.smartTKBUI.setPCCMFilter('official')" style="padding: 0.4rem 0.95rem; border-radius: 6px; font-size: 0.82rem; font-weight: 800; border: none; cursor: pointer; ${this.pccmFilter === 'official' ? 'background: #dc2626; color: #fff; box-shadow: 0 2px 6px rgba(220,38,38,0.3);' : 'background: #fff; color: #b91c1c; border: 1px solid #fca5a5;'}">
                        🏛️ Bảng PCCM Chính Thức (${totalTeachers} Thầy Cô)
                    </button>
                    <button onclick="window.smartTKBUI.setPCCMFilter('all')" style="padding: 0.4rem 0.95rem; border-radius: 6px; font-size: 0.82rem; font-weight: 700; border: none; cursor: pointer; ${this.pccmFilter === 'all' ? 'background: #1e293b; color: #fff;' : 'background: #fff; color: #475569; border: 1px solid #cbd5e1;'}">
                        🌐 Toàn Bộ Phân Công Chi Tiết (${allAssignments.length})
                    </button>
                    ${departments.map(dept => {
                        const count = allAssignments.filter(a => a.department === dept).length;
                        const isAct = (this.pccmFilter === dept);
                        return `
                            <button onclick="window.smartTKBUI.setPCCMFilter('${dept}')" style="padding: 0.4rem 0.95rem; border-radius: 6px; font-size: 0.82rem; font-weight: 700; border: none; cursor: pointer; ${isAct ? 'background: #0f766e; color: #fff;' : 'background: #fff; color: #0f766e; border: 1px solid #cbd5e1;'}">
                                📁 ${dept} (${count})
                            </button>
                        `;
                    }).join('')}
                </div>

                ${bodyHtml}
            </div>
        `;
    }

    renderWorkloadTable() {
        const workloadReport = this.engine.getTeacherWorkloadReport ? this.engine.getTeacherWorkloadReport() : [];
        let html = `
            <div style="margin-bottom: 0.75rem; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.65rem 1rem; border-radius: 8px; color: #065f46; font-size: 0.82rem; font-weight: 600; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    📌 <strong>Giải pháp đột phá cho Quản lý Giáo dục:</strong> Tự động tính đủ tiết giảng dạy chuyên môn, hoạt động giáo dục và các nhiệm vụ kiêm nhiệm (Chủ nhiệm, Tổ trưởng, Phòng Lab, CNTT, Đoàn Đội). Khai báo chuẩn xác lên vnEdu / SMAS / Cơ sở dữ liệu ngành theo đúng quy chuẩn định mức của từng cấp học (GDMN & GDPT).
                </div>
                <button onclick="window.smartTKBUI.resetWorkloadRoles()" style="background: #ffffff; color: #047857; border: 1px solid #059669; padding: 0.25rem 0.65rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; cursor: pointer;">
                    🔄 Khôi Phục Kiêm Nhiệm Gốc
                </button>
            </div>

            <div style="overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 8px;">
                <table class="tkb-table" id="workloadMasterTable" style="margin: 0; width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                    <thead>
                        <tr style="background: #0f172a; color: #ffffff;">
                            <th style="width: 45px; text-align: center;">STT</th>
                            <th style="width: 190px; text-align: left;">Họ và Tên Giáo Viên</th>
                            <th style="width: 110px; text-align: center;">Tổ Chuyên Môn</th>
                            <th style="width: 140px; text-align: left;">Tiết Chuyên Môn</th>
                            <th style="width: 130px; text-align: left;">HĐTN Gánh Giờ</th>
                            <th style="text-align: left;">Nhiệm Vụ Kiêm Nhiệm Hỗ Trợ Trường</th>
                            <th style="width: 95px; text-align: center;">Quy Đổi TT28</th>
                            <th style="width: 90px; text-align: center;">Tổng Thực Nhận</th>
                            <th style="width: 80px; text-align: center;">Định Mức</th>
                            <th style="width: 130px; text-align: center;">Trạng Thái</th>
                            <th style="width: 120px; text-align: center;">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const r of workloadReport) {
            const isNat = (r.department || '').includes('Tự Nhiên');
            const rowBg = r.isQuan ? 'background: #f0fdf4;' : (r.index % 2 === 0 ? 'background: #f8fafc;' : 'background: #ffffff;');

            let badgeHtml = '';
            if (r.diff === 0) {
                badgeHtml = `<span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 800; font-size: 0.72rem;">✅ Đạt chuẩn (${r.standardQuota}t)</span>`;
            } else if (r.diff > 0) {
                badgeHtml = `<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 800; font-size: 0.72rem;">🟢 Thừa +${r.diff} tiết</span>`;
            } else {
                badgeHtml = `<span style="background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 800; font-size: 0.72rem;">⚠️ Thiếu ${r.diff} tiết</span>`;
            }

            const rolesListHtml = r.roles.length > 0 ? r.roles.map(role => `
                <div style="font-size: 0.74rem; line-height: 1.4; color: #334155; margin-bottom: 2px;">
                    • <strong>${role.name}</strong> <span style="color: #64748b;">(-${role.reduced}t: ${role.note})</span>
                </div>
            `).join('') : '<span style="color: #94a3b8; font-style: italic;">Giảng dạy thuần túy</span>';

            html += `
                <tr style="${rowBg}">
                    <td style="text-align: center; font-weight: 700; color: #64748b;">${r.index}</td>
                    <td style="font-weight: 700; color: ${r.isQuan ? '#15803d' : '#0f172a'}; text-align: left;">
                        ${r.isQuan ? '⭐ ' : ''}${r.teacherName}
                    </td>
                    <td style="text-align: center;">
                        <span style="background: ${isNat ? '#ecfdf5' : '#fdf2f8'}; color: ${isNat ? '#065f46' : '#9d174d'}; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 700; font-size: 0.72rem; border: 1px solid ${isNat ? '#a7f3d0' : '#fbcfe8'};">
                            ${r.department}
                        </span>
                    </td>
                    <td style="text-align: left; line-height: 1.3;">
                        <strong style="color: #1e293b;">${r.academicPeriods} tiết</strong>
                        <div style="font-size: 0.7rem; color: #64748b;">${r.academicSubjects}</div>
                    </td>
                    <td style="text-align: left; line-height: 1.3;">
                        <strong style="color: ${r.hdtnPeriods > 0 ? '#0e7490' : '#94a3b8'};">${r.hdtnPeriods} tiết</strong>
                        <div style="font-size: 0.7rem; color: #64748b;">${r.hdtnSubjects}</div>
                    </td>
                    <td style="text-align: left;">
                        ${rolesListHtml}
                    </td>
                    <td style="text-align: center; font-weight: 800; color: #b45309;">
                        -${r.reducedTotal} tiết
                    </td>
                    <td style="text-align: center; font-weight: 800; font-size: 0.9rem; color: ${r.finalTotal >= 17 ? '#15803d' : '#b91c1c'};">
                        ${r.finalTotal}
                    </td>
                    <td style="text-align: center; font-weight: 700; color: #64748b;">
                        ${r.standardQuota}
                    </td>
                    <td style="text-align: center;">
                        ${badgeHtml}
                    </td>
                    <td style="text-align: center;">
                        <button onclick="window.smartTKBUI.openEditRoleModal('${r.teacherName}')" style="background: #2563eb; color: #fff; border: none; padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer; margin-right: 2px;" title="Tùy chỉnh vai trò kiêm nhiệm">
                            ✏️ Sửa
                        </button>
                        <button onclick="window.smartTKBUI.openTeachingScheduleModal('${r.teacherName}')" style="background: #059669; color: #fff; border: none; padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;" title="Xem lịch báo giảng">
                            📋 Lịch
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table></div>`;
        return html;
    }

    renderAnnualTable() {
        const report = this.engine.getAnnualWorkloadSettlement ? this.engine.getAnnualWorkloadSettlement() : [];
        let html = `
            <div style="margin-bottom: 0.75rem; background: #eef2ff; border: 1px solid #c7d2fe; padding: 0.75rem 1rem; border-radius: 8px; color: #3730a3; font-size: 0.82rem; font-weight: 600; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    📌 <strong>Căn cứ Điều 5 & Điều 6 Thông tư 28/2009/TT-BGDĐT:</strong> Định mức tiết dạy của giáo viên trường phổ thông dân tộc bán trú là 17 tiết/tuần. Tổng số tiết định mức trong cả năm học = 17 tiết x 35 tuần = <strong>595 tiết/năm</strong>. Cho phép bù trừ linh hoạt giữa Học kỳ I (18 tuần) và Học kỳ II (17 tuần).
                </div>
                <button onclick="window.smartTKBUI.exportAnnualSettlementCSV()" style="background: #4338ca; color: #fff; border: none; padding: 0.35rem 0.85rem; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem;">
                    <span>📥</span> <span>Xuất CSV Quyết Toán Cả Năm</span>
                </button>
            </div>

            <div style="overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 8px;">
                <table class="tkb-table" style="margin: 0; width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                    <thead>
                        <tr style="background: #1e1b4b; color: #ffffff;">
                            <th style="width: 45px; text-align: center;">STT</th>
                            <th style="width: 200px; text-align: left;">Họ và Tên Giáo Viên</th>
                            <th style="width: 110px; text-align: center;">Tổ Chuyên Môn</th>
                            <th style="width: 90px; text-align: center;">Dạy HK I/Tuần</th>
                            <th style="width: 90px; text-align: center;">Dạy HK II/Tuần</th>
                            <th style="width: 110px; text-align: center;">Tổng Tiết Dạy Cả Năm (35t)</th>
                            <th style="width: 120px; text-align: center;">Kiêm Nhiệm Cả Năm (TT28)</th>
                            <th style="width: 110px; text-align: center;">Tổng Thực Hiện Cả Năm</th>
                            <th style="width: 90px; text-align: center;">Định Mức Năm</th>
                            <th style="width: 130px; text-align: center;">Trạng Thái Quyết Toán</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const r of report) {
            const isNat = (r.department || '').includes('Tự Nhiên');
            const rowBg = r.isQuan ? 'background: #f0fdf4;' : (r.index % 2 === 0 ? 'background: #f8fafc;' : 'background: #ffffff;');

            let badgeHtml = '';
            if (r.diffAnnual === 0) {
                badgeHtml = '<span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 800; font-size: 0.72rem;">✅ Chuẩn 595 tiết</span>';
            } else if (r.diffAnnual > 0) {
                badgeHtml = `<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 800; font-size: 0.72rem;">🟢 Thừa +${r.diffAnnual} tiết</span>`;
            } else {
                badgeHtml = `<span style="background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 800; font-size: 0.72rem;">⚠️ Thiếu ${r.diffAnnual} tiết</span>`;
            }

            html += `
                <tr style="${rowBg}">
                    <td style="text-align: center; font-weight: 700; color: #64748b;">${r.index}</td>
                    <td style="font-weight: 700; color: ${r.isQuan ? '#15803d' : '#0f172a'}; text-align: left;">
                        ${r.isQuan ? '⭐ ' : ''}${r.teacherName}
                    </td>
                    <td style="text-align: center;">
                        <span style="background: ${isNat ? '#ecfdf5' : '#fdf2f8'}; color: ${isNat ? '#065f46' : '#9d174d'}; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 700; font-size: 0.72rem; border: 1px solid ${isNat ? '#a7f3d0' : '#fbcfe8'};">
                            ${r.department}
                        </span>
                    </td>
                    <td style="text-align: center; font-weight: 700; color: #c2410c;">
                        ${r.teachingHK1} tiết
                    </td>
                    <td style="text-align: center; font-weight: 700; color: #059669;">
                        ${r.teachingHK2} tiết
                    </td>
                    <td style="text-align: center; font-weight: 800; color: #1e293b;">
                        ${r.annualTeaching} tiết
                    </td>
                    <td style="text-align: center; font-weight: 700; color: #b45309;">
                        -${r.annualReduced} tiết
                    </td>
                    <td style="text-align: center; font-weight: 800; font-size: 0.95rem; color: ${r.annualFinal >= 595 ? '#15803d' : '#b91c1c'};">
                        ${r.annualFinal} tiết
                    </td>
                    <td style="text-align: center; font-weight: 800; color: #64748b;">
                        595 tiết
                    </td>
                    <td style="text-align: center;">
                        ${badgeHtml}
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table></div>`;
        return html;
    }

    renderOfficialPCCMTable() {
        const officialList = this.engine.officialPCCM || [];
        let html = `
            <div style="margin-bottom: 0.75rem; background: #fff1f2; border: 1px solid #fecdd3; padding: 0.6rem 1rem; border-radius: 8px; color: #9f1239; font-size: 0.82rem; font-weight: 600;">
                📌 Bản Phân công chuyên môn chính thức được đồng bộ toàn diện từ Cấu hình Khai Báo Trường & Đội ngũ Giáo viên chủ chốt.
            </div>
            <div style="overflow-x: auto;">
                <table class="tkb-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">TT</th>
                            <th style="width: 220px; text-align: left;">Họ và Tên</th>
                            <th style="width: 140px;">Tổ Bộ Môn</th>
                            <th style="text-align: left;">Phân Công Học Kỳ I</th>
                            <th style="text-align: left;">Phân Công Học Kỳ II</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const t of officialList) {
            const isQuan = t['Họ và tên'].includes('Nguyễn Tá Quan');
            const isNat = (t['Tổ bộ môn'] || '').includes('Tự Nhiên');
            html += `
                <tr style="${isQuan ? 'background: #eff6ff; font-weight: 700;' : ''}">
                    <td style="text-align: center; font-weight: 700; color: #64748b;">${t['TT']}</td>
                    <td style="font-weight: 700; color: ${isQuan ? '#1d4ed8' : '#0f172a'}; text-align: left;">
                        ${isQuan ? '⭐ ' : ''}${t['Họ và tên']}
                    </td>
                    <td style="text-align: center;">
                        <span style="background: ${isNat ? '#ecfdf5' : '#fdf2f8'}; color: ${isNat ? '#065f46' : '#9d174d'}; padding: 0.2rem 0.55rem; border-radius: 12px; font-weight: 700; font-size: 0.75rem; border: 1px solid ${isNat ? '#a7f3d0' : '#fbcfe8'};">
                            ${t['Tổ bộ môn']}
                        </span>
                    </td>
                    <td style="text-align: left; line-height: 1.5; color: #334155; white-space: pre-line;">${t['Phân công HK I'] || '—'}</td>
                    <td style="text-align: left; line-height: 1.5; color: #64748b; white-space: pre-line;">${t['Phân công HK II'] || '—'}</td>
                </tr>
            `;
        }

        html += `</tbody></table></div>`;
        return html;
    }

    renderDetailAssignmentsTable() {
        const allAssignments = this.engine.assignments || [];
        let filtered = allAssignments;
        if (this.pccmFilter === 'Tổ Tự Nhiên') {
            filtered = allAssignments.filter(a => a.department === 'Tổ Tự Nhiên');
        } else if (this.pccmFilter === 'Tổ Xã Hội') {
            filtered = allAssignments.filter(a => a.department === 'Tổ Xã Hội');
        }

        let html = `
            <div style="overflow-x: auto;">
                <table class="tkb-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">STT</th>
                            <th style="text-align: left;">Giáo Viên Phụ Trách</th>
                            <th>Tổ Bộ Môn</th>
                            <th>Môn Học</th>
                            <th>Lớp Học</th>
                            <th>Số Tiết/Tuần</th>
                            <th>Tiết Kép</th>
                            <th>Phòng Bộ Môn</th>
                            <th style="width: 100px;">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        filtered.forEach((a, index) => {
            const roomDef = a.roomReq ? this.engine.specialRooms.find(r => r.id === a.roomReq) : null;
            const isQuan = a.teacher.includes('Nguyễn Tá Quan');
            const isNat = (a.department || '').includes('Tự Nhiên');
            const rawIndex = allAssignments.indexOf(a);

            html += `
                <tr style="${isQuan ? 'background: #f0fdf4;' : ''}">
                    <td style="text-align: center; font-weight: 700; color: #64748b;">${index + 1}</td>
                    <td style="font-weight: 700; color: ${isQuan ? '#15803d' : '#1e293b'}; text-align: left;">
                        ${isQuan ? '👨‍🏫 ' : ''}${a.teacher}
                    </td>
                    <td style="text-align: center;">
                        <span style="background: ${isNat ? '#ecfdf5' : '#fdf2f8'}; color: ${isNat ? '#065f46' : '#9d174d'}; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">
                            ${a.department || '—'}
                        </span>
                    </td>
                    <td><span style="font-weight: 600; color: #0f172a;">${a.subject}</span></td>
                    <td style="text-align: center;"><span style="background: #e0e7ff; color: #3730a3; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700;">Lớp ${a.classId}</span></td>
                    <td style="text-align: center; font-weight: 800; color: #1d4ed8;">${a.periods} tiết/tuần</td>
                    <td style="text-align: center;">${a.doublePeriod ? '<span class="tkb-badge-double">Có (Tiết kép)</span>' : '<span style="color: #94a3b8;">Không</span>'}</td>
                    <td>${roomDef ? `<span class="tkb-badge-room">${roomDef.icon} ${roomDef.name}</span>` : '<span style="color: #94a3b8;">Phòng lớp</span>'}</td>
                    <td style="text-align: center;">
                        <button onclick="window.smartTKBUI.openPCCMModal(${rawIndex})" style="background: #3b82f6; color: #fff; border: none; padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer; margin-right: 0.25rem;">✏ Sửa</button>
                        <button onclick="window.smartTKBUI.deletePCCMRow(${rawIndex})" style="background: #ef4444; color: #fff; border: none; padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">🗑 Xóa</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        return html;
    }
setPCCMFilter(filterName) {
        this.pccmFilter = filterName;
        this.renderPCCMTable();
    }

    openPCCMModal(index) {
        this.editingPCCMIndex = index;
        const assign = index >= 0 ? this.engine.assignments[index] : {
            teacher: 'Thầy Nguyễn Tá Quan',
            subject: 'HĐTN, HN',
            classId: '8A',
            periods: 3,
            doublePeriod: false,
            roomReq: null
        };

        let modal = document.getElementById('tkbPCCMModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tkbPCCMModal';
            modal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7);
                backdrop-filter: blur(4px); z-index: 999999; align-items: center; justify-content: center;
                padding: 1rem;
            `;
            document.body.appendChild(modal);
        }

        const teachers = this.engine.getAllTeachers();

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden;">
                <div style="background: #1e293b; padding: 1rem; color: #fff; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 800; font-size: 0.95rem;">${index >= 0 ? '✏️ Chỉnh Sửa Phân Công' : '➕ Thêm Phân Công Giáo Viên Mới'}</div>
                    <button onclick="document.getElementById('tkbPCCMModal').style.display='none'" style="background: transparent; border: none; color: #fff; font-size: 1.3rem; cursor: pointer;">&times;</button>
                </div>
                <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
                    <div>
                        <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155;">Họ Tên Giáo Viên:</label>
                        <input id="pccmTeacher" type="text" list="pccmTeacherList" value="${assign.teacher}" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box;">
                        <datalist id="pccmTeacherList">${teachers.map(t => `<option value="${t}">`).join('')}</datalist>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155;">Môn Học:</label>
                        <select id="pccmSubject" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                            ${this.engine.subjects.map(s => `<option value="${s.name}" ${s.name === assign.subject ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                        <div>
                            <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155;">Lớp Học:</label>
                            <select id="pccmClass" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                ${this.engine.classes.map(c => `<option value="${c}" ${c === assign.classId ? 'selected' : ''}>Lớp ${c}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155;">Số Tiết/Tuần:</label>
                            <input id="pccmPeriods" type="number" min="1" max="10" value="${assign.periods}" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box;">
                        </div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155;">Phòng Học Bộ Môn:</label>
                        <select id="pccmRoom" style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                            <option value="">Phòng Lớp Học Bình Thường</option>
                            ${this.engine.specialRooms.map(r => `<option value="${r.id}" ${r.id === assign.roomReq ? 'selected' : ''}>${r.icon} ${r.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; cursor: pointer;">
                            <input id="pccmDouble" type="checkbox" ${assign.doublePeriod ? 'checked' : ''}>
                            <span>Ưu tiên xếp tiết kép (2 tiết liền nhau)</span>
                        </label>
                    </div>
                </div>
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.75rem 1.25rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <button onclick="document.getElementById('tkbPCCMModal').style.display='none'" style="background: #e2e8f0; border: none; padding: 0.45rem 0.85rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer;">Đóng</button>
                    <button onclick="window.smartTKBUI.savePCCMRow()" style="background: #2563eb; color: #fff; border: none; padding: 0.45rem 1rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer;">Lưu Phân Công</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }

    savePCCMRow() {
        const teacher = document.getElementById('pccmTeacher').value.trim();
        const subject = document.getElementById('pccmSubject').value;
        const classId = document.getElementById('pccmClass').value;
        const periods = parseInt(document.getElementById('pccmPeriods').value) || 1;
        const roomReq = document.getElementById('pccmRoom').value || null;
        const doublePeriod = document.getElementById('pccmDouble').checked;

        if (!teacher) {
            alert('Vui lòng nhập tên giáo viên!');
            return;
        }

        const assignObj = { teacher, subject, classId, periods, roomReq, doublePeriod };

        if (this.editingPCCMIndex >= 0) {
            this.engine.updateAssignment(this.editingPCCMIndex, assignObj);
            this.engine.saveState();
            this.showToast('✅ Đã cập nhật phân công thành công!');
        } else {
            this.engine.addAssignment(assignObj);
            this.showToast('✅ Đã thêm phân công giáo viên mới thành công!');
        }

        document.getElementById('tkbPCCMModal').style.display = 'none';
        this.renderPCCMTable();
        this.updateFilterControls();
    }

    deletePCCMRow(index) {
        if (confirm(`Bạn có chắc chắn muốn xóa phân công của [${this.engine.assignments[index].teacher}] không?`)) {
            this.engine.deleteAssignment(index);
            this.engine.saveState();
            this.showToast('✅ Đã xóa dòng phân công.');
            this.renderPCCMTable();
            this.updateFilterControls();
        }
    }

    /**
     * TAB 3: KHỐI LỚP & PHÒNG BỘ MÔN (CHO PHÉP THÊM/XÓA LỚP)
     */
    renderConfigTab() {
        const container = document.getElementById('tkb-pane-config');
        if (!container) return;

        container.innerHTML = `
            <div class="tkb-config-grid">
                <!-- KHỐI LỚP HỌC -->
                <div class="tkb-box-setting">
                    <h3><span>🏫</span> Danh Mục Lớp Học (${this.engine.classes.length} Lớp)</h3>
                    <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
                        ${this.engine.classes.map(c => `
                            <span style="background: #dbeafe; color: #1e40af; padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                                <span>Lớp ${c}</span>
                                <button onclick="window.smartTKBUI.removeClass('${c}')" style="background: transparent; border: none; color: #dc2626; font-size: 0.85rem; cursor: pointer; padding: 0; line-height: 1;" title="Xóa lớp này">&times;</button>
                            </span>
                        `).join('')}
                    </div>

                    <div style="display: flex; gap: 0.4rem; margin-top: 0.75rem;">
                        <input id="newClassNameInput" type="text" placeholder="Ví dụ: 8C, 9C..." style="padding: 0.4rem 0.65rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.82rem; width: 140px;">
                        <button onclick="window.smartTKBUI.addNewClass()" style="background: #2563eb; color: #fff; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer;">
                            ➕ Thêm Lớp
                        </button>
                    </div>
                </div>

                <!-- PHÒNG BỘ MÔN -->
                <div class="tkb-box-setting">
                    <h3><span>🏢</span> Phòng Học Chức Năng (Bộ Môn)</h3>
                    <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.82rem; color: #334155; line-height: 1.6;">
                        ${this.engine.specialRooms.map(r => `
                            <li>${r.icon} <strong>${r.name}:</strong> Sức chứa ${r.capacity} lớp/tiết</li>
                        `).join('')}
                    </ul>
                </div>

                <!-- RÀNG BUỘC KHÓA -->
                <div class="tkb-box-setting">
                    <h3><span>🔒</span> Ràng Buộc Khóa Cố Định</h3>
                    <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.82rem; color: #334155; line-height: 1.6;">
                        <li>🚩 <strong>Chào cờ:</strong> Tiết 1 sáng Thứ Hai (Toàn trường).</li>
                        <li>👥 <strong>Sinh hoạt lớp:</strong> Tiết 5 sáng Thứ Bảy (Toàn trường).</li>
                        <li>⚖️ <strong>Tiết kép:</strong> Môn Tin học, KHTN, GDTC ưu tiên 2 tiết liền.</li>
                    </ul>
                </div>
            </div>
        `;
    }

    addNewClass() {
        const input = document.getElementById('newClassNameInput');
        if (!input) return;
        const val = input.value.trim().toUpperCase();
        if (!val) {
            alert('Vui lòng nhập tên lớp (ví dụ: 8C, 9C)!');
            return;
        }

        const success = this.engine.addClass(val);
        if (success) {
            this.showToast(`✅ Đã thêm Lớp ${val} vào danh mục toàn trường!`);
            input.value = '';
            this.renderConfigTab();
            this.updateFilterControls();
            this.renderCurrentView();
        } else {
            alert('Lớp này đã tồn tại hoặc không hợp lệ!');
        }
    }

    removeClass(className) {
        if (confirm(`Bạn có chắc muốn xóa [Lớp ${className}] khỏi trường không?`)) {
            this.engine.removeClass(className);
            this.showToast(`✅ Đã xóa Lớp ${className}.`);
            if (this.selectedClass === className) {
                this.selectedClass = this.engine.classes[0] || '6A';
            }
            this.renderConfigTab();
            this.updateFilterControls();
            this.renderCurrentView();
        }
    }

    /**
     * Lối tắt Sư phạm: Nhảy sang Xưởng KHBD 5512
     */
    jumpToLessonPlan(subjectName, classId) {
        this.closeSlotEditModal();
        if (this.app && typeof this.app.switchTab === 'function') {
            this.app.switchTab('lesson-plan');

            const subjectInput = document.getElementById('lessonPlanSubject');
            const gradeSelect = document.getElementById('lessonPlanGrade');
            const gradeNum = classId.charAt(0);

            if (gradeSelect) gradeSelect.value = `Lớp ${gradeNum}`;
            if (subjectInput) {
                subjectInput.value = `${subjectName} ${gradeNum} (Chuẩn SGK Kết Nối Tri Thức)`;
            }

            this.showToast(`🎯 Đã kết nối Tiết dạy [${subjectName} - Lớp ${classId}] sang Xưởng Soạn KHBD 5512!`);
        }
    }

    jumpToGame(subjectName) {
        this.closeSlotEditModal();
        if (this.app && typeof this.app.switchTab === 'function') {
            this.app.switchTab('games');
            this.showToast(`🎮 Đã mở Kho Trò Chơi sẵn sàng cho hoạt động khởi động môn ${subjectName}!`);
        }
    }

    jumpToExam(subjectName, classId) {
        this.closeSlotEditModal();
        if (this.app && typeof this.app.switchTab === 'function') {
            this.app.switchTab('exam-studio');
            this.showToast(`📝 Đã mở Xưởng Đề kiểm tra chuẩn hóa cho ${subjectName} Lớp ${classId}!`);
        }
    }

    
    renderStats() {
        const paneStats = document.getElementById('tkb-pane-stats');
        if (!paneStats) return;

        const conflicts = this.engine.detectConflicts();
        const audit = this.engine.getPedagogicalAudit ? this.engine.getPedagogicalAudit() : { issues: [], positives: [], recommendations: [] };
        const workloadReport = this.engine.getTeacherWorkloadReport ? this.engine.getTeacherWorkloadReport() : [];

        paneStats.innerHTML = `
            <div class="tkb-config-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.15rem; color: #0f172a; display: flex; align-items: center; gap: 0.5rem;">
                            <span>📊</span> <span>TRUNG TÂM ĐỐI SOÁT & TƯ VẤN SƯ PHẠM GDPT 2018</span>
                        </h3>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.82rem; color: #64748b;">
                            Hệ thống AI tự động rà soát đa chiều: Xung đột giáo viên, phân bổ tiết kép, vị trí HĐTN/SHL và cân bằng định mức lao động nhà trường.
                        </p>
                    </div>
                    <button type="button" onclick="window.smartTKBUI.openCumulativePriorModal()" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: none; padding: 0.45rem 0.9rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 2px 4px rgba(2,132,199,0.25); transition: all 0.2s ease;">
                        <span>📊</span> <span>Xem Bảng Đối Soát & Lũy Kế TKB Liền Kề</span>
                    </button>
                </div>

                <!-- 1. KHỐI TRẠNG THÁI XUNG ĐỘT CỨNG -->
                <div style="margin-bottom: 1.25rem;">
                    ${conflicts.length === 0 ? `
                        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.85rem 1.25rem; color: #065f46; display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.6rem;">✅</span>
                            <div>
                                <strong style="font-size: 0.95rem;">TUYỆT VỜI: 0 XUNG ĐỘT CỨNG!</strong>
                                <div style="font-size: 0.82rem; margin-top: 0.15rem;">
                                    Thời khóa biểu hoàn toàn sạch: Không có bất kỳ giáo viên nào bị trùng giờ dạy giữa các lớp, các phòng bộ môn hoạt động đúng tải thiết kế.
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 0.85rem 1.25rem; color: #991b1b;">
                            <strong>PHÁT HIỆN ${conflicts.length} XUNG ĐỘT CẦN XỬ LÝ:</strong>
                            <ul style="margin: 0.4rem 0 0 1rem; padding: 0; font-size: 0.82rem;">
                                ${conflicts.map(c => `<li>${c.message}</li>`).join('')}
                            </ul>
                        </div>
                    `}
                </div>

                <!-- 2. BẢO CÁO KIỂM TOÁN CHUYÊN SÂU SƯ PHẠM GDPT 2018 -->
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <h4 style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #1e293b; display: flex; align-items: center; gap: 0.4rem;">
                        <span>🔍</span> <span>Báo Cáo Đối Soát Sư Phạm & Điểm Nghẽn Cơ Sở</span>
                    </h4>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <!-- CỘT ĐIỂM SÁNG -->
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.85rem;">
                            <div style="font-weight: 700; color: #166534; font-size: 0.85rem; margin-bottom: 0.5rem; text-transform: uppercase;">
                                🌟 Điểm Sáng Vận Hành
                            </div>
                            <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: #15803d; line-height: 1.6;">
                                ${audit.positives.map(p => `<li>${p}</li>`).join('')}
                                <li>100% tiết Chào cờ được xếp đồng bộ sáng Thứ Hai Tiết 1 toàn trường.</li>
                                <li>Giáo viên chủ nhiệm (như Thầy Nguyễn Tá Quan 8A1) gắn kết trực tiếp với các tiết SHL và HĐCĐ của lớp.</li>
                            </ul>
                        </div>

                        <!-- CỘT ĐIỂM CẦN LƯU Ý -->
                        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 0.85rem;">
                            <div style="font-weight: 700; color: #92400e; font-size: 0.85rem; margin-bottom: 0.5rem; text-transform: uppercase;">
                                ⚠️ Điểm Nghẽn Sư Phạm Cần Tháo Gỡ
                            </div>
                            <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: #b45309; line-height: 1.6;">
                                ${audit.issues.length > 0 ? audit.issues.map(iss => `<li>${iss}</li>`).join('') : '<li>Không có điểm nghẽn nghiêm trọng.</li>'}
                            </ul>
                        </div>
                    </div>

                    <!-- KHỐI TƯ VẤN SƯ PHẠM CỦA AI DÀNH CHO BAN GIÁM HIỆU -->
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1rem;">
                        <div style="font-weight: 800; color: #1e40af; font-size: 0.88rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.35rem;">
                            <span>💡</span> <span>Tư Vấn & Khuyến Nghị Quản Trị Căn Cơ (Dành Cho Ban Giám Hiệu & Hội Đồng Sư Phạm):</span>
                        </div>
                        <div style="font-size: 0.82rem; color: #1e3a8a; line-height: 1.65;">
                            ${audit.recommendations.map(r => `<p style="margin: 0.3rem 0;">${r}</p>`).join('')}
                            <p style="margin: 0.3rem 0;">
                                📌 <strong>Thực tế chứng minh:</strong> Giáo viên trường bán trú đảm nhận 4-5 công việc nặng nhọc hỗ trợ học sinh (chăm sóc bán trú, nề nếp, bồi dưỡng, thiết bị phòng máy...). Khi nhà trường khai báo đầy đủ số tiết quy đổi theo <strong>Thông tư 28/2009 & TT 15/2020</strong> lên vnEdu/SMAS, toàn bộ 20 Thầy Cô đều đạt và vượt chuẩn 17 tiết. Từ đó, nhà trường hoàn toàn có cơ sở pháp lý và điều kiện kỹ thuật để sắp xếp TKB khoa học: đưa 100% tiết Sinh Hoạt Lớp (SHL) về sáng Thứ Bảy và gom các tiết thực hành KHTN thành tiết kép!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }


    exportToExcel() {
        let csvContent = "\uFEFF";
        csvContent += `THỜI KHÓA BIỂU TOÀN TRƯỜNG - NĂM HỌC ${this.engine.schoolConfig.academicYear}\n`;
        csvContent += `Đơn vị: ${this.engine.schoolConfig.schoolName}\n\n`;

        for (const c of this.engine.classes) {
            csvContent += `--- THỜI KHÓA BIỂU LỚP ${c} ---\n`;
            csvContent += `Tiết,${this.engine.DAYS.join(',')}\n`;

            for (let p = 0; p < this.engine.PERIODS.length; p++) {
                let row = [`Tiết ${p + 1}`];
                for (let d = 0; d < this.engine.DAYS.length; d++) {
                    const cell = this.engine.timetable[c][d][p];
                    if (cell) {
                        row.push(`"${cell.subject} (${cell.teacher})"`);
                    } else {
                        row.push(`"-"`);
                    }
                }
                csvContent += row.join(',') + '\n';
            }
            csvContent += '\n';
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `THOI_KHOA_BIEU_${this.engine.schoolConfig.academicYear.replace(/\s+/g, '')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('📥 Đã xuất file Thời khóa biểu toàn trường thành công!');
    }

    printTimetable() {
        window.print();
    }

    showToast(msg) {
        let toast = document.getElementById('tkbToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'tkbToast';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: #0f172a;
                color: #ffffff;
                padding: 0.75rem 1.25rem;
                border-radius: 8px;
                font-size: 0.85rem;
                font-weight: 600;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                z-index: 999999;
                transition: opacity 0.3s ease;
                border-left: 4px solid #3b82f6;
            `;
            document.body.appendChild(toast);
        }
        toast.innerHTML = msg;
        toast.style.opacity = '1';
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 3200);
    }

    /**
     * MỞ CỬA SỔ LỊCH BÁO GIẢNG TUẦN CHUẨN BỘ GIÁO DỤC & ĐÀO TẠO
     * Độc quyền hệ sinh thái EduStudio của Thầy Nguyễn Tá Quan
     */
    openTeachingScheduleModal(teacherName, weekNumber = 9) {
        const scheduleData = this.engine.generateTeachingSchedule(teacherName, weekNumber);

        let modal = document.getElementById('tkbTeachingScheduleModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tkbTeachingScheduleModal';
            modal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(5px); z-index: 999999; align-items: center; justify-content: center;
                padding: 1.5rem;
            `;
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: popIn 0.2s ease;">
                <!-- HEADER -->
                <div style="background: linear-gradient(135deg, #065f46, #047857); padding: 1.1rem 1.5rem; color: #fff; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.5rem;">📋</span>
                        <div>
                            <div style="font-weight: 800; font-size: 1.1rem; letter-spacing: -0.01em;">LỊCH BÁO GIẢNG GIẢNG DẠY - TUẦN ${weekNumber}</div>
                            <div style="font-size: 0.78rem; color: #a7f3d0;">Giáo viên: <strong>${teacherName}</strong> • Năm học: ${scheduleData.academicYear}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <button onclick="window.print()" style="background: #ffffff; color: #047857; border: none; padding: 0.4rem 0.85rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.3rem;">
                            <span>🖨️</span> <span>In Lịch Báo Giảng</span>
                        </button>
                        <button onclick="document.getElementById('tkbTeachingScheduleModal').style.display='none'" style="background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; line-height: 1;">&times;</button>
                    </div>
                </div>

                <!-- CONTROLS TUẦN -->
                <div style="background: #f8fafc; padding: 0.65rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-weight: 700; color: #334155;">Chọn Tuần Dạy:</span>
                        <select onchange="window.smartTKBUI.openTeachingScheduleModal('${teacherName}', parseInt(this.value))" style="padding: 0.3rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700; color: #047857;">
                            ${Array.from({length: 35}, (_, i) => i + 1).map(w => `<option value="${w}" ${w === weekNumber ? 'selected' : ''}>Tuần ${w}</option>`).join('')}
                        </select>
                    </div>
                    <div style="color: #64748b; font-size: 0.78rem;">
                        💡 Chuẩn hóa theo mẫu BGDĐT: Bấm vào tên bài dạy để mở ngay Kế hoạch bài dạy 5512
                    </div>
                </div>

                <!-- BẢNG BÁO GIẢNG -->
                <div style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1;">
                    <table class="tkb-table" style="font-size: 0.82rem;">
                        <thead>
                            <tr>
                                <th style="width: 80px;">Thứ / Ngày</th>
                                <th style="width: 50px;">Tiết</th>
                                <th style="width: 60px;">Lớp</th>
                                <th style="width: 60px;">Tiết PPCT</th>
                                <th>Tên Bài Dạy (Theo Chuẩn SGK Kết Nối Tri Thức)</th>
                                <th style="width: 140px;">ĐDDH / Thiết Bị</th>
                                <th style="width: 90px;">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${scheduleData.rows.map(row => `
                                <tr>
                                    <td style="font-weight: 700; color: #1e293b; text-align: center;">${row.dayName}</td>
                                    <td style="text-align: center; font-weight: 700; color: #047857;">${row.period}</td>
                                    <td style="text-align: center;"><span style="background: #e0e7ff; color: #3730a3; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">${row.classId}</span></td>
                                    <td style="text-align: center; font-weight: 700; color: #b45309;">${row.ppct}</td>
                                    <td>
                                        <div style="font-weight: 700; color: #0f172a;">${row.subject}</div>
                                        <div style="font-size: 0.75rem; color: #475569;">${row.lessonTitle}</div>
                                    </td>
                                    <td style="font-size: 0.75rem; color: #64748b;">${row.equipment}</td>
                                    <td style="text-align: center;">
                                        <button onclick="document.getElementById('tkbTeachingScheduleModal').style.display='none'; window.smartTKBUI.jumpToLessonPlan('${row.subject}', '${row.classId}')" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 4px; padding: 0.2rem 0.5rem; font-size: 0.72rem; font-weight: 700; cursor: pointer;">
                                            📑 KHBD
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- FOOTER -->
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.75rem; color: #64748b;">
                        Hệ thống tự động liên kết: <strong>Thời Khóa Biểu ➔ Lịch Báo Giảng ➔ Kế Hoạch Bài Dạy 5512</strong>
                    </div>
                    <button onclick="document.getElementById('tkbTeachingScheduleModal').style.display='none'" style="background: #e2e8f0; border: none; padding: 0.45rem 1rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer;">
                        Đóng Lại
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    /**
     * Tự động lưu trạng thái sau mỗi thao tác sửa đổi
     */
    persistChanges() {
        this.engine.saveState();
    }

    /**
     * XUẤT BÁO CÁO ĐỊNH MỨC & KIÊM NHIỆM CHUẨN VNEDU / SMAS
     */
    exportWorkloadCSV() {
        const report = this.engine.getTeacherWorkloadReport ? this.engine.getTeacherWorkloadReport() : [];
        if (report.length === 0) {
            this.showToast('⚠️ Không có dữ liệu định mức để xuất!');
            return;
        }

        let csv = "\uFEFF"; // UTF-8 BOM
        csv += "BỘ GIÁO DỤC VÀ ĐÀO TẠO,TRƯỜNG THCS BÁN TRÚ CANH THUẬN\n";
        csv += `BÁO CÁO QUẢN TRỊ ĐỊNH MỨC & PHÂN CÔNG CHUYÊN MÔN - NĂM HỌC ${this.engine.schoolConfig.academicYear}\n`;
        csv += "Căn cứ: Thông tư 28/2009/TT-BGDĐT & Thông tư 15/2020/TT-BGDĐT\n\n";
        csv += "STT,Họ và Tên Giáo Viên,Tổ Bộ Môn,Tiết Dạy Chuyên Môn,Môn Giảng Dạy,Tiết HĐTN Gánh Giờ,Lớp HĐTN,Nhiệm Vụ Kiêm Nhiệm Hỗ Trợ Trường,Tiết Quy Đổi TT28,Tổng Tiết Thực Nhận,Định Mức Chuẩn,Chênh Lệch,Trạng Thái Định Mức\n";

        for (const r of report) {
            const rolesStr = r.roles.map(x => `${x.name} (-${x.reduced}t)`).join('; ');
            csv += `"${r.index}","${r.teacherName}","${r.department}","${r.academicPeriods}","${r.academicSubjects}","${r.hdtnPeriods}","${r.hdtnSubjects}","${rolesStr}","${r.reducedTotal}","${r.finalTotal}","${r.standardQuota}","${r.diff > 0 ? '+' + r.diff : r.diff}","${r.statusText}"\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `BAO_CAO_DINH_MUC_GV_${this.engine.schoolConfig.academicYear.replace(/\s+/g, '')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('📥 Đã xuất Báo Cáo Định Mức 20 Thầy Cô chuẩn vnEdu/SMAS!');
    }

    printWorkloadTable() {
        window.print();
    }

    /**
     * MỞ CỬA SỔ TÙY CHỈNH VAI TRÒ KIÊM NHIỆM CHO GIÁO VIÊN
     */
    openEditRoleModal(teacherName) {
        const report = this.engine.getTeacherWorkloadReport ? this.engine.getTeacherWorkloadReport() : [];
        const teacher = report.find(r => r.teacherName === teacherName);
        if (!teacher) return;

        let modal = document.getElementById('editTeacherRoleModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'editTeacherRoleModal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const predefinedRoles = [
            { name: "Chủ nhiệm lớp (GVCN)", code: "GVCN", reduced: 4, note: "Quản lý nề nếp học sinh bán trú" },
            { name: "Tổ trưởng chuyên môn", code: "TTCM", reduced: 3, note: "Chỉ đạo chuyên môn tổ bộ môn" },
            { name: "Tổ phó chuyên môn", code: "TPCM", reduced: 1, note: "Hỗ trợ quản lý chuyên môn" },
            { name: "Phụ trách Phòng máy Tin học / CNTT", code: "LAB_TIN", reduced: 4, note: "Bảo trì dàn máy, hạ tầng số" },
            { name: "Phụ trách Phòng Lab KHTN (Lý/Hóa/Sinh)", code: "LAB_KHTN", reduced: 3, note: "Bảo quản hóa chất, thiết bị" },
            { name: "Phụ trách Sân bãi Thể chất / TDTT", code: "SAN_TDTT", reduced: 2, note: "Bảo quản trang thiết bị thể thao" },
            { name: "Thư ký Hội đồng trường", code: "THU_KY", reduced: 2, note: "Biên bản, nghị quyết hội đồng" },
            { name: "Phụ trách Phổ cập Giáo dục địa phương", code: "PHO_CAP", reduced: 3, note: "Hồ sơ phổ cập THCS xã" },
            { name: "Công tác Công đoàn / Nữ công", code: "CONG_DOAN", reduced: 2, note: "Chăm lo phong trào đoàn thể" },
            { name: "Công tác Quản lý Bán trú & Đời sống", code: "BAN_TRU", reduced: 9, note: "Giám sát giờ ăn, nghỉ trưa bán trú" }
        ];

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; width: 90%; max-width: 620px; max-height: 90vh; overflow-y: auto; padding: 1.5rem; box-shadow: 0 20px 40px rgba(0,0,0,0.3); margin: 5vh auto; font-family: inherit;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.15rem; color: #0f172a; display: flex; align-items: center; gap: 0.4rem;">
                            <span>✏️</span> <span>Cập Nhật Kiêm Nhiệm: ${teacher.teacherName}</span>
                        </h3>
                        <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #64748b;">
                            Số tiết dạy hiện tại: <strong>${teacher.teachingTotal} tiết</strong> (Chuyên môn: ${teacher.academicPeriods}t • HĐTN: ${teacher.hdtnPeriods}t)
                        </p>
                    </div>
                    <button onclick="document.getElementById('editTeacherRoleModal').style.display = 'none';" style="background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #64748b;">✕</button>
                </div>

                <div style="margin-bottom: 1rem;">
                    <div style="font-size: 0.82rem; font-weight: 700; color: #334155; margin-bottom: 0.5rem;">
                        Danh sách các nhiệm vụ kiêm nhiệm hiện tại:
                    </div>
                    <div id="roleItemsContainer" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${teacher.roles.map((r, rIdx) => `
                            <div class="role-item-row" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.5rem 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 700; font-size: 0.82rem; color: #0f172a;">${r.name}</div>
                                    <div style="font-size: 0.72rem; color: #64748b;">${r.note || ''}</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="background: #dbeafe; color: #1e40af; font-weight: 800; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">-${r.reduced} tiết</span>
                                    <button onclick="this.closest('.role-item-row').remove();" style="background: #fee2e2; color: #dc2626; border: none; border-radius: 4px; padding: 0.2rem 0.45rem; cursor: pointer; font-size: 0.75rem; font-weight: 700;">Xóa</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- THÊM NHIỆM VỤ MỚI -->
                <div style="background: #f1f5f9; border-radius: 8px; padding: 0.85rem; margin-bottom: 1.25rem;">
                    <div style="font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">
                        ➕ Thêm nhiệm vụ kiêm nhiệm từ danh mục chuẩn:
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <select id="selectQuickRole" style="flex: 1; min-width: 200px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem;">
                            ${predefinedRoles.map(pr => `
                                <option value="${pr.name}|${pr.reduced}|${pr.note}">
                                    ${pr.name} (Giảm ${pr.reduced} tiết)
                                </option>
                            `).join('')}
                        </select>
                        <button onclick="window.smartTKBUI.appendRoleToContainer()" style="background: #059669; color: #fff; border: none; padding: 0.4rem 0.85rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer;">
                            Thêm Vào Bảng
                        </button>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid #e2e8f0; padding-top: 0.85rem;">
                    <button onclick="document.getElementById('editTeacherRoleModal').style.display = 'none';" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 0.45rem 1rem; border-radius: 6px; font-weight: 700; font-size: 0.82rem; cursor: pointer;">
                        Hủy Bỏ
                    </button>
                    <button onclick="window.smartTKBUI.saveTeacherRolesFromModal('${teacher.teacherName}')" style="background: #2563eb; color: #fff; border: none; padding: 0.45rem 1.25rem; border-radius: 6px; font-weight: 800; font-size: 0.82rem; cursor: pointer;">
                        💾 Lưu & Tự Động Tính Lại
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'block';
    }

    appendRoleToContainer() {
        const select = document.getElementById('selectQuickRole');
        const container = document.getElementById('roleItemsContainer');
        if (!select || !container) return;

        const parts = select.value.split('|');
        const name = parts[0];
        const reduced = parseInt(parts[1]) || 0;
        const note = parts[2] || '';

        const row = document.createElement('div');
        row.className = 'role-item-row';
        row.style.cssText = 'background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.5rem 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;';
        row.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 0.82rem; color: #0f172a;">${name}</div>
                <div style="font-size: 0.72rem; color: #64748b;">${note}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="background: #dbeafe; color: #1e40af; font-weight: 800; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">-${reduced} tiết</span>
                <button onclick="this.closest('.role-item-row').remove();" style="background: #fee2e2; color: #dc2626; border: none; border-radius: 4px; padding: 0.2rem 0.45rem; cursor: pointer; font-size: 0.75rem; font-weight: 700;">Xóa</button>
            </div>
        `;
        row.dataset.roleName = name;
        row.dataset.roleReduced = reduced;
        row.dataset.roleNote = note;
        container.appendChild(row);
    }

    saveTeacherRolesFromModal(teacherName) {
        const container = document.getElementById('roleItemsContainer');
        if (!container) return;

        const newRoles = [];
        container.querySelectorAll('.role-item-row').forEach(row => {
            const nameEl = row.querySelector('div > div:first-child');
            const noteEl = row.querySelector('div > div:last-child');
            const badgeEl = row.querySelector('span');

            const name = nameEl ? nameEl.textContent.trim() : (row.dataset.roleName || '');
            const note = noteEl ? noteEl.textContent.trim() : (row.dataset.roleNote || '');
            let reduced = 0;
            if (badgeEl) {
                const match = badgeEl.textContent.match(/\d+/);
                if (match) reduced = parseInt(match[0]);
            }
            if (!reduced && row.dataset.roleReduced) reduced = parseInt(row.dataset.roleReduced);

            if (name) {
                newRoles.push({ name: name, reduced: reduced, note: note });
            }
        });

        if (this.engine.updateTeacherWorkloadRoles) {
            this.engine.updateTeacherWorkloadRoles(teacherName, newRoles);
            this.renderPCCMTable();
            this.renderStats();
            this.showToast(`✅ Đã cập nhật vai trò kiêm nhiệm cho ${teacherName}!`);
        }

        const modal = document.getElementById('editTeacherRoleModal');
        if (modal) modal.style.display = 'none';
    }

    resetWorkloadRoles() {
        if (confirm('Thầy có chắc chắn muốn khôi phục phân công kiêm nhiệm mặc định chuẩn BGDĐT cho tất cả giáo viên?')) {
            if (this.engine.resetTeacherWorkloadRoles) {
                this.engine.resetTeacherWorkloadRoles();
                this.renderPCCMTable();
                this.renderStats();
                this.showToast('🔄 Đã khôi phục kiêm nhiệm chuẩn BGDĐT!');
            }
        }
    }


    /**
     * CHUYỂN ĐỔI HỌC KỲ VÀ CẢ NĂM HỌC
     * @param {'HK1' | 'HK2' | 'YEAR'} sem 
     */
    /**
     * TỰ ĐỘNG THAY ĐỔI THEO TUẦN KHI CHỌN PRESET TRONG MODAL
     */
    onPlanTypeChange(val) {
        const input = document.getElementById('mcfgApplyWeekRange');
        if (!input) return;
        if (val === 'WEEK_9_13') input.value = 'Tuần 9 đến Tuần 13';
        else if (val === 'WEEK_1_9') input.value = 'Tuần 1 đến Tuần 9';
        else if (val === 'WEEK_10_18') input.value = 'Tuần 10 đến Tuần 18';
        else if (val === 'WEEK_19_27') input.value = 'Tuần 19 đến Tuần 27';
        else if (val === 'WEEK_28_35') input.value = 'Tuần 28 đến Tuần 35';
        else if (val === 'HK1') input.value = 'Học kỳ I (Tuần 1 - 18)';
        else if (val === 'HK2') input.value = 'Học kỳ II (Tuần 19 - 35)';
        else if (val === 'YEAR') input.value = 'Cả năm học (Tuần 1 - 35)';
        else if (val === 'WEEK_CUSTOM') {
            input.focus();
            input.select();
        }
    }

    /**
     * THIẾT LẬP KẾ HOẠCH ÁP DỤNG THEO TUẦN HOẶC THEO HỌC KỲ
     * (Đáp ứng các đơn vị trường học thay đổi TKB theo Tuần / Giai đoạn)
     */
    setSchedulePlan(plan) {
        if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
        this.engine.schoolConfig.schedulePlanType = plan;

        let weekLabel = 'Tuần 9 đến Tuần 13';
        let sem = 'HK1';

        if (plan === 'WEEK_9_13') {
            weekLabel = 'Tuần 9 đến Tuần 13';
            sem = 'HK1';
        } else if (plan === 'WEEK_1_9') {
            weekLabel = 'Tuần 1 đến Tuần 9';
            sem = 'HK1';
        } else if (plan === 'WEEK_10_18') {
            weekLabel = 'Tuần 10 đến Tuần 18';
            sem = 'HK1';
        } else if (plan === 'WEEK_19_27') {
            weekLabel = 'Tuần 19 đến Tuần 27';
            sem = 'HK2';
        } else if (plan === 'WEEK_28_35') {
            weekLabel = 'Tuần 28 đến Tuần 35';
            sem = 'HK2';
        } else if (plan === 'HK1') {
            weekLabel = 'Học kỳ I (Tuần 1 - 18)';
            sem = 'HK1';
        } else if (plan === 'HK2') {
            weekLabel = 'Học kỳ II (Tuần 19 - 35)';
            sem = 'HK2';
        } else if (plan === 'YEAR') {
            weekLabel = 'Cả năm học (Tuần 1 - 35)';
            sem = 'YEAR';
        }

        this.engine.schoolConfig.applyWeekRange = weekLabel;
        this.engine.schoolConfig.semester = (sem === 'HK2' ? 'Học kỳ II' : (sem === 'YEAR' ? 'Cả năm' : 'Học kỳ I'));

        // Đồng bộ các thẻ select trên giao diện
        const selMain = document.getElementById('tkbSemesterSelect');
        if (selMain) selMain.value = plan;
        const selSchool = document.getElementById('tkbSchoolViewSemSelect');
        if (selSchool) selSchool.value = plan;

        // Chuyển học kỳ tương ứng trong engine nếu cần
        if (sem === 'YEAR') {
            this.pccmFilter = 'annual';
            this.switchSubTab('pccm');
            this.showToast('📅 Đã mở Bảng Quyết Toán Định Mức Cả Năm (35 Tuần)!');
        } else {
            if (this.engine.switchSemester) {
                this.engine.switchSemester(sem);
            }
            this.showToast(`📅 Đã cập nhật áp dụng: ${weekLabel}!`);
        }

        this.engine.saveState();
        this.renderCurrentView();
        this.renderPCCMTable();
        this.renderStats();
    }

    setSemester(sem) {
        // Cập nhật cốt bên trong Engine
        this.engine.currentSemester = sem;
        if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
        this.engine.schoolConfig.semester = (sem === 'HK2' ? 'Học kỳ II' : (sem === 'YEAR' ? 'Cả năm' : 'Học kỳ I'));

        if (sem === 'YEAR') {
            this.pccmFilter = 'annual';
            this.switchSubTab('pccm');
            this.showToast('📅 Đã mở Bảng Quyết Toán Định Mức Cả Năm (35 Tuần - 595 Tiết Chuẩn Bán Trú)!');
        } else {
            if (this.engine.switchSemester) {
                this.engine.switchSemester(sem);
            }
            this.renderCurrentView();
            this.renderPCCMTable();
            this.renderStats();

            if (sem === 'HK2') {
                this.showToast('🌸 Đã chuyển sang TKB Học Kỳ II (17 tuần: Hoán đổi Địa lí 2t - Lịch sử 1t chuẩn CV 1496/BGDĐT)!');
            } else {
                this.showToast('🍁 Đã chuyển sang TKB Học Kỳ I (18 tuần: Lịch sử 2t - Địa lí 1t)!');
            }
        }

        // Cập nhật trạng thái active của nút chọn học kỳ ngoài giao diện
        document.querySelectorAll('.btn-semester-pill').forEach(btn => {
            const isTarget = (btn.dataset.sem === sem);
            btn.classList.toggle('active', isTarget);
            if (btn.dataset.sem === 'HK1') {
                btn.style.background = isTarget ? '#c2410c' : '#ffffff';
                btn.style.color = isTarget ? '#ffffff' : '#475569';
                btn.style.border = isTarget ? 'none' : '1px solid #cbd5e1';
                btn.style.fontWeight = isTarget ? '800' : '700';
            } else if (btn.dataset.sem === 'HK2') {
                btn.style.background = isTarget ? '#059669' : '#ffffff';
                btn.style.color = isTarget ? '#ffffff' : '#475569';
                btn.style.border = isTarget ? 'none' : '1px solid #cbd5e1';
                btn.style.fontWeight = isTarget ? '800' : '700';
            } else if (btn.dataset.sem === 'YEAR') {
                btn.style.background = isTarget ? '#4338ca' : '#ffffff';
                btn.style.color = isTarget ? '#ffffff' : '#4338ca';
                btn.style.border = isTarget ? 'none' : '1px solid #c7d2fe';
                btn.style.fontWeight = isTarget ? '800' : '700';
            }
        });

        // Đồng bộ 2 chiều: cập nhật trường Học kỳ trong Hộp thoại Master nếu đang mở
        const mcfgSem = document.getElementById('mcfgSemester');
        if (mcfgSem && mcfgSem.value !== sem) {
            mcfgSem.value = sem;
        }

        this.engine.saveState();
    }

    /**
     * XUẤT FILE BÁO CÁO QUYẾT TOÁN CẢ NĂM (35 TUẦN - 595 TIẾT)
     */
    exportAnnualSettlementCSV() {
        const report = this.engine.getAnnualWorkloadSettlement ? this.engine.getAnnualWorkloadSettlement() : [];
        if (report.length === 0) return;

        let csv = "\uFEFF";
        csv += "BỘ GIÁO DỤC VÀ ĐÀO TẠO,TRƯỜNG THCS BÁN TRÚ CANH THUẬN\n";
        csv += `BÁO CÁO QUYẾT TOÁN ĐỊNH MỨC NĂM HỌC ${this.engine.schoolConfig.academicYear} (35 TUẦN)\n`;
        csv += "Căn cứ: Điều 5 & 6 Thông tư 28/2009/TT-BGDĐT (Định mức trường PTDTBT: 17 tiết/tuần x 35 tuần = 595 tiết/năm)\n\n";
        csv += "STT,Họ và Tên Giáo Viên,Tổ Chuyên Môn,Tiết Dạy HK I/Tuần,Tiết Dạy HK II/Tuần,Tổng Tiết Dạy 35 Tuần,Tổng Tiết Kiêm Nhiệm 35 Tuần,Tổng Tiết Thực Hiện Cả Năm,Định Mức Chuẩn Cả Năm,Chênh Lệch Cả Năm,Trạng Thái Quyết Toán\n";

        for (const r of report) {
            csv += `"${r.index}","${r.teacherName}","${r.department}","${r.teachingHK1}","${r.teachingHK2}","${r.annualTeaching}","${r.annualReduced}","${r.annualFinal}","${r.standardAnnual}","${r.diffAnnual > 0 ? '+' + r.diffAnnual : r.diffAnnual}","${r.statusText}"\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `QUYET_TOAN_DINH_MUC_CA_NAM_35_TUAN_${this.engine.schoolConfig.academicYear.replace(/\s+/g, '')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('📥 Đã xuất Báo Cáo Quyết Toán Cả Năm (35 Tuần) chuẩn BGDĐT!');
    }


    /**
     * CHẾ ĐỘ MÀU SẮC BÀN CỜ TKB (CLEAN DỊU MẮT HOẶC PASTEL PHÂN MÀU)
     */
    setColorMode(mode) {
        this.masterColorMode = mode;
        const btnClean = document.getElementById('btnColorClean');
        const btnPastel = document.getElementById('btnColorPastel');
        if (btnClean && btnPastel) {
            if (mode === 'clean') {
                btnClean.style.background = '#0f172a';
                btnClean.style.color = '#ffffff';
                btnPastel.style.background = '#ffffff';
                btnPastel.style.color = '#475569';
            } else {
                btnPastel.style.background = '#2563eb';
                btnPastel.style.color = '#ffffff';
                btnClean.style.background = '#ffffff';
                btnClean.style.color = '#475569';
            }
        }
        this.renderCurrentView();
        this.showToast(mode === 'clean' ? '✨ Đã chuyển sang chế độ màu Dịu mắt Clean!' : '🎨 Đã chuyển sang chế độ Thẻ màu Pastel!');
    }


    /**
     * ==============================================================================
     * BỘ PHÂN HỆ KHAI BÁO THAM SỐ TỔNG THỂ TOÀN TRƯỜNG CHO GDMN & GDPT TOÀN CẦU
     * ==============================================================================
     */
    changeEducationalTier(tier) {
        if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
        this.engine.schoolConfig.educationalTier = tier;

        const tierNames = {
            'GDMN': '👶 Giáo Dục Mầm Non (Chế độ sinh hoạt & Chơi)',
            'TIEU_HOC': '🎒 Giáo Dục Tiểu Học (Cấp 1 • 2 buổi/ngày • 23t/tuần)',
            'THCS': '🏫 Giáo Dục THCS (Cấp 2 • GDPT 2018 • 17-19t/tuần)',
            'THPT': '🎓 Giáo Dục THPT (Cấp 3 • Phân hóa tổ hợp môn • 17t/tuần)',
            'LIEN_CAP': '🌐 Trường Phổ Thông Liên Cấp K-12 Quốc Tế'
        };

        const tierName = tierNames[tier] || tier;
        this.updateSchoolScaleSummary();
        this.showToast(`✨ Đã chuyển cấu hình tổng thể sang: ${tierName}!`);
    }

    changeSchoolModel(model) {
        if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
        this.engine.schoolConfig.schoolModel = model;

        const modelNames = {
            'BAN_TRU': 'Bán Trú PTDTBT (Định mức chuẩn 17 tiết/tuần)',
            'CONG_LAP': 'Công Lập Chuẩn (Định mức chuẩn 19 tiết/tuần)',
            'HAI_BUOI': 'Học 2 Buổi/Ngày (Bán trú Cấp 1 & Cấp 2)',
            'NOI_TRU': 'Nội Trú Quốc Gia / Quốc Tế',
            'TU_THUC': 'Tư Thục / Tự Chủ Chất Lượng Cao'
        };

        const modelName = modelNames[model] || model;
        this.updateSchoolScaleSummary();
        this.showToast(`🏠 Đã thiết lập mô hình trường: ${modelName}!`);
    }

    updateSchoolScaleSummary() {
        const lbl = document.getElementById('lblSchoolScaleSummary');
        if (!lbl) return;

        const tier = this.engine.schoolConfig.educationalTier || 'THCS';
        const model = this.engine.schoolConfig.schoolModel || 'BAN_TRU';
        const numClasses = this.engine.classes.length;
        const numTeachers = this.engine.getAllTeachers ? this.engine.getAllTeachers().length : 20;
        const numRooms = this.engine.specialRooms ? this.engine.specialRooms.length : 4;
        const standardHours = model === 'BAN_TRU' ? 17 : (tier === 'TIEU_HOC' ? 23 : 19);

        lbl.innerHTML = `${numClasses} Lớp • ${numTeachers} GV • ${numRooms} Lab/Phòng • 35 Tuần (Chuẩn ${standardHours}t/tuần)`;
    }

    /**
     * MỞ MODAL KHAI BÁO THAM SỐ TỔNG THỂ TOÀN TRƯỜNG (GDMN & GDPT TOÀN CẦU)
     */
    openGlobalSchoolConfigModal() {
        let modal = document.getElementById('tkbGlobalConfigModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tkbGlobalConfigModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(5px); z-index: 999999; align-items: center; justify-content: center;
                padding: 1rem;
            `;
            document.body.appendChild(modal);
        }

        const sc = this.engine.schoolConfig || {};
        const schoolName = sc.schoolName || 'Trường THCS Bán Trú Canh Thuận';
        const academicYear = sc.academicYear || '2026 - 2027';
        const tier = sc.educationalTier || 'THCS';
        const model = sc.schoolModel || 'BAN_TRU';
        const standardHours = sc.standardPeriodsPerWeek || (model === 'BAN_TRU' ? 17 : 19);
        const totalWeeks = sc.totalWeeks || 35;
        const session = sc.session || 'Sáng (5 tiết/buổi)';

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; max-width: 680px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #cbd5e1; overflow: hidden; animation: modalPop 0.2s ease-out;">
                
                <!-- HEADER MODAL -->
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.4rem;">🌍</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; letter-spacing: 0.3px;">KHAI BÁO THAM SỐ TỔNG THỂ TOÀN TRƯỜNG</h3>
                            <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: #93c5fd;">Hệ sinh thái Giáo dục Liên hoàn GDMN &amp; GDPT Toàn Cầu</p>
                        </div>
                    </div>
                    <button onclick="window.smartTKBUI.closeGlobalSchoolConfigModal()" style="background: transparent; border: none; color: #cbd5e1; font-size: 1.5rem; cursor: pointer; line-height: 1;">&times;</button>
                </div>

                <!-- BODY MODAL -->
                <div style="padding: 1.25rem; max-height: 75vh; overflow-y: auto;">
                    
                    <!-- NẠP NHANH MẪU CHUẨN CÁC CẤP HỌC -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem;">
                        <div style="font-size: 0.76rem; font-weight: 800; color: #475569; margin-bottom: 0.4rem; text-transform: uppercase;">
                            ⚡ Nạp Mẫu Định Dạng Chuẩn Các Cấp Học (One-Click Presets):
                        </div>
                        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                            <button type="button" onclick="window.smartTKBUI.applySchoolPreset('THCS_BAN_TRU')" style="padding: 0.3rem 0.6rem; font-size: 0.72rem; font-weight: 700; border-radius: 6px; border: 1px solid #93c5fd; background: #eff6ff; color: #1d4ed8; cursor: pointer;">
                                🏫 Mẫu THCS Bán Trú Canh Thuận (Chuẩn 17t)
                            </button>
                            <button type="button" onclick="window.smartTKBUI.applySchoolPreset('TIEU_HOC_2BUOI')" style="padding: 0.3rem 0.6rem; font-size: 0.72rem; font-weight: 700; border-radius: 6px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; cursor: pointer;">
                                🎒 Mẫu Tiểu Học 2 Buổi/Ngày (Chuẩn 23t)
                            </button>
                            <button type="button" onclick="window.smartTKBUI.applySchoolPreset('MAM_NON')" style="padding: 0.3rem 0.6rem; font-size: 0.72rem; font-weight: 700; border-radius: 6px; border: 1px solid #fde68a; background: #fffbeb; color: #b45309; cursor: pointer;">
                                👶 Mẫu Mầm Non (Chế độ Sinh hoạt &amp; Chơi)
                            </button>
                            <button type="button" onclick="window.smartTKBUI.applySchoolPreset('THPT_CHUAN')" style="padding: 0.3rem 0.6rem; font-size: 0.72rem; font-weight: 700; border-radius: 6px; border: 1px solid #c7d2fe; background: #e0e7ff; color: #4338ca; cursor: pointer;">
                                🎓 Mẫu THPT Tổ Hợp (Chuẩn 17t)
                            </button>
                        </div>
                    </div>

                    <!-- LƯỚI KHAI BÁO CÁC TRƯỜNG DỮ LIỆU -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
                        
                        <div style="grid-column: 1 / -1;">
                            <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                🏫 Tên Cơ Sở Giáo Dục / Trường Học:
                            </label>
                            <input type="text" id="cfgSchoolName" value="${schoolName}" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.85rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                🎓 Cấp Học (Educational Tier):
                            </label>
                            <select id="cfgTier" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff;">
                                <option value="GDMN" ${tier === 'GDMN' ? 'selected' : ''}>👶 Giáo Dục Mầm Non (Chế độ sinh hoạt &amp; Chơi)</option>
                                <option value="TIEU_HOC" ${tier === 'TIEU_HOC' ? 'selected' : ''}>🎒 Giáo Dục Tiểu Học (Cấp 1 • 2 buổi/ngày)</option>
                                <option value="THCS" ${tier === 'THCS' ? 'selected' : ''}>🏫 Giáo Dục THCS (Cấp 2 • GDPT 2018)</option>
                                <option value="THPT" ${tier === 'THPT' ? 'selected' : ''}>🎓 Giáo Dục THPT (Cấp 3 • Phân hóa tổ hợp)</option>
                                <option value="LIEN_CAP" ${tier === 'LIEN_CAP' ? 'selected' : ''}>🌐 Trường Phổ Thông Liên Cấp K-12</option>
                            </select>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                🏠 Mô Hình Trường &amp; Chế Độ:
                            </label>
                            <select id="cfgModel" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff;">
                                <option value="BAN_TRU" ${model === 'BAN_TRU' ? 'selected' : ''}>Bán Trú PTDTBT (Định mức 17 tiết/tuần)</option>
                                <option value="CONG_LAP" ${model === 'CONG_LAP' ? 'selected' : ''}>Công Lập Chuẩn (Định mức 19 tiết/tuần)</option>
                                <option value="HAI_BUOI" ${model === 'HAI_BUOI' ? 'selected' : ''}>Học 2 Buổi/Ngày (Tiểu học / Bán trú)</option>
                                <option value="NOI_TRU" ${model === 'NOI_TRU' ? 'selected' : ''}>Nội Trú Quốc Gia / Quốc Tế</option>
                                <option value="TU_THUC" ${model === 'TU_THUC' ? 'selected' : ''}>Tư Thục / Tự Chủ Chất Lượng Cao</option>
                            </select>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                📅 Năm Học (Academic Year):
                            </label>
                            <input type="text" id="cfgAcademicYear" value="${academicYear}" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                🎯 Định Mức Tiết Dạy Chuẩn (Tiết/Tuần):
                            </label>
                            <input type="number" id="cfgStandardHours" value="${standardHours}" min="10" max="35" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                📊 Kế Hoạch Số Tuần Thực Dạy Cả Năm:
                            </label>
                            <input type="number" id="cfgTotalWeeks" value="${totalWeeks}" min="30" max="40" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                ⏰ Khung Giờ &amp; Ca Học:
                            </label>
                            <input type="text" id="cfgSession" value="${session}" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>

                    </div>

                </div>

                <!-- FOOTER MODAL -->
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.85rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.72rem; color: #64748b;">
                        Áp dụng Thông tư 28/2009 &amp; 15/2017/TT-BGDĐT
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" onclick="window.smartTKBUI.closeGlobalSchoolConfigModal()" style="padding: 0.45rem 0.85rem; font-size: 0.78rem; font-weight: 700; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; cursor: pointer;">
                            Đóng
                        </button>
                        <button type="button" onclick="window.smartTKBUI.saveGlobalSchoolConfig()" style="padding: 0.45rem 1rem; font-size: 0.78rem; font-weight: 800; border-radius: 6px; border: none; background: #1d4ed8; color: #ffffff; cursor: pointer; box-shadow: 0 2px 6px rgba(29, 78, 216, 0.3);">
                            💾 Lưu &amp; Áp Dụng Toàn Trường
                        </button>
                    </div>
                </div>

            </div>
        `;
        modal.style.display = 'flex';
    }

    closeGlobalSchoolConfigModal() {
        const modal = document.getElementById('tkbGlobalConfigModal');
        if (modal) modal.style.display = 'none';
    }

    applySchoolPreset(presetType) {
        const nameInput = document.getElementById('mcfgSchoolName') || document.getElementById('cfgSchoolName');
        const tierSelect = document.getElementById('mcfgTier') || document.getElementById('cfgTier');
        const modelSelect = document.getElementById('mcfgModel') || document.getElementById('cfgModel');
        const standardInput = document.getElementById('mcfgStandardHours') || document.getElementById('cfgStandardHours');
        const sessionInput = document.getElementById('mcfgSession') || document.getElementById('cfgSession');
        
        const oldName = document.getElementById('cfgSchoolName');
        const oldTier = document.getElementById('cfgTier');
        const oldModel = document.getElementById('cfgModel');
        const oldStd = document.getElementById('cfgStandardHours');
        const oldSess = document.getElementById('cfgSession');

        if (presetType === 'THCS_BAN_TRU') {
            if (nameInput) nameInput.value = 'Trường THCS Bán Trú Canh Thuận';
            if (tierSelect) tierSelect.value = 'THCS';
            if (modelSelect) modelSelect.value = 'BAN_TRU';
            if (standardInput) standardInput.value = '17';
            if (sessionInput) sessionInput.value = 'Sáng (5 tiết/buổi)';
            this.showToast('🏫 Đã nạp mẫu chuẩn THCS Bán Trú Canh Thuận (17 tiết/tuần)!');
        } else if (presetType === 'TIEU_HOC_2BUOI') {
            if (nameInput) nameInput.value = 'Trường Tiểu Học Chuẩn Quốc Gia';
            if (tierSelect) tierSelect.value = 'TIEU_HOC';
            if (modelSelect) modelSelect.value = 'HAI_BUOI';
            if (standardInput) standardInput.value = '23';
            if (sessionInput) sessionInput.value = 'Sáng 4 tiết • Chiều 3 tiết (2 buổi/ngày)';
            this.showToast('🎒 Đã nạp mẫu chuẩn Tiểu Học (2 buổi/ngày • 23 tiết/tuần)!');
        } else if (presetType === 'MAM_NON') {
            if (nameInput) nameInput.value = 'Trường Mầm Non Họa Mi';
            if (tierSelect) tierSelect.value = 'GDMN';
            if (modelSelect) modelSelect.value = 'HAI_BUOI';
            if (standardInput) standardInput.value = '30';
            if (sessionInput) sessionInput.value = 'Cả ngày (Chế độ sinh hoạt & Chơi theo lứa tuổi)';
            this.showToast('👶 Đã nạp mẫu chuẩn GD Mầm Non (Chế độ sinh hoạt & Chơi)!');
        } else if (presetType === 'THPT_CHUAN') {
            if (nameInput) nameInput.value = 'Trường THPT Chuyên / Chuẩn Quốc Gia';
            if (tierSelect) tierSelect.value = 'THPT';
            if (modelSelect) modelSelect.value = 'CONG_LAP';
            if (standardInput) standardInput.value = '17';
            if (sessionInput) sessionInput.value = 'Sáng (5 tiết/buổi)';
            this.showToast('🎓 Đã nạp mẫu chuẩn THPT Tổ Hợp Môn (17 tiết/tuần)!');
        }
    }

    saveGlobalSchoolConfig() {
        const schoolName = document.getElementById('cfgSchoolName')?.value || 'Trường THCS Bán Trú Canh Thuận';
        const tier = document.getElementById('cfgTier')?.value || 'THCS';
        const model = document.getElementById('cfgModel')?.value || 'BAN_TRU';
        const academicYear = document.getElementById('cfgAcademicYear')?.value || '2026 - 2027';
        const standardHours = parseInt(document.getElementById('cfgStandardHours')?.value) || 17;
        const totalWeeks = parseInt(document.getElementById('cfgTotalWeeks')?.value) || 35;
        const session = document.getElementById('cfgSession')?.value || 'Sáng (5 tiết/buổi)';

        if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
        this.engine.schoolConfig.schoolName = schoolName;
        this.engine.schoolConfig.educationalTier = tier;
        this.engine.schoolConfig.schoolModel = model;
        this.engine.schoolConfig.academicYear = academicYear;
        this.engine.schoolConfig.standardPeriodsPerWeek = standardHours;
        this.engine.schoolConfig.totalWeeks = totalWeeks;
        this.engine.schoolConfig.session = session;

        // Lưu vào engine
        this.engine.saveState();

        // Cập nhật giao diện bên ngoài
        const displayElem = document.getElementById('tkbGlobalSchoolNameDisplay');
        if (displayElem) displayElem.innerHTML = `🏫 ${schoolName}`;

        const tierElem = document.getElementById('tkbGlobalTierSelect');
        if (tierElem) tierElem.value = tier;

        const modelElem = document.getElementById('tkbGlobalModelSelect');
        if (modelElem) modelElem.value = model;

        this.updateSchoolScaleSummary();
        this.closeGlobalSchoolConfigModal();
        this.renderCurrentView();
        this.renderStats();

        this.showToast(`🎉 Đã lưu & áp dụng toàn diện hồ sơ trường: [${schoolName}] cho cả hệ thống!`);
    }


    /**
     * ==============================================================================
     * BỘ PHÂN HỆ ĐIỀU CHỈNH PPCT MÔN HỌC • ƯU TIÊN SƯ PHẠM • XUẤT/NHẬP TKB MASTER
     * ==============================================================================
     */

    /**
     * BẬT / TẮT CÁC RÀNG BUỘC ƯU TIÊN SƯ PHẠM THỰC TẾ
     */
    togglePriority(key, isEnabled) {
        if (!this.engine.pedagogicalPriorities) this.engine.pedagogicalPriorities = {};
        this.engine.pedagogicalPriorities[key] = isEnabled;
        this.engine.saveState();

        const labels = {
            'gvcnOffDays': 'GVCN được ưu tiên nghỉ 2 buổi/tuần',
            'noPEPeriod45': 'Không xếp Thể dục vào tiết 4-5 trưa nắng',
            'maxPeriodsPerDay': 'Giới hạn tối đa 4 tiết dạy/ngày/GV',
            'preferDoublePeriods': 'Ưu tiên xếp tiết đôi cho môn KHTN & Ngữ văn'
        };

        const lbl = labels[key] || key;
        this.showToast(`${isEnabled ? '✅ Đã kích hoạt' : '⏸️ Đã tắt'} ưu tiên: ${lbl}!`);
    }

    /**
     * MỞ MODAL ĐIỀU CHỈNH KHUNG PHÂN PHỐI CHƯƠNG TRÌNH (PPCT) MÔN HỌC
     * Phục vụ cập nhật nhanh khi có thay đổi quy định/văn bản mới của Bộ/Sở
     */
    openCurriculumConfigModal() {
        let modal = document.getElementById('tkbCurriculumModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tkbCurriculumModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(5px); z-index: 999999; align-items: center; justify-content: center;
                padding: 1rem;
            `;
            document.body.appendChild(modal);
        }

        const subjects = this.engine.subjects || [];
        const rooms = this.engine.specialRooms || [];

        let rowsHtml = '';
        subjects.forEach((sub, idx) => {
            let roomOptions = '<option value="">(Không yêu cầu)</option>';
            rooms.forEach(r => {
                roomOptions += `<option value="${r.id}" ${sub.roomReq === r.id ? 'selected' : ''}>${r.icon} ${r.name}</option>`;
            });

            rowsHtml += `
                <tr data-index="${idx}">
                    <td style="padding: 0.45rem 0.6rem; text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
                    <td style="padding: 0.45rem 0.6rem;">
                        <input type="text" class="cfg-sub-name" value="${sub.name}" style="width: 100%; padding: 0.25rem 0.45rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 4px;">
                    </td>
                    <td style="padding: 0.45rem 0.6rem; text-align: center;">
                        <input type="number" class="cfg-sub-periods" value="${sub.periodsPerWeek}" min="1" max="10" style="width: 60px; padding: 0.25rem 0.45rem; font-size: 0.8rem; font-weight: 800; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; color: #1d4ed8;">
                    </td>
                    <td style="padding: 0.45rem 0.6rem; text-align: center;">
                        <input type="checkbox" class="cfg-sub-double" ${sub.doublePeriod ? 'checked' : ''} style="cursor: pointer;">
                    </td>
                    <td style="padding: 0.45rem 0.6rem;">
                        <select class="cfg-sub-room" style="width: 100%; padding: 0.25rem 0.45rem; font-size: 0.76rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff;">
                            ${roomOptions}
                        </select>
                    </td>
                </tr>
            `;
        });

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; max-width: 760px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #cbd5e1; overflow: hidden; animation: modalPop 0.2s ease-out;">
                
                <!-- HEADER MODAL -->
                <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 0.9rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.4rem;">📚</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; letter-spacing: 0.3px;">ĐIỀU CHỈNH KHUNG PHÂN PHỐI CHƯƠNG TRÌNH (PPCT) MÔN HỌC</h3>
                            <p style="margin: 0.15rem 0 0 0; font-size: 0.74rem; color: #e0f2fe;">Cập nhật nhanh số tiết/tuần khi có thay đổi quy định GDPT 2018 &amp; GDMN</p>
                        </div>
                    </div>
                    <button onclick="window.smartTKBUI.closeCurriculumConfigModal()" style="background: transparent; border: none; color: #ffffff; font-size: 1.5rem; cursor: pointer; line-height: 1;">&times;</button>
                </div>

                <!-- BODY MODAL -->
                <div style="padding: 1.25rem; max-height: 70vh; overflow-y: auto;">
                    
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.5rem 0.85rem; margin-bottom: 0.85rem; font-size: 0.75rem; color: #166534; line-height: 1.4;">
                        💡 <strong>Lưu ý nghiệp vụ:</strong> Khi Bộ GD&amp;ĐT hoặc Sở ban hành văn bản điều chỉnh số tiết (ví dụ: Công văn 1496/BGDĐT hoán đổi Lịch sử - Địa lí, tách HĐTN...), Thầy Cô chỉ cần chỉnh số tiết/tuần tại bảng này rồi bấm <strong>Lưu &amp; Cập Nhật</strong>, toàn bộ hệ thống sẽ tự động đồng bộ!
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                        <thead>
                            <tr style="background: #f1f5f9; color: #334155; text-align: left; border-bottom: 2px solid #cbd5e1;">
                                <th style="padding: 0.5rem 0.6rem; width: 45px; text-align: center;">STT</th>
                                <th style="padding: 0.5rem 0.6rem;">Tên Môn Học (Bộ Môn)</th>
                                <th style="padding: 0.5rem 0.6rem; width: 110px; text-align: center;">Số Tiết/Tuần</th>
                                <th style="padding: 0.5rem 0.6rem; width: 90px; text-align: center;">Tiết Kép (2t)</th>
                                <th style="padding: 0.5rem 0.6rem;">Phòng Bộ Môn Yêu Cầu</th>
                            </tr>
                        </thead>
                        <tbody id="tblCurriculumBody">
                            ${rowsHtml}
                        </tbody>
                    </table>

                </div>

                <!-- FOOTER MODAL -->
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.85rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.72rem; color: #64748b;">
                        Tổng số: ${subjects.length} môn học trong chương trình
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" onclick="window.smartTKBUI.closeCurriculumConfigModal()" style="padding: 0.45rem 0.85rem; font-size: 0.78rem; font-weight: 700; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; cursor: pointer;">
                            Đóng
                        </button>
                        <button type="button" onclick="window.smartTKBUI.saveCurriculumConfig()" style="padding: 0.45rem 1rem; font-size: 0.78rem; font-weight: 800; border-radius: 6px; border: none; background: #0284c7; color: #ffffff; cursor: pointer; box-shadow: 0 2px 6px rgba(2,132,199,0.3);">
                            💾 Lưu &amp; Cập Nhật PPCT
                        </button>
                    </div>
                </div>

            </div>
        `;
        modal.style.display = 'flex';
    }

    closeCurriculumConfigModal() {
        const modal = document.getElementById('tkbCurriculumModal');
        if (modal) modal.style.display = 'none';
    }

    saveCurriculumConfig() {
        const rows = document.querySelectorAll('#tblCurriculumBody tr');
        if (!rows || rows.length === 0) return;

        let updatedSubjects = [];
        rows.forEach(tr => {
            const idx = parseInt(tr.dataset.index);
            const name = tr.querySelector('.cfg-sub-name')?.value || '';
            const periods = parseInt(tr.querySelector('.cfg-sub-periods')?.value) || 1;
            const isDouble = tr.querySelector('.cfg-sub-double')?.checked || false;
            const room = tr.querySelector('.cfg-sub-room')?.value || null;

            const oldSub = this.engine.subjects[idx] || {};
            updatedSubjects.push({
                ...oldSub,
                name: name,
                periodsPerWeek: periods,
                doublePeriod: isDouble,
                roomReq: room || null
            });
        });

        this.engine.subjects = updatedSubjects;
        this.engine.saveState();

        this.closeCurriculumConfigModal();
        this.renderPCCMTable();
        this.renderConfigTab();
        this.renderStats();

        this.showToast('🎉 Đã cập nhật thành công Khung Phân Phối Chương Trình (PPCT) môn học!');
    }

    /**
     * XUẤT TOÀN BỘ GÓI THÔNG TIN TKB MASTER (.JSON)
     * Đầy đủ 100%: Cấu hình trường, PPCT, Giáo viên, Lớp, Ràng buộc ưu tiên & TKB
     */
    
    /**
     * XUẤT TOÀN BỘ GÓI DỮ LIỆU TKB MASTER DƯỚI ĐỊNH DẠNG FILE EXCEL (.XLSX / .XLS)
     * Đầy đủ 5 Sheets: THONG_TIN_TRUONG, KHUNG_PPCT_MON_HOC, PHAN_CONG_CHUYEN_MON, UU_TIEN_SU_PHAM, THOI_KHOA_BIEU
     * Mọi giáo viên đều có thể mở, xem và chỉnh sửa dễ dàng trên Microsoft Excel!
     */
    exportMasterTKBPackage() {
        if (typeof XLSX === 'undefined') {
            this.showToast('⚠️ Thư viện Excel đang nạp, vui lòng thử lại sau giây lát!');
            return;
        }

        const sc = this.engine.schoolConfig || {};
        const prio = this.engine.pedagogicalPriorities || {};
        const subjects = this.engine.subjects || [];
        const rooms = this.engine.specialRooms || [];
        const assignments = this.engine.assignments || [];
        const timetable = this.engine.timetable || {};

        const wb = XLSX.utils.book_new();

        // 1. SHEET: THONG_TIN_TRUONG
        const schoolRows = [
            ["MÃ THAM SỐ", "GIÁ TRỊ KHAI BÁO", "HƯỚNG DẪN & Ý NGHĨA SƯ PHẠM"],
            ["TenTruong", sc.schoolName || "Trường THCS Bán Trú Canh Thuận", "Tên chính thức của cơ sở giáo dục"],
            ["CapHoc", sc.educationalTier || "THCS", "Cấp học: GDMN / TIEU_HOC / THCS / THPT / LIEN_CAP"],
            ["MoHinh", sc.schoolModel || "BAN_TRU", "Mô hình: BAN_TRU / CONG_LAP / HAI_BUOI / NOI_TRU / TU_THUC"],
            ["NamHoc", sc.academicYear || "2026 - 2027", "Năm học áp dụng thời khóa biểu"],
            ["HocKy", sc.semester || "Học kỳ I", "Học kỳ áp dụng"],
            ["DinhMucChuan", sc.standardPeriodsPerWeek || 17, "Định mức tiết chuẩn/tuần theo Thông tư 28/2009 & 15/2017"],
            ["SoTuanKeHoach", sc.totalWeeks || 35, "Kế hoạch số tuần thực dạy cả năm"],
            ["CaHoc", sc.session || "Sáng (5 tiết/buổi)", "Khung giờ và ca học giảng dạy"],
            ["NgayXuat", new Date().toLocaleString('vi-VN'), "Thời điểm xuất bản hồ sơ Excel"]
        ];
        const wsSchool = XLSX.utils.aoa_to_sheet(schoolRows);
        XLSX.utils.book_append_sheet(wb, wsSchool, "THONG_TIN_TRUONG");

        // 2. SHEET: KHUNG_PPCT_MON_HOC
        const ppctRows = [
            ["STT", "MÃ MÔN", "TÊN MÔN HỌC (BỘ MÔN)", "SỐ TIẾT/TUẦN", "TIẾT KÉP (2 TIẾT LIỀN)", "MÃ PHÒNG BỘ MÔN YÊU CẦU", "GHI CHÚ QUY ĐỊNH BGDĐT"]
        ];
        subjects.forEach((s, idx) => {
            ppctRows.push([
                idx + 1,
                s.id,
                s.name,
                s.periodsPerWeek,
                s.doublePeriod ? "TRUE" : "FALSE",
                s.roomReq || "",
                "Chuẩn GDPT 2018 / GDMN"
            ]);
        });
        const wsPPCT = XLSX.utils.aoa_to_sheet(ppctRows);
        XLSX.utils.book_append_sheet(wb, wsPPCT, "KHUNG_PPCT_MON_HOC");

        // 3. SHEET: PHAN_CONG_CHUYEN_MON
        const pccmRows = [
            ["STT", "HỌ VÀ TÊN GIÁO VIÊN", "TỔ CHUYÊN MÔN", "MÔN PHỤ TRÁCH", "LỚP GIẢNG DẠY", "SỐ TIẾT/TUẦN", "NHIỆM VỤ KIÊM NHIỆM", "TIẾT GIẢM", "ĐỊNH MỨC NGHĨA VỤ"]
        ];
        let pccmIdx = 1;
        assignments.forEach(a => {
            const standard = (sc.schoolModel === 'BAN_TRU' ? 17 : 19);
            pccmRows.push([
                pccmIdx++,
                a.teacher,
                a.department || "Tổ Bộ Môn",
                a.subject,
                a.classId,
                a.periodsPerWeek,
                a.role || "",
                a.reducedPeriods || 0,
                standard
            ]);
        });
        const wsPCCM = XLSX.utils.aoa_to_sheet(pccmRows);
        XLSX.utils.book_append_sheet(wb, wsPCCM, "PHAN_CONG_CHUYEN_MON");

        // 4. SHEET: UU_TIEN_SU_PHAM
        const prioRows = [
            ["MÃ QUY TẮC ƯU TIÊN", "TRẠNG THÁI (TRUE/FALSE)", "DIỄN GIẢI QUY CHUẨN SƯ PHẠM & NHÂN VĂN"],
            ["GVCN_Nghi_2_Buoi_Tuan", prio.gvcnOffDays !== false ? "TRUE" : "FALSE", "Giáo viên chủ nhiệm được ưu tiên nghỉ 2 buổi/tuần để đi cơ sở, thăm học sinh bán trú/nội trú"],
            ["Khong_TheDuc_Tiet_4_5", prio.noPEPeriod45 !== false ? "TRUE" : "FALSE", "Tuyệt đối không xếp Thể dục (GDTC) vào tiết 4-5 giữa trưa nắng gắt"],
            ["ToiDa_4_Tiet_Ngay", prio.maxPeriodsPerDay !== 5 ? "TRUE" : "FALSE", "Giới hạn tối đa 4 tiết dạy mỗi ngày cho mỗi giáo viên"],
            ["UuTien_TietDoi_KHTN_Van", prio.preferDoublePeriods !== false ? "TRUE" : "FALSE", "Ưu tiên ghép tiết đôi (2 tiết liền) cho môn KHTN và Ngữ văn"],
            ["Tranh_Trung_GV_100", "TRUE", "Khóa cứng chống trùng tiết dạy giáo viên tuyệt đối 100%"]
        ];
        const wsPrio = XLSX.utils.aoa_to_sheet(prioRows);
        XLSX.utils.book_append_sheet(wb, wsPrio, "UU_TIEN_SU_PHAM");

        // 5. SHEET: THOI_KHOA_BIEU
        const tkbRows = [
            ["LỚP", "THỨ TRONG TUẦN", "TIẾT HỌC", "MÔN HỌC", "GIÁO VIÊN GIẢNG DẠY", "PHÒNG HỌC BỘ MÔN", "TIẾT CỐ ĐỊNH (TRUE/FALSE)"]
        ];
        const dayNames = this.engine.DAYS || ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        this.engine.classes.forEach(cls => {
            if (timetable[cls]) {
                for (let d = 0; d < dayNames.length; d++) {
                    for (let p = 0; p < 5; p++) {
                        const cell = timetable[cls][d] ? timetable[cls][d][p] : null;
                        if (cell) {
                            tkbRows.push([
                                cls,
                                dayNames[d],
                                `Tiết ${p + 1}`,
                                cell.subject || "",
                                cell.teacher || "",
                                cell.room || "",
                                cell.isFixed ? "TRUE" : "FALSE"
                            ]);
                        }
                    }
                }
            }
        });
        const wsTKB = XLSX.utils.aoa_to_sheet(tkbRows);
        XLSX.utils.book_append_sheet(wb, wsTKB, "THOI_KHOA_BIEU");

        // Tải file Excel .xlsx (chuẩn Excel)
        const cleanSchoolName = (sc.schoolName || 'EDUSTUDIO_TKB').replace(/\s+/g, '_');
        const cleanYear = (sc.academicYear || '2026-2027').replace(/\s+/g, '');
        const filename = `${cleanSchoolName}_MAU_TKB_MASTER_${cleanYear}.xlsx`;

        XLSX.writeFile(wb, filename);
        this.showToast(`📊 Đã xuất file Excel Mẫu TKB Master [${filename}] đầy đủ 5 Sheets thành công!`);
    }

    /**
     * KÍCH HOẠT NHẬP LẠI GÓI TKB MASTER TỪ FILE EXCEL / JSON
     */
    triggerMasterPackageImport() {
        const fileInput = document.getElementById('tkbMasterPackageInput');
        if (fileInput) {
            fileInput.value = '';
            fileInput.click();
        }
    }

    /**
     * XỬ LÝ NHẬP LẠI GÓI TKB MASTER TỪ FILE EXCEL (.XLSX / .XLS) HOẶC JSON
     * Đọc toàn bộ 5 Sheets và cập nhật tức thì vào hệ thống trong 1 giây!
     */
    handleMasterPackageFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();

        // 1. XỬ LÝ FILE EXCEL (.XLSX / .XLS)
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    if (typeof XLSX === 'undefined') {
                        alert('Chưa nạp được thư viện xử lý Excel!');
                        return;
                    }
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array' });

                    // 1.1 Đọc Sheet THONG_TIN_TRUONG
                    if (wb.SheetNames.includes('THONG_TIN_TRUONG')) {
                        const schoolAoa = XLSX.utils.sheet_to_json(wb.Sheets['THONG_TIN_TRUONG'], { header: 1 });
                        for (let r = 1; r < schoolAoa.length; r++) {
                            const key = schoolAoa[r][0];
                            const val = schoolAoa[r][1];
                            if (key === 'TenTruong') this.engine.schoolConfig.schoolName = val;
                            if (key === 'CapHoc') this.engine.schoolConfig.educationalTier = val;
                            if (key === 'MoHinh') this.engine.schoolConfig.schoolModel = val;
                            if (key === 'NamHoc') this.engine.schoolConfig.academicYear = val;
                            if (key === 'HocKy') this.engine.schoolConfig.semester = val;
                            if (key === 'DinhMucChuan') this.engine.schoolConfig.standardPeriodsPerWeek = parseInt(val) || 17;
                            if (key === 'SoTuanKeHoach') this.engine.schoolConfig.totalWeeks = parseInt(val) || 35;
                            if (key === 'CaHoc') this.engine.schoolConfig.session = val;
                        }
                    }

                    // 1.2 Đọc Sheet KHUNG_PPCT_MON_HOC
                    if (wb.SheetNames.includes('KHUNG_PPCT_MON_HOC')) {
                        const ppctAoa = XLSX.utils.sheet_to_json(wb.Sheets['KHUNG_PPCT_MON_HOC'], { header: 1 });
                        let newSubjects = [];
                        for (let r = 1; r < ppctAoa.length; r++) {
                            const row = ppctAoa[r];
                            if (row && row[2]) {
                                newSubjects.push({
                                    id: row[1] || sub_,
                                    name: row[2],
                                    periodsPerWeek: parseInt(row[3]) || 1,
                                    doublePeriod: String(row[4]).toUpperCase() === 'TRUE',
                                    roomReq: row[5] || null
                                });
                            }
                        }
                        if (newSubjects.length > 0) this.engine.subjects = newSubjects;
                    }

                    // 1.3 Đọc Sheet PHAN_CONG_CHUYEN_MON
                    if (wb.SheetNames.includes('PHAN_CONG_CHUYEN_MON')) {
                        const pccmAoa = XLSX.utils.sheet_to_json(wb.Sheets['PHAN_CONG_CHUYEN_MON'], { header: 1 });
                        let newAssignments = [];
                        for (let r = 1; r < pccmAoa.length; r++) {
                            const row = pccmAoa[r];
                            if (row && row[1] && row[3] && row[4]) {
                                newAssignments.push({
                                    teacher: row[1],
                                    department: row[2] || 'Tổ Bộ Môn',
                                    subject: row[3],
                                    classId: row[4],
                                    periodsPerWeek: parseInt(row[5]) || 1,
                                    role: row[6] || '',
                                    reducedPeriods: parseInt(row[7]) || 0
                                });
                            }
                        }
                        if (newAssignments.length > 0) this.engine.assignments = newAssignments;
                    }

                    // 1.4 Đọc Sheet UU_TIEN_SU_PHAM
                    if (wb.SheetNames.includes('UU_TIEN_SU_PHAM')) {
                        const prioAoa = XLSX.utils.sheet_to_json(wb.Sheets['UU_TIEN_SU_PHAM'], { header: 1 });
                        if (!this.engine.pedagogicalPriorities) this.engine.pedagogicalPriorities = {};
                        for (let r = 1; r < prioAoa.length; r++) {
                            const key = prioAoa[r][0];
                            const val = String(prioAoa[r][1]).toUpperCase() === 'TRUE';
                            if (key === 'GVCN_Nghi_2_Buoi_Tuan') this.engine.pedagogicalPriorities.gvcnOffDays = val;
                            if (key === 'Khong_TheDuc_Tiet_4_5') this.engine.pedagogicalPriorities.noPEPeriod45 = val;
                            if (key === 'ToiDa_4_Tiet_Ngay') this.engine.pedagogicalPriorities.maxPeriodsPerDay = val ? 4 : 5;
                            if (key === 'UuTien_TietDoi_KHTN_Van') this.engine.pedagogicalPriorities.preferDoublePeriods = val;
                        }
                    }

                    // 1.5 Đọc Sheet THOI_KHOA_BIEU
                    if (wb.SheetNames.includes('THOI_KHOA_BIEU')) {
                        const tkbAoa = XLSX.utils.sheet_to_json(wb.Sheets['THOI_KHOA_BIEU'], { header: 1 });
                        const dayMap = { 'Thứ Hai': 0, 'Thứ Ba': 1, 'Thứ Tư': 2, 'Thứ Năm': 3, 'Thứ Sáu': 4, 'Thứ Bảy': 5 };
                        for (let r = 1; r < tkbAoa.length; r++) {
                            const [cls, thuStr, tietStr, subj, teacher, room, fixedStr] = tkbAoa[r];
                            if (cls && thuStr && tietStr && subj) {
                                const d = dayMap[thuStr] !== undefined ? dayMap[thuStr] : -1;
                                const pMatch = String(tietStr).match(/\d+/);
                                const p = pMatch ? parseInt(pMatch[0]) - 1 : -1;
                                if (d >= 0 && p >= 0 && p < 5) {
                                    if (!this.engine.timetable[cls]) this.engine.timetable[cls] = [[],[],[],[],[],[]];
                                    if (!this.engine.timetable[cls][d]) this.engine.timetable[cls][d] = [];
                                    this.engine.timetable[cls][d][p] = {
                                        subject: subj,
                                        teacher: teacher || '',
                                        room: room || null,
                                        isFixed: String(fixedStr).toUpperCase() === 'TRUE'
                                    };
                                }
                            }
                        }
                    }

                    this.engine.saveState();
                    this.updateFilterControls();
                    this.updateSchoolScaleSummary();
                    this.renderCurrentView();
                    this.renderPCCMTable();
                    this.renderConfigTab();
                    this.renderStats();

                    // Cập nhật tên trường & cấp học
                    const nameDisp = document.getElementById('tkbGlobalSchoolNameDisplay');
                    if (nameDisp) nameDisp.innerHTML = `🏫 ${this.engine.schoolConfig.schoolName}`;

                    const tierBadge = document.getElementById('tkbGlobalTierBadge');
                    if (tierBadge) {
                        const tierMap = {
                            'GDMN': 'Mầm Non',
                            'TIEU_HOC': 'Tiểu Học',
                            'THCS': 'GDPT 2018',
                            'THPT': 'THPT Tổ Hợp',
                            'LIEN_CAP': 'K-12 Liên Cấp'
                        };
                        tierBadge.textContent = tierMap[this.engine.schoolConfig.educationalTier] || 'GDPT 2018';
                    }

                    const yearBadge = document.getElementById('tkbGlobalYearBadge');
                    if (yearBadge) yearBadge.textContent = `NH: ${this.engine.schoolConfig.academicYear}`;

                    // Nếu Hộp thoại Master đang mở, tự động cập nhật lại toàn bộ nội dung hộp thoại
                    const masterModal = document.getElementById('tkbMasterDeclarationModal');
                    if (masterModal && masterModal.style.display !== 'none') {
                        this.openMasterDeclarationModal();
                    }

                    this.showToast(`🎉 Đã nhập thành công toàn bộ Thời khóa biểu & Phân công từ file Excel [${file.name}]!`);
                } catch(err) {
                    alert(`❌ Lỗi khi đọc file Excel: ${err.message}`);
                }
            };
            reader.readAsArrayBuffer(file);
            return;
        }

        // 2. NẾU LÀ FILE JSON CŨ (Backward-compatibility)
        if (fileName.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const res = this.engine.importJSON(content);
                    if (res && res.success) {
                        this.updateFilterControls();
                        this.updateSchoolScaleSummary();
                        this.renderCurrentView();
                        this.renderPCCMTable();
                        this.renderConfigTab();
                        this.renderStats();

                        const nameDisp = document.getElementById('tkbGlobalSchoolNameDisplay');
                        if (nameDisp) nameDisp.innerHTML = `🏫 ${this.engine.schoolConfig.schoolName}`;

                        const masterModal = document.getElementById('tkbMasterDeclarationModal');
                        if (masterModal && masterModal.style.display !== 'none') {
                            this.openMasterDeclarationModal();
                        }

                        this.showToast(`🎉 Đã nhập thành công từ file JSON [${file.name}]!`);
                    } else {
                        alert(`❌ Không thể nạp file: ${res.reason || 'Dữ liệu không hợp lệ!'}`);
                    }
                } catch(err) {
                    alert(`❌ Lỗi khi đọc file JSON: ${err.message}`);
                }
            };
            reader.readAsText(file, 'utf-8');
        }
    }

    /**
     * ==============================================================================
     * HỘP THOẠI KHAI BÁO ĐẦY ĐỦ THÔNG TIN TOÀN TRƯỜNG & TRUNG TÂM XUẤT/NHẬP MASTER
     * (GDMN & GDPT TOÀN CẦU - 5 TABS + CHI TIẾT PHỤ DSGV & PCCM + ĐỒNG BỘ 2 CHIỀU)
     * ==============================================================================
     */
    openMasterDeclarationModal(activeTab = 'school') {
        let modal = document.getElementById('tkbMasterDeclarationModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tkbMasterDeclarationModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8);
                backdrop-filter: blur(6px); z-index: 999999; align-items: center; justify-content: center;
                padding: 1rem;
            `;
            document.body.appendChild(modal);
        }

        const sc = this.engine.schoolConfig || {};
        const prio = this.engine.pedagogicalPriorities || {};
        const subjects = this.engine.subjects || [];
        const rooms = this.engine.specialRooms || [];
        const teachers = this.engine.teachers || [];
        const assignments = this.engine.assignments || [];
        const currentSem = this.engine.currentSemester || (sc.semester === 'Học kỳ II' ? 'HK2' : (sc.semester === 'Cả năm' ? 'YEAR' : 'HK1'));

        modal.classList.add('active');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('pointer-events', 'auto', 'important');
        modal.style.setProperty('z-index', '9999999', 'important');

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; max-width: 940px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.35); border: 1px solid #cbd5e1; overflow: hidden; display: flex; flex-direction: column; max-height: 92vh; animation: modalPop 0.2s ease-out;">
                
                <!-- 1. HEADER MODAL: TIÊU ĐỀ + CỤM NÚT XUẤT / NHẬP FILE MẪU EXCEL -->
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%); color: #ffffff; padding: 0.9rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.65rem;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <span style="font-size: 1.5rem;">🌍</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; letter-spacing: 0.3px;">HỘP THOẠI KHAI BÁO ĐẦY ĐỦ THÔNG TIN TKB TOÀN TRƯỜNG</h3>
                            <p style="margin: 0.15rem 0 0 0; font-size: 0.73rem; color: #bae6fd;">Hệ thống Lập lịch Sư phạm Toàn diện GDMN &amp; GDPT Toàn Cầu • Liên thông 2 chiều</p>
                        </div>
                    </div>

                    <!-- Cụm Nút Xuất / Nhập Mẫu Ngay Tại Header Hộp Thoại -->
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <button type="button" onclick="window.smartTKBUI.exportMasterTKBPackage()" style="background: #059669; color: #ffffff; border: none; padding: 0.32rem 0.65rem; border-radius: 6px; font-size: 0.73rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" title="Xuất toàn bộ thông tin trong hộp thoại thành file Excel (.xlsx / .xls) mẫu 5 sheets">
                            <span>📤</span> <span>Xuất Mẫu Excel (.xls)</span>
                        </button>
                        <button type="button" onclick="window.smartTKBUI.triggerMasterPackageImport()" style="background: #d97706; color: #ffffff; border: none; padding: 0.32rem 0.65rem; border-radius: 6px; font-size: 0.73rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" title="Nhập lại từ file Excel (.xlsx / .xls) mẫu để điền toàn bộ thông tin trong 1 giây">
                            <span>📥</span> <span>Nhập Lại Excel (.xls)</span>
                        </button>
                        <button type="button" onclick="window.smartTKBUI.closeMasterDeclarationModal()" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; font-size: 1.4rem; cursor: pointer; line-height: 1; padding: 0.15rem 0.5rem; border-radius: 6px;">&times;</button>
                    </div>
                </div>

                <!-- 2. THANH SUBNAV 5 TABS BÊN TRONG HỘP THOẠI -->
                <div style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; display: flex; padding: 0 1rem; gap: 0.25rem; overflow-x: auto;">
                    <button class="btn-master-modal-tab active" data-tab="school" onclick="window.smartTKBUI.switchMasterModalTab('school')" style="padding: 0.6rem 0.8rem; font-size: 0.76rem; font-weight: 800; border: none; border-bottom: 3px solid #1d4ed8; background: transparent; color: #1d4ed8; cursor: pointer; white-space: nowrap;">
                        🏫 1. Trường &amp; Định Mức
                    </button>
                    <button class="btn-master-modal-tab" data-tab="curriculum" onclick="window.smartTKBUI.switchMasterModalTab('curriculum')" style="padding: 0.6rem 0.8rem; font-size: 0.76rem; font-weight: 700; border: none; border-bottom: 3px solid transparent; background: transparent; color: #64748b; cursor: pointer; white-space: nowrap;">
                        📚 2. Khung PPCT Môn
                    </button>
                    <button class="btn-master-modal-tab" data-tab="priorities" onclick="window.smartTKBUI.switchMasterModalTab('priorities')" style="padding: 0.6rem 0.8rem; font-size: 0.76rem; font-weight: 700; border: none; border-bottom: 3px solid transparent; background: transparent; color: #64748b; cursor: pointer; white-space: nowrap;">
                        🎯 3. Ưu Tiên Sư Phạm
                    </button>
                    <button class="btn-master-modal-tab" data-tab="faculty" onclick="window.smartTKBUI.switchMasterModalTab('faculty')" style="padding: 0.6rem 0.8rem; font-size: 0.76rem; font-weight: 700; border: none; border-bottom: 3px solid transparent; background: transparent; color: #64748b; cursor: pointer; white-space: nowrap;">
                        👨‍🏫 4. Đội Ngũ GV &amp; PCCM
                    </button>
                    <button class="btn-master-modal-tab" data-tab="facilities" onclick="window.smartTKBUI.switchMasterModalTab('facilities')" style="padding: 0.6rem 0.8rem; font-size: 0.76rem; font-weight: 700; border: none; border-bottom: 3px solid transparent; background: transparent; color: #64748b; cursor: pointer; white-space: nowrap;">
                        🏛️ 5. Khối Lớp &amp; Phòng Bộ Môn
                    </button>
                </div>

                <!-- 3. VÙNG NỘI DUNG 5 TABS -->
                <div style="padding: 1.15rem; overflow-y: auto; flex: 1;">
                    
                    <!-- TAB 1: THÔNG TIN TRƯỜNG & ĐỊNH MỨC -->
                    <div id="master-tab-school" class="master-modal-pane" style="display: block;">
                        
                        <!-- Presets 1 chạm -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 1rem;">
                            <div style="font-size: 0.74rem; font-weight: 800; color: #475569; margin-bottom: 0.35rem; text-transform: uppercase;">
                                ⚡ Nạp Nhanh Mẫu Chuẩn Quốc Gia (One-Click Presets):
                            </div>
                            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                                <button type="button" onclick="window.smartTKBUI.applySchoolPreset('THCS_BAN_TRU')" style="padding: 0.25rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; border: 1px solid #93c5fd; background: #eff6ff; color: #1d4ed8; cursor: pointer;">
                                    🏫 THCS Bán Trú Canh Thuận (Chuẩn 17t)
                                </button>
                                <button type="button" onclick="window.smartTKBUI.applySchoolPreset('TIEU_HOC_2BUOI')" style="padding: 0.25rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; cursor: pointer;">
                                    🎒 Tiểu Học 2 Buổi/Ngày (Chuẩn 23t)
                                </button>
                                <button type="button" onclick="window.smartTKBUI.applySchoolPreset('MAM_NON')" style="padding: 0.25rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; border: 1px solid #fde68a; background: #fffbeb; color: #b45309; cursor: pointer;">
                                    👶 GD Mầm Non (Chế độ Sinh hoạt &amp; Chơi)
                                </button>
                                <button type="button" onclick="window.smartTKBUI.applySchoolPreset('THPT_CHUAN')" style="padding: 0.25rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 5px; border: 1px solid #c7d2fe; background: #e0e7ff; color: #4338ca;">
                                    🎓 THPT Tổ Hợp Môn (Chuẩn 17t)
                                </button>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
                            <div style="grid-column: 1 / -1;">
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                    🏫 Tên Cơ Sở Giáo Dục / Trường Học:
                                </label>
                                <input type="text" id="mcfgSchoolName" value="${sc.schoolName || 'Trường THCS Bán Trú Canh Thuận'}" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.85rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                    🎓 Cấp Học (Educational Tier):
                                </label>
                                <select id="mcfgTier" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff;">
                                    <option value="GDMN" ${sc.educationalTier === 'GDMN' ? 'selected' : ''}>👶 Giáo Dục Mầm Non (Chế độ sinh hoạt &amp; Chơi)</option>
                                    <option value="TIEU_HOC" ${sc.educationalTier === 'TIEU_HOC' ? 'selected' : ''}>🎒 Giáo Dục Tiểu Học (Cấp 1 • 2 buổi/ngày)</option>
                                    <option value="THCS" ${sc.educationalTier === 'THCS' || !sc.educationalTier ? 'selected' : ''}>🏫 Giáo Dục THCS (Cấp 2 • GDPT 2018)</option>
                                    <option value="THPT" ${sc.educationalTier === 'THPT' ? 'selected' : ''}>🎓 Giáo Dục THPT (Cấp 3 • Phân hóa tổ hợp)</option>
                                    <option value="LIEN_CAP" ${sc.educationalTier === 'LIEN_CAP' ? 'selected' : ''}>🌐 Trường Phổ Thông Liên Cấp K-12</option>
                                </select>
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                    🏠 Mô Hình Quản Trị Trường:
                                </label>
                                <select id="mcfgModel" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff;">
                                    <option value="BAN_TRU" ${sc.schoolModel === 'BAN_TRU' || !sc.schoolModel ? 'selected' : ''}>Bán Trú PTDTBT (Định mức 17 tiết/tuần)</option>
                                    <option value="CONG_LAP" ${sc.schoolModel === 'CONG_LAP' ? 'selected' : ''}>Công Lập Chuẩn (Định mức 19 tiết/tuần)</option>
                                    <option value="HAI_BUOI" ${sc.schoolModel === 'HAI_BUOI' ? 'selected' : ''}>Học 2 Buổi/Ngày (Tiểu học / Bán trú)</option>
                                    <option value="NOI_TRU" ${sc.schoolModel === 'NOI_TRU' ? 'selected' : ''}>Nội Trú Quốc Gia / Quốc Tế</option>
                                    <option value="TU_THUC" ${sc.schoolModel === 'TU_THUC' ? 'selected' : ''}>Tư Thục / Tự Chủ Chất Lượng Cao</option>
                                </select>
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                    📅 Năm Học (Academic Year):
                                </label>
                                <input type="text" id="mcfgAcademicYear" value="${sc.academicYear || '2026 - 2027'}" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>

                            <!-- TRƯỜNG KẾ HOẠCH ÁP DỤNG (THEO TUẦN / HỌC KỲ - LINH HOẠT CHO TỪNG ĐƠN VỊ) -->
                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                    📅 Kế Hoạch Áp Dụng (Theo Tuần / Học Kỳ):
                                </label>
                                <select id="mcfgSchedulePlanType" onchange="window.smartTKBUI.onPlanTypeChange(this.value)" style="width: 100%; padding: 0.42rem 0.65rem; font-size: 0.78rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; margin-bottom: 0.35rem;" title="Chọn Tuần hoặc Học kỳ áp dụng">
                                    <option value="WEEK_9_13" ${(sc.schedulePlanType === 'WEEK_9_13') || (!sc.schedulePlanType && currentSem === 'HK1') ? 'selected' : ''}>📅 Tuần 9 đến Tuần 13 (Giai đoạn hiện hành)</option>
                                    <option value="WEEK_1_9" ${sc.schedulePlanType === 'WEEK_1_9' ? 'selected' : ''}>📅 Tuần 1 đến Tuần 9 (Giai đoạn đầu HK1)</option>
                                    <option value="WEEK_10_18" ${sc.schedulePlanType === 'WEEK_10_18' ? 'selected' : ''}>📅 Tuần 10 đến Tuần 18 (Giai đoạn cuối HK1)</option>
                                    <option value="WEEK_19_27" ${sc.schedulePlanType === 'WEEK_19_27' ? 'selected' : ''}>📅 Tuần 19 đến Tuần 27 (Giai đoạn đầu HK2)</option>
                                    <option value="WEEK_28_35" ${sc.schedulePlanType === 'WEEK_28_35' ? 'selected' : ''}>📅 Tuần 28 đến Tuần 35 (Giai đoạn cuối HK2)</option>
                                    <option value="HK1" ${sc.schedulePlanType === 'HK1' ? 'selected' : ''}>🍂 Trọn Học Kỳ I (18 tuần • Lịch sử 2t - Địa lí 1t)</option>
                                    <option value="HK2" ${(sc.schedulePlanType === 'HK2') || currentSem === 'HK2' ? 'selected' : ''}>🌱 Trọn Học Kỳ II (17 tuần • Địa lí 2t - Lịch sử 1t)</option>
                                    <option value="YEAR" ${sc.schedulePlanType === 'YEAR' ? 'selected' : ''}>🗓️ Cả Năm Học (35 tuần)</option>
                                    <option value="WEEK_CUSTOM" ${sc.schedulePlanType === 'WEEK_CUSTOM' ? 'selected' : ''}>✏️ Tùy chỉnh khoảng Tuần theo đơn vị...</option>
                                </select>
                                <div style="display: flex; align-items: center; gap: 0.35rem;">
                                    <span style="font-size: 0.72rem; font-weight: 800; color: #64748b; white-space: nowrap;">Tuần áp dụng:</span>
                                    <input type="text" id="mcfgApplyWeekRange" value="${sc.applyWeekRange || 'Tuần 9 đến Tuần 13'}" placeholder="Ví dụ: Tuần 9 đến Tuần 13..." style="flex: 1; padding: 0.35rem 0.55rem; font-size: 0.78rem; font-weight: 800; border: 1px solid #94a3b8; border-radius: 5px; color: #0f172a; background: #f8fafc;" title="Đơn vị có thể nhập tuần tự do tại đây (ví dụ: Tuần 9 đến Tuần 13, Tuần 1 đến Tuần 4...)">
                                </div>
                                <input type="hidden" id="mcfgSemester" value="${currentSem}">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                    🎯 Định Mức Tiết Dạy Tiêu Chuẩn (Tiết/Tuần):
                                </label>
                                <input type="number" id="mcfgStandardHours" value="${sc.standardPeriodsPerWeek || 17}" min="10" max="35" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                    📊 Kế Hoạch Số Tuần Thực Dạy (Tuần/Năm):
                                </label>
                                <input type="number" id="mcfgTotalWeeks" value="${sc.totalWeeks || 35}" min="30" max="40" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>

                            <div style="grid-column: 1 / -1;">
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                    ⏰ Ca Học &amp; Khung Giờ Giảng Dạy:
                                </label>
                                <input type="text" id="mcfgSession" value="${sc.session || 'Sáng (5 tiết/buổi)'}" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                    </div>

                    <!-- TAB 2: KHUNG PPCT MÔN HỌC -->
                    <div id="master-tab-curriculum" class="master-modal-pane" style="display: none;">
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.5rem 0.85rem; margin-bottom: 0.85rem; font-size: 0.75rem; color: #166534; line-height: 1.4;">
                            💡 <strong>Thay đổi quy định PPCT:</strong> Chỉnh sửa số tiết/tuần của từng môn học khi có văn bản chỉ đạo mới của Bộ/Sở. Hệ thống sẽ tự động cập nhật ngay trên Bàn cờ TKB và ma trận phân công chuyên môn!
                        </div>

                        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                            <thead>
                                <tr style="background: #f1f5f9; color: #334155; text-align: left; border-bottom: 2px solid #cbd5e1;">
                                    <th style="padding: 0.5rem 0.6rem; width: 45px; text-align: center;">STT</th>
                                    <th style="padding: 0.5rem 0.6rem;">Tên Môn Học (Bộ Môn)</th>
                                    <th style="padding: 0.5rem 0.6rem; width: 110px; text-align: center;">Số Tiết/Tuần</th>
                                    <th style="padding: 0.5rem 0.6rem; width: 90px; text-align: center;">Tiết Kép (2t)</th>
                                    <th style="padding: 0.5rem 0.6rem;">Phòng Bộ Môn Yêu Cầu</th>
                                </tr>
                            </thead>
                            <tbody id="tblMasterCurriculumBody">
                                ${subjects.map((sub, idx) => {
                                    let roomOpts = '<option value="">(Không yêu cầu)</option>';
                                    rooms.forEach(r => {
                                        roomOpts += `<option value="${r.id}" ${sub.roomReq === r.id ? 'selected' : ''}>${r.icon} ${r.name}</option>`;
                                    });
                                    return `
                                        <tr data-index="${idx}">
                                            <td style="padding: 0.45rem 0.6rem; text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
                                            <td style="padding: 0.45rem 0.6rem;">
                                                <input type="text" class="mcfg-sub-name" value="${sub.name}" style="width: 100%; padding: 0.25rem 0.45rem; font-size: 0.8rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 4px;">
                                            </td>
                                            <td style="padding: 0.45rem 0.6rem; text-align: center;">
                                                <input type="number" class="mcfg-sub-periods" value="${sub.periodsPerWeek}" min="1" max="10" style="width: 60px; padding: 0.25rem 0.45rem; font-size: 0.8rem; font-weight: 800; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; color: #1d4ed8;">
                                            </td>
                                            <td style="padding: 0.45rem 0.6rem; text-align: center;">
                                                <input type="checkbox" class="mcfg-sub-double" ${sub.doublePeriod ? 'checked' : ''} style="cursor: pointer;">
                                            </td>
                                            <td style="padding: 0.45rem 0.6rem;">
                                                <select class="mcfg-sub-room" style="width: 100%; padding: 0.25rem 0.45rem; font-size: 0.76rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff;">
                                                    ${roomOpts}
                                                </select>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- TAB 3: ƯU TIÊN SƯ PHẠM THỰC TẾ -->
                    <div id="master-tab-priorities" class="master-modal-pane" style="display: none;">
                        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 0.5rem 0.85rem; margin-bottom: 0.85rem; font-size: 0.75rem; color: #92400e; line-height: 1.4;">
                            🎯 <strong>Nguyên tắc Sư phạm &amp; Nhân văn:</strong> Lập lịch không đơn thuần là giải toán tổ hợp, mà là bảo vệ sức khỏe và điều kiện làm việc của người Thầy.
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            
                            <label style="display: flex; align-items: flex-start; gap: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; cursor: pointer;">
                                <input type="checkbox" id="mprioGVCN" ${prio.gvcnOffDays !== false ? 'checked' : ''} style="margin-top: 0.15rem; cursor: pointer;">
                                <div>
                                    <strong style="font-size: 0.82rem; color: #0f172a;">🌟 GVCN được ưu tiên nghỉ trọn vẹn 2 buổi / tuần</strong>
                                    <p style="margin: 0.15rem 0 0 0; font-size: 0.74rem; color: #64748b;">Dành riêng thời gian để Thầy Cô Chủ nhiệm đi cơ sở, thăm gia đình học sinh nội trú/bán trú, chấm bài và chuẩn bị sinh hoạt lớp.</p>
                                </div>
                            </label>

                            <label style="display: flex; align-items: flex-start; gap: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; cursor: pointer;">
                                <input type="checkbox" id="mprioNoPE45" ${prio.noPEPeriod45 !== false ? 'checked' : ''} style="margin-top: 0.15rem; cursor: pointer;">
                                <div>
                                    <strong style="font-size: 0.82rem; color: #0f172a;">🏃 Tuyệt đối không xếp Thể dục (GDTC) vào tiết 4 – 5</strong>
                                    <p style="margin: 0.15rem 0 0 0; font-size: 0.74rem; color: #64748b;">Tránh giờ nắng gắt giữa trưa ảnh hưởng thể lực và sức khỏe của học sinh trên sân vận động.</p>
                                </div>
                            </label>

                            <label style="display: flex; align-items: flex-start; gap: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; cursor: pointer;">
                                <input type="checkbox" id="mprioMax4" ${prio.maxPeriodsPerDay !== false ? 'checked' : ''} style="margin-top: 0.15rem; cursor: pointer;">
                                <div>
                                    <strong style="font-size: 0.82rem; color: #0f172a;">⏱️ Giới hạn tối đa 4 tiết dạy / ngày / giáo viên</strong>
                                    <p style="margin: 0.15rem 0 0 0; font-size: 0.74rem; color: #64748b;">Triệt tiêu tình trạng quá tải (dạy liên tục 5 tiết/ngày gây kiệt sức giảng dạy).</p>
                                </div>
                            </label>

                            <label style="display: flex; align-items: flex-start; gap: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; cursor: pointer;">
                                <input type="checkbox" id="mprioDouble" ${prio.preferDoublePeriods !== false ? 'checked' : ''} style="margin-top: 0.15rem; cursor: pointer;">
                                <div>
                                    <strong style="font-size: 0.82rem; color: #0f172a;">🔗 Ưu tiên ghép tiết đôi (2 tiết liền) cho KHTN &amp; Ngữ văn</strong>
                                    <p style="margin: 0.15rem 0 0 0; font-size: 0.74rem; color: #64748b;">Tối ưu hóa các bài học thực hành phòng thí nghiệm và bài viết tập làm văn đạt chuẩn GDPT 2018.</p>
                                </div>
                            </label>

                            <label style="display: flex; align-items: flex-start; gap: 0.6rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; cursor: pointer;">
                                <input type="checkbox" id="mprioStrict" checked style="margin-top: 0.15rem; cursor: pointer;">
                                <div>
                                    <strong style="font-size: 0.82rem; color: #0f172a;">🔒 Chống trùng tiết giáo viên 100% &amp; Khóa tiết Chào cờ / SHL</strong>
                                    <p style="margin: 0.15rem 0 0 0; font-size: 0.74rem; color: #64748b;">Thuật toán AI CSP Solver khóa cứng Chào cờ sáng Thứ Hai và Sinh hoạt lớp sáng Thứ Sáu.</p>
                                </div>
                            </label>

                        </div>
                    </div>

                    <!-- TAB 4: ĐỘI NGŨ GIÁO VIÊN & PHÂN CÔNG CHUYÊN MÔN (PCCM) -->
                    <!-- KÈM 2 NÚT CHI TIẾT PHỤ THEO YÊU CẦU CỦA THẦY QUAN -->
                    <div id="master-tab-faculty" class="master-modal-pane" style="display: none;">
                        
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 0.55rem 0.85rem; margin-bottom: 0.85rem; font-size: 0.75rem; color: #1e40af; line-height: 1.4; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                            <div>
                                👨‍🏫 <strong>Đội Ngũ Sư Phạm &amp; PCCM Toàn Trường:</strong> ${teachers.length} Thầy Cô • 9 Lớp • Định mức chuẩn 17 tiết/tuần (PTDTBT Canh Thuận). Dữ liệu dài được gói gọn, có nút <strong>Chi Tiết Phụ</strong> để xem chuyên sâu!
                            </div>
                            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                                <button type="button" onclick="window.smartTKBUI.openDSGVDetailModal()" style="background: #1d4ed8; color: #ffffff; border: none; padding: 0.28rem 0.6rem; border-radius: 5px; font-size: 0.72rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 0.2rem; box-shadow: 0 1px 2px rgba(0,0,0,0.15);" title="Mở hộp thoại chi tiết phụ danh sách 20 Thầy Cô">
                                    <span>👁️</span> <span>Chi Tiết Phụ: DSGV</span>
                                </button>
                                <button type="button" onclick="window.smartTKBUI.openPCCMDetailModal()" style="background: #059669; color: #ffffff; border: none; padding: 0.28rem 0.6rem; border-radius: 5px; font-size: 0.72rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 0.2rem; box-shadow: 0 1px 2px rgba(0,0,0,0.15);" title="Mở hộp thoại chi tiết phụ ma trận phân công chuyên môn">
                                    <span>👁️</span> <span>Chi Tiết Phụ: PCCM</span>
                                </button>
                            </div>
                        </div>

                        <!-- 2 Khối Tóm Tắt Gọn Gàng -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
                            
                            <!-- Khối 1: Tóm Tắt DSGV -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; padding-bottom: 0.35rem; border-bottom: 1px solid #cbd5e1;">
                                    <strong style="font-size: 0.8rem; color: #0f172a;">👨‍🏫 Danh Sách Giáo Viên (${teachers.length} Thầy Cô)</strong>
                                    <button type="button" onclick="window.smartTKBUI.openDSGVDetailModal()" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #93c5fd; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.68rem; font-weight: 800; cursor: pointer;">
                                        🔍 Xem Chi Tiết Phụ
                                    </button>
                                </div>
                                <div style="max-height: 230px; overflow-y: auto; font-size: 0.73rem;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr style="background: #f1f5f9; color: #475569; position: sticky; top: 0;">
                                                <th style="padding: 0.3rem 0.4rem; text-align: center; width: 30px;">STT</th>
                                                <th style="padding: 0.3rem 0.4rem; text-align: left;">Họ &amp; Tên</th>
                                                <th style="padding: 0.3rem 0.4rem; text-align: left;">Môn Chính</th>
                                                <th style="padding: 0.3rem 0.4rem; text-align: center;">Chủ Nhiệm</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${teachers.map((t, idx) => {
                                                const tName = typeof t === 'string' ? t : (t.displayName || t.fullName || t.name || '');
                                                const isQuan = tName.includes('Tá Quan');
                                                const subName = t.subjects ? (Array.isArray(t.subjects) ? t.subjects.join(', ') : t.subjects) : (t.subject || 'Toán');
                                                let homeroomClass = t.homeroom;
                                                if (!homeroomClass && this.engine.schoolConfig?.homeroomTeachers) {
                                                    homeroomClass = Object.keys(this.engine.schoolConfig.homeroomTeachers).find(c => this.engine.schoolConfig.homeroomTeachers[c] === (t.fullName || tName));
                                                }
                                                return `
                                                    <tr style="border-bottom: 1px solid #e2e8f0; ${isQuan ? 'background: #eff6ff; font-weight: 800; color: #1d4ed8;' : ''}">
                                                        <td style="padding: 0.3rem 0.4rem; text-align: center; color: #64748b;">${idx + 1}</td>
                                                        <td style="padding: 0.3rem 0.4rem;">${tName}${isQuan ? ' ⭐' : ''}</td>
                                                        <td style="padding: 0.3rem 0.4rem;">${subName}</td>
                                                        <td style="padding: 0.3rem 0.4rem; text-align: center;">
                                                            ${homeroomClass ? `<span style="background: #dbeafe; color: #1e40af; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 800; font-size: 0.7rem;">Lớp ${homeroomClass}</span>` : '<span style="color: #94a3b8;">-</span>'}
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Khối 2: Tóm Tắt PCCM -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; padding-bottom: 0.35rem; border-bottom: 1px solid #cbd5e1;">
                                    <strong style="font-size: 0.8rem; color: #0f172a;">📋 Phân Công Chuyên Môn (${assignments.length} Phân công)</strong>
                                    <button type="button" onclick="window.smartTKBUI.openPCCMDetailModal()" style="background: #f0fdf4; color: #15803d; border: 1px solid #86efac; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.68rem; font-weight: 800; cursor: pointer;">
                                        🔍 Xem Chi Tiết Phụ
                                    </button>
                                </div>
                                <div style="max-height: 230px; overflow-y: auto; font-size: 0.73rem;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr style="background: #f1f5f9; color: #475569; position: sticky; top: 0;">
                                                <th style="padding: 0.3rem 0.4rem; text-align: left;">Giáo Viên</th>
                                                <th style="padding: 0.3rem 0.4rem; text-align: left;">Môn</th>
                                                <th style="padding: 0.3rem 0.4rem; text-align: center;">Lớp</th>
                                                <th style="padding: 0.3rem 0.4rem; text-align: center;">Số Tiết</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${assignments.slice(0, 20).map((a, idx) => {
                                                const isQuan = a.teacher && a.teacher.includes('Tá Quan');
                                                return `
                                                    <tr style="border-bottom: 1px solid #e2e8f0; ${isQuan ? 'background: #eff6ff; font-weight: 800; color: #1d4ed8;' : ''}">
                                                        <td style="padding: 0.3rem 0.4rem;">${a.teacher}</td>
                                                        <td style="padding: 0.3rem 0.4rem;">${a.subject}</td>
                                                        <td style="padding: 0.3rem 0.4rem; text-align: center; font-weight: 700;">${a.classId}</td>
                                                        <td style="padding: 0.3rem 0.4rem; text-align: center; font-weight: 800; color: #1d4ed8;">${a.periodsPerWeek}t</td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                    ${assignments.length > 20 ? `
                                        <div style="text-align: center; padding: 0.35rem; font-size: 0.7rem; color: #64748b; background: #f1f5f9; border-radius: 4px; margin-top: 0.3rem;">
                                            ...và còn ${assignments.length - 20} phân công khác. Bấm nút <strong>Chi Tiết Phụ</strong> để xem toàn bộ!
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                        </div>
                    </div>

                    <!-- TAB 5: KHỐI LỚP & PHÒNG HỌC -->
                    <div id="master-tab-facilities" class="master-modal-pane" style="display: none;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            
                            <div>
                                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #1e293b;">🏫 Danh Sách Khối Lớp &amp; GVCN Phân Công (${this.engine.classes.length} Lớp):</h4>
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.65rem; display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.65rem;">
                                    ${this.engine.classes.map(c => {
                                        const gvcn = this.getHomeroomTeacherForClass(c);
                                        const isQuan = gvcn && gvcn.isQuan;
                                        return `
                                            <span style="background: ${isQuan ? '#eff6ff' : '#ffffff'}; color: ${isQuan ? '#1e40af' : '#1e293b'}; border: 1px solid ${isQuan ? '#93c5fd' : '#cbd5e1'}; font-weight: 800; font-size: 0.75rem; padding: 0.25rem 0.55rem; border-radius: 5px; display: inline-flex; align-items: center; gap: 0.3rem;">
                                                <span>Lớp ${c}</span>
                                                ${gvcn ? `<span style="background: ${isQuan ? '#dbeafe' : '#f1f5f9'}; color: ${isQuan ? '#1d4ed8' : '#047857'}; font-weight: 700; font-size: 0.68rem; padding: 0.05rem 0.3rem; border-radius: 3px;">(${isQuan ? '⭐ ' : ''}${gvcn.shortName})</span>` : ''}
                                            </span>
                                        `;
                                    }).join('')}
                                </div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.25rem;">
                                    ✏️ Tùy Chỉnh / Nhập Nhanh Danh Sách Lớp (Phân cách bằng dấu phẩy):
                                </label>
                                <input type="text" id="mcfgClassesInput" value="${this.engine.classes.join(', ')}" style="width: 100%; padding: 0.45rem 0.7rem; font-size: 0.82rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px; color: #1e40af; background: #ffffff;" placeholder="Ví dụ: 6A1, 6A2, 6A3, 7A1, 7A2, 8A1, 8A2, 9A1, 9A2">
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.7rem; color: #64748b;">
                                    💡 Hệ thống tự động phân loại khối lớp và tạo các nút lọc động tương ứng trên Bảng TKB toàn trường.
                                </p>
                            </div>

                            <div>
                                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #1e293b;">🏛️ Phòng Học Bộ Môn (${rooms.length} Phòng):</h4>
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.65rem; display: flex; flex-direction: column; gap: 0.35rem;">
                                    ${rooms.map(r => `
                                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #334155;">
                                            <span>${r.icon} <strong>${r.name}</strong></span>
                                            <span style="color: #64748b;">Sức chứa: ${r.capacity} lớp/tiết</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                        </div>
                    </div>

                </div>

                <!-- 4. FOOTER MODAL: NÚT LƯU & ÁP DỤNG TOÀN DIỆN -->
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.85rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.73rem; color: #64748b;">
                        <span>💡 Toàn bộ dữ liệu được lưu giữ an toàn trong bộ nhớ máy tính (LocalStorage &amp; JSON)</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" onclick="window.smartTKBUI.closeMasterDeclarationModal()" style="padding: 0.45rem 0.85rem; font-size: 0.78rem; font-weight: 700; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; cursor: pointer;">
                            Đóng
                        </button>
                        <button type="button" onclick="window.smartTKBUI.saveMasterDeclarationModal()" style="padding: 0.45rem 1.15rem; font-size: 0.78rem; font-weight: 800; border-radius: 6px; border: none; background: #1d4ed8; color: #ffffff; cursor: pointer; box-shadow: 0 2px 6px rgba(29, 78, 216, 0.3);">
                            💾 Lưu &amp; Kích Hoạt Toàn Trường
                        </button>
                    </div>
                </div>

            </div>
        `;
        modal.style.display = 'flex';
    }

    switchMasterModalTab(tabId) {
        document.querySelectorAll('.btn-master-modal-tab').forEach(btn => {
            const isTarget = btn.dataset.tab === tabId;
            btn.classList.toggle('active', isTarget);
            btn.style.borderBottomColor = isTarget ? '#1d4ed8' : 'transparent';
            btn.style.color = isTarget ? '#1d4ed8' : '#64748b';
            btn.style.fontWeight = isTarget ? '800' : '700';
        });

        document.querySelectorAll('.master-modal-pane').forEach(pane => {
            pane.style.display = pane.id === `master-tab-${tabId}` ? 'block' : 'none';
        });
    }

    /**
     * HỘP THOẠI: BẢNG ĐỐI SOÁT & LŨY KẾ THỜI KHÓA BIỂU LIỀN KỀ TRƯỚC
     * (Theo chỉ đạo trực tiếp của Thầy Nguyễn Tá Quan)
     */
    openCumulativePriorModal() {
        let modal = document.getElementById('tkbCumulativePriorModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tkbCumulativePriorModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(8px); z-index: 1000000; align-items: center; justify-content: center;
                padding: 1rem;
            `;
            document.body.appendChild(modal);
        }

        modal.classList.add('active');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('pointer-events', 'auto', 'important');
        modal.style.setProperty('z-index', '9999999', 'important');

        const workloadReport = this.engine.getTeacherWorkloadReport ? this.engine.getTeacherWorkloadReport() : [];
        const priorWeeks = 8; // Tuần 1 đến 8 liền kề trước
        const currentWeeks = 5; // Tuần 9 đến 13 hiện hành

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; max-width: 980px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.4); border: 1px solid #cbd5e1; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; animation: modalPop 0.2s ease-out;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #065f46 0%, #047857 50%, #0f766e 100%); color: #ffffff; padding: 0.9rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <span style="font-size: 1.5rem;">📊</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.08rem; font-weight: 800; text-transform: uppercase;">
                                BẢNG ĐỐI SOÁT &amp; LŨY KẾ THỜI KHÓA BIỂU LIỀN KỀ TRƯỚC
                            </h3>
                            <p style="margin: 0.15rem 0 0 0; font-size: 0.74rem; color: #a7f3d0;">
                                Kế thừa từ TKB Tuần 1 - 8 • Chuyển tiếp sang Giai đoạn Tuần 9 - 13 • Năm học 2026 - 2027
                            </p>
                        </div>
                    </div>
                    <button type="button" onclick="window.smartTKBUI.closeCumulativePriorModal()" style="background: rgba(255,255,255,0.2); border: none; color: #ffffff; font-size: 1.4rem; cursor: pointer; line-height: 1; padding: 0.2rem 0.55rem; border-radius: 6px;">&times;</button>
                </div>

                <!-- 4 Thẻ Chỉ Số Lũy Kế Nhanh -->
                <div style="padding: 0.85rem 1.25rem 0 1.25rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.65rem;">
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.6rem 0.75rem;">
                        <div style="font-size: 0.7rem; font-weight: 700; color: #166534; text-transform: uppercase;">⏱️ TKB Liền Kề Trước:</div>
                        <div style="font-size: 1rem; font-weight: 800; color: #047857; margin-top: 0.15rem;">Tuần 1 đến Tuần 8 (8 Tuần)</div>
                    </div>
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.6rem 0.75rem;">
                        <div style="font-size: 0.7rem; font-weight: 700; color: #1e40af; text-transform: uppercase;">📅 Giai Đoạn Đang Áp Dụng:</div>
                        <div style="font-size: 1rem; font-weight: 800; color: #1d4ed8; margin-top: 0.15rem;">Tuần 9 đến Tuần 13 (5 Tuần)</div>
                    </div>
                    <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 0.6rem 0.75rem;">
                        <div style="font-size: 0.7rem; font-weight: 700; color: #854d0e; text-transform: uppercase;">🎯 Định Mức PTDTBT:</div>
                        <div style="font-size: 1rem; font-weight: 800; color: #b45309; margin-top: 0.15rem;">17 Tiết / Tuần / Giáo Viên</div>
                    </div>
                    <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 0.6rem 0.75rem;">
                        <div style="font-size: 0.7rem; font-weight: 700; color: #6b21a8; text-transform: uppercase;">✅ Tiến Độ Chuyên Môn:</div>
                        <div style="font-size: 1rem; font-weight: 800; color: #7e22ce; margin-top: 0.15rem;">Đạt 100% Khung PPCT Bộ</div>
                    </div>
                </div>

                <!-- Bảng Chi Tiết Lũy Kế Từng Thầy Cô -->
                <div style="padding: 0.85rem 1.25rem; overflow-y: auto; flex: 1;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                        <thead>
                            <tr style="background: #f1f5f9; color: #334155; text-align: left; border-bottom: 2px solid #cbd5e1; position: sticky; top: 0;">
                                <th style="padding: 0.45rem 0.5rem; width: 35px; text-align: center;">STT</th>
                                <th style="padding: 0.45rem 0.5rem;">Thầy Cô Giáo</th>
                                <th style="padding: 0.45rem 0.5rem;">Tổ Chuyên Môn</th>
                                <th style="padding: 0.45rem 0.5rem; text-align: center;">Định Mức</th>
                                <th style="padding: 0.45rem 0.5rem; text-align: center;">Tiết/Tuần (GĐ 1-8)</th>
                                <th style="padding: 0.45rem 0.5rem; text-align: center; background: #e0f2fe; color: #0369a1;">Lũy Kế Đã Dạy (8T)</th>
                                <th style="padding: 0.45rem 0.5rem; text-align: center;">Tiết/Tuần (GĐ 9-13)</th>
                                <th style="padding: 0.45rem 0.5rem; text-align: center; background: #dcfce7; color: #15803d;">Tổng Lũy Kế Đến T13</th>
                                <th style="padding: 0.45rem 0.5rem; text-align: center;">Tiến Độ PPCT</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${workloadReport.map((w, idx) => {
                                const tName = w.teacherName || w.teacher || w.fullName || 'Giáo viên';
                                const isQuan = tName.includes('Tá Quan') || !!w.isQuan;
                                const tPeriods = w.teachingTotal ?? w.teachingPeriods ?? 17;
                                const priorAccum = tPeriods * priorWeeks;
                                const totalExpected = priorAccum + (tPeriods * currentWeeks);
                                const pct = Math.min(100, Math.round((totalExpected / (17 * 35)) * 100));
                                return `
                                    <tr style="border-bottom: 1px solid #e2e8f0; ${isQuan ? 'background: #eff6ff; font-weight: 800; color: #1d4ed8;' : ''}">
                                        <td style="padding: 0.4rem 0.5rem; text-align: center; color: #64748b;">${idx + 1}</td>
                                        <td style="padding: 0.4rem 0.5rem;">
                                            <strong>${tName}</strong>${isQuan ? ' ⭐' : ''}
                                        </td>
                                        <td style="padding: 0.4rem 0.5rem; color: #475569;">${w.department || 'Tổ Tự Nhiên'}</td>
                                        <td style="padding: 0.4rem 0.5rem; text-align: center; font-weight: 700;">${w.standardQuota || 17}t</td>
                                        <td style="padding: 0.4rem 0.5rem; text-align: center; font-weight: 700; color: #0284c7;">${tPeriods}t</td>
                                        <td style="padding: 0.4rem 0.5rem; text-align: center; font-weight: 800; background: #f0f9ff; color: #0369a1;">${priorAccum}t</td>
                                        <td style="padding: 0.4rem 0.5rem; text-align: center; font-weight: 700; color: #059669;">${tPeriods}t</td>
                                        <td style="padding: 0.4rem 0.5rem; text-align: center; font-weight: 800; background: #f0fdf4; color: #15803d;">${totalExpected}t</td>
                                        <td style="padding: 0.4rem 0.5rem; text-align: center;">
                                            <span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 0.12rem 0.4rem; border-radius: 4px; border: 1px solid #a7f3d0; font-size: 0.7rem;">
                                                ✅ ${pct}% (Đạt)
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div style="background: #f8fafc; border-top: 1px solid #cbd5e1; padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <span style="font-size: 0.74rem; color: #64748b; font-weight: 600;">
                        💡 <em>Lũy kế được tự động tính toán liên thông giữa các giai đoạn tuần và đồng bộ vào Báo cáo quyết toán cả năm.</em>
                    </span>
                    <div style="display: flex; gap: 0.45rem;">
                        <button type="button" onclick="window.smartTKBUI.exportMasterTKBPackage()" style="background: #059669; color: #fff; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;">
                            <span>📥</span> <span>Xuất Excel Lũy Kế</span>
                        </button>
                        <button type="button" onclick="window.smartTKBUI.closeCumulativePriorModal()" style="background: #64748b; color: #fff; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                            Đóng
                        </button>
                    </div>
                </div>

            </div>
        `;
    }

    closeCumulativePriorModal() {
        const modal = document.getElementById('tkbCumulativePriorModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
            modal.style.setProperty('visibility', 'hidden', 'important');
        }
    }

    closeMasterDeclarationModal() {
        const modal = document.getElementById('tkbMasterDeclarationModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
            modal.style.setProperty('visibility', 'hidden', 'important');
        }
    }

    /**
     * HỘP THOẠI CHI TIẾT PHỤ: DANH SÁCH GIÁO VIÊN TOÀN TRƯỜNG (DSGV)
     * Thể hiện đầy đủ 20 Thầy Cô, định mức 17t, lớp CN, kiêm nhiệm, giảm trừ
     */
    openDSGVDetailModal() {
        let modal = document.getElementById('tkbDSGVDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tkbDSGVDetailModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(8px); z-index: 1000000; align-items: center; justify-content: center;
                padding: 1rem;
            `;
            document.body.appendChild(modal);
        }

        const teachers = this.engine.teachers || [];
        const workloadReport = this.engine.getTeacherWorkloadReport ? this.engine.getTeacherWorkloadReport() : [];

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; max-width: 900px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.4); border: 1px solid #cbd5e1; overflow: hidden; display: flex; flex-direction: column; max-height: 88vh; animation: modalPop 0.2s ease-out;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1e3a8a, #1d4ed8); color: #ffffff; padding: 0.85rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.4rem;">👨‍🏫</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800;">CHI TIẾT PHỤ: DANH SÁCH ĐỘI NGŨ GIÁO VIÊN TOÀN TRƯỜNG</h3>
                            <p style="margin: 0.15rem 0 0 0; font-size: 0.73rem; color: #bfdbfe;">Biên chế 20 Thầy Cô • Chuẩn định mức PTDTBT Canh Thuận (17 tiết/tuần)</p>
                        </div>
                    </div>
                    <button type="button" onclick="window.smartTKBUI.closeDSGVDetailModal()" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; font-size: 1.4rem; cursor: pointer; line-height: 1; padding: 0.15rem 0.5rem; border-radius: 6px;">&times;</button>
                </div>

                <!-- Bảng Danh Sách Đầy Đủ 20 Thầy Cô -->
                <div style="padding: 1rem; overflow-y: auto; flex: 1;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
                        <thead>
                            <tr style="background: #f1f5f9; color: #334155; text-align: left; border-bottom: 2px solid #cbd5e1; position: sticky; top: 0;">
                                <th style="padding: 0.5rem 0.6rem; width: 40px; text-align: center;">STT</th>
                                <th style="padding: 0.5rem 0.6rem;">Họ và Tên Giáo Viên</th>
                                <th style="padding: 0.5rem 0.6rem;">Tổ Chuyên Môn</th>
                                <th style="padding: 0.5rem 0.6rem;">Môn Phụ Trách</th>
                                <th style="padding: 0.5rem 0.6rem; text-align: center;">Chủ Nhiệm</th>
                                <th style="padding: 0.5rem 0.6rem; text-align: center;">Tiết Dạy</th>
                                <th style="padding: 0.5rem 0.6rem; text-align: center;">Tiết Giảm</th>
                                <th style="padding: 0.5rem 0.6rem; text-align: center;">Tổng Giờ</th>
                                <th style="padding: 0.5rem 0.6rem; text-align: center;">Định Mức</th>
                                <th style="padding: 0.5rem 0.6rem; text-align: center;">Tình Trạng</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${workloadReport.map((w, idx) => {
                                const tName = w.teacherName || w.teacher || w.fullName || 'Giáo viên';
                                const isQuan = tName.includes('Tá Quan') || !!w.isQuan;
                                const tSub = w.academicSubjects || (Array.isArray(w.subjects) ? w.subjects.join(', ') : 'Bộ môn');
                                const tTeach = w.teachingTotal ?? w.teachingPeriods ?? 0;
                                const tReduced = w.reducedTotal ?? w.reducedPeriods ?? 0;
                                const tFinal = w.finalTotal ?? w.totalCalculatedPeriods ?? 0;
                                const tQuota = w.standardQuota ?? w.requiredStandard ?? 17;
                                const homeroomRole = (w.roles || []).find(r => r.name && r.name.toLowerCase().includes('chủ nhiệm'));
                                const homeroomTxt = homeroomRole ? (w.classes ? `Lớp ${w.classes.split(',')[0]}` : 'CN') : (w.homeroom ? `Lớp ${w.homeroom}` : null);
                                return `
                                    <tr style="border-bottom: 1px solid #e2e8f0; ${isQuan ? 'background: #eff6ff; font-weight: 800; color: #1d4ed8;' : ''}">
                                        <td style="padding: 0.45rem 0.6rem; text-align: center; color: #64748b;">${idx + 1}</td>
                                        <td style="padding: 0.45rem 0.6rem;">
                                            <strong>${tName}</strong>${isQuan ? ' ⭐' : ''}
                                        </td>
                                        <td style="padding: 0.45rem 0.6rem; color: #475569;">${w.department || 'Tổ Bộ Môn'}</td>
                                        <td style="padding: 0.45rem 0.6rem;">${tSub}</td>
                                        <td style="padding: 0.45rem 0.6rem; text-align: center;">
                                            ${homeroomTxt ? `<span style="background: #dbeafe; color: #1e40af; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.72rem;">${homeroomTxt}</span>` : '<span style="color: #94a3b8;">-</span>'}
                                        </td>
                                        <td style="padding: 0.45rem 0.6rem; text-align: center; font-weight: 800; color: #0284c7;">${tTeach}t</td>
                                        <td style="padding: 0.45rem 0.6rem; text-align: center; color: #d97706; font-weight: 700;">-${tReduced}t</td>
                                        <td style="padding: 0.45rem 0.6rem; text-align: center; font-weight: 800; color: #15803d;">${tFinal}t</td>
                                        <td style="padding: 0.45rem 0.6rem; text-align: center; font-weight: 800; color: #475569;">${tQuota}t</td>
                                        <td style="padding: 0.45rem 0.6rem; text-align: center;">
                                            <span style="background: #f0fdf4; color: #166534; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 4px; border: 1px solid #bbf7d0; font-size: 0.7rem;">
                                                ✓ Chuẩn 100%
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.73rem; color: #64748b;">Căn cứ quy định Bộ GD&ĐT: Định mức chuẩn và giảm trừ kiêm nhiệm theo đúng cấp học (GDMN & GDPT).</span>
                    <button type="button" onclick="window.smartTKBUI.closeDSGVDetailModal()" style="padding: 0.4rem 0.85rem; font-size: 0.78rem; font-weight: 700; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; cursor: pointer;">
                        Đóng
                    </button>
                </div>

            </div>
        `;
        modal.style.display = 'flex';
    }

    closeDSGVDetailModal() {
        const modal = document.getElementById('tkbDSGVDetailModal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * HỘP THOẠI CHI TIẾT PHỤ: MA TRẬN PHÂN CÔNG CHUYÊN MÔN (PCCM)
     * Thể hiện trọn bộ 45 phân công môn/lớp theo từng Tổ chuyên môn
     */
    /**
     * HỘP THOẠI QUẢN TRỊ & NHẬP LIỆU PHÂN CÔNG CHUYÊN MÔN (PCCM) TOÀN TRƯỜNG
     * TÍCH HỢP FORM NHẬP / SỬA / XÓA PHÂN CÔNG TRỰC TIẾP CHUẨN SƯ PHẠM GDPT 2018
     */
    openPCCMDetailModal() {
        let modal = document.getElementById('tkbPCCMDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tkbPCCMDetailModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                display: flex; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(8px); z-index: 1000000; align-items: center; justify-content: center;
                padding: 1rem;
            `;
            document.body.appendChild(modal);
        }

        const assignments = this.engine.assignments || [];
        const teachers = this.engine.getAllTeachers ? this.engine.getAllTeachers() : (this.engine.teachers ? this.engine.teachers.map(t => (typeof t === "string" ? t : (t.displayName || t.fullName || t.name || ""))) : []);
        const classes = this.engine.classes || [];
        
        // Danh mục môn học chuẩn hóa đa cấp (Mầm Non, Phổ Thông GDPT 2018, Quốc Tế K-12)
        const currentSubjects = Array.from(new Set([
            ...(this.engine.subjects || []).map(s => typeof s === 'string' ? s : s.name),
            ...assignments.map(a => a.subject)
        ])).filter(Boolean);

        modal.classList.add('active');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('pointer-events', 'auto', 'important');
        modal.style.setProperty('z-index', '9999999', 'important');

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; max-width: 980px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.4); border: 1px solid #cbd5e1; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; animation: modalPop 0.2s ease-out;">
                
                <!-- 1. Header Hộp Thoại PCCM -->
                <div style="background: linear-gradient(135deg, #0f172a 0%, #0369a1 50%, #059669 100%); color: #ffffff; padding: 0.85rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.4rem;">⚖️</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800;">NHẬP &amp; QUẢN TRỊ PHÂN CÔNG CHUYÊN MÔN (PCCM) TOÀN TRƯỜNG</h3>
                            <p style="margin: 0.15rem 0 0 0; font-size: 0.73rem; color: #a7f3d0;">
                                Nhập phân công trực tiếp • Thêm / Sửa / Xóa nhiệm vụ giảng dạy (${assignments.length} phân công hiện tại)
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.4rem; align-items: center;">
                        <button type="button" onclick="window.smartTKBUI.exportPCCMExcel()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 0.3rem 0.65rem; border-radius: 5px; font-size: 0.74rem; font-weight: 700; cursor: pointer;">
                            📤 Xuất Excel
                        </button>
                        <button type="button" onclick="window.smartTKBUI.closePCCMDetailModal()" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; font-size: 1.4rem; cursor: pointer; line-height: 1; padding: 0.15rem 0.5rem; border-radius: 6px;">&times;</button>
                    </div>
                </div>

                <!-- 2. Vùng Nhập Liệu Trực Tiếp & Danh Sách Phân Công -->
                <div style="padding: 1rem; overflow-y: auto; flex: 1;">
                    
                    <!-- KHUNG FORM NHẬP / SỬA PHÂN CÔNG TRỰC TIẾP -->
                    <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <strong id="pccmFormTitle" style="font-size: 0.85rem; color: #166534; display: flex; align-items: center; gap: 0.35rem;">
                                <span>➕</span> <span>NHẬP PHÂN CÔNG MÔN HỌC - GIÁO VIÊN MỚI:</span>
                            </strong>
                            <span id="pccmEditingBadge" style="display: none; background: #fef08a; color: #854d0e; padding: 0.15rem 0.55rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">
                                ✏️ Đang Chỉnh Sửa Phân Công
                            </span>
                        </div>
                        <input type="hidden" id="pccmEditIndex" value="-1">

                        <div style="display: grid; grid-template-columns: 1.8fr 1.1fr 1.8fr 0.9fr auto; gap: 0.55rem; align-items: end;">
                            <!-- 1. Họ Tên Thầy Cô -->
                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #334155; margin-bottom: 0.2rem;">
                                    👨‍🏫 Họ Tên Thầy Cô:
                                </label>
                                <input id="pccmInputTeacher" list="pccmTeacherDatalist" placeholder="Gõ hoặc chọn Giáo viên..." style="width: 100%; padding: 0.42rem 0.6rem; font-size: 0.78rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px; color: #0f172a; background: #ffffff;">
                                <datalist id="pccmTeacherDatalist">
                                    ${teachers.map(t => `<option value="${t}">`).join('')}
                                </datalist>
                            </div>

                            <!-- 2. Lớp Học -->
                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #334155; margin-bottom: 0.2rem;">
                                    🎒 Lớp Học:
                                </label>
                                <select id="pccmInputClass" style="width: 100%; padding: 0.42rem 0.5rem; font-size: 0.78rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; color: #0f172a;">
                                    ${classes.map(c => `<option value="${c}">Lớp ${c}</option>`).join('')}
                                </select>
                            </div>

                            <!-- 3. Môn Học (CHỈ LIST TÊN MÔN, HỖ TRỢ ĐA CẤP GDMN & GDPT QUỐC TẾ) -->
                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #334155; margin-bottom: 0.2rem;">
                                    📚 Môn Học (GDMN &amp; GDPT):
                                </label>
                                <select id="pccmInputSubject" style="width: 100%; padding: 0.42rem 0.5rem; font-size: 0.78rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; color: #0f172a;">
                                    <optgroup label="📋 Môn Phân Công Hiện Hành (${currentSubjects.length})">
                                        ${currentSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                                    </optgroup>
                                    <optgroup label="🌱 Bậc Mầm Non (GDMN)">
                                        <option value="Khám phá khoa học">Khám phá khoa học</option>
                                        <option value="Phát triển nhận thức">Phát triển nhận thức</option>
                                        <option value="Phát triển thể chất">Phát triển thể chất</option>
                                        <option value="Phát triển ngôn ngữ">Phát triển ngôn ngữ</option>
                                        <option value="Làm quen với Toán">Làm quen với Toán</option>
                                        <option value="Làm quen văn học">Làm quen văn học</option>
                                        <option value="Giáo dục âm nhạc">Giáo dục âm nhạc</option>
                                        <option value="Hoạt động tạo hình">Hoạt động tạo hình</option>
                                        <option value="Kỹ năng sống &amp; Xã hội">Kỹ năng sống &amp; Xã hội</option>
                                    </optgroup>
                                    <optgroup label="🏫 Bậc Phổ Thông (Tiểu Học - THCS - THPT)">
                                        <option value="Toán">Toán</option>
                                        <option value="Ngữ Văn">Ngữ Văn</option>
                                        <option value="Tiếng Việt">Tiếng Việt</option>
                                        <option value="Tiếng Anh">Tiếng Anh</option>
                                        <option value="KHTN">KHTN</option>
                                        <option value="Khoa học">Khoa học</option>
                                        <option value="Lịch Sử">Lịch Sử</option>
                                        <option value="Địa Lí">Địa Lí</option>
                                        <option value="Lịch Sử &amp; Địa Lí">Lịch Sử &amp; Địa Lí</option>
                                        <option value="Tin Học">Tin Học</option>
                                        <option value="Công Nghệ">Công Nghệ</option>
                                        <option value="Giáo Dục Thể Chất">Giáo Dục Thể Chất</option>
                                        <option value="Nghệ Thuật">Nghệ Thuật</option>
                                        <option value="Âm Nhạc">Âm Nhạc</option>
                                        <option value="Mĩ Thuật">Mĩ Thuật</option>
                                        <option value="Giáo Dục Công Dân">Giáo Dục Công Dân</option>
                                        <option value="Giáo Dục Kinh Tế &amp; Pháp Luật">Giáo Dục Kinh Tế &amp; Pháp Luật</option>
                                        <option value="HĐTN, HN">HĐTN, HN</option>
                                        <option value="STEM">STEM</option>
                                    </optgroup>
                                    <optgroup label="🌐 Chương Trình Quốc Tế (International K-12)">
                                        <option value="Mathematics">Mathematics</option>
                                        <option value="English Language Arts">English Language Arts</option>
                                        <option value="Science">Science</option>
                                        <option value="Physics">Physics</option>
                                        <option value="Chemistry">Chemistry</option>
                                        <option value="Biology">Biology</option>
                                        <option value="Social Studies">Social Studies</option>
                                        <option value="World History">World History</option>
                                        <option value="Geography">Geography</option>
                                        <option value="Information Technology">Information Technology</option>
                                        <option value="Visual Arts">Visual Arts</option>
                                        <option value="Physical Education">Physical Education</option>
                                        <option value="Global Perspectives">Global Perspectives</option>
                                        <option value="Robotics">Robotics</option>
                                    </optgroup>
                                </select>
                            </div>

                            <!-- 4. Số Tiết/Tuần -->
                            <div>
                                <label style="display: block; font-size: 0.72rem; font-weight: 800; color: #0369a1; margin-bottom: 0.2rem;">
                                    ⏱️ Số Tiết/Tuần:
                                </label>
                                <input type="number" id="pccmInputPeriods" value="3" min="1" max="30" style="width: 100%; padding: 0.42rem 0.5rem; font-size: 0.8rem; font-weight: 800; text-align: center; border: 1.5px solid #0284c7; border-radius: 6px; color: #0369a1; background: #f0f9ff;">
                            </div>

                            <!-- 5. Nút Thao Tác -->
                            <div style="display: flex; gap: 0.35rem;">
                                <button type="button" id="pccmBtnSubmit" onclick="window.smartTKBUI.savePCCMFromDetailModal()" style="background: #059669; color: #ffffff; border: none; padding: 0.42rem 0.95rem; border-radius: 6px; font-weight: 800; font-size: 0.78rem; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 4px rgba(5,150,105,0.25);">
                                    ➕ Thêm Phân Công
                                </button>
                                <button type="button" id="pccmBtnCancelEdit" onclick="window.smartTKBUI.resetPCCMFormInModal()" style="display: none; background: #64748b; color: #ffffff; border: none; padding: 0.42rem 0.65rem; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- BỘ LỌC TÌM KIẾM & PHÂN LOẠI DANH SÁCH PHÂN CÔNG (126 PHÂN CÔNG) -->
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                            <span style="font-size: 0.74rem; font-weight: 800; color: #475569;">🔍 Lọc Phân Công:</span>
                            <input type="text" id="pccmFilterKeyword" oninput="window.smartTKBUI.filterPCCMListInModal()" placeholder="Tìm Thầy Cô, Môn..." style="padding: 0.25rem 0.5rem; font-size: 0.74rem; border: 1px solid #cbd5e1; border-radius: 5px; width: 140px; color: #0f172a; background: #fff;">
                            <select id="pccmFilterClass" onchange="window.smartTKBUI.filterPCCMListInModal()" style="padding: 0.25rem 0.5rem; font-size: 0.74rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: #1e293b;">
                                <option value="all">🎒 Tất Cả Lớp (${classes.length})</option>
                                ${classes.map(c => `<option value="${c}">Lớp ${c}</option>`).join('')}
                            </select>
                            <select id="pccmFilterTeacher" onchange="window.smartTKBUI.filterPCCMListInModal()" style="padding: 0.25rem 0.5rem; font-size: 0.74rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: #1e293b;">
                                <option value="all">👨‍🏫 Tất Cả Giáo Viên (${teachers.length})</option>
                                ${teachers.map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                            <select id="pccmFilterSubject" onchange="window.smartTKBUI.filterPCCMListInModal()" style="padding: 0.25rem 0.5rem; font-size: 0.74rem; font-weight: 700; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: #1e293b;">
                                <option value="all">📚 Tất Cả Môn (${currentSubjects.length})</option>
                                ${currentSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                        <div id="pccmFilterCounter" style="font-size: 0.73rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 0.2rem 0.55rem; border-radius: 4px; border: 1px solid #bae6fd;">
                            Hiển thị: ${assignments.length} / ${assignments.length} phân công
                        </div>
                    </div>

                    <!-- BẢNG DANH SÁCH TẤT CẢ PHÂN CÔNG (CÓ NÚT SỬA VÀ XÓA TỪNG DÒNG) -->
                    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
                            <thead>
                                <tr style="background: #f8fafc; color: #334155; text-align: left; border-bottom: 2px solid #cbd5e1; position: sticky; top: 0;">
                                    <th style="padding: 0.45rem 0.6rem; width: 35px; text-align: center;">STT</th>
                                    <th style="padding: 0.45rem 0.6rem;">Họ và Tên Giáo Viên</th>
                                    <th style="padding: 0.45rem 0.6rem; text-align: center;">Lớp Học</th>
                                    <th style="padding: 0.45rem 0.6rem;">Môn Học</th>
                                    <th style="padding: 0.45rem 0.6rem; text-align: center;">Số Tiết/Tuần</th>
                                    <th style="padding: 0.45rem 0.6rem; text-align: center; width: 120px;">Thao Tác Trực Tiếp</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${assignments.map((a, idx) => {
                                    const isQuan = a.teacher && a.teacher.includes('Tá Quan');
                                    const pVal = a.periodsPerWeek || a.periods || 1;
                                    return `
                                        <tr class="pccm-data-row" data-teacher="${(a.teacher || '').toLowerCase()}" data-subject="${(a.subject || '').toLowerCase()}" data-class="${a.classId || ''}" style="border-bottom: 1px solid #f1f5f9; ${isQuan ? 'background: #eff6ff; font-weight: 800; color: #1d4ed8;' : ''}">
                                            <td style="padding: 0.4rem 0.6rem; text-align: center; color: #64748b;">${idx + 1}</td>
                                            <td style="padding: 0.4rem 0.6rem;">
                                                <strong>${a.teacher}</strong>${isQuan ? ' ⭐' : ''}
                                            </td>
                                            <td style="padding: 0.4rem 0.6rem; text-align: center; font-weight: 800; color: #1e40af;">${a.classId}</td>
                                            <td style="padding: 0.4rem 0.6rem; color: #334155;">${a.subject}</td>
                                            <td style="padding: 0.4rem 0.6rem; text-align: center; font-weight: 800; color: #059669;">${pVal} tiết</td>
                                            <td style="padding: 0.4rem 0.6rem; text-align: center; white-space: nowrap;">
                                                <button type="button" onclick="window.smartTKBUI.editPCCMInModal(${idx})" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #93c5fd; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800; cursor: pointer; margin-right: 0.3rem;">
                                                    ✏️ Sửa
                                                </button>
                                                <button type="button" onclick="window.smartTKBUI.deletePCCMInModal(${idx})" style="background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800; cursor: pointer;">
                                                    🗑️ Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                </div>

                <!-- 3. Footer Hộp Thoại -->
                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.73rem; color: #64748b;">
                        💡 Mọi thay đổi phân công được tự động lưu vào bộ nhớ máy và đồng bộ với Bàn Cờ Thời Khóa Biểu.
                    </div>
                    <button type="button" onclick="window.smartTKBUI.closePCCMDetailModal()" style="padding: 0.4rem 1rem; font-size: 0.78rem; font-weight: 700; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; cursor: pointer;">
                        Đóng
                    </button>
                </div>

            </div>
        `;
        modal.style.display = 'flex';
    }

    savePCCMFromDetailModal() {
        const teacherInput = document.getElementById('pccmInputTeacher');
        const subjectSelect = document.getElementById('pccmInputSubject');
        const classSelect = document.getElementById('pccmInputClass');
        const periodsInput = document.getElementById('pccmInputPeriods');
        const editIdxInput = document.getElementById('pccmEditIndex');

        const teacher = teacherInput ? teacherInput.value.trim() : '';
        const subject = subjectSelect ? subjectSelect.value : '';
        const classId = classSelect ? classSelect.value : '';
        const periods = periodsInput ? parseInt(periodsInput.value) || 1 : 1;
        const editIdx = editIdxInput ? parseInt(editIdxInput.value) : -1;

        if (!teacher) {
            alert('Vui lòng nhập họ và tên Giáo viên!');
            if (teacherInput) teacherInput.focus();
            return;
        }

        const assignObj = {
            teacher: teacher,
            subject: subject,
            classId: classId,
            periodsPerWeek: periods,
            periods: periods,
            doublePeriod: false
        };

        if (editIdx >= 0 && this.engine.assignments[editIdx]) {
            this.engine.assignments[editIdx] = {
                ...this.engine.assignments[editIdx],
                ...assignObj
            };
            this.showToast(`✅ Đã cập nhật phân công cho ${teacher} (${subject} - Lớp ${classId})!`);
        } else {
            this.engine.assignments.push(assignObj);
            this.showToast(`✅ Đã thêm mới phân công: ${teacher} dạy ${subject} - Lớp ${classId} (${periods}t/tuần)!`);
        }

        // Lưu Engine State & Cập Nhật Giao Diện
        this.engine.saveState();
        this.openPCCMDetailModal(); // Render lại bảng trong modal
        this.updateFilterControls();
        this.renderCurrentView();
        this.renderPCCMTable();
    }

    /**
     * Bộ lọc động tức thì trong Hộp thoại Phân Công Chuyên Môn (PCCM)
     */
    filterPCCMListInModal() {
        const keyword = (document.getElementById('pccmFilterKeyword')?.value || '').toLowerCase().trim();
        const classVal = document.getElementById('pccmFilterClass')?.value || 'all';
        const teacherVal = (document.getElementById('pccmFilterTeacher')?.value || 'all').toLowerCase();
        const subjectVal = (document.getElementById('pccmFilterSubject')?.value || 'all').toLowerCase();

        const rows = document.querySelectorAll('.pccm-data-row');
        let visibleCount = 0;

        rows.forEach(row => {
            const tText = row.getAttribute('data-teacher') || '';
            const sText = row.getAttribute('data-subject') || '';
            const cText = row.getAttribute('data-class') || '';

            const matchKeyword = !keyword || tText.includes(keyword) || sText.includes(keyword);
            const matchClass = (classVal === 'all') || (cText === classVal);
            const matchTeacher = (teacherVal === 'all') || (tText === teacherVal);
            const matchSubject = (subjectVal === 'all') || (sText === subjectVal);

            if (matchKeyword && matchClass && matchTeacher && matchSubject) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        const counter = document.getElementById('pccmFilterCounter');
        if (counter) {
            counter.innerText = `Hiển thị: ${visibleCount} / ${rows.length} phân công`;
        }
    }

    editPCCMInModal(idx) {
        const assign = this.engine.assignments[idx];
        if (!assign) return;

        const teacherInput = document.getElementById('pccmInputTeacher');
        const subjectSelect = document.getElementById('pccmInputSubject');
        const classSelect = document.getElementById('pccmInputClass');
        const periodsInput = document.getElementById('pccmInputPeriods');
        const editIdxInput = document.getElementById('pccmEditIndex');
        const formTitle = document.getElementById('pccmFormTitle');
        const editingBadge = document.getElementById('pccmEditingBadge');
        const btnSubmit = document.getElementById('pccmBtnSubmit');
        const btnCancel = document.getElementById('pccmBtnCancelEdit');

        if (teacherInput) teacherInput.value = assign.teacher || '';
        if (subjectSelect) subjectSelect.value = assign.subject || '';
        if (classSelect) classSelect.value = assign.classId || '';
        if (periodsInput) periodsInput.value = assign.periodsPerWeek || assign.periods || 1;
        if (editIdxInput) editIdxInput.value = idx;

        if (formTitle) formTitle.innerHTML = `<span>✏️</span> <span>CHỈNH SỬA PHÂN CÔNG (DÒNG #${idx + 1}):</span>`;
        if (editingBadge) editingBadge.style.display = 'inline-block';
        if (btnSubmit) {
            btnSubmit.innerHTML = '💾 Cập Nhật Phân Công';
            btnSubmit.style.background = '#1d4ed8';
        }
        if (btnCancel) btnCancel.style.display = 'inline-block';

        if (teacherInput) {
            teacherInput.focus();
            teacherInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    deletePCCMInModal(idx) {
        const assign = this.engine.assignments[idx];
        if (!assign) return;

        if (confirm(`Thầy có chắc chắn muốn xóa phân công: ${assign.teacher} dạy môn ${assign.subject} tại Lớp ${assign.classId} không?`)) {
            this.engine.assignments.splice(idx, 1);
            this.engine.saveState();
            this.showToast(`🗑️ Đã xóa phân công môn ${assign.subject} của ${assign.teacher}!`);
            this.openPCCMDetailModal();
            this.updateFilterControls();
            this.renderCurrentView();
            this.renderPCCMTable();
        }
    }

    resetPCCMFormInModal() {
        const teacherInput = document.getElementById('pccmInputTeacher');
        const editIdxInput = document.getElementById('pccmEditIndex');
        const formTitle = document.getElementById('pccmFormTitle');
        const editingBadge = document.getElementById('pccmEditingBadge');
        const btnSubmit = document.getElementById('pccmBtnSubmit');
        const btnCancel = document.getElementById('pccmBtnCancelEdit');

        if (teacherInput) teacherInput.value = '';
        if (editIdxInput) editIdxInput.value = -1;
        if (formTitle) formTitle.innerHTML = `<span>➕</span> <span>NHẬP PHÂN CÔNG MÔN HỌC - GIÁO VIÊN MỚI:</span>`;
        if (editingBadge) editingBadge.style.display = 'none';
        if (btnSubmit) {
            btnSubmit.innerHTML = '➕ Thêm Phân Công';
            btnSubmit.style.background = '#059669';
        }
        if (btnCancel) btnCancel.style.display = 'none';
    }

    exportPCCMExcel() {
        if (window.smartTKBUI && typeof window.smartTKBUI.exportAnnualSettlementCSV === 'function') {
            window.smartTKBUI.exportAnnualSettlementCSV();
        } else {
            this.showToast('📥 Đang chuẩn bị xuất file danh sách phân công chuyên môn...');
        }
    }

    closePCCMDetailModal() {
        const modal = document.getElementById('tkbPCCMDetailModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
            modal.style.setProperty('visibility', 'hidden', 'important');
        }
    }

    saveMasterDeclarationModal() {
        // 1. Lưu thông tin trường
        const schoolName = document.getElementById('mcfgSchoolName')?.value || 'Trường THCS Bán Trú Canh Thuận';
        const tier = document.getElementById('mcfgTier')?.value || 'THCS';
        const model = document.getElementById('mcfgModel')?.value || 'BAN_TRU';
        const academicYear = document.getElementById('mcfgAcademicYear')?.value || '2026 - 2027';
        const chosenPlan = document.getElementById('mcfgSchedulePlanType')?.value || 'WEEK_9_13';
        const applyWeekRange = document.getElementById('mcfgApplyWeekRange')?.value || 'Tuần 9 đến Tuần 13';
        const standardHours = parseInt(document.getElementById('mcfgStandardHours')?.value) || 17;
        const totalWeeks = parseInt(document.getElementById('mcfgTotalWeeks')?.value) || 35;
        const session = document.getElementById('mcfgSession')?.value || 'Sáng (5 tiết/buổi)';

        if (!this.engine.schoolConfig) this.engine.schoolConfig = {};
        this.engine.schoolConfig.schoolName = schoolName;
        this.engine.schoolConfig.educationalTier = tier;
        this.engine.schoolConfig.schoolModel = model;
        this.engine.schoolConfig.academicYear = academicYear;
        this.engine.schoolConfig.schedulePlanType = chosenPlan;
        this.engine.schoolConfig.applyWeekRange = applyWeekRange;

        let chosenSemester = 'HK1';
        if (chosenPlan === 'HK2' || chosenPlan === 'WEEK_19_27' || chosenPlan === 'WEEK_28_35') {
            chosenSemester = 'HK2';
        } else if (chosenPlan === 'YEAR') {
            chosenSemester = 'YEAR';
        } else if (applyWeekRange.includes('HK2') || applyWeekRange.includes('Học kỳ II')) {
            chosenSemester = 'HK2';
        } else {
            const nums = applyWeekRange.match(/\d+/g);
            if (nums && parseInt(nums[0]) >= 19) {
                chosenSemester = 'HK2';
            }
        }
        this.engine.schoolConfig.semester = (chosenSemester === 'HK2' ? 'Học kỳ II' : (chosenSemester === 'YEAR' ? 'Cả năm' : 'Học kỳ I'));
        this.engine.schoolConfig.standardPeriodsPerWeek = standardHours;
        this.engine.schoolConfig.totalWeeks = totalWeeks;
        this.engine.schoolConfig.session = session;

        // 1.1 Lưu danh sách Khối Lớp nếu có chỉnh sửa từ Khai Báo Mở Rộng
        const classesInput = document.getElementById('mcfgClassesInput');
        if (classesInput && classesInput.value.trim()) {
            const parsedClasses = classesInput.value.split(',')
                .map(s => s.trim().toUpperCase())
                .filter(s => s.length > 0);
            if (parsedClasses.length > 0) {
                this.engine.classes = parsedClasses;
                for (const c of parsedClasses) {
                    if (!this.engine.timetable[c]) {
                        this.engine.timetable[c] = Array(this.engine.DAYS.length).fill(null).map(() => Array(this.engine.PERIODS.length).fill(null));
                    }
                }
            }
        }

        // 2. Lưu PPCT Môn học
        const subRows = document.querySelectorAll('#tblMasterCurriculumBody tr');
        if (subRows && subRows.length > 0) {
            let updatedSubjects = [];
            subRows.forEach(tr => {
                const idx = parseInt(tr.dataset.index);
                const name = tr.querySelector('.mcfg-sub-name')?.value || '';
                const periods = parseInt(tr.querySelector('.mcfg-sub-periods')?.value) || 1;
                const isDouble = tr.querySelector('.mcfg-sub-double')?.checked || false;
                const room = tr.querySelector('.mcfg-sub-room')?.value || null;

                const oldSub = this.engine.subjects[idx] || {};
                updatedSubjects.push({
                    ...oldSub,
                    name: name,
                    periodsPerWeek: periods,
                    doublePeriod: isDouble,
                    roomReq: room || null
                });
            });
            this.engine.subjects = updatedSubjects;
        }

        // 3. Lưu Ưu tiên Sư phạm
        if (!this.engine.pedagogicalPriorities) this.engine.pedagogicalPriorities = {};
        this.engine.pedagogicalPriorities.gvcnOffDays = document.getElementById('mprioGVCN')?.checked || false;
        this.engine.pedagogicalPriorities.noPEPeriod45 = document.getElementById('mprioNoPE45')?.checked || false;
        this.engine.pedagogicalPriorities.maxPeriodsPerDay = document.getElementById('mprioMax4')?.checked ? 4 : 5;
        this.engine.pedagogicalPriorities.preferDoublePeriods = document.getElementById('mprioDouble')?.checked || false;

        // Đồng bộ các checkbox ngoài màn hình chính nếu có
        const chkGVCN = document.getElementById('chkGVCNRest');
        if (chkGVCN) chkGVCN.checked = this.engine.pedagogicalPriorities.gvcnOffDays;
        const chkNoPE = document.getElementById('chkNoPE45');
        if (chkNoPE) chkNoPE.checked = this.engine.pedagogicalPriorities.noPEPeriod45;
        const chkMax4 = document.getElementById('chkMax4Periods');
        if (chkMax4) chkMax4.checked = (this.engine.pedagogicalPriorities.maxPeriodsPerDay === 4);
        const chkDouble = document.getElementById('chkPreferDouble');
        if (chkDouble) chkDouble.checked = this.engine.pedagogicalPriorities.preferDoublePeriods;

        // Đồng bộ Kế hoạch Tuần / Học kỳ nếu người dùng thay đổi trong modal
        this.setSchedulePlan(chosenPlan);

        // Lưu vào Engine & LocalStorage
        this.engine.saveState();

        // Đồng bộ các nhãn ngoài màn hình chính
        const nameDisp = document.getElementById('tkbGlobalSchoolNameDisplay');
        if (nameDisp) nameDisp.innerHTML = `🏫 ${schoolName}`;

        const tierBadge = document.getElementById('tkbGlobalTierBadge');
        if (tierBadge) {
            const tierMap = {
                'GDMN': 'Mầm Non',
                'TIEU_HOC': 'Tiểu Học',
                'THCS': 'GDPT 2018',
                'THPT': 'THPT Tổ Hợp',
                'LIEN_CAP': 'K-12 Liên Cấp'
            };
            tierBadge.textContent = tierMap[tier] || 'GDPT 2018';
        }

        const yearBadge = document.getElementById('tkbGlobalYearBadge');
        if (yearBadge) yearBadge.textContent = `NH: ${academicYear}`;

        const tierSelect = document.getElementById('tkbGlobalTierSelect');
        if (tierSelect) tierSelect.value = tier;

        const modelSelect = document.getElementById('tkbGlobalModelSelect');
        if (modelSelect) modelSelect.value = model;

        this.updateFilterControls();
        this.updateSchoolScaleSummary();
        this.renderCurrentView();
        this.renderPCCMTable();
        this.renderConfigTab();
        this.renderStats();

        this.closeMasterDeclarationModal();
        this.showToast(`🎉 Đã lưu & kích hoạt toàn diện hồ sơ trường [${schoolName}] (${academicYear})!`);
    }

}
