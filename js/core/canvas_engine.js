/**
 * EduStudio - Unified Canvas Engine
 * Lõi kết xuất đồ họa đa năng, dùng chung cho cả Game Sư phạm & Video Ngắn
 * Hỗ trợ Retina Display (sắc nét 4K), Particle System, Text Wrapper và Frame Grabber
 */

export class CanvasEngine {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.dpr = window.devicePixelRatio || 1;
        this.particles = [];
        this.isRunning = false;
        this.rafId = null;
        this.onRenderCallback = null;

        if (!canvasElement) {
            this.ctx = null;
            this.width = 0;
            this.height = 0;
            return;
        }

        this.ctx = canvasElement.getContext('2d');
        this.width = canvasElement.width;
        this.height = canvasElement.height;

        this.setupDPI();
    }

    setupDPI() {
        if (!this.canvas || !this.ctx) return;
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width || this.canvas.width;
        this.height = rect.height || this.canvas.height;

        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
    }

    resize(w, h) {
        if (!this.canvas || !this.ctx) return;
        this.width = w;
        this.height = h;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
    }

    start(renderCallback) {
        if (!this.canvas || !this.ctx) return;
        this.onRenderCallback = renderCallback;
        if (this.isRunning) return;
        this.isRunning = true;

        const loop = () => {
            if (!this.isRunning) return;
            this.update();
            this.render();
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    stop() {
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    update() {
        // Cập nhật hệ thống hạt pháo hoa / bụi sao
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0.15;
            p.alpha -= p.decay || 0.015;
            p.rotation += p.vRot || 0.05;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render() {
        this.clear();

        // Gọi callback vẽ trò chơi hoặc cảnh video
        if (this.onRenderCallback) {
            this.onRenderCallback(this.ctx, this.width, this.height);
        }

        // Vẽ lớp hạt pháo hoa lên trên cùng
        this.renderParticles();
    }

    // Bắn pháo hoa rực rỡ khi học sinh trả lời đúng hoặc hoàn thành trò chơi
    spawnConfetti(x = this.width / 2, y = this.height / 2, count = 60) {
        const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#fbbf24'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                decay: Math.random() * 0.015 + 0.01,
                gravity: 0.18,
                rotation: Math.random() * Math.PI,
                vRot: (Math.random() - 0.5) * 0.2
            });
        }
    }

    renderParticles() {
        if (this.particles.length === 0) return;
        this.ctx.save();
        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            this.ctx.restore();
        }
        this.ctx.restore();
    }

    // Tiện ích ngắt dòng tự động cho tiếng Việt hiển thị đẹp trên Canvas
    wrapText(text, x, y, maxWidth, lineHeight, maxLines = 4) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        let lineCount = 0;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                this.ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
                lineCount++;
                if (lineCount >= maxLines - 1 && n < words.length - 1) {
                    line += '...';
                    break;
                }
            } else {
                line = testLine;
            }
        }
        this.ctx.fillText(line, x, currentY);
        return currentY + lineHeight;
    }

    // Chụp lại khung hình phục vụ xuất Video MP4 ở Giai đoạn 2
    captureFrameBlob(quality = 0.95) {
        return new Promise(resolve => {
            this.canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
        });
    }

    // Kết nối MediaStream để ghi video Canvas thành MP4/WebM
    captureStream(fps = 30) {
        return this.canvas.captureStream(fps);
    }
}

