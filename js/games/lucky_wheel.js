/**
 * EduStudio - Trò chơi 1: VÒNG QUAY KỲ DIỆU (Lucky Wheel)
 * Chế độ: (1) Gọi tên học sinh ngẫu nhiên, (2) Bốc thăm câu hỏi trắc nghiệm
 * Có cơ chế vật lý quay mượt mà, kim chỉ nhấp nháy, tiếng gõ tick, pháo hoa nổ khi dừng
 */

import { sound } from '../core/audio_engine.js';

export class LuckyWheelGame {
    constructor(engine, onItemSelected) {
        this.engine = engine;
        this.ctx = engine.ctx;
        this.onItemSelected = onItemSelected;

        // Dữ liệu vòng quay
        this.items = [];
        this.colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
            '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
            '#6366f1', '#84cc16', '#e11d48', '#0284c7'
        ];

        // Biến vật lý chuyển động
        this.angle = 0;
        this.angularVelocity = 0;
        this.friction = 0.985;
        this.isSpinning = false;
        this.lastTickIndex = -1;
        this.pointerBounce = 0;

        // Cấu hình hiển thị
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 0;
    }

    setItems(items) {
        this.items = items;
        this.angle = 0;
        this.angularVelocity = 0;
        this.isSpinning = false;
    }

    spin() {
        if (this.isSpinning || this.items.length === 0) return;
        sound.ensureContext();
        sound.playClick();

        this.isSpinning = true;
        // Tốc độ ban đầu ngẫu nhiên lớn từ 0.35 đến 0.55 rad/frame
        this.angularVelocity = Math.random() * 0.25 + 0.35;
    }

    update() {
        if (!this.isSpinning) return;

        this.angle += this.angularVelocity;
        this.angularVelocity *= this.friction;

        // Tính toán vị trí kim chỉ để phát âm thanh 'tick'
        const numItems = this.items.length;
        if (numItems > 0) {
            const arc = (Math.PI * 2) / numItems;
            // Kim chỉ nằm ở đỉnh trên (góc 3*PI/2)
            const normalizedAngle = (Math.PI * 2 - (this.angle % (Math.PI * 2))) % (Math.PI * 2);
            const currentItemIndex = Math.floor(normalizedAngle / arc);

            if (currentItemIndex !== this.lastTickIndex) {
                sound.playTick();
                this.pointerBounce = 8; // Kim nảy
                this.lastTickIndex = currentItemIndex;
            }
        }

        if (this.pointerBounce > 0) {
            this.pointerBounce -= 1;
        }

        // Khi tốc độ giảm về rất nhỏ -> Dừng vòng quay
        if (this.angularVelocity < 0.002) {
            this.angularVelocity = 0;
            this.isSpinning = false;
            this.onStop();
        }
    }

    onStop() {
        const numItems = this.items.length;
        if (numItems === 0) return;

        const arc = (Math.PI * 2) / numItems;
        const normalizedAngle = (Math.PI * 2 - (this.angle % (Math.PI * 2))) % (Math.PI * 2);
        const selectedIndex = Math.floor(normalizedAngle / arc) % numItems;
        const selectedItem = this.items[selectedIndex];

        // Phát âm thanh chiến thắng & pháo hoa
        sound.playFanfare();
        this.engine.spawnConfetti(this.centerX, this.centerY, 80);

        if (this.onItemSelected) {
            this.onItemSelected(selectedItem, selectedIndex);
        }
    }

    render(ctx, width, height) {
        this.centerX = width / 2;
        this.centerY = height / 2;
        this.radius = Math.min(width, height) * 0.42;

        this.update();

        const numItems = this.items.length;
        if (numItems === 0) {
            this.renderEmptyState(ctx);
            return;
        }

        const arc = (Math.PI * 2) / numItems;

        ctx.save();
        ctx.translate(this.centerX, this.centerY);

        // 1. Vẽ bóng đổ vòng quay
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 8, this.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
        ctx.fill();
        ctx.restore();

        // 2. Vẽ viền ngoài sang trọng
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // 3. Vẽ các nan quạt
        ctx.rotate(this.angle);

        for (let i = 0; i < numItems; i++) {
            const startAngle = i * arc;
            const endAngle = startAngle + arc;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, this.radius, startAngle, endAngle);
            ctx.closePath();

            ctx.fillStyle = this.colors[i % this.colors.length];
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Vẽ chữ trên nan quạt
            ctx.save();
            ctx.rotate(startAngle + arc / 2);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 4;

            const text = String(this.items[i]);
            const truncatedText = text.length > 14 ? text.substring(0, 13) + '..' : text;
            ctx.fillText(truncatedText, this.radius - 20, 0);
            ctx.restore();
        }

        ctx.restore(); // Hết xoay vòng

        // 4. Vẽ trục tâm (Center Hub)
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 36, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#4f46e5';
        ctx.fill();
        ctx.restore();

        // 5. Vẽ Kim chỉ (Pointer) ở góc trên đỉnh
        ctx.save();
        ctx.translate(this.centerX, this.centerY - this.radius - 2 + this.pointerBounce);

        ctx.beginPath();
        ctx.moveTo(-16, -24);
        ctx.lineTo(16, -24);
        ctx.lineTo(0, 16);
        ctx.closePath();

        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -18, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
    }

    renderEmptyState(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#64748b';
        ctx.font = '16px -apple-system, sans-serif';
        ctx.fillText('Chưa có dữ liệu vòng quay. Hãy nhập danh sách hoặc chọn đề bài!', this.centerX, this.centerY);
        ctx.restore();
    }
}

