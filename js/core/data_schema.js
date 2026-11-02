/**
 * EduStudio - Universal Data Schema
 * Chuẩn hóa mô hình dữ liệu dùng chung cho cả Game Sư phạm và Video Ngắn
 */

export const DataSchema = {
    // Cấu trúc một bộ câu hỏi / trò chơi chuẩn
    createQuizPackage(title = "Bộ câu hỏi mới", subject = "Chung", grade = "8") {
        return {
            id: 'quiz_' + Date.now(),
            title: title,
            subject: subject,
            grade: grade,
            createdAt: new Date().toISOString(),
            settings: {
                timePerQuestion: 15, // giây
                shuffleQuestions: true,
                shuffleAnswers: true,
                passScore: 70
            },
            questions: []
        };
    },

    // Cấu trúc một câu hỏi trắc nghiệm chuẩn
    createQuestion(stem = "", options = ["", "", "", ""], correctIndex = 0, explanation = "") {
        return {
            id: 'q_' + Math.random().toString(36).substr(2, 9),
            stem: stem,
            options: options,
            correctIndex: correctIndex, // 0: A, 1: B, 2: C, 3: D
            explanation: explanation,
            points: 10,
            imageUrl: null
        };
    },

    // Danh sách học sinh phục vụ Vòng quay gọi tên
    createStudentRoster(name = "Lớp 8A", students = []) {
        return {
            id: 'roster_' + Date.now(),
            name: name,
            students: students.length > 0 ? students : [
                "Nguyễn Văn An", "Trần Thị Bích", "Lê Hoàng Cường", "Phạm Thu Dung",
                "Hoàng Minh Đức", "Vũ Mai Hoa", "Đặng Tuấn Kiệt", "Bùi Lan Nhi",
                "Đỗ Quốc Phong", "Ngô Thanh Tâm", "Dương Gia Uyên", "Lý Hải Vũ"
            ]
        };
    },

    // Dữ liệu mẫu khởi đầu chuẩn Sư phạm (Bộ đề Hoạt động trải nghiệm / KHTN 8)
    getDefaultSampleQuiz() {
        return {
            id: 'quiz_sample_hdtn8',
            title: 'Trắc nghiệm Khởi động: Tự hào truyền thống quê hương',
            subject: 'Hoạt động trải nghiệm 8',
            grade: '8',
            createdAt: new Date().toISOString(),
            settings: {
                timePerQuestion: 20,
                shuffleQuestions: false,
                shuffleAnswers: false,
                passScore: 80
            },
            questions: [
                {
                    id: 'q_1',
                    stem: 'Biểu hiện nào sau đây thể hiện rõ nhất niềm tự hào về truyền thống quê hương?',
                    options: [
                        'Chỉ tự hào khi quê hương mình giàu có hơn nơi khác',
                        'Tích cực tìm hiểu, giữ gìn và phát huy các nét đẹp văn hóa truyền thống',
                        'Ngại ngùng khi giới thiệu văn hóa quê mình với bạn bè quốc tế',
                        'Cho rằng truyền thống xưa không còn phù hợp với thời đại công nghệ'
                    ],
                    correctIndex: 1,
                    explanation: 'Tự hào truyền thống quê hương phải đi liền với hành động tích cực học tập, tìm hiểu và phát huy giá trị văn hóa tốt đẹp.',
                    points: 10
                },
                {
                    id: 'q_2',
                    stem: 'Khi phát hiện một hành vi làm sai lệch di tích lịch sử tại địa phương, em nên làm gì?',
                    options: [
                        'Làm ngơ vì không phải việc của bản thân',
                        'Quay video giật gân đăng lên mạng xã hội để câu like',
                        'Báo cáo ngay với thầy cô giáo hoặc chính quyền địa phương',
                        'Tụ tập bạn bè đến cãi cọ với người vi phạm'
                    ],
                    correctIndex: 2,
                    explanation: 'Báo cáo kịp thời cho người có trách nhiệm là cách ứng xử văn minh và đúng luật.',
                    points: 10
                },
                {
                    id: 'q_3',
                    stem: 'Phương pháp nào giúp học sinh quản lý thời gian học tập hiệu quả nhất?',
                    options: [
                        'Học thâu đêm suốt sáng trước ngày kiểm tra',
                        'Lập kế hoạch biểu theo ngày/tuần và đặt thứ tự ưu tiên cho từng nhiệm vụ',
                        'Vừa lướt mạng xã hội vừa làm bài tập để đỡ căng thẳng',
                        'Chờ có cảm hứng mới bắt đầu ngồi vào bàn học'
                    ],
                    correctIndex: 1,
                    explanation: 'Lập kế hoạch và ưu tiên công việc theo ma trận Eisenhower giúp tối ưu hiệu suất não bộ.',
                    points: 10
                },
                {
                    id: 'q_4',
                    stem: 'Góc nhìn tích cực trong việc giải quyết mâu thuẫn bạn bè là gì?',
                    options: [
                        'Cắt đứt quan hệ ngay lập tức để không bị tổn thương',
                        'Tìm kiếm cơ hội lắng nghe, hiểu cảm xúc của bạn và cùng tìm giải pháp',
                        'Nhất quyết tranh cãi đến cùng để chứng minh mình luôn đúng',
                        'Nói xấu sau lưng bạn với những người khác'
                    ],
                    correctIndex: 1,
                    explanation: 'Lắng nghe đồng cảm và tìm tiếng nói chung là kỹ năng quản lý cảm xúc cốt lõi.',
                    points: 10
                }
            ]
        };
    }
};

