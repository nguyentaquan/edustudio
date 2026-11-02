/**
 * EduStudio - Cốt Móng Xưởng Video Ngắn Sư Phạm (Micro-Video Studio Scaffold)
 * Được thiết kế sẵn sàng cho Giai đoạn 2 theo đúng Tiêu chuẩn GEMINI.md:
 * 1. Tỷ lệ khung hình chuẩn 16:9 Ngang và 9:16 Dọc.
 * 2. Nhân vật Avatar cử động và nhép môi tự động theo sóng âm thanh (Lip-sync).
 * 3. Chữ chạy phát sáng nghệ thuật (Luminous Typography) không hộp nền.
 * 4. Sẵn sàng kết xuất MP4 trực tiếp qua WebCodecs/MediaRecorder.
 */

import { sound } from '../core/audio_engine.js';

export class VideoStudioScaffold {
    constructor(engine) {
        this.engine = engine;
        this.ctx = engine.ctx;

        // Cấu hình video
        this.aspectRatio = '16:9'; // '16:9' hoặc '9:16'
        this.duration = 15; // giây
        this.currentTime = 0;
        this.isPlaying = false;
        this.animationTimer = null;

        // Dữ liệu kịch bản video mẫu
        this.script = {
            title: "Khởi động: Khám phá Thế giới Vi sinh vật",
            hookText: "Bạn có biết trong một giọt nước ao chứa hàng triệu sinh vật kỳ thú?",
            questionText: "Sinh vật nào sau đây có khả năng tự dưỡng quang hợp?",
            avatar: "teacher", // 'teacher', 'student', 'robot'
            audioTrack: null
        };

        // Trạng thái nhân vật
        this.characterMouthOpen = 0;
        this.characterEyeBlink = 0;
        this.blinkTimer = 0;
    }

    setAspectRatio(ratio) {
        this.aspectRatio = ratio;
        if (ratio === '9:16') {
            this.engine.resize(405, 720); // Chuẩn hiển thị dọc di động
        } else {
            this.engine.resize(720, 405); // Chuẩn hiển thị ngang 16:9
        }
    }

    playPreview() {
        sound.ensureContext();
        sound.playClick();
        this.isPlaying = true;
        this.currentTime = 0;

        if (this.animationTimer) clearInterval(this.animationTimer);
        this.animationTimer = setInterval(() => {
            if (!this.isPlaying) return;
            this.currentTime += 0.05;

            // Mô phỏng nhấp nháy mắt tự nhiên của nhân vật
            this.blinkTimer += 0.05;
            if (this.blinkTimer > 3.0) {
                this.characterEyeBlink = 1;
                if (this.blinkTimer > 3.15) {
                    this.characterEyeBlink = 0;
                    this.blinkTimer = 0;
                }
            }

            // Mô phỏng khẩu hình nhép theo âm thanh
            const amp = sound.getAudioAmplitude();
            this.characterMouthOpen = amp > 0.05 ? amp * 2.5 : Math.sin(this.currentTime * 12) * 0.5 + 0.5;

            if (this.currentTime >= this.duration) {
                this.currentTime = this.duration;
                this.pausePreview();
            }
        }, 50);
    }

    pausePreview() {
        this.isPlaying = false;
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
    }

    render(ctx, width, height) {
        ctx.save();

        // 1. Vẽ Hậu cảnh Điện ảnh Sư phạm (Gradient màu nền sâu thẳm, không lòe loẹt)
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#0f172a'); // Xanh đen sâu
        bgGradient.addColorStop(0.6, '#1e293b');
        bgGradient.addColorStop(1, '#0f766e'); // Xanh ngọc tối thanh lịch
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // 2. Vẽ Hào quang ánh sáng sân khấu (Subtle Spotlight Glow)
        const radial = ctx.createRadialGradient(width / 2, height * 0.4, 30, width / 2, height * 0.4, width * 0.6);
        radial.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
        radial.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, width, height);

        // 3. Vẽ Nhân vật Diễn thuyết (Avatar Cốt móng)
        this.renderCharacterAvatar(ctx, width, height);

        // 4. Vẽ Phụ đề Lời thoại Nghệ thuật Phát sáng (Chuẩn GEMINI.md: No Fill Bounding Box, Luminous Glow)
        this.renderLuminousTypography(ctx, width, height);

        // 5. Thanh hiển thị tiến độ thời gian Timeline ở đáy
        this.renderTimelineBar(ctx, width, height);

        ctx.restore();
    }

    renderCharacterAvatar(ctx, width, height) {
        const charX = width * 0.5;
        const charY = height * 0.55;
        const charScale = Math.min(width, height) * 0.0022;

        ctx.save();
        ctx.translate(charX, charY);
        ctx.scale(charScale, charScale);

        // Thân áo sơ mi trắng lịch lãm chuẩn Thầy Quan
        ctx.beginPath();
        ctx.ellipse(0, 110, 65, 80, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#cbd5e1';
        ctx.stroke();

        // Cổ áo sơ mi & caravat thanh lịch
        ctx.beginPath();
        ctx.moveTo(-20, 45);
        ctx.lineTo(0, 75);
        ctx.lineTo(20, 45);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

        // Khuôn mặt
        ctx.beginPath();
        ctx.ellipse(0, 0, 48, 55, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fed7aa'; // Màu da ấm tự nhiên
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#f97316';
        ctx.stroke();

        // Mái tóc gọn gàng sư phạm
        ctx.beginPath();
        ctx.arc(0, -18, 48, Math.PI, Math.PI * 2);
        ctx.lineTo(48, -5);
        ctx.quadraticCurveTo(0, -35, -48, -5);
        ctx.closePath();
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Đôi mắt thông minh
        const eyeY = -6;
        if (this.characterEyeBlink === 1) {
            // Mắt nhắm
            ctx.beginPath();
            ctx.moveTo(-24, eyeY);
            ctx.lineTo(-12, eyeY);
            ctx.moveTo(12, eyeY);
            ctx.lineTo(24, eyeY);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#0f172a';
            ctx.stroke();
        } else {
            // Mắt mở sáng
            ctx.beginPath();
            ctx.arc(-18, eyeY, 5, 0, Math.PI * 2);
            ctx.arc(18, eyeY, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();

            // Đốm sáng phản chiếu trong mắt
            ctx.beginPath();
            ctx.arc(-16, eyeY - 2, 2, 0, Math.PI * 2);
            ctx.arc(20, eyeY - 2, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        // Khẩu hình nhép miệng (Lip-Sync tự động uốn theo âm thanh)
        const mouthY = 22;
        const mouthOpen = Math.min(18, Math.max(2, this.characterMouthOpen * 16));

        ctx.beginPath();
        ctx.ellipse(0, mouthY, 14, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#991b1b';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e11d48';
        ctx.stroke();

        // Hàm răng trên đều tăm tắp khi mở miệng nói
        if (mouthOpen > 6) {
            ctx.beginPath();
            ctx.rect(-8, mouthY - mouthOpen + 1, 16, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        ctx.restore();
    }

    renderLuminousTypography(ctx, width, height) {
        // Phụ đề hiển thị ở 1/3 phía trên hoặc phía dưới
        const subY = height * 0.18;
        const currentText = this.currentTime < 5 ? this.script.hookText : this.script.questionText;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Font chữ nghệ thuật nghiêng thanh lịch (Times New Roman Bold Italic)
        ctx.font = 'italic bold 20px "Times New Roman", Georgia, serif';

        // Lớp 1: Hào quang phát sáng mềm phía sau (Luminous Outer Glow)
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#fffa78'; // Vàng kim sáng rực rỡ chuẩn GEMINI.md

        // Tuyệt đối KHÔNG vẽ bounding box / hộp nền tối phía sau!
        this.engine.wrapText(currentText, width / 2, subY, width * 0.85, 30, 2);

        ctx.restore();
    }

    renderTimelineBar(ctx, width, height) {
        const barY = height - 12;
        const progress = Math.min(1, this.currentTime / this.duration);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, barY, width, 12);

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, barY, width * progress, 12);
    }
}

