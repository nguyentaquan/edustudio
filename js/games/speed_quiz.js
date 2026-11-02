/**
 * EduStudio - Trò chơi 3: ĐUA THUYỀN TRI THỨC / TRẮC NGHIỆM TỐC ĐỘ (Speed Quiz)
 * Phiên bản nâng cấp v2.2:
 * 1. Có màn hình chuẩn bị (Lobby) - Giáo viên bấm "BẮT ĐẦU" mới chạy, KHÔNG tự chạy liền.
 * 2. Có hàm destroy / stop để DỪNG NGAY LẬP TỨC khi chuyển trang hoặc chuyển trò chơi.
 */

import { sound } from '../core/audio_engine.js';

export class SpeedQuizGame {
    constructor(engine, onQuizComplete) {
        this.engine = engine;
        this.ctx = engine.ctx;
        this.onQuizComplete = onQuizComplete;

        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;

        // Trạng thái trò chơi: 'lobby' (chờ), 'playing' (đang chạy), 'finished' (kết thúc)
        this.state = 'lobby';

        // Bộ đếm giờ
        this.timeLimit = 15; // giây
        this.timeRemaining = 15;
        this.timerInterval = null;
        this.isAnswered = false;
        this.selectedOption = -1;

        // Tọa độ các nút tương tác
        this.optionButtons = [];
        this.hoveredOption = -1;
        this.startBtnRect = null;
        this.nextButtonRect = null;
    }

    // Thiết lập dữ liệu và đưa về trạng thái chờ (Lobby)
    setQuestions(questions, timeLimit = 15) {
        this.destroy(); // Dừng sạch timer cũ
        this.questions = questions || [];
        this.timeLimit = timeLimit;
        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.state = 'lobby'; // Mặc định ở màn hình chờ!
    }

    // DỪNG HẲN TRÒ CHƠI KHI CHUYỂN TRANG HOẶC RỜI ĐI
    destroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.state = 'lobby';
        this.isAnswered = false;
        this.selectedOption = -1;
    }

    // BẮT ĐẦU CHẠY THỬ THÁCH (Khi thầy cô nhấn nút Bắt đầu)
    startPlaying() {
        if (this.questions.length === 0) {
            alert("Chưa có bộ câu hỏi nào được nạp vào trò chơi!");
            return;
        }
        sound.ensureContext();
        sound.playFanfare();
        this.state = 'playing';
        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.loadCurrentQuestion();
    }

    loadCurrentQuestion() {
        if (this.currentIndex >= this.questions.length) {
            this.finishQuiz();
            return;
        }

        this.isAnswered = false;
        this.selectedOption = -1;
        this.hoveredOption = -1;
        this.timeRemaining = this.timeLimit;

        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            if (this.state !== 'playing' || this.isAnswered) return;
            this.timeRemaining -= 0.1;

            // Nhắc nhịp khi dưới 5 giây
            if (this.timeRemaining <= 5 && Math.floor(this.timeRemaining * 10) % 10 === 0 && this.timeRemaining > 0) {
                sound.playTick();
            }

            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.handleTimeout();
            }
        }, 100);
    }

    handleSelectOption(optionIndex) {
        if (this.isAnswered || this.state !== 'playing') return;
        this.isAnswered = true;
        this.selectedOption = optionIndex;
        if (this.timerInterval) clearInterval(this.timerInterval);

        const currentQ = this.questions[this.currentIndex];
        const isCorrect = (optionIndex === currentQ.correctIndex);

        if (isCorrect) {
            sound.playCorrect();
            this.streak += 1;
            if (this.streak > this.maxStreak) this.maxStreak = this.streak;
            const points = (currentQ.points || 10) + Math.min(20, Math.floor(this.timeRemaining));
            this.score += points;
            this.engine.spawnConfetti(this.engine.width / 2, this.engine.height / 2, 50);
        } else {
            sound.playWrong();
            this.streak = 0;
        }
    }

    handleTimeout() {
        if (this.isAnswered) return;
        this.isAnswered = true;
        this.selectedOption = -1;
        sound.playWrong();
        this.streak = 0;
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    nextQuestion() {
        sound.playClick();
        this.currentIndex++;
        this.loadCurrentQuestion();
    }

    finishQuiz() {
        this.state = 'finished';
        if (this.timerInterval) clearInterval(this.timerInterval);
        sound.playFanfare();
        this.engine.spawnConfetti(this.engine.width / 2, this.engine.height / 3, 100);
        if (this.onQuizComplete) {
            this.onQuizComplete({
                score: this.score,
                total: this.questions.length,
                maxStreak: this.maxStreak
            });
        }
    }

    handleClick(x, y) {
        // 1. Nếu đang ở màn hình chờ (Lobby) -> Bấm nút Bắt đầu
        if (this.state === 'lobby') {
            const btn = this.startBtnRect;
            if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                this.startPlaying();
                return true;
            }
            return false;
        }

        // 2. Nếu đã hoàn thành bài thi -> Bấm chơi lại
        if (this.state === 'finished') {
            const btn = this.replayBtnRect;
            if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                this.startPlaying();
                return true;
            }
            return false;
        }

        // 3. Nếu đang chơi và đã trả lời -> Bấm câu tiếp theo
        if (this.isAnswered) {
            const nextBtn = this.nextButtonRect;
            if (nextBtn && x >= nextBtn.x && x <= nextBtn.x + nextBtn.w && y >= nextBtn.y && y <= nextBtn.y + nextBtn.h) {
                this.nextQuestion();
                return true;
            }
        }

        // 4. Chọn đáp án A B C D
        for (let i = 0; i < this.optionButtons.length; i++) {
            const btn = this.optionButtons[i];
            if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                this.handleSelectOption(i);
                return true;
            }
        }
        return false;
    }

    handleMouseMove(x, y) {
        if (this.state !== 'playing' || this.isAnswered) return;
        let found = -1;
        for (let i = 0; i < this.optionButtons.length; i++) {
            const btn = this.optionButtons[i];
            if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                found = i;
                break;
            }
        }
        if (found !== this.hoveredOption) {
            this.hoveredOption = found;
            if (found !== -1) sound.playTick();
        }
    }

    render(ctx, width, height) {
        ctx.save();

        if (this.state === 'lobby') {
            this.renderLobby(ctx, width, height);
        } else if (this.state === 'finished') {
            this.renderFinished(ctx, width, height);
        } else {
            this.renderPlaying(ctx, width, height);
        }

        ctx.restore();
    }

    // MÀN HÌNH CHỜ (LOBBY) - KHÔNG TỰ CHẠY LIỀN
    renderLobby(ctx, width, height) {
        ctx.textAlign = 'center';

        // Biểu tượng thuyền buồm
        ctx.font = '64px sans-serif';
        ctx.fillText('⛵', width / 2, height / 2 - 110);

        // Tiêu đề
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px -apple-system, sans-serif';
        ctx.fillText('ĐUA THUYỀN TRI THỨC', width / 2, height / 2 - 40);

        // Thông tin bộ đề
        ctx.fillStyle = '#64748b';
        ctx.font = '15px -apple-system, sans-serif';
        ctx.fillText(`Bộ câu hỏi: ${this.questions.length} câu • Thời gian: ${this.timeLimit}s / câu`, width / 2, height / 2 - 5);

        ctx.fillStyle = '#059669';
        ctx.font = 'bold 14px -apple-system, sans-serif';
        ctx.fillText('💡 Thầy cô sẵn sàng? Nhấp nút bên dưới để mở vạch xuất phát cho học sinh!', width / 2, height / 2 + 25);

        // Nút Bắt Đầu Thử Thách
        const btnW = 240;
        const btnH = 50;
        const btnX = width / 2 - btnW / 2;
        const btnY = height / 2 + 65;

        this.startBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 12);
        ctx.fillStyle = '#1d4ed8';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e40af';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px -apple-system, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚀 BẮT ĐẦU THỬ THÁCH', width / 2, btnY + btnH / 2);
    }

    renderPlaying(ctx, width, height) {
        const currentQ = this.questions[this.currentIndex];
        if (!currentQ) return;

        // 1. Header: Câu hỏi, Chuỗi đúng, Điểm
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Câu ${this.currentIndex + 1} / ${this.questions.length}`, 24, 25);

        if (this.streak >= 2) {
            ctx.fillStyle = '#d97706';
            ctx.font = 'bold 15px -apple-system, sans-serif';
            ctx.fillText(`🔥 Chuỗi ${this.streak} liên tiếp!`, 150, 25);
        }

        ctx.textAlign = 'right';
        ctx.fillStyle = '#1d4ed8';
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.fillText(`⭐ ${this.score} điểm`, width - 24, 25);

        // 2. Thanh đếm ngược thời gian
        const barW = width - 48;
        const barH = 10;
        const progress = Math.max(0, this.timeRemaining / this.timeLimit);

        ctx.beginPath();
        ctx.roundRect(24, 55, barW, barH, 5);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(24, 55, barW * progress, barH, 5);
        ctx.fillStyle = this.timeRemaining > 5 ? '#059669' : (this.timeRemaining > 2 ? '#d97706' : '#dc2626');
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 12px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${Math.ceil(this.timeRemaining)}s`, width - 24, 51);

        // 3. Khung nội dung câu hỏi
        const qY = 85;
        const qH = 110;
        ctx.beginPath();
        ctx.roundRect(24, qY, width - 48, qH, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        this.engine.wrapText(currentQ.stem, 44, qY + 20, width - 88, 28, 3);

        // 4. Các lựa chọn A B C D
        this.renderOptions(ctx, width, height, currentQ, qY + qH + 20);

        // 5. Nút Câu tiếp theo
        if (this.isAnswered) {
            const nextY = height - 58;
            const btnW = 180;
            const btnH = 42;
            const btnX = width / 2 - btnW / 2;
            this.nextButtonRect = { x: btnX, y: nextY, w: btnW, h: btnH };

            ctx.beginPath();
            ctx.roundRect(btnX, nextY, btnW, btnH, 10);
            ctx.fillStyle = '#1d4ed8';
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.currentIndex === this.questions.length - 1 ? 'Xem kết quả 🏁' : 'Câu tiếp theo ➜', btnX + btnW / 2, nextY + btnH / 2);
        }
    }

    renderOptions(ctx, width, height, currentQ, startY) {
        this.optionButtons = [];
        const btnW = (width - 48 - 16) / 2;
        const btnH = 68;
        const prefix = ['A', 'B', 'C', 'D'];

        for (let i = 0; i < currentQ.options.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = 24 + col * (btnW + 16);
            const y = startY + row * (btnH + 12);

            this.optionButtons.push({ x, y, w: btnW, h: btnH });

            let bgColor = '#ffffff';
            let borderColor = '#cbd5e1';
            let textColor = '#1e293b';

            if (this.isAnswered) {
                if (i === currentQ.correctIndex) {
                    bgColor = '#dcfce7';
                    borderColor = '#16a34a';
                    textColor = '#15803d';
                } else if (i === this.selectedOption) {
                    bgColor = '#fee2e2';
                    borderColor = '#dc2626';
                    textColor = '#b91c1c';
                } else {
                    bgColor = '#f8fafc';
                    textColor = '#94a3b8';
                }
            } else if (i === this.hoveredOption) {
                bgColor = '#eff6ff';
                borderColor = '#1d4ed8';
            }

            ctx.beginPath();
            ctx.roundRect(x, y, btnW, btnH, 10);
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = borderColor;
            ctx.stroke();

            // Huy hiệu A B C D
            ctx.beginPath();
            ctx.arc(x + 28, y + btnH / 2, 16, 0, Math.PI * 2);
            ctx.fillStyle = (i === currentQ.correctIndex && this.isAnswered) ? '#16a34a' : (i === this.hoveredOption ? '#1d4ed8' : '#e2e8f0');
            ctx.fill();

            ctx.fillStyle = (i === currentQ.correctIndex && this.isAnswered) || (i === this.hoveredOption) ? '#ffffff' : '#334155';
            ctx.font = 'bold 14px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(prefix[i], x + 28, y + btnH / 2);

            // Nội dung đáp án
            ctx.fillStyle = textColor;
            ctx.font = '500 14px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const optText = currentQ.options[i];
            this.engine.wrapText(optText, x + 54, y + btnH / 2 - 8, btnW - 60, 18, 2);
        }
    }

    renderFinished(ctx, width, height) {
        ctx.textAlign = 'center';

        ctx.font = 'bold 30px -apple-system, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('HOÀN THÀNH THỬ THÁCH ĐUA THUYỀN! 🏆', width / 2, height / 2 - 50);

        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.fillStyle = '#1d4ed8';
        ctx.fillText(`Tổng điểm: ${this.score} điểm`, width / 2, height / 2);

        ctx.font = '15px -apple-system, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`Chuỗi trả lời đúng kỷ lục: ${this.maxStreak} câu liên tiếp`, width / 2, height / 2 + 35);

        // Nút Chơi Lại
        const btnW = 180;
        const btnH = 44;
        const btnX = width / 2 - btnW / 2;
        const btnY = height / 2 + 75;

        this.replayBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 10);
        ctx.fillStyle = '#059669';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔄 Chơi Lại Tiết Dạy', width / 2, btnY + btnH / 2);
    }
}
