/**
 * EduStudio - Trò chơi 4: ĐOÁN CON VẬT & ĐỒ VẬT (Dành cho Mầm Non & Tiểu Học)
 * Phù hợp với lứa tuổi mầm non: Trực quan, âm thanh vui nhộn, hình ảnh sinh động,
 * hiệu ứng lật mở bí mật từng góc ảnh hoặc đoán qua bóng mờ.
 */

import { sound } from '../core/audio_engine.js';

export class GuessObjectGame {
    constructor(engine, onComplete) {
        this.engine = engine;
        this.ctx = engine.ctx;
        this.onComplete = onComplete;

        this.items = [];
        this.currentIndex = 0;
        this.score = 0;
        this.state = 'lobby'; // 'lobby', 'playing', 'revealed', 'finished'
        this.revealedClues = 0; // Số mảnh ghép đã lật mở

        this.startBtnRect = null;
        this.nextBtnRect = null;
        this.optionButtons = [];
        this.hoveredOption = -1;
    }

    setItems(items) {
        this.destroy();
        this.items = items || [];
        this.currentIndex = 0;
        this.score = 0;
        this.state = 'lobby';
    }

    destroy() {
        this.state = 'lobby';
    }

    startPlaying() {
        if (this.items.length === 0) {
            alert("Chưa có câu đố hình ảnh nào cho Mầm Non!");
            return;
        }
        sound.ensureContext();
        sound.playFanfare();
        this.state = 'playing';
        this.currentIndex = 0;
        this.score = 0;
        this.loadCurrentItem();
    }

    loadCurrentItem() {
        if (this.currentIndex >= this.items.length) {
            this.state = 'finished';
            sound.playFanfare();
            this.engine.spawnConfetti(this.engine.width / 2, this.engine.height / 3, 80);
            return;
        }
        this.state = 'playing';
        this.revealedClues = 1; // Ban đầu hé mở 1 phần
    }

    handleSelectOption(idx) {
        if (this.state !== 'playing') return;
        const currentItem = this.items[this.currentIndex];
        const isCorrect = (idx === currentItem.correctIndex);

        if (isCorrect) {
            sound.playCorrect();
            this.score += 10;
            this.state = 'revealed';
            this.revealedClues = 4; // Mở trọn vẹn bức tranh
            this.engine.spawnConfetti(this.engine.width / 2, this.engine.height / 2, 60);
        } else {
            sound.playWrong();
            // Mở thêm một góc gợi ý cho các bé
            if (this.revealedClues < 3) this.revealedClues++;
        }
    }

    handleClick(x, y) {
        if (this.state === 'lobby') {
            const btn = this.startBtnRect;
            if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                this.startPlaying();
                return true;
            }
            return false;
        }

        if (this.state === 'finished') {
            const btn = this.startBtnRect;
            if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                this.startPlaying();
                return true;
            }
            return false;
        }

        if (this.state === 'revealed') {
            const btn = this.nextBtnRect;
            if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                sound.playClick();
                this.currentIndex++;
                this.loadCurrentItem();
                return true;
            }
        }

        // Bấm chọn đáp án
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
        if (this.state !== 'playing') return;
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
            this.renderGame(ctx, width, height);
        }
        ctx.restore();
    }

    renderLobby(ctx, width, height) {
        ctx.textAlign = 'center';
        ctx.font = '68px sans-serif';
        ctx.fillText('🐶 🚗 🍎', width / 2, height / 2 - 110);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px -apple-system, sans-serif';
        ctx.fillText('ĐOÁN CON VẬT & ĐỒ VẬT', width / 2, height / 2 - 35);

        ctx.fillStyle = '#059669';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.fillText('🎨 Dành cho lứa tuổi Mầm Non & Lớp 1: Bé khám phá thế giới xung quanh qua hình ảnh!', width / 2, height / 2 + 5);

        const btnW = 240;
        const btnH = 50;
        const btnX = width / 2 - btnW / 2;
        const btnY = height / 2 + 55;
        this.startBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 12);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px -apple-system, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎈 BẮT ĐẦU CHƠI CÙNG BÉ', width / 2, btnY + btnH / 2);
    }

    renderGame(ctx, width, height) {
        const item = this.items[this.currentIndex];
        if (!item) return;

        // Tiêu đề câu hỏi
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px -apple-system, sans-serif';
        ctx.fillText(`Câu ${this.currentIndex + 1} / ${this.items.length}: ${item.stem}`, 30, 30);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 16px -apple-system, sans-serif';
        ctx.fillText(`⭐ ${this.score} điểm`, width - 30, 30);

        // Khung hiển thị tranh / con vật / đồ vật ở trung tâm
        const boxSize = 220;
        const boxX = width / 2 - boxSize / 2;
        const boxY = 60;

        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxSize, boxSize, 16);
        ctx.fillStyle = '#fef3c7';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        // Nếu có ảnh base64 hoặc URL
        if (item.imageUrl && item.imageElement && item.imageElement.complete) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(boxX + 6, boxY + 6, boxSize - 12, boxSize - 12, 12);
            ctx.clip();
            ctx.drawImage(item.imageElement, boxX + 6, boxY + 6, boxSize - 12, boxSize - 12);
            ctx.restore();
        } else {
            // Biểu tượng tranh vẽ sinh động đại diện cho con vật / đồ vật
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '84px sans-serif';
            const fallbackEmoji = item.emoji || '🐱';
            ctx.fillText(fallbackEmoji, width / 2, boxY + boxSize / 2);
        }

        // Lưới đáp án to rõ ràng cho các bé mầm non dễ bấm
        this.renderOptionsGrid(ctx, width, height, item, boxY + boxSize + 25);

        // Nút Câu tiếp theo khi đã đoán đúng
        if (this.state === 'revealed') {
            const btnW = 200;
            const btnH = 44;
            const btnX = width / 2 - btnW / 2;
            const btnY = height - 55;
            this.nextBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

            ctx.beginPath();
            ctx.roundRect(btnX, btnY, btnW, btnH, 10);
            ctx.fillStyle = '#059669';
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.currentIndex === this.items.length - 1 ? 'Xem kết quả 🏁' : 'Bé Đoán Tiếp Nào ➜', width / 2, btnY + btnH / 2);
        }
    }

    renderOptionsGrid(ctx, width, height, item, startY) {
        this.optionButtons = [];
        const btnW = (width - 60 - 16) / 2;
        const btnH = 64;
        const prefix = ['A', 'B', 'C', 'D'];

        for (let i = 0; i < item.options.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = 30 + col * (btnW + 16);
            const y = startY + row * (btnH + 12);

            this.optionButtons.push({ x, y, w: btnW, h: btnH });

            let bg = '#ffffff';
            let border = '#cbd5e1';
            let color = '#0f172a';

            if (this.state === 'revealed') {
                if (i === item.correctIndex) {
                    bg = '#d1fae5';
                    border = '#059669';
                    color = '#065f46';
                }
            } else if (i === this.hoveredOption) {
                bg = '#fef3c7';
                border = '#f59e0b';
            }

            ctx.beginPath();
            ctx.roundRect(x, y, btnW, btnH, 12);
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = border;
            ctx.stroke();

            // Ký tự A, B, C, D
            ctx.beginPath();
            ctx.arc(x + 28, y + btnH / 2, 16, 0, Math.PI * 2);
            ctx.fillStyle = (i === item.correctIndex && this.state === 'revealed') ? '#059669' : '#f59e0b';
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(prefix[i], x + 28, y + btnH / 2);

            // Nội dung con vật / đồ vật
            ctx.fillStyle = color;
            ctx.font = 'bold 16px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.options[i], x + 56, y + btnH / 2);
        }
    }

    renderFinished(ctx, width, height) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px -apple-system, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('BÉ ĐÃ HOÀN THÀNH XUẤT SẮC! 🌟', width / 2, height / 2 - 40);

        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`Bé đạt được: ${this.score} điểm ⭐`, width / 2, height / 2 + 5);

        const btnW = 200;
        const btnH = 46;
        const btnX = width / 2 - btnW / 2;
        const btnY = height / 2 + 55;
        this.startBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 12);
        ctx.fillStyle = '#059669';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔄 Chơi Lại Cùng Bé', width / 2, btnY + btnH / 2);
    }
}

