/**
 * EduStudio - Trình phân tích & Nhập liệu Câu hỏi Thông minh (Question Importer)
 * Tự động đọc và bóc tách đề thi từ Word/Text mà thầy cô copy/paste vào
 * Nhận diện câu hỏi, các đáp án A B C D và đáp án đúng
 */

import { DataSchema } from '../core/data_schema.js';

export class QuestionImporter {
    /**
     * Bóc tách văn bản thô thành danh sách câu hỏi chuẩn
     * @param {string} rawText Văn bản đề thi giáo viên dán vào
     */
    static parseRawText(rawText) {
        if (!rawText || !rawText.trim()) return [];

        const questions = [];
        // Tách các câu dựa theo "Câu 1:", "Câu 2.", "1.", "2/"...
        const questionBlocks = rawText.split(/(?:^|\n)(?=(?:Câu\s*\d+[\.:\)]|\d+[\.:\)]))/i);

        for (const block of questionBlocks) {
            const trimmed = block.trim();
            if (!trimmed) continue;

            const parsed = this.parseSingleQuestionBlock(trimmed);
            if (parsed && parsed.options.length >= 2) {
                questions.push(parsed);
            }
        }

        // Nếu không tách được theo block câu hỏi, thử phân tích từng dòng
        if (questions.length === 0) {
            return this.parseFallbackLines(rawText);
        }

        return questions;
    }

    static parseSingleQuestionBlock(block) {
        // Tìm dòng đầu tiên hoặc phần trước A. B. C. D. làm câu dẫn
        const optionRegex = /(?:^|\n|\s{2,})([A-D])[\.\:\)]\s*/g;
        const matches = [...block.matchAll(optionRegex)];

        if (matches.length < 2) return null;

        // Câu dẫn nằm từ đầu đến vị trí lựa chọn đầu tiên
        const firstOptionIndex = matches[0].index;
        let stem = block.substring(0, firstOptionIndex).trim();
        // Xóa tiền tố "Câu 1:", "1."
        stem = stem.replace(/^(?:Câu\s*\d+[\.:\)]|\d+[\.:\)])\s*/i, '').trim();

        const options = [];
        let correctIndex = 0;

        for (let i = 0; i < matches.length; i++) {
            const currentMatch = matches[i];
            const start = currentMatch.index + currentMatch[0].length;
            const end = (i < matches.length - 1) ? matches[i + 1].index : block.length;

            let optText = block.substring(start, end).trim();

            // Kiểm tra xem đáp án có được đánh dấu đúng bằng dấu * hoặc [x]
            if (optText.startsWith('*') || optText.startsWith('✓') || optText.endsWith('*')) {
                correctIndex = i;
                optText = optText.replace(/^[\*✓]\s*/, '').replace(/\s*\*$/, '').trim();
            }

            // Kiểm tra phần "Đáp án: X" ở cuối câu
            const answerMatch = optText.match(/(?:Đáp án|ĐA|Answer)[\:\s]+([A-D])/i);
            if (answerMatch) {
                const char = answerMatch[1].toUpperCase();
                correctIndex = char.charCodeAt(0) - 65;
                optText = optText.substring(0, answerMatch.index).trim();
            }

            // Làm sạch xuống dòng trong đáp án
            optText = optText.replace(/\n+/g, ' ');
            options.push(optText);
        }

        return DataSchema.createQuestion(stem, options, correctIndex);
    }

    static parseFallbackLines(rawText) {
        // Trường hợp giáo viên nhập mỗi dòng 1 câu hỏi hoặc danh sách ngắn
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const questions = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length > 5) {
                questions.push(DataSchema.createQuestion(
                    line,
                    ['Đúng', 'Sai'],
                    0
                ));
            }
        }
        return questions;
    }
}

