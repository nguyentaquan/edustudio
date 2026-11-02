/**
 * EduStudio - Audio Engine (Web Audio API Synthesizer)
 * Tự động tổng hợp âm thanh hiệu ứng (SFX) không cần tải file ngoài
 * Có sẵn AnalyserNode phục vụ đo biên độ sóng âm cho Lip-sync Giai đoạn 2
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.isMuted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;
            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio API not supported:", e);
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(mute) {
        this.isMuted = mute;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    // Âm thanh click / chọn nhẹ nhàng
    playClick() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    // Tiếng tích tắc vòng quay / kim đồng hồ
    playTick() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.03);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
    }

    // Âm thanh trả lời Đúng (Chuông ngân vui tươi)
    playCorrect() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // Đô - Mi - Sol - Đố (Major Arpeggio)

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0.2, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.4);
        });
    }

    // Âm thanh trả lời Sai (Trầm, nhẹ nhàng để động viên, không gây ức chế sư phạm)
    playWrong() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now); // La thấp
        osc.frequency.linearRampToValueAtTime(160, now + 0.3);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    // Âm thanh Chiến thắng / Pháo hoa kết thúc bài học (Fanfare)
    playFanfare() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const chordNotes = [
            { f: 523.25, t: 0.0 }, // C5
            { f: 659.25, t: 0.1 }, // E5
            { f: 783.99, t: 0.2 }, // G5
            { f: 1046.50, t: 0.35, len: 0.8 } // C6
        ];

        chordNotes.forEach(item => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(item.f, now + item.t);

            const duration = item.len || 0.3;
            gain.gain.setValueAtTime(0.25, now + item.t);
            gain.gain.exponentialRampToValueAtTime(0.001, now + item.t + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + item.t);
            osc.stop(now + item.t + duration);
        });
    }

    // Lấy cường độ âm thanh thời gian thực (phục vụ Lip-sync & Visualizer sóng nhạc)
    getAudioAmplitude() {
        if (!this.analyser) return 0;
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        return sum / dataArray.length / 255; // Giá trị chuẩn hóa từ 0.0 đến 1.0
    }
}

export const sound = new AudioEngine();

