/**
 * EduStudio - Trò chơi 2: HỘP QUÀ BÍ MẬT / MẢNH GHÉP TRI THỨC (Mystery Box)
 * Học sinh chọn hộp quà để mở câu hỏi thử thách.
 * Trả lời đúng sẽ mở khóa phần thưởng hoặc hé lộ một góc của bức tranh bí ẩn đằng sau!
 */

import { sound } from '../core/audio_engine.js';

export class MysteryBoxGame {
    constructor(engine, onBoxSelected) {
        this.engine = engine;
        this.ctx = engine.ctx;
        this.onBoxSelected = onBoxSelected;

        this.boxes = [];
        this.hoveredIndex = -1;
        this.numCols = 3;
        this.numRows = 2;

        this.colors = [
            { bg: '#3b82f6', ribbon: '#fbbf24', text: '#ffffff' }, // Xanh dương - Vàng
            { bg: '#10b981', ribbon: '#f43f5e', text: '#ffffff' }, // Ngọc bích - Hồng
            { bg: '#f59e0b', ribbon: '#3b82f6', text: '#ffffff' }, // Vàng cam - Xanh
            { bg: '#8b5cf6', ribbon: '#34d399', text: '#ffffff' }, // Tím - Xanh lá
            { bg: '#ec4899', ribbon: '#facc15', text: '#ffffff' }, // Hồng sen - Vàng
            { bg: '#06b6d4', ribbon: '#fb7185', text: '#ffffff' }, // Cyan - Đỏ cam
        ];
    }

    setupBoxes(questions) {
        const count = questions.length || 6;
        this.numCols = count <= 4 ? 2 : (count <= 6 ? 3 : 4);
        this.numRows = Math.ceil(count / this.numCols);

        this.boxes = [];
        for (let i = 0; i < count; i++) {
            this.boxes.push({
                id: i + 1,
                question: questions[i] || null,
                isOpened: false,
                isCorrect: false,
                scale: 1.0,
                targetScale: 1.0,
                colorScheme: this.colors[i % this.colors.length]
            });
        }
    }

    handleClick(x, y) {
        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            if (!box.isOpened && this.isPointInside(x, y, box.rect)) {
                sound.playClick();
                box.targetScale = 1.1;
                setTimeout(() => box.targetScale = 1.0, 150);
                if (this.onBoxSelected) {
                    this.onBoxSelected(box, i);
                }
                return true;
            }
        }
        return false;
    }

    handleMouseMove(x, y) {
        let found = -1;
        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            if (!box.isOpened && box.rect && this.isPointInside(x, y, box.rect)) {
                found = i;
                break;
            }
        }
        if (found !== this.hoveredIndex) {
            this.hoveredIndex = found;
            if (found !== -1) sound.playTick();
        }
    }

    isPointInside(px, py, rect) {
        if (!rect) return false;
        return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
    }

    markBoxSolved(index, isCorrect = true) {
        if (this.boxes[index]) {
            this.boxes[index].isOpened = true;
            this.boxes[index].isCorrect = isCorrect;
            if (isCorrect) {
                sound.playCorrect();
                const r = this.boxes[index].rect;
                if (r) {
                    this.engine.spawnConfetti(r.x + r.w / 2, r.y + r.h / 2, 40);
                }
            } else {
                sound.playWrong();
            }
        }
    }

    render(ctx, width, height) {
        const padding = 24;
        const topMargin = 30;
        const availableW = width - padding * 2;
        const availableH = height - topMargin - padding;

        const boxW = Math.min(180, (availableW - (this.numCols - 1) * 20) / this.numCols);
        const boxH = Math.min(140, (availableH - (this.numRows - 1) * 20) / this.numRows);

        const totalGridW = this.numCols * boxW + (this.numCols - 1) * 20;
        const totalGridH = this.numRows * boxH + (this.numRows - 1) * 20;

        const startX = (width - totalGridW) / 2;
        const startY = topMargin + (availableH - totalGridH) / 2;

        ctx.save();

        for (let i = 0; i < this.boxes.length; i++) {
            const col = i % this.numCols;
            const row = Math.floor(i / this.numCols);

            const x = startX + col * (boxW + 20);
            const y = startY + row * (boxH + 20);

            const box = this.boxes[i];
            box.rect = { x, y, w: boxW, h: boxH };

            const isHover = (i === this.hoveredIndex && !box.isOpened);
            const scale = isHover ? 1.04 : 1.0;

            ctx.save();
            ctx.translate(x + boxW / 2, y + boxH / 2);
            ctx.scale(scale, scale);

            if (box.isOpened) {
                // Hộp đã mở
                this.renderOpenedBox(ctx, -boxW / 2, -boxH / 2, boxW, boxH, box);
            } else {
                // Hộp quà đóng nơ sang trọng
                this.renderGiftBox(ctx, -boxW / 2, -boxH / 2, boxW, boxH, box, isHover);
            }

            ctx.restore();
        }

        ctx.restore();
    }

    renderGiftBox(ctx, x, y, w, h, box, isHover) {
        const radius = 12;
        const scheme = box.colorScheme;

        // Bóng đổ
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y + 6, w, h, radius);
        ctx.fillStyle = isHover ? 'rgba(15, 23, 42, 0.25)' : 'rgba(15, 23, 42, 0.12)';
        ctx.fill();
        ctx.restore();

        // Thân hộp quà
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fillStyle = scheme.bg;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Dải ruy băng dọc
        const ribbonW = w * 0.22;
        ctx.fillStyle = scheme.ribbon;
        ctx.fillRect(x + (w - ribbonW) / 2, y, ribbonW, h);

        // Dải ruy băng ngang
        const ribbonH = h * 0.20;
        ctx.fillRect(x, y + (h - ribbonH) / 2, w, ribbonH);

        // Nút nơ ở giữa hộp quà
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = scheme.ribbon;
        ctx.stroke();

        // Số thứ tự hộp quà
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px -apple-system, sans-serif';
        ctx.fillText(String(box.id), x + w / 2, y + h / 2);
    }

    renderOpenedBox(ctx, x, y, w, h, box) {
        const radius = 12;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fillStyle = box.isCorrect ? '#dcfce7' : '#fee2e2';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = box.isCorrect ? '#16a34a' : '#dc2626';
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 28px -apple-system, sans-serif';
        ctx.fillText(box.isCorrect ? '⭐' : '❌', x + w / 2, y + h / 2 - 10);

        ctx.fillStyle = box.isCorrect ? '#15803d' : '#b91c1c';
        ctx.font = 'bold 14px -apple-system, sans-serif';
        ctx.fillText(box.isCorrect ? 'ĐÃ HOÀN THÀNH' : 'CHƯA CHÍNH XÁC', x + w / 2, y + h / 2 + 22);
    }
}

