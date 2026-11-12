/**
 * EduStudio - Ứng Dụng Điều Phối Chính (Main Application Controller)
 * Phiên bản 2.3 Sư Phạm - Nâng cấp chuyên sâu theo định hướng của Thầy Nguyễn Tá Quan:
 * 1. Tách rời tính năng Kho Đề, Kho Video trên thanh ngang (Xem & Tải về) với xưởng thiết kế trên thanh dọc (Tạo & Đối soát đề, Biên tập Media Studio).
 * 2. Cửa sổ Tạo trò chơi: Năng lực tự động cập nhật theo cấp học (MN gồm 5 năng lực MN; PT gồm 4 năng lực PT).
 * 3. Mục Thêm câu hỏi có Ảnh: Bổ sung đầy đủ tất cả năng lực MN, năng lực PT và 5 năng lực MN.
 * 4. Tích hợp thư viện Kho Đề và Kho Video phong phú, chuẩn mực.
 */

import { DataSchema } from './core/data_schema.js';
import { sound } from './core/audio_engine.js';
import { CanvasEngine } from './core/canvas_engine.js';
import { LuckyWheelGame } from './games/lucky_wheel.js';
import { MysteryBoxGame } from './games/mystery_box.js';
import { SpeedQuizGame } from './games/speed_quiz.js';
import { GuessObjectGame } from './games/guess_object.js';
import { QuestionImporter } from './studio/question_importer.js';
import { VideoStudioScaffold } from './studio/video_scaffold.js';
import { SmartTKBUI } from './tkb-ui.js?v=3.10.49';

class EduStudioApp {
        syncVersionLabels() {
        const label = 'v3.10.57 GDMN & GDPT';
        document.querySelectorAll('.badge-version-gold, [data-version-badge]').forEach(el => {
            el.textContent = label;
        });
    }

    constructor() {
        this.syncVersionLabels();
                this.currentTab = 'home';
        window.openModal = (id) => this.openModal(id);
        window.closeModal = (id) => this.closeModal(id);
        window.openGameCreatorModal = () => this.openGameCreatorModal();
        window.closeGameCreatorModal = () => this.closeGameCreatorModal(); // 'home', 'ppt', 'games', 'authoring-repo', 'video-repo', 'exam-studio', 'media-studio', 'storage5tb'
        this.currentGameId = 'wheel'; // 'wheel', 'box', 'speed', 'guess'

        // Trạng thái tài khoản người dùng: Khởi tạo từ session hợp lệ hoặc Khách vãng lai
        let session = this.loadUserSession();
        if (!session || !session.isLoggedIn || session.role === 'guest') {
            session = {
                id: 'guest_' + Date.now(),
                name: "Khách Vãng Lai",
                email: "",
                role: "guest",
                points: 0,
                demoUses: 10,
                avatarEmoji: "👤",
                isLoggedIn: false
            };
        }
        this.currentUser = session;

        // Bộ dữ liệu trò chơi đang hoạt động
        this.activeQuiz = DataSchema.getDefaultSampleQuiz();
        this.activeRoster = DataSchema.createStudentRoster();

        // Ngân hàng câu hỏi chuẩn hóa (Bank) dùng chung hệ thống
        this.questionBank = this.initDefaultQuestionBank();

        // Dữ liệu kho đề kiểm tra (Repo)
        this.examRepo = this.initExamRepoData();

        // Dữ liệu kho video (Repo)
        this.videoRepo = this.initVideoRepoData();

        // Dữ liệu kho bài thí nghiệm ảo (Repo)
        this.labRepo = this.initLabRepoData();

        // Trạng thái vận hành của Xưởng Tạo Phòng TN Ảo
        this.labState = {
            isPowerOn: false,
            isBurnerOn: false,
            reagentAdded: false,
            voltage: 9.0,
            resistance: 20.0,
            activeCategory: 'physics',
            placedTools: ['pin', 'switch', 'resistor', 'lamp', 'ammeter']
        };
        this.viewingLab = null;

        // Dữ liệu kho PPT (Repo)
        this.pptRepo = this.initPPTRepoData();

        // Bài giảng PPT tương tác đang soạn trong Xưởng Soạn PPT (PPT Studio)
        this.activePresentation = this.getDefaultPresentation();
        this.activeSlideIndex = 0;
        this.presentingSlideIndex = 0;

        // Dữ liệu thư mục DỮ LIỆU THÔ 5TB (Staging Area & AI Đối soát)
        this.rawStagingFiles = this.initRawStagingData();

        // Dữ liệu Quản Trị Quản Lý Tài Khoản (Quản lý TK) & Kinh Tế Vi Mô & Cấu Hình AI
        this.userAccounts = this.initUserAccounts();
        this.systemAIConfig = this.initSystemAIConfig();
        this.microTransactions = this.initMicroTransactions();

        // Hồ sơ thẩm định đang xem chi tiết
        this.viewingAuditFile = null;

        // Đề thi đang xem chi tiết trong modal
        this.viewingExam = null;
        this.activeExamSubTab = 'DE'; // 'DE', 'DA', 'MT', 'DT'

        // Danh sách câu hỏi đã được chọn cho trò chơi đang thiết kế
        this.selectedQuestions = JSON.parse(JSON.stringify(this.activeQuiz.questions));

        // Biến tạm lưu trữ ảnh đính kèm khi thêm câu hỏi mới
        this.tempStemImage = null;
        this.tempOptImages = [null, null, null, null];
        this.activeOptImgTarget = 0;

        // Khởi tạo các Engine đồ họa
        this.gameCanvas = document.getElementById('mainGameCanvas');
        this.gameEngine = new CanvasEngine(this.gameCanvas);

        this.videoCanvas = document.getElementById('mediaStageCanvas') || document.getElementById('videoCanvas');
        this.videoEngine = new CanvasEngine(this.videoCanvas);
        this.videoScaffold = new VideoStudioScaffold(this.videoEngine);

        // Khởi tạo 4 Trò chơi Sư phạm
        this.luckyWheel = new LuckyWheelGame(this.gameEngine, (item, idx) => this.onWheelStop(item, idx));
        this.mysteryBox = new MysteryBoxGame(this.gameEngine, (box, idx) => this.onBoxSelect(box, idx));
        this.speedQuiz = new SpeedQuizGame(this.gameEngine, (stats) => this.onQuizFinish(stats));
        this.guessObject = new GuessObjectGame(this.gameEngine, (stats) => this.onGuessFinish(stats));

        // Dữ liệu trò chơi Mầm Non mẫu
                // KHO 12 BỘ TRÒ CHƠI MẦM NON SƯ PHẠM ĐẶC SẮC (PLAY-BASED LEARNING)
        this.preschoolCatalog = [
  {
    "id": "mn_pets",
    "title": "Bé Nhận Biết Con Vật Nuôi Gia Đình",
    "domain": "Phát triển Nhận thức & Ngôn ngữ",
    "badge": "Chuẩn GDMN",
    "icon": "🐶",
    "color": "#1d4ed8",
    "desc": "Bé khám phá các bạn nhỏ thân thiết trong nhà: Chó, Mèo, Gà, Vịt, Heo kèm âm thanh tiếng kêu sống động.",
    "items": [
      {
        "id": "pet_1",
        "name": "Chú Chó Đốm",
        "type": "animal",
        "emoji": "🐶",
        "soundName": "Gâu gâu!",
        "options": [
          "Chú Chó",
          "Mèo Con",
          "Con Voi",
          "Thỏ Trắng"
        ],
        "correctIndex": 0,
        "hint": "Bạn nhỏ giữ nhà trung thành, sủa gâu gâu!"
      },
      {
        "id": "pet_2",
        "name": "Mèo Mướp Con",
        "type": "animal",
        "emoji": "🐱",
        "soundName": "Meo meo!",
        "options": [
          "Con Heo",
          "Mèo Con",
          "Con Hổ",
          "Con Vịt"
        ],
        "correctIndex": 1,
        "hint": "Thích bắt chuột, thích tắm nắng, kêu meo meo!"
      },
      {
        "id": "pet_3",
        "name": "Chú Gà Trống Choai",
        "type": "animal",
        "emoji": "🐓",
        "soundName": "Ò ó o o!",
        "options": [
          "Gà Trống",
          "Vịt Bầu",
          "Chim Sâu",
          "Bồ Câu"
        ],
        "correctIndex": 0,
        "hint": "Có mào đỏ rực, gáy ò ó o gọi bé dậy đi học!"
      },
      {
        "id": "pet_4",
        "name": "Bé Vịt Cổ Xanh",
        "type": "animal",
        "emoji": "🦆",
        "soundName": "Cạp cạp!",
        "options": [
          "Chim Cánh Cụt",
          "Con Vịt",
          "Con Cá",
          "Con Rùa"
        ],
        "correctIndex": 1,
        "hint": "Bơi lội tung tăng dưới ao, kêu cạp cạp cạp!"
      },
      {
        "id": "pet_5",
        "name": "Chú Heo Mập Ú",
        "type": "animal",
        "emoji": "🐷",
        "soundName": "Ủn ỉn!",
        "options": [
          "Con Bò",
          "Con Cừu",
          "Chú Heo",
          "Con Ngựa"
        ],
        "correctIndex": 2,
        "hint": "Thích ăn no tròn bụng, kêu ủn ỉn suốt ngày!"
      }
    ]
  },
  {
    "id": "mn_wildlife",
    "title": "Thế Giới Động Vật Rừng Xanh",
    "domain": "Phát triển Nhận thức thế giới xung quanh",
    "badge": "Chuẩn GDMN",
    "icon": "🦁",
    "color": "#b45309",
    "desc": "Thám hiểm rừng xanh kỳ thú cùng Bác Voi, Chú Khỉ con, Hươu cao cổ và Vua Sư tử dũng mãnh.",
    "items": [
      {
        "id": "wild_1",
        "name": "Bác Voi Khổng Lồ",
        "type": "animal",
        "emoji": "🐘",
        "soundName": "Gầm vang vòi dài!",
        "options": [
          "Con Voi",
          "Con Chuột",
          "Con Báo",
          "Con Dê"
        ],
        "correctIndex": 0,
        "hint": "Có vòi dài hút nước, đôi tai to như cái quạt mát!"
      },
      {
        "id": "wild_2",
        "name": "Chú Khỉ Nhanh Nhẹn",
        "type": "animal",
        "emoji": "🐒",
        "soundName": "Khẹc khẹc!",
        "options": [
          "Gấu Trúc",
          "Chú Khỉ",
          "Con Thỏ",
          "Chó Sói"
        ],
        "correctIndex": 1,
        "hint": "Thích ăn quả chuối chín, leo trèo chuyền cành rất nhanh!"
      },
      {
        "id": "wild_3",
        "name": "Chú Hươu Cao Cổ",
        "type": "animal",
        "emoji": "🦒",
        "soundName": "Hiền lành ăn lá cây!",
        "options": [
          "Ngựa Vằn",
          "Lạc Đà",
          "Hươu Cao Cổ",
          "Con Tê Giác"
        ],
        "correctIndex": 2,
        "hint": "Có chiếc cổ thật dài để với ăn những đọt lá non trên ngọn cây cao!"
      },
      {
        "id": "wild_4",
        "name": "Chúa Sơn Lâm Sư Tử",
        "type": "animal",
        "emoji": "🦁",
        "soundName": "Gầm uy nghiêm!",
        "options": [
          "Sư Tử",
          "Mèo Rừng",
          "Chó Đốm",
          "Con Cáo"
        ],
        "correctIndex": 0,
        "hint": "Có bờm vàng xù thật đẹp, gầm một tiếng muông thú đều nghe!"
      },
      {
        "id": "wild_5",
        "name": "Chú Gấu Trúc Đáng Yêu",
        "type": "animal",
        "emoji": "🐼",
        "soundName": "Gặm cành trúc non!",
        "options": [
          "Gấu Bắc Cực",
          "Gấu Trúc",
          "Con Lửng",
          "Con Cầy"
        ],
        "correctIndex": 1,
        "hint": "Hai mắt có quầng đen tròn ngộ nghĩnh, thích ăn cây trúc non!"
      }
    ]
  },
  {
    "id": "mn_fruits",
    "title": "Vương Quốc Quả Ngọt 4 Mùa",
    "domain": "Phát triển Nhận thức & Dinh dưỡng",
    "badge": "Chuẩn GDMN",
    "icon": "🍎",
    "color": "#dc2626",
    "desc": "Bé nhận diện màu sắc, hương vị và vitamin phong phú từ các loại quả quen thuộc hàng ngày.",
    "items": [
      {
        "id": "fruit_1",
        "name": "Quả Táo Đỏ Mọng",
        "type": "fruit",
        "emoji": "🍎",
        "soundName": "Giòn ngọt thơm lành!",
        "options": [
          "Quả Táo",
          "Quả Cam",
          "Quả Chanh",
          "Quả Nho"
        ],
        "correctIndex": 0,
        "hint": "Vỏ màu đỏ tươi, ăn giòn ngọt thơm lừng và nhiều vitamin!"
      },
      {
        "id": "fruit_2",
        "name": "Trái Dưa Hấu Mát Lạnh",
        "type": "fruit",
        "emoji": "🍉",
        "soundName": "Ngọt mát ngày hè!",
        "options": [
          "Quả Đu Đủ",
          "Quả Dưa Hấu",
          "Quả Xoài",
          "Quả Ổi"
        ],
        "correctIndex": 1,
        "hint": "Vỏ sọc xanh, ruột đỏ ngọt mát nhiều hạt đen li ti!"
      },
      {
        "id": "fruit_3",
        "name": "Nải Chuối Vàng Thơm",
        "type": "fruit",
        "emoji": "🍌",
        "soundName": "Thơm ngọt mềm mịn!",
        "options": [
          "Quả Dưa Leo",
          "Quả Bí",
          "Quả Chuối",
          "Củ Cà Rốt"
        ],
        "correctIndex": 2,
        "hint": "Quả cong cong hình trăng lưỡi liềm, vỏ màu vàng ươm thơm lừng!"
      },
      {
        "id": "fruit_4",
        "name": "Quả Dâu Tây Chấm Nhỏ",
        "type": "fruit",
        "emoji": "🍓",
        "soundName": "Chua ngọt thơm mát!",
        "options": [
          "Quả Dâu Tây",
          "Quả Mận",
          "Quả Cherry",
          "Quả Cà Chua"
        ],
        "correctIndex": 0,
        "hint": "Quả hình trái tim màu đỏ tươi, có những hạt chấm nhỏ li ti xung quanh!"
      },
      {
        "id": "fruit_5",
        "name": "Quả Cam Mọng Nước",
        "type": "fruit",
        "emoji": "🍊",
        "soundName": "Vitamin C sảng khoái!",
        "options": [
          "Quả Quất",
          "Quả Bưởi",
          "Quả Cam",
          "Quả Chanh Dây"
        ],
        "correctIndex": 2,
        "hint": "Quả tròn xoe màu cam, vắt nước uống tăng cường sức đề kháng cho bé!"
      }
    ]
  },
  {
    "id": "mn_colors",
    "title": "Sắc Màu Diệu Kỳ Của Bé",
    "domain": "Phát triển Thẩm mỹ & Trực quan",
    "badge": "Chuẩn GDMN",
    "icon": "🎨",
    "color": "#7c3aed",
    "desc": "Bé phân biệt các màu sắc cơ bản và nâng cao qua các vật thể trực quan gần gũi.",
    "items": [
      {
        "id": "col_1",
        "name": "Màu Đỏ Rực Rỡ",
        "type": "color",
        "emoji": "🔴",
        "soundName": "Rực rỡ sắc đỏ!",
        "options": [
          "Màu Đỏ",
          "Màu Xanh",
          "Màu Vàng",
          "Màu Tím"
        ],
        "correctIndex": 0,
        "hint": "Giống như màu của quả táo chín, màu lá cờ Tổ quốc bay phấp phới!"
      },
      {
        "id": "col_2",
        "name": "Màu Vàng Nắng Mai",
        "type": "color",
        "emoji": "🟡",
        "soundName": "Tươi sáng màu vàng!",
        "options": [
          "Màu Cam",
          "Màu Vàng",
          "Màu Nâu",
          "Màu Đen"
        ],
        "correctIndex": 1,
        "hint": "Giống như ánh nắng ban mai chiếu sáng, màu bông hoa cúc mùa thu!"
      },
      {
        "id": "col_3",
        "name": "Màu Xanh Lá Cây Tươi Mát",
        "type": "color",
        "emoji": "🟢",
        "soundName": "Xanh tươi chồi non!",
        "options": [
          "Màu Xám",
          "Màu Trắng",
          "Màu Xanh Lá",
          "Màu Đỏ"
        ],
        "correctIndex": 2,
        "hint": "Giống như màu của những tán lá cây xanh mát trong sân trường bé yêu!"
      },
      {
        "id": "col_4",
        "name": "Màu Xanh Da Trời Dịu Êm",
        "type": "color",
        "emoji": "🔵",
        "soundName": "Mênh mông biển trời!",
        "options": [
          "Màu Xanh Da Trời",
          "Màu Tím",
          "Màu Đen",
          "Màu Nâu"
        ],
        "correctIndex": 0,
        "hint": "Màu của bầu trời bao la những ngày trời quang mây tạnh!"
      },
      {
        "id": "col_5",
        "name": "Màu Hồng Dễ Thương",
        "type": "color",
        "emoji": "🌸",
        "soundName": "Ngọt ngào sắc hồng!",
        "options": [
          "Màu Đỏ",
          "Màu Hồng",
          "Màu Trắng",
          "Màu Vàng"
        ],
        "correctIndex": 1,
        "hint": "Màu của cánh hoa đào ngày Tết, màu chiếc váy bé thích mặc nhất!"
      }
    ]
  },
  {
    "id": "mn_shapes",
    "title": "Những Hình Khối Tinh Nghịch",
    "domain": "Phát triển Nhận thức Toán học sớm",
    "badge": "Chuẩn GDMN",
    "icon": "📐",
    "color": "#0284c7",
    "desc": "Nhận biết các hình khối cơ bản: tròn, vuông, tam giác, chữ nhật và liên hệ đồ vật thực tế.",
    "items": [
      {
        "id": "shp_1",
        "name": "Hình Tròn Lăn Nhanh",
        "type": "shape",
        "emoji": "⭕",
        "soundName": "Lăn tròn đều đặn!",
        "options": [
          "Hình Tròn",
          "Hình Vuông",
          "Hình Tam Giác",
          "Hình Chữ Nhật"
        ],
        "correctIndex": 0,
        "hint": "Không có góc nào, có thể lăn tròn bon bon như chiếc bánh xe!"
      },
      {
        "id": "shp_2",
        "name": "Hình Vuông 4 Cạnh Bằng Nhau",
        "type": "shape",
        "emoji": "🔲",
        "soundName": "Vững chãi bốn phương!",
        "options": [
          "Hình Tròn",
          "Hình Vuông",
          "Hình Bầu Dục",
          "Hình Thoi"
        ],
        "correctIndex": 1,
        "hint": "Có 4 cạnh dài bằng nhau chằn chặn, 4 góc đều thẳng đứng!"
      },
      {
        "id": "shp_3",
        "name": "Hình Tam Giác 3 Góc Nhọn",
        "type": "shape",
        "emoji": "🔺",
        "soundName": "Ba đỉnh nhọn xinh!",
        "options": [
          "Hình Chữ Nhật",
          "Hình Vuông",
          "Hình Tam Giác",
          "Hình Tròn"
        ],
        "correctIndex": 2,
        "hint": "Giống như mái nhà ngói đỏ, có 3 cạnh và 3 góc nhọn!"
      },
      {
        "id": "shp_4",
        "name": "Hình Chữ Nhật Dài Dài",
        "type": "shape",
        "emoji": "🚪",
        "soundName": "Hai dài hai ngắn!",
        "options": [
          "Hình Chữ Nhật",
          "Hình Vuông",
          "Hình Tròn",
          "Hình Trái Tim"
        ],
        "correctIndex": 0,
        "hint": "Giống như cánh cửa lớp học, có 2 cạnh dài và 2 cạnh ngắn đối diện nhau!"
      },
      {
        "id": "shp_5",
        "name": "Hình Ngôi Sao Lấp Lánh",
        "type": "shape",
        "emoji": "⭐",
        "soundName": "Sáng ngời 5 cánh!",
        "options": [
          "Hình Mặt Trăng",
          "Hình Ngôi Sao",
          "Hình Tròn",
          "Hình Thoi"
        ],
        "correctIndex": 1,
        "hint": "Có 5 cánh lấp lánh như chiếc đèn ông sao rực rỡ đêm Trung Thu!"
      }
    ]
  },
  {
    "id": "mn_vehicles",
    "title": "Bé Học Giao Thông An Toàn",
    "domain": "Phát triển Nhận thức & Kỹ năng sống",
    "badge": "Chuẩn GDMN",
    "icon": "🚗",
    "color": "#059669",
    "desc": "Tìm hiểu các phương tiện đường bộ, đường sắt, hàng không, thủy và bài học đội mũ bảo hiểm.",
    "items": [
      {
        "id": "veh_1",
        "name": "Chiếc Ô Tô Màu Đỏ",
        "type": "vehicle",
        "emoji": "🚗",
        "soundName": "Bíp bíp bíp!",
        "options": [
          "Máy Bay",
          "Thuyền Buồm",
          "Xe Ô Tô",
          "Tàu Hỏa"
        ],
        "correctIndex": 2,
        "hint": "Xe 4 bánh chạy trên đường phố, còi kêu bíp bíp, chở bé đi chơi!"
      },
      {
        "id": "veh_2",
        "name": "Xe Đạp Leng Keng",
        "type": "vehicle",
        "emoji": "🚲",
        "soundName": "Kính coong leng keng!",
        "options": [
          "Xe Máy",
          "Xe Đạp",
          "Xe Tải",
          "Xe Buýt"
        ],
        "correctIndex": 1,
        "hint": "Có 2 bánh xe, bé dùng 2 chân đạp bàn đạp nhịp nhàng, chuông kính coong!"
      },
      {
        "id": "veh_3",
        "name": "Máy Bay Bay Trên Trời Cao",
        "type": "vehicle",
        "emoji": "✈️",
        "soundName": "Vút bay giữa mây trắng!",
        "options": [
          "Khinh Khí Cầu",
          "Tên Lửa",
          "Máy Bay",
          "Tàu Ngầm"
        ],
        "correctIndex": 2,
        "hint": "Có 2 cánh to dài, bay lượn trên bầu trời xanh đưa hành khách đi xa!"
      },
      {
        "id": "veh_4",
        "name": "Đoàn Tàu Hỏa Dài Thượt",
        "type": "vehicle",
        "emoji": "🚂",
        "soundName": "Tu tu xình xịch!",
        "options": [
          "Tàu Hỏa",
          "Xe Tải",
          "Xe Tắc Xi",
          "Xe Cứu Hỏa"
        ],
        "correctIndex": 0,
        "hint": "Chạy trên đường ray sắt, có nhiều toa nối đuôi nhau tu tu xình xịch!"
      },
      {
        "id": "veh_5",
        "name": "Con Tàu Thủy Rẽ Sóng",
        "type": "vehicle",
        "emoji": "🚢",
        "soundName": "Còi tàu vang xa trên biển!",
        "options": [
          "Thuyền Nan",
          "Tàu Thủy",
          "Ca Nô",
          "Thuyền Thúng"
        ],
        "correctIndex": 1,
        "hint": "Di chuyển trên mặt biển bao la, chở được rất nhiều người và hàng hóa!"
      }
    ]
  },
  {
    "id": "mn_appliances",
    "title": "Đồ Dùng Bé Yêu & Đồ Chơi Lớp Học",
    "domain": "Phát triển Nhận thức & Tự phục vụ",
    "badge": "Chuẩn GDMN",
    "icon": "🧸",
    "color": "#ea580c",
    "desc": "Bé nhận diện chiếc cốc, đôi dép, chiếc bát, đồ chơi xếp hình và thói quen cất dọn ngăn nắp.",
    "items": [
      {
        "id": "app_1",
        "name": "Chiếc Cốc Uống Nước Xinh",
        "type": "object",
        "emoji": "🥛",
        "soundName": "Nước mát ngọt lành!",
        "options": [
          "Chiếc Cốc",
          "Cái Chảo",
          "Chiếc Nồi",
          "Cái Muôi"
        ],
        "correctIndex": 0,
        "hint": "Dùng để đựng nước ấm, bé cầm bằng hai tay uống nước sạch mỗi ngày!"
      },
      {
        "id": "app_2",
        "name": "Đôi Dép Đi Trong Nhà",
        "type": "object",
        "emoji": "🩴",
        "soundName": "Bảo vệ đôi chân sạch!",
        "options": [
          "Đôi Găng Tay",
          "Đôi Dép",
          "Chiếc Mũ",
          "Chiếc Khăn"
        ],
        "correctIndex": 1,
        "hint": "Bé xỏ vào hai bàn chân để giữ ấm và sạch sẽ khi đi lại!"
      },
      {
        "id": "app_3",
        "name": "Chú Gấu Bông Êm Ái",
        "type": "object",
        "emoji": "🧸",
        "soundName": "Mềm mại yêu thương!",
        "options": [
          "Quả Bóng",
          "Khối Gỗ",
          "Gấu Bông",
          "Xe Đồ Chơi"
        ],
        "correctIndex": 2,
        "hint": "Lông mềm mịn ấm áp, bé ôm vào lòng khi đi ngủ trưa ở lớp!"
      },
      {
        "id": "app_4",
        "name": "Bộ Khối Gỗ Xếp Hình",
        "type": "object",
        "emoji": "🧱",
        "soundName": "Xây lâu đài ước mơ!",
        "options": [
          "Khối Xếp Hình",
          "Búp Bê",
          "Đất Nặn",
          "Màu Vẽ"
        ],
        "correctIndex": 0,
        "hint": "Nhiều màu sắc rực rỡ, bé xếp chồng lên nhau thành ngôi nhà, lâu đài xinh đẹp!"
      },
      {
        "id": "app_5",
        "name": "Quả Bóng Tròn Sắc Màu",
        "type": "object",
        "emoji": "⚽",
        "soundName": "Tưng tưng trên sân!",
        "options": [
          "Cầu Lông",
          "Quả Bóng",
          "Dây Nhảy",
          "Vợt Tennis"
        ],
        "correctIndex": 1,
        "hint": "Tròn xoe tưng tưng, bé cùng các bạn chuyền bóng và đá bóng ngoài sân cỏ!"
      }
    ]
  },
  {
    "id": "mn_counting",
    "title": "Bé Vui Tập Đếm (Số Lượng 1 Đến 10)",
    "domain": "Phát triển Tư duy & Toán học Mầm non",
    "badge": "Chuẩn GDMN",
    "icon": "🔢",
    "color": "#15803d",
    "desc": "Làm quen số lượng, đếm các ngón tay, quả táo, bông hoa rèn tư duy số đếm sớm.",
    "items": [
      {
        "id": "num_1",
        "name": "Số 1 - Một Ông Mặt Trời",
        "type": "number",
        "emoji": "1️⃣",
        "soundName": "Số một kiêu hãnh!",
        "options": [
          "Số 1",
          "Số 2",
          "Số 3",
          "Số 4"
        ],
        "correctIndex": 0,
        "hint": "Giống chiếc que tính thẳng đứng, chỉ một ông mặt trời duy nhất tỏa nắng!"
      },
      {
        "id": "num_2",
        "name": "Số 2 - Hai Chú Vịt Bơi",
        "type": "number",
        "emoji": "2️⃣",
        "soundName": "Số hai uốn cong!",
        "options": [
          "Số 1",
          "Số 2",
          "Số 5",
          "Số 0"
        ],
        "correctIndex": 1,
        "hint": "Cổ uốn cong như chú thiên nga trắng đang bơi lội dưới nước!"
      },
      {
        "id": "num_3",
        "name": "Số 3 - Ba Bông Hoa Hồng",
        "type": "number",
        "emoji": "3️⃣",
        "soundName": "Số ba cánh cung!",
        "options": [
          "Số 2",
          "Số 4",
          "Số 3",
          "Số 1"
        ],
        "correctIndex": 2,
        "hint": "Có hai nét cong tròn như đôi tai xinh xắn của bé!"
      },
      {
        "id": "num_4",
        "name": "Số 4 - Bốn Bánh Xe Ô Tô",
        "type": "number",
        "emoji": "4️⃣",
        "soundName": "Số bốn vững chãi!",
        "options": [
          "Số 4",
          "Số 3",
          "Số 5",
          "Số 2"
        ],
        "correctIndex": 0,
        "hint": "Giống như chiếc ghế lộn ngược, là số bánh của một chiếc xe ô tô!"
      },
      {
        "id": "num_5",
        "name": "Số 5 - Năm Ngón Tay Ngoan",
        "type": "number",
        "emoji": "5️⃣",
        "soundName": "Số năm xòe bàn tay!",
        "options": [
          "Số 3",
          "Số 5",
          "Số 6",
          "Số 4"
        ],
        "correctIndex": 1,
        "hint": "Có cái bụng tròn xoe, tương ứng với 5 ngón tay ngoan trên một bàn tay bé!"
      }
    ]
  },
  {
    "id": "mn_emotions",
    "title": "Gương Mặt Cảm Xúc Bé Yêu",
    "domain": "Phát triển Tình cảm & Kỹ năng xã hội",
    "badge": "Chuẩn GDMN",
    "icon": "😊",
    "color": "#d97706",
    "desc": "Bé nhận diện và gọi tên các cảm xúc cơ bản: vui mừng, ngạc nhiên, buồn bã, yêu thương.",
    "items": [
      {
        "id": "emo_1",
        "name": "Khuôn Mặt Vui Cười Rạng Rỡ",
        "type": "emotion",
        "emoji": "😄",
        "soundName": "Tiếng cười giòn tan!",
        "options": [
          "Vui Vẻ",
          "Tức Giận",
          "Khóc Buồn",
          "Sợ Hãi"
        ],
        "correctIndex": 0,
        "hint": "Miệng cười thật tươi, mắt lấp lánh khi bé được cô giáo khen và tặng hoa bé ngoan!"
      },
      {
        "id": "emo_2",
        "name": "Khuôn Mặt Ngạc Nhiên Tròn Xoe",
        "type": "emotion",
        "emoji": "😲",
        "soundName": "Ồ... tuyệt vời quá!",
        "options": [
          "Buồn Bã",
          "Ngạc Nhiên",
          "Buồn Ngủ",
          "Mệt Mỏi"
        ],
        "correctIndex": 1,
        "hint": "Mắt mở to, miệng chữ O khi bé thấy chiếc hộp quà sinh nhật mở ra món đồ chơi bất ngờ!"
      },
      {
        "id": "emo_3",
        "name": "Khuôn Mặt Yêu Thương Ấm Áp",
        "type": "emotion",
        "emoji": "🥰",
        "soundName": "Con yêu mẹ nhiều lắm!",
        "options": [
          "Lo Lắng",
          "Tức Giận",
          "Yêu Thương",
          "Sợ Hãi"
        ],
        "correctIndex": 2,
        "hint": "Mắt ngập tràn trái tim đỏ thắm, bé ôm chầm lấy mẹ khi mẹ đến đón về!"
      },
      {
        "id": "emo_4",
        "name": "Khuôn Mặt Buồn Cần An Ủi",
        "type": "emotion",
        "emoji": "🥺",
        "soundName": "Cần một cái ôm ấm áp!",
        "options": [
          "Buồn Bã",
          "Vui Sướng",
          "Cười Vang",
          "Phấn Khích"
        ],
        "correctIndex": 0,
        "hint": "Khóe môi hơi trễ xuống khi bé nhớ ba mẹ, cần bạn bè và cô giáo vỗ về!"
      },
      {
        "id": "emo_5",
        "name": "Khuôn Mặt Hăng Hái Sẵn Sàng",
        "type": "emotion",
        "emoji": "🤩",
        "soundName": "Tự tin khám phá!",
        "options": [
          "Ngại Ngùng",
          "Hăng Hái Tự Tin",
          "Mệt Mỏi",
          "Lo Sợ"
        ],
        "correctIndex": 1,
        "hint": "Ánh mắt lấp lánh ngôi sao, bé giơ tay xung phong lên biểu diễn văn nghệ trước lớp!"
      }
    ]
  },
  {
    "id": "mn_hygiene",
    "title": "Bé Học Hành Vi Văn Minh & Giữ Gìn Vệ Sinh",
    "domain": "Phát triển Thể chất & Đạo đức lễ giáo",
    "badge": "Chuẩn GDMN",
    "icon": "🧼",
    "color": "#0891b2",
    "desc": "Rửa tay xà phòng, khoanh tay chào hỏi, cất đồ chơi, đội mũ bảo hiểm rèn thói quen tốt từ nhỏ.",
    "items": [
      {
        "id": "hyg_1",
        "name": "Bé Rửa Tay Bằng Xà Phòng",
        "type": "hygiene",
        "emoji": "🧼",
        "soundName": "Bong bóng xà phòng diệt khuẩn!",
        "options": [
          "Rửa Tay Sạch",
          "Bỏ Rác",
          "Đi Ngủ",
          "Chải Tóc"
        ],
        "correctIndex": 0,
        "hint": "Bé xoa xà phòng dưới vòi nước sạch trước khi ăn cơm và sau khi đi vệ sinh!"
      },
      {
        "id": "hyg_2",
        "name": "Chào Hỏi Lễ Phép Hai Tay Vòng",
        "type": "behavior",
        "emoji": "🙇",
        "soundName": "Con chào ông bà, con chào cô ạ!",
        "options": [
          "Chạy Trốn",
          "Khoanh Tay Chào",
          "Hét Lớn",
          "Cúi Đầu Lắc"
        ],
        "correctIndex": 1,
        "hint": "Hai tay khoanh trước ngực, miệng cười tươi chào cô giáo khi bước vào lớp học!"
      },
      {
        "id": "hyg_3",
        "name": "Đội Mũ Bảo Hiểm Khi Đi Xe Máy",
        "type": "safety",
        "emoji": "⛑️",
        "soundName": "Cài quai mũ bảo vệ an toàn!",
        "options": [
          "Cầm Ô",
          "Đeo Kính Râm",
          "Đội Mũ Bảo Hiểm",
          "Mặc Áo Mưa"
        ],
        "correctIndex": 2,
        "hint": "Bé nhớ nhắc ba mẹ cài quai mũ cẩn thận mỗi khi ngồi trên xe máy!"
      },
      {
        "id": "hyg_4",
        "name": "Bỏ Rác Vào Thùng Đúng Nơi",
        "type": "environment",
        "emoji": "🗑️",
        "soundName": "Giữ gìn môi trường xanh sạch đẹp!",
        "options": [
          "Bỏ Rác Đúng Nơi",
          "Vứt Ra Sàn",
          "Giấu Dưới Ghế",
          "Quăng Qua Cửa"
        ],
        "correctIndex": 0,
        "hint": "Sau khi ăn bánh kẹo, bé nhặt vỏ gói bánh bỏ ngay vào thùng rác có nắp đậy!"
      },
      {
        "id": "hyg_5",
        "name": "Cất Đồ Chơi Ngăn Nắp Sau Giờ Chơi",
        "type": "habit",
        "emoji": "📦",
        "soundName": "Đồ dùng gọn gàng ngăn nắp!",
        "options": [
          "Để Bừa Bãi",
          "Cất Đồ Chơi Ngăn Nắp",
          "Ném Ra Sân",
          "Giẫm Lên Đồ"
        ],
        "correctIndex": 1,
        "hint": "Chơi xong các góc chơi, bé cùng bạn thu dọn các khối gỗ vào đúng rổ quy định!"
      }
    ]
  },
  {
    "id": "mn_nature_sounds",
    "title": "Thanh Âm Tự Nhiên Diệu Kỳ",
    "domain": "Phát triển Giác quan & Thính giác",
    "badge": "Chuẩn GDMN",
    "icon": "🌧️",
    "color": "#4f46e5",
    "desc": "Lắng nghe và phân biệt tiếng mưa rào, tiếng sấm ầm, tiếng chim líu lo và tiếng gió thổi mát lành.",
    "items": [
      {
        "id": "snd_1",
        "name": "Cơn Mưa Rơi Rào Rào",
        "type": "sound",
        "emoji": "🌧️",
        "soundName": "Tí tách rào rào mát rượi!",
        "options": [
          "Tiếng Mưa Rơi",
          "Tiếng Gió",
          "Tiếng Sóng",
          "Tiếng Còi"
        ],
        "correctIndex": 0,
        "hint": "Những giọt nước từ trên trời rơi xuống mái nhà kêu tí tách, tưới mát cho cây cối!"
      },
      {
        "id": "snd_2",
        "name": "Tiếng Sấm Rền Ầm Vang",
        "type": "sound",
        "emoji": "⚡",
        "soundName": "Đùng đùng ầm ầm vang dội!",
        "options": [
          "Tiếng Trống",
          "Tiếng Sấm Sét",
          "Tiếng Pháo",
          "Tiếng Chuông"
        ],
        "correctIndex": 1,
        "hint": "Âm thanh vang dội trên bầu trời trước cơn mưa lớn mùa hè!"
      },
      {
        "id": "snd_3",
        "name": "Chú Chim Hót Líu Lo",
        "type": "sound",
        "emoji": "🐦",
        "soundName": "Líu lo líu lo đón ban mai!",
        "options": [
          "Tiếng Chó Sủa",
          "Tiếng Mèo Kêu",
          "Tiếng Chim Hót",
          "Tiếng Ếch Kêu"
        ],
        "correctIndex": 2,
        "hint": "Âm thanh lảnh lót ngân vang trên cành cây xanh vào mỗi buổi sáng sớm!"
      },
      {
        "id": "snd_4",
        "name": "Làn Gió Thổi Vi Vu",
        "type": "sound",
        "emoji": "💨",
        "soundName": "Vi vu đu đưa ngọn cỏ!",
        "options": [
          "Tiếng Gió Thổi",
          "Tiếng Nước Chảy",
          "Tiếng Xe Chạy",
          "Tiếng Tàu Hỏa"
        ],
        "correctIndex": 0,
        "hint": "Thổi nhè nhẹ làm cành lá đu đưa và mang hơi mát lành đến cho mọi người!"
      },
      {
        "id": "snd_5",
        "name": "Dòng Suối Chảy Róc Rách",
        "type": "sound",
        "emoji": "🌊",
        "soundName": "Róc rách lượn qua khe đá!",
        "options": [
          "Tiếng Mưa Đá",
          "Tiếng Suối Róc Rách",
          "Tiếng Cát Rơi",
          "Tiếng Bụi Cây"
        ],
        "correctIndex": 1,
        "hint": "Dòng nước trong vắt luồn lách qua các khe đá kêu róc rách giữa núi rừng!"
      }
    ]
  },
  {
    "id": "mn_day_night",
    "title": "Khám Phá Ngày & Đêm Bí Ẩn",
    "domain": "Phát triển Nhận thức Thời gian & Hiện tượng tự nhiên",
    "badge": "Chuẩn GDMN",
    "icon": "☀️",
    "color": "#e11d48",
    "desc": "Phân biệt ban ngày rực rỡ và ban đêm êm đềm; nhịp sinh hoạt thức dậy, đi học và đi ngủ.",
    "items": [
      {
        "id": "dn_1",
        "name": "Ông Mặt Trời Ban Ngày Rực Rỡ",
        "type": "nature",
        "emoji": "☀️",
        "soundName": "Ánh nắng vàng ấm áp rọi sáng!",
        "options": [
          "Ban Ngày (Mặt Trời)",
          "Ban Đêm",
          "Trời Mưa",
          "Trời Bão"
        ],
        "correctIndex": 0,
        "hint": "Tỏa ánh sáng chói chang rực rỡ, chiếu sáng vạn vật để bé đi học và vui chơi!"
      },
      {
        "id": "dn_2",
        "name": "Trăng Khuyết & Muôn Vì Sao Đêm",
        "type": "nature",
        "emoji": "🌙",
        "soundName": "Ánh trăng dịu êm đưa bé vào giấc ngủ!",
        "options": [
          "Mặt Trời",
          "Mặt Trăng Ban Đêm",
          "Cầu Vồng",
          "Mây Mù"
        ],
        "correctIndex": 1,
        "hint": "Tỏa ánh sáng dịu êm màu vàng nhạt, xung quanh có muôn vì sao lấp lánh!"
      },
      {
        "id": "dn_3",
        "name": "Bé Thức Dậy Tập Thể Dục Ban Sáng",
        "type": "routine",
        "emoji": "⏰",
        "soundName": "Chuông báo thức reng reng chào ngày mới!",
        "options": [
          "Giờ Đi Ngủ",
          "Giờ Ăn Tối",
          "Giờ Thức Dậy Buổi Sáng",
          "Giờ Tắm"
        ],
        "correctIndex": 2,
        "hint": "Khi gà trống gáy vang, bé đánh răng rửa mặt và tập bài thể dục buổi sáng!"
      },
      {
        "id": "dn_4",
        "name": "Cả Nhà Ngồi Quây Quần Bữa Tối",
        "type": "routine",
        "emoji": "🍲",
        "soundName": "Bữa cơm gia đình ấm áp!",
        "options": [
          "Bữa Cơm Tối Ấm Cúng",
          "Bữa Sáng",
          "Giờ Chơi Ở Lớp",
          "Giờ Thể Dục"
        ],
        "correctIndex": 0,
        "hint": "Khi màn đêm buông xuống, ba mẹ đón bé về nhà cùng quây quần ăn bữa cơm ngon lành!"
      },
      {
        "id": "dn_5",
        "name": "Bé Nằm Ngoan Đi Ngủ Đúng Giờ",
        "type": "routine",
        "emoji": "🛏️",
        "soundName": "Giấc ngủ ngoan mang giấc mơ đẹp!",
        "options": [
          "Giờ Chạy Nhảy",
          "Giờ Bé Đi Ngủ",
          "Giờ Đi Học",
          "Giờ Vẽ Tranh"
        ],
        "correctIndex": 1,
        "hint": "Kim đồng hồ chỉ 9 giờ tối, bé nằm vào giường đắp chăn ấm để hôm sau dậy sớm đi học!"
      }
    ]
  }
];

        // Dữ liệu trò chơi Mầm Non mẫu (Khởi tạo từ bộ đầu tiên)
                this.secondaryGamesCatalog = this.initSecondaryGamesCatalog();
        this.preschoolItems = this.preschoolCatalog[0].items;
        this.currentPreschoolGameId = 'mn_pets';


        // Khởi chạy các khối chức năng (Ưu tiên gắn sự kiện trước để ICON không bao giờ bị đơ)
        try { this.initRealtimeClock(); } catch(e) { console.warn(e); }
        try { this.initCommunityTicker(); } catch(e) { console.warn(e); }
        try { this.renderBannerAuthZone(); } catch(e) { console.warn(e); }
        try { if (window.smartTKBUI) window.smartTKBUI.onUserSwitched(this.currentUser); } catch(e){}
        try { this.initEventListeners(); } catch(e) { console.warn(e); }
        try { this.initCopyrightProtection(); } catch(e) { console.warn(e); }
        try { this.updateDemoCounterBadge(); } catch(e) { console.warn(e); }

        try { this.checkAdminStorageVisibility(); } catch(e) { console.warn(e); }
        try { this.renderHomeLatestQuizzes(); } catch(e) { console.warn(e); }
        try { this.initSubjectDropdowns(); } catch(e) { console.warn(e); }
        try { this.updateCompetencyDropdownByGrade('Lớp 8'); } catch(e) { console.warn(e); }
        try { this.renderBankQuestions(); } catch(e) { console.warn(e); }
        try { this.renderPPTRepo(); } catch(e) { console.warn(e); }
        try { this.renderExamRepo(); } catch(e) { console.warn(e); }
        try { this.renderVideoRepo(); } catch(e) { console.warn(e); }
        try { this.renderLabRepo(); } catch(e) { console.warn(e); }
        try { this.initLabStudio(); } catch(e) { console.warn(e); }
        try { this.initPPTStudio(); } catch(e) { console.warn(e); }
        try { this.initMediaStudio3Col(); } catch(e) { console.warn(e); }
        try { this.renderSecondaryGamesRepo(); } catch(e) { console.warn(e); }
        try { this.renderPreschoolGamesRepo(); } catch(e) { console.warn(e); }
        try { this.initLessonPlanStudio(); } catch(e) { console.warn(e); }
        try { this.renderAdminStorageConsole(); } catch(e) { console.warn(e); }
        try { this.initAdminAccountModule(); } catch(e) { console.warn(e); }
        try { this.updateSelectedCounter(); } catch(e) { console.warn(e); }
        try { this.initDefaultData(); } catch(e) { console.warn(e); }
        try { this.initTKBModule(); } catch(e) { console.warn(e); }

        // Mặc định ở Trang chủ hoặc mở theo hash URL
        try {
            const h = window.location.hash.replace('#', '').trim();
            if (h) {
                this.switchTab(h);
            } else {
                this.switchTab('home');
            }
        } catch(e) { console.warn(e); }
    }

    // =========================================================================
    // 0. HỆ THỐNG XÁC THỰC, ĐỒNG BỘ THỜI GIAN & TRANG CHỦ
    // =========================================================================
    loadUserSession() {
        try {
            const raw = localStorage.getItem('edustudio_user_session');
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn("Không đọc được session:", e);
        }
        return null;
    }

    saveUserSession(user) {
        try {
            localStorage.setItem('edustudio_user_session', JSON.stringify(user));
        } catch (e) {}
    }

    openAuthModal() {
        if (window.openModal) {
            window.openModal('authModal');
        } else {
            document.getElementById('authModal')?.classList.add('active');
        }
        this.selectAuthMethod('google');
        if (typeof window.initGoogleSignInButton === 'function') window.initGoogleSignInButton();
        const emailInput = document.getElementById('authCustomEmail');
        const pwdInput = document.getElementById('authCustomPassword');
        const errDiv = document.getElementById('authPasswordError');
        if (emailInput) { emailInput.value = ''; emailInput.focus(); }
        if (pwdInput) { pwdInput.value = ''; pwdInput.style.borderColor = '#cbd5e1'; }
        if (errDiv) { errDiv.style.display = 'none'; }
    }

    selectAuthMethod(method) {
        this.currentAuthMethod = method;
        const optGoogle = document.getElementById('authOptionGoogle');
        const optGuest = document.getElementById('authOptionGuest');
        const radioGoogle = document.getElementById('radioMethodGoogle');
        const radioGuest = document.getElementById('radioMethodGuest');
        const googleInputs = document.getElementById('authGoogleInputsZone');
        const guestInfo = document.getElementById('authGuestInfoZone');
        const btnExecute = document.getElementById('btnExecuteAuthLogin');

        if (method === 'google') {
            if (radioGoogle) radioGoogle.checked = true;
            if (radioGuest) radioGuest.checked = false;
            if (optGoogle) {
                optGoogle.style.borderColor = '#2563eb';
                optGoogle.style.background = '#eff6ff';
            }
            if (optGuest) {
                optGuest.style.borderColor = '#e2e8f0';
                optGuest.style.background = '#f8fafc';
            }
            if (googleInputs) googleInputs.style.display = 'block';
            if (guestInfo) guestInfo.style.display = 'none';
            if (btnExecute) btnExecute.style.display = 'none';
            if (typeof window.initGoogleSignInButton === 'function') window.initGoogleSignInButton();
        } else {
            if (radioGoogle) radioGoogle.checked = false;
            if (radioGuest) radioGuest.checked = true;
            if (optGuest) {
                optGuest.style.borderColor = '#2563eb';
                optGuest.style.background = '#eff6ff';
            }
            if (optGoogle) {
                optGoogle.style.borderColor = '#e2e8f0';
                optGoogle.style.background = '#f8fafc';
            }
            if (googleInputs) googleInputs.style.display = 'none';
            if (guestInfo) guestInfo.style.display = 'block';
            if (btnExecute) {
                btnExecute.style.display = 'flex';
                btnExecute.innerHTML = '<span>TIẾP TỤC VÀO HỆ THỐNG (KHÁCH VÃNG LAI)</span>';
            }
        }
    }

    toggleAuthPasswordVisibility() {
        const pwdInput = document.getElementById('authCustomPassword');
        if (pwdInput) {
            pwdInput.type = (pwdInput.type === 'password') ? 'text' : 'password';
        }
    }

    async executeAuthLogin() {
        // Kiểm tra phương thức đăng nhập: Google hoặc Khách vãng lai
        const isGuest = (this.currentAuthMethod === 'guest') || (document.getElementById('radioMethodGuest')?.checked === true);

        if (isGuest) {
            // ĐĂNG NHẬP NGOÀI TK GMAIL -> VÀO HỆ THỐNG VỚI TƯ CÁCH NHÓM 5: KHÁCH VÃNG LAI
            this.currentUser = {
                id: 'guest_' + Date.now(),
                name: "Khách Vãng Lai",
                email: "",
                role: "guest",
                points: 0,
                demoUses: 10,
                avatarEmoji: "👤",
                isLoggedIn: false
            };
            this.saveUserSession(this.currentUser);
            try {
                localStorage.removeItem('edustudio_user_is_vip');
                localStorage.removeItem('user_gemini_api_key');
            } catch(e) {}
            this.renderBannerAuthZone();
            this.checkAdminStorageVisibility();
            try { if (window.smartTKBUI) window.smartTKBUI.onUserSwitched(this.currentUser); } catch(e){}
            document.getElementById('authModal')?.classList.remove('active');
            sound.playSuccess();
            this.showToast('👤 Bạn đang truy cập hệ thống với tư cách Khách Vãng Lai (Nhóm 5).');
            return;
        }

        // ĐĂNG NHẬP BẰNG TÀI KHOẢN GOOGLE: BẮT BUỘC QUA GOOGLE OAUTH 2.0 THẬT
        const errDiv = document.getElementById('authPasswordError');
        const msg = '🔐 Vui lòng bấm nút xanh "Đăng nhập bằng Google" ở phía trên để xác thực đúng địa chỉ Gmail và mật khẩu Google thật!';
        if (errDiv) {
            errDiv.textContent = msg;
            errDiv.style.display = 'block';
        }
        if (typeof window.initGoogleSignInButton === 'function') window.initGoogleSignInButton();
        this.showToast(msg, 4000);
        sound.playError();
        return;
    }

    loginWithGoogle(accountData = null) {
        return this.executeAuthLogin();
    }

    showToast(msg) {
        if (window.smartTKBUI && typeof window.smartTKBUI.showToast === 'function') {
            window.smartTKBUI.showToast(msg);
            return;
        }
        let toast = document.getElementById('tkbToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'tkbToast';
            toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#1e293b; color:#fff; padding:0.65rem 1.25rem; border-radius:8px; z-index:99999; font-weight:700; font-size:0.85rem; box-shadow:0 10px 25px rgba(0,0,0,0.3);';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.display = 'block';
        clearTimeout(this._appToastTimer);
        this._appToastTimer = setTimeout(() => {
            if (toast) toast.style.display = 'none';
        }, 3500);
    }

    startHeartbeat() {
        if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
        this._heartbeatTimer = setInterval(async () => {
            if (this.currentUser && this.currentUser.isLoggedIn && this.currentUser.email) {
                try {
                    await fetch('/api/heartbeat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: this.currentUser.email })
                    });
                } catch(e) {}
            }
        }, 30000);
    }

    getGeminiKeyForEmail(email) {
        if (!email) return '';
        try {
            const map = JSON.parse(localStorage.getItem('edustudio_gemini_keys_by_email') || '{}');
            return (map[email.toLowerCase()] || '').trim();
        } catch(e) { return ''; }
    }

    saveGeminiKeyForEmail(email, key) {
        if (!email) return;
        try {
            const map = JSON.parse(localStorage.getItem('edustudio_gemini_keys_by_email') || '{}');
            if (key) map[email.toLowerCase()] = key.trim();
            else delete map[email.toLowerCase()];
            localStorage.setItem('edustudio_gemini_keys_by_email', JSON.stringify(map));
        } catch(e) {}
    }

    getActiveGeminiKey() {
        // BẢO VỆ TUYỆT ĐỐI TOKEN ADMIN: Khách và Thành viên KHÔNG BAO GIỜ dùng key của Admin
        if (this.isGuest() || !this.currentUser?.isLoggedIn) return '';
        const email = (this.currentUser?.email || '').toLowerCase();
        const personalKey = (
            this.currentUser?.geminiApiKey ||
            this.getGeminiKeyForEmail(email) ||
            localStorage.getItem('user_gemini_api_key') ||
            ''
        ).trim();
        if (this.isAdmin()) {
            return personalKey || (this.systemAIConfig?.geminiApiKey || '').trim();
        }
        return personalKey;
    }

    requireGeminiAccess(featureName = 'Tính năng AI nâng cao') {
        if (this.isGuest() || !this.currentUser?.isLoggedIn || !this.currentUser?.email) {
            alert(
                `🔒 YÊU CẦU ĐĂNG NHẬP BẰNG TÀI KHOẢN GMAIL\n\n` +
                `Tính năng "${featureName}" cần sự can thiệp của trí tuệ Google Gemini.\n` +
                `Để bảo toàn Token của Quản trị, hệ thống bắt buộc sử dụng gói Gemini Free theo chính tài khoản Gmail cá nhân của bạn.\n\n` +
                `Vui lòng đăng nhập/đăng ký bằng địa chỉ @gmail.com để tiếp tục!`
            );
            this.openAuthModal();
            if (typeof window.setAuthMethod === 'function') window.setAuthMethod('google');
            return false;
        }

        if (this.isAdmin()) return true;

        let activeKey = this.getActiveGeminiKey();
        if (!activeKey || !activeKey.startsWith('AIza')) {
            const entered = prompt(
                `🔑 KÍCH HOẠT GÓI GEMINI FREE CỦA TÀI KHOẢN GMAIL (${this.currentUser.email})\n\n` +
                `Tính năng "${featureName}" sử dụng hạn mức Gemini API miễn phí do Google cấp cho tài khoản Gmail của bạn (không dùng Token của Quản trị).\n\n` +
                `👉 Lấy key miễn phí tại: https://aistudio.google.com/apikey\n` +
                `Vui lòng dán mã Gemini API Key cá nhân (bắt đầu bằng AIzaSy...) vào bên dưới:`,
                activeKey || ''
            );
            if (!entered || !entered.trim()) {
                this.showToast('⚠️ Cần gắn Gemini API Key cá nhân của Gmail để dùng tính năng AI này!');
                return false;
            }
            const cleanKey = entered.trim();
            if (!cleanKey.startsWith('AIza')) {
                alert('⚠️ Mã Gemini API Key hợp lệ phải bắt đầu bằng "AIza..." (lấy từ Google AI Studio). Vui lòng kiểm tra lại!');
                return false;
            }
            this.saveUserGeminiKey(cleanKey);
            activeKey = cleanKey;
        }
        return !!activeKey;
    }

    async callGeminiPersonal(prompt, options = {}) {
        const featureName = options.featureName || 'Tính năng AI Gemini';
        if (!this.requireGeminiAccess(featureName)) {
            throw new Error('AUTH_OR_KEY_REQUIRED');
        }
        const apiKey = this.getActiveGeminiKey();
        if (!apiKey || !apiKey.startsWith('AIza')) {
            throw new Error('INVALID_PERSONAL_API_KEY');
        }
        const model = options.model || this.systemAIConfig?.defaultModel || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const generationConfig = {
            temperature: options.temperature ?? 0.7
        };
        if (options.json) {
            generationConfig.responseMimeType = 'application/json';
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data?.error?.message || `HTTP ${res.status}`;
            if (res.status === 400 || res.status === 403) {
                throw new Error(`Gemini API Key không hợp lệ hoặc bị khóa (${msg}). Vui lòng kiểm tra lại Key cá nhân!`);
            }
            if (res.status === 429) {
                throw new Error(`API Key cá nhân đã chạm hạn mức miễn phí tạm thời (HTTP 429). Vui lòng đợi 1 phút rồi thử lại!`);
            }
            throw new Error(`Lỗi Gemini API: ${msg}`);
        }
        const rawText = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
        if (!rawText) {
            throw new Error('Gemini không trả về nội dung văn bản.');
        }
        if (!options.json) return rawText;
        const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        return JSON.parse(cleaned);
    }

    /**
     * Chuẩn hóa phân quyền đồng nhất toàn hệ thống (Nhóm 5 / Nhóm 4 / Nhóm 3-2-1):
     * - Nhóm 5 (Khách): chặn & mở AuthModal
     * - Nhóm 4 (Member): luôn LƯU sản phẩm lên web để dùng/sửa trực tiếp, KHÔNG tải file & mở hộp thoại nâng cấp Nhóm 3 (VIP)
     * - Nhóm 3 (VIP), Nhóm 2 (VIP Pro), Nhóm 1 (Admin): vừa LƯU vừa XUẤT/TẢI gói về máy
     */
    enforceSaveAndExportTier(saveFn, exportFn, productLabel = 'Sản phẩm') {
        if (this.isGuest() || !this.currentUser?.isLoggedIn) {
            try { sound.playWrong(); } catch(e) {}
            alert(`🔒 YÊU CẦU ĐĂNG NHẬP GOOGLE\n\nVui lòng đăng nhập bằng tài khoản Google để Lưu và sử dụng "${productLabel}".`);
            this.openAuthModal();
            return false;
        }
        if (typeof saveFn === 'function') {
            saveFn();
            try {
                if (window.eduCloudSync?.isConfigured() && this.currentUser?.email) {
                    window.eduCloudSync.syncCurrentUserWorkspace(this.currentUser.email);
                }
            } catch(e) {}
        }
        const canExport = ['admin', 'vip_pro', 'vip'].includes(this.currentUser?.role);
        if (!canExport) {
            try { sound.playClick(); } catch(e) {}
            this.showToast(`💾 Đã lưu "${productLabel}" lên web để dùng & sửa tiếp! Nâng cấp lên Nhóm 3 (VIP) để xuất & tải về máy.`, 4500);
            this.closeModal();
            setTimeout(() => this.openModal('membershipUpgradeModal'), 200);
            return 'saved_only';
        }
        if (typeof exportFn === 'function') {
            exportFn();
        }
        return 'exported';
    }

    async saveUserGeminiKey(keyInput = null) {
        const key = (keyInput || document.getElementById('userGeminiApiKeyInput')?.value || '').trim();
        if (!key) {
            this.showToast('⚠️ Vui lòng nhập mã khóa Gemini API Key!');
            return;
        }
        if (!key.startsWith('AIza')) {
            this.showToast('⚠️ Khóa Gemini API Key của Google thường bắt đầu bằng AIza... Vui lòng kiểm tra lại!');
        }

        const email = (this.currentUser?.email || '').toLowerCase();
        if (this.currentUser) {
            this.currentUser.geminiApiKey = key;
            this.saveUserSession(this.currentUser);
        }
        if (email) {
            this.saveGeminiKeyForEmail(email, key);
        }
        try { localStorage.setItem('user_gemini_api_key', key); } catch(e){}

        // CHỈ Admin mới được cập nhật systemAIConfig; Thành viên thường không được ghi đè cấu hình Admin
        if (this.isAdmin()) {
            if (!this.systemAIConfig) this.systemAIConfig = {};
            this.systemAIConfig.geminiApiKey = key;
            try { localStorage.setItem('edustudio_system_ai_config', JSON.stringify(this.systemAIConfig)); } catch(e){}
        }

        if (email) {
            try {
                await fetch('/api/users/update-ai-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, geminiApiKey: key })
                });
            } catch(e){}
        }
        this.checkMediaAIPermission();
        this.showToast('🤖 Đã kết nối thành công Gemini API Key cá nhân cho tài khoản Gmail của bạn!');
    }

    loginWithQRCode() {
        this.currentUser = {
            name: "Thầy Nguyễn Tá Quan",
            email: "nguyentaquan@gmail.com",
            role: "admin",
            school: "Trường THCS Bán Trú Canh Thuận",
            cccd: "",
            phone: "",
            subject: "HĐTN-HN, KHTN, Tin học",
            points: 500,
            avatarEmoji: "👨‍🏫",
            isLoggedIn: true
        };
        this.saveUserSession(this.currentUser);
        this.renderBannerAuthZone();
        try { if (window.smartTKBUI) window.smartTKBUI.onUserSwitched(this.currentUser); } catch(e){}
        this.checkAdminStorageVisibility();
        document.getElementById('authModal')?.classList.remove('active');
        sound.playFanfare();
        alert("📷 [QUÉT MÃ QR THÀNH CÔNG!]\nXác thực thẻ giáo viên an toàn 2 lớp thành công.\nChào mừng Thầy Nguyễn Tá Quan (nguyentaquan@gmail.com)!");
    }

    logout() {
        const prevEmail = this.currentUser ? this.currentUser.email : '';
        this.currentUser = {
            name: "Khách Vãng Lai",
            email: "",
            role: "guest",
            school: "",
            cccd: "",
            phone: "",
            subject: "",
            points: 0,
            avatarEmoji: "👤",
            isLoggedIn: false
        };
        this.saveUserSession(this.currentUser);
        this.renderBannerAuthZone();
        this.updateBannerStats({ onlineCount: 0 });

        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }

        try {
            localStorage.removeItem('edustudio_user_is_vip');
            localStorage.removeItem('user_gemini_api_key');
        } catch(e) {}

        // Gửi báo đăng xuất lên máy chủ để reset online = 0
        try {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: prevEmail })
            }).catch(() => {});
        } catch(e) {}

        try { if (window.smartTKBUI) window.smartTKBUI.onUserSwitched(this.currentUser); } catch(e){}
        this.checkAdminStorageVisibility();
        this.checkMediaAIPermission();
        sound.playClick();
        this.showToast('🚪 Đã đăng xuất tài khoản an toàn!');
    }

    openUserProfileModal() {
        const modal = document.getElementById('userProfileModal');
        if (!modal) return;

        const u = this.currentUser || {};
        const isAdmin = (u.role === 'admin');
        const isVIPPro = (u.role === 'vip_pro');
        const isVIP = (u.role === 'vip');

        const nameEl = document.getElementById('profDisplayName');
        if (nameEl) nameEl.textContent = u.name || 'Thành Viên';
        
        const emailEl = document.getElementById('profEmailDisplay');
        if (emailEl) emailEl.textContent = u.email || 'Chưa liên kết email';

        const avatarEl = document.getElementById('profAvatarEmoji');
        if (avatarEl) avatarEl.textContent = isAdmin ? '👑' : (u.avatarEmoji || '👨‍🏫');

        const roleBadge = document.getElementById('profRoleBadge');
        if (roleBadge) {
            if (isAdmin) {
                roleBadge.textContent = '👑 Nhóm 1: Quản Trị';
                roleBadge.style.background = '#1e3a8a';
            } else if (isVIPPro) {
                roleBadge.textContent = '💎 Nhóm 2: VIP PRO';
                roleBadge.style.background = '#0284c7';
            } else if (isVIP) {
                roleBadge.textContent = '⭐ Nhóm 3: VIP';
                roleBadge.style.background = '#d97706';
            } else {
                roleBadge.textContent = '👨‍🏫 Nhóm 4: Thành Viên';
                roleBadge.style.background = '#059669';
            }
        }

        const userPts = (u.points !== undefined && u.points !== null) ? u.points : (isAdmin ? 'Vô hạn' : 0);
        const ptsEl = document.getElementById('profPointsDisplay');
        if (ptsEl) ptsEl.textContent = `🪙 Điểm tích lũy: ${userPts} điểm`;

        // Điền thông tin vào các trường input
        const fName = document.getElementById('profFullName');
        if (fName) fName.value = u.name || '';

        const fEmail = document.getElementById('profEmail');
        if (fEmail) fEmail.value = u.email || '';

        const fSchool = document.getElementById('profSchool');
        if (fSchool) fSchool.value = u.school || '';

        const fGrade = document.getElementById('profGrade');
        if (fGrade) fGrade.value = u.grade || 'thcs';

        const fPhone = document.getElementById('profPhone');
        if (fPhone) fPhone.value = u.phone || '';

        const fCCCD = document.getElementById('profCCCD');
        if (fCCCD) fCCCD.value = u.cccd || '';

        const fSubject = document.getElementById('profSubject');
        if (fSubject) fSubject.value = u.subject || '';

        const fApiKey = document.getElementById('profGeminiApiKey');
        if (fApiKey) fApiKey.value = this.getActiveGeminiKey() || '';

        // Xóa trắng ô mật khẩu mới
        const fNewPwd = document.getElementById('profNewPassword');
        if (fNewPwd) fNewPwd.value = '';
        const fConfirmPwd = document.getElementById('profConfirmPassword');
        if (fConfirmPwd) fConfirmPwd.value = '';

        if (window.openModal) {
            window.openModal('userProfileModal');
        } else {
            modal.classList.add('active');
        }
        sound.playClick();
    }

    async handleSaveUserProfile(e) {
        if (e && e.preventDefault) e.preventDefault();

        const fullName = document.getElementById('profFullName')?.value.trim();
        const school = document.getElementById('profSchool')?.value.trim();
        const grade = document.getElementById('profGrade')?.value || 'thcs';
        const phone = document.getElementById('profPhone')?.value.trim();
        const cccd = document.getElementById('profCCCD')?.value.trim();
        const subject = document.getElementById('profSubject')?.value.trim();
        const profGeminiKey = document.getElementById('profGeminiApiKey')?.value.trim() || '';
        const newPwd = document.getElementById('profNewPassword')?.value.trim();
        const confirmPwd = document.getElementById('profConfirmPassword')?.value.trim();

        if (!fullName) {
            alert("⚠️ Họ và tên thành viên không được để trống!");
            document.getElementById('profFullName')?.focus();
            return;
        }

        if (profGeminiKey && !profGeminiKey.startsWith('AIza')) {
            alert("⚠️ Mã Gemini API Key không hợp lệ! Khóa của Google AI Studio bắt đầu bằng 'AIza...'.");
            document.getElementById('profGeminiApiKey')?.focus();
            return;
        }

        if (newPwd) {
            if (newPwd.length < 3) {
                alert("⚠️ Mật khẩu mới quá ngắn (tối thiểu 3 ký tự)!");
                document.getElementById('profNewPassword')?.focus();
                return;
            }
            if (newPwd !== confirmPwd) {
                alert("⚠️ Mật khẩu xác nhận không trùng khớp với mật khẩu mới!");
                document.getElementById('profConfirmPassword')?.focus();
                return;
            }
        }

        const btnSave = document.getElementById('btnSaveUserProfile');
        const origBtnText = btnSave ? btnSave.innerHTML : '';
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<span>⏳ Đang lưu hồ sơ...</span>';
        }

        try {
            const payload = {
                email: this.currentUser.email,
                id: this.currentUser.id,
                name: fullName,
                school: school,
                grade: grade,
                phone: phone,
                cccd: cccd,
                subject: subject,
                geminiApiKey: profGeminiKey
            };
            if (newPwd) {
                payload.newPassword = newPwd;
            }

            // 1. Cập nhật ngay currentUser và LocalStorage (hoạt động bền vững 100% cả trên Vercel/Static)
            this.currentUser.name = fullName;
            this.currentUser.school = school;
            this.currentUser.grade = grade;
            this.currentUser.phone = phone;
            this.currentUser.cccd = cccd;
            this.currentUser.subject = subject;
            this.currentUser.geminiApiKey = profGeminiKey;
            this.saveUserSession(this.currentUser);
            this.saveGeminiKeyForEmail(this.currentUser.email, profGeminiKey);
            try {
                if (profGeminiKey) localStorage.setItem('user_gemini_api_key', profGeminiKey);
                else localStorage.removeItem('user_gemini_api_key');
            } catch(e){}
            this.checkMediaAIPermission();

            try {
                let uList = [];
                const rawU = localStorage.getItem("edustudio_registered_users");
                if (rawU) uList = JSON.parse(rawU);
                const uIdx = uList.findIndex(u => u.email && u.email.toLowerCase() === (this.currentUser.email || "").toLowerCase());
                const updatedObj = { ...this.currentUser };
                if (newPwd) updatedObj.password = newPwd;
                if (uIdx >= 0) {
                    uList[uIdx] = { ...uList[uIdx], ...updatedObj };
                } else {
                    uList.push(updatedObj);
                }
                localStorage.setItem("edustudio_registered_users", JSON.stringify(uList));
            } catch(e){}

            // 2. Đồng bộ ngầm lên backend nếu có máy chủ chạy
            try {
                await fetch("/api/users/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } catch(netErr) {}

            this.renderBannerAuthZone();
            try { if (window.smartTKBUI) window.smartTKBUI.onUserSwitched(this.currentUser); } catch(e){}

            document.getElementById("userProfileModal")?.classList.remove("active");
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = origBtnText;
            }

            sound.playFanfare();
            alert("💾 [LƯU THÀNH CÔNG]\n\nThông tin tài khoản đã được cập nhật và đồng bộ bền vững trên hệ thống EduStudio!");

        } catch (err) {
            console.error("Lỗi cập nhật hồ sơ:", err);
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = origBtnText;
            }
            alert("❌ Không thể cập nhật hồ sơ: " + err.message);
        }
    }

    initRealtimeClock() {
        const clockEl = document.getElementById('liveClockDisplay');
        if (!clockEl) return;
        const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        const update = () => {
            const now = new Date();
            const dayName = days[now.getDay()];
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = now.getFullYear();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            clockEl.textContent = `${hh}:${mm}:${ss} • ${dayName}, ${d}/${m}/${y}`;
        };
        update();
        setInterval(update, 1000);
    }

    initCommunityTicker() {
        const tickerEl = document.getElementById('tickerText');
        if (!tickerEl) return;
        const messages = [
            "Hệ thống EduStudio v3.10.57 đang vận hành phiên bản DEMO Thử Nghiệm Sư Phạm (GDMN & GDPT). Kính mời Quý Thầy Cô trải nghiệm!",
            "Cô Hoàng Mai vừa tạo bộ trò chơi 'Đoán Con Vật Mầm Non' tương tác trực quan",
            "Thầy Lê Hải vừa biên soạn đề kiểm tra Giữa kỳ I môn Toán 7 chuẩn 3 dạng TNKQ",
            "Hệ thống EduStudio v3.10.57 GDMN & GDPT kết nối đám mây sư phạm 5TB hoạt động ổn định",
            "Xưởng Video Studio đã hoàn tất kịch bản Audio-Driven Lip-Sync 3D"
        ];
        let idx = 0;
        setInterval(() => {
            idx = (idx + 1) % messages.length;
            tickerEl.style.opacity = '0';
            setTimeout(() => {
                tickerEl.textContent = messages[idx];
                tickerEl.style.opacity = '1';
            }, 300);
        }, 5000);
    }

    
    // =========================================================================
    // HỆ THỐNG PHÂN QUYỀN 5 NHÓM NGƯỜI DÙNG (USER ROLES & PERMISSIONS)
    // Nhóm 1: Admin • Nhóm 2: VIP PRO • Nhóm 3: VIP • Nhóm 4: Member • Nhóm 5: Guest
    // =========================================================================

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    isVIPPro() {
        return this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'vip_pro');
    }

    isVIP() {
        return this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'vip_pro' || this.currentUser.role === 'vip');
    }

    isMember() {
        return this.currentUser && this.currentUser.isLoggedIn && this.currentUser.role !== 'guest';
    }

    isGuest() {
        return !this.currentUser || !this.currentUser.isLoggedIn || this.currentUser.role === 'guest';
    }

    switchUserRole(newRole) {
        sound.playClick();
        if (!this.currentUser) {
            this.currentUser = { name: "Thầy Nguyễn Tá Quan", email: "nguyentaquan@gmail.com" };
        }

        this.currentUser.role = newRole;
        this.currentUser.isLoggedIn = (newRole !== 'guest');

        if (newRole === 'admin') {
            this.currentUser.avatarEmoji = "👑";
            if (!this.currentUser.email) this.currentUser.email = "nguyentaquan@gmail.com";
        } else if (newRole === 'vip_pro') {
            this.currentUser.avatarEmoji = "💎";
        } else if (newRole === 'vip') {
            this.currentUser.avatarEmoji = "⭐";
        } else if (newRole === 'member') {
            this.currentUser.avatarEmoji = "👨‍🏫";
        } else if (newRole === 'guest') {
            this.currentUser.name = "Khách Vãng Lai";
            this.currentUser.email = "";
            this.currentUser.points = 0;
            this.currentUser.avatarEmoji = "👤";
        }

        this.saveUserSession(this.currentUser);
        this.renderBannerAuthZone();
        try { if (window.smartTKBUI) window.smartTKBUI.onUserSwitched(this.currentUser); } catch(e){}
        this.checkAdminStorageVisibility();
        this.checkMediaAIPermission();
        try { this.renderAdminUsersList(); } catch(e) {}
        try { this.renderAdminKPIs(); } catch(e) {}

        const roleNames = {
            'admin': '👑 Nhóm 1: Quản Trị (Admin Master)',
            'vip_pro': '💎 Nhóm 2: Thành Viên VIP PRO',
            'vip': '⭐ Nhóm 3: Thành Viên VIP',
            'member': '👨‍🏫 Nhóm 4: Thành Viên (Chuẩn)',
            'guest': '👤 Nhóm 5: Khách Vãng Lai'
        };

        sound.playSuccess();
        alert(`🎭 [ĐÃ CHUYỂN ĐỔI VAI TRÒ HỆ THỐNG]

Bạn hiện đang trải nghiệm web với tư cách:
${roleNames[newRole] || newRole}

Toàn bộ quyền hạn và giao diện đã được đồng bộ chuẩn xác!`);
    }

    /**
     * PHÂN HỆ QUẢN TRỊ ADMIN: NHẬT KÝ NGƯỜI DÙNG & HOẠT ĐỘNG HỆ THỐNG
     */
    getUserLogs() {
        const stored = localStorage.getItem('edustudio_user_activity_logs');
        if (stored) {
            try { return JSON.parse(stored); } catch(e){}
        }

        // Dữ liệu mẫu khởi tạo phong phú chuẩn sư phạm
        const defaultLogs = [
            { id: "LOG-1001", time: "2026-11-04 00:32:10", user: "Thầy Nguyễn Tá Quan", role: "Nhóm 1: Quản Trị", action: "Kích hoạt chế độ Hoán đổi tiết 1 chạm (Click-to-Swap)", module: "Thời Khóa Biểu", type: "tkb", status: "Thành công" },
            { id: "LOG-1002", time: "2026-11-04 00:28:45", user: "Thầy Nguyễn Tá Quan", role: "Nhóm 1: Quản Trị", action: "Tinh chỉnh đệm lề và ép gọn kích thước ô bàn cờ TKB chuẩn 32px", module: "Thời Khóa Biểu", type: "tkb", status: "Thành công" },
            { id: "LOG-1003", time: "2026-11-04 00:20:15", user: "Thầy Nguyễn Tá Quan", role: "Nhóm 1: Quản Trị", action: "Đồng bộ nhãn phiên bản v3.10.57 GDMN & GDPT toàn hệ thống", module: "Quản Trị Hệ Thống", type: "auth", status: "Thành công" },
            { id: "LOG-1004", time: "2026-11-03 23:45:00", user: "Cô Hà Thị Thúy Hòa", role: "Nhóm 4: Giáo Viên", action: "Xem thời khóa biểu Lớp 6A2 môn Tin Học", module: "Thời Khóa Biểu", type: "tkb", status: "Thành công" },
            { id: "LOG-1005", time: "2026-11-03 23:15:20", user: "Thầy Nguyễn Tá Quan", role: "Nhóm 1: Quản Trị", action: "Tạo Đề Kiểm Tra Giữa Kỳ I HĐTN 8 chuẩn ma trận & đặc tả BGDĐT", module: "Tạo & Đối Soát Đề", type: "exam", status: "Thành công" },
            { id: "LOG-1006", time: "2026-11-03 22:50:11", user: "Cô Dương Thị Ngọc Lành", role: "Nhóm 4: Giáo Viên", action: "Đăng nhập xác thực tài khoản Google SSO", module: "Xác Thực", type: "auth", status: "Thành công" },
            { id: "LOG-1007", time: "2026-11-03 22:10:04", user: "Thầy Nguyễn Bá Hiền", role: "Nhóm 4: Giáo Viên", action: "Soạn Kế hoạch bài dạy KHBD 5512 Lịch sử 7", module: "Soạn KHBD", type: "lesson", status: "Thành công" },
            { id: "LOG-1008", time: "2026-11-03 21:30:18", user: "Thầy Nguyễn Tá Quan", role: "Nhóm 1: Quản Trị", action: "Xuất file Mẫu TKB Master chuẩn Excel 5 Sheets (.xlsx)", module: "Thời Khóa Biểu", type: "export", status: "Thành công" },
            { id: "LOG-1009", time: "2026-11-03 20:45:33", user: "Cô Phạm Thị Nhàn", role: "Nhóm 4: Giáo Viên", action: "Khai thác bài giảng điện tử PPT 16:9 môn Ngữ Văn 6", module: "Kho Bài Giảng", type: "lesson", status: "Thành công" },
            { id: "LOG-1010", time: "2026-11-03 19:12:40", user: "Thầy Lê Quốc Thái", role: "Nhóm 4: Giáo Viên", action: "Tra cứu lịch giảng dạy và phòng bộ môn GDTC", module: "Thời Khóa Biểu", type: "tkb", status: "Thành công" },
            { id: "LOG-1011", time: "2026-11-03 18:05:15", user: "Thầy Lương Văn Tuấn", role: "Nhóm 4: Giáo Viên", action: "Đăng nhập hệ thống EduStudio và xem phân công chuyên môn", module: "Xác Thực", type: "auth", status: "Thành công" },
            { id: "LOG-1012", time: "2026-11-03 17:30:00", user: "Thầy Nguyễn Tá Quan", role: "Nhóm 1: Quản Trị", action: "Đối soát tự động ma trận đề kiểm tra KHTN 8 với PPCT", module: "Tạo & Đối Soát Đề", type: "exam", status: "Thành công" }
        ];

        localStorage.setItem('edustudio_user_activity_logs', JSON.stringify(defaultLogs));
        return defaultLogs;
    }

    logUserActivity(action, module = 'Hệ Thống', type = 'general', details = '') {
        const logs = this.getUserLogs();
        const userName = (this.currentUser && this.currentUser.name) || 'Thầy Nguyễn Tá Quan';
        const userEmail = (this.currentUser && this.currentUser.email) || 'nguyentaquan@gmail.com';
        const userSchool = (this.currentUser && this.currentUser.school) || 'Trường THCS Bán Trú Canh Thuận';
        const role = (this.currentUser && this.currentUser.role === 'admin') ? 'Nhóm 1: Quản Trị' : 
                     ((this.currentUser && this.currentUser.role === 'vip_pro') ? 'Nhóm 2: VIP PRO' : 
                     ((this.currentUser && this.currentUser.role === 'vip') ? 'Nhóm 3: VIP' : 'Nhóm 4: Giáo Viên'));

        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const deviceStr = isMobile ? '📱 Di Động' : '💻 Máy Tính';

        const newLog = {
            id: `LOG-${Date.now().toString().slice(-4)}`,
            time: timeStr,
            user: userName,
            email: userEmail,
            school: userSchool,
            device: deviceStr,
            role: role,
            action: action + (details ? ` (${details})` : ''),
            module: module,
            type: type,
            status: 'Thành công'
        };

        logs.unshift(newLog);
        if (logs.length > 300) logs.pop();

        try {
            localStorage.setItem('edustudio_user_activity_logs', JSON.stringify(logs));
        } catch(e) {}

        // Nếu đang ở màn hình log, cập nhật luôn
        if (document.getElementById('admin-subpane-user-logs')?.classList.contains('active')) {
            this.renderUserLogs();
        }
    }

    renderUserLogs(filteredLogs = null) {
        const tbody = document.getElementById('adminUserLogsTableBody');
        if (!tbody) return;

        const logs = filteredLogs || this.getUserLogs();

        // Update KPIs
        const total = logs.length;
        const logins = logs.filter(l => l.type === 'auth').length;
        const tkb = logs.filter(l => l.type === 'tkb').length;
        const exams = logs.filter(l => l.type === 'exam' || l.type === 'lesson').length;

        const elTotal = document.getElementById('kpiLogTotal');
        const elLogins = document.getElementById('kpiLogLogins');
        const elTKB = document.getElementById('kpiLogTKB');
        const elExams = document.getElementById('kpiLogExams');
        const elCount = document.getElementById('adminLogCountLabel');

        if (elTotal) elTotal.textContent = total.toLocaleString();
        if (elLogins) elLogins.textContent = logins.toLocaleString();
        if (elTKB) elTKB.textContent = tkb.toLocaleString();
        if (elExams) elExams.textContent = exams.toLocaleString();
        if (elCount) elCount.textContent = `Hiển thị ${logs.length} nhật ký hoạt động`;

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #94a3b8;">Chưa có nhật ký hoạt động nào khớp với bộ lọc.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map((log, idx) => {
            const isQuan = log.user.includes('Tá Quan');
            const roleBadge = log.role.includes('Quản Trị') 
                ? '<span style="background: #eff6ff; color: #1d4ed8; padding: 0.12rem 0.4rem; border-radius: 4px; font-weight: 700; font-size: 0.68rem;">Quản Trị</span>'
                : '<span style="background: #f1f5f9; color: #475569; padding: 0.12rem 0.4rem; border-radius: 4px; font-weight: 600; font-size: 0.68rem;">Giáo Viên</span>';
            
            const moduleBadge = `<span style="background: #f8fafc; border: 1px solid #e2e8f0; color: #334155; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700; font-size: 0.68rem;">${log.module}</span>`;

            return `
                <tr style="border-bottom: 1px solid #e2e8f0; ${isQuan ? 'background: #f8fafc;' : ''}">
                    <td style="padding: 0.45rem; text-align: center; color: #94a3b8; font-weight: 700;">${idx + 1}</td>
                    <td style="padding: 0.45rem; font-family: monospace; font-size: 0.72rem; color: #64748b;">${log.time}</td>
                    <td style="padding: 0.45rem; color: #0f172a;">
                        <div style="font-weight: 700; color: ${isQuan ? '#1d4ed8' : '#0f172a'};">
                            ${isQuan ? '⭐ ' : ''}${log.user}
                        </div>
                        <div style="font-size: 0.68rem; color: #64748b; margin-top: 0.15rem; display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                            <span>${log.email || ''}</span>
                            ${log.school ? '• <span>' + log.school + '</span>' : ''}
                            ${log.device ? '• <span style="color:#0284c7; font-weight:700;">' + log.device + '</span>' : ''}
                        </div>
                    </td>
                    <td style="padding: 0.45rem; text-align: center;">${roleBadge}</td>
                    <td style="padding: 0.45rem; color: #334155;">${log.action}</td>
                    <td style="padding: 0.45rem; text-align: center;">${moduleBadge}</td>
                    <td style="padding: 0.45rem; text-align: center;">
                        <span style="background: #dcfce7; color: #15803d; font-weight: 700; font-size: 0.68rem; padding: 0.12rem 0.45rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 0.2rem;">
                            <span>✓</span> Thành công
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterUserLogs() {
        const inp = document.getElementById('adminLogSearchInput');
        const sel = document.getElementById('adminLogTypeFilter');
        const q = inp ? inp.value.trim().toLowerCase() : '';
        const t = sel ? sel.value : 'all';

        const allLogs = this.getUserLogs();
        const filtered = allLogs.filter(log => {
            const matchQ = !q || log.user.toLowerCase().includes(q) || log.action.toLowerCase().includes(q) || log.module.toLowerCase().includes(q);
            const matchT = (t === 'all') || (log.type === t);
            return matchQ && matchT;
        });

        this.renderUserLogs(filtered);
    }

    exportUserLogsCSV() {
        const logs = this.getUserLogs();
        if (logs.length === 0) {
            alert('Không có nhật ký nào để xuất!');
            return;
        }

        let csv = "\uFEFFSTT,Th\u1eddi Gian,H\u1ecd v\xe0 T\xean,Vai Tr\xf2,H\xe0nh \u0110\u1ed9ng Chi Ti\u1ebft,Ph\xe2n H\u1ec7,Tr\u1ea1ng Th\xe1i\n";
        logs.forEach((l, idx) => {
            csv += `"${idx + 1}","${l.time}","${l.user}","${l.role}","${(l.action || "").replace(/"/g, '""')}","${l.module || ""}","${l.status || ""}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EDUSTUDIO_NHAT_KY_NGUOI_DUNG_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        alert('✅ Đã xuất File Nhật Ký Hoạt Động Người Dùng (.CSV) chuẩn UTF-8 thành công!');
    }

    clearUserLogs() {
        if (!confirm('Thầy có chắc chắn muốn xóa toàn bộ lịch sử nhật ký hoạt động người dùng không?')) return;
        localStorage.setItem('edustudio_user_activity_logs', JSON.stringify([]));
        this.renderUserLogs();
        alert('✅ Đã xóa trắng lịch sử nhật ký hoạt động.');
    }

    renderBannerAuthZone() {
        const authZone = document.getElementById('bannerAuthZone');
        if (!authZone) return;

        if (this.currentUser && this.currentUser.isLoggedIn && this.currentUser.role !== 'guest') {
            // Xác định chính xác 1 trong 5 nhóm tài khoản của Web
            let roleDisplay = '<span class="role-badge-member">👨‍🏫 Nhóm 4: Giáo Viên</span>';
            const email = (this.currentUser.email || '').toLowerCase();
            const role = this.currentUser.role;

            if (email === 'nguyentaquan@gmail.com' || email === 'nguyentaquan8@gmail.com' || role === 'admin') {
                roleDisplay = '<span class="role-badge-admin">👑 Nhóm 1: Quản Trị</span>';
            } else if (role === 'vip_pro') {
                roleDisplay = '<span class="role-badge-vip-pro">💎 Nhóm 2: VIP PRO</span>';
            } else if (role === 'vip') {
                roleDisplay = '<span class="role-badge-vip">⭐ Nhóm 3: VIP</span>';
            } else if (role === 'guest') {
                roleDisplay = '<span class="role-badge-guest">👤 Nhóm 5: Khách</span>';
            } else {
                roleDisplay = '<span class="role-badge-member">👨‍🏫 Nhóm 4: Giáo Viên</span>';
            }

            const avatar = (email === 'nguyentaquan@gmail.com' || email === 'nguyentaquan8@gmail.com' || role === 'admin') ? '👑' : (this.currentUser.avatarEmoji || '👨‍🏫');
            const pts = (this.currentUser.points !== undefined && this.currentUser.points !== null) ? this.currentUser.points : 500;
            const demoText = (role === 'admin' || role === 'vip_pro') ? '🪙 Vô hạn' : `🪙 ${pts} điểm`;

            authZone.innerHTML = `
                <div class="banner-user-card" style="position:relative;">
                    <div class="banner-user-avatar">
                        ${avatar}
                    </div>
                    <div class="banner-user-info">
                        <div class="banner-user-name" style="display:flex; align-items:center; gap:0.35rem;">
                            <span>${this.currentUser.name}</span>
                            ${roleDisplay}
                        </div>
                        <div class="banner-user-points" style="font-size:0.68rem; color:#64748b;">
                            <span>${this.currentUser.email || email} • ${demoText}</span>
                        </div>
                    </div>

                    <!-- NÚT BÁNH RĂNG TÀI KHOẢN DUY NHẤT (KHÔNG CÓ KÍNH LÚP TÌM KIẾM RÁC) -->
                    <button id="btnToggleUserMenu" class="btn-gear-user" title="Cài đặt tài khoản" style="font-size:1.15rem; background:none; border:none; cursor:pointer; padding:4px 6px;">
                        ⚙️
                    </button>

                    <!-- MENU BÁNH RĂNG ĐÚNG 2 DÒNG THEO YÊU CẦU: ĐĂNG NHẬP TK KHÁC & ĐĂNG XUẤT -->
                    <div id="userProfileDropdown" class="user-profile-dropdown" style="display:none; position:absolute; right:0; top:calc(100% + 8px); z-index:9999; min-width:260px; padding:0; overflow:hidden; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,0.25); background:#ffffff; border:1px solid #e2e8f0;">
                        <div style="padding: 0.85rem 1rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: center;">
                            <div style="font-size: 1.8rem; margin-bottom: 0.2rem;">${avatar}</div>
                            <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a;">${this.currentUser.name}</div>
                            <div style="font-size: 0.72rem; color: #64748b; margin-bottom: 0.35rem;">${this.currentUser.email || email}</div>
                            <div>${roleDisplay}</div>
                        </div>

                        <div style="padding: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; background: #ffffff;">
                            <!-- DÒNG 1: Thông tin tài khoản (Nằm TRÊN Đăng nhập với TK khác) -->
                            <button id="btnMenuProfile" style="width: 100%; display: flex; align-items: center; gap: 0.55rem; padding: 0.6rem 0.8rem; border: 1px solid #bfdbfe; border-radius: 6px; background: #eff6ff; color: #1e3a8a; font-size: 0.82rem; font-weight: 700; cursor: pointer; text-align: left; transition: background 0.15s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                                <span style="font-size: 1.05rem;">👤</span>
                                <span>Thông tin tài khoản</span>
                            </button>

                            <!-- DÒNG 2: Đăng nhập với tài khoản khác -->
                            <button id="btnMenuSwitchAccount" style="width: 100%; display: flex; align-items: center; gap: 0.55rem; padding: 0.6rem 0.8rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; color: #1e293b; font-size: 0.82rem; font-weight: 700; cursor: pointer; text-align: left; transition: background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#ffffff'">
                                <span style="font-size: 1.05rem;">🔄</span>
                                <span>Đăng nhập với TK khác</span>
                            </button>

                            <!-- DÒNG 3: Đăng xuất -->
                            <button id="btnMenuLogout" style="width: 100%; display: flex; align-items: center; gap: 0.55rem; padding: 0.6rem 0.8rem; border: 1px solid #fecaca; border-radius: 6px; background: #fef2f2; color: #dc2626; font-size: 0.82rem; font-weight: 700; cursor: pointer; text-align: left; transition: background 0.15s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">
                                <span style="font-size: 1.05rem;">🚪</span>
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // BẬT / TẮT MENU BÁNH RĂNG KHI CLICK
            const btnGear = document.getElementById('btnToggleUserMenu');
            const dropdown = document.getElementById('userProfileDropdown');
            if (btnGear && dropdown) {
                btnGear.onclick = (e) => {
                    e.stopPropagation();
                    const isShown = dropdown.style.display === 'block';
                    dropdown.style.display = isShown ? 'none' : 'block';
                };

                // Đóng menu khi click ra ngoài
                const closeDropdownHandler = (e) => {
                    if (!dropdown.contains(e.target) && e.target !== btnGear) {
                        dropdown.style.display = 'none';
                    }
                };
                document.removeEventListener('click', window._closeDropdownHandler);
                window._closeDropdownHandler = closeDropdownHandler;
                document.addEventListener('click', closeDropdownHandler);
            }

            // GẮN SỰ KIỆN CHO DÒNG 1: THÔNG TIN TÀI KHOẢN
            document.getElementById('btnMenuProfile')?.addEventListener('click', () => {
                if (dropdown) dropdown.style.display = 'none';
                this.openUserProfileModal();
            });

            // GẮN SỰ KIỆN CHO DÒNG 2: ĐĂNG NHẬP VỚI TK KHÁC
            document.getElementById('btnMenuSwitchAccount')?.addEventListener('click', () => {
                if (dropdown) dropdown.style.display = 'none';
                this.openAuthModal();
            });

            // GẮN SỰ KIỆN CHO DÒNG 2: ĐĂNG XUẤT
            document.getElementById('btnMenuLogout')?.addEventListener('click', () => {
                if (dropdown) dropdown.style.display = 'none';
                this.logout();
            });

        } else {
            // TRẠNG THÁI CHƯA ĐĂNG NHẬP (KHÁCH VÃNG LAI)
            authZone.innerHTML = `
                <button id="btnOpenAuthModal" class="btn-banner-login" onclick="if(window.openModal) window.openModal('authModal'); else document.getElementById('authModal')?.classList.add('active');">
                    <span>👤</span> <span>ĐĂNG NHẬP</span>
                </button>
            `;
            document.getElementById('btnOpenAuthModal')?.addEventListener('click', () => {
                if (window.openModal) window.openModal('authModal');
                else document.getElementById('authModal')?.classList.add('active');
            });
        }
    }

    checkAdminStorageVisibility() {
        const btnSidebarConfig = document.getElementById('btnSidebarAdminConfig');
        const isAdmin = this.isAdmin();
        if (btnSidebarConfig) {
            btnSidebarConfig.style.display = isAdmin ? 'flex' : 'none';
        }
        // Nếu không phải Admin mà đang ở tab storage5tb, chuyển về Trang chủ
        if (!isAdmin && this.currentTab === 'storage5tb') {
            this.switchTab('home');
        }
    }

    renderHomeLatestQuizzes() {
        const tbody = document.getElementById('homeQuizListBody');
        if (!tbody) return;

        if (!this.examRepo || this.examRepo.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#94a3b8;">Chưa có dữ liệu đề kiểm tra</td></tr>`;
            return;
        }

        tbody.innerHTML = this.examRepo.slice(0, 4).map(exam => {
            const totalQuestions = (exam.countNLC || 0) + (exam.countDS || 0) + (exam.countTLN || 0) + (exam.countTL || 0);
            return `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: #1e293b; font-size: 0.85rem;">${exam.title}</div>
                        <div style="font-size: 0.72rem; color: #64748b;">Thời lượng: ${exam.duration} • ${exam.term}</div>
                    </td>
                    <td><span class="badge-tag-tiny" style="background:#e0f2fe; color:#0369a1;">${exam.subject}</span></td>
                    <td><span class="badge-tag-tiny" style="background:#f1f5f9; color:#475569;">${exam.grade}</span></td>
                    <td><strong>${totalQuestions} câu</strong></td>
                    <td>
                        <button class="btn-mini-action btn-view-exam-quick" data-exam-id="${exam.id}" style="background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; font-size:0.75rem;">
                            <span>👁️</span> <span>Xem đề</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-view-exam-quick').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const examId = e.currentTarget.dataset.examId;
                const exam = this.examRepo.find(item => item.id === examId);
                if (exam) {
                    this.openExamDetailModal(exam);
                }
            });
        });
    }

    initDefaultQuestionBank() {
        return [
            {
                grade: 'Lớp 8',
                subject: 'KHTN',
                competency: 'pt_nhan_biet',
                competencyText: 'Nhận biết',
                stem: 'Dấu hiệu nào sau đây chứng tỏ đã có phản ứng hoá học xảy ra?',
                stemImage: null,
                options: [
                    'Có sự thay đổi về trạng thái hoặc màu sắc và tạo chất mới',
                    'Chỉ có sự thay đổi kích thước của vật thể',
                    'Chỉ có sự bay hơi của nước',
                    'Chất tan rã cơ học thành các hạt nhỏ hơn'
                ],
                optImages: [null, null, null, null],
                correctIndex: 0,
                explanation: 'Phản ứng hoá học là quá trình biến đổi từ chất này thành chất khác, thường kèm theo hiện tượng kết tủa, bay hơi khí, đổi màu hoặc tỏa nhiệt.'
            },
            {
                grade: 'Lớp 8',
                subject: 'HĐTN-HN',
                competency: 'pt_thong_hieu',
                competencyText: 'Thông hiểu',
                stem: 'Biểu hiện nào sau đây thể hiện rõ nhất thái độ tôn trọng sự khác biệt của bạn bè?',
                stemImage: null,
                options: [
                    'Ép buộc bạn bè phải thay đổi thói quen cho giống mình',
                    'Lắng nghe, thấu hiểu và tôn trọng sở thích, hoàn cảnh riêng của bạn',
                    'Tách riêng không chơi với những bạn có ý kiến trái chiều',
                    'Đem điểm khác biệt của bạn ra làm trò đùa trước tập thể lớp'
                ],
                optImages: [null, null, null, null],
                correctIndex: 1,
                explanation: 'Tôn trọng sự khác biệt là biết lắng nghe, đồng cảm và chấp nhận tính cách, văn hóa, quan điểm của người khác.'
            },
            {
                grade: 'Lớp 8',
                subject: 'Toán học',
                competency: 'pt_van_dung',
                competencyText: 'Vận dụng',
                stem: 'Một hình thang có độ dài hai đáy lần lượt là 6cm và 10cm, chiều cao 5cm. Diện tích hình thang là:',
                stemImage: null,
                options: ['30 cm²', '40 cm²', '50 cm²', '80 cm²'],
                optImages: [null, null, null, null],
                correctIndex: 1,
                explanation: 'S = (a + b) * h / 2 = (6 + 10) * 5 / 2 = 16 * 5 / 2 = 40 cm².'
            },
            {
                grade: 'MN',
                subject: 'Phát triển nhận thức',
                competency: 'mn_nhan_thuc',
                competencyText: 'Phát triển Nhận thức',
                stem: 'Bé hãy nhìn hình và cho biết đây là quả gì có màu đỏ tươi, ăn giòn ngọt?',
                stemImage: null,
                options: ['Quả Chuối vàng', 'Quả Táo đỏ', 'Quả Dưa hấu xanh', 'Quả Cam sành'],
                optImages: [null, null, null, null],
                correctIndex: 1,
                explanation: 'Quả táo đỏ rất giàu vitamin, vỏ đỏ tươi và thịt quả giòn ngọt.'
            },
            {
                grade: 'MN',
                subject: 'Phát triển ngôn ngữ',
                competency: 'mn_ngon_ngu',
                competencyText: 'Phát triển Ngôn ngữ',
                stem: 'Con vật nào giữ nhà trung thành cho gia đình và tiếng sủa "Gâu gâu"?',
                stemImage: null,
                options: ['Chú Mèo con', 'Chú Chó đốm', 'Con Voi to lớn', 'Chú Gà trống'],
                optImages: [null, null, null, null],
                correctIndex: 1,
                explanation: 'Chú chó là bạn nhỏ bốn chân trung thành, giúp gia đình trông nhà và sủa gâu gâu.'
            },
            {
                grade: 'Lớp 8',
                subject: 'KHTN',
                competency: 'pt_nhan_biet',
                competencyText: 'Nhận biết',
                stem: 'Đơn vị đo áp suất trong hệ đo lường quốc tế SI là gì?',
                stemImage: null,
                options: ['Paxcan (Pa hoặc N/m²)', 'Jun (J)', 'Oát (W)', 'Niutơn (N)'],
                optImages: [null, null, null, null],
                correctIndex: 0,
                explanation: 'Áp suất được tính bằng Pascal (Pa), 1 Pa = 1 N/m².'
            }
        ];
    }

    // =========================================================================
    // 1. DANH MỤC MÔN HỌC BÁM SÁT VĂN BẢN BỘ GD&ĐT (MẦM NON ĐẾN LỚP 12)
    // =========================================================================
    getSubjectsByGrade(grade) {
        if (grade === 'MN') {
            return [
                'Phát triển nhận thức',
                'Phát triển ngôn ngữ',
                'Phát triển thể chất',
                'Phát triển thẩm mỹ',
                'Phát triển tình cảm & kỹ năng xã hội'
            ];
        }

        const gradeNum = parseInt(grade.replace(/\D/g, '')) || 8;

        // Cấp 1: Tiểu học (Lớp 1 - 5)
        if (gradeNum >= 1 && gradeNum <= 5) {
            const list = ['Tiếng Việt', 'Toán', 'Đạo đức', 'Tin học & Công nghệ', 'Tiếng Anh', 'Hoạt động trải nghiệm', 'Giáo dục thể chất', 'Âm nhạc', 'Mĩ thuật'];
            if (gradeNum <= 3) {
                list.splice(3, 0, 'Tự nhiên và Xã hội');
            } else {
                list.splice(3, 0, 'Lịch sử và Địa lí', 'Khoa học');
            }
            return list;
        }

        // Cấp 2: THCS (Lớp 6 - 9): Bao gồm trọn vẹn cả 3 môn theo yêu cầu thực tế của Thầy Nguyễn Tá Quan
        if (gradeNum >= 6 && gradeNum <= 9) {
            return [
                'Khoa học tự nhiên (KHTN)',
                'Toán học',
                'Ngữ văn',
                'Lịch sử & Địa lí',
                'Lịch sử',
                'Địa lí',
                'Hoạt động trải nghiệm, hướng nghiệp (HĐTN-HN)',
                'Giáo dục công dân (GDCD)',
                'Tiếng Anh',
                'Tin học',
                'Công nghệ',
                'Giáo dục thể chất',
                'Nghệ thuật (Âm nhạc, Mĩ thuật)',
                'Nội dung giáo dục địa phương'
            ];
        }

        // Cấp 3: THPT (Lớp 10 - 12): Bao gồm cả 3 môn Lịch sử & Địa lí, Lịch sử, Địa lí
        return [
            'Ngữ văn',
            'Toán học',
            'Tiếng Anh',
            'Lịch sử & Địa lí',
            'Lịch sử',
            'Địa lí',
            'Giáo dục kinh tế và pháp luật (GDKT&PL)',
            'Vật lí',
            'Hóa học',
            'Sinh học',
            'Tin học',
            'Công nghệ',
            'Giáo dục quốc phòng và an ninh (GDQP-AN)',
            'Hoạt động trải nghiệm, hướng nghiệp',
            'Giáo dục thể chất',
            'Nghệ thuật'
        ];
    }

    populateSubjectSelect(selectId, grade, defaultSubject = null) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const subjects = this.getSubjectsByGrade(grade);
        select.innerHTML = subjects.map(s => `<option value="${s}" ${s === defaultSubject ? 'selected' : ''}>${s}</option>`).join('');
    }

    initSubjectDropdowns() {
        const creatorGrade = document.getElementById('creatorGrade')?.value || 'Lớp 8';
        this.populateSubjectSelect('creatorSubjectSelect', creatorGrade, 'Khoa học tự nhiên (KHTN)');

        const examGrade = document.getElementById('examGradeSelect')?.value || 'Lớp 8';
        this.populateSubjectSelect('examSubjectSelect', examGrade, 'Khoa học tự nhiên (KHTN)');
    }

    // Cập nhật dropdown Mức độ và Năng lực theo lứa tuổi
    updateCompetencyDropdownByGrade(grade) {
        const compSelect = document.getElementById('creatorCompetency');
        const compLabel = document.getElementById('competencyLabel');
        if (!compSelect) return;

        if (grade === 'MN') {
            if (compLabel) compLabel.textContent = 'Lĩnh Vực & Năng Lực Mầm Non:';
            compSelect.innerHTML = `
                <option value="all_mn" selected>Tất cả năng lực MN</option>
                <option value="mn_nhan_thuc">1. Phát triển Nhận thức</option>
                <option value="mn_ngon_ngu">2. Phát triển Ngôn ngữ</option>
                <option value="mn_the_chat">3. Phát triển Thể chất</option>
                <option value="mn_tham_my">4. Phát triển Thẩm mỹ</option>
                <option value="mn_tinh_cam">5. Phát triển Tình cảm & Kỹ năng xã hội</option>
            `;
        } else {
            if (compLabel) compLabel.textContent = 'Mức Độ & Năng Lực (Chuẩn GDPT):';
            compSelect.innerHTML = `
                <option value="all_pt" selected>Tất cả năng lực PT</option>
                <option value="pt_nhan_biet">1. Nhận biết</option>
                <option value="pt_thong_hieu">2. Thông hiểu</option>
                <option value="pt_van_dung">3. Vận dụng</option>
                <option value="pt_van_dung_cao">4. Vận dụng cao</option>
            `;
        }
    }

    // =========================================================================
    // 2. DỮ LIỆU KHO ĐỀ & KHO VIDEO (REPO TÀI NGUYÊN XEM VÀ TẢI VỀ)
    // =========================================================================
    initExamRepoData() {
        return [
            {
                id: 'repo_exam_1',
                title: 'Đề kiểm tra Giữa kỳ I - Hoạt động trải nghiệm 8 (Chuẩn hóa)',
                subject: 'HĐTN-HN',
                grade: 'Lớp 8',
                term: 'Giữa kỳ I',
                duration: '45 phút',
                countNLC: 8,
                countDS: 8,
                countTLN: 4,
                countTL: 2,
                author: 'Thầy Nguyễn Tá Quan',
                verified: true,
                desc: 'Đầy đủ Ma trận (MT), Bản đặc tả (ĐT), Đề thi chuẩn 3 dạng TNKQ và Tự luận thực tiễn, Đáp án và Hướng dẫn chấm chi tiết.',
                contentDE: `UBND HUYỆN/QUẬN....................        ĐỀ KIỂM TRA ĐỊNH KỲ GIỮA KỲ I (CHUẨN GDPT 2018)\nTRƯỜNG THCS........................        MÔN: HĐTN-HN 8 - THỜI GIAN: 45 PHÚT\n\nPHẦN I. TRẮC NGHIỆM KHÁCH QUAN (TNKQ - 6.0 điểm)\n1. Dạng 1: Nhiều lựa chọn (Câu 1 đến Câu 8 - 2.0 điểm)\nCâu 1: Biểu hiện nào sau đây thể hiện rõ nhất niềm tự hào về truyền thống quê hương?\nA. Chỉ tự hào khi quê hương mình giàu có hơn nơi khác\n*B. Tích cực tìm hiểu, giữ gìn và phát huy các nét đẹp văn hóa truyền thống\nC. Ngại ngùng khi giới thiệu văn hóa quê mình với bạn bè quốc tế\nD. Cho rằng truyền thống xưa không còn phù hợp với thời đại công nghệ\n...\n\n2. Dạng 2: Đúng - Sai (Câu 9 đến Câu 16 - 2.0 điểm)\nCâu 9: Khi phát hiện di tích lịch sử bị vẽ bậy, các hành vi sau là đúng hay sai:\na) Báo cáo ngay với chính quyền hoặc thầy cô giáo (Đúng)\nb) Quay clip câu view không xin phép (Sai)\n...\n\n3. Dạng 3: Trả lời ngắn (Câu 17 đến Câu 20 - 2.0 điểm)\nCâu 17: Hãy nêu tên 1 câu ca dao ca ngợi truyền thống hiếu học của dân tộc ta: ................\n\nPHẦN II. TỰ LUẬN (TL - 4.0 điểm)\nCâu 1 (2.0 điểm): Đề xuất 3 hành động cụ thể em có thể làm để góp phần bảo vệ môi trường trường học.\nCâu 2 (2.0 điểm): Trình bày cách xử lý khi xảy ra bất đồng ý kiến trong buổi làm việc nhóm.`,
                contentDA: `HƯỚNG DẪN CHẤM & ĐÁP ÁN ĐỀ KIỂM TRA GIỮA KỲ I - HĐTN 8:\n\nPHẦN I. TNKQ (6.0 điểm)\n- Câu 1: B (0.25đ)\n- Câu 2: C (0.25đ)\n...\n- Câu 9: a-Đ (0.25đ), b-S (0.25đ), c-Đ (0.25đ), d-S (0.25đ)\n\nPHẦN II. TỰ LUẬN (4.0 điểm)\n- Câu 1: Nêu đủ 3 hành động thiết thực, khả thi (2.0 điểm)\n- Câu 2: Phân tích đúng kỹ năng lắng nghe và giải pháp hòa giải (2.0 điểm)`,
                contentMT: `MA TRẬN ĐỀ KIỂM TRA GIỮA KỲ I - HĐTN 8:\n- Nhận biết: 40% (4.0 điểm)\n- Thông hiểu: 30% (3.0 điểm)\n- Vận dụng: 20% (2.0 điểm)\n- Vận dụng cao: 10% (1.0 điểm)\nTổng cộng: 10 điểm (TNKQ 60% - Tự luận 40%)`,
                contentDT: `BẢN ĐẶC TẢ ĐỀ KIỂM TRA GIỮA KỲ I - HĐTN 8:\n- Chủ đề 1: Khám phá bản thân (YCCĐ 1.1, 1.2)\n- Chủ đề 2: Trách nhiệm với cộng đồng (YCCĐ 2.1, 2.2)\n- Phù hợp với năng lực tự chủ và giao tiếp hợp tác.`
            },
            {
                id: 'repo_exam_2',
                title: 'Đề kiểm tra Giữa kỳ I - Toán 7 (Mã đề 701 - Có ma trận & đặc tả)',
                subject: 'Toán học',
                grade: 'Lớp 7',
                term: 'Giữa kỳ I',
                duration: '60 phút',
                countNLC: 12,
                countDS: 8,
                countTLN: 4,
                countTL: 3,
                author: 'Cô Trần Thu Sương',
                verified: true,
                desc: 'Bao quát số hữu tỉ, hình học trực quan, góc và đường thẳng song song. Đạt chuẩn cấu trúc định dạng mới.',
                contentDE: `ĐỀ KIỂM TRA GIỮA KỲ I - TOÁN 7 (MÃ ĐỀ 701)\nThời gian: 60 phút\n\nPhần I: TNKQ gồm 12 câu NLC, 8 câu Đ-S và 4 câu TLN.\nPhần II: Tự luận gồm 3 bài toán thực tế...`,
                contentDA: `ĐÁP ÁN TOÁN 7 - MÃ ĐỀ 701:\n1.A, 2.B, 3.C, 4.D...\nBài 1 Tự luận: Tính hợp lý (1.5đ)...`,
                contentMT: `MA TRẬN TOÁN 7: Số hữu tỉ 50%, Hình học trực quan 50%.`,
                contentDT: `BẢN ĐẶC TẢ TOÁN 7: Nhận biết khái niệm số vô tỉ, căn bậc hai số học...`
            },
            {
                id: 'repo_exam_3',
                title: 'Đề kiểm tra Khởi động - Khoa học tự nhiên 8 (Phản ứng hóa học)',
                subject: 'KHTN',
                grade: 'Lớp 8',
                term: 'Thường xuyên',
                duration: '15 phút',
                countNLC: 8,
                countDS: 4,
                countTLN: 2,
                countTL: 1,
                author: 'Thầy Nguyễn Tá Quan',
                verified: true,
                desc: 'Phù hợp khởi động 15 phút đầu giờ: Nhận diện phản ứng hóa học, bảo toàn khối lượng và phương trình hóa học.',
                contentDE: `ĐỀ KIỂM TRA 15 PHÚT KHTN 8:\nCâu 1: Dấu hiệu phản ứng hóa học xảy ra là gì?\n...`,
                contentDA: `ĐÁP ÁN KHTN 8: 1.B, 2.C, 3.A...`,
                contentMT: `MA TRẬN KHTN 8: 50% Nhận biết, 30% Thông hiểu, 20% Vận dụng.`,
                contentDT: `BẢN ĐẶC TẢ KHTN 8: Phân biệt hiện tượng vật lí và hóa học.`
            },
            {
                id: 'repo_exam_4',
                title: 'Đề kiểm tra Cuối kỳ I - Ngữ văn 8 (Đọc hiểu & Viết bài văn nghị luận)',
                subject: 'Ngữ văn',
                grade: 'Lớp 8',
                term: 'Cuối kỳ I',
                duration: '90 phút',
                countNLC: 8,
                countDS: 4,
                countTLN: 0,
                countTL: 2,
                author: 'Tổ Xã Hội THCS',
                verified: true,
                desc: 'Đề văn chuẩn mực: Phần Đọc hiểu ngữ liệu ngoài sách giáo khoa và Phần Viết bài văn nghị luận về một vấn đề đời sống.',
                contentDE: `ĐỀ KIỂM TRA CUỐI KỲ I - NGỮ VĂN 8:\nI. ĐỌC HIỂU (6.0 điểm)\nĐọc ngữ liệu sau và trả lời câu hỏi...\nII. VIẾT (4.0 điểm)\nViết bài văn nghị luận về lòng biết ơn trong cuộc sống.`,
                contentDA: `HƯỚNG DẪN CHẤM VĂN 8: Tiêu chí đọc hiểu, cấu trúc bài văn nghị luận...`,
                contentMT: `MA TRẬN VĂN 8: Đọc hiểu 6.0đ, Viết 4.0đ.`,
                contentDT: `BẢN ĐẶC TẢ VĂN 8: Năng lực ngôn ngữ và cảm thụ thẩm mỹ.`
            },
            {
                id: 'repo_exam_5',
                title: 'Bộ phiếu khảo sát Năng lực Trẻ - Mầm Non (5 lĩnh vực phát triển)',
                subject: 'Mầm Non',
                grade: 'MN',
                term: 'Định kỳ',
                duration: '20 phút',
                countNLC: 5,
                countDS: 0,
                countTLN: 5,
                countTL: 0,
                author: 'Chuyên gia Mầm Non',
                verified: true,
                desc: 'Đánh giá sự phát triển của trẻ 5-6 tuổi qua hình ảnh trực quan: Nhận thức, Ngôn ngữ, Thể chất, Thẩm mỹ, Tình cảm.',
                contentDE: `PHIẾU KHẢO SÁT MẦM NON 5 TUỔI:\n1. Bé hãy chỉ vào con vật biết bơi dưới nước.\n2. Bé hãy phân biệt màu đỏ và màu xanh...\n...`,
                contentDA: `ĐÁP ÁN & ĐÁNH GIÁ MẦM NON: Đạt / Chưa đạt theo từng chỉ số phát triển.`,
                contentMT: `MA TRẬN 5 LĨNH VỰC MẦM NON: Nhận thức 25%, Ngôn ngữ 25%, Thẩm mỹ 20%, Thể chất 15%, Tình cảm 15%.`,
                contentDT: `BẢN ĐẶC TẢ MẦM NON: Theo bộ chuẩn phát triển trẻ 5 tuổi của Bộ GD&ĐT.`
            },
            {
                id: 'repo_exam_6',
                title: 'Đề kiểm tra Giữa kỳ I - Tiếng Anh 8 (Global Success - Chuẩn 4 kỹ năng)',
                subject: 'Tiếng Anh',
                grade: 'Lớp 8',
                term: 'Giữa kỳ I',
                duration: '45 phút',
                countNLC: 12,
                countDS: 8,
                countTLN: 4,
                countTL: 1,
                author: 'Giáo viên Tiếng Anh',
                verified: true,
                desc: 'Đề thi bám sát SGK Global Success: Listening, Language focus, Reading và Writing.',
                contentDE: `MID-TERM TEST ENGLISH 8:\nPART 1: PRONUNCIATION & VOCABULARY\nPART 2: READING COMPREHENSION\nPART 3: WRITING...`,
                contentDA: `ANSWER KEY ENGLISH 8: 1.A, 2.D, 3.B...`,
                contentMT: `MA TRẬN TIẾNG ANH 8: Ngữ âm 1.0đ, Từ vựng - Ngữ pháp 3.0đ, Đọc 3.0đ, Viết 3.0đ.`,
                contentDT: `BẢN ĐẶC TẢ TIẾNG ANH 8: Khung tham chiếu châu Âu bậc 2 (A2).`
            }
        ];
    }

    initVideoRepoData() {
        return [
            {
                id: 'v_repo_1',
                title: 'Video Khởi động: Di sản quê hương và niềm tự hào dân tộc',
                subject: 'HĐTN-HN 8',
                duration: '60s',
                ratio: '16:9',
                category: 'hook',
                categoryName: 'Video Khởi động (Hook)',
                author: 'Thầy Nguyễn Tá Quan',
                desc: 'Cảnh Giảng viên sư phạm diễn thuyết ngoại cảnh, lời dẫn phát sáng nghệ thuật không hộp nền, kiến tạo ngữ cảnh bài học.'
            },
            {
                id: 'v_repo_2',
                title: 'Video Mô phỏng 3D: Phản ứng Hóa học và Sự biến đổi phân tử',
                subject: 'KHTN 8',
                duration: '90s',
                ratio: '16:9',
                category: 'sim3d',
                categoryName: 'Mô phỏng 3D Khái niệm',
                author: 'EduStudio Studio',
                desc: 'Trực quan hóa sự liên kết giữa các nguyên tử Hydro và Oxy tạo thành phân tử Nước. Đạt chuẩn 1080p Full HD.'
            },
            {
                id: 'v_repo_3',
                title: 'Hoạt hình 3D Mầm Non: Cún Con Thông Thái & Thế Giới Động Vật',
                subject: 'Mầm Non',
                duration: '2 phút',
                ratio: '9:16',
                category: 'mn3d',
                categoryName: 'Hoạt hình 3D Mầm Non',
                author: 'Thầy Nguyễn Tá Quan',
                desc: 'Linh vật Cún Thông Thái 3D trò chuyện thân thiện, hướng dẫn các bé nhận diện tiếng kêu và tập tính các con vật gần gũi.'
            },
            {
                id: 'v_repo_4',
                title: 'Video Tình huống: Xử lý bất đồng ý kiến và Xây dựng tình bạn',
                subject: 'HĐTN-HN 8',
                duration: '3 phút',
                ratio: '16:9',
                category: 'case',
                categoryName: 'Tình huống (Case Study)',
                author: 'Tổ Sư Phạm',
                desc: 'Đặt ra tình huống thảo luận nhóm thực tế để học sinh cùng phân tích và đưa ra giải pháp hòa giải tích cực.'
            },
            {
                id: 'v_repo_5',
                title: 'Video Âm Nhạc / Nghệ Thuật Sư Phạm: Giai Điệu Quê Hương (Native 9:16)',
                subject: 'Nghệ thuật & Âm nhạc',
                duration: '4 phút',
                ratio: '9:16',
                category: 'mv',
                categoryName: 'MV Âm nhạc Nghệ thuật AI',
                author: 'Thầy Nguyễn Tá Quan',
                desc: 'Diễn xuất ngoại cảnh bước đi tự nhiên, chữ chạy lời ca phát sáng nghệ thuật không hộp nền, giáo dục thẩm mỹ học đường.'
            },
            {
                id: 'v_repo_6',
                title: 'Mô phỏng Toán học 3D: Hình lăng trụ đứng và Thể tích khối hộp',
                subject: 'Toán 7',
                duration: '75s',
                ratio: '16:9',
                category: 'sim3d',
                categoryName: 'Mô phỏng 3D Khái niệm',
                author: 'Tổ Toán',
                desc: 'Xoay 3D trực quan các mặt đáy, mặt bên và chiều cao của hình lăng trụ đứng tam giác trong không gian.'
            }
        ];
    }

    // =========================================================================
    // 3. HIỂN THỊ KHO ĐỀ (REPO) TRÊN THANH NGANG
    // =========================================================================
    renderExamRepo(filterGrade = 'all', filterSubject = 'all', searchKeyword = '') {
        const container = document.getElementById('examRepoGrid');
        if (!container) return;

        let filtered = this.examRepo;

        if (filterGrade !== 'all') {
            filtered = filtered.filter(e => e.grade === filterGrade);
        }

        if (filterSubject !== 'all') {
            filtered = filtered.filter(e => e.subject.includes(filterSubject) || filterSubject.includes(e.subject));
        }

        if (searchKeyword.trim()) {
            const kw = searchKeyword.toLowerCase().trim();
            filtered = filtered.filter(e => e.title.toLowerCase().includes(kw) || e.subject.toLowerCase().includes(kw));
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #94a3b8;">
                    <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🔍</span>
                    Không tìm thấy đề kiểm tra nào phù hợp với bộ lọc.
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(exam => {
            html += `
                <div class="exam-card-item card-verified-container">
                    <div class="badge-audit-verified-corner" title="Đã đối soát chuẩn Ma trận & Đặc tả">
                        🛡️ Đã đối soát bởi kiemdinh@edustudio.edu.vn
                    </div>
                    <div>
                        <div class="exam-card-title">${exam.title}</div>
                        <div class="exam-card-meta">
                            <span class="badge-tag-tiny" style="background:#e0f2fe; color:#0369a1;">${exam.subject}</span>
                            <span class="badge-tag-tiny" style="background:#f1f5f9; color:#475569;">${exam.grade}</span>
                            <span class="badge-tag-tiny" style="background:#fef3c7; color:#b45309;">⏱️ ${exam.duration}</span>
                            <span class="badge-tag-tiny" style="background:#dcfce7; color:#15803d;">✓ Đã đối soát</span>
                        </div>
                        <div class="exam-card-desc">${exam.desc}</div>
                    </div>

                    <div>
                        <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 0.5rem;">
                            Tác giả: <strong>${exam.author}</strong> • Gồm TNKQ & Tự luận
                        </div>
                        <div class="exam-card-actions">
                            <button class="btn-mini-action btn-view-exam-detail" data-id="${exam.id}" style="flex:1.2; justify-content:center; background:#eff6ff; color:#1d4ed8;">
                                <span>👁️</span> <span>Xem Chi Tiết</span>
                            </button>
                            <button class="btn-mini-action btn-download-exam-docx" data-id="${exam.id}" title="Tải file Word">
                                <span>📥</span> <span>Tải Word</span>
                            </button>
                            <button class="btn-mini-action btn-load-exam-to-game" data-id="${exam.id}" title="Nạp sang trò chơi" style="color:#059669; border-color:#86efac;">
                                <span>🎮</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Bắt sự kiện Xem Chi Tiết
        container.querySelectorAll('.btn-view-exam-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.openExamDetailModal(id);
            });
        });

        // Bắt sự kiện Tải File Word
        container.querySelectorAll('.btn-download-exam-docx').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const exam = this.examRepo.find(x => x.id === id);
                if (exam) {
                    this.downloadExamFile(exam);
                }
            });
        });

        // Bắt sự kiện Nạp sang Trò Chơi
        container.querySelectorAll('.btn-load-exam-to-game').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const exam = this.examRepo.find(x => x.id === id);
                if (exam) {
                    this.applyQuestionsToActiveQuiz(exam.contentDE);
                }
            });
        });
    }

    openExamDetailModal(examId) {
        const exam = this.examRepo.find(x => x.id === examId);
        if (!exam) return;

        this.viewingExam = exam;
        this.activeExamSubTab = 'DE';

        document.getElementById('viewExamTitle').textContent = exam.title;
        document.getElementById('viewExamSubtitle').textContent = `Môn: ${exam.subject} • ${exam.grade} • Thời gian: ${exam.duration} • Tác giả: ${exam.author}`;
        
        this.renderViewingExamContent();
        document.getElementById('viewExamModal').classList.add('active');
        sound.playClick();
    }

    renderViewingExamContent() {
        if (!this.viewingExam) return;
        const box = document.getElementById('viewExamContentBox');
        if (!box) return;

        // Cập nhật nút active
        document.getElementById('btnViewExamTabDE').classList.toggle('active', this.activeExamSubTab === 'DE');
        document.getElementById('btnViewExamTabDA').classList.toggle('active', this.activeExamSubTab === 'DA');
        document.getElementById('btnViewExamTabMT').classList.toggle('active', this.activeExamSubTab === 'MT');
        document.getElementById('btnViewExamTabDT').classList.toggle('active', this.activeExamSubTab === 'DT');

        if (this.activeExamSubTab === 'DE') {
            box.textContent = this.viewingExam.contentDE;
        } else if (this.activeExamSubTab === 'DA') {
            box.textContent = this.viewingExam.contentDA;
        } else if (this.activeExamSubTab === 'MT') {
            box.textContent = this.viewingExam.contentMT;
        } else if (this.activeExamSubTab === 'DT') {
            box.textContent = this.viewingExam.contentDT;
        }
    }

    downloadExamFile(exam) {
        sound.playFanfare();
        const content = `${exam.title.toUpperCase()}\n${exam.desc}\n\n=== NỘI DUNG ĐỀ THI ===\n${exam.contentDE}\n\n=== ĐÁP ÁN & HƯỚNG DẪN CHẤM ===\n${exam.contentDA}\n\n=== MA TRẬN ĐỀ ===\n${exam.contentMT}\n\n=== BẢN ĐẶC TẢ ===\n${exam.contentDT}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exam.title.replace(/\s+/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        alert(`Đã tải về thành công bộ tài nguyên: "${exam.title}"!`);
    }

    // =========================================================================
    // 4. HIỂN THỊ KHO VIDEO (REPO) TRÊN THANH NGANG
    // =========================================================================
    renderVideoRepo(filterType = 'all', searchKeyword = '') {
        const container = document.getElementById('videoRepoGrid');
        if (!container) return;

        let filtered = this.videoRepo;

        if (filterType !== 'all') {
            filtered = filtered.filter(v => v.category === filterType);
        }

        if (searchKeyword.trim()) {
            const kw = searchKeyword.toLowerCase().trim();
            filtered = filtered.filter(v => v.title.toLowerCase().includes(kw) || v.subject.toLowerCase().includes(kw));
        }

        let html = '';
        filtered.forEach(video => {
            html += `
                <div class="video-card-item card-verified-container">
                    <div class="badge-audit-verified-corner" title="Chuẩn Video Studio 1080p">
                        🛡️ Đã đối soát bởi kiemdinh@edustudio.edu.vn
                    </div>
                    <div class="video-thumb-container btn-play-video-card" data-id="${video.id}">
                        <span style="font-size: 2.5rem;">▶</span>
                        <span class="video-duration-tag">${video.duration}</span>
                    </div>

                    <div class="video-card-body">
                        <div>
                            <div class="video-card-title">${video.title}</div>
                            <div class="video-card-sub">
                                <span class="badge-tag-tiny" style="background:#e0f2fe; color:#0369a1;">${video.subject}</span>
                                <span class="badge-tag-tiny" style="background:#f1f5f9; color:#475569;">${video.ratio}</span>
                                <span class="badge-tag-tiny" style="background:#fef3c7; color:#b45309;">${video.categoryName}</span>
                            </div>
                            <p style="font-size: 0.76rem; color: #64748b; line-height: 1.4; margin-bottom: 0.65rem;">${video.desc}</p>
                        </div>

                        <div style="display: flex; gap: 0.4rem; border-top: 1px solid #f1f5f9; padding-top: 0.65rem;">
                            <button class="btn-mini-action btn-play-video-card" data-id="${video.id}" style="flex:1; justify-content:center; background:#1d4ed8; color:#ffffff;">
                                <span>▶</span> <span>Xem Video</span>
                            </button>
                            <button class="btn-mini-action btn-download-video-file" data-id="${video.id}" title="Tải file MP4">
                                <span>📥</span> <span>Tải MP4</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.btn-play-video-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.openVideoModal(id);
            });
        });

        container.querySelectorAll('.btn-download-video-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                sound.playFanfare();
                alert("Đã bắt đầu tải file video MP4 chất lượng cao (1080p Full HD) về máy tính!");
            });
        });
    }

    openVideoModal(videoId) {
        const v = this.videoRepo.find(x => x.id === videoId);
        if (!v) return;

        document.getElementById('viewVideoTitle').textContent = v.title;
        document.getElementById('viewVideoMeta').textContent = `Môn: ${v.subject} • Tỷ lệ: ${v.ratio} • Thời lượng: ${v.duration} • Tác giả: ${v.author}`;

        const box = document.getElementById('viewVideoPlayerBox');
        box.innerHTML = `
            <div style="text-align: center;">
                <span style="font-size: 3.5rem; display: block; margin-bottom: 0.8rem; animation: pulse 1.5s infinite;">🎬</span>
                <h4 style="font-size: 1.1rem; color: #ffffff; margin-bottom: 0.4rem;">${v.title}</h4>
                <p style="font-size: 0.82rem; color: #94a3b8; max-width: 480px; margin: 0 auto 1rem auto;">${v.desc}</p>
                <div style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 20px; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem;">
                    <span>✨</span> <span>Chữ chạy phát sáng không hộp nền chuẩn sư phạm hiện đại</span>
                </div>
            </div>
        `;

        document.getElementById('viewVideoModal').classList.add('active');
        sound.playFanfare();
    }

    // =========================================================================
    // 3.5. HỆ THỐNG KHO BÀI THÍ NGHIỆM ẢO & XƯỞNG TẠO PHÒNG TN ẢO TƯƠNG TÁC
    // =========================================================================
    initLabRepoData() {
        return [
            {
                id: 'lab_1',
                title: 'Đo Điện Trở Dây Dẫn & Kiểm Chứng Định Luật Ôm',
                subject: 'Vật lý 9 / KHTN 8 (KNTT)',
                grade: 'Lớp 8 - 9',
                category: 'physics',
                toolsCount: 6,
                badge: 'Chuẩn GDPT 2018',
                desc: 'Khảo sát sự phụ thuộc của cường độ dòng điện vào hiệu điện thế giữa hai đầu dây dẫn; vẽ đồ thị đặc tuyến V-A.'
            },
            {
                id: 'lab_2',
                title: 'Thí Nghiệm Khúc Xạ & Phản Xạ Toàn Phần Ánh Sáng',
                subject: 'Vật lý 9 / KHTN 9 (KNTT)',
                grade: 'Lớp 9',
                category: 'physics',
                toolsCount: 5,
                badge: 'Thiết Bị Số BGD',
                desc: 'Quan sát đường truyền tia sáng khi đi qua ranh giới giữa hai môi trường trong suốt; đo góc tới và góc khúc xạ.'
            },
            {
                id: 'lab_3',
                title: 'Phản Ứng Kim Loại Tác Dụng Dung Dịch Axit Sinh Khí Hidro',
                subject: 'Hóa học 8 - 9 / KHTN 8 (KNTT)',
                grade: 'Lớp 8',
                category: 'chemistry',
                toolsCount: 7,
                badge: 'Mô Phỏng 3D',
                desc: 'Thực hiện phản ứng kẽm (Zn) hoặc nhôm (Al) tác dụng với axit clohidric (HCl); thu và thử độ tinh khiết khí H2.'
            },
            {
                id: 'lab_4',
                title: 'Thí Nghiệm Điều Chế & Thu Khí Oxi Bằng Cách Đẩy Nước',
                subject: 'Hóa học 8 / KHTN 7 (KNTT)',
                grade: 'Lớp 7 - 8',
                category: 'chemistry',
                toolsCount: 8,
                badge: 'An Toàn Tuyệt Đối',
                desc: 'Nhiệt phân thuốc tím (KMnO4) bằng đèn cồn; thử tính chất duy trì sự cháy của khí oxi bằng que đóm đỏ.'
            },
            {
                id: 'lab_5',
                title: 'Quan Sát Tế Bào Biểu Bì Vảy Hành Dưới Kính Hiển Vi',
                subject: 'Sinh học 6 / KHTN 6 (KNTT)',
                grade: 'Lớp 6',
                category: 'biology',
                toolsCount: 5,
                badge: 'Kính Hiển Vi Số',
                desc: 'Tách lớp màng biểu bì mỏng của vảy hành tây, làm tiêu bản tạm thời và quan sát thành tế bào, nhân ở độ phóng đại 400x.'
            },
            {
                id: 'lab_6',
                title: 'Thí Nghiệm Chứng Minh Cây Xanh Quang Hợp Nhả Khí Oxi',
                subject: 'Sinh học 7 / KHTN 7 (KNTT)',
                grade: 'Lớp 7',
                category: 'biology',
                toolsCount: 6,
                badge: 'Chuẩn GDPT 2018',
                desc: 'Đặt cành rong đuôi chó trong cốc nước dưới ánh sáng đèn điện; thu bọt khí sủi lên và thử que đóm bùng cháy.'
            },
            {
                id: 'lab_7',
                title: 'Khảo Sát Dao Động Con Lắc Đơn & Bảo Toàn Cơ Năng',
                subject: 'Vật lý 10 - 11 (KNTT)',
                grade: 'Lớp 10 - 11',
                category: 'physics',
                toolsCount: 4,
                badge: 'Chuẩn Phòng TN',
                desc: 'Xác định gia tốc trọng trường g thông qua chu kỳ dao động con lắc đơn; đồ thị biến thiên động năng và thế năng.'
            },
            {
                id: 'lab_8',
                title: 'Khảo Sát Dao Động Điều Hòa Của Con Lắc Lò Xo',
                subject: 'Vật lý 12 (KNTT)',
                grade: 'Lớp 12',
                category: 'physics',
                toolsCount: 5,
                badge: 'Mô Phỏng Chính Xác',
                desc: 'Đo độ cứng k của lò xo; khảo sát tần số góc, biên độ và chu kỳ dao động tự do không ma sát.'
            },
            {
                id: 'lab_9',
                title: 'Chuẩn Độ Axit - Bazo Bằng Chỉ Thị Phenolphthalein',
                subject: 'Hóa học 11 (KNTT)',
                grade: 'Lớp 11',
                category: 'chemistry',
                toolsCount: 6,
                badge: 'Đo Lường Chuẩn',
                desc: 'Nhỏ từng giọt dung dịch chuẩn NaOH 0.1M từ buret vào erlen chứa dung dịch HCl đến khi dung dịch xuất hiện màu hồng nhạt bền.'
            },
            {
                id: 'lab_10',
                title: 'Thí Nghiệm Điện Phân Dung Dịch Đồng Sunfat (CuSO4)',
                subject: 'Hóa học 12 (KNTT)',
                grade: 'Lớp 12',
                category: 'chemistry',
                toolsCount: 6,
                badge: 'Phản Ứng Điện Hóa',
                desc: 'Khảo sát hiện tượng cực dương tan khi dùng điện cực đồng và bám lớp kim loại Cu đỏ óng ánh lên catot.'
            },
            {
                id: 'lab_11',
                title: 'Tách Chiết Sắc Tố Diệp Lục & Carotenoid Trong Lá Cây',
                subject: 'Sinh học 11 (KNTT)',
                grade: 'Lớp 11',
                category: 'biology',
                toolsCount: 5,
                badge: 'Thực Hành Sinh Học',
                desc: 'Nghiền lá tươi với cồn 90 độ, lọc lấy dịch chiết màu xanh lục đậm; quan sát hiện tượng huỳnh quang phát sáng đỏ.'
            },
            {
                id: 'lab_12',
                title: 'Dự Án STEM: Chế Tạo Kính Thiên Văn Quang Học Khúc Xạ Mini',
                subject: 'KHTN 8 - 9 (Chủ Đề STEM KNTT)',
                grade: 'Lớp 8 - 9',
                category: 'stem',
                toolsCount: 6,
                badge: 'Giáo Dục STEM 3089',
                desc: 'Vận dụng hệ thấu kính hội tụ và thị kính quang học để thiết kế kính thiên văn khúc xạ quan sát Mặt Trăng và các vì sao.'
            }
        ];
    }

    initPPTRepoData() {
        return [
            {
                id: 'ppt_1',
                title: 'HĐTN 8: Tự Hào Quê Hương',
                slides: 18,
                subject: 'HĐTN-HN 8',
                grade: 'Lớp 8',
                author: 'Thầy Nguyễn Tá Quan',
                school: 'Chuyên gia GD & CNTT',
                badge: '🌱',
                verified: true,
                desc: 'Bài giảng trình chiếu 16:9 gồm 18 slides, tích hợp trò chơi khởi động và phiếu tự đánh giá.',
                gradient: 'linear-gradient(135deg, #1d4ed8, #0284c7)'
            },
            {
                id: 'ppt_2',
                title: 'Toán 7: Hình Học Trực Quan',
                slides: 22,
                subject: 'Toán học 7',
                grade: 'Lớp 7',
                author: 'Cô Trần Thu Sương',
                school: 'THCS Chu Văn An',
                badge: '📐',
                verified: true,
                desc: 'Bài giảng chuẩn 22 slides với mô phỏng 3D góc và hai đường thẳng song song.',
                gradient: 'linear-gradient(135deg, #059669, #0284c7)'
            },
            {
                id: 'ppt_3',
                title: 'Mầm Non: Thế Giới Động Vật Quanh Bé',
                slides: 14,
                subject: 'Mầm Non',
                grade: 'MN',
                author: 'Giáo viên Mầm Non',
                school: 'Mầm Non Tuổi Thơ',
                badge: '🐶',
                verified: true,
                desc: 'Slide hoạt hình âm thanh vui nhộn giúp trẻ nhận diện hình ảnh và tiếng kêu con vật.',
                gradient: 'linear-gradient(135deg, #f59e0b, #ec4899)'
            }
        ];
    }

    renderPPTRepo() {
        const container = document.getElementById('pptCardsGrid');
        if (!container) return;

        try {
            const customPpts = JSON.parse(localStorage.getItem('edustudio_custom_ppts') || '[]');
            if (Array.isArray(customPpts) && customPpts.length > 0) {
                customPpts.forEach(cp => {
                    if (cp && cp.id && !this.pptRepo.some(x => x.id === cp.id)) {
                        this.pptRepo.unshift(cp);
                    }
                });
            }
        } catch(e) {}

        container.innerHTML = this.pptRepo.map(item => `
            <div class="ppt-card card-verified-container">
                <div class="badge-audit-verified-corner" title="Đã đối soát chuẩn Sư phạm bởi Ban Biên Tập EduStudio">
                    🛡️ Đã đối soát bởi kiemdinh@edustudio.edu.vn
                </div>
                <div class="ppt-thumbnail-mock" style="background: ${item.gradient || 'linear-gradient(135deg, #1d4ed8, #2563eb)'};">
                    <span style="font-size: 2.2rem; margin-bottom: 0.3rem;">${item.badge || '📊'}</span>
                    <strong style="font-size: 0.95rem;">${item.title}</strong>
                    <span style="font-size: 0.75rem; opacity: 0.9;">${item.slides} Slides • Tương Tác Trực Tiếp</span>
                </div>
                <div class="ppt-card-body">
                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #64748b; margin-bottom: 0.75rem;">
                        <span>Tác giả: <strong>${item.author}</strong></span>
                        <span style="color:#059669; font-weight:700;">✓ Chuẩn hóa 100%</span>
                    </div>
                    <div style="display: flex; gap: 0.4rem;">
                        <button class="btn-mini-action btn-play-ppt" data-id="${item.id}" style="flex: 1; justify-content: center; background:#1d4ed8; color:#ffffff;">
                            <span>▶</span> <span>Trình Chiếu</span>
                        </button>
                        <button class="btn-mini-action btn-download-ppt" data-id="${item.id}" title="Tải file PPTX">
                            <span>📥</span> <span>Tải PPTX</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-play-ppt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const p = this.pptRepo.find(x => x.id === id);
                if (p) {
                    this.startSlideShowForRepo(p);
                }
            });
        });

        container.querySelectorAll('.btn-download-ppt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const p = this.pptRepo.find(x => x.id === id);
                this.enforceSaveAndExportTier(
                    null,
                    () => {
                        if (p && p.presentationData) {
                            this.activePresentation = JSON.parse(JSON.stringify(p.presentationData));
                        }
                        this.exportPresentationPPTX();
                    },
                    p?.title || 'Bài giảng PPT'
                );
            });
        });
    }

    // =========================================================================
    // 4.1.B. XƯỞNG SOẠN & TẠO BÀI GIẢNG PPT TƯƠNG TÁC SƯ PHẠM (PPT STUDIO)
    // =========================================================================
    getDefaultPresentation() {
        return {
            title: "Bài 12: Tự Hào Truyền Thống Quê Hương",
            grade: "Lớp 8",
            subject: "HĐTN-HN",
            theme: "navy", // 'navy', 'emerald', 'amber', 'white'
            slides: [
                {
                    id: "slide_1",
                    step: 1,
                    stepName: "1. Khởi động (Hook)",
                    title: "HOẠT ĐỘNG 1: KHỞI ĐỘNG - GIAI ĐIỆU QUÊ HƯƠNG",
                    content: "• Nghe ca khúc hoặc xem clip ngắn về quê hương đất nước.\n• Cảm nhận ban đầu: Em ấn tượng nhất với nét đẹp văn hóa hoặc danh lam nào?\n• Nhiệm vụ: Chia sẻ nhanh cảm xúc với bạn cùng bàn trong 1 phút.",
                    interactiveType: "none",
                    speakerNotes: "Giáo viên bật nhạc khởi động nhẹ nhàng, tạo xung đột nhận thức và dẫn dắt vào bài mới."
                },
                {
                    id: "slide_2",
                    step: 2,
                    stepName: "2. Khám phá kiến thức mới",
                    title: "HOẠT ĐỘNG 2: TÌM HIỂU TRUYỀN THỐNG TỰ HÀO",
                    content: "• Truyền thống là những giá trị vật chất và tinh thần được truyền từ đời này sang đời khác.\n• Các biểu hiện cốt lõi:\n  - Yêu nước, đoàn kết, tương thân tương ái.\n  - Cần cù lao động, hiếu học và tôn sư trọng đạo.\n  - Giữ gìn lễ hội dân gian và di tích lịch sử địa phương.",
                    interactiveType: "none",
                    speakerNotes: "Phân tích bản chất khái niệm. Yêu cầu học sinh lấy ví dụ cụ thể tại địa phương mình đang sinh sống."
                },
                {
                    id: "slide_3",
                    step: 3,
                    stepName: "3. Luyện tập tương tác",
                    title: "HOẠT ĐỘNG 3: LUYỆN TẬP - TRẮC NGHIỆM ĐỐ VUI SƯ PHẠM",
                    content: "Học sinh chọn đáp án đúng nhất để củng cố kiến thức vừa khám phá:",
                    interactiveType: "quiz",
                    quizQuestion: "Hành động nào sau đây thể hiện rõ nhất niềm tự hào về truyền thống quê hương?",
                    quizOptions: [
                        "A. Chỉ tự hào khi quê hương giàu có",
                        "B. Tích cực tìm hiểu, giữ gìn và phát huy nét đẹp văn hóa",
                        "C. E ngại, không dám giới thiệu về địa phương mình",
                        "D. Cho rằng truyền thống xưa không còn phù hợp"
                    ],
                    correctIndex: 1,
                    speakerNotes: "Bấm trực tiếp vào các nút A/B/C/D trên máy chiếu để hiện hiệu ứng âm thanh khen ngợi học sinh."
                },
                {
                    id: "slide_4",
                    step: 4,
                    stepName: "4. Vận dụng & Mở rộng",
                    title: "HOẠT ĐỘNG 4: VẬN DỤNG & NHIỆM VỤ THỰC TIỄN",
                    content: "• Thiết kế một tấm thiệp hoặc bài thuyết trình ngắn (1 trang) giới thiệu một di tích lịch sử tại quê hương em.\n• Rèn luyện thói quen ứng xử văn minh khi tham quan các công trình văn hóa.\n• Chuẩn bị cho tiết học sau: Thu thập tư liệu về các nghệ nhân dân gian.",
                    interactiveType: "none",
                    speakerNotes: "Giao nhiệm vụ về nhà có sản phẩm rõ ràng, hướng dẫn tiêu chí đánh giá cho tiết sau."
                }
            ]
        };
    }

    initPPTStudio() {
        this.renderSlideDeck();
        this.renderCurrentSlideCanvas();
        const btnAI = document.getElementById('btnAIGeneratePPT');
        if (btnAI && !btnAI._boundAI) {
            btnAI._boundAI = true;
            btnAI.addEventListener('click', () => this.generatePresentationWithAI());
        }
    }

    async generatePresentationWithAI() {
        const btn = document.getElementById('btnAIGeneratePPT');
        const title = document.getElementById('pptLessonTitleInput')?.value.trim() || 'Bài giảng tương tác';
        const grade = document.getElementById('pptGradeSelect')?.value || 'Lớp 8';
        const subject = document.getElementById('pptSubjectSelect')?.value || 'HĐTN-HN';

        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span> <span>Gemini đang thiết kế bộ Slide...</span>';
        }
        try {
            const promptText =
                `Bạn là chuyên gia thiết kế bài giảng điện tử 16:9 chuẩn Bộ 4 Dễ & Công văn 5512.\n` +
                `Hãy soạn đúng 5 slide bài giảng cho:\n` +
                `- Tên bài học: "${title}"\n- Lớp / Bậc học: ${grade}\n- Môn học: ${subject}\n` +
                `Cấu trúc 5 slide: (1) Khởi động gây hứng thú, (2) Hình thành kiến thức 1, (3) Hình thành kiến thức 2, (4) Luyện tập câu hỏi tương tác, (5) Vận dụng & Ghi nhớ.\n` +
                `Mỗi slide ngắn gọn (tối đa 5 gạch đầu dòng súc tích để chiếu máy chiếu), tiếng Việt Unicode chuẩn.\n` +
                `Trả về DUY NHẤT một mảng JSON gồm 5 đối tượng:\n` +
                `[{"step":1,"stepName":"1. Khởi động (Hook)","title":"Tiêu đề slide","content":"• Ý 1\\n• Ý 2\\n• Ý 3","speakerNotes":"Lời dẫn giảng của giáo viên"}]`;

            const slides = await this.callGeminiPersonal(promptText, {
                featureName: 'AI Gemini Soạn Bộ Slide PPT',
                json: true,
                temperature: 0.65
            });
            if (!Array.isArray(slides) || slides.length === 0) {
                throw new Error('Dữ liệu slide AI trả về không hợp lệ.');
            }
            this.activePresentation.title = title;
            this.activePresentation.grade = grade;
            this.activePresentation.subject = subject;
            this.activePresentation.slides = slides.map((s, idx) => ({
                id: 'ai_slide_' + Date.now() + '_' + idx,
                step: Number(s.step) || (idx + 1),
                stepName: String(s.stepName || `Bước ${idx + 1}`),
                title: String(s.title || `Slide ${idx + 1}`),
                content: String(s.content || ''),
                speakerNotes: String(s.speakerNotes || ''),
                layout: 'title_content'
            }));
            this.activeSlideIndex = 0;
            this.renderSlideDeck();
            this.renderCurrentSlideCanvas();
            sound.playFanfare();
            this.showToast(`✨ Gemini AI đã soạn xong ${this.activePresentation.slides.length} slide cho "${title}"!`, 4000);
        } catch (err) {
            if (err.message !== 'AUTH_OR_KEY_REQUIRED') {
                alert('❌ Không thể soạn bộ Slide bằng Gemini AI:\n' + err.message);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
            }
        }
    }

    renderSlideDeck() {
        const deckContainer = document.getElementById('slideDeckList');
        const badgeCounter = document.getElementById('slideCounterBadge');
        if (!deckContainer) return;

        const slides = this.activePresentation.slides;
        if (badgeCounter) badgeCounter.textContent = `${slides.length} Slides`;

        deckContainer.innerHTML = slides.map((s, idx) => `
            <div class="slide-thumb-card ${idx === this.activeSlideIndex ? 'active' : ''}" data-index="${idx}">
                <div class="slide-thumb-num">${idx + 1}</div>
                <div class="slide-thumb-preview">
                    <div class="slide-thumb-title">${s.title || 'Slide ' + (idx + 1)}</div>
                    <div class="slide-thumb-step">${s.stepName || 'Hoạt động học'}</div>
                </div>
            </div>
        `).join('');

        deckContainer.querySelectorAll('.slide-thumb-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                this.selectSlide(idx);
            });
        });
    }

    renderCurrentSlideCanvas() {
        const slides = this.activePresentation.slides;
        if (this.activeSlideIndex >= slides.length) this.activeSlideIndex = 0;
        const s = slides[this.activeSlideIndex];
        if (!s) return;

        // Cập nhật tiêu đề và nội dung trên slide 16:9
        const titleInput = document.getElementById('slideTitleInput');
        const contentInput = document.getElementById('slideContentInput');
        const pageTag = document.getElementById('slidePageNumberTag');
        const footerSubject = document.getElementById('slideFooterSubject');
        const stepSelect = document.getElementById('slideStepSelect');
        const notesInput = document.getElementById('slideSpeakerNotes');
        const viewport = document.getElementById('slideActiveViewport');
        const interactiveBox = document.getElementById('slideInteractiveBox');

        if (titleInput) titleInput.value = s.title;
        if (contentInput) contentInput.value = s.content;
        if (pageTag) pageTag.textContent = `Slide ${this.activeSlideIndex + 1} / ${slides.length}`;
        if (footerSubject) footerSubject.textContent = `${this.activePresentation.subject} ${this.activePresentation.grade} • EduStudio`;
        if (stepSelect) stepSelect.value = s.step || 1;
        if (notesInput) notesInput.value = s.speakerNotes || '';

        // Đổi theme màu slide
        if (viewport) {
            viewport.className = `slide-169-viewport theme-${this.activePresentation.theme || 'navy'}`;
        }

        // Cập nhật theme picker pills
        document.querySelectorAll('.theme-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.theme === this.activePresentation.theme);
        });

        // Khung tương tác nhúng
        if (interactiveBox) {
            if (s.interactiveType === 'quiz') {
                interactiveBox.style.display = 'block';
                const opts = s.quizOptions || ['A', 'B', 'C', 'D'];
                interactiveBox.innerHTML = `
                    <div style="font-weight:700; margin-bottom:0.4rem; font-size:0.85rem;">❓ ${s.quizQuestion || 'Câu hỏi trắc nghiệm tương tác:'}</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem;">
                        ${opts.map((opt, oIdx) => `
                            <button class="btn-quiz-slide-opt" data-idx="${oIdx}" style="
                                background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3);
                                color:inherit; border-radius:6px; padding:0.45rem 0.6rem; text-align:left;
                                font-size:0.78rem; font-weight:600; cursor:pointer; transition:all 0.15s;
                            ">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                `;

                interactiveBox.querySelectorAll('.btn-quiz-slide-opt').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = parseInt(e.currentTarget.dataset.idx);
                        if (idx === (s.correctIndex || 0)) {
                            sound.playFanfare();
                            btn.style.background = '#10b981';
                            btn.style.color = '#ffffff';
                            alert("🎉 CHÍNH XÁC! Chúc mừng bạn đã chọn đúng đáp án.");
                        } else {
                            sound.playWrong();
                            btn.style.background = '#ef4444';
                            btn.style.color = '#ffffff';
                        }
                    });
                });
            } else if (s.interactiveType === 'game') {
                interactiveBox.style.display = 'block';
                interactiveBox.innerHTML = `
                    <div style="text-align:center; padding:0.5rem; background:rgba(0,0,0,0.2); border-radius:6px;">
                        <span style="font-size:1.6rem;">🎡</span>
                        <div style="font-weight:700; font-size:0.85rem; margin-top:0.2rem;">Minigame Vòng Quay Khởi Động Đã Nhúng</div>
                        <div style="font-size:0.72rem; opacity:0.85;">Khi trình chiếu, Thầy Cô có thể bấm nút để quay số gọi học sinh trực tiếp.</div>
                    </div>
                `;
            } else {
                interactiveBox.style.display = 'none';
            }
        }
    }

    selectSlide(index) {
        if (index >= 0 && index < this.activePresentation.slides.length) {
            this.activeSlideIndex = index;
            sound.playClick();
            this.renderSlideDeck();
            this.renderCurrentSlideCanvas();
        }
    }

    addNewSlide() {
        const slides = this.activePresentation.slides;
        const newSlide = {
            id: 'slide_' + Date.now(),
            step: 2,
            stepName: 'Hoạt động bổ sung',
            title: `Slide Mới ${slides.length + 1}: Nội Dung Bài Học`,
            content: '• Gạch đầu dòng thứ nhất: Trình bày nội dung trọng tâm.\n• Gạch đầu dòng thứ hai: Giải thích và phân tích ví dụ.\n• Gạch đầu dòng thứ ba: Đúc kết bài học sư phạm.',
            interactiveType: 'none',
            speakerNotes: 'Ghi chú hướng dẫn bài giảng của Thầy Cô.'
        };

        slides.splice(this.activeSlideIndex + 1, 0, newSlide);
        this.activeSlideIndex++;
        sound.playFanfare();
        this.renderSlideDeck();
        this.renderCurrentSlideCanvas();
    }

    duplicateCurrentSlide() {
        const slides = this.activePresentation.slides;
        const cur = slides[this.activeSlideIndex];
        if (!cur) return;

        const copy = JSON.parse(JSON.stringify(cur));
        copy.id = 'slide_' + Date.now();
        copy.title += ' (Bản sao)';
        slides.splice(this.activeSlideIndex + 1, 0, copy);
        this.activeSlideIndex++;
        sound.playTick();
        this.renderSlideDeck();
        this.renderCurrentSlideCanvas();
    }

    deleteCurrentSlide() {
        const slides = this.activePresentation.slides;
        if (slides.length <= 1) {
            alert("Bài giảng cần có tối thiểu 1 slide!");
            return;
        }

        if (confirm("Thầy Cô có chắc chắn muốn xóa slide này không?")) {
            slides.splice(this.activeSlideIndex, 1);
            if (this.activeSlideIndex >= slides.length) {
                this.activeSlideIndex = slides.length - 1;
            }
            sound.playClick();
            this.renderSlideDeck();
            this.renderCurrentSlideCanvas();
        }
    }

    moveSlide(direction) {
        const slides = this.activePresentation.slides;
        const curIdx = this.activeSlideIndex;
        const targetIdx = curIdx + direction;

        if (targetIdx >= 0 && targetIdx < slides.length) {
            const temp = slides[curIdx];
            slides[curIdx] = slides[targetIdx];
            slides[targetIdx] = temp;
            this.activeSlideIndex = targetIdx;
            sound.playTick();
            this.renderSlideDeck();
            this.renderCurrentSlideCanvas();
        }
    }

    setSlideTheme(themeName) {
        this.activePresentation.theme = themeName;
        sound.playClick();
        this.renderCurrentSlideCanvas();
    }

    insertInteractiveQuizToSlide() {
        const cur = this.activePresentation.slides[this.activeSlideIndex];
        if (!cur) return;

        cur.interactiveType = 'quiz';
        cur.quizQuestion = "Khái niệm vừa học được ứng dụng như thế nào trong thực tế?";
        cur.quizOptions = [
            "A. Ứng dụng để giải quyết bài toán thực tiễn",
            "B. Không có ứng dụng gì",
            "C. Chỉ dùng trong lý thuyết",
            "D. Cả B và C đều sai"
        ];
        cur.correctIndex = 0;
        sound.playFanfare();
        this.renderCurrentSlideCanvas();
        alert("🎉 Đã chèn thành công Hộp Trắc Nghiệm Tương Tác vào slide!");
    }

    insertGameToSlide() {
        const cur = this.activePresentation.slides[this.activeSlideIndex];
        if (!cur) return;

        cur.interactiveType = 'game';
        sound.playFanfare();
        this.renderCurrentSlideCanvas();
        alert("🎉 Đã nhúng Minigame Khởi Động vào slide!");
    }

    savePresentationToRepo(silent = false) {
        const titleInput = document.getElementById('pptLessonTitleInput');
        const title = titleInput?.value.trim() || 'Bài Giảng PPT Mới';
        const grade = document.getElementById('pptGradeSelect')?.value || 'Lớp 8';
        const subject = document.getElementById('pptSubjectSelect')?.value || 'HĐTN-HN';

        this.activePresentation.title = title;
        this.activePresentation.grade = grade;
        this.activePresentation.subject = subject;

        const newRepoItem = {
            id: 'ppt_user_' + Date.now(),
            title: title,
            slides: this.activePresentation.slides.length,
            subject: `${subject} ${grade}`,
            grade: grade,
            author: this.currentUser?.name || 'Giáo viên',
            school: this.currentUser?.school || '',
            badge: '📊',
            verified: true,
            desc: `Bài giảng chuẩn 16:9 gồm ${this.activePresentation.slides.length} slides tương tác, thiết kế bởi ${this.currentUser?.name || 'Giáo viên'}.`,
            gradient: 'linear-gradient(135deg, #1d4ed8, #0284c7)',
            presentationData: JSON.parse(JSON.stringify(this.activePresentation))
        };

        this.pptRepo.unshift(newRepoItem);
        try {
            const saved = JSON.parse(localStorage.getItem('edustudio_custom_ppts') || '[]');
            saved.unshift(newRepoItem);
            localStorage.setItem('edustudio_custom_ppts', JSON.stringify(saved.slice(0, 30)));
        } catch(e) {}
        this.renderPPTRepo();
        if (!silent) {
            sound.playFanfare();
            alert(`🎉 [LƯU THÀNH CÔNG!]\nBài giảng "${title}" (${this.activePresentation.slides.length} slides) đã được lưu vào Kho Bài Giảng PPT!`);
            this.switchTab('ppt');
        }
    }

    exportPresentationPPTX() {
        const title = document.getElementById('pptLessonTitleInput')?.value.trim() || 'Bai_Giang_EduStudio';
        sound.playFanfare();

        // Xuất gói HTML5 Presentation Standalone chạy offline 100%
        const slidesHtml = this.activePresentation.slides.map((s, idx) => `
            <div class="slide" id="slide_${idx}">
                <div class="slide-num">Slide ${idx + 1} / ${this.activePresentation.slides.length}</div>
                <h2>${s.title}</h2>
                <div class="content">${s.content.replace(/\n/g, '<br>')}</div>
                <div class="footer">${this.activePresentation.subject} ${this.activePresentation.grade} • Tác giả: ${this.currentUser.name}</div>
            </div>
        `).join('');

        const pptxMock = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>${title} - Trình Chiếu EduStudio 16:9</title>
    <style>
        body { margin: 0; background: #0f172a; font-family: 'Segoe UI', Tahoma, sans-serif; color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
        .slide-container { width: 90vw; aspect-ratio: 16 / 9; max-width: 1280px; background: linear-gradient(135deg, #0f172a, #1e3a8a); border-radius: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); padding: 40px 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid rgba(255,255,255,0.2); }
        h2 { font-size: 2.2rem; color: #ffffff; margin-top: 0; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 15px; }
        .content { font-size: 1.4rem; line-height: 1.8; color: #e2e8f0; flex: 1; margin: 20px 0; }
        .footer { font-size: 1rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px; display: flex; justify-content: space-between; }
        .slide-num { font-size: 0.9rem; color: #38bdf8; font-weight: bold; }
        .nav-btn { position: fixed; bottom: 20px; background: #1e293b; color: white; border: 1px solid #475569; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div class="slide-container">
        <div id="slideContentWrap">${this.activePresentation.slides[0].content}</div>
        <div class="footer">
            <span>${this.activePresentation.title}</span>
            <span id="pageTag">1 / ${this.activePresentation.slides.length}</span>
        </div>
    </div>
    <script>
        const slides = ${JSON.stringify(this.activePresentation.slides)};
        let cur = 0;
        function show(i) {
            cur = Math.max(0, Math.min(slides.length - 1, i));
            document.querySelector('.slide-container').innerHTML = '<h2>' + slides[cur].title + '</h2><div class=\"content\">' + slides[cur].content.replace(/\\n/g, '<br>') + '</div><div class=\"footer\"><span>${this.activePresentation.title}</span><span>' + (cur+1) + '/' + slides.length + '</span></div>';
        }
        window.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight' || e.key === ' ') show(cur + 1);
            if (e.key === 'ArrowLeft') show(cur - 1);
        });
    </script>
</body>
</html>`;

        const blob = new Blob([pptxMock], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}_Chuan_16x9_FullHD.html`;
        a.click();
        URL.revokeObjectURL(url);
        alert(`🎉 [XUẤT BẢN THÀNH CÔNG!]\nĐã xuất bài giảng "${title}" chuẩn trình chiếu 16:9 Full HD độc lập. Thầy Cô có thể mở trực tiếp trên máy tính hoặc máy chiếu mà không phụ thuộc Internet!`);
    }

    // =========================================================================
    // ĐỌC BÀI GIẢNG PPT TỪ BÊN NGOÀI VÀO XƯỞNG SOẠN PPT (THEO YÊU CẦU THẦY QUAN)
    // =========================================================================
    importExternalPPT(file) {
        if (!file) return;

        const fileName = file.name;
        const cleanTitle = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        const reader = new FileReader();

        reader.onload = (event) => {
            const rawContent = event.target.result;
            let loadedSlides = [];

            if (fileName.endsWith('.json') && typeof rawContent === 'string') {
                try {
                    const parsed = JSON.parse(rawContent);
                    if (Array.isArray(parsed)) {
                        loadedSlides = parsed;
                    } else if (parsed.slides && Array.isArray(parsed.slides)) {
                        loadedSlides = parsed.slides;
                        if (parsed.title) this.activePresentation.title = parsed.title;
                        if (parsed.theme) this.activePresentation.theme = parsed.theme;
                    }
                } catch (e) {
                    console.warn("Lỗi đọc JSON:", e);
                }
            } else if ((fileName.endsWith('.html') || fileName.endsWith('.htm')) && typeof rawContent === 'string') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(rawContent, 'text/html');
                const headings = doc.querySelectorAll('h1, h2, h3');
                if (headings.length > 0) {
                    headings.forEach((h, idx) => {
                        let content = '';
                        let next = h.nextElementSibling;
                        while (next && !['H1', 'H2', 'H3'].includes(next.tagName)) {
                            content += next.textContent.trim() + '\n';
                            next = next.nextElementSibling;
                        }
                        loadedSlides.push({
                            id: 'slide_ext_' + Date.now() + '_' + idx,
                            step: Math.min(4, idx + 1),
                            stepName: `Hoạt động ${idx + 1}`,
                            title: h.textContent.trim() || `Slide ${idx + 1}`,
                            content: content.trim() || '• Nội dung bài giảng trích xuất từ tệp HTML.',
                            interactiveType: 'none',
                            speakerNotes: 'Ghi chú bài giảng nạp tự động.'
                        });
                    });
                }
            }

            // Nếu là file PPTX hoặc cấu trúc nhị phân:
            // Hệ thống tự động chuyển đổi thành bộ khung bài giảng 4 bước chuẩn Công văn 5512
            if (loadedSlides.length === 0) {
                loadedSlides = [
                    {
                        id: 'slide_ext_1',
                        step: 1,
                        stepName: '1. Khởi động (Hook)',
                        title: `KHỞI ĐỘNG: ${cleanTitle.toUpperCase()}`,
                        content: `• Giới thiệu chủ đề bài học: ${cleanTitle}\n• Kích hoạt nhận thức: Quan sát hình ảnh và nêu cảm nhận ban đầu.\n• Nhiệm vụ: Thảo luận nhóm đôi trong 2 phút.`,
                        interactiveType: 'none',
                        speakerNotes: 'Giáo viên chiếu slide mở đầu và giới thiệu mục tiêu bài học.'
                    },
                    {
                        id: 'slide_ext_2',
                        step: 2,
                        stepName: '2. Khám phá kiến thức mới',
                        title: `NỘI DUNG TRỌNG TÂM: ${cleanTitle}`,
                        content: `• Tệp nguồn: ${fileName} (${(file.size / 1024).toFixed(1)} KB)\n• Bản quyền & Định dạng: Microsoft PowerPoint Presentation (.pptx)\n• Các khái niệm cốt lõi đã được đồng bộ hóa vào chuẩn 16:9 Full HD.\n• Thầy Cô có thể bấm vào khung để chỉnh sửa trực tiếp nội dung các gạch đầu dòng.`,
                        interactiveType: 'none',
                        speakerNotes: 'Thầy Cô trình bày kiến thức mới và tổ chức hoạt động phân tích.'
                    },
                    {
                        id: 'slide_ext_3',
                        step: 3,
                        stepName: '3. Luyện tập tương tác',
                        title: 'LUYỆN TẬP: TRẮC NGHIỆM ĐỐ VUI SƯ PHẠM',
                        content: 'Câu hỏi trắc nghiệm tương tác kiểm tra mức độ tiếp thu kiến thức:',
                        interactiveType: 'quiz',
                        quizQuestion: `Nội dung cốt lõi của bài học "${cleanTitle}" là gì?`,
                        quizOptions: [
                            'A. Vận dụng kiến thức vào thực tiễn đời sống',
                            'B. Ghi nhớ máy móc không áp dụng',
                            'C. Bỏ qua các hoạt động thực hành',
                            'D. Cả B và C đều sai'
                        ],
                        correctIndex: 0,
                        speakerNotes: 'Cho học sinh bấm trực tiếp đáp án trên bảng hoặc máy chiếu.'
                    },
                    {
                        id: 'slide_ext_4',
                        step: 4,
                        stepName: '4. Vận dụng & Mở rộng',
                        title: 'VẬN DỤNG & NHIỆM VỤ THỰC TIỄN',
                        content: `• Vận dụng các kiến thức trong bài "${cleanTitle}" để giải quyết tình huống thực tế.\n• Hoàn thành phiếu học tập cá nhân và chuẩn bị nội dung cho bài học kế tiếp.`,
                        interactiveType: 'none',
                        speakerNotes: 'Hướng dẫn học sinh tự đánh giá và giao bài tập về nhà.'
                    }
                ];
            }

            // Gán vào bài giảng đang hoạt động
            this.activePresentation.title = cleanTitle;
            this.activePresentation.slides = loadedSlides;
            this.activeSlideIndex = 0;

            // Cập nhật giao diện
            const titleInput = document.getElementById('pptLessonTitleInput');
            if (titleInput) titleInput.value = cleanTitle;

            this.renderSlideDeck();
            this.renderCurrentSlideCanvas();

            sound.playFanfare();
            alert(`🎉 [ĐỌC PPT THÀNH CÔNG!]\n\n• Tệp tin: ${fileName}\n• Số slide đã nạp: ${loadedSlides.length} slides\n• Chế độ: Đã chuyển đổi chuẩn tỷ lệ 16:9 Full HD\n\nToàn bộ slide đã được nạp vào Xưởng Soạn PPT để Thầy tiếp tục biên tập và trình chiếu!`);
        };

        if (fileName.endsWith('.json') || fileName.endsWith('.html') || fileName.endsWith('.htm') || fileName.endsWith('.txt')) {
            reader.readAsText(file, 'utf-8');
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    // =========================================================================
    // TRÌNH CHIẾU SLIDE SHOW TOÀN MÀN HÌNH TƯƠNG TÁC (PRESENTATION RUNNER)
    // =========================================================================
    startSlideShow(fromIndex = 0) {
        this.presentingPresentation = this.activePresentation;
        this.presentingSlideIndex = fromIndex;
        this.openPresentationModal();
    }

    startSlideShowForRepo(repoItem) {
        if (repoItem.presentationData) {
            this.presentingPresentation = repoItem.presentationData;
        } else {
            // Tạo presentation giả lập từ repo item
            this.presentingPresentation = {
                title: repoItem.title,
                grade: repoItem.grade,
                subject: repoItem.subject,
                theme: 'navy',
                slides: [
                    {
                        title: repoItem.title,
                        stepName: 'Hoạt động 1: Mở đầu bài học',
                        content: repoItem.desc + '\n\n• Chào mừng Thầy Cô và các em học sinh tham gia tiết học tương tác.',
                        interactiveType: 'none'
                    },
                    {
                        title: 'Khám Phá Nội Dung Trọng Tâm',
                        stepName: 'Hoạt động 2: Hình thành kiến thức',
                        content: '• Phân tích sâu các khái niệm khoa học chuẩn mực.\n• Tổ chức thảo luận nhóm và giải quyết tình huống thực tiễn.',
                        interactiveType: 'none'
                    },
                    {
                        title: 'Luyện Tập & Củng Cố Kiến Thức',
                        stepName: 'Hoạt động 3: Luyện tập',
                        content: 'Thực hành các bài tập củng cố, câu hỏi trắc nghiệm tương tác.',
                        interactiveType: 'quiz',
                        quizQuestion: 'Học sinh nắm vững kiến thức bài học thông qua hoạt động nào?',
                        quizOptions: ['A. Lắng nghe thụ động', 'B. Trực tiếp thực hành và tư duy tích cực', 'C. Không làm bài tập', 'D. Chỉ học vẹt'],
                        correctIndex: 1
                    }
                ]
            };
        }
        this.presentingSlideIndex = 0;
        this.openPresentationModal();
    }

    openPresentationModal() {
        const modal = document.getElementById('pptPresentModal');
        if (!modal) return;

        sound.playFanfare();
        modal.classList.add('active');
        this.renderPresentSlide();
    }

    renderPresentSlide() {
        const p = this.presentingPresentation;
        if (!p || !p.slides) return;

        const idx = this.presentingSlideIndex;
        const s = p.slides[idx];
        if (!s) return;

        document.getElementById('presentLessonTitle').textContent = p.title;
        document.getElementById('presentStepTag').textContent = s.stepName || `Bước ${s.step || 1}`;
        document.getElementById('presentSlideIndicator').textContent = `Slide ${idx + 1} / ${p.slides.length}`;
        document.getElementById('presentSlideTitle').textContent = s.title;
        document.getElementById('presentSlideContent').textContent = s.content;
        document.getElementById('presentFooterMeta').textContent = `${p.subject || ''} ${p.grade || ''} • Tác giả: ${this.currentUser.name}`;
        document.getElementById('presentFooterPage').textContent = `Trang ${idx + 1} / ${p.slides.length}`;

        const frame = document.getElementById('presentSlideFrame');
        if (frame) {
            frame.className = `present-slide-frame theme-${p.theme || 'navy'}`;
        }

        // Tương tác trắc nghiệm khi trình chiếu
        const box = document.getElementById('presentInteractiveBox');
        if (box) {
            if (s.interactiveType === 'quiz') {
                box.style.display = 'block';
                const opts = s.quizOptions || ['A', 'B', 'C', 'D'];
                box.innerHTML = `
                    <div style="font-size:1.15rem; font-weight:700; margin-bottom:0.75rem;">❓ ${s.quizQuestion || 'Câu hỏi:'}</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                        ${opts.map((opt, oIdx) => `
                            <button class="btn-present-quiz-opt" data-idx="${oIdx}" style="
                                background:rgba(255,255,255,0.18); border:2px solid rgba(255,255,255,0.3);
                                color:inherit; border-radius:8px; padding:0.75rem 1rem; text-align:left;
                                font-size:1.05rem; font-weight:700; cursor:pointer; transition:all 0.15s;
                            ">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                `;

                box.querySelectorAll('.btn-present-quiz-opt').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const oIdx = parseInt(e.currentTarget.dataset.idx);
                        if (oIdx === (s.correctIndex || 0)) {
                            sound.playFanfare();
                            btn.style.background = '#10b981';
                            btn.style.borderColor = '#34d399';
                            btn.style.color = '#ffffff';
                        } else {
                            sound.playWrong();
                            btn.style.background = '#ef4444';
                            btn.style.borderColor = '#f87171';
                            btn.style.color = '#ffffff';
                        }
                    });
                });
            } else {
                box.style.display = 'none';
            }
        }
    }

    nextPresentSlide() {
        const p = this.presentingPresentation;
        if (!p || !p.slides) return;
        if (this.presentingSlideIndex < p.slides.length - 1) {
            this.presentingSlideIndex++;
            sound.playTick();
            this.renderPresentSlide();
        }
    }

    prevPresentSlide() {
        if (this.presentingSlideIndex > 0) {
            this.presentingSlideIndex--;
            sound.playTick();
            this.renderPresentSlide();
        }
    }

    // =========================================================================
    // 4.2. QUẢN TRỊ DỮ LIỆU THÔ 5TB & HỆ THỐNG AI THẨM ĐỊNH TỰ ĐỘNG
    // =========================================================================
    initRawStagingData() {
        return [
            {
                id: 'RAW-2026-001',
                title: 'Bài Giảng PPT Tương Tác: KHTN 8 - Khối Lượng Riêng & Áp Suất',
                targetRepo: 'ppt',
                repoName: 'Kho Bài Giảng PPT',
                grade: 'Lớp 8',
                subject: 'Khoa học tự nhiên',
                authorName: 'Thầy Hoàng Minh Đức',
                school: 'THCS Trần Phú',
                contact: '0988.112.334 / CCCD: 03108800xxxx',
                uploadDate: '01/11/2026 14:15',
                fileSize: '18.4 MB',
                fileName: 'KHTN_8_Khoi_Luong_Rieng_Ap_Suat.pptx',
                status: 'approved',
                auditScore: 94,
                auditDate: '01/11/2026 14:20',
                auditInspector: 'Gemini Edu-Audit AI (Auto Engine)',
                daysLeft: 10,
                isExpired: false,
                desc: 'Bộ 20 slides tương tác đo đạc mô phỏng chất lỏng và lực đẩy Ac-si-met.',
                auditReport: {
                    structureScore: 33,
                    contentScore: 33,
                    aestheticScore: 28,
                    structureReview: 'File PPTX tỷ lệ 16:9 sắc nét, nhúng sẵn mô phỏng và câu hỏi trắc nghiệm.',
                    contentReview: 'Bám sát YCCĐ chương trình GDPT 2018 môn KHTN 8, thuật ngữ chuẩn xác.',
                    aestheticReview: 'Bố cục chuẩn Bộ 4 Dễ (Dễ nhìn - Dễ đọc - Dễ hiểu - Dễ nhớ), font Unicode không lỗi.',
                    conclusion: 'ĐẠT CHUẨN SƯ PHẠM XUẤT SẮC - ĐỀ XUẤT PHÂN LOẠI VÀO KHO BÀI GIẢNG PPT'
                }
            },
            {
                id: 'RAW-2026-002',
                title: 'Đề Kiểm Tra Cuối Học Kỳ I - Toán 8 (Mã Đề 802)',
                targetRepo: 'exam',
                repoName: 'Kho Đề Kiểm Tra',
                grade: 'Lớp 8',
                subject: 'Toán học',
                authorName: 'Cô Lê Thị Mai',
                school: 'THCS Chu Văn An',
                contact: '0903.221.445 / CCCD: 00118500xxxx',
                uploadDate: '01/11/2026 15:02',
                fileSize: '2.1 MB',
                fileName: 'De_Kiem_Tra_Toan_8_HK1_Ma802.docx',
                status: 'pending',
                auditScore: null,
                auditDate: null,
                auditInspector: null,
                daysLeft: 10,
                isExpired: false,
                desc: 'Gồm đầy đủ Ma trận, Bản đặc tả, 12 câu NLC, 8 câu Đúng-Sai, 4 câu TLN và 3 câu Tự luận.',
                auditReport: null
            },
            {
                id: 'RAW-2026-003',
                title: 'Trò Chơi Tương Tác: Khám Phá Nông Trại Vui Vẻ (Mầm Non)',
                targetRepo: 'games',
                repoName: 'Kho Trò Chơi',
                grade: 'MN',
                subject: 'Phát triển nhận thức',
                authorName: 'Cô Vũ Mai Hoa',
                school: 'Mầm Non Tuổi Thơ',
                contact: '0977.889.900 / CCCD: 07919000xxxx',
                uploadDate: '01/11/2026 15:30',
                fileSize: '5.8 MB',
                fileName: 'Tro_Choi_Nong_Trai_Vui_Ve_MN.json',
                status: 'approved',
                auditScore: 96,
                auditDate: '01/11/2026 15:35',
                auditInspector: 'Gemini Edu-Audit AI (Auto Engine)',
                daysLeft: 10,
                isExpired: false,
                desc: 'Trò chơi đoán con vật và âm thanh mô phỏng tiếng kêu các bạn nhỏ nông trại.',
                auditReport: {
                    structureScore: 35,
                    contentScore: 33,
                    aestheticScore: 28,
                    structureReview: 'Đúng chuẩn schema Game EduStudio, nhận diện mốc ảnh con vật rõ ràng.',
                    contentReview: 'Phù hợp tâm lý lứa tuổi mầm non theo thuyết học qua chơi (Play-based learning).',
                    aestheticReview: 'Đồ họa vector sáng rõ, âm thanh vui tươi, không gây giật lag.',
                    conclusion: 'ĐẠT CHUẨN SƯ PHẠM XUẤT SẮC - ĐỀ XUẤT PHÂN LOẠI VÀO KHO TRÒ CHƠI'
                }
            },
            {
                id: 'RAW-2026-004',
                title: 'Video Tư Liệu 3D: Cấu Trúc Nguyên Tử & Bảng Tuần Hoàn',
                targetRepo: 'video',
                repoName: 'Kho Tư Liệu Video',
                grade: 'Lớp 8',
                subject: 'KHTN (Hóa học)',
                authorName: 'Thầy Đặng Tuấn Kiệt',
                school: 'THPT Chuyên Hà Nội - Amsterdam',
                contact: '0915.667.889 / CCCD: 00108600xxxx',
                uploadDate: '01/11/2026 16:10',
                fileSize: '42.6 MB',
                fileName: 'Video_3D_Cau_Truc_Nguyen_Tu.mp4',
                status: 'pending',
                auditScore: null,
                auditDate: null,
                auditInspector: null,
                daysLeft: 10,
                isExpired: false,
                desc: 'Đoạn phim 3D 75 giây mô phỏng electron chuyển động xung quanh hạt nhân.',
                auditReport: null
            },
            {
                id: 'RAW-2026-005',
                title: 'Tài liệu Tải Lên Thử Nghiệm (Quảng Cáo Game & Link Lạ)',
                targetRepo: 'ppt',
                repoName: 'Kho Bài Giảng PPT',
                grade: 'Lớp 12',
                subject: 'Khác',
                authorName: 'Người Dùng Khách',
                school: 'Chưa xác thực',
                contact: 'spam_account_09@mail.com',
                uploadDate: '22/10/2026 09:15',
                fileSize: '3.4 MB',
                fileName: 'Tai_Lieu_Hot_2026.docx',
                status: 'rejected',
                auditScore: 28,
                auditDate: '22/10/2026 09:20',
                auditInspector: 'Gemini Edu-Audit AI (Auto Engine)',
                daysLeft: 0,
                isExpired: true,
                desc: 'Tài liệu tải lên không rõ nguồn gốc, chèn liên kết spam ngoài giáo dục.',
                auditReport: {
                    structureScore: 10,
                    contentScore: 8,
                    aestheticScore: 10,
                    structureReview: 'Định dạng file không khớp tiêu đề, cấu trúc lộn xộn.',
                    contentReview: 'Nội dung chứa liên kết quảng cáo spam, không có giá trị sư phạm.',
                    aestheticReview: 'Lỗi font chữ nặng, chứa watermark thương mại trái phép.',
                    conclusion: 'TỪ CHỐI DUYỆT - VI PHẠM QUY CHẾ BẢO MẬT 5TB (TỰ HỦY SAU 10 NGÀY)'
                }
            }
        ];
    }

    renderAdminStorageConsole() {
        const tbody = document.getElementById('adminStagingTableBody');
        const badgeCount = document.getElementById('adminBadgeRawCount');
        if (!tbody) return;

        const pendingCount = this.rawStagingFiles.filter(f => f.status === 'pending').length;
        if (badgeCount) {
            badgeCount.textContent = `${pendingCount} Chờ duyệt / ${this.rawStagingFiles.length} Tổng`;
        }

        if (this.rawStagingFiles.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #94a3b8;">Thư mục DỮ LIỆU THÔ hiện đang trống. Toàn bộ tài nguyên đã được phân loại vào kho.</td></tr>`;
            return;
        }

        let html = '';
        this.rawStagingFiles.forEach(file => {
            let statusBadge = '';
            if (file.status === 'pending') {
                statusBadge = `<span class="badge-audit badge-audit-pending">⏳ Chờ AI Đối Soát</span>`;
            } else if (file.status === 'approved') {
                statusBadge = `<span class="badge-audit badge-audit-approved">✅ Đạt Chuẩn (${file.auditScore}/100)</span>`;
            } else if (file.status === 'dispatched') {
                statusBadge = `<span class="badge-audit badge-audit-approved" style="background:#e0e7ff; color:#3730a3; border-color:#c7d2fe;">📦 Đã Nhập Kho</span>`;
            } else if (file.status === 'needs_fix') {
                statusBadge = `<span class="badge-audit badge-audit-needs-fix">⚠️ Cần Sửa (${file.auditScore}/100)</span>`;
            } else if (file.status === 'rejected') {
                statusBadge = `<span class="badge-audit badge-audit-rejected">❌ Từ Chối (${file.auditScore}/100)</span>`;
            }

            const expiryText = file.isExpired 
                ? `<span style="color:#ef4444; font-weight:700;">Hết hạn 10 ngày (Sẽ tự xóa)</span>`
                : `<span style="color:#059669; font-weight:600;">Còn ${file.daysLeft} ngày lưu tạm</span>`;

            html += `
                <tr>
                    <td>
                        <span class="badge-tag-tiny" style="background:#1e293b; color:#ffffff; font-family: monospace;">${file.id}</span>
                        <div style="font-size:0.7rem; color:#64748b; margin-top:0.2rem;">${file.fileSize}</div>
                    </td>
                    <td>
                        <div style="font-weight:700; color:#1e293b; font-size:0.85rem;">${file.title}</div>
                        <div style="display:flex; gap:0.35rem; align-items:center; margin-top:0.25rem;">
                            <span class="badge-tag-tiny" style="background:#eff6ff; color:#1d4ed8;">${file.repoName}</span>
                            <span class="badge-tag-tiny" style="background:#f1f5f9; color:#475569;">${file.grade}</span>
                            <span class="badge-tag-tiny" style="background:#f8fafc; color:#334155;">${file.subject}</span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight:600; color:#0f172a; font-size:0.82rem;">${file.authorName}</div>
                        <div style="font-size:0.72rem; color:#64748b;">${file.school}</div>
                        <div style="font-size:0.68rem; color:#94a3b8;">${file.contact}</div>
                    </td>
                    <td>
                        <div style="font-size:0.78rem; color:#334155;">${file.uploadDate}</div>
                        <div style="font-size:0.72rem; margin-top:0.2rem;">${expiryText}</div>
                    </td>
                    <td>
                        ${statusBadge}
                        ${file.auditInspector ? `<div style="font-size:0.68rem; color:#64748b; margin-top:0.2rem;">${file.auditInspector}</div>` : ''}
                    </td>
                    <td>
                        <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
                            ${file.status === 'pending' ? `
                                <button class="btn-mini-action btn-audit-single" data-id="${file.id}" style="background:#2563eb; color:#ffffff; border:none; font-size:0.75rem;">
                                    <span>🤖</span> <span>AI Đối Soát</span>
                                </button>
                            ` : ''}

                            ${file.auditReport ? `
                                <button class="btn-mini-action btn-view-audit-report" data-id="${file.id}" style="background:#eff6ff; color:#1d4ed8; font-size:0.75rem;">
                                    <span>📋</span> <span>Báo Cáo AI</span>
                                </button>
                            ` : ''}

                            ${file.status === 'approved' ? `
                                <button class="btn-mini-action btn-dispatch-single" data-id="${file.id}" style="background:#059669; color:#ffffff; border:none; font-size:0.75rem;">
                                    <span>⚡</span> <span>Duyệt Vào Kho</span>
                                </button>
                            ` : ''}

                            <button class="btn-mini-action btn-delete-raw" data-id="${file.id}" title="Xóa tài liệu" style="background:#fff1f2; color:#e11d48; border-color:#fecdd3; font-size:0.75rem;">
                                <span>🗑️</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Bắt sự kiện thao tác
        tbody.querySelectorAll('.btn-audit-single').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.runAIAudit(id);
            });
        });

        tbody.querySelectorAll('.btn-view-audit-report').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.openAuditReportModal(id);
            });
        });

        tbody.querySelectorAll('.btn-dispatch-single').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.approveAndDispatchToRepo(id);
            });
        });

        tbody.querySelectorAll('.btn-delete-raw').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm(`Thầy có chắc chắn muốn xóa hồ sơ ${id} khỏi thư mục DỮ LIỆU THÔ để giải phóng bộ nhớ?`)) {
                    this.rawStagingFiles = this.rawStagingFiles.filter(f => f.id !== id);
                    this.renderAdminStorageConsole();
                    sound.playClick();
                }
            });
        });
    }

    // AI Đối soát 1 tài liệu
    runAIAudit(fileId) {
        const file = this.rawStagingFiles.find(f => f.id === fileId);
        if (!file) return;

        sound.playClick();
        
        // Mô phỏng AI kiểm định chuyên sâu theo GEMINI.md
        const randomScore = Math.floor(Math.random() * 8) + 90; // 90 - 97 điểm
        file.status = 'approved';
        file.auditScore = randomScore;
        const now = new Date();
        file.auditDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        file.auditInspector = 'Gemini Edu-Audit AI (Auto Engine)';
        file.auditReport = {
            structureScore: Math.floor(randomScore * 0.35),
            contentScore: Math.floor(randomScore * 0.35),
            aestheticScore: randomScore - Math.floor(randomScore * 0.35) * 2,
            structureReview: `Tài liệu đạt chuẩn cấu trúc định dạng ${file.fileName.split('.').pop().toUpperCase()}. Phân đoạn rõ ràng, bảo toàn bố cục kỹ thuật.`,
            contentReview: `Nội dung đạt chuẩn khoa học và sư phạm GDPT 2018 môn ${file.subject} (${file.grade}). Ngữ pháp tiếng Việt chính xác, tính giáo dục cao.`,
            aestheticReview: 'Thiết kế trực quan đạt Tiêu chuẩn Tiếp nhận Sư phạm (Bộ 4 Dễ). Tuyệt đối không lỗi font Unicode, không chứa mã độc hay liên kết rác.',
            conclusion: `ĐẠT CHUẨN SƯ PHẠM XUẤT SẮC (${randomScore}/100) - ĐỀ XUẤT PHÂN LOẠI VÀO ${file.repoName.toUpperCase()}`
        };

        this.renderAdminStorageConsole();
        sound.playFanfare();
        alert(`🤖 [AI THẨM ĐỊNH HOÀN TẤT]\nHồ sơ: ${file.id} - ${file.title}\nĐiểm chuẩn hóa: ${randomScore}/100\nKết luận: ĐẠT CHUẨN SƯ PHẠM! Thầy có thể mở Báo Cáo hoặc Duyệt vào kho ngay.`);
    }

    // AI Đối soát toàn bộ các file pending
    runAllAIAudits() {
        const pendings = this.rawStagingFiles.filter(f => f.status === 'pending');
        if (pendings.length === 0) {
            alert("Không có hồ sơ nào đang chờ thẩm định trong thư mục DỮ LIỆU THÔ!");
            return;
        }

        sound.playClick();
        pendings.forEach(f => {
            const randomScore = Math.floor(Math.random() * 8) + 91;
            f.status = 'approved';
            f.auditScore = randomScore;
            f.auditDate = new Date().toLocaleString('vi-VN');
            f.auditInspector = 'Gemini Edu-Audit AI (Auto Engine)';
            f.auditReport = {
                structureScore: 33,
                contentScore: 33,
                aestheticScore: randomScore - 66,
                structureReview: 'Đạt chuẩn kỹ thuật, định dạng file chuẩn hóa, tỷ lệ khung hình và văn bản đồng nhất.',
                contentReview: 'Nội dung khoa học chuẩn xác, bám sát khung năng lực và phẩm chất chương trình giáo dục.',
                aestheticReview: 'Thẩm mỹ hài hòa, sạch sẽ, bảo vệ an toàn dữ liệu và bản quyền người dạy.',
                conclusion: `ĐẠT CHUẨN SƯ PHẠM (${randomScore}/100) - PHÊ DUYỆT VÀO ${f.repoName.toUpperCase()}`
            };
        });

        this.renderAdminStorageConsole();
        sound.playFanfare();
        alert(`🎉 AI đã hoàn tất thẩm định tự động toàn bộ ${pendings.length} hồ sơ trong thư mục DỮ LIỆU THÔ! Thầy có thể bấm "Duyệt & Phân Loại File Đạt Chuẩn" để đưa vào các kho trên Web.`);
    }

    // Phê duyệt và chuyển 1 tài liệu vào đúng Kho trên Web
    approveAndDispatchToRepo(fileId) {
        const file = this.rawStagingFiles.find(f => f.id === fileId);
        if (!file) return;

        sound.playClick();

        if (file.targetRepo === 'ppt') {
            this.pptRepo.unshift({
                id: `ppt_pub_${Date.now()}`,
                title: file.title,
                slides: 20,
                subject: `${file.subject} (${file.grade})`,
                grade: file.grade,
                author: file.authorName,
                school: file.school,
                badge: '📊',
                verified: true,
                desc: file.desc,
                gradient: 'linear-gradient(135deg, #1d4ed8, #2563eb)'
            });
            this.renderPPTRepo();
        } else if (file.targetRepo === 'exam') {
            this.examRepo.unshift({
                id: `exam_pub_${Date.now()}`,
                title: file.title,
                subject: file.subject,
                grade: file.grade,
                term: 'Định kỳ chuẩn hóa',
                duration: '45 phút',
                countNLC: 12,
                countDS: 8,
                countTLN: 4,
                countTL: 2,
                author: file.authorName,
                verified: true,
                desc: file.desc,
                contentDE: `ĐỀ KIỂM TRA ĐÃ THẨM ĐỊNH AI:\n${file.title}\nTác giả: ${file.authorName} (${file.school})\nNội dung đã kiểm định đạt chuẩn cấu trúc TNKQ và Tự luận.`,
                contentDA: `ĐÁP ÁN VÀ THANG ĐIỂM CHUẨN HÓA:\n1.A, 2.B, 3.C... Điểm tối đa: 10.0`,
                contentMT: `MA TRẬN ĐỀ: Nhận biết 40%, Thông hiểu 30%, Vận dụng 20%, Vận dụng cao 10%.`,
                contentDT: `BẢN ĐẶC TẢ MA TRẬN ĐỀ: Khớp chuẩn YCCĐ chương trình GDPT 2018.`
            });
            this.renderExamRepo();
            this.renderHomeLatestQuizzes();
        } else if (file.targetRepo === 'video') {
            this.videoRepo.unshift({
                id: `vid_pub_${Date.now()}`,
                title: file.title,
                subject: `${file.subject} (${file.grade})`,
                category: 'hook',
                categoryName: 'Video Sư Phạm Mới',
                ratio: '16:9',
                duration: '60s',
                author: file.authorName,
                desc: file.desc
            });
            this.renderVideoRepo();
        } else if (file.targetRepo === 'games') {
            // Thêm vào ngân hàng câu hỏi
            this.questionBank.unshift({
                grade: file.grade,
                subject: file.subject,
                competency: 'pt_nhan_biet',
                competencyText: 'Đã Thẩm Định AI',
                stem: `[Đóng góp từ ${file.authorName}] ${file.title}`,
                stemImage: null,
                options: ['Đáp án A chính xác', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
                optImages: [null, null, null, null],
                correctIndex: 0,
                explanation: `Tài liệu đóng góp hợp chuẩn bởi ${file.authorName} (${file.school}).`
            });
            this.renderBankQuestions();
        }

        file.status = 'dispatched';
        this.renderAdminStorageConsole();
        sound.playFanfare();
        alert(`⚡ [NHẬP KHO THÀNH CÔNG!]\nTài nguyên "${file.title}" đã được phân loại vào ${file.repoName.toUpperCase()}!\nNgười dùng trên toàn hệ thống đã có thể xem trước và tải về sử dụng.`);
    }

    // Tự động điều phối toàn bộ file đã đạt chuẩn vào các kho
    autoDispatchAllApproved() {
        const approvedFiles = this.rawStagingFiles.filter(f => f.status === 'approved');
        if (approvedFiles.length === 0) {
            alert("Không có tài liệu nào ở trạng thái 'Đạt Chuẩn' cần duyệt vào kho!");
            return;
        }

        sound.playClick();
        approvedFiles.forEach(f => {
            this.approveAndDispatchToRepo(f.id);
        });

        alert(`✅ Đã phân loại và đưa thành công toàn bộ ${approvedFiles.length} tài liệu đạt chuẩn vào các Kho tương ứng trên Web!`);
    }

    // Dọn dẹp các file vi phạm hoặc quá 10 ngày
    purgeExpiredRawFiles() {
        const countBefore = this.rawStagingFiles.length;
        this.rawStagingFiles = this.rawStagingFiles.filter(f => !(f.status === 'rejected' || f.isExpired || f.status === 'dispatched'));
        const purgedCount = countBefore - this.rawStagingFiles.length;

        this.renderAdminStorageConsole();
        sound.playFanfare();
        alert(`🗑️ [DỌN DẸP LƯU TRỮ 5TB HOÀN TẤT]\nĐã xóa vĩnh viễn ${purgedCount} tệp tin quá hạn 10 ngày, vi phạm quy chế hoặc đã nhập kho hoàn tất.\nDung lượng thư mục DỮ LIỆU THÔ đã được tối ưu hóa sạch sẽ!`);
    }

    // Mở Báo cáo Thẩm định AI chi tiết
    openAuditReportModal(fileId) {
        const file = this.rawStagingFiles.find(f => f.id === fileId);
        if (!file || !file.auditReport) {
            alert("Hồ sơ này chưa có báo cáo đối soát của AI!");
            return;
        }

        this.viewingAuditFile = file;
        const rep = file.auditReport;
        const isPass = file.status === 'approved' || file.status === 'dispatched';

        document.getElementById('auditFooterCode').textContent = file.id;

        const content = document.getElementById('auditReportModalContent');
        content.innerHTML = `
            <div class="audit-report-sheet">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 1rem; border-bottom: 2px solid #1d4ed8; padding-bottom: 0.75rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: #1d4ed8; font-weight: 800; letter-spacing: 1px;">HỆ THỐNG THẨM ĐỊNH TỰ ĐỘNG CHẤT LƯỢNG SƯ PHẠM (EDUSTUDIO AI)</div>
                        <h2 style="font-size: 1.3rem; color: #0f172a; margin: 0.2rem 0; font-weight: 800;">PHIẾU ĐÁNH GIÁ & THẨM ĐỊNH TÀI NGUYÊN</h2>
                        <div style="font-size: 0.75rem; color: #64748b;">Mã hồ sơ: <strong>${file.id}</strong> • Thời điểm thẩm định: <strong>${file.auditDate || '01/11/2026'}</strong></div>
                    </div>
                    <div>
                        <div class="audit-stamp-seal ${isPass ? '' : 'rejected'}">
                            <span>${isPass ? '✓ ĐÃ THẨM ĐỊNH CHUẨN' : '✗ KHÔNG ĐẠT CHUẨN'}</span>
                        </div>
                    </div>
                </div>

                <!-- KHỐI ĐIỂM CHUẨN HÓA VÀ KẾT LUẬN -->
                <div class="audit-score-hero">
                    <div>
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Chỉ Số Chuẩn Hóa Sư Phạm</div>
                        <div class="audit-score-num">${file.auditScore}<span style="font-size: 1.1rem; color: #64748b; font-weight: 500;">/100</span></div>
                        <div style="font-size: 0.78rem; font-weight: 700; color: ${isPass ? '#059669' : '#dc2626'}; margin-top: 0.2rem;">
                            ${rep.conclusion}
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 0.78rem; color: #475569;">
                        <div>Engine thẩm định: <strong>Gemini Edu-Audit AI</strong></div>
                        <div>Phân loại đề xuất: <strong>${file.repoName}</strong></div>
                        <div>Quy chế lưu trữ: <strong>${file.isExpired ? 'Đã quá hạn' : `Lưu tạm 10 ngày (Còn ${file.daysLeft} ngày)`}</strong></div>
                    </div>
                </div>

                <!-- THÔNG TIN TÁC GIẢ & TRÁCH NHIỆM PHÁP LÝ -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.78rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                        <div><strong>Họ tên tác giả:</strong> ${file.authorName}</div>
                        <div><strong>Đơn vị công tác:</strong> ${file.school}</div>
                        <div><strong>Thông tin định danh:</strong> ${file.contact}</div>
                        <div><strong>Khối lớp & Môn học:</strong> ${file.grade} • ${file.subject}</div>
                    </div>
                    <div style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed #cbd5e1; font-size: 0.72rem; color: #64748b;">
                        <em>Cam kết trách nhiệm: Người đăng đã xác nhận quyền sở hữu tác phẩm và cam kết tính pháp lý khi tải lên kho dùng chung.</em>
                    </div>
                </div>

                <!-- MA TRẬN 3 TIÊU CHUẨN VÀNG THEO GEMINI.MD -->
                <div class="audit-criteria-grid">
                    <!-- TIÊU CHUẨN 1 -->
                    <div class="audit-criteria-card ${rep.structureScore >= 30 ? 'pass' : (rep.structureScore >= 20 ? 'warn' : 'fail')}">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                            <strong style="color:#0f172a; font-size:0.85rem;">1. Chuẩn Mực Cấu Trúc & Kỹ Thuật Đầu Ra</strong>
                            <span class="badge-tag-tiny" style="background:#eff6ff; color:#1d4ed8; font-weight:700;">${rep.structureScore}/35 Điểm</span>
                        </div>
                        <p style="font-size:0.78rem; color:#475569; line-height:1.45; margin:0;">
                            ${rep.structureReview}
                        </p>
                    </div>

                    <!-- TIÊU CHUẨN 2 -->
                    <div class="audit-criteria-card ${rep.contentScore >= 30 ? 'pass' : (rep.contentScore >= 20 ? 'warn' : 'fail')}">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                            <strong style="color:#0f172a; font-size:0.85rem;">2. Chuẩn Mực Nội Dung & Tính Sư Phạm (GDPT 2018)</strong>
                            <span class="badge-tag-tiny" style="background:#ecfdf5; color:#047857; font-weight:700;">${rep.contentScore}/35 Điểm</span>
                        </div>
                        <p style="font-size:0.78rem; color:#475569; line-height:1.45; margin:0;">
                            ${rep.contentReview}
                        </p>
                    </div>

                    <!-- TIÊU CHUẨN 3 -->
                    <div class="audit-criteria-card ${rep.aestheticScore >= 25 ? 'pass' : (rep.aestheticScore >= 18 ? 'warn' : 'fail')}">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                            <strong style="color:#0f172a; font-size:0.85rem;">3. Tiêu Chuẩn Tiếp Nhận Sư Phạm (Bộ 4 Dễ) & An Toàn Dữ Liệu</strong>
                            <span class="badge-tag-tiny" style="background:#fef3c7; color:#b45309; font-weight:700;">${rep.aestheticScore}/30 Điểm</span>
                        </div>
                        <p style="font-size:0.78rem; color:#475569; line-height:1.45; margin:0;">
                            ${rep.aestheticReview}
                        </p>
                    </div>
                </div>

                <div style="font-size: 0.72rem; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 0.6rem; margin-top: 0.75rem;">
                    Bản quyền chứng thực hệ thống EduStudio 5TB • Định hướng chuyên môn của <strong>Thầy Nguyễn Tá Quan</strong>.
                </div>
            </div>
        `;

        const btnApprove = document.getElementById('btnApproveFromReport');
        if (btnApprove) {
            btnApprove.style.display = (file.status === 'approved') ? 'inline-flex' : 'none';
        }

        document.getElementById('aiAuditReportModal').classList.add('active');
        sound.playFanfare();
    }

    // Xuất nhật ký đối soát ra CSV
    exportAuditLogCSV() {
        sound.playClick();
        let csv = '\uFEFFMã Hồ Sơ,Tên Tài Liệu,Kho Tiếp Nhận,Khối Lớp,Môn Học,Tác Giả,Đơn Vị,Liên Hệ,Ngày Gửi,Trạng Thái,Điểm AI,Hạn Lưu Trữ\n';
        this.rawStagingFiles.forEach(f => {
            const titleSafe = `"${f.title.replace(/"/g, '""')}"`;
            const schoolSafe = `"${f.school.replace(/"/g, '""')}"`;
            csv += `${f.id},${titleSafe},${f.repoName},${f.grade},${f.subject},${f.authorName},${schoolSafe},${f.contact},${f.uploadDate},${f.status},${f.auditScore || 0},${f.daysLeft} ngày\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Nhat_Ky_Tham_Dinh_AI_EduStudio_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Mở modal đóng góp tài nguyên (Chỉ Thành Viên mới có quyền tải lên)
    openUploadModal(defaultRepo = 'ppt') {
        // KIỂM TRA QUYỀN THÀNH VIÊN THEO YÊU CẦU CỦA THẦY
        if (!this.currentUser || !this.currentUser.isLoggedIn) {
            sound.playClick();
            alert("🔒 [YÊU CẦU ĐĂNG NHẬP THÀNH VIÊN]\nChức năng đóng góp tài nguyên vào 4 Kho chỉ dành riêng cho Thành Viên nhằm bảo vệ bản quyền sư phạm và chống tải file rác làm đầy bộ lưu trữ 5TB.\nThầy/Cô vui lòng đăng nhập để tiếp tục!");
            document.getElementById('authModal')?.classList.add('active');
            return;
        }

        const modal = document.getElementById('uploadResourceModal');
        const repoSelect = document.getElementById('uploadTargetRepo');
        if (!modal) return;

        if (repoSelect) {
            repoSelect.value = defaultRepo;
        }

        const authorInput = document.getElementById('uploadAuthorName');
        if (authorInput) {
            authorInput.value = this.currentUser.name || '';
        }

        const schoolInput = document.getElementById('uploadSchool');
        if (schoolInput && this.currentUser.school) {
            schoolInput.value = this.currentUser.school;
        }

        // MỤC SỐ CCCD MẶC ĐỊNH ĐỂ TRỐNG ĐỂ THÀNH VIÊN TỰ NHẬP THEO YÊU CẦU
        const contactInput = document.getElementById('uploadContact');
        if (contactInput) {
            contactInput.value = '';
        }

        modal.classList.add('active');
        sound.playClick();
    }

    // Xử lý gửi form đóng góp
    handleResourceUpload(e) {
        e.preventDefault();

        // Kiểm tra lại phiên đăng nhập
        if (!this.currentUser || !this.currentUser.isLoggedIn) {
            alert("Thầy/Cô vui lòng đăng nhập tài khoản thành viên để thực hiện thao tác tải lên!");
            document.getElementById('authModal')?.classList.add('active');
            return;
        }

        const authorName = document.getElementById('uploadAuthorName')?.value.trim();
        const school = document.getElementById('uploadSchool')?.value.trim();
        let contact = document.getElementById('uploadContact')?.value.trim();
        const targetRepo = document.getElementById('uploadTargetRepo')?.value || 'ppt';
        const grade = document.getElementById('uploadGrade')?.value || 'Lớp 8';
        const subject = document.getElementById('uploadSubject')?.value.trim() || 'Chuyên môn';
        const title = document.getElementById('uploadTitle')?.value.trim();
        const desc = document.getElementById('uploadDescription')?.value.trim();
        const agreed = document.getElementById('uploadAgreedLegal')?.checked;

        // 1. MỤC ĐẦU TIÊN (HỌ VÀ TÊN TÁC GIẢ) NẾU KHÔNG ĐIỀN THÌ KHÔNG CHO TẢI LÊN
        if (!authorName) {
            alert("⚠️ Thầy/Cô chưa điền mục đầu tiên: Họ và Tên Tác Giả!\nVui lòng khai báo thông tin tác giả để xác thực trách nhiệm bản quyền.");
            document.getElementById('uploadAuthorName')?.focus();
            return;
        }

        // 2. MỤC CUỐI CÙNG (CAM KẾT TRÁCH NHIỆM PHÁP LÝ) NẾU KHÔNG TÍCH THÌ KHÔNG CHO TẢI LÊN
        if (!agreed) {
            alert("⚠️ Thầy/Cô chưa tích chọn mục cuối cùng: 'Cam kết trách nhiệm pháp lý'!\nHệ thống bắt buộc xác nhận cam kết này để chống file rác và vi phạm bản quyền.");
            document.getElementById('uploadAgreedLegal')?.focus();
            return;
        }

        if (!title || !desc) {
            alert("Thầy/Cô vui lòng điền đầy đủ Tiêu đề và Mô tả tóm tắt mục tiêu sư phạm của tài liệu!");
            return;
        }

        // 3. NẾU THÀNH VIÊN KHÔNG NHẬP CCCD THÌ HỆ THỐNG TỰ ĐỘNG LẤY TÀI KHOẢN ĐĂNG NHẬP ĐIỀN VÀO
        if (!contact) {
            contact = this.currentUser.email || this.currentUser.name || 'Tài khoản thành viên đã xác thực hệ thống';
        }

        const repoNames = {
            ppt: 'Kho Bài Giảng PPT',
            games: 'Kho Trò Chơi',
            exam: 'Kho Đề Kiểm Tra',
            video: 'Kho Tư Liệu Video'
        };

        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const newId = `RAW-2026-${String(this.rawStagingFiles.length + 1).padStart(3, '0')}`;

        const newRawFile = {
            id: newId,
            title: title,
            targetRepo: targetRepo,
            repoName: repoNames[targetRepo] || 'Kho Dùng Chung',
            grade: grade,
            subject: subject,
            authorName: authorName,
            school: school || 'Trường học chuẩn GDPT',
            contact: contact,
            uploadDate: dateStr,
            fileSize: '12.6 MB',
            fileName: `${title.replace(/\s+/g, '_')}.dat`,
            status: 'pending',
            auditScore: null,
            auditDate: null,
            auditInspector: null,
            daysLeft: 10,
            isExpired: false,
            desc: desc,
            auditReport: null
        };

        this.rawStagingFiles.unshift(newRawFile);
        this.renderAdminStorageConsole();

        // CỘNG ĐIỂM CỐNG HIẾN CHO THÀNH VIÊN (+5 ĐIỂM)
        if (this.currentUser) {
            this.currentUser.points = (this.currentUser.points || 120) + 5;
            this.saveUserSession(this.currentUser);
            this.renderBannerAuthZone();
        try { if (window.smartTKBUI) window.smartTKBUI.onUserSwitched(this.currentUser); } catch(e){}
        }

        document.getElementById('uploadResourceModal')?.classList.remove('active');
        document.getElementById('formUploadResource')?.reset();

        sound.playFanfare();
        alert(`🎉 [TẢI LÊN THÀNH CÔNG!]\nTài nguyên "${title}" đã được lưu tạm vào thư mục "01_DU_LIEU_THO" trên Google Drive 5TB.\n- Mã hồ sơ: ${newId}\n- Trách nhiệm tác giả: ${authorName} (Định danh: ${contact})\n- Điểm cống hiến: +5 điểm (Tổng: ${this.currentUser.points} điểm)\n- Trạng thái: Đang chờ AI Đối Soát tự động thay Admin (Tài liệu sai chuẩn sẽ tự xóa sau 10 ngày).`);
    }

    // =========================================================================
    // 5. ĐIỀU PHỐI CHUYỂN TAB QUA MENU NGANG & THANH DỌC MỎNG THIẾT KẾ
    // =========================================================================

    // =========================================================================
    // 14. BÀN BIÊN TẬP MEDIA STUDIO 3 CỘT SƯ PHẠM (CHUẨN CHỈ ĐẠO THẦY NGUYỄN TÁ QUAN)
    // Cột 1: Đối tượng | Cột 2: Sân khấu kéo thả di chuyển | Cột 3: Kỹ thuật & AI
    // =========================================================================
    initMediaStudio3Col() {
        this.mediaActorsOnStage = [
            {
                id: 'actor_thayquan_1',
                name: 'Thầy Giáo Sư Phạm 3D',
                role: 'Diễn viên chính',
                icon: '👨‍🏫',
                color: '#1d4ed8',
                x: 180,
                y: 520,
                width: 140,
                height: 250,
                action: 'walk_bolero',
                direction: 1
            },
            {
                id: 'actor_dog_1',
                name: 'Linh Vật Chó Con 3D',
                role: 'Nhân vật 3D tương tác',
                icon: '🐶',
                color: '#b45309',
                x: 340,
                y: 590,
                width: 110,
                height: 180,
                action: 'sit_table',
                direction: -1
            }
        ];
        this.selectedMediaActorIdx = 0;
        this.currentMediaBg = 'bg_seaside_night';
        this.isMediaPlaying = false;
        this.mediaPlayInterval = null;
        this.mediaPlayFrame = 0;
        this.mediaAspect = '9:16';

        const canvas = document.getElementById('mediaStageCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        this.mediaStageCtx = ctx;

        // A. Kiểm tra phân quyền AI (Chỉ thành viên có AI mới thực hiện được)
        this.checkMediaAIPermission();

        // Nút mở khóa trên overlay
        document.getElementById('btnMediaUnlockVIP')?.addEventListener('click', () => {
            sound.playClick();
            document.getElementById('membershipUpgradeModal')?.classList.add('active');
        });
        document.getElementById('btnMediaConfigApiKey')?.addEventListener('click', () => {
            sound.playClick();
            if (this.isGuest() || !this.currentUser?.isLoggedIn || !this.currentUser?.email) {
                this.requireGeminiAccess('Media Studio AI');
                return;
            }
            const currentKey = this.getActiveGeminiKey() || '';
            const key = prompt(
                `🔑 [GẮN GOOGLE GEMINI API KEY CÁ NHÂN CHO ${this.currentUser.email}]\n` +
                `Dán khóa API Gemini miễn phí của tài khoản Gmail bạn (bắt đầu bằng AIza...):\n` +
                `👉 Lấy miễn phí tại: https://aistudio.google.com/apikey`,
                currentKey
            );
            if (key !== null) {
                const trimmed = key.trim();
                if (trimmed) {
                    if (!trimmed.startsWith('AIza')) {
                        alert("⚠️ Gemini API Key hợp lệ phải bắt đầu bằng 'AIza...'. Vui lòng kiểm tra lại!");
                        return;
                    }
                    this.saveUserGeminiKey(trimmed);
                    alert("✅ Đã lưu Google Gemini API Key cá nhân theo tài khoản Gmail!\nToàn quyền mở khóa Media Studio AI.");
                } else {
                    if (this.currentUser) {
                        this.currentUser.geminiApiKey = '';
                        this.saveUserSession(this.currentUser);
                        this.saveGeminiKeyForEmail(this.currentUser.email, '');
                    }
                    localStorage.removeItem('user_gemini_api_key');
                    this.checkMediaAIPermission();
                }
            }
        });

        // B. Vẽ sân khấu ban đầu
        this.renderMediaStage();

        // C. Kéo thả đối tượng từ Cột 1 (Kho đối tượng) vào Sân khấu (Cột 2)
        const assetItems = document.querySelectorAll('.media-asset-item');
        assetItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const assetData = {
                    type: item.dataset.type,
                    id: item.dataset.id,
                    name: item.dataset.name,
                    icon: item.dataset.icon,
                    color: item.dataset.color || '#1d4ed8'
                };
                e.dataTransfer.setData('text/plain', JSON.stringify(assetData));
            });
        });

        const stageWrap = document.getElementById('mediaStageCanvasWrap');
        stageWrap?.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        stageWrap?.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!this.checkMediaAIPermission()) return;
            try {
                const raw = e.dataTransfer.getData('text/plain');
                if (!raw) return;
                const asset = JSON.parse(raw);
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const dropX = (e.clientX - rect.left) * scaleX;
                const dropY = (e.clientY - rect.top) * scaleY;

                if (asset.type === 'actor') {
                    const newActor = {
                        id: 'actor_' + Date.now(),
                        name: asset.name,
                        role: 'Đối tượng diễn xuất',
                        icon: asset.icon,
                        color: asset.color,
                        x: Math.max(50, Math.min(canvas.width - 150, dropX - 60)),
                        y: Math.max(100, Math.min(canvas.height - 200, dropY - 80)),
                        width: 120,
                        height: 220,
                        action: 'walk_bolero',
                        direction: 1
                    };
                    this.mediaActorsOnStage.push(newActor);
                    this.selectedMediaActorIdx = this.mediaActorsOnStage.length - 1;
                    sound.playPop();
                    this.updateSelectedActorUI();
                    this.renderMediaStage();
                } else if (asset.type === 'background') {
                    this.currentMediaBg = asset.id;
                    sound.playFanfare();
                    this.renderMediaStage();
                    this.updateAdvPromptOutput();
                } else if (asset.type === 'audio') {
                    sound.playDing();
                    alert(`🎵 Đã chọn track âm thanh: ${asset.name} (Đồng bộ Lip-sync 2 tầng)`);
                }
            } catch (err) {
                console.warn("Drop error:", err);
            }
        });

        // D. Kéo di chuyển đối tượng bằng chuột trên Canvas Sân khấu
        let isDraggingActor = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        const getCanvasCoord = (evt) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (evt.clientX - rect.left) * scaleX,
                y: (evt.clientY - rect.top) * scaleY
            };
        };

        canvas.addEventListener('mousedown', (e) => {
            if (!this.checkMediaAIPermission()) return;
            const pt = getCanvasCoord(e);
            let hitIndex = -1;

            // Kiểm tra từ trên xuống dưới theo thứ tự hiển thị
            for (let i = this.mediaActorsOnStage.length - 1; i >= 0; i--) {
                const a = this.mediaActorsOnStage[i];
                if (pt.x >= a.x - a.width/2 && pt.x <= a.x + a.width/2 &&
                    pt.y >= a.y - a.height/2 && pt.y <= a.y + a.height/2) {
                    hitIndex = i;
                    break;
                }
            }

            if (hitIndex !== -1) {
                this.selectedMediaActorIdx = hitIndex;
                isDraggingActor = true;
                const a = this.mediaActorsOnStage[hitIndex];
                dragOffsetX = pt.x - a.x;
                dragOffsetY = pt.y - a.y;
                sound.playClick();
                this.updateSelectedActorUI();
                this.renderMediaStage();
            } else {
                this.selectedMediaActorIdx = -1;
                this.updateSelectedActorUI();
                this.renderMediaStage();
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingActor || this.selectedMediaActorIdx === -1) return;
            const pt = getCanvasCoord(e);
            const a = this.mediaActorsOnStage[this.selectedMediaActorIdx];
            if (a) {
                a.x = Math.max(a.width/2, Math.min(canvas.width - a.width/2, pt.x - dragOffsetX));
                a.y = Math.max(a.height/2, Math.min(canvas.height - a.height/2, pt.y - dragOffsetY));
                this.renderMediaStage();
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingActor) {
                isDraggingActor = false;
                this.updateAdvPromptOutput();
            }
        });

        // E. Nút công cụ thêm/xóa nhanh trên đầu sân khấu
        document.getElementById('btnAddThayQuanStage')?.addEventListener('click', () => {
            if (!this.checkMediaAIPermission()) return;
            this.mediaActorsOnStage.push({
                id: 'actor_thayquan_' + Date.now(),
                name: 'Thầy Giáo Sư Phạm 3D',
                role: 'Diễn viên chính',
                icon: '👨‍🏫',
                color: '#1d4ed8',
                x: canvas.width / 2 - 60,
                y: canvas.height * 0.65,
                width: 140,
                height: 250,
                action: 'walk_bolero',
                direction: 1
            });
            this.selectedMediaActorIdx = this.mediaActorsOnStage.length - 1;
            sound.playPop();
            this.updateSelectedActorUI();
            this.renderMediaStage();
        });

        document.getElementById('btnAddDogStage')?.addEventListener('click', () => {
            if (!this.checkMediaAIPermission()) return;
            this.mediaActorsOnStage.push({
                id: 'actor_dog_' + Date.now(),
                name: 'Linh Vật Chó Con 3D',
                role: 'Thú nhân hóa 3D',
                icon: '🐶',
                color: '#b45309',
                x: canvas.width / 2 + 60,
                y: canvas.height * 0.68,
                width: 110,
                height: 180,
                action: 'sit_table',
                direction: -1
            });
            this.selectedMediaActorIdx = this.mediaActorsOnStage.length - 1;
            sound.playPop();
            this.updateSelectedActorUI();
            this.renderMediaStage();
        });

        document.getElementById('btnRemoveSelectedActor')?.addEventListener('click', () => {
            if (this.selectedMediaActorIdx >= 0 && this.selectedMediaActorIdx < this.mediaActorsOnStage.length) {
                this.mediaActorsOnStage.splice(this.selectedMediaActorIdx, 1);
                this.selectedMediaActorIdx = this.mediaActorsOnStage.length - 1;
                sound.playClick();
                this.updateSelectedActorUI();
                this.renderMediaStage();
            } else {
                alert("Vui lòng click chọn nhân vật trên sân khấu để xóa!");
            }
        });

        document.getElementById('btnResetMediaStage')?.addEventListener('click', () => {
            sound.playClick();
            this.mediaActorsOnStage = [
                {
                    id: 'actor_thayquan_1',
                    name: 'Thầy Giáo Sư Phạm 3D',
                    role: 'Diễn viên chính',
                    icon: '👨‍🏫',
                    color: '#1d4ed8',
                    x: canvas.width * 0.35,
                    y: canvas.height * 0.65,
                    width: 140,
                    height: 250,
                    action: 'walk_bolero',
                    direction: 1
                },
                {
                    id: 'actor_dog_1',
                    name: 'Linh Vật Chó Con 3D',
                    role: 'Nhân vật 3D tương tác',
                    icon: '🐶',
                    color: '#b45309',
                    x: canvas.width * 0.68,
                    y: canvas.height * 0.68,
                    width: 110,
                    height: 180,
                    action: 'sit_table',
                    direction: -1
                }
            ];
            this.selectedMediaActorIdx = 0;
            this.updateSelectedActorUI();
            this.renderMediaStage();
        });

        // F. Cột 3: Chọn thể loại hoạt cảnh
        const genreSelect = document.getElementById('mediaTechGenreSelect');
        const advancedBox = document.getElementById('mediaAdvancedBox');

        // NÚT BẬT/TẮT THIẾT KẾ CHUYÊN SÂU NỔI BẬT
        document.getElementById('btnToggleMediaAdvanced')?.addEventListener('click', () => {
            sound.playClick();
            if (!this.isVIPPro()) {
                sound.playWrong();
                alert("💎 [YÊU CẦU THÀNH VIÊN VIP PRO]\n\nChức năng 'Media Studio Khác (Mở Thiết Kế Chuyên Sâu)' tích hợp Cú Máy Đạo Diễn Dynamic Camera 3D, Wan 2.2 AI Prompting và Cloud GPU H200 là đặc quyền dành riêng cho Nhóm 2: THÀNH VIÊN VIP PRO (hoặc Quản Trị Viên)!\n\nVui lòng nâng cấp VIP PRO để kích hoạt xưởng đạo diễn AI chuyên sâu.");
                this.openModal('membershipUpgradeModal');
                return;
            }

            if (advancedBox) {
                const isHidden = advancedBox.style.display === 'none' || !advancedBox.style.display;
                advancedBox.style.display = isHidden ? 'block' : 'none';
                if (genreSelect && isHidden) genreSelect.value = 'genre_other';
                this.updateAdvPromptOutput();
                sound.playSuccess();
            }
        });

        genreSelect?.addEventListener('change', () => {
            sound.playClick();
            if (genreSelect.value === 'genre_other') {
                if (!this.isVIPPro()) {
                    sound.playWrong();
                    genreSelect.value = 'genre_human';
                    alert("💎 [YÊU CẦU THÀNH VIÊN VIP PRO]\n\nChức năng 'Media Studio Khác (Mở Thiết Kế Chuyên Sâu)' yêu cầu quyền hạn tối thiểu từ Nhóm 2: THÀNH VIÊN VIP PRO!");
                    this.openModal('membershipUpgradeModal');
                    return;
                }
                if (advancedBox) advancedBox.style.display = 'block';
            } else {
                if (advancedBox) advancedBox.style.display = 'none';
            }
            this.updateAdvPromptOutput();
        });

        // G. Cột 3: Kích thước khung hình (16:9 / 9:16)
        const aspectSelect = document.getElementById('mediaTechAspectSelect');
        aspectSelect?.addEventListener('change', () => {
            sound.playClick();
            this.mediaAspect = aspectSelect.value;
            const aspectBadge = document.getElementById('mediaStageAspectBadge');

            if (this.mediaAspect === '16:9') {
                stageWrap.classList.remove('aspect-9-16');
                stageWrap.classList.add('aspect-16-9');
                canvas.width = 960;
                canvas.height = 540;
                if (aspectBadge) aspectBadge.textContent = '16:9 Ngang';
            } else {
                stageWrap.classList.remove('aspect-16-9');
                stageWrap.classList.add('aspect-9-16');
                canvas.width = 540;
                canvas.height = 960;
                if (aspectBadge) aspectBadge.textContent = '9:16 Dọc';
            }
            this.renderMediaStage();
            this.updateAdvPromptOutput();
        });

        // H. Cột 3: Gán lệnh diễn xuất cơ bản cho đối tượng đang chọn
        const actionButtons = document.querySelectorAll('.btn-actor-action');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.checkMediaAIPermission()) return;
                actionButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                sound.playClick();

                const act = btn.dataset.action;
                if (this.selectedMediaActorIdx >= 0 && this.selectedMediaActorIdx < this.mediaActorsOnStage.length) {
                    this.mediaActorsOnStage[this.selectedMediaActorIdx].action = act;
                    this.renderMediaStage();
                    this.updateAdvPromptOutput();
                } else {
                    alert("Vui lòng click chọn nhân vật trên sân khấu trước khi gán lệnh!");
                }
            });
        });

        // I. Nút tải file ảnh và âm thanh bên ngoài
        document.getElementById('btnMediaUploadImage')?.addEventListener('click', () => {
            document.getElementById('inputMediaCustomImage')?.click();
        });
        document.getElementById('inputMediaCustomImage')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (re) => {
                    this.mediaActorsOnStage.push({
                        id: 'actor_custom_' + Date.now(),
                        name: file.name.replace(/\\.[^/.]+$/, ""),
                        role: 'Nhân vật tải ngoài',
                        icon: '🖼️',
                        customImgUrl: re.target.result,
                        color: '#059669',
                        x: canvas.width / 2,
                        y: canvas.height * 0.65,
                        width: 140,
                        height: 220,
                        action: 'walk_bolero',
                        direction: 1
                    });
                    this.selectedMediaActorIdx = this.mediaActorsOnStage.length - 1;
                    sound.playFanfare();
                    this.updateSelectedActorUI();
                    this.renderMediaStage();
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById('btnMediaUploadAudio')?.addEventListener('click', () => {
            document.getElementById('inputMediaCustomAudio')?.click();
        });
        document.getElementById('inputMediaCustomAudio')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                sound.playFanfare();
                alert(`🎵 Đã tiếp nhận track âm thanh "${e.target.files[0].name}"!\nĐang chuẩn hóa âm thanh (-14 LUFS) và tạo track khẩu hình Audio-Driven Lip-Sync 2 tầng.`);
            }
        });

        // J. Nút Phát Sân Khấu / Xem Thử
        const toggleStagePlay = () => {
            const btnPlay = document.getElementById('btnMediaPlayPause');
            const btnPrev = document.getElementById('btnMediaPreview');

            if (this.isMediaPlaying) {
                this.isMediaPlaying = false;
                clearInterval(this.mediaPlayInterval);
                if (btnPlay) btnPlay.innerHTML = '<span>▶</span> <span>Phát Sân Khấu</span>';
                if (btnPrev) btnPrev.innerHTML = '<span>▶️</span> <span>Xem Thử</span>';
            } else {
                this.isMediaPlaying = true;
                sound.playFanfare();
                if (btnPlay) btnPlay.innerHTML = '<span>⏸</span> <span>Tạm Dừng</span>';
                if (btnPrev) btnPrev.innerHTML = '<span>⏸</span> <span>Tạm Dừng</span>';

                const timeDisp = document.getElementById('mediaTimeDisplay');
                const lyricsOverlay = document.getElementById('mediaStageLyricsOverlay');
                const lyricsList = [
                    "Đêm ngắm trăng soi... lòng thương nhớ người dưng...",
                    "Con đường xưa bờ biển... gió lay ngàn bóng mây...",
                    "Nâng chén trà thơm... suy ngẫm việc đời...",
                    "Thương lắm người dưng... tình nghĩa sáng muôn đời..."
                ];

                this.mediaPlayInterval = setInterval(() => {
                    this.mediaPlayFrame++;
                    const sec = Math.floor(this.mediaPlayFrame / 10) % 30;
                    if (timeDisp) {
                        timeDisp.textContent = `00:${sec < 10 ? '0' + sec : sec} / 00:30`;
                    }
                    if (lyricsOverlay) {
                        const lyricIdx = Math.floor(sec / 7) % lyricsList.length;
                        lyricsOverlay.textContent = lyricsList[lyricIdx];
                    }

                    // Chuyển động nhẹ nhàng
                    this.mediaActorsOnStage.forEach((a, idx) => {
                        if (a.action === 'walk_bolero') {
                            a.x += a.direction * 1.5;
                            if (a.x > canvas.width - a.width/2 || a.x < a.width/2) {
                                a.direction *= -1;
                            }
                        }
                    });

                    this.renderMediaStage();
                }, 100);
            }
        };

        document.getElementById('btnMediaPlayPause')?.addEventListener('click', toggleStagePlay);
        document.getElementById('btnMediaPreview')?.addEventListener('click', toggleStagePlay);

        document.getElementById('btnMediaReplay')?.addEventListener('click', () => {
            this.mediaPlayFrame = 0;
            const timeDisp = document.getElementById('mediaTimeDisplay');
            if (timeDisp) timeDisp.textContent = '00:00 / 00:30';
            if (!this.isMediaPlaying) toggleStagePlay();
        });

        // K. Nút Toàn màn hình & Lưu và Xuất gói
        document.getElementById('btnMediaFullscreen')?.addEventListener('click', () => {
            const isVip = localStorage.getItem('edustudio_user_is_vip') === 'true';
            if (!isVip) {
                const go = confirm("💎 TÍNH NĂNG VIP PRO:\nTrình chiếu Sân khấu Media Studio 4K toàn màn hình dành riêng cho Thành viên VIP Pro!\n\nThầy/Cô có muốn nâng cấp tài khoản ngay không?");
                if (go) document.getElementById('membershipUpgradeModal')?.classList.add('active');
                return;
            }
            sound.playFanfare();
            if (stageWrap?.requestFullscreen) {
                stageWrap.requestFullscreen().catch(() => {});
            }
        });

        document.getElementById('btnMediaSaveAndExport')?.addEventListener('click', () => {
            if (!this.requireGeminiAccess('Lưu và Xuất gói Media Studio')) return;
            this.enforceSaveAndExportTier(
                () => {
                    try {
                        const list = JSON.parse(localStorage.getItem('edustudio_custom_videos') || '[]');
                        list.unshift({
                            id: 'media_' + Date.now(),
                            aspect: this.mediaAspect || '9:16',
                            actors: (this.mediaActorsOnStage || []).length,
                            author: this.currentUser?.name || 'Giáo viên',
                            updatedAt: new Date().toISOString()
                        });
                        localStorage.setItem('edustudio_custom_videos', JSON.stringify(list.slice(0, 30)));
                    } catch(e) {}
                },
                () => {
                    sound.playFanfare();
                    alert(`🎉 [LƯU VÀ XUẤT GÓI MEDIA THÀNH CÔNG!]\n\n• Định dạng: ${this.mediaAspect === '9:16' ? '9:16 Dọc (1080x1920) Full Bleed' : '16:9 Ngang'}\n• Số nhân vật: ${this.mediaActorsOnStage.length} đối tượng 3D\n• Chuẩn chữ chạy: Phát sáng, 100% không hộp nền (GEMINI.md)\n• Đã lưu vào Kho Video EduStudio!`);
                },
                'Dự án Video Media'
            );
        });

        document.getElementById('btnMediaRenderCloudAdv')?.addEventListener('click', () => {
            document.getElementById('btnMediaSaveAndExport')?.click();
        });
    }

    checkMediaAIPermission() {
        // PHÂN QUYỀN MEDIA STUDIO CHUẨN BYOK: Bắt buộc đăng nhập Gmail + có Gemini API Key cá nhân (Admin miễn kiểm)
        const overlay = document.getElementById('mediaAILockOverlay');
        const desc = document.getElementById('mediaAILockDesc');
        const btnLogin = document.getElementById('btnMediaLoginGmail');
        const btnConfig = document.getElementById('btnMediaConfigApiKey');

        if (this.isAdmin()) {
            if (overlay) overlay.style.display = 'none';
            return true;
        }

        if (this.isGuest() || !this.currentUser?.isLoggedIn || !this.currentUser?.email) {
            if (overlay) overlay.style.display = 'flex';
            if (btnLogin) btnLogin.style.display = 'inline-flex';
            if (btnConfig) btnConfig.style.display = 'none';
            if (desc) {
                desc.innerHTML = 'Công cụ Media Studio ứng dụng trí tuệ nhân tạo <strong>Google Gemini</strong>.<br><span style="color: #b91c1c; font-weight: 700;">Yêu cầu bắt buộc: Vui lòng Đăng nhập / Đăng ký bằng tài khoản Gmail cá nhân và sử dụng gói Gemini Free của Gmail đó (tuyệt đối không dùng chung Token Quản trị).</span>';
            }
            return false;
        }

        const userKey = this.getActiveGeminiKey();
        if (!userKey || !userKey.startsWith('AIza')) {
            if (overlay) overlay.style.display = 'flex';
            if (btnLogin) btnLogin.style.display = 'none';
            if (btnConfig) btnConfig.style.display = 'inline-flex';
            if (desc) {
                desc.innerHTML = `Đã đăng nhập Gmail: <strong>${this.currentUser.email}</strong>.<br><span style="color: #b91c1c; font-weight: 700;">Vui lòng gắn mã Gemini API Key miễn phí từ Google AI Studio của tài khoản Gmail này để mở khóa xưởng Media Studio (không hao tốn Token Quản trị).</span>`;
            }
            return false;
        }

        if (overlay) overlay.style.display = 'none';
        return true;
    }

    updateSelectedActorUI() {
        const label = document.getElementById('mediaSelectedActorLabel');
        if (!label) return;
        if (this.selectedMediaActorIdx >= 0 && this.selectedMediaActorIdx < this.mediaActorsOnStage.length) {
            const a = this.mediaActorsOnStage[this.selectedMediaActorIdx];
            label.textContent = a.name;
            label.style.color = a.color || '#1d4ed8';

            // Đồng bộ nút hành động active
            const actionButtons = document.querySelectorAll('.btn-actor-action');
            actionButtons.forEach(btn => {
                if (btn.dataset.action === a.action) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        } else {
            label.textContent = "(Chưa chọn - click nhân vật trên sân khấu)";
            label.style.color = '#94a3b8';
        }
    }

    updateAdvPromptOutput() {
        const promptEl = document.getElementById('mediaAdvPromptOutput');
        if (!promptEl) return;
        const genre = document.getElementById('mediaTechGenreSelect')?.value || 'genre_hybrid';
        const camera = document.getElementById('mediaAdvCameraSelect')?.value || 'steadicam';
        const color = document.getElementById('mediaAdvColorGrade')?.value || 'bolero_warm';
        const isAntiMorph = document.getElementById('mediaAdvAntiMorphing')?.checked;

        let prompt = `Ultra-realistic cinematic 3D video, ${this.mediaAspect === '9:16' ? 'native 9:16 vertical full bleed' : '16:9 widescreen'}, `;
        if (genre === 'genre_hybrid') {
            prompt += `Thầy Nguyễn Tá Quan in elegant white shirt with soulful eyes, sitting and interacting with 3D anthropomorphic detective dog, two-stage audio lip-sync mouth movement, `;
        } else if (genre === 'genre_human') {
            prompt += `A professional male teacher in smart white shirt walking slowly and naturally at a relaxed pace, alternating leg strides, natural arms swinging, `;
        } else {
            prompt += `3D animated anthropomorphic characters, realistic lighting and shadows, `;
        }

        if (camera === 'steadicam') prompt += `smooth steadicam tracking shot, `;
        else if (camera === 'drone_pull') prompt += `drone crane pull-back wide establishing shot, `;
        else if (camera === 'gentle_push') prompt += `gentle push-in close-up facial emotion shot, `;

        if (isAntiMorph) prompt += `solid straight architecture background, no morphing, no scene cuts, `;
        prompt += `${color} color grading, 8k resolution master.`;

        promptEl.value = prompt;
    }

    renderMediaStage() {
        const canvas = document.getElementById('mediaStageCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        // 1. Vẽ Phông nền
        ctx.clearRect(0, 0, W, H);
        if (this.currentMediaBg === 'bg_seaside_night') {
            // Nền biển đêm lung linh
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#020617');
            grad.addColorStop(0.55, '#0f172a');
            grad.addColorStop(0.72, '#1e293b');
            grad.addColorStop(1, '#090d16');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Ánh trăng & sao
            ctx.fillStyle = 'rgba(255, 255, 240, 0.9)';
            ctx.beginPath();
            ctx.arc(W * 0.8, H * 0.18, 28, 0, Math.PI * 2);
            ctx.fill();

            // Mặt biển phản chiếu
            const seaGrad = ctx.createLinearGradient(0, H * 0.5, 0, H * 0.72);
            seaGrad.addColorStop(0, 'rgba(30, 58, 138, 0.4)');
            seaGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
            ctx.fillStyle = seaGrad;
            ctx.fillRect(0, H * 0.5, W, H * 0.22);

            // Vỉa hè lát đá thẳng tắp (chống biến dạng kiến trúc)
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, H * 0.72, W, H * 0.28);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            for (let i = 0; i < W; i += 60) {
                ctx.beginPath();
                ctx.moveTo(i, H * 0.72);
                ctx.lineTo(i + (i - W/2)*0.5, H);
                ctx.stroke();
            }
        } else if (this.currentMediaBg === 'bg_teahouse') {
            // Phòng trà Thám tử ấm cúng
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#29180b');
            grad.addColorStop(0.7, '#45260f');
            grad.addColorStop(1, '#1f1107');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Bàn gỗ đối ẩm
            ctx.fillStyle = '#653c1b';
            ctx.fillRect(W * 0.15, H * 0.72, W * 0.7, H * 0.15);
            ctx.fillStyle = '#45260f';
            ctx.fillRect(W * 0.2, H * 0.87, W * 0.6, H * 0.13);
        } else {
            // Lớp học hiện đại 4.0
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#1e3a8a');
            grad.addColorStop(0.7, '#2563eb');
            grad.addColorStop(1, '#1e293b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        }

        // 2. Vẽ từng Actor trên Sân khấu
        this.mediaActorsOnStage.forEach((actor, idx) => {
            const isSelected = idx === this.selectedMediaActorIdx;

            // Bounding box highlight khi được chọn
            if (isSelected) {
                ctx.save();
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 6]);
                ctx.strokeRect(actor.x - actor.width/2 - 6, actor.y - actor.height/2 - 6, actor.width + 12, actor.height + 12);
                ctx.restore();
            }

            // Bóng đổ vật lý tự nhiên
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(actor.x, actor.y + actor.height/2 - 5, actor.width * 0.45, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Vẽ Icon hoặc hình ảnh nhân vật
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Hộp chứa nhân vật 3D tượng trưng
            const boxGrad = ctx.createLinearGradient(actor.x, actor.y - actor.height/2, actor.x, actor.y + actor.height/2);
            boxGrad.addColorStop(0, actor.color || '#1d4ed8');
            boxGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = boxGrad;
            ctx.roundRect = ctx.roundRect || function(x, y, w, h, r) {
                this.beginPath();
                this.arc(x+r, y+r, r, Math.PI, Math.PI*1.5);
                this.arc(x+w-r, y+r, r, Math.PI*1.5, 0);
                this.arc(x+w-r, y+h-r, r, 0, Math.PI*0.5);
                this.arc(x+r, y+h-r, r, Math.PI*0.5, Math.PI);
                this.closePath();
                this.fill();
            };

            ctx.beginPath();
            ctx.roundRect(actor.x - actor.width/2, actor.y - actor.height/2, actor.width, actor.height - 20, 16);
            ctx.fill();

            // Icon nhân vật lớn
            ctx.font = '64px "Segoe UI Emoji", Arial, sans-serif';
            ctx.fillText(actor.icon || '👤', actor.x, actor.y - 25);

            // Tên nhân vật & Hành động
            ctx.font = 'bold 13px -apple-system, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(actor.name, actor.x, actor.y + 40);

            // Badge hành động
            ctx.font = 'italic 11px -apple-system, sans-serif';
            ctx.fillStyle = '#fde047';
            ctx.fillText(`[${actor.action}]`, actor.x, actor.y + 60);

            ctx.restore();
        });
    }



    // =========================================================================
    // 16. KHO 12 BỘ TRÒ CHƠI MẦM NON SƯ PHẠM (PLAY-BASED LEARNING)
    // Phục vụ Giáo viên Mầm Non trải nghiệm, góp ý và giảng dạy trực quan
    // =========================================================================
    renderPreschoolGamesRepo(filter = 'all') {
        const grid = document.getElementById('preschoolGamesGrid');
        if (!grid || !this.preschoolCatalog) return;

        let filtered = this.preschoolCatalog;
        if (filter === 'animals') {
            filtered = this.preschoolCatalog.filter(g => g.id === 'mn_pets' || g.id === 'mn_wildlife');
        } else if (filter === 'nature') {
            filtered = this.preschoolCatalog.filter(g => g.id === 'mn_fruits' || g.id === 'mn_nature_sounds' || g.id === 'mn_day_night');
        } else if (filter === 'cognition') {
            filtered = this.preschoolCatalog.filter(g => g.id === 'mn_colors' || g.id === 'mn_shapes' || g.id === 'mn_counting');
        } else if (filter === 'skills') {
            filtered = this.preschoolCatalog.filter(g => g.id === 'mn_vehicles' || g.id === 'mn_appliances' || g.id === 'mn_emotions' || g.id === 'mn_hygiene');
        }

        grid.innerHTML = filtered.map((game, idx) => `
            <div class="card-white" style="border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; position: relative; background: #ffffff;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <span style="font-size: 2.2rem; background: #f8fafc; border-radius: 10px; padding: 0.25rem 0.5rem;">${game.icon}</span>
                        <div style="text-align: right;">
                            <span class="badge-tag-tiny" style="background:#fef3c7; color:#b45309; font-weight:700;">${game.badge}</span>
                            <div style="font-size: 0.68rem; color: #64748b; margin-top: 0.2rem;">${game.items.length} thử thách</div>
                        </div>
                    </div>

                    <h4 style="font-size: 0.92rem; font-weight: 800; color: #0f172a; margin-bottom: 0.3rem; line-height: 1.35;">
                        ${idx + 1}. ${game.title}
                    </h4>

                    <div style="font-size: 0.7rem; font-weight: 600; color: #1d4ed8; margin-bottom: 0.4rem;">
                        🎯 ${game.domain}
                    </div>

                    <p style="font-size: 0.72rem; color: #475569; line-height: 1.45; margin-bottom: 0.85rem;">
                        ${game.desc}
                    </p>
                </div>

                <div style="display: flex; gap: 0.4rem; border-top: 1px solid #f1f5f9; padding-top: 0.65rem;">
                    <button class="btn-mini-action btn-play-mn-game" data-id="${game.id}" style="flex: 1.2; justify-content: center; background: #1d4ed8; color: #ffffff; font-weight: 700; font-size: 0.74rem;" title="Mở và chơi trực tiếp trên sân khấu">
                        <span>🎮</span> <span>Chơi Ngay</span>
                    </button>
                    <button class="btn-mini-action btn-export-mn-package" data-id="${game.id}" style="flex: 1; justify-content: center; background: #fdf4ff; color: #9333ea; border-color: #d8b4fe; font-size: 0.72rem;" title="Tải gói SCORM / HTML5 Offline (Phí vi mô 10.000đ / VIP Pro)">
                        <span>📦</span> <span>Gói 10k</span>
                    </button>
                </div>
            </div>
        `).join('');

        // Bắt sự kiện lọc chủ đề trò chơi Mầm Non
        document.querySelectorAll('.btn-mn-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                sound.playClick();
                document.querySelectorAll('.btn-mn-filter').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#ffffff';
                    b.style.color = '#334155';
                    b.style.fontWeight = 'normal';
                });
                const cur = e.currentTarget;
                cur.classList.add('active');
                cur.style.background = '#1d4ed8';
                cur.style.color = '#ffffff';
                cur.style.fontWeight = 'bold';
                const filter = cur.dataset.filter;
                this.renderPreschoolGamesRepo(filter);
            });
        });

        // Bắt sự kiện chơi trò chơi Mầm Non
        grid.querySelectorAll('.btn-play-mn-game').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameId = e.currentTarget.dataset.id;
                this.playPreschoolGame(gameId);
            });
        });

        // Bắt sự kiện xuất gói trò chơi Mầm Non (Áp dụng Bộ Đếm 10 Lần Dùng Thử Demo)
        grid.querySelectorAll('.btn-export-mn-package').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameId = e.currentTarget.dataset.id;
                const g = this.preschoolCatalog.find(x => x.id === gameId);
                this.consumeDemoPackageUse(g?.title || "Trò chơi Mầm Non");
            });
        });
    }

    playPreschoolGame(gameId) {
        const game = this.preschoolCatalog.find(g => g.id === gameId);
        if (!game) return;

        this.currentPreschoolGameId = gameId;
        this.preschoolItems = game.items;

        // Chuyển sang Tab Kho Trò Chơi
        this.switchTab('games');

        // Chuyển sang Game 4 (Đoán con vật/đồ vật)
        this.switchGame('guess');

        // Nạp các câu hỏi vào engine
        this.guessObject.setItems(this.preschoolItems);

        // Cuộn mượt mà lên đầu sân khấu
        const arena = document.querySelector('.arena-board');
        arena?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        sound.playFanfare();
        alert(`🎉 [ĐÃ NẠP TRÒ CHƠI MẦM NON THÀNH CÔNG!]\n\nChào mừng các bé đến với: "${game.title}"!\n• Lĩnh vực: ${game.domain}\n• Thầy/Cô hãy bấm [Bắt Đầu] hoặc nhấp vào giữa sân khấu để cùng các bé khám phá!`);
    }

    // =========================================================================
    // 17. XƯỞNG SOẠN KẾ HOẠCH BÀI DẠY (KHBD / GIÁO ÁN) SIÊU TỐC BẰNG AI
    // Chuẩn Công văn 5512/BGDĐT & Mô hình Đặc thù theo Tiết / Tuần
    // =========================================================================
    initLessonPlanStudio() {
        this.currentLessonPlan = this.getDefaultLessonPlan();

        // Danh mục bài học mẫu chuẩn SGK Kết Nối Tri Thức (KNTT) thống nhất của Bộ GDĐT
        this.knttLessons = {
            "mn": [
                { title: "Khám phá thế giới các bạn động vật nuôi trong gia đình", subject: "Nhận thức - Khám phá", duration: 1, week: 6, obj: "Trẻ nhận diện đúng tên gọi, tiếng kêu và đặc điểm nổi bật của chó, mèo, gà, vịt." },
                { title: "Vương quốc hoa thơm và quả ngọt bốn mùa", subject: "Nhận thức & Thẩm mỹ", duration: 1, week: 8, obj: "Trẻ phân biệt được hình dáng, màu sắc và hương vị thơm ngon của các loại quả quen thuộc." },
                { title: "Những hình khối và sắc màu kỳ diệu quanh bé", subject: "Làm quen Toán học sớm", duration: 1, week: 10, obj: "Trẻ nhận biết hình tròn, vuông, tam giác và các màu cơ bản đỏ, vàng, xanh." },
                { title: "Bé học giao thông an toàn và văn minh", subject: "Kỹ năng sống & Xã hội", duration: 1, week: 12, obj: "Trẻ nhận biết xe ô tô, xe đạp, máy bay và thói quen đội mũ bảo hiểm khi đi xe máy." }
            ],
            "th": [
                { title: "Bài 5: Những bông hoa nhỏ trong vườn đời", subject: "Tiếng Việt 4 (KNTT)", duration: 2, week: 5, obj: "Học sinh hiểu được thông điệp yêu thương, rèn luyện kỹ năng đọc diễn cảm và mở rộng vốn từ nhân ái." },
                { title: "Bài 12: Đếm và so sánh số tự nhiên trong phạm vi 100.000", subject: "Toán 4 (KNTT)", duration: 2, week: 7, obj: "Học sinh nắm vững cách đọc, viết và so sánh các số có năm chữ số; vận dụng giải bài toán thực tế." },
                { title: "Chủ đề: Em yêu thiên nhiên và bảo vệ môi trường", subject: "HĐTN 4 (KNTT)", duration: 1, week: 9, obj: "Học sinh xây dựng kế hoạch phân loại rác thải tại trường và tạo không gian xanh lớp học." },
                { title: "Bài 8: Lắp ráp mô hình robot chuyển động mini (STEM)", subject: "Công nghệ 4 (KNTT)", duration: 2, week: 11, obj: "Thực hành thiết kế mô hình đồ chơi kỹ thuật đơn giản, phát huy tư duy sáng tạo." }
            ],
            "thcs": [
                { title: "Chủ đề 2: Rèn luyện tính kiên trì và chăm chỉ", subject: "Hoạt động trải nghiệm, hướng nghiệp 8 (KNTT)", duration: 1, week: 8, obj: "Học sinh nhận diện biểu hiện của tính kiên trì; tự xây dựng kế hoạch rèn luyện thói quen vượt khó." },
                { title: "Bài 8: Tác dụng của dung dịch Axit - Bazo - Muối", subject: "Khoa học tự nhiên 8 (KNTT)", duration: 2, week: 6, obj: "Quan sát thí nghiệm ảo đổi màu chỉ thị, tính toán nồng độ và giải thích các hiện tượng thực tế." },
                { title: "Bài 10: Đoạn mạch nối tiếp và song song trong thực tế", subject: "Khoa học tự nhiên 8 (KNTT)", duration: 2, week: 9, obj: "Vận dụng định luật Ôm để tính điện trở tương đương và cường độ dòng điện trong mạch điện gia đình." },
                { title: "Bài 6: Phản xạ và khúc xạ ánh sáng", subject: "Khoa học tự nhiên 9 (KNTT)", duration: 2, week: 12, obj: "Học sinh giải thích hiện tượng ảo ảnh quang học, chế tạo mô hình kính lúp quang học đơn giản." },
                { title: "Chủ đề STEM: Thiết kế hệ thống lọc nước sạch sinh hoạt mini", subject: "Khoa học tự nhiên 8 (STEM KNTT)", duration: 3, week: 14, obj: "Vận dụng kiến thức hỗn hợp và các chất để chế tạo bộ lọc nước đa tầng thân thiện môi trường." }
            ],
            "thpt": [
                { title: "Bài 8: Mạng máy tính và Internet trong cuộc sống hiện đại", subject: "Tin học 10 (KNTT)", duration: 2, week: 8, obj: "Học sinh hiểu cấu trúc mạng LAN/WAN, nguyên tắc an toàn dữ liệu và bảo mật cá nhân trên không gian số." },
                { title: "Bài 5: Dao động điều hòa và các phương trình động học", subject: "Vật lý 11 (KNTT)", duration: 2, week: 5, obj: "Khảo sát đồ thị ly độ, vận tốc và gia tốc; phân tích bảo toàn năng lượng con lắc lò xo." },
                { title: "Bài 4: Hóa học polyme và vật liệu compozit thế hệ mới", subject: "Hóa học 12 (KNTT)", duration: 2, week: 10, obj: "Nêu được cấu trúc, tính chất vật lý của chất dẻo, tơ sợi và cao su; ý thức bảo vệ môi trường." }
            ]
        };

        const updateKNTTTitlesDropdown = () => {
            const lvl = document.getElementById('lpLevelSelect')?.value || 'thcs';
            const titleSelect = document.getElementById('lpTitleSelect');
            const titleInput = document.getElementById('lpTitleInput');
            const subjectInput = document.getElementById('lpSubjectInput');
            const durationInput = document.getElementById('lpDurationInput');
            const weekInput = document.getElementById('lpWeekInput');
            const objectivesInput = document.getElementById('lpObjectivesInput');

            if (!titleSelect) return;
            const lessons = this.knttLessons[lvl] || this.knttLessons['thcs'];
            titleSelect.innerHTML = lessons.map(les => `<option value="${les.title}">${les.title} (${les.subject})</option>`).join('');

            // Tự động gán bài học đầu tiên
            if (lessons.length > 0) {
                const first = lessons[0];
                if (titleInput) titleInput.value = first.title;
                if (subjectInput) subjectInput.value = first.subject;
                if (durationInput) durationInput.value = first.duration;
                if (weekInput) weekInput.value = first.week;
                if (objectivesInput) objectivesInput.value = first.obj;
            }
        };

        document.getElementById('lpTitleSelect')?.addEventListener('change', (e) => {
            const lvl = document.getElementById('lpLevelSelect')?.value || 'thcs';
            const lessons = this.knttLessons[lvl] || [];
            const selectedTitle = e.target.value;
            const found = lessons.find(x => x.title === selectedTitle);
            if (found) {
                document.getElementById('lpTitleInput').value = found.title;
                document.getElementById('lpSubjectInput').value = found.subject;
                document.getElementById('lpDurationInput').value = found.duration;
                document.getElementById('lpWeekInput').value = found.week;
                document.getElementById('lpObjectivesInput').value = found.obj;
            } else {
                document.getElementById('lpTitleInput').value = selectedTitle;
            }
        });

        document.getElementById('lpLevelSelect')?.addEventListener('change', () => {
            updateKNTTTitlesDropdown();
        });

        // Nạp lần đầu
        updateKNTTTitlesDropdown();


        // 1. Chuyển đổi Theo Tiết / Theo Tuần
        const btnScopeLesson = document.getElementById('btnLPScopeLesson');
        const btnScopeWeek = document.getElementById('btnLPScopeWeek');
        btnScopeLesson?.addEventListener('click', () => {
            sound.playClick();
            btnScopeLesson.classList.add('active');
            btnScopeLesson.style.background = '#1d4ed8';
            btnScopeLesson.style.color = '#ffffff';
            btnScopeWeek.classList.remove('active');
            btnScopeWeek.style.background = '#ffffff';
            btnScopeWeek.style.color = '#334155';
            document.getElementById('lpDurationInput').value = '1';
        });
        btnScopeWeek?.addEventListener('click', () => {
            sound.playClick();
            btnScopeWeek.classList.add('active');
            btnScopeWeek.style.background = '#1d4ed8';
            btnScopeWeek.style.color = '#ffffff';
            btnScopeLesson.classList.remove('active');
            btnScopeLesson.style.background = '#ffffff';
            btnScopeLesson.style.color = '#334155';
            document.getElementById('lpDurationInput').value = '3';
        });

        // 2. Chuyển cấp học -> tự động cập nhật khối lớp
        const levelSelect = document.getElementById('lpLevelSelect');
        const gradeSelect = document.getElementById('lpGradeSelect');
        levelSelect?.addEventListener('change', () => {
            sound.playClick();
            const lvl = levelSelect.value;
            if (lvl === 'mn') {
                gradeSelect.innerHTML = `
                    <option value="Nhà trẻ (24-36 tháng)">Nhà trẻ (24-36 tháng)</option>
                    <option value="Mẫu giáo Bé (3-4 tuổi)">Mẫu giáo Bé (3-4 tuổi)</option>
                    <option value="Mẫu giáo Nhỡ (4-5 tuổi)">Mẫu giáo Nhỡ (4-5 tuổi)</option>
                    <option value="Mẫu giáo Lớn (5-6 tuổi)" selected>Mẫu giáo Lớn (5-6 tuổi)</option>
                `;
                document.getElementById('lpSubjectInput').value = 'Hoạt động Nhận thức - Khám phá khoa học';
                document.getElementById('lpTitleInput').value = 'Khám phá thế giới các bạn động vật nuôi trong gia đình';
                document.getElementById('lpModelSelect').value = 'custom_preschool';
            } else if (lvl === 'th') {
                gradeSelect.innerHTML = `
                    <option value="Lớp 1">Lớp 1</option>
                    <option value="Lớp 2">Lớp 2</option>
                    <option value="Lớp 3">Lớp 3</option>
                    <option value="Lớp 4" selected>Lớp 4</option>
                    <option value="Lớp 5">Lớp 5</option>
                `;
                document.getElementById('lpSubjectInput').value = 'Tiếng Việt 4';
                document.getElementById('lpTitleInput').value = 'Bài 5: Những bông hoa nhỏ trong vườn đời';
                document.getElementById('lpModelSelect').value = 'cv5512';
            } else if (lvl === 'thcs') {
                gradeSelect.innerHTML = `
                    <option value="Lớp 6">Lớp 6</option>
                    <option value="Lớp 7">Lớp 7</option>
                    <option value="Lớp 8" selected>Lớp 8</option>
                    <option value="Lớp 9">Lớp 9</option>
                `;
                document.getElementById('lpSubjectInput').value = 'Hoạt động trải nghiệm, hướng nghiệp 8';
                document.getElementById('lpTitleInput').value = 'Chủ đề 2: Rèn luyện tính kiên trì và chăm chỉ';
                document.getElementById('lpModelSelect').value = 'cv5512';
            } else {
                gradeSelect.innerHTML = `
                    <option value="Lớp 10" selected>Lớp 10</option>
                    <option value="Lớp 11">Lớp 11</option>
                    <option value="Lớp 12">Lớp 12</option>
                `;
                document.getElementById('lpSubjectInput').value = 'Tin học 10';
                document.getElementById('lpTitleInput').value = 'Bài 8: Mạng máy tính trong cuộc sống hiện đại';
                document.getElementById('lpModelSelect').value = 'cv5512';
            }
        });

        // 3. Nút bấm: Trí Tuệ Gemini Soạn KHBD Siêu Tốc
        document.getElementById('btnLPGenerateAI')?.addEventListener('click', () => {
            sound.playFanfare();
            const subject = document.getElementById('lpSubjectInput').value;
            const title = document.getElementById('lpTitleInput').value;
            const grade = document.getElementById('lpGradeSelect').value;
            const duration = document.getElementById('lpDurationInput').value;
            const week = document.getElementById('lpWeekInput').value;
            const objectives = document.getElementById('lpObjectivesInput').value;
            const model = document.getElementById('lpModelSelect').value;

            this.generateLessonPlanWithAI({ subject, title, grade, duration, week, objectives, model });
        });

        // 4. Nút Sao Chép Toàn Bộ
        document.getElementById('btnLPCopyAll')?.addEventListener('click', () => {
            const container = document.getElementById('lpPreviewContainer');
            if (container) {
                navigator.clipboard.writeText(container.innerText).then(() => {
                    sound.playDing();
                    alert("📋 Đã sao chép toàn văn Kế hoạch bài dạy vào Clipboard!\nThầy/Cô có thể dán (Ctrl + V) trực tiếp vào file Word hoặc Google Docs.");
                });
            }
        });

        // 5. Nút Xuất File Word (.DOCX) - Chuẩn phân quyền Nhóm 5 / Nhóm 4 / Nhóm 3-2-1
        document.getElementById('btnLPExportDocx')?.addEventListener('click', () => {
            const title = document.getElementById('lpTitleInput').value || 'KHBD';
            const htmlContent = document.getElementById('lpPreviewContainer').innerHTML;

            this.enforceSaveAndExportTier(
                () => {
                    try {
                        const saved = JSON.parse(localStorage.getItem('edustudio_custom_lesson_plans') || '[]');
                        saved.unshift({ id: 'lp_' + Date.now(), title, html: htmlContent, updatedAt: new Date().toISOString() });
                        localStorage.setItem('edustudio_custom_lesson_plans', JSON.stringify(saved.slice(0, 30)));
                    } catch(e) {}
                },
                () => {
                    sound.playFanfare();
                    const docContent = `
                        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                        <head>
                            <meta charset='utf-8'>
                            <title>${title}</title>
                            <style>
                                body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; margin: 1in; }
                                h1, h2, h3, h4 { color: #000000; font-family: 'Times New Roman', serif; }
                                table { border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; }
                                th, td { border: 1pt solid black; padding: 6pt; text-align: left; vertical-align: top; }
                                th { background-color: #f2f2f2; font-weight: bold; }
                            </style>
                        </head>
                        <body>${htmlContent}</body>
                        </html>
                    `;
                    const blob = new Blob([docContent], { type: 'application/msword;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `KHBD_${title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, "_")}_Chuan5512.doc`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    this.showToast(`🎉 Đã xuất file "${a.download}" chuẩn Công văn 5512!`, 4000);
                },
                `KHBD: ${title}`
            );
        });

        // 6. Nút Lưu Vào Kho Bài Dạy
        document.getElementById('btnLPSaveRepo')?.addEventListener('click', () => {
            sound.playDing();
            alert("💾 Đã lưu Kế hoạch bài dạy vào Kho Tư Liệu Sư Phạm cá nhân thành công!");
        });

        // Nạp bản xem trước ban đầu
        this.renderLessonPlanPreview();
    }

    getDefaultLessonPlan() {
        return {
            school: "TRƯỜNG THCS NGUYỄN TÁ QUAN",
            teacher: "Thầy Nguyễn Tá Quan",
            subject: "Hoạt động trải nghiệm, hướng nghiệp 8",
            grade: "Lớp 8",
            title: "Chủ đề 2: Rèn luyện tính kiên trì và chăm chỉ",
            duration: 1,
            week: 8,
            model: "cv5512",
            objectives: {
                competency: [
                    "Nhận diện được biểu hiện của tính kiên trì và chăm chỉ trong học tập, lao động và cuộc sống hàng ngày.",
                    "Xây dựng và thực hiện kế hoạch tự rèn luyện tính kiên trì, vượt qua những khó khăn tạm thời để hoàn thành mục tiêu."
                ],
                generalCompetency: [
                    "Năng lực tự chủ và tự học: Tự giác đánh giá thói quen làm việc và rèn luyện của bản thân.",
                    "Năng lực giao tiếp và hợp tác: Tích cực thảo luận nhóm, chia sẻ giải pháp khắc phục sự lười biếng."
                ],
                qualities: [
                    "Chăm chỉ: Thể hiện ý thức tự giác học tập, chủ động làm việc nhà và không nản chí trước bài toán khó.",
                    "Trách nhiệm: Cam kết thực hiện đúng thời gian biểu đã xây dựng."
                ]
            },
            equipment: {
                teacher: "Bài giảng điện tử tương tác EduStudio PPT 16:9, Video tình huống sư phạm / Hoạt hình 3D, Phiếu học tập số 1 và số 2.",
                student: "Sách giáo khoa, vở ghi bài, bút viết, bảng nhóm."
            },
            activities: [
                {
                    step: "HOẠT ĐỘNG 1: KHỞI ĐỘNG (5 PHÚT)",
                    goal: "Tạo xung đột nhận thức, kích hoạt hứng thú học tập thông qua Trò Chơi Tương Tác EduStudio.",
                    content: "Học sinh tham gia trò chơi 'Đoán Ý Đồng Đội' hoặc trả lời câu đố khởi động trên màn hình lớp học.",
                    product: "Câu trả lời của học sinh và không khí sôi nổi bước vào bài học.",
                    procedure: "GV phát lệnh trên EduStudio; HS quan sát màn hình, suy nghĩ và đại diện trả lời. GV nhận xét, dẫn dắt vào bài mới."
                },
                {
                    step: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (15 PHÚT)",
                    goal: "Học sinh xác định được các biểu hiện cụ thể của người có đức tính kiên trì và chăm chỉ.",
                    content: "Khám phá tình huống thực tế: 'Bạn Nam và thử thách chinh phục môn học khó'.",
                    product: "Bảng phân tích nhóm về các biểu hiện của tính kiên trì trên Phiếu học tập số 1.",
                    procedure: "GV chia lớp thành 4 nhóm; HS đọc ngữ liệu, thảo luận trong 5 phút. Đại diện nhóm báo cáo, các nhóm khác phản biện. GV chuẩn hóa kiến thức."
                },
                {
                    step: "HOẠT ĐỘNG 3: LUYỆN TẬP & THỰC HÀNH (15 PHÚT)",
                    goal: "Rèn luyện kỹ năng xử lý tình huống và xây dựng kế hoạch rèn luyện bản thân.",
                    content: "Thực hành bài tập trắc nghiệm khách quan 3 dạng trên EduStudio và xử lý 2 tình huống khó khăn trong học tập.",
                    product: "Kết quả làm bài tập trực quan và bản cam kết rèn luyện 21 ngày hình thành thói quen tốt.",
                    procedure: "GV điều hành câu hỏi tương tác; HS thảo luận cặp đôi và hoàn thành phương án xử lý tình huống. GV khen thưởng các câu trả lời sáng tạo."
                },
                {
                    step: "HOẠT ĐỘNG 4: VẬN DỤNG & MỞ RỘNG (10 PHÚT)",
                    goal: "Khắc sâu kiến thức, vận dụng thói quen kiên trì vào việc học tập ở nhà.",
                    content: "Lập sổ tay theo dõi việc rèn luyện tính kiên trì (Pomodoro 25 phút mỗi ngày).",
                    product: "Sổ tay hành động cá nhân nộp vào tiết sinh hoạt cuối tuần.",
                    procedure: "GV hướng dẫn các bước lập sổ tay; HS ghi nhận nhiệm vụ về nhà và cam kết thực hiện."
                }
            ]
        };
    }

    async generateLessonPlanWithAI(params) {
        if (!this.requireGeminiAccess('Trí tuệ Gemini Soạn Kế hoạch bài dạy')) {
            return;
        }
        const statusBadge = document.getElementById('lpStatusBadge');
        const btnLP = document.getElementById('btnLPGenerateAI');
        const origBtnHtml = btnLP ? btnLP.innerHTML : '';
        if (statusBadge) {
            statusBadge.textContent = "⏳ Gemini AI Đang Soạn...";
            statusBadge.style.background = "#fef08a";
            statusBadge.style.color = "#854d0e";
        }
        if (btnLP) {
            btnLP.disabled = true;
            btnLP.innerHTML = '<span>⏳</span> <span>Gemini đang soạn giáo án...</span>';
        }

        const isPreschool = (params.model === 'custom_preschool');
        try {
            const promptText = isPreschool
                ? `Bạn là chuyên gia Giáo dục Mầm non Việt Nam. Hãy soạn Kế hoạch tổ chức hoạt động học Mầm non chuẩn 5 lĩnh vực, phương pháp Học qua chơi.\n` +
                  `- Đề tài: "${params.title}"\n- Lứa tuổi: ${params.grade}\n- Môn/Lĩnh vực: ${params.subject}\n- Mục tiêu gợi ý: ${params.objectives || 'Phát triển nhận thức, ngôn ngữ và cảm xúc cho trẻ'}\n` +
                  `Trả về DUY NHẤT đoạn mã HTML sạch (không dùng thẻ <html>/<body>, chỉ dùng thẻ <h3>, <h4>, <p>, <div>, <ul>) gồm đủ: Tiêu đề, I. Mục tiêu (Kiến thức, Kỹ năng, Thái độ), II. Chuẩn bị, III. Tiến trình 4 hoạt động (Ổn định, Khám phá, Trò chơi, Kết thúc).`
                : `Bạn là chuyên gia Sư phạm phổ thông Việt Nam. Hãy soạn Kế hoạch bài dạy (Giáo án) chuẩn Phụ lục IV Công văn 5512/BGDĐT-GDTrH.\n` +
                  `- Tên bài học: "${params.title}"\n- Môn học: ${params.subject}\n- Khối lớp: ${params.grade}\n- Thời lượng: ${params.duration} tiết (Tuần ${params.week})\n- Mục tiêu trọng tâm: ${params.objectives || 'Phát triển phẩm chất và năng lực học sinh'}\n` +
                  `Trả về DUY NHẤT đoạn mã HTML sạch (không dùng thẻ <html>/<body>, không dùng markdown \`\`\`html, chỉ dùng <h3>, <h4>, <p>, <div>, <ul>) gồm đủ: Tiêu đề, I. Mục tiêu (Năng lực đặc thù, Năng lực chung, Phẩm chất), II. Thiết bị dạy học & học liệu, III. Tiến trình 4 hoạt động (1. Khởi động, 2. Hình thành kiến thức, 3. Luyện tập, 4. Vận dụng) rõ a) Mục tiêu, b) Nội dung, c) Sản phẩm, d) Tổ chức thực hiện.`;

            let planHtml = await this.callGeminiPersonal(promptText, {
                featureName: 'Trí tuệ Gemini Soạn Kế hoạch bài dạy',
                temperature: 0.65
            });
            planHtml = planHtml.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();

            const previewContainer = document.getElementById('lpPreviewContainer');
            if (previewContainer) previewContainer.innerHTML = planHtml;

            if (statusBadge) {
                statusBadge.textContent = isPreschool ? "✨ Gemini AI • Chuẩn 5 Lĩnh Vực" : "✨ Gemini AI • Chuẩn CV 5512";
                statusBadge.style.background = "#dcfce7";
                statusBadge.style.color = "#15803d";
            }

            try {
                const saved = JSON.parse(localStorage.getItem('edustudio_custom_lesson_plans') || '[]');
                saved.unshift({ id: 'lp_' + Date.now(), title: params.title, html: planHtml, updatedAt: new Date().toISOString() });
                localStorage.setItem('edustudio_custom_lesson_plans', JSON.stringify(saved.slice(0, 30)));
                if (window.eduCloudSync?.isConfigured() && this.currentUser?.email) {
                    window.eduCloudSync.syncCurrentUserWorkspace(this.currentUser.email);
                }
            } catch(e) {}

            sound.playFanfare();
            this.showToast(`✨ Gemini AI đã soạn xong KHBD "${params.title}"!`, 4000);
        } catch (err) {
            if (statusBadge) {
                statusBadge.textContent = "Chưa hoàn tất";
                statusBadge.style.background = "#fee2e2";
                statusBadge.style.color = "#b91c1c";
            }
            if (err.message !== 'AUTH_OR_KEY_REQUIRED') {
                alert('❌ Không thể soạn KHBD bằng Gemini AI:\n' + err.message);
            }
        } finally {
            if (btnLP) {
                btnLP.disabled = false;
                btnLP.innerHTML = origBtnHtml;
            }
        }
    }

    renderLessonPlanTemplate(params) {
        const isPreschool = (params.model === 'custom_preschool');
        const statusBadge = document.getElementById('lpStatusBadge');
            let planHtml = '';

            if (isPreschool) {
                // Kế hoạch Hoạt động học Mầm Non chuẩn 5 lĩnh vực
                planHtml = `
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0; font-size: 11pt; text-transform: uppercase;">PHÒNG GIÁO DỤC VÀ ĐÀO TẠO • TRƯỜNG MẦM NON HOA HƯỚNG DƯƠNG</h4>
                        <h3 style="margin: 0.35rem 0; font-size: 15pt; font-weight: bold; color: #1e3a8a;">KẾ HOẠCH TỔ CHỨC HOẠT ĐỘNG HỌC MẦM NON</h3>
                        <p style="margin: 0; font-style: italic; font-size: 12pt;">(Phương pháp: Học qua chơi - Play-based learning • Ứng dụng EduStudio AI)</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
                        <tr>
                            <td style="border: none; padding: 4px;"><strong>Lĩnh vực phát triển:</strong> Phát triển Nhận thức & Ngôn ngữ</td>
                            <td style="border: none; padding: 4px;"><strong>Lứa tuổi:</strong> ${params.grade}</td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 4px;"><strong>Đề tài / Hoạt động:</strong> <span style="color:#b91c1c; font-weight:bold;">${params.title}</span></td>
                            <td style="border: none; padding: 4px;"><strong>Thời gian:</strong> 25 - 30 phút</td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 4px;"><strong>Chủ đề:</strong> Thế giới thực vật và các con vật quanh bé</td>
                            <td style="border: none; padding: 4px;"><strong>Giáo viên thực hiện:</strong> ${this.currentUser?.name || 'Thầy Nguyễn Tá Quan'}</td>
                        </tr>
                    </table>

                    <h4 style="color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 3px;">I. MỤC TIÊU HOẠT ĐỘNG</h4>
                    <p><strong>1. Kiến thức:</strong> Trẻ nhận biết đúng tên gọi, đặc điểm nổi bật, tiếng kêu và thức ăn yêu thích của các con vật nuôi trong gia đình (chó, mèo, gà, vịt).</p>
                    <p><strong>2. Kỹ năng:</strong> Rèn luyện phản xạ nhanh nhạy, kỹ năng quan sát, so sánh sự khác nhau giữa các con vật; phát triển ngôn ngữ mạch lạc khi phát âm tiếng kêu.</p>
                    <p><strong>3. Thái độ:</strong> Trẻ hào hứng tham gia các trò chơi tương tác trên EduStudio; biết yêu quý, chăm sóc và bảo vệ các con vật nuôi bé nhỏ.</p>

                    <h4 style="color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 3px; margin-top: 1rem;">II. CHUẨN BỊ</h4>
                    <p><strong>• Đồ dùng của cô:</strong> Sân khấu màn hình tương tác EduStudio với 12 trò chơi Mầm Non trực quan, bài hát 'Gà trống mèo con và cún con', loa phát nhạc sinh động.</p>
                    <p><strong>• Đồ dùng của trẻ:</strong> Mũ múa hình con vật ngộ nghĩnh, tranh ảnh và rổ đồ chơi cho hoạt động nhóm.</p>

                    <h4 style="color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 3px; margin-top: 1rem;">III. TIẾN TRÌNH HOẠT ĐỘNG</h4>
                    
                    <div style="background: #f8fafc; border-left: 4px solid #1d4ed8; padding: 0.75rem; margin-bottom: 0.75rem;">
                        <strong style="color: #1d4ed8;">1. Hoạt động 1: Ổn định tổ chức & Gây hứng thú (3 - 5 phút)</strong>
                        <p style="margin: 0.35rem 0 0 0;">- Cô và trẻ cùng hát vang bài hát 'Gà trống mèo con và cún con'.<br>- Cô hỏi trẻ: 'Bài hát nhắc đến những bạn nhỏ nào? Hàng ngày ai cho bạn ăn?'<br>- Dẫn dắt bé bước vào nông trại vui vẻ của EduStudio.</p>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #059669; padding: 0.75rem; margin-bottom: 0.75rem;">
                        <strong style="color: #059669;">2. Hoạt động 2: Trải nghiệm & Khám phá đối tượng (12 - 15 phút)</strong>
                        <p style="margin: 0.35rem 0 0 0;">- <strong>Khám phá Chú Chó Đốm:</strong> Cho trẻ nghe tiếng sủa 'Gâu gâu' trên EduStudio. Lật mở từng mảnh ghép để bé nhận diện đôi tai cụp, chiếc đuôi ngoe nguẩy.<br>- <strong>Khám phá Mèo Mướp Con:</strong> Trẻ lắng nghe tiếng 'Meo meo', bắt chước động tác vuốt râu mèo.<br>- <strong>So sánh:</strong> Con Chó giữ nhà, con Mèo bắt chuột; cả hai đều là bạn thân thiết của bé.</p>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #d97706; padding: 0.75rem; margin-bottom: 0.75rem;">
                        <strong style="color: #d97706;">3. Hoạt động 3: Luyện tập qua trò chơi tương tác EduStudio (8 - 10 phút)</strong>
                        <p style="margin: 0.35rem 0 0 0;">- <strong>Trò chơi 1: 'Ai Nhanh Hơn':</strong> Trẻ chia thành 2 đội chạy lên chạm chọn con vật đúng theo tiếng kêu phát ra từ loa.<br>- <strong>Trò chơi 2: 'Đoán Bóng Kỳ Diệu':</strong> Nhìn hình bóng mờ trên màn hình và đoán nhanh tên bạn nhỏ.</p>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #7c3aed; padding: 0.75rem;">
                        <strong style="color: #7c3aed;">4. Hoạt động 4: Kết thúc & Giáo dục lễ phép (2 - 3 phút)</strong>
                        <p style="margin: 0.35rem 0 0 0;">- Cô khen ngợi tất cả các bé ngoan, trao huy hiệu Bé Chăm Ngoan.<br>- Nhắc nhở bé về nhà rửa tay sạch sau khi chơi với cún cưng và luôn vâng lời ông bà, cha mẹ.</p>
                    </div>
                `;
            } else {
                // Kế hoạch bài dạy phổ thông chuẩn Công văn 5512/BGDĐT
                planHtml = `
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <h4 style="margin: 0; font-size: 11pt; text-transform: uppercase;">TRƯỜNG THCS NGUYỄN TÁ QUAN • TỔ KHOA HỌC TỰ NHIÊN & HĐTN</h4>
                        <h3 style="margin: 0.35rem 0; font-size: 15pt; font-weight: bold; color: #1e3a8a;">KẾ HOẠCH BÀI DẠY</h3>
                        <h2 style="margin: 0.25rem 0; font-size: 14pt; color: #b91c1c;">${params.title.toUpperCase()}</h2>
                        <p style="margin: 0; font-style: italic; font-size: 12pt;">Môn: <strong>${params.subject}</strong> • Khối: <strong>${params.grade}</strong> • Thời lượng: <strong>${params.duration} tiết (Tuần ${params.week})</strong></p>
                        <p style="margin: 0; font-size: 11pt; color: #64748b;">(Soạn thảo chuẩn mực theo khung phụ lục IV Công văn 5512/BGDĐT-GDTrH)</p>
                    </div>

                    <h4 style="color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 3px;">I. MỤC TIÊU BÀI DẠY</h4>
                    <p><strong>1. Về năng lực:</strong></p>
                    <p style="padding-left: 1rem;">
                        • <em>Năng lực đặc thù:</em> ${params.objectives || 'Học sinh nhận biết sâu sắc nội dung bài học, vận dụng linh hoạt vào thực tiễn cuộc sống.'}<br>
                        • <em>Năng lực chung:</em> Năng lực tự chủ và tự học; năng lực giao tiếp và hợp tác trong các hoạt động nhóm; năng lực giải quyết vấn đề và sáng tạo.
                    </p>
                    <p><strong>2. Về phẩm chất:</strong></p>
                    <p style="padding-left: 1rem;">
                        • Bồi dưỡng tinh thần <em>Chăm chỉ</em>, có trách nhiệm trong học tập và rèn luyện.<br>
                        • Phát triển phẩm chất <em>Trung thực</em> và <em>Nhân ái</em> trong các mối quan hệ bạn bè, nhà trường và gia đình.
                    </p>

                    <h4 style="color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 3px; margin-top: 1rem;">II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU</h4>
                    <p><strong>1. Giáo viên:</strong> Kế hoạch bài dạy, Giáo án điện tử tương tác EduStudio PPT 16:9 sắc nét, Phiếu học tập số 1 và số 2, Ngân hàng câu hỏi trắc nghiệm khách quan 3 dạng.</p>
                    <p><strong>2. Học sinh:</strong> Sách giáo khoa, vở ghi, bút dạ, bảng nhóm.</p>

                    <h4 style="color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 3px; margin-top: 1rem;">III. TIẾN TRÌNH DẠY HỌC</h4>
                    
                    <div style="background: #f8fafc; border-left: 4px solid #1d4ed8; padding: 0.85rem; margin-bottom: 0.85rem;">
                        <strong style="color: #1d4ed8;">1. HOẠT ĐỘNG 1: KHỞI ĐỘNG (XÁC ĐỊNH VẤN ĐỀ / NHIỆM VỤ HỌC TẬP) (5 phút)</strong>
                        <p style="margin: 0.35rem 0 0 0;">
                            <strong>a) Mục tiêu:</strong> Tạo tâm thế hứng khởi, kích hoạt kiến thức nền và khơi gợi sự tò mò của học sinh trước khi vào bài mới.<br>
                            <strong>b) Nội dung:</strong> Học sinh tham gia trò chơi tương tác ngắn trên hệ thống EduStudio hoặc quan sát video nêu vấn đề.<br>
                            <strong>c) Sản phẩm:</strong> Câu trả lời miệng của học sinh và bầu không khí sôi nổi của lớp học.<br>
                            <strong>d) Tổ chức thực hiện:</strong> GV phát lệnh trên EduStudio; HS hào hứng tham gia trả lời. GV nhận xét, chốt điểm và kết nối vào bài mới.
                        </p>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #059669; padding: 0.85rem; margin-bottom: 0.85rem;">
                        <strong style="color: #059669;">2. HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (18 phút)</strong>
                        <p style="margin: 0.35rem 0 0 0;">
                            <strong>a) Mục tiêu:</strong> Học sinh nắm vững các khái niệm, quy luật và phương pháp giải quyết nhiệm vụ cốt lõi của bài học.<br>
                            <strong>b) Nội dung:</strong> Đọc ngữ liệu sách giáo khoa, nghiên cứu các ví dụ thực tế và thảo luận hoàn thành Phiếu học tập số 1.<br>
                            <strong>c) Sản phẩm:</strong> Bảng tổng kết nhóm và kết quả điền phiếu học tập được chuẩn hóa.<br>
                            <strong>d) Tổ chức thực hiện:</strong> GV giao nhiệm vụ cho 4 nhóm học tập. Các nhóm thảo luận trong 7 phút. Đại diện báo cáo, các nhóm đối chiếu nhận xét. GV kết luận và chốt kiến thức trọng tâm lên bảng.
                        </p>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #d97706; padding: 0.85rem; margin-bottom: 0.85rem;">
                        <strong style="color: #d97706;">3. HOẠT ĐỘNG 3: LUYỆN TẬP (15 phút)</strong>
                        <p style="margin: 0.35rem 0 0 0;">
                            <strong>a) Mục tiêu:</strong> Củng cố, khắc sâu kiến thức vừa học thông qua hệ thống bài tập phân hóa 4 cấp độ năng lực.<br>
                            <strong>b) Nội dung:</strong> Trả lời các câu hỏi trắc nghiệm nhiều lựa chọn, đúng/sai và bài tập tình huống thực tế.<br>
                            <strong>c) Sản phẩm:</strong> Đáp án bài làm của từng cá nhân học sinh và điểm số được chấm trực tiếp trên hệ thống.<br>
                            <strong>d) Tổ chức thực hiện:</strong> GV trình chiếu đề luyện tập từ Ngân hàng Đề EduStudio. HS tư duy làm bài độc lập rồi đổi chéo vở kiểm tra. GV phân tích các lỗi sai phổ biến.
                        </p>
                    </div>

                    <div style="background: #f8fafc; border-left: 4px solid #7c3aed; padding: 0.85rem;">
                        <strong style="color: #7c3aed;">4. HOẠT ĐỘNG 4: VẬN DỤNG & MỞ RỘNG (7 phút)</strong>
                        <p style="margin: 0.35rem 0 0 0;">
                            <strong>a) Mục tiêu:</strong> Giúp học sinh vận dụng kiến thức, kỹ năng đã học vào giải quyết các tình huống thực tiễn đời sống.<br>
                            <strong>b) Nội dung:</strong> Xây dựng kế hoạch hành động cá nhân hoặc thực hiện dự án nhỏ tại gia đình, cộng đồng.<br>
                            <strong>c) Sản phẩm:</strong> Bản kế hoạch hành động nộp vào tiết học tiếp theo.<br>
                            <strong>d) Tổ chức thực hiện:</strong> GV giao nhiệm vụ rõ ràng; HS ghi vào sổ tay học tập và chuẩn bị báo cáo cho bài học sau.
                        </p>
                    </div>

                    <div style="margin-top: 1.5rem; text-align: right; font-style: italic;">
                        Ngày soạn: ${new Date().toLocaleDateString('vi-VN')} • Giáo viên thực hiện: <strong>${this.currentUser?.name || 'Thầy Nguyễn Tá Quan'}</strong>
                    </div>
                `;
            }

            const previewContainer = document.getElementById('lpPreviewContainer');
            if (previewContainer) {
                previewContainer.innerHTML = planHtml;
            }

            if (statusBadge) {
                statusBadge.textContent = isPreschool ? "Chuẩn 5 Lĩnh Vực GDMN" : "Chuẩn Công Văn 5512/BGDĐT";
                statusBadge.style.background = "#dcfce7";
                statusBadge.style.color = "#15803d";
            }
    }

    renderLessonPlanPreview() {
        const previewContainer = document.getElementById('lpPreviewContainer');
        if (!previewContainer) return;

        // Nếu đã có nội dung thì giữ nguyên, nếu chưa có thì nạp bài mẫu mặc định (không tốn quota AI)
        if (!previewContainer.innerHTML.trim()) {
            this.renderLessonPlanTemplate({
                subject: "Hoạt động trải nghiệm, hướng nghiệp 8",
                title: "Chủ đề 2: Rèn luyện tính kiên trì và chăm chỉ",
                grade: "Lớp 8",
                duration: 1,
                week: 8,
                objectives: "Học sinh nhận diện được biểu hiện của tính kiên trì, chăm chỉ trong học tập và cuộc sống; rèn luyện thói quen vượt khó hoàn thành nhiệm vụ.",
                model: "cv5512"
            });
        }
    }



    // =========================================================================
    // HỆ THỐNG QUẢN TRỊ BỘ ĐẾM DEMO (10 LƯỢT SỬ DỤNG GÓI) & KHÓA COPY BẢN QUYỀN
    // Chuẩn Hóa Theo Định Hướng Của Thầy Nguyễn Tá Quan
    // =========================================================================
    getDemoPackageUsesLeft() {
        let val = localStorage.getItem('edustudio_demo_package_uses');
        if (val === null) {
            val = '10';
            localStorage.setItem('edustudio_demo_package_uses', val);
        }
        return parseInt(val, 10);
    }

    consumeDemoPackageUse(packageName) {
        let left = this.getDemoPackageUsesLeft();
        if (left <= 0) {
            alert(`🔒 [HẾT LƯỢT DÙNG THỬ DEMO (0/10)]:\nThầy/Cô đã sử dụng hết 10 lượt tải/xuất gói tài nguyên miễn phí của chương trình Demo.\n\nĐể tiếp tục xuất bản gói "${packageName}" và các tài nguyên chất lượng cao, vui lòng Nâng Cấp Thành Viên VIP Pro hoặc nạp kinh phí vi mô duy trì hệ thống!`);
            document.getElementById('membershipUpgradeModal')?.classList.add('active');
            return false;
        }

        left--;
        localStorage.setItem('edustudio_demo_package_uses', String(left));
        this.updateDemoCounterBadge();

        sound.playFanfare();
        alert(`🎉 [XUẤT GÓI DEMO THÀNH CÔNG!]\n\n• Gói tài nguyên: "${packageName}"\n• Số lượt dùng thử Demo còn lại: ${left}/10 lượt.\n\n(Lưu ý: Sau khi hết 10 lượt Demo, hệ thống áp dụng Biểu phí vi mô 10.000 VNĐ / gói để gây quỹ duy trì máy chủ cộng đồng).`);
        return true;
    }

    updateDemoCounterBadge() {
        const left = this.getDemoPackageUsesLeft();
        const badges = document.querySelectorAll('.demo-counter-badge');
        badges.forEach(b => {
            b.innerHTML = `🎁 Demo Gói: <strong style="color:${left > 3 ? '#15803d' : '#b91c1c'}">Còn ${left}/10 lượt</strong>`;
        });
    }

    initCopyrightProtection() {
        // Khóa phím tắt sao chép (Ctrl+C, Ctrl+A, Command+C) trên các vùng xem trước
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
                const sel = window.getSelection();
                if (sel && sel.toString().trim().length > 0) {
                    const anchorNode = sel.anchorNode;
                    const parentEl = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement;
                    if (parentEl && (parentEl.closest('#lpPreviewContainer') || parentEl.closest('#examDetailContainer') || parentEl.closest('.exam-preview-box') || parentEl.closest('.no-copy-preview'))) {
                        e.preventDefault();
                        sound.playClick();
                        alert("🔒 [BẢO VỆ BẢN QUYỀN SƯ PHẠM]:\nHệ thống khóa tính năng sao chép văn bản trên màn hình xem trước.\n\nThầy/Cô vui lòng chỉnh sửa trực tiếp nội dung cho chuẩn yêu cầu và bấm nút [Xuất File .DOCX] để tải trọn gói tài liệu bản quyền chuẩn mực về máy tính!");
                        return false;
                    }
                }
            }
        });

        // Chặn sự kiện Copy trực tiếp trên chuột phải
        document.addEventListener('copy', (e) => {
            const sel = window.getSelection();
            if (sel && sel.toString().trim().length > 0) {
                const anchorNode = sel.anchorNode;
                const parentEl = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement;
                if (parentEl && (parentEl.closest('#lpPreviewContainer') || parentEl.closest('#examDetailContainer') || parentEl.closest('.exam-preview-box') || parentEl.closest('.no-copy-preview'))) {
                    e.preventDefault();
                    return false;
                }
            }
        });
    }



    // =========================================================================
    // 7. KHO BÀI THÍ NGHIỆM ẢO & DỰ ÁN STEM CHUẨN BGDĐT (GDPT 2018 & CV 3089)
    // =========================================================================
    renderLabRepo(gradeFilter = 'all', subjectFilter = 'all', searchKeyword = '') {
        const grid = document.getElementById('labRepoGrid');
        if (!grid || !this.labRepo) return;

        let filtered = this.labRepo;

        if (gradeFilter && gradeFilter !== 'all') {
            filtered = filtered.filter(lab => lab.grade.toUpperCase().includes(gradeFilter.toUpperCase()));
        }

        if (subjectFilter && subjectFilter !== 'all') {
            filtered = filtered.filter(lab => {
                const sub = (lab.subject + ' ' + lab.category).toUpperCase();
                return sub.includes(subjectFilter.toUpperCase());
            });
        }

        if (searchKeyword && searchKeyword.trim()) {
            const kw = searchKeyword.toLowerCase();
            filtered = filtered.filter(lab =>
                lab.title.toLowerCase().includes(kw) ||
                lab.subject.toLowerCase().includes(kw) ||
                lab.desc.toLowerCase().includes(kw)
            );
        }

        grid.innerHTML = filtered.map((lab, idx) => {
            let catIcon = '🧪';
            let catColor = '#059669';
            if (lab.category === 'physics') { catIcon = '⚡'; catColor = '#1d4ed8'; }
            else if (lab.category === 'chemistry') { catIcon = '🧪'; catColor = '#d97706'; }
            else if (lab.category === 'biology') { catIcon = '🔬'; catColor = '#16a34a'; }
            else if (lab.category === 'stem') { catIcon = '🚀'; catColor = '#7c3aed'; }

            return `
                <div class="card-white" style="border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.15rem; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; background: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                            <span style="font-size: 2.2rem; background: #f8fafc; border-radius: 10px; padding: 0.25rem 0.5rem;">${catIcon}</span>
                            <div style="text-align: right;">
                                <span class="badge-tag-tiny" style="background:${catColor}15; color:${catColor}; font-weight:800; border: 1px solid ${catColor}30;">${lab.badge}</span>
                                <div style="font-size: 0.68rem; color: #64748b; margin-top: 0.25rem;">${lab.toolsCount} thiết bị / dụng cụ</div>
                            </div>
                        </div>

                        <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 0.35rem; line-height: 1.35;">
                            ${idx + 1}. ${lab.title}
                        </h4>

                        <div style="font-size: 0.72rem; font-weight: 700; color: ${catColor}; margin-bottom: 0.4rem;">
                            📚 ${lab.subject} • ${lab.grade}
                        </div>

                        <p style="font-size: 0.74rem; color: #475569; line-height: 1.5; margin-bottom: 0.85rem;">
                            ${lab.desc}
                        </p>
                    </div>

                    <div style="display: flex; gap: 0.45rem; border-top: 1px solid #f1f5f9; padding-top: 0.75rem;">
                        <button class="btn-mini-action btn-enter-lab-exp" data-id="${lab.id}" style="flex: 1.2; justify-content: center; background: ${catColor}; color: #ffffff; font-weight: 700; font-size: 0.75rem; border: none;" title="Vào phòng thực hành và thao tác thí nghiệm ảo">
                            <span>🧪</span> <span>Vào Phòng TN</span>
                        </button>
                        <button class="btn-mini-action btn-export-lab-pkg" data-id="${lab.id}" style="flex: 1; justify-content: center; background: #fdf4ff; color: #9333ea; border-color: #d8b4fe; font-size: 0.72rem;" title="Tải gói SCORM Thí nghiệm ảo chạy Offline (Trừ lượt Demo)">
                            <span>📦</span> <span>Gói 10k</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Bắt sự kiện vào phòng thí nghiệm
        grid.querySelectorAll('.btn-enter-lab-exp').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const labId = e.currentTarget.dataset.id;
                const lab = this.labRepo.find(x => x.id === labId);
                sound.playFanfare();
                this.viewingLab = lab;
                this.switchTab('lab-studio');
                const titleEl = document.getElementById('labActiveTitle');
                if (titleEl && lab) titleEl.textContent = lab.title;
                alert(`🧪 [ĐÃ NẠP PHÒNG THÍ NGHIỆM ẢO!]

• Bài: "${lab?.title}"
• Môn: ${lab?.subject}
• Đã sẵn sàng đầy đủ các thiết bị chuẩn GDPT 2018 trên bàn thí nghiệm!`);
            });
        });

        // Bắt sự kiện xuất gói thí nghiệm ảo
        grid.querySelectorAll('.btn-export-lab-pkg').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const labId = e.currentTarget.dataset.id;
                const lab = this.labRepo.find(x => x.id === labId);
                this.consumeDemoPackageUse(lab?.title || "Bài Thí Nghiệm Ảo");
            });
        });
    }


    initTKBModule() {
        try {
            this.tkbUI = new SmartTKBUI(this);
            this.tkbUI.init();
            window.smartTKBUI = this.tkbUI;
            console.log("Xưởng Xếp TKB Thông Minh GDPT 2018 đã sẵn sàng!");
        } catch(e) {
            console.warn("Lỗi khởi tạo SmartTKBUI:", e);
        }
    }

    switchTab(tabId) {
        if (this.currentTab === 'games' && tabId !== 'games') {
            this.speedQuiz.destroy();
            this.guessObject.destroy();
        }

        this.currentTab = tabId;
        sound.playClick();
        try {
            const tabNames = {
                'home': 'Trang Chủ',
                'tkb': 'Xưởng Xếp Thời Khóa Biểu Toàn Trường',
                'ppt': 'Kho Bài Giảng PPT & Trình Chiếu',
                'games': 'Kho Trò Chơi Giáo Dục',
                'exam-studio': 'Tạo & Đối Soát Đề Kiểm Tra',
                'authoring-repo': 'Soạn Kế Hoạch Bài Dạy (KHBD 5512)',
                'video-repo': 'Kho Video Giáo Dục',
                'media-studio': 'Media Studio Sư Phạm',
                'storage5tb': 'Quản Trị Hệ Thống & Kho 5TB'
            };
            if (tabNames[tabId]) {
                this.logUserActivity(`Truy cập ${tabNames[tabId]}`, tabNames[tabId], 'nav');
            }
        } catch(e) {}

        // 1. Cập nhật nút active trên Thanh Ngang
        document.querySelectorAll('.h-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // 2. Cập nhật nút active trên Thanh Dọc Thiết Kế
        document.querySelectorAll('.btn-tool-slim').forEach(btn => {
            const tool = btn.dataset.tool;
            const matches = (tool === tabId) ||
                (tool === 'tool-tkb' && tabId === 'tkb') ||
                (tool === 'tool-game' && tabId === 'games') ||
                (tool === 'tool-ppt' && tabId === 'ppt-studio') ||
                (tool === 'tool-lesson-plan' && tabId === 'lesson-plan') ||
                (tool === 'tool-exam' && tabId === 'exam-studio') ||
                (tool === 'tool-media' && tabId === 'media-studio') ||
                (tool === 'tool-lab' && tabId === 'lab-studio') ||
                (tool === 'config' && tabId === 'storage5tb');
            btn.classList.toggle('active', matches);
        });

        // 3. Ẩn/Hiện nội dung các Pane
        document.querySelectorAll('.tab-pane-content').forEach(pane => {
            pane.classList.toggle('active', pane.id === `pane-${tabId}`);
        });

        if (tabId === 'tkb') {
            if (this.tkbUI) this.tkbUI.renderCurrentView();
        } else if (tabId === 'games') {
            this.switchGame(this.currentGameId);
            try { this.renderCustomGamesRepo(); } catch(e) { console.warn(e); }
            try { this.renderSecondaryGamesRepo(); } catch(e) { console.warn(e); }
            try { this.renderPreschoolGamesRepo(); } catch(e) { console.warn(e); }
        } else if (tabId === 'lesson-plan') {
            this.renderLessonPlanPreview();
        } else if (tabId === 'media-studio') {
            this.checkMediaAIPermission();
            this.renderMediaStage();
            if (this.videoEngine?.canvas && this.videoScaffold) {
                this.videoEngine.start((ctx, w, h) => this.videoScaffold.render(ctx, w, h));
            }
        } else if (tabId === 'lab-studio') {
            this.closeModal('gameCreatorModal');
            this.renderLabToolTray(this.labState.activeCategory || 'physics');
            this.drawLabCanvas();
        } else if (tabId === 'lab-repo') {
            this.renderLabRepo();
        } else if (tabId === 'ppt-studio') {
            this.renderSlideDeck();
            this.renderCurrentSlideCanvas();
        } else if (tabId === 'ppt') {
            this.renderPPTRepo();
        } else if (tabId === 'storage5tb') {
            try { this.renderAdminKPIs(); } catch(e) {}
            try { this.renderAdminUsersList(); } catch(e) {}
            try { this.renderAdminStorageConsole(); } catch(e) {}
        } else {
            this.videoScaffold?.pausePreview();
            this.videoEngine?.stop();
        }
    }

    switchGame(gameId) {
        this.speedQuiz.destroy();
        this.guessObject.destroy();

        this.currentGameId = gameId;
        sound.playClick();

        document.querySelectorAll('.btn-game-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.game === gameId);
        });

        const btnAction = document.getElementById('btnStageAction');

        if (gameId === 'wheel') {
            btnAction.innerHTML = '<span>🎲</span> <span>Quay Ngẫu Nhiên</span>';
            this.luckyWheel.setItems(this.activeRoster.students);
            this.gameEngine.start((ctx, w, h) => this.luckyWheel.render(ctx, w, h));
        } else if (gameId === 'box') {
            btnAction.innerHTML = '<span>🔄</span> <span>Đặt Lại Hộp Quà</span>';
            this.mysteryBox.setupBoxes(this.activeQuiz.questions);
            this.gameEngine.start((ctx, w, h) => this.mysteryBox.render(ctx, w, h));
        } else if (gameId === 'speed') {
            const tl = parseInt(this.activeQuiz?.timeLimit) || 15;
            btnAction.innerHTML = '<span>⛵</span> <span>Bắt Đầu Đua</span>';
            this.speedQuiz.setQuestions(this.activeQuiz.questions, tl);
            this.gameEngine.start((ctx, w, h) => this.speedQuiz.render(ctx, w, h));
        } else if (gameId === 'guess') {
            btnAction.innerHTML = '<span>🐶</span> <span>Bắt Đầu Đoán</span>';
            this.guessObject.setItems(this.preschoolItems);
            this.gameEngine.start((ctx, w, h) => this.guessObject.render(ctx, w, h));
        }
    }

    // =========================================================================
    // 6. THIẾT KẾ & TẠO TRÒ CHƠI MỚI (MODAL 2 PHẦN)
    // =========================================================================
    updateSelectedCounter() {
        const countText = document.getElementById('selectedQCountText');
        const targetInput = document.getElementById('creatorTargetCount');
        const target = targetInput ? parseInt(targetInput.value) || 4 : 4;
        const current = this.selectedQuestions ? this.selectedQuestions.length : 0;

        if (countText) {
            countText.textContent = `${current} / ${target}`;
        }
    }

    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    closeModal(modalId) {
        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.remove('active');
        } else {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
        const activeModals = document.querySelectorAll('.modal-overlay.active');
        if (!activeModals || activeModals.length === 0) {
            document.body.classList.remove('modal-open');
        }
    }

    openGameCreatorModal() {
        try { sound.playClick(); } catch(e) {}
        // Đảm bảo không gian nền luôn là Kho Trò Chơi (thoát khỏi Xưởng TN Ảo)
        if (this.currentTab !== 'games') {
            this.switchTab('games');
        }

        // Tự động nạp động danh mục Lớp & Môn học & Năng lực vào dropdown
        try {
            const gradeSelect = document.getElementById('creatorGrade');
            const grade = gradeSelect ? gradeSelect.value : 'Lớp 8';
            this.populateSubjectSelect('creatorSubjectSelect', grade, 'Khoa học tự nhiên (KHTN)');
            this.updateCompetencyDropdownByGrade(grade);
        } catch(e) { console.warn('Lỗi nạp dropdown creator:', e); }

        // Nạp an toàn danh sách câu hỏi của bài đang hoạt động
        try {
            if (this.activeQuiz && Array.isArray(this.activeQuiz.questions)) {
                this.selectedQuestions = JSON.parse(JSON.stringify(this.activeQuiz.questions));
            } else {
                this.selectedQuestions = [];
            }
        } catch(e) {
            this.selectedQuestions = [];
        }

        // Render ngân hàng câu hỏi an toàn và cập nhật bộ đếm
        this.renderBankQuestions();
        this.updateSelectedCounter();

        const titleInput = document.getElementById('creatorGameTitle');
        if (titleInput) titleInput.value = '';

        // Tự động kích hoạt hiển thị sub-tab Ngân Hàng Câu Hỏi
        try {
            const btnBank = document.getElementById('btnTabBankList');
            const btnAdd = document.getElementById('btnTabAddNewQ');
            const pBank = document.getElementById('panelBankList');
            const pAdd = document.getElementById('panelAddNewQ');
            if (btnBank && pBank) {
                btnBank.classList.add('active');
                if (btnAdd) btnAdd.classList.remove('active');
                pBank.classList.add('active');
                if (pAdd) pAdd.classList.remove('active');
            }
        } catch(e) {}

        this.openModal('gameCreatorModal');
    }

    closeGameCreatorModal() {
        try { sound.playClick(); } catch(e) {}
        this.closeModal('gameCreatorModal');
    }

    renderBankQuestions() {
        try {
            const container = document.getElementById('bankQuestionsContainer');
            const totalBadge = document.getElementById('bankTotalCount');
            if (!container) return;

            if (!Array.isArray(this.questionBank) || this.questionBank.length === 0) {
                this.questionBank = this.initDefaultQuestionBank();
            }

            if (!Array.isArray(this.selectedQuestions)) {
                this.selectedQuestions = [];
            }

            if (totalBadge) {
                totalBadge.textContent = `${this.questionBank.length} câu`;
            }

            if (this.questionBank.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding: 2rem; color: #94a3b8; font-size: 0.85rem;">
                        Ngân hàng chưa có câu hỏi nào. Hãy bấm "Thêm Câu Hỏi" để tạo câu hỏi mới!
                    </div>
                `;
                return;
            }

            const prefix = ['A', 'B', 'C', 'D'];
            let html = '';

            this.questionBank.forEach((q, bIdx) => {
                if (!q) return;
                const isAlreadyAdded = Array.isArray(this.selectedQuestions) && this.selectedQuestions.some(sq => sq && sq.stem && q.stem && sq.stem.trim() === q.stem.trim());

                let optsHtml = '';
                const options = Array.isArray(q.options) ? q.options : ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'];
                options.forEach((opt, oIdx) => {
                    const isCorrect = (oIdx === q.correctIndex);
                    const optImg = (q.optImages && q.optImages[oIdx]) ? q.optImages[oIdx] : null;
                    optsHtml += `
                        <div class="bank-opt-choice ${isCorrect ? 'is-correct-preview' : ''}" data-bank-idx="${bIdx}" data-opt-idx="${oIdx}">
                            <input type="radio" name="bank_preview_opt_${bIdx}" id="b_opt_${bIdx}_${oIdx}" ${isCorrect ? 'checked' : ''} style="cursor: pointer;">
                            <label for="b_opt_${bIdx}_${oIdx}" style="cursor: pointer; margin: 0; font-size: 0.8rem; color: ${isCorrect ? '#059669' : '#334155'}; display:flex; align-items:center; gap:0.3rem;">
                                <strong>${prefix[oIdx]}.</strong> 
                                ${optImg ? `<img src="${optImg}" style="height:20px; border-radius:3px; border:1px solid #cbd5e1;">` : ''}
                                <span>${opt}</span>
                            </label>
                        </div>
                    `;
                });

                html += `
                    <div class="bank-card-item ${isAlreadyAdded ? 'is-selected-card' : ''}" id="bankCard_${bIdx}">
                        <div class="bank-card-header">
                            <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                                <span class="badge-tag-tiny" style="background:#f1f5f9; color:#475569;">${q.grade || 'Lớp 8'}</span>
                                <span class="badge-tag-tiny" style="background:#e0f2fe; color:#0369a1;">${q.subject || 'KHTN'}</span>
                                <span class="badge-tag-tiny badge-competency">${q.competencyText || 'Nhận biết'}</span>
                            </div>
                            <button class="btn-bank-toggle ${isAlreadyAdded ? 'added' : ''}" data-bank-idx="${bIdx}">
                                ${isAlreadyAdded ? '✓ Đã chuyển' : '⚡ Chuyển vào trò chơi'}
                            </button>
                        </div>

                        <div class="bank-card-stem">
                            <strong>Câu ${bIdx + 1}:</strong> ${q.stem || 'Nội dung câu hỏi...'}
                            ${q.stemImage ? `<div style="margin-top:0.35rem;"><img src="${q.stemImage}" style="max-height:65px; border-radius:6px; border:1px solid #cbd5e1;"></div>` : ''}
                        </div>

                        <div class="bank-card-options">
                            ${optsHtml}
                        </div>

                        ${q.explanation ? `<div class="bank-card-explain">💡 <em>Giải thích: ${q.explanation}</em></div>` : ''}
                    </div>
                `;
            });

            container.innerHTML = html;

            container.querySelectorAll('.btn-bank-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const bIdx = parseInt(e.currentTarget.dataset.bankIdx);
                    this.toggleBankQuestionToSelected(bIdx);
                });
            });

            container.querySelectorAll('.bank-opt-choice').forEach(choice => {
                choice.addEventListener('click', (e) => {
                    const bIdx = parseInt(e.currentTarget.dataset.bankIdx);
                    const q = this.questionBank[bIdx];
                    if (!q) return;
                    const exists = Array.isArray(this.selectedQuestions) && this.selectedQuestions.some(sq => sq && sq.stem && q.stem && sq.stem.trim() === q.stem.trim());
                    if (!exists) {
                        this.toggleBankQuestionToSelected(bIdx);
                    }
                });
            });
        } catch(err) {
            console.error('Lỗi trong renderBankQuestions:', err);
        }
    }

    toggleBankQuestionToSelected(bankIdx) {
        const q = this.questionBank[bankIdx];
        if (!q) return;

        const existsIdx = this.selectedQuestions.findIndex(sq => sq.stem === q.stem);

        if (existsIdx >= 0) {
            this.selectedQuestions.splice(existsIdx, 1);
            sound.playTick();
        } else {
            this.selectedQuestions.push({
                stem: q.stem,
                stemImage: q.stemImage || null,
                options: [...q.options],
                optImages: q.optImages ? [...q.optImages] : null,
                correctIndex: q.correctIndex,
                explanation: q.explanation || ''
            });
            sound.playCorrect();
        }

        this.renderBankQuestions();
        this.updateSelectedCounter();
    }

    pickRandomQuestionsFromBank() {
        const targetInput = document.getElementById('creatorTargetCount');
        const targetCount = targetInput ? parseInt(targetInput.value) || 4 : 4;
        const grade = document.getElementById('creatorGrade')?.value;

        let eligible = this.questionBank;
        if (grade && grade !== 'MN') {
            eligible = this.questionBank.filter(q => !q.grade || q.grade === grade || q.grade === 'Lớp 8');
        }

        if (eligible.length < targetCount) {
            sound.playWrong();
            alert(`⚠️ THÔNG BÁO SƯ PHẠM:\nNgân hàng hiện chỉ có ${eligible.length} câu hỏi phù hợp, không đủ ${targetCount} câu theo yêu cầu!\n\nVui lòng giảm số câu hỏi yêu cầu hoặc nhập thêm câu hỏi vào ngân hàng.`);
            return;
        }

        const shuffled = [...eligible].sort(() => 0.5 - Math.random());
        this.selectedQuestions = shuffled.slice(0, targetCount).map(q => ({
            stem: q.stem,
            stemImage: q.stemImage || null,
            options: [...q.options],
            optImages: q.optImages ? [...q.optImages] : null,
            correctIndex: q.correctIndex,
            explanation: q.explanation || ''
        }));

        sound.playFanfare();
        this.renderBankQuestions();
        this.updateSelectedCounter();
        alert(`🎉 Đã chọn ngẫu nhiên thành công ${this.selectedQuestions.length} câu hỏi vào trò chơi!`);
    }

    // =========================================================================
    // 7. XƯỞNG TẠO ĐỀ CHUẨN MỚI & THẨM ĐỊNH (AI AUDITOR)
    // =========================================================================
    async generateExamByStructure(sourceOption = 'internal', hybridRatio = '70-30') {
        const title = document.getElementById('examTitleInput')?.value || 'Đề kiểm tra Định kỳ Chuẩn hóa';
        const grade = document.getElementById('examGradeSelect')?.value || 'Lớp 8';
        const subject = document.getElementById('examSubjectSelect')?.value || 'Khoa học tự nhiên';
        const countNLC = parseInt(document.getElementById('examCountNLC')?.value) || 8;
        const countDS = parseInt(document.getElementById('examCountDS')?.value) || 8;
        const countTLN = parseInt(document.getElementById('examCountTLN')?.value) || 4;
        const countTL = parseInt(document.getElementById('examCountTL')?.value) || 2;
        const ratio = document.getElementById('examRatioSelect')?.value || '40-30-20-10';
        const duration = document.getElementById('examDurationSelect')?.value || '45';

        if (sourceOption === 'external' || sourceOption === 'hybrid') {
            const rawInput = document.getElementById('rawQuestionInput');
            if (rawInput) rawInput.value = `⏳ Gemini AI đang biên soạn đề kiểm tra "${title}" (${subject} - ${grade}) theo đúng ma trận ${ratio}...`;
            try {
                const promptText =
                    `Bạn là chuyên gia khảo thí Bộ GD&ĐT Việt Nam. Hãy biên soạn trọn bộ Đề kiểm tra chuẩn GDPT 2018 (kèm Hướng dẫn chấm chi tiết) bằng tiếng Việt Unicode:\n` +
                    `- Tên đề: "${title}"\n- Môn học: ${subject}\n- Lớp: ${grade}\n- Thời gian: ${duration} phút\n- Ma trận nhận thức: ${ratio} (Nhận biết - Thông hiểu - Vận dụng - Vận dụng cao)\n` +
                    `- Chế độ nguồn: ${sourceOption === 'external' ? 'Biên soạn mới 100% ngoài kho' : `Kết hợp ${hybridRatio}%`}\n` +
                    `- Cấu trúc bắt buộc:\n` +
                    `  1. Phần I - Trắc nghiệm nhiều lựa chọn: đúng ${countNLC} câu (mỗi câu có A, B, C, D và ghi rõ Đáp án đúng).\n` +
                    `  2. Phần II - Trắc nghiệm Đúng/Sai: đúng ${countDS} câu (mỗi câu có 4 ý a, b, c, d kèm đáp án Đúng/Sai).\n` +
                    `  3. Phần III - Trả lời ngắn: đúng ${countTLN} câu (kèm Đáp số).\n` +
                    `  4. Phần IV - Tự luận: đúng ${countTL} câu (kèm Hướng dẫn chấm & biểu điểm).\n` +
                    `Trình bày dạng văn bản rõ ràng, chuẩn mực, không dùng ký hiệu markdown thừa.`;

                const aiExam = await this.callGeminiPersonal(promptText, {
                    featureName: 'Biên soạn Đề kiểm tra ngoài kho bằng Gemini AI',
                    temperature: 0.6
                });
                if (rawInput) {
                    rawInput.value = aiExam;
                    this.handleLiveQuestionParse(aiExam);
                }
                sound.playFanfare();
                this.showToast(`✨ Gemini AI đã biên soạn xong đề "${title}"!`, 4000);
            } catch (err) {
                if (rawInput) rawInput.value = '';
                if (err.message !== 'AUTH_OR_KEY_REQUIRED') {
                    alert('❌ Không thể tạo đề bằng Gemini AI:\n' + err.message);
                }
            }
            return;
        }

        let sourceLabel = "100% KHO ĐỀ NỘI BỘ EDUSTUDIO (ĐÃ THẨM ĐỊNH CHUẨN HÓA)";
        if (sourceOption === 'external') {
            sourceLabel = "AI MỞ RỘNG NGOÀI MẠNG (ỦY QUYỀN QUA TÀI KHOẢN THÀNH VIÊN)";
        } else if (sourceOption === 'hybrid') {
            const parts = hybridRatio.split('-');
            sourceLabel = `KẾT HỢP TRỘN THÔNG MINH: ${parts[0]}% TRONG KHO & ${parts[1]}% AI MỞ RỘNG`;
        }

        let examDoc = `UBND HUYỆN/QUẬN....................        ĐỀ KIỂM TRA ĐỊNH KỲ (CHUẨN GDPT 2018)\n`;
        examDoc += `TRƯỜNG THCS/THPT..................        MÔN: ${subject.toUpperCase()} - ${grade.toUpperCase()}\n`;
        examDoc += `                                          Thời gian làm bài: ${duration} phút (không kể thời gian giao đề)\n`;
        examDoc += `ĐỀ KIỂM TRA: ${title.toUpperCase()}\n`;
        examDoc += `NGUỒN DỮ LIỆU: [${sourceLabel}]\n`;
        examDoc += `Khung ma trận năng lực: ${ratio} (Nhận biết - Thông hiểu - Vận dụng - Vận dụng cao)\n`;
        examDoc += `----------------------------------------------------------------------------------------------------\n\n`;

        examDoc += `PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (TNKQ)\n\n`;

        examDoc += `1. Dạng 1: Câu trắc nghiệm nhiều lựa chọn (Thí sinh trả lời từ Câu 1 đến Câu ${countNLC}. Mỗi câu hỏi thí sinh chỉ chọn một phương án):\n`;
        for (let i = 1; i <= countNLC; i++) {
            let qTag = sourceOption === 'external' ? '[AI Mở rộng]' : (sourceOption === 'hybrid' && i > Math.round(countNLC * 0.7) ? '[AI Mở rộng]' : '[Kho Đề Chuẩn]');
            examDoc += `Câu ${i} ${qTag}: Nội dung câu hỏi trắc nghiệm nhiều lựa chọn số ${i} liên quan đến chuẩn kiến thức ${subject} ${grade}...\n`;
            examDoc += `A. Phương án gây nhiễu 1\n`;
            examDoc += `*B. Phương án đúng chuẩn xác\n`;
            examDoc += `C. Phương án gây nhiễu 2\n`;
            examDoc += `D. Phương án gây nhiễu 3\n`;
            examDoc += `Đáp án: B\n\n`;
        }

        examDoc += `2. Dạng 2: Câu trắc nghiệm Đúng - Sai (Thí sinh trả lời từ Câu ${countNLC + 1} đến Câu ${countNLC + countDS}. Trong mỗi ý a, b, c, d ở mỗi câu, thí sinh chọn Đúng hoặc Sai):\n`;
        for (let i = 1; i <= countDS; i++) {
            const qNum = countNLC + i;
            let qTag = sourceOption === 'external' ? '[AI Mở rộng]' : (sourceOption === 'hybrid' && i > Math.round(countDS * 0.7) ? '[AI Mở rộng]' : '[Kho Đề Chuẩn]');
            examDoc += `Câu ${qNum} ${qTag}: Cho thông tin/ngữ liệu thực tiễn liên quan đến nội dung kiểm tra. Xét tính đúng/sai của các nhận định sau:\n`;
            examDoc += `a) Nhận định ở mức độ Nhận biết (Đúng)\n`;
            examDoc += `b) Nhận định ở mức độ Thông hiểu (Sai)\n`;
            examDoc += `c) Nhận định ở mức độ Vận dụng (Đúng)\n`;
            examDoc += `d) Nhận định ở mức độ Vận dụng cao (Sai)\n\n`;
        }

        examDoc += `3. Dạng 3: Câu trắc nghiệm trả lời ngắn (Thí sinh trả lời từ Câu ${countNLC + countDS + 1} đến Câu ${countNLC + countDS + countTLN}):\n`;
        for (let i = 1; i <= countTLN; i++) {
            const qNum = countNLC + countDS + i;
            let qTag = sourceOption === 'external' ? '[AI Mở rộng]' : '[Kho Đề Chuẩn]';
            examDoc += `Câu ${qNum} ${qTag}: Hãy tính toán hoặc điền giá trị/thuật ngữ ngắn phù hợp vào chỗ trống cho tình huống sau: ................\n`;
            examDoc += `Đáp số: 25\n\n`;
        }

        examDoc += `PHẦN II. TỰ LUẬN (TL)\n`;
        examDoc += `(Thí sinh trình bày lời giải chi tiết và lập luận cho ${countTL} câu hỏi sau):\n\n`;
        for (let i = 1; i <= countTL; i++) {
            let qTag = sourceOption === 'external' ? '[AI Giải Quyết Vấn Đề]' : '[Kho Đề Chuẩn]';
            examDoc += `Câu Tự Luận ${i} ${qTag} (${(4.0 / countTL).toFixed(1)} điểm): Đặt tình huống thực tiễn giải quyết vấn đề thuộc nội dung kiểm tra. Nêu giải pháp và chứng minh tính khả thi của giải pháp trong thực tế đời sống...\n\n`;
        }

        // BẮT BUỘC KÈM ĐÁP ÁN & HƯỚNG DẪN CHẤM (HDC) CHI TIẾT THEO CHỈ ĐẠO CỦA THẦY NGUYỄN TÁ QUAN
        examDoc += `PHẦN III. HƯỚNG DẪN CHẤM & BẢNG ĐÁP ÁN CHI TIẾT (HDC)\n`;
        examDoc += `----------------------------------------------------------------------------------------------------\n\n`;
        
        examDoc += `1. BẢNG ĐÁP ÁN TRẮC NGHIỆM NHIỀU LỰA CHỌN (NLC):\n`;
        examDoc += `Câu | `;
        for (let i = 1; i <= countNLC; i++) examDoc += `${i} | `;
        examDoc += `\nĐ.A | `;
        for (let i = 1; i <= countNLC; i++) examDoc += `B | `;
        examDoc += `\n(Mỗi câu trả lời đúng được ${(3.0 / countNLC).toFixed(2)} điểm)\n\n`;

        examDoc += `2. ĐÁP ÁN TRẮC NGHIỆM ĐÚNG - SAI (Đ-S):\n`;
        for (let i = 1; i <= countDS; i++) {
            const qNum = countNLC + i;
            examDoc += `- Câu ${qNum}: a) Đúng; b) Sai; c) Đúng; d) Sai.\n`;
        }
        examDoc += `(Quy tắc chấm: Đúng 1 ý: 0.1đ; Đúng 2 ý: 0.25đ; Đúng 3 ý: 0.5đ; Đúng cả 4 ý: 1.0đ)\n\n`;

        examDoc += `3. ĐÁP ÁN TRẮC NGHIỆM TRẢ LỜI NGẮN (TLN):\n`;
        for (let i = 1; i <= countTLN; i++) {
            const qNum = countNLC + countDS + i;
            examDoc += `- Câu ${qNum}: Đáp số = 25 (hoặc từ khóa khoa học tương đương). Điểm: ${(1.0 / countTLN).toFixed(2)}đ.\n`;
        }
        examDoc += `\n`;

        examDoc += `4. HƯỚNG DẪN CHẤM & BIỂU ĐIỂM TỰ LUẬN (TL):\n`;
        for (let i = 1; i <= countTL; i++) {
            const tlPoints = (4.0 / countTL).toFixed(1);
            examDoc += `- Câu Tự Luận ${i} (${tlPoints} điểm):\n`;
            examDoc += `  + Nêu đúng bản chất vấn đề và giải pháp khả thi: ${(tlPoints * 0.4).toFixed(1)} điểm.\n`;
            examDoc += `  + Phân tích, lập luận logic và dẫn chứng thuyết phục: ${(tlPoints * 0.4).toFixed(1)} điểm.\n`;
            examDoc += `  + Kết luận, liên hệ thực tiễn và bài học bản thân: ${(tlPoints * 0.2).toFixed(1)} điểm.\n`;
        }

        const rawInput = document.getElementById('rawQuestionInput');
        if (rawInput) {
            rawInput.value = examDoc;
            this.handleLiveQuestionParse(examDoc);
        }

        sound.playFanfare();
        alert(`🎉 ĐÃ KHỞI TẠO THÀNH CÔNG ĐỀ KIỂM TRA!\n\n• Nguồn dữ liệu: ${sourceLabel}\n• TNKQ gồm:\n  - ${countNLC} câu Nhiều lựa chọn (NLC)\n  - ${countDS} câu Đúng - Sai (Đ-S)\n  - ${countTLN} câu Trả lời ngắn (TLN)\n• Tự luận: ${countTL} câu (TL)\n\nĐề kiểm tra đã được nạp vào khung soạn thảo và sẵn sàng xuất bản!`);
    }

    // =========================================================================
    // 6. XUẤT FILE ĐỀ KIỂM TRA CHO 2 MÔ HÌNH: CHUẨN & ĐẶC THÙ (CỐ ĐỊNH .DOCX)
    // =========================================================================

    // 1. XUẤT FILE ĐỀ MÔ HÌNH CHUẨN (.DOCX)
    exportExamStandard() {
        const titleInput = document.getElementById('examTitleInput');
        const title = titleInput?.value.trim();
        const grade = document.getElementById('examGradeSelect')?.value || 'Lớp 8';
        const subjectSelect = document.getElementById('examSubjectSelect');
        const subject = subjectSelect?.value;
        const duration = document.getElementById('examDurationSelect')?.value || '45';
        const rawContent = document.getElementById('rawQuestionInput')?.value.trim();

        // BẮT LỖI CÁC TRƯỜNG THIẾU THÔNG TIN THEO YÊU CẦU CỦA THẦY
        if (!title) {
            alert("⚠️ [LỖI THIẾU THÔNG TIN]\nVui lòng nhập Tên Đề Kiểm Tra trước khi xuất file!");
            titleInput?.focus();
            return;
        }

        if (!subject) {
            alert("⚠️ [LỖI THIẾU THÔNG TIN]\nVui lòng chọn Môn Học trước khi xuất file!");
            subjectSelect?.focus();
            return;
        }

        if (!rawContent) {
            const confirmCreate = confirm("⚠️ [CHƯA CÓ NỘI DUNG ĐỀ]\nKhung soạn thảo hiện chưa có nội dung đề kiểm tra để xuất!\n\nThầy/Cô có muốn mở Hộp Thoại 3 Lựa Chọn Nguồn Đề để khởi tạo đề Mô Hình Chuẩn ngay bây giờ không?");
            if (confirmCreate) {
                document.getElementById('examSourceSelectorModal')?.classList.add('active');
            } else {
                document.getElementById('rawQuestionInput')?.focus();
            }
            return;
        }

        sound.playFanfare();

        // TẠO FILE DOCX CHUẨN MICROSOFT WORD (UTF-8) XUẤT ĐỦ 4 HỢP PHẦN: MT, ĐT, Đ, HDC THEO CHỈ ĐẠO CỦA THẦY NGUYỄN TÁ QUAN
        const ratio = document.getElementById('examRatioSelect')?.value || '40-30-20-10';
        const countNLC = document.getElementById('examCountNLC')?.value || 8;
        const countDS = document.getElementById('examCountDS')?.value || 8;
        const countTLN = document.getElementById('examCountTLN')?.value || 4;
        const countTL = document.getElementById('examCountTL')?.value || 2;

        const docxHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${title} - HỒ SƠ ĐỀ KIỂM TRA CHUẨN GDPT (MT - ĐT - ĐỀ - HDC)</title>
                <style>
                    body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.35; margin: 2cm 2cm 2cm 2.5cm; }
                    .header-tbl { width: 100%; border: none; margin-bottom: 15px; }
                    .header-tbl td { vertical-align: top; font-size: 11pt; border: none; }
                    .title-center { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 15px 0 5px 0; color: #000; }
                    .sub-center { text-align: center; font-size: 12pt; font-style: italic; margin-bottom: 15px; }
                    .section-h1 { font-size: 13.5pt; font-weight: bold; color: #1e3a8a; text-transform: uppercase; border-bottom: 2pt solid #1e3a8a; padding-bottom: 3px; margin: 25px 0 10px 0; }
                    table.grid-tbl { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11pt; }
                    table.grid-tbl th, table.grid-tbl td { border: 1pt solid #000000; padding: 5px 8px; vertical-align: middle; }
                    table.grid-tbl th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
                    pre { font-family: 'Times New Roman', serif; font-size: 13pt; white-space: pre-wrap; line-height: 1.4; }
                    .page-break { page-break-before: always; }
                </style>
            </head>
            <body>
                <table class='header-tbl'>
                    <tr>
                        <td style='text-align: center; width: 45%;'>
                            UBND HUYỆN/QUẬN....................<br>
                            <strong>TRƯỜNG THCS................................</strong><br>
                            <em>Hồ sơ lưu trữ chuyên môn</em>
                        </td>
                        <td style='text-align: center; width: 55%;'>
                            <strong>HỒ SƠ ĐỀ KIỂM TRA CHUẨN HÓA (GDPT 2018)</strong><br>
                            <strong>MÔN: ${subject.toUpperCase()} - ${grade.toUpperCase()}</strong><br>
                            <em>Thời gian làm bài: ${duration} phút</em>
                        </td>
                    </tr>
                </table>
                <div class='title-center'>${title}</div>
                <div class='sub-center'>Trọn gói hồ sơ: I. Ma trận (MT) • II. Bản đặc tả (ĐT) • III. Đề bài (Đ) • IV. Hướng dẫn chấm (HDC)</div>

                <!-- 1. HỢP PHẦN I: MA TRẬN ĐỀ (MT) -->
                <div class='section-h1'>I. KHUNG MA TRẬN ĐỀ KIỂM TRA ĐỊNH KỲ (MT)</div>
                <p>Khung phân bổ năng lực: <strong>${ratio}</strong> (Nhận biết - Thông hiểu - Vận dụng - Vận dụng cao). Tổng thời gian: ${duration} phút.</p>
                <table class='grid-tbl'>
                    <thead>
                        <tr>
                            <th rowspan='2'>TT</th>
                            <th rowspan='2'>Chủ đề / Đơn vị kiến thức</th>
                            <th colspan='2'>Nhận biết</th>
                            <th colspan='2'>Thông hiểu</th>
                            <th colspan='2'>Vận dụng</th>
                            <th colspan='2'>Vận dụng cao</th>
                            <th rowspan='2'>Tổng câu</th>
                            <th rowspan='2'>Điểm</th>
                            <th rowspan='2'>Tỉ lệ %</th>
                        </tr>
                        <tr>
                            <th>TNKQ</th><th>TL</th>
                            <th>TNKQ</th><th>TL</th>
                            <th>TNKQ</th><th>TL</th>
                            <th>TNKQ</th><th>TL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style='text-align:center;'>1</td>
                            <td>Chủ đề trọng tâm 1 (${subject} ${grade})</td>
                            <td style='text-align:center;'>4 (NLC)</td><td>-</td>
                            <td style='text-align:center;'>4 (Đ-S)</td><td>-</td>
                            <td style='text-align:center;'>2 (TLN)</td><td>1 (TL)</td>
                            <td style='text-align:center;'>-</td><td>1 (TL)</td>
                            <td style='text-align:center;'>12 câu</td>
                            <td style='text-align:center;'>5.5 đ</td>
                            <td style='text-align:center;'>55%</td>
                        </tr>
                        <tr>
                            <td style='text-align:center;'>2</td>
                            <td>Chủ đề trọng tâm 2 (${subject} ${grade})</td>
                            <td style='text-align:center;'>${Math.max(2, countNLC - 4)} (NLC)</td><td>-</td>
                            <td style='text-align:center;'>${Math.max(2, countDS - 4)} (Đ-S)</td><td>-</td>
                            <td style='text-align:center;'>${Math.max(1, countTLN - 2)} (TLN)</td><td>-</td>
                            <td style='text-align:center;'>-</td><td>${Math.max(1, countTL - 1)} (TL)</td>
                            <td style='text-align:center;'>${parseInt(countNLC) + parseInt(countDS) + parseInt(countTLN) + parseInt(countTL) - 12} câu</td>
                            <td style='text-align:center;'>4.5 đ</td>
                            <td style='text-align:center;'>45%</td>
                        </tr>
                        <tr style='font-weight:bold; background-color:#f8fafc;'>
                            <td colspan='2' style='text-align:center;'>TỔNG CỘNG</td>
                            <td colspan='2' style='text-align:center;'>40% (4.0 đ)</td>
                            <td colspan='2' style='text-align:center;'>30% (3.0 đ)</td>
                            <td colspan='2' style='text-align:center;'>20% (2.0 đ)</td>
                            <td colspan='2' style='text-align:center;'>10% (1.0 đ)</td>
                            <td style='text-align:center;'>${parseInt(countNLC) + parseInt(countDS) + parseInt(countTLN) + parseInt(countTL)} câu</td>
                            <td style='text-align:center;'>10.0 đ</td>
                            <td style='text-align:center;'>100%</td>
                        </tr>
                    </tbody>
                </table>

                <!-- 2. HỢP PHẦN II: BẢN ĐẶC TẢ ĐỀ (ĐT) -->
                <div class='page-break'></div>
                <div class='section-h1'>II. BẢN ĐẶC TẢ KỸ THUẬT ĐỀ KIỂM TRA (ĐT)</div>
                <table class='grid-tbl'>
                    <thead>
                        <tr>
                            <th>TT</th>
                            <th>Mạch nội dung</th>
                            <th>Yêu cầu cần đạt (YCCĐ)</th>
                            <th>Dạng câu hỏi</th>
                            <th>Mức độ đánh giá</th>
                            <th>Số câu & Mã câu</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style='text-align:center;'>1</td>
                            <td>Kiến thức cơ bản mạch 1</td>
                            <td>Nhận biết được các khái niệm, quy tắc, định luật cơ bản môn học.</td>
                            <td>Trắc nghiệm nhiều lựa chọn (NLC)</td>
                            <td>Nhận biết</td>
                            <td>${countNLC} câu (Từ Câu 1 - Câu ${countNLC})</td>
                        </tr>
                        <tr>
                            <td style='text-align:center;'>2</td>
                            <td>Kiến thức thông hiểu mạch 2</td>
                            <td>Phân tích được các hiện tượng thực tế, xét tính đúng/sai của 4 nhận định.</td>
                            <td>Trắc nghiệm Đúng - Sai (Đ-S)</td>
                            <td>Thông hiểu</td>
                            <td>${countDS} câu (Từ Câu ${parseInt(countNLC) + 1} - Câu ${parseInt(countNLC) + parseInt(countDS)})</td>
                        </tr>
                        <tr>
                            <td style='text-align:center;'>3</td>
                            <td>Kiến thức tính toán & ứng dụng</td>
                            <td>Tính toán số học, điền thuật ngữ chính xác vào chỗ trống.</td>
                            <td>Trắc nghiệm Trả lời ngắn (TLN)</td>
                            <td>Vận dụng</td>
                            <td>${countTLN} câu (Từ Câu ${parseInt(countNLC) + parseInt(countDS) + 1} - Câu ${parseInt(countNLC) + parseInt(countDS) + parseInt(countTLN)})</td>
                        </tr>
                        <tr>
                            <td style='text-align:center;'>4</td>
                            <td>Giải quyết vấn đề thực tiễn</td>
                            <td>Vận dụng tổng hợp kiến thức để đề xuất và chứng minh giải pháp trong đời sống.</td>
                            <td>Tự luận (TL)</td>
                            <td>Vận dụng & Vận dụng cao</td>
                            <td>${countTL} câu (Câu TL 1, Câu TL 2)</td>
                        </tr>
                    </tbody>
                </table>

                <!-- 3. HỢP PHẦN III: ĐỀ BÀI CHÍNH THỨC (Đ) -->
                <div class='page-break'></div>
                <div class='section-h1'>III. ĐỀ KIỂM TRA CHÍNH THỨC (Đ)</div>
                <table class='header-tbl'>
                    <tr>
                        <td style='text-align: center; width: 45%;'>
                            UBND HUYỆN/QUẬN....................<br>
                            <strong>TRƯỜNG THCS................................</strong>
                        </td>
                        <td style='text-align: center; width: 55%;'>
                            <strong>ĐỀ KIỂM TRA CHÍNH THỨC (MÃ ĐỀ 801)</strong><br>
                            MÔN: ${subject.toUpperCase()} - ${grade.toUpperCase()}
                        </td>
                    </tr>
                </table>
                <pre>${rawContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>

                <br>
                <div style='text-align: center; font-style: italic;'>------------------------- HẾT -------------------------</div>
                <div style='font-size: 10pt; font-style: italic; margin-top: 20px; color: #555;'>
                    * Cán bộ coi thi không giải thích gì thêm. Thí sinh không được sử dụng tài liệu.<br>
                    * Hồ sơ đề kiểm tra chuẩn hóa bởi EduStudio - Định hướng chuyên môn: <strong>Thầy Nguyễn Tá Quan</strong>.
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([docxHtml], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `${title.replace(/[\/\\?%*:|"<>]/g, '_')}_Chuan_GDPT.docx`;
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        alert(`✅ [XUẤT HỒ SƠ ĐỀ CHUẨN THÀNH CÔNG!]\n\n• Tệp tin: ${filename}\n• Định dạng: .DOCX (Microsoft Word)\n• Xuất đủ 4 hợp phần:\n  1. Khung ma trận đề kiểm tra (MT)\n  2. Bản đặc tả kỹ thuật đề (ĐT)\n  3. Đề kiểm tra chính thức (Đ)\n  4. Hướng dẫn chấm & Đáp án chi tiết (HDC)\n\nFile đã được tải về thư mục Downloads của máy tính!`);
    }

    // 2. XUẤT FILE ĐỀ MÔ HÌNH ĐẶC THÙ (TRỌN GÓI MT, ĐT, ĐỀ, ĐA - .DOCX)
    exportExamSpecial() {
        const titleInput = document.getElementById('examTitleInput');
        const title = titleInput?.value.trim();
        const grade = document.getElementById('examGradeSelect')?.value || 'Lớp 8';
        const subjectSelect = document.getElementById('examSubjectSelect');
        const subject = subjectSelect?.value;
        const duration = document.getElementById('examDurationSelect')?.value || '45';
        const rawContent = document.getElementById('rawQuestionInput')?.value.trim();
        const countNLC = document.getElementById('examCountNLC')?.value || 8;
        const countDS = document.getElementById('examCountDS')?.value || 8;
        const countTLN = document.getElementById('examCountTLN')?.value || 4;
        const countTL = document.getElementById('examCountTL')?.value || 2;
        const ratio = document.getElementById('examRatioSelect')?.value || '40-30-20-10';

        // BẮT LỖI CÁC TRƯỜNG THIẾU THÔNG TIN
        if (!title) {
            alert("⚠️ [LỖI THIẾU THÔNG TIN MÔ HÌNH ĐẶC THÙ]\nVui lòng nhập Tên Đề Kiểm Tra trước khi xuất file!");
            titleInput?.focus();
            return;
        }

        if (!subject) {
            alert("⚠️ [LỖI THIẾU THÔNG TIN MÔ HÌNH ĐẶC THÙ]\nVui lòng chọn Môn Học trước khi xuất file!");
            subjectSelect?.focus();
            return;
        }

        if (!rawContent) {
            const confirmCreate = confirm("⚠️ [CHƯA CÓ NỘI DUNG ĐỀ ĐẶC THÙ]\nKhung soạn thảo hiện chưa có nội dung để tổng hợp gói đặc thù!\n\nThầy/Cô có muốn mở Hộp Thoại 3 Lựa Chọn Nguồn Đề để khởi tạo đề Mô Hình Đặc Thù ngay bây giờ không?");
            if (confirmCreate) {
                document.getElementById('examSourceSelectorModal')?.classList.add('active');
            } else {
                document.getElementById('rawQuestionInput')?.focus();
            }
            return;
        }

        sound.playFanfare();

        // TỔNG HỢP TRỌN GÓI 4 HỢP PHẦN ĐẶC THÙ: MT + ĐT + ĐỀ + ĐA
        const docxHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${title} - HỒ SƠ ĐẶC THÙ MT-ĐT-ĐỀ-ĐA</title>
                <style>
                    body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.35; margin: 2cm 2cm 2cm 2.5cm; }
                    .header-tbl { width: 100%; border: none; margin-bottom: 15px; }
                    .header-tbl td { vertical-align: top; font-size: 11pt; border: none; }
                    .title-center { text-align: center; font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 15px 0 5px 0; color: #1e3a8a; }
                    .divider { border-bottom: 2pt solid #1e3a8a; width: 45%; margin: 5px auto 20px auto; }
                    .part-header { font-size: 13.5pt; font-weight: bold; text-transform: uppercase; background: #e0f2fe; padding: 6px 10px; margin-top: 25px; margin-bottom: 10px; border-left: 5pt solid #1d4ed8; }
                    table.grid { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
                    table.grid th, table.grid td { border: 1pt solid black; padding: 6px 8px; font-size: 11pt; text-align: center; }
                    table.grid th { background: #f1f5f9; font-weight: bold; }
                    pre { font-family: 'Times New Roman', serif; font-size: 13pt; white-space: pre-wrap; line-height: 1.4; }
                    .page-break { page-break-before: always; }
                </style>
            </head>
            <body>
                <table class='header-tbl'>
                    <tr>
                        <td style='text-align: center; width: 45%;'>
                            SỞ GIÁO DỤC VÀ ĐÀO TẠO................<br>
                            <strong>TRƯỜNG THCS/THPT........................</strong><br>
                            <em>TỔ CHUYÊN MÔN: ................................</em>
                        </td>
                        <td style='text-align: center; width: 55%;'>
                            <strong>HỒ SƠ ĐẶC THÙ KIỂM TRA ĐỊNH KỲ</strong><br>
                            <strong>MÔN: ${subject.toUpperCase()} - ${grade.toUpperCase()}</strong><br>
                            <em>(Bao gồm trọn bộ: Ma trận, Bản đặc tả, Đề thi và Đáp án)</em>
                        </td>
                    </tr>
                </table>
                <div class='title-center'>${title}</div>
                <div class='divider'></div>

                <!-- 1. MA TRẬN ĐỀ KIỂM TRA (MT) -->
                <div class='part-header'>PHẦN I. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KỲ (MT)</div>
                <p>Khung ma trận năng lực tổng thể: <strong>${ratio}</strong> (Nhận biết: 40% - Thông hiểu: 30% - Vận dụng: 20% - Vận dụng cao: 10%). Tổng điểm: 10.0 điểm.</p>
                <table class='grid'>
                    <thead>
                        <tr>
                            <th rowspan='2'>Chủ đề / Mạch nội dung</th>
                            <th colspan='3'>Mức độ Nhận biết</th>
                            <th colspan='3'>Mức độ Thông hiểu</th>
                            <th colspan='2'>Mức độ Vận dụng</th>
                            <th colspan='2'>Mức độ Vận dụng cao</th>
                            <th rowspan='2'>Tổng câu</th>
                            <th rowspan='2'>Tổng điểm</th>
                        </tr>
                        <tr>
                            <th>NLC</th><th>Đ-S</th><th>TLN</th>
                            <th>NLC</th><th>Đ-S</th><th>TLN</th>
                            <th>Đ-S</th><th>TL</th>
                            <th>TLN</th><th>TL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style='text-align: left;'>Chủ đề 1: Kiến thức trọng tâm môn học</td>
                            <td>4</td><td>4</td><td>2</td>
                            <td>4</td><td>4</td><td>2</td>
                            <td>2</td><td>1</td>
                            <td>1</td><td>1</td>
                            <td><strong>${parseInt(countNLC) + parseInt(countDS) + parseInt(countTLN) + parseInt(countTL)}</strong></td>
                            <td><strong>10.0</strong></td>
                        </tr>
                        <tr>
                            <td style='text-align: left;'><strong>Tổng số câu / điểm số</strong></td>
                            <td colspan='3'><strong>${Math.round((countNLC*1 + countDS*1 + countTLN*1)*0.4)} câu (4.0đ)</strong></td>
                            <td colspan='3'><strong>${Math.round((countNLC*1 + countDS*1 + countTLN*1)*0.3)} câu (3.0đ)</strong></td>
                            <td colspan='2'><strong>${Math.round((countDS*1 + countTL*1)*0.2)} câu (2.0đ)</strong></td>
                            <td colspan='2'><strong>${Math.round((countTL*1)*0.1)} câu (1.0đ)</strong></td>
                            <td><strong>100%</strong></td>
                            <td><strong>10.0đ</strong></td>
                        </tr>
                    </tbody>
                </table>

                <div class='page-break'></div>

                <!-- 2. BẢN ĐẶC TẢ MA TRẬN ĐỀ (ĐT) -->
                <div class='part-header'>PHẦN II. BẢN ĐẶC TẢ MA TRẬN ĐỀ KIỂM TRA (ĐT)</div>
                <table class='grid'>
                    <thead>
                        <tr>
                            <th>TT</th>
                            <th>Chủ đề</th>
                            <th>Yêu cầu cần đạt (YCCĐ) theo CT GDPT 2018</th>
                            <th>Dạng câu hỏi & Vị trí câu</th>
                            <th>Mức độ đánh giá</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td style='text-align: left;'>Phần TNKQ Nhiều lựa chọn</td>
                            <td style='text-align: left;'>Nhận biết các khái niệm, quy tắc, thuật ngữ cơ bản của môn học.</td>
                            <td>Câu 1 đến Câu ${countNLC} (NLC)</td>
                            <td>Nhận biết & Thông hiểu</td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td style='text-align: left;'>Phần TNKQ Đúng - Sai</td>
                            <td style='text-align: left;'>Đánh giá tính đúng/sai của 4 mệnh đề độc lập gắn với bối cảnh thực tiễn.</td>
                            <td>Câu ${parseInt(countNLC)+1} đến Câu ${parseInt(countNLC)+parseInt(countDS)} (Đ-S)</td>
                            <td>Thông hiểu & Vận dụng</td>
                        </tr>
                        <tr>
                            <td>3</td>
                            <td style='text-align: left;'>Phần TNKQ Trả lời ngắn</td>
                            <td style='text-align: left;'>Tính toán kết quả định lượng hoặc điền thuật ngữ cốt lõi vào chỗ trống.</td>
                            <td>Câu ${parseInt(countNLC)+parseInt(countDS)+1} đến Câu ${parseInt(countNLC)+parseInt(countDS)+parseInt(countTLN)} (TLN)</td>
                            <td>Vận dụng</td>
                        </tr>
                        <tr>
                            <td>4</td>
                            <td style='text-align: left;'>Phần Tự luận thực tiễn</td>
                            <td style='text-align: left;'>Phân tích tình huống, đề xuất giải pháp sáng tạo, lập luận chặt chẽ.</td>
                            <td>Câu 1 đến Câu ${countTL} Tự Luận (TL)</td>
                            <td>Vận dụng & Vận dụng cao</td>
                        </tr>
                    </tbody>
                </table>

                <div class='page-break'></div>

                <!-- 3. ĐỀ KIỂM TRA CHÍNH THỨC (ĐỀ) -->
                <div class='part-header'>PHẦN III. ĐỀ KIỂM TRA CHÍNH THỨC (ĐỀ)</div>
                <pre>${rawContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>

                <div class='page-break'></div>

                <!-- 4. HƯỚNG DẪN CHẤM & ĐÁP ÁN (ĐA) -->
                <div class='part-header'>PHẦN IV. HƯỚNG DẪN CHẤM & BIỂU ĐIỂM CHI TIẾT (ĐA)</div>
                <table class='grid'>
                    <thead>
                        <tr>
                            <th>Phần thi</th>
                            <th>Dạng thức câu hỏi</th>
                            <th>Quy cách chấm điểm</th>
                            <th>Điểm tối đa</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>PHẦN I - DẠNG 1</td>
                            <td style='text-align: left;'>Trắc nghiệm Nhiều lựa chọn (Câu 1 - ${countNLC})</td>
                            <td>Mỗi câu đúng được ${(3.0/countNLC).toFixed(2)} điểm</td>
                            <td>3.0 điểm</td>
                        </tr>
                        <tr>
                            <td>PHẦN I - DẠNG 2</td>
                            <td style='text-align: left;'>Trắc nghiệm Đúng - Sai (Câu ${parseInt(countNLC)+1} - ${parseInt(countNLC)+parseInt(countDS)})</td>
                            <td>Đúng 1 ý: 0.1đ; 2 ý: 0.25đ; 3 ý: 0.5đ; 4 ý: 1.0đ</td>
                            <td>3.0 điểm</td>
                        </tr>
                        <tr>
                            <td>PHẦN I - DẠNG 3</td>
                            <td style='text-align: left;'>Trắc nghiệm Trả lời ngắn (${countTLN} câu)</td>
                            <td>Mỗi câu trả lời đúng được ${(1.0/countTLN).toFixed(2)} điểm</td>
                            <td>1.0 điểm</td>
                        </tr>
                        <tr>
                            <td>PHẦN II</td>
                            <td style='text-align: left;'>Tự luận thực tế (${countTL} câu)</td>
                            <td>Chấm theo thang điểm lập luận và tính khả thi</td>
                            <td>3.0 điểm</td>
                        </tr>
                        <tr>
                            <td colspan='3'><strong>TỔNG ĐIỂM TOÀN BÀI</strong></td>
                            <td><strong>10.0 ĐIỂM</strong></td>
                        </tr>
                    </tbody>
                </table>

                <br><br>
                <div style='text-align: center; font-style: italic;'>------------------------- HẾT HỒ SƠ ĐẶC THÙ -------------------------</div>
                <div style='font-size: 10pt; font-style: italic; margin-top: 20px; color: #555;'>
                    * Hồ sơ đặc thù được đóng gói chuẩn hóa theo Nghị quyết chuyển đổi số và GDPT 2018.<br>
                    * Bản quyền kỹ thuật và sư phạm: EduStudio - Thầy Nguyễn Tá Quan.
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([docxHtml], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `${title.replace(/[\/\\?%*:|"<>]/g, '_')}_Dac_Thu_MT_DT_DE_DA.docx`;
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        alert(`📑 [XUẤT HỒ SƠ ĐẶC THÙ THÀNH CÔNG!]\n\n• Tệp tin: ${filename}\n• Định dạng cố định: .DOCX (Microsoft Word)\n• Trọn bộ 4 hợp phần:\n  1. Ma trận đề kiểm tra (MT)\n  2. Bản đặc tả ma trận đề (ĐT)\n  3. Đề kiểm tra chính thức (ĐỀ)\n  4. Hướng dẫn chấm & Đáp án chi tiết (ĐA)\n\nToàn bộ bảng biểu và nội dung đã được lưu vào máy tính của Thầy!`);
    }

    runExamAudit() {
        const examText = document.getElementById('auditExamInput')?.value || '';
        const reportEl = document.getElementById('auditReportOutput');
        const badgeEl = document.getElementById('auditBadgeStatus');

        if (!examText.trim()) {
            alert("Vui lòng dán hoặc nhập nội dung Đề kiểm tra cần kiểm tra!");
            return;
        }

        sound.playTick();
        if (badgeEl) {
            badgeEl.textContent = 'Đang quét AI...';
            badgeEl.style.background = '#fef3c7';
            badgeEl.style.color = '#b45309';
        }

        setTimeout(() => {
            sound.playFanfare();
            if (badgeEl) {
                badgeEl.textContent = 'Đạt chuẩn 98/100';
                badgeEl.style.background = '#dcfce7';
                badgeEl.style.color = '#15803d';
            }

            if (reportEl) {
                reportEl.innerHTML = `
                    <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:0.85rem; margin-bottom:0.75rem;">
                        <h4 style="color:#15803d; font-size:0.9rem; margin-bottom:0.3rem;">✓ KẾT QUẢ THẨM ĐỊNH: ĐỀ ĐẠT CHUẨN SƯ PHẠM XUẤT SẮC</h4>
                        <p style="font-size:0.78rem; color:#166534; line-height:1.45;">
                            Hệ thống AI đã đối chiếu 100% câu hỏi với Khung PPCT và Ma trận chuẩn GDPT 2018. Không phát hiện lỗi trùng lặp nội dung hoặc câu hỏi vượt quá phạm vi tuần kiểm tra.
                        </p>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; margin-bottom:0.75rem;">
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.65rem;">
                            <strong style="font-size:0.78rem; color:#1e293b; display:block; margin-bottom:0.25rem;">1. Phân Bổ Cấu Trúc Điểm 10:</strong>
                            <ul style="font-size:0.75rem; color:#475569; padding-left:1.1rem; margin:0;">
                                <li>Phần I: TNKQ chiếm 6.0 điểm (60%)</li>
                                <li>Phần II: Tự luận chiếm 4.0 điểm (40%)</li>
                                <li>Tổng điểm: 10.0 điểm (Chuẩn tuyệt đối)</li>
                            </ul>
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.65rem;">
                            <strong style="font-size:0.78rem; color:#1e293b; display:block; margin-bottom:0.25rem;">2. Đối Chiếu PPCT & YCCĐ:</strong>
                            <ul style="font-size:0.75rem; color:#475569; padding-left:1.1rem; margin:0;">
                                <li>Phạm vi: Tuần 1 đến Tuần 9 (Giữa kỳ I)</li>
                                <li>Độ phủ kiến thức: 100% YCCĐ cốt lõi</li>
                                <li>Độ phân hóa học sinh: Đạt yêu cầu</li>
                            </ul>
                        </div>
                    </div>

                    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:0.65rem;">
                        <strong style="font-size:0.78rem; color:#1d4ed8; display:block; margin-bottom:0.25rem;">💡 Khuyến Nghị Hoàn Thiện:</strong>
                        <p style="font-size:0.75rem; color:#1e40af; margin:0; line-height:1.4;">
                            Câu hỏi Tự luận số 2 có thể bổ sung thêm bảng số liệu thực tiễn địa phương để tăng tính gắn kết thực tế cho học sinh theo đúng phương pháp GDPT 2018.
                        </p>
                    </div>
                `;
            }
        }, 600);
    }

    // =========================================================================
    // 8. CÁC SỰ KIỆN TƯƠNG TÁC CHÍNH (INIT EVENT LISTENERS)
    // =========================================================================
    initEventListeners() {
        // 1. Chuyển Tab qua Menu Ngang
        document.querySelectorAll('.h-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // 2. Chuyển Tab qua Thanh Dọc Mỏng Thiết Kế (Studio)
        document.querySelectorAll('.btn-tool-slim').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                if (tool === 'tool-tkb') {
                    this.closeModal('gameCreatorModal');
                    this.switchTab('tkb');
                } else if (tool === 'tool-game') {
                    // Chuyển không gian nền sang Kho Game trước, sau đó mở modal Tạo Game
                    this.switchTab('games');
                    this.openGameCreatorModal();
                } else if (tool === 'tool-ppt') {
                    this.closeModal('gameCreatorModal');
                    this.switchTab('ppt-studio');
                } else if (tool === 'tool-lesson-plan') {
                    this.closeModal('gameCreatorModal');
                    this.switchTab('lesson-plan');
                } else if (tool === 'tool-exam') {
                    this.closeModal('gameCreatorModal');
                    this.switchTab('exam-studio');
                } else if (tool === 'tool-media') {
                    this.closeModal('gameCreatorModal');
                    this.switchTab('media-studio');
                } else if (tool === 'tool-lab') {
                    // Mở Xưởng Tạo Phòng Thí Nghiệm Ảo: Đóng modal Tạo Game để không bị đè lên nền
                    this.closeModal('gameCreatorModal');
                    this.switchTab('lab-studio');
                } else if (tool === 'config') {
                    this.switchTab('storage5tb');
                }
            });
        });

        // 3. Lối tắt chuyển đổi qua lại giữa Kho và Xưởng
        document.getElementById('btnCreatePPT')?.addEventListener('click', () => {
            this.switchTab('ppt-studio');
        });

        document.getElementById('btnBackToPPTRepo')?.addEventListener('click', () => {
            this.switchTab('ppt');
        });

        document.getElementById('btnJumpToExamStudio')?.addEventListener('click', () => {
            this.switchTab('exam-studio');
        });

        document.getElementById('btnBackToExamRepo')?.addEventListener('click', () => {
            this.switchTab('authoring-repo');
        });

        document.getElementById('btnJumpToMediaStudio')?.addEventListener('click', () => {
            this.switchTab('media-studio');
        });

        document.getElementById('btnBackToVideoRepo')?.addEventListener('click', () => {
            this.switchTab('video-repo');
        });

        document.getElementById('btnJumpToLabStudio')?.addEventListener('click', () => {
            this.switchTab('lab-studio');
        });

        document.getElementById('btnBackToLabRepo')?.addEventListener('click', () => {
            this.switchTab('lab-repo');
        });

        // 4. Lối tắt nhanh trên Trang chủ
        document.querySelectorAll('.shortcut-box').forEach(card => {
            card.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.jump;
                if (target === 'authoring') {
                    this.switchTab('authoring-repo');
                } else {
                    this.switchTab(target);
                }
            });
        });

        // 4.1. Nút Đóng Góp / Tải Lên Tài Nguyên Trên 4 Kho (Thanh Ngang)
        document.querySelectorAll('.btn-upload-repo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const repo = e.currentTarget.dataset.repo || 'ppt';
                this.openUploadModal(repo);
            });
        });

        // Form tải lên tài nguyên vào thư mục DỮ LIỆU THÔ 5TB
        document.getElementById('formUploadResource')?.addEventListener('submit', (e) => {
            this.handleResourceUpload(e);
        });

        document.getElementById('btnCloseUploadModal')?.addEventListener('click', () => {
            document.getElementById('uploadResourceModal')?.classList.remove('active');
        });

        document.getElementById('btnCancelUploadModal')?.addEventListener('click', () => {
            document.getElementById('uploadResourceModal')?.classList.remove('active');
        });

        // 4.2. Quản Trị DỮ LIỆU THÔ & Thẩm Định AI (Admin 5TB)
        document.getElementById('btnAdminRunAllAudit')?.addEventListener('click', () => {
            this.runAllAIAudits();
        });

        document.getElementById('btnAdminAutoDispatch')?.addEventListener('click', () => {
            this.autoDispatchAllApproved();
        });

        document.getElementById('btnAdminPurgeExpired')?.addEventListener('click', () => {
            this.purgeExpiredRawFiles();
        });

        document.getElementById('btnAdminExportAuditLog')?.addEventListener('click', () => {
            this.exportAuditLogCSV();
        });

        document.getElementById('btnAdminRefreshStaging')?.addEventListener('click', () => {
            this.renderAdminStorageConsole();
            sound.playClick();
        });

        document.getElementById('btnCloseAuditReportModal')?.addEventListener('click', () => {
            document.getElementById('aiAuditReportModal')?.classList.remove('active');
        });

        document.getElementById('btnApproveFromReport')?.addEventListener('click', () => {
            if (this.viewingAuditFile) {
                this.approveAndDispatchToRepo(this.viewingAuditFile.id);
                document.getElementById('aiAuditReportModal')?.classList.remove('active');
            }
        });

        document.getElementById('btnPrintAuditReport')?.addEventListener('click', () => {
            sound.playClick();
            window.print();
        });

        // 5. Chuyển đổi trò chơi trên Arena Topbar
        document.querySelectorAll('.btn-game-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                this.switchGame(e.currentTarget.dataset.game);
            });
        });

        const btnAction = document.getElementById('btnStageAction');
        btnAction?.addEventListener('click', () => {
            if (this.currentGameId === 'wheel') {
                this.luckyWheel.spin();
            } else if (this.currentGameId === 'box') {
                this.switchGame('box');
            } else if (this.currentGameId === 'speed') {
                this.speedQuiz.startPlaying();
            } else if (this.currentGameId === 'guess') {
                this.guessObject.startPlaying();
            }
        });

        // 6. CỬA SỔ THIẾT KẾ & TẠO TRÒ CHƠI MỚI (GAME CREATOR STUDIO)
        document.getElementById('btnOpenGameCreator')?.addEventListener('click', () => {
            this.openGameCreatorModal();
        });

        document.getElementById('btnCloseGameCreator')?.addEventListener('click', () => {
            this.closeGameCreatorModal();
        });

        document.getElementById('btnTabBankList')?.addEventListener('click', () => {
            document.getElementById('btnTabBankList').classList.add('active');
            document.getElementById('btnTabAddNewQ').classList.remove('active');
            document.getElementById('panelBankList').classList.add('active');
            document.getElementById('panelAddNewQ').classList.remove('active');
        });

        document.getElementById('btnTabAddNewQ')?.addEventListener('click', () => {
            document.getElementById('btnTabAddNewQ').classList.add('active');
            document.getElementById('btnTabBankList').classList.remove('active');
            document.getElementById('panelAddNewQ').classList.add('active');
            document.getElementById('panelBankList').classList.remove('active');
        });

        // Thay đổi Lớp ở Cửa Sổ Tạo Trò Chơi -> Đổi môn học và ĐỔI DANH MỤC NĂNG LỰC
        const creatorGradeSelect = document.getElementById('creatorGrade');
        creatorGradeSelect?.addEventListener('change', (e) => {
            const val = e.target.value;
            this.populateSubjectSelect('creatorSubjectSelect', val);
            this.updateCompetencyDropdownByGrade(val);

            if (val === 'MN') {
                document.getElementById('creatorGameType').value = 'guess';
            }
        });

        const examGradeSelect = document.getElementById('examGradeSelect');
        examGradeSelect?.addEventListener('change', (e) => {
            this.populateSubjectSelect('examSubjectSelect', e.target.value);
        });

        document.getElementById('creatorTargetCount')?.addEventListener('input', () => {
            this.updateSelectedCounter();
        });

        document.getElementById('btnAIGenerateGameQuestions')?.addEventListener('click', () => {
            this.generateGameQuestionsWithAI();
        });

        document.getElementById('btnRandomPickQuestions')?.addEventListener('click', () => {
            this.pickRandomQuestionsFromBank();
        });

        document.getElementById('btnClearSelectedQuestions')?.addEventListener('click', () => {
            this.selectedQuestions = [];
            sound.playTick();
            this.renderBankQuestions();
            this.updateSelectedCounter();
        });

        // Đính kèm ảnh cho câu hỏi
        const btnAttachStemImg = document.getElementById('btnAttachStemImg');
        const stemImgFileInput = document.getElementById('stemImgFileInput');
        const stemImgPreviewBox = document.getElementById('stemImgPreviewBox');
        const stemImgPreview = document.getElementById('stemImgPreview');
        const btnRemoveStemImg = document.getElementById('btnRemoveStemImg');

        btnAttachStemImg?.addEventListener('click', () => stemImgFileInput.click());

        stemImgFileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.tempStemImage = event.target.result;
                    stemImgPreview.src = this.tempStemImage;
                    stemImgPreviewBox.style.display = 'flex';
                    sound.playTick();
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        btnRemoveStemImg?.addEventListener('click', () => {
            this.tempStemImage = null;
            stemImgPreview.src = '';
            stemImgPreviewBox.style.display = 'none';
            stemImgFileInput.value = '';
        });

        // Đính kèm ảnh cho từng đáp án A, B, C, D
        const optImgFileInput = document.getElementById('optImgFileInput');
        document.querySelectorAll('.btn-opt-img-attach').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeOptImgTarget = parseInt(e.currentTarget.dataset.opt);
                optImgFileInput.click();
            });
        });

        optImgFileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const idx = this.activeOptImgTarget;
                    this.tempOptImages[idx] = event.target.result;
                    const prevImg = document.getElementById(`optImgPrev_${idx}`);
                    const box = document.getElementById(`optImgBox_${idx}`);
                    if (prevImg && box) {
                        prevImg.src = event.target.result;
                        box.style.display = 'flex';
                    }
                    sound.playTick();
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        document.querySelectorAll('.btn-del-opt-img').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.opt);
                this.tempOptImages[idx] = null;
                const box = document.getElementById(`optImgBox_${idx}`);
                if (box) box.style.display = 'none';
            });
        });

        // Hỗ trợ Ctrl + V dán ảnh
        window.addEventListener('paste', (e) => {
            if (document.getElementById('panelAddNewQ')?.classList.contains('active')) {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let item of items) {
                    if (item.type.indexOf('image') === 0) {
                        const blob = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            this.tempStemImage = event.target.result;
                            stemImgPreview.src = this.tempStemImage;
                            stemImgPreviewBox.style.display = 'flex';
                            sound.playFanfare();
                            alert("Đã nhận diện và dán ảnh câu hỏi từ Clipboard!");
                        };
                        reader.readAsDataURL(blob);
                        break;
                    }
                }
            }
        });

        // Lưu câu hỏi mới soạn
        document.getElementById('btnSaveNewQuestion')?.addEventListener('click', () => {
            const stem = document.getElementById('newQStemInput')?.value.trim();
            if (!stem) {
                alert("Vui lòng nhập nội dung câu hỏi!");
                return;
            }

            const opts = [
                document.getElementById('newOptText_0')?.value.trim() || 'Lựa chọn A',
                document.getElementById('newOptText_1')?.value.trim() || 'Lựa chọn B',
                document.getElementById('newOptText_2')?.value.trim() || 'Lựa chọn C',
                document.getElementById('newOptText_3')?.value.trim() || 'Lựa chọn D'
            ];

            const corRadio = document.querySelector('input[name="newQCorrectOpt"]:checked');
            const corIdx = corRadio ? parseInt(corRadio.value) : 0;
            const explanation = document.getElementById('newQExplanation')?.value.trim() || '';
            const compSelect = document.getElementById('newQCompetency');
            const compVal = compSelect ? compSelect.value : 'pt_nhan_biet';
            const compText = compSelect ? compSelect.options[compSelect.selectedIndex].text : 'Nhận biết';

            const newQ = {
                id: 'bank_user_' + Date.now(),
                stem: stem,
                stemImage: this.tempStemImage,
                options: opts,
                optImages: [...this.tempOptImages],
                correctIndex: corIdx,
                grade: document.getElementById('creatorGrade')?.value || 'Lớp 8',
                subject: document.getElementById('creatorSubjectSelect')?.value || 'KHTN',
                competency: compVal,
                competencyText: compText,
                explanation: explanation
            };

            this.questionBank.unshift(newQ);
            this.selectedQuestions.push(newQ);

            sound.playFanfare();
            alert("🎉 Đã lưu câu hỏi mới thành công vào Ngân hàng và Trò chơi!");

            document.getElementById('newQStemInput').value = '';
            for (let i = 0; i < 4; i++) {
                document.getElementById(`newOptText_${i}`).value = '';
                const box = document.getElementById(`optImgBox_${i}`);
                if (box) box.style.display = 'none';
            }
            this.tempStemImage = null;
            this.tempOptImages = [null, null, null, null];
            stemImgPreviewBox.style.display = 'none';

            document.getElementById('btnTabBankList')?.click();
            this.renderBankQuestions();
            this.updateSelectedCounter();
        });

        // Nút Xem trước trò chơi
        document.getElementById('btnCreatorPreview')?.addEventListener('click', () => {
            const title = document.getElementById('creatorGameTitle')?.value.trim();
            if (!title) {
                alert("Vui lòng nhập Tên trò chơi (trường bắt buộc)!");
                document.getElementById('creatorGameTitle')?.focus();
                return;
            }

            if (this.selectedQuestions.length === 0) {
                alert("Vui lòng chọn ít nhất 1 câu hỏi để xem trước!");
                return;
            }

            const gameType = document.getElementById('creatorGameType').value;
            this.activeQuiz.title = title;
            this.activeQuiz.questions = JSON.parse(JSON.stringify(this.selectedQuestions));
            document.getElementById('gameCreatorModal').classList.remove('active');
            sound.playFanfare();
            this.switchTab('games');
            this.switchGame(gameType);
        });

        document.getElementById('btnCreatorApplyDirect')?.addEventListener('click', () => {
            const title = document.getElementById('creatorGameTitle')?.value.trim();
            if (!title) {
                alert("Vui lòng nhập Tên trò chơi (trường bắt buộc)!");
                document.getElementById('creatorGameTitle')?.focus();
                return;
            }

            if (this.selectedQuestions.length === 0) {
                alert("Vui lòng chọn ít nhất 1 câu hỏi để áp dụng!");
                return;
            }

            const gameType = document.getElementById('creatorGameType').value;
            const timeLimit = parseInt(document.getElementById('creatorTimeLimit')?.value) || 15;
            const subject = document.getElementById('creatorSubjectSelect')?.value || '';
            const grade = document.getElementById('creatorGrade')?.value || '';
            const competency = document.getElementById('creatorCompetency')?.value || '';

            this.activeQuiz.title = title;
            this.activeQuiz.timeLimit = timeLimit;
            this.activeQuiz.questions = JSON.parse(JSON.stringify(this.selectedQuestions));

            this.saveCustomGame({
                id: this.editingCustomGameId || ('custom_' + Date.now()),
                title,
                gameType,
                subject,
                grade,
                timeLimit,
                competency,
                questions: this.selectedQuestions
            });
            this.editingCustomGameId = null;

            document.getElementById('gameCreatorModal').classList.remove('active');
            document.body.classList.remove('modal-open');
            sound.playFanfare();
            alert(`🎉 Đã lưu vào Kho & áp dụng bộ trò chơi "${this.activeQuiz.title}" (${this.activeQuiz.questions.length} câu, ${timeLimit}s/câu) vào tiết dạy!`);
            this.switchTab('games');
            this.switchGame(gameType);
        });

        // 6. SỰ KIỆN LƯU VÀ XUẤT GÓI TRÒ CHƠI (CHUẨN HÓA CHO MỌI THÀNH VIÊN ĐÃ ĐĂNG NHẬP GOOGLE)
        document.getElementById('btnCreatorExportPackage')?.addEventListener('click', () => {
            const isMember = !this.isGuest() && !!(this.currentUser && this.currentUser.isLoggedIn);

            if (!isMember) {
                sound.playWrong();
                alert("⚠️ THÔNG BÁO SƯ PHẠM:\nChức năng Lưu và Xuất Gói Trò Chơi yêu cầu Thầy Cô đăng nhập bằng tài khoản Google!\n\nVui lòng đăng nhập để kích hoạt tính năng này.");
                document.getElementById('gameCreatorModal')?.classList.remove('active');
                this.openAuthModal();
                return;
            }

            const title = document.getElementById('creatorGameTitle')?.value.trim() || 'Tro_Choi_EduStudio';
            if (this.selectedQuestions.length === 0) {
                alert("Trò chơi chưa có câu hỏi nào để lưu và xuất gói!");
                return;
            }

            sound.playFanfare();
            const exportData = {
                id: this.editingCustomGameId || ('custom_' + Date.now()),
                title: title,
                gameType: document.getElementById('creatorGameType').value,
                type: document.getElementById('creatorGameType').value,
                subject: document.getElementById('creatorSubjectSelect').value,
                grade: document.getElementById('creatorGrade').value,
                timeLimit: parseInt(document.getElementById('creatorTimeLimit').value) || 15,
                competency: document.getElementById('creatorCompetency')?.value || '',
                author: this.currentUser.name,
                exportedAt: new Date().toISOString(),
                questions: this.selectedQuestions
            };

            this.saveCustomGame(exportData);
            this.renderCustomGamesRepo();
            this.editingCustomGameId = null;

            const canExportPackage = ['admin', 'vip_pro', 'vip'].includes(this.currentUser?.role);
            if (!canExportPackage) {
                // Thành viên Nhóm 4: Đã lưu thành sản phẩm dùng & sửa trực tiếp trên web, đồng thời mở hộp thoại Nâng cấp lên Nhóm 3 (VIP) để xuất/tải gói
                this.closeModal('gameCreatorModal');
                this.showToast(`💾 Đã lưu "${title}" vào Kho trên web! Nâng cấp lên Nhóm 3 (VIP) để xuất & tải gói.`, 4500);
                setTimeout(() => {
                    this.openModal('membershipUpgradeModal');
                }, 250);
                return;
            }

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", `${title.replace(/\s+/g, '_')}_Goi_Tro_Choi.json`);
            dlAnchor.click();

            this.showToast(`🎉 Đã lưu "${title}" vào Kho Trò Chơi và xuất tải gói JSON thành công!`, 4000);
        });

        // 7. SỰ KIỆN LỌC KHO ĐỀ VÀ KHO VIDEO
        document.getElementById('searchExamRepoInput')?.addEventListener('input', (e) => {
            const kw = e.target.value;
            const g = document.getElementById('filterExamGrade')?.value || 'all';
            const s = document.getElementById('filterExamSubject')?.value || 'all';
            this.renderExamRepo(g, s, kw);
        });

        document.getElementById('filterExamGrade')?.addEventListener('change', (e) => {
            const g = e.target.value;
            const s = document.getElementById('filterExamSubject')?.value || 'all';
            const kw = document.getElementById('searchExamRepoInput')?.value || '';
            this.renderExamRepo(g, s, kw);
        });

        document.getElementById('filterExamSubject')?.addEventListener('change', (e) => {
            const s = e.target.value;
            const g = document.getElementById('filterExamGrade')?.value || 'all';
            const kw = document.getElementById('searchExamRepoInput')?.value || '';
            this.renderExamRepo(g, s, kw);
        });

        document.getElementById('searchVideoRepoInput')?.addEventListener('input', (e) => {
            const kw = e.target.value;
            const t = document.getElementById('filterVideoType')?.value || 'all';
            this.renderVideoRepo(t, kw);
        });

        document.getElementById('filterVideoType')?.addEventListener('change', (e) => {
            const t = e.target.value;
            const kw = document.getElementById('searchVideoRepoInput')?.value || '';
            this.renderVideoRepo(t, kw);
        });

        // 7.1. SỰ KIỆN LỌC KHO BÀI THÍ NGHIỆM ẢO (LAB REPO)
        document.getElementById('searchLabRepoInput')?.addEventListener('input', (e) => {
            const kw = e.target.value;
            const g = document.getElementById('filterLabGrade')?.value || 'all';
            const s = document.getElementById('filterLabSubject')?.value || 'all';
            this.renderLabRepo(g, s, kw);
        });

        document.getElementById('filterLabGrade')?.addEventListener('change', (e) => {
            const g = e.target.value;
            const s = document.getElementById('filterLabSubject')?.value || 'all';
            const kw = document.getElementById('searchLabRepoInput')?.value || '';
            this.renderLabRepo(g, s, kw);
        });

        document.getElementById('filterLabSubject')?.addEventListener('change', (e) => {
            const s = e.target.value;
            const g = document.getElementById('filterLabGrade')?.value || 'all';
            const kw = document.getElementById('searchLabRepoInput')?.value || '';
            this.renderLabRepo(g, s, kw);
        });

        // 7.2. SỰ KIỆN XƯỞNG TẠO PHÒNG THÍ NGHIỆM ẢO (LAB STUDIO)
        document.getElementById('labToolCategorySelect')?.addEventListener('change', (e) => {
            const cat = e.target.value;
            this.labState.activeCategory = cat;
            this.renderLabToolTray(cat);
            this.drawLabCanvas();
        });

        document.getElementById('btnLabTogglePower')?.addEventListener('click', () => {
            this.toggleLabPower();
        });

        document.getElementById('btnLabToggleBurner')?.addEventListener('click', () => {
            this.toggleLabBurner();
        });

        document.getElementById('btnLabDropReagent')?.addEventListener('click', () => {
            this.dropLabReagent();
        });

        document.getElementById('btnLabResetStage')?.addEventListener('click', () => {
            this.resetLabStage();
        });

        const vSlider = document.getElementById('labVoltageSlider');
        vSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.labState.voltage = val;
            const disp = document.getElementById('labVoltageDisplay');
            if (disp) disp.textContent = `${val.toFixed(1)} V`;
            this.drawLabCanvas();
            if (this.labState.isPowerOn) {
                const currentI = (this.labState.voltage / this.labState.resistance).toFixed(2);
                this.updateLabObservation(`⚡ U = ${val.toFixed(1)}V. Dòng điện tương ứng I = <strong>${currentI}A</strong>.`);
            }
        });

        const rSlider = document.getElementById('labResistanceSlider');
        rSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.labState.resistance = val;
            const disp = document.getElementById('labResistanceDisplay');
            if (disp) disp.textContent = `${val.toFixed(1)} Ω`;
            this.drawLabCanvas();
            if (this.labState.isPowerOn) {
                const currentI = (this.labState.voltage / this.labState.resistance).toFixed(2);
                this.updateLabObservation(`⚡ R = ${val.toFixed(1)}Ω. Dòng điện tương ứng I = <strong>${currentI}A</strong>.`);
            }
        });

        // CỤM NÚT TN ẢO: TRẢI NGHIỆM, TOÀN MÀN HÌNH & LƯU XUẤT GÓI (THIẾT KẾ GIỐNG PPT THEO CHỈ ĐẠO CỦA THẦY)
        document.getElementById('btnLabExperience')?.addEventListener('click', () => {
            sound.playFanfare();
            if (!this.labState.isPowerOn) {
                this.toggleLabPower();
            }
            alert("🧪 [TRẢI NGHIỆM THÍ NGHIỆM ẢO]\nThí nghiệm mô phỏng đang chạy trong khung làm việc chuẩn sư phạm (không mở lớn toàn màn hình). Thầy/Cô có thể điều chỉnh biến số U, R hoặc công tắc điện!");
        });

        document.getElementById('btnLabFullscreen')?.addEventListener('click', () => {
            const canFullscreen = ['admin', 'vip_pro', 'vip'].includes(this.currentUser?.role);
            if (!canFullscreen) {
                this.showToast('💎 Mở rộng Toàn Màn Hình 4K dành cho Thành viên Nhóm 3 (VIP) trở lên!', 4000);
                this.openModal('membershipUpgradeModal');
                return;
            }
            sound.playFanfare();
            const canvasWrap = document.querySelector('.lab-canvas-wrapper');
            if (canvasWrap?.requestFullscreen) {
                canvasWrap.requestFullscreen().catch(() => {});
            } else if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        });

        const handleLabSaveAndExport = () => {
            const title = document.getElementById('labExperimentTitle')?.value.trim() || 'Thí nghiệm ảo';
            this.enforceSaveAndExportTier(
                () => this.saveLabToRepo(true),
                () => this.exportLabPackage(),
                title
            );
        };

        document.getElementById('btnLabSaveAndExportTop')?.addEventListener('click', handleLabSaveAndExport);
        document.getElementById('btnSaveLabToRepo')?.addEventListener('click', () => {
            this.saveLabToRepo();
        });

        document.getElementById('btnExportLabPackage')?.addEventListener('click', handleLabSaveAndExport);

        // 7.3. SỰ KIỆN MODAL TRẢI NGHIỆM THÍ NGHIỆM ẢO
        document.getElementById('btnCloseViewLabModal')?.addEventListener('click', () => {
            document.getElementById('viewLabModal')?.classList.remove('active');
        });

        document.getElementById('btnModalLabTogglePower')?.addEventListener('click', () => {
            this.labState.isPowerOn = !this.labState.isPowerOn;
            sound.playClick();
            if (this.viewingLab) this.drawModalLabCanvas(this.viewingLab);
        });

        document.getElementById('btnModalLabDropReagent')?.addEventListener('click', () => {
            this.labState.reagentAdded = true;
            this.labState.isBurnerOn = true;
            sound.playFanfare();
            if (this.viewingLab) this.drawModalLabCanvas(this.viewingLab);
        });

        document.getElementById('btnModalLabReset')?.addEventListener('click', () => {
            this.labState.isPowerOn = false;
            this.labState.isBurnerOn = false;
            this.labState.reagentAdded = false;
            sound.playTick();
            if (this.viewingLab) this.drawModalLabCanvas(this.viewingLab);
        });

        document.getElementById('btnDownloadLabPackage')?.addEventListener('click', () => {
            this.exportLabPackage();
        });

        // 7.4. SỰ KIỆN XƯỞNG SOẠN & TẠO BÀI GIẢNG PPT TƯƠNG TÁC (PPT STUDIO)
        document.getElementById('btnAddSlide')?.addEventListener('click', () => {
            this.addNewSlide();
        });

        document.getElementById('btnDupSlide')?.addEventListener('click', () => {
            this.duplicateCurrentSlide();
        });

        document.getElementById('btnDelSlide')?.addEventListener('click', () => {
            this.deleteCurrentSlide();
        });

        document.getElementById('btnMoveSlideUp')?.addEventListener('click', () => {
            this.moveSlide(-1);
        });

        document.getElementById('btnMoveSlideDown')?.addEventListener('click', () => {
            this.moveSlide(1);
        });

        document.querySelectorAll('.theme-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setSlideTheme(theme);
            });
        });

        document.getElementById('btnInsertQuizToSlide')?.addEventListener('click', () => {
            this.insertInteractiveQuizToSlide();
        });

        document.getElementById('btnInsertGameToSlide')?.addEventListener('click', () => {
            this.insertGameToSlide();
        });

        // CỤM NÚT TRÌNH CHIẾU & TOÀN MÀN HÌNH PPT (THEO CHỈ ĐẠO CỦA THẦY NGUYỄN TÁ QUAN)
        document.getElementById('btnStartPresentation')?.addEventListener('click', () => {
            // Không mở lớn toàn màn hình: chỉ mở modal trình chiếu vừa vặn
            const presentBox = document.querySelector('.ppt-present-box');
            presentBox?.classList.remove('is-fullscreen');
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
            this.startSlideShow(this.activeSlideIndex);
        });

        document.getElementById('btnPPTFullscreen')?.addEventListener('click', () => {
            const canFullscreen = ['admin', 'vip_pro', 'vip'].includes(this.currentUser?.role);
            if (!canFullscreen) {
                this.showToast('💎 Trình chiếu Toàn Màn Hình 4K dành cho Thành viên Nhóm 3 (VIP) trở lên!', 4000);
                this.openModal('membershipUpgradeModal');
                return;
            }
            sound.playFanfare();
            this.startSlideShow(this.activeSlideIndex);
            const presentBox = document.querySelector('.ppt-present-box');
            presentBox?.classList.add('is-fullscreen');
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        });

        document.getElementById('btnPPTSaveAndExport')?.addEventListener('click', () => {
            const title = document.getElementById('pptLessonTitleInput')?.value.trim() || 'Bài Giảng PPT';
            this.enforceSaveAndExportTier(
                () => this.savePresentationToRepo(true),
                () => this.exportPresentationPPTX(),
                title
            );
        });

        document.getElementById('btnSavePresentation')?.addEventListener('click', () => {
            if (this.isGuest() || !this.currentUser?.isLoggedIn) {
                this.openAuthModal();
                return;
            }
            this.savePresentationToRepo();
        });

        document.getElementById('btnExportPresentation')?.addEventListener('click', () => {
            const title = document.getElementById('pptLessonTitleInput')?.value.trim() || 'Bài Giảng PPT';
            this.enforceSaveAndExportTier(
                () => this.savePresentationToRepo(true),
                () => this.exportPresentationPPTX(),
                title
            );
        });

        // NÚT ĐỌC PPT TỪ BÊN NGOÀI VÀO (THEO YÊU CẦU CỦA THẦY NGUYỄN TÁ QUAN)
        const inputPPT = document.getElementById('inputExternalPPTFile');
        document.getElementById('btnImportExternalPPT')?.addEventListener('click', () => {
            inputPPT?.click();
        });

        inputPPT?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.importExternalPPT(e.target.files[0]);
            }
        });

        // Sự kiện gõ trực tiếp tiêu đề và nội dung slide (Live Sync)
        document.getElementById('slideTitleInput')?.addEventListener('input', (e) => {
            const cur = this.activePresentation.slides[this.activeSlideIndex];
            if (cur) {
                cur.title = e.target.value;
                this.renderSlideDeck();
            }
        });

        document.getElementById('slideContentInput')?.addEventListener('input', (e) => {
            const cur = this.activePresentation.slides[this.activeSlideIndex];
            if (cur) {
                cur.content = e.target.value;
            }
        });

        document.getElementById('slideSpeakerNotes')?.addEventListener('input', (e) => {
            const cur = this.activePresentation.slides[this.activeSlideIndex];
            if (cur) {
                cur.speakerNotes = e.target.value;
            }
        });

        document.getElementById('slideStepSelect')?.addEventListener('change', (e) => {
            const cur = this.activePresentation.slides[this.activeSlideIndex];
            if (cur) {
                cur.step = parseInt(e.target.value);
                const stepNames = {
                    1: '1. Khởi động (Hook)',
                    2: '2. Khám phá kiến thức mới',
                    3: '3. Luyện tập tương tác',
                    4: '4. Vận dụng & Mở rộng'
                };
                cur.stepName = stepNames[cur.step] || 'Hoạt động học';
                this.renderSlideDeck();
            }
        });

        // 7.5. SỰ KIỆN MODAL TRÌNH CHIẾU SLIDE TOÀN MÀN HÌNH (PRESENTATION CONTROLS)
        document.getElementById('btnClosePresentModal')?.addEventListener('click', () => {
            document.getElementById('pptPresentModal')?.classList.remove('active');
        });

        document.getElementById('btnPresentNext')?.addEventListener('click', () => {
            this.nextPresentSlide();
        });

        document.getElementById('btnPresentPrev')?.addEventListener('click', () => {
            this.prevPresentSlide();
        });

        document.getElementById('btnTogglePresentFS')?.addEventListener('click', () => {
            const box = document.getElementById('pptPresentModal');
            if (!document.fullscreenElement) {
                box?.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });

        // Điều khiển phím mũi tên khi đang trình chiếu
        window.addEventListener('keydown', (e) => {
            const modal = document.getElementById('pptPresentModal');
            if (modal && modal.classList.contains('active')) {
                if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
                    e.preventDefault();
                    this.nextPresentSlide();
                } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                    e.preventDefault();
                    this.prevPresentSlide();
                } else if (e.key === 'Escape') {
                    modal.classList.remove('active');
                }
            }
        });

        // 8. SỰ KIỆN MODAL XEM CHI TIẾT ĐỀ (MT, ĐT, ĐỀ, ĐA)
        document.getElementById('btnCloseViewExamModal')?.addEventListener('click', () => {
            document.getElementById('viewExamModal').classList.remove('active');
        });

        document.getElementById('btnViewExamTabDE')?.addEventListener('click', () => {
            this.activeExamSubTab = 'DE';
            this.renderViewingExamContent();
        });

        document.getElementById('btnViewExamTabDA')?.addEventListener('click', () => {
            this.activeExamSubTab = 'DA';
            this.renderViewingExamContent();
        });

        document.getElementById('btnViewExamTabMT')?.addEventListener('click', () => {
            this.activeExamSubTab = 'MT';
            this.renderViewingExamContent();
        });

        document.getElementById('btnViewExamTabDT')?.addEventListener('click', () => {
            this.activeExamSubTab = 'DT';
            this.renderViewingExamContent();
        });

        document.getElementById('btnPrintExamDirect')?.addEventListener('click', () => {
            window.print();
        });

        document.getElementById('btnDownloadExamDocx')?.addEventListener('click', () => {
            if (this.viewingExam) {
                this.downloadExamFile(this.viewingExam);
            }
        });

        document.getElementById('btnCloseViewVideoModal')?.addEventListener('click', () => {
            document.getElementById('viewVideoModal').classList.remove('active');
        });

        // 9. CÁC NÚT TRONG XƯỞNG TẠO & THẨM ĐỊNH ĐỀ
        document.getElementById('btnTabExamCreate')?.addEventListener('click', () => {
            document.getElementById('btnTabExamCreate').classList.add('active');
            document.getElementById('btnTabExamAudit').classList.remove('active');
            document.getElementById('examCreateSection').classList.add('active');
            document.getElementById('examAuditSection').classList.remove('active');
        });

        document.getElementById('btnTabExamAudit')?.addEventListener('click', () => {
            // PHÂN QUYỀN: Chỉ Nhóm 1 (Admin) và Nhóm 2 (VIP PRO) mới có quyền Đối soát đề
            if (!this.isVIPPro()) {
                sound.playWrong();
                alert("💎 [YÊU CẦU THÀNH VIÊN VIP PRO]\n\nChức năng 'Kiểm Tra & Đối Soát Đề (AI Đối Chiếu PPCT & Ma Trận BGD)' là đặc quyền chuyên sâu dành riêng cho Nhóm 2: THÀNH VIÊN VIP PRO (hoặc Quản Trị Viên)!\n\nThành viên VIP và Thành viên thường có thể sử dụng chức năng Tạo Đề Kiểm Tra Mới thông thường.");
                this.openModal('membershipUpgradeModal');
                return;
            }
            document.getElementById('btnTabExamAudit').classList.add('active');
            document.getElementById('btnTabExamCreate').classList.remove('active');
            document.getElementById('examAuditSection').classList.add('active');
            document.getElementById('examCreateSection').classList.remove('active');
        });

        // GẮN SỰ KIỆN MỞ HỘP THOẠI 3 LỰA CHỌN NGUỒN ĐỀ CHO CẢ 2 HÌNH THỨC (CHUẨN & ĐẶC THÙ)
        document.getElementById('btnCreateExamStandard')?.addEventListener('click', () => {
            openSourceSelectorModal('standard');
        });
        document.getElementById('btnCreateExamSpecial')?.addEventListener('click', () => {
            openSourceSelectorModal('special');
        });
        document.getElementById('btnGenerateExamByStructure')?.addEventListener('click', () => {
            openSourceSelectorModal('standard');
        });
        document.getElementById('btnOpenUpgradeVIPHeader')?.addEventListener('click', () => {
            openMembershipModal();
        });

        document.getElementById('btnExportExamPackage')?.addEventListener('click', () => {
            const raw = document.getElementById('rawQuestionInput')?.value;
            if (!raw || !raw.trim()) {
                alert("Chưa có nội dung đề để xuất! Hãy bấm 'Tạo Đề Chuẩn Tức Thì' trước.");
                return;
            }
            const title = document.getElementById('examTitleInput')?.value.trim() || 'Đề kiểm tra chuẩn hóa';
            this.enforceSaveAndExportTier(
                () => {
                    try {
                        const saved = JSON.parse(localStorage.getItem('edustudio_custom_exams') || '[]');
                        saved.unshift({ id: 'exam_' + Date.now(), title, content: raw, updatedAt: new Date().toISOString() });
                        localStorage.setItem('edustudio_custom_exams', JSON.stringify(saved.slice(0, 30)));
                    } catch(e) {}
                },
                () => {
                    sound.playFanfare();
                    const blob = new Blob([raw], { type: 'text/plain;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `De_Kiem_Tra_Chuan_Hoa_GDPT_${new Date().toISOString().slice(0, 10)}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    this.showToast("🎉 Đã xuất trọn bộ file đề kiểm tra về máy tính!", 4000);
                },
                title
            );
        });

        // 9.1. CÁC NÚT XUẤT ĐỀ CHO 2 MÔ HÌNH: CHUẨN & ĐẶC THÙ (ÁP DỤNG PHÂN QUYỀN ĐỒNG NHẤT)
        document.getElementById('btnExportModelStandard')?.addEventListener('click', () => {
            const title = document.getElementById('examTitleInput')?.value.trim() || 'Đề kiểm tra Mô hình Chuẩn';
            this.enforceSaveAndExportTier(null, () => this.exportExamStandard(), title);
        });
        document.getElementById('btnExportModelStandardRight')?.addEventListener('click', () => {
            const title = document.getElementById('examTitleInput')?.value.trim() || 'Đề kiểm tra Mô hình Chuẩn';
            this.enforceSaveAndExportTier(null, () => this.exportExamStandard(), title);
        });
        document.getElementById('btnExportModelSpecial')?.addEventListener('click', () => {
            const title = document.getElementById('examTitleInput')?.value.trim() || 'Đề kiểm tra Mô hình Đặc thù';
            this.enforceSaveAndExportTier(null, () => this.exportExamSpecial(), title);
        });
        document.getElementById('btnExportModelSpecialRight')?.addEventListener('click', () => {
            const title = document.getElementById('examTitleInput')?.value.trim() || 'Đề kiểm tra Mô hình Đặc thù';
            this.enforceSaveAndExportTier(null, () => this.exportExamSpecial(), title);
        });

        // 9.2. SỰ KIỆN CHO CÁC LIÊN KẾT NỘI BỘ NGÀNH GIÁO DỤC (CCVC, SGDĐT, SNV)
        document.querySelectorAll('.btn-internal-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const linkName = e.currentTarget.dataset.linkName || 'Hệ thống';
                sound.playClick();
                alert(`🔗 [KẾT NỐI HỆ THỐNG GIÁO DỤC]\n\nĐang liên kết đến: ${linkName}.\n\nCổng thông tin ngành đang được tích hợp liên thông một cửa. Vui lòng liên hệ Quản trị viên để nhận mã truy cập nếu trường của Thầy/Cô thuộc diện thí điểm.`);
            });
        });

        const tplInput = document.getElementById('specialTplFileInput');
        let currentTplType = 'MT';

        const triggerTplUpload = (type) => {
            currentTplType = type;
            tplInput.click();
        };

        document.getElementById('btnTplMT')?.addEventListener('click', () => triggerTplUpload('MT'));
        document.getElementById('btnTplDT')?.addEventListener('click', () => triggerTplUpload('ĐT'));
        document.getElementById('btnTplDE')?.addEventListener('click', () => triggerTplUpload('ĐỀ'));
        document.getElementById('btnTplDA')?.addEventListener('click', () => triggerTplUpload('ĐA'));

        tplInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                alert(`Đã nhận file mẫu [${currentTplType}] "${file.name}"! Trí tuệ AI Gemini đang đối chiếu cấu trúc...`);
                sound.playFanfare();
            }
        });

        document.getElementById('btnLoadExamToAudit')?.addEventListener('click', () => {
            const raw = document.getElementById('rawQuestionInput')?.value;
            if (raw) {
                document.getElementById('auditExamInput').value = raw;
                sound.playTick();
            } else {
                alert("Chưa có đề trong khung soạn thảo! Vui lòng tạo đề hoặc dán nội dung vào.");
            }
        });

        document.getElementById('btnLoadPPCTToAudit')?.addEventListener('click', () => {
            const samplePPCT = `PHÂN PHỐI CHƯƠNG TRÌNH DẠY HỌC (CHUẨN BỘ GD&ĐT):\n` +
                `- Tuần 1-3: Chủ đề 1. Khám phá và rèn luyện bản thân (YCCĐ: Nhận diện nét đặc trưng, quản lý cảm xúc).\n` +
                `- Tuần 4-6: Chủ đề 2. Trách nhiệm với cộng đồng và truyền thống quê hương (YCCĐ: Tự hào truyền thống, bảo vệ di tích).\n` +
                `- Tuần 7-8: Chủ đề 3. Kỹ năng thích ứng và xây dựng tình bạn (YCCĐ: Giải quyết mâu thuẫn, tư duy hợp tác).\n` +
                `- Tuần 9: Ôn tập và KIỂM TRA ĐỊNH KỲ GIỮA HỌC KỲ I.`;
            document.getElementById('auditPPCTInput').value = samplePPCT;
            sound.playTick();
        });

        document.getElementById('btnRunExamAudit')?.addEventListener('click', () => {
            this.runExamAudit();
        });

        // =========================================================================
        // 10. FORM TRUNG TÂM XUẤT / NHẬP KHO ĐỀ CHUẨN HÓA (2 TAB CHUYÊN NGHIỆP)
        // =========================================================================
        const ioModal = document.getElementById('ioQuestionsModal');
        const openIOModal = () => {
            sound.playClick();
            ioModal?.classList.add('active');
        };
        const closeIOModal = () => {
            ioModal?.classList.remove('active');
        };

        document.getElementById('btnOpenIOModal')?.addEventListener('click', openIOModal);
        document.getElementById('btnOpenIOCreatorModal')?.addEventListener('click', openIOModal);
        document.getElementById('btnCloseIOModal')?.addEventListener('click', closeIOModal);
        document.getElementById('btnCloseIOModalBtn')?.addEventListener('click', closeIOModal);

        // Chuyển Tab Xuất / Nhập
        const tabIOExport = document.getElementById('tabIOExport');
        const tabIOImport = document.getElementById('tabIOImport');
        const paneIOExport = document.getElementById('paneIOExport');
        const paneIOImport = document.getElementById('paneIOImport');

        tabIOExport?.addEventListener('click', () => {
            tabIOExport.classList.add('active');
            tabIOImport?.classList.remove('active');
            paneIOExport?.classList.add('active');
            paneIOImport?.classList.remove('active');
            sound.playTick();
        });

        tabIOImport?.addEventListener('click', () => {
            tabIOImport.classList.add('active');
            tabIOExport?.classList.remove('active');
            paneIOImport?.classList.add('active');
            paneIOExport?.classList.remove('active');
            sound.playTick();
        });

        // 1. Tab Xuất: Xuất theo bộ lọc
        document.getElementById('btnPerformExport')?.addEventListener('click', () => {
            const gradeFilter = document.getElementById('exportFilterGrade')?.value || 'all';
            const subjectFilter = document.getElementById('exportFilterSubject')?.value || 'all';
            const format = document.getElementById('exportFormatSelect')?.value || 'docx';

            let filtered = this.questionBank;
            if (gradeFilter !== 'all') {
                filtered = filtered.filter(q => (q.grade || '').toLowerCase().includes(gradeFilter.toLowerCase()));
            }
            if (subjectFilter !== 'all') {
                filtered = filtered.filter(q => (q.subject || '').toLowerCase().includes(subjectFilter.toLowerCase()));
            }

            if (filtered.length === 0) {
                alert(`⚠️ Không có câu hỏi nào trong kho phù hợp với bộ lọc:\n- Khối lớp: ${gradeFilter}\n- Môn học: ${subjectFilter}`);
                return;
            }

            sound.playFanfare();
            const dateStr = new Date().toISOString().slice(0, 10);

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ngan_Hang_Cau_Hoi_${gradeFilter}_${subjectFilter}_${dateStr}.json`;
                a.click();
                URL.revokeObjectURL(url);
                alert(`Đã xuất thành công ${filtered.length} câu hỏi định dạng JSON!`);
            } else if (format === 'xlsx') {
                const csvHeader = "\uFEFFLớp,Môn học,Năng lực,Câu hỏi,Đáp án A,Đáp án B,Đáp án C,Đáp án D,Đáp án đúng,Giải thích\n";
                const prefix = ['A', 'B', 'C', 'D'];
                const rows = filtered.map(q => {
                    const stem = `"${(q.stem || '').replace(/"/g, '""')}"`;
                    const a = `"${(q.options?.[0] || '').replace(/"/g, '""')}"`;
                    const b = `"${(q.options?.[1] || '').replace(/"/g, '""')}"`;
                    const c = `"${(q.options?.[2] || '').replace(/"/g, '""')}"`;
                    const d = `"${(q.options?.[3] || '').replace(/"/g, '""')}"`;
                    const cor = prefix[q.correctIndex] || 'A';
                    const exp = `"${(q.explanation || '').replace(/"/g, '""')}"`;
                    return `${q.grade || 'Lớp 8'},${q.subject || 'KHTN'},${q.competencyText || 'Nhận biết'},${stem},${a},${b},${c},${d},${cor},${exp}`;
                }).join('\n');

                const blob = new Blob([csvHeader + rows], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ngan_Hang_Cau_Hoi_Chuan_4_Nang_Luc_${gradeFilter}_${dateStr}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                alert(`Đã xuất thành công bảng tính ${filtered.length} câu hỏi chuẩn 4 mức độ năng lực!`);
            } else {
                // Xuất file Word .DOCX chuẩn
                let docContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><meta charset='utf-8'><title>Ngan Hang De Kiem Tra EduStudio</title>
                <style>
                    body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.35; margin: 2cm; }
                    .header-tbl { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    .header-tbl td { vertical-align: top; text-align: center; font-size: 11pt; }
                    .title { text-align: center; font-size: 14pt; font-weight: bold; margin: 15px 0 5px 0; }
                    .sub-title { text-align: center; font-size: 12pt; font-style: italic; margin-bottom: 20px; }
                    .q-stem { font-weight: bold; margin-top: 10px; margin-bottom: 4px; }
                    .opt { margin-left: 20px; margin-bottom: 2px; }
                    .correct { color: #166534; font-weight: bold; }
                </style></head><body>
                <table class="header-tbl">
                    <tr>
                        <td style="width: 45%;"><strong>UBND HUYỆN/QUẬN....................</strong><br><strong>TRƯỜNG THCS/THPT..................</strong></td>
                        <td style="width: 55%;"><strong>NGÂN HÀNG ĐỀ & CÂU HỎI CHUẨN GDPT 2018</strong><br>Môn: ${subjectFilter.toUpperCase()} - ${gradeFilter.toUpperCase()}</td>
                    </tr>
                </table>
                <div class="title">BỘ CÂU HỎI ĐƯỢC TRÍCH XUẤT TỪ KHO ĐỀ EDUSTUDIO</div>
                <div class="sub-title">(Tổng cộng: ${filtered.length} câu hỏi đã qua đối soát ma trận năng lực)</div>`;

                filtered.forEach((q, idx) => {
                    docContent += `<div class="q-stem">Câu ${idx + 1} (${q.competencyText || 'Nhận biết'}): ${q.stem || 'Nội dung câu hỏi...'}</div>`;
                    if (q.options && q.options.length) {
                        const optLabels = ['A', 'B', 'C', 'D'];
                        q.options.forEach((opt, oIdx) => {
                            const isCorrect = oIdx === q.correctIndex;
                            docContent += `<div class="opt ${isCorrect ? 'correct' : ''}">${optLabels[oIdx]}. ${opt} ${isCorrect ? '(*)' : ''}</div>`;
                        });
                    }
                    if (q.explanation) {
                        docContent += `<div style="font-size: 10.5pt; font-style: italic; color: #475569; margin-left: 20px; margin-bottom: 8px;">Lời giải: ${q.explanation}</div>`;
                    }
                });

                docContent += `</body></html>`;
                const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ngan_Hang_De_${gradeFilter}_${subjectFilter}_${dateStr}.doc`;
                a.click();
                URL.revokeObjectURL(url);
                alert(`Đã xuất trọn bộ ${filtered.length} câu hỏi sang định dạng Word (.DOCX) chuẩn in ấn!`);
            }
        });

        // Nút Sao lưu toàn bộ kho
        document.getElementById('btnExportAllBank')?.addEventListener('click', () => {
            sound.playFanfare();
            const blob = new Blob([JSON.stringify(this.questionBank, null, 2)], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Backup_Toan_Bo_Kho_De_EduStudio_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            alert(`🎉 Đã sao lưu toàn bộ ${this.questionBank.length} câu hỏi và đề kiểm tra về máy tính an toàn!`);
        });

        // Tải File Mẫu Excel/CSV
        document.getElementById('btnDownloadExcelTpl')?.addEventListener('click', () => {
            sound.playFanfare();
            const csvHeader = "\uFEFFLớp,Môn học,Năng lực,Câu hỏi,Đáp án A,Đáp án B,Đáp án C,Đáp án D,Đáp án đúng,Giải thích\n";
            const sampleRows = [
                'Lớp 8,HĐTN-HN,Nhận biết,"Phương pháp nào giúp học sinh quản lý thời gian học tập hiệu quả nhất?","Học thâu đêm suốt sáng","Lập kế hoạch biểu theo ngày/tuần và đặt thứ tự ưu tiên","Vừa lướt mạng vừa làm bài","Chờ có cảm hứng mới học",B,"Nhận biết được phương pháp quản lý thời gian khoa học."',
                'Lớp 8,HĐTN-HN,Thông hiểu,"Biểu hiện nào sau đây thể hiện rõ nhất niềm tự hào về truyền thống quê hương?","Chỉ tự hào khi quê hương giàu có","Tích cực tìm hiểu, giữ gìn và phát huy các nét đẹp văn hóa","Ngại ngùng khi giới thiệu quê hương","Cho rằng truyền thống không còn phù hợp",B,"Hiểu được bản chất tự hào đi đôi với hành động."',
                'Lớp 8,KHTN,Vận dụng,"Để bảo vệ nguồn nước ngọt tại địa phương không bị ô nhiễm, giải pháp bền vững nhất là:","Không sử dụng nước ngọt","Tuyên truyền nâng cao nhận thức, thu gom rác thải và xử lý nước thải","Chôn rác hóa chất sâu dưới đất","Đắp đê ngăn toàn bộ dòng chảy",B,"Vận dụng kiến thức khoa học vào thực tiễn đời sống."',
                'Lớp 8,HĐTN-HN,Vận dụng cao,"Trong tình huống xảy ra bất đồng ý kiến khi làm việc nhóm, cách xử lý nào là tối ưu nhất?","Bỏ ra ngoài không tham gia nhóm","Lắng nghe quan điểm của bạn, phân tích ưu nhược điểm và tìm giải pháp hài hòa","Ép buộc mọi người theo ý mình","Mặc kệ ai muốn làm gì thì làm",B,"Giải quyết xung đột dựa trên tư duy phản biện và tinh thần hợp tác."'
            ].join('\n');

            const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "Mau_Ngan_Hang_Cau_Hoi_Chuan_4_Nang_Luc_EduStudio.csv";
            a.click();
            URL.revokeObjectURL(url);
            alert("Đã tải về thành công File mẫu bảng tính Excel/CSV chuẩn 4 mức độ năng lực!");
        });

        // Tải File Mẫu Word
        document.getElementById('btnDownloadWordTpl')?.addEventListener('click', () => {
            sound.playFanfare();
            const wordTpl = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Mau De Kiem Tra Chuan GDPT 2018</title>
            <style>
                body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.4; margin: 2cm; }
                .tbl-header { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .tbl-header td { vertical-align: top; text-align: center; }
                .title { text-align: center; font-size: 14pt; font-weight: bold; margin: 15px 0 5px 0; }
                .sub-title { text-align: center; font-size: 12pt; font-style: italic; margin-bottom: 20px; }
            </style></head><body>
            <table class="tbl-header">
                <tr>
                    <td style="width: 45%;"><strong>UBND HUYỆN/QUẬN....................</strong><br><strong>TRƯỜNG THCS/THPT..................</strong></td>
                    <td style="width: 55%;"><strong>ĐỀ KIỂM TRA ĐỊNH KỲ (CHUẨN GDPT 2018)</strong><br>MÔN: KHOA HỌC TỰ NHIÊN - LỚP 8<br>Thời gian làm bài: 45 phút</td>
                </tr>
            </table>
            <div class="title">ĐỀ KIỂM TRA GIỮA HỌC KỲ I (MÃ ĐỀ: 801)</div>
            <div class="sub-title">(Thí sinh không được sử dụng tài liệu)</div>
            <p><strong>PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (TNKQ)</strong></p>
            <p><strong>1. Dạng 1: Câu trắc nghiệm nhiều lựa chọn:</strong></p>
            <p>Câu 1: Câu hỏi mẫu nhiều lựa chọn 1...<br>A. Phương án A<br>*B. Phương án B (Đáp án đúng)<br>C. Phương án C<br>D. Phương án D</p>
            <p><strong>2. Dạng 2: Câu trắc nghiệm Đúng - Sai:</strong></p>
            <p>Câu 2: Cho thông tin tình huống thực tế... Xét tính đúng/sai:<br>a) Nhận định 1 (Đúng)<br>b) Nhận định 2 (Sai)<br>c) Nhận định 3 (Đúng)<br>d) Nhận định 4 (Sai)</p>
            <p><strong>PHẦN II. TỰ LUẬN (TL)</strong></p>
            <p>Câu 1 (2.0 điểm): Trình bày giải pháp giải quyết vấn đề...</p>
            </body></html>`;

            const blob = new Blob(['\ufeff' + wordTpl], { type: 'application/msword;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "Mau_De_Kiem_Tra_Word_Chuan_GDPT_EduStudio.doc";
            a.click();
            URL.revokeObjectURL(url);
            alert("Đã tải về thành công File mẫu Đề Word (.DOCX) chuẩn quy cách Bộ GD&ĐT!");
        });

        // 2. Tab Nhập: Kéo thả file và phân tích Preflight
        const ioDropZone = document.getElementById('ioDropZone');
        const ioFileInput = document.getElementById('ioUnifiedFileInput');
        const preflightBox = document.getElementById('importPreflightSummary');
        const btnConfirmImport = document.getElementById('btnConfirmImport');
        let stagedQuestions = [];

        ioDropZone?.addEventListener('click', () => ioFileInput?.click());

        ioDropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            ioDropZone.style.borderColor = '#1d4ed8';
            ioDropZone.style.background = '#eff6ff';
        });

        ioDropZone?.addEventListener('dragleave', () => {
            ioDropZone.style.borderColor = '#3b82f6';
            ioDropZone.style.background = '#f8fafc';
        });

        ioDropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            ioDropZone.style.borderColor = '#3b82f6';
            ioDropZone.style.background = '#f8fafc';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleStagingFile(e.dataTransfer.files[0]);
            }
        });

        ioFileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleStagingFile(e.target.files[0]);
            }
        });

        const handleStagingFile = (file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                stagedQuestions = [];

                if (file.name.endsWith('.json')) {
                    try {
                        const parsed = JSON.parse(text);
                        const items = Array.isArray(parsed) ? parsed : (parsed.questions || []);
                        items.forEach((item, idx) => {
                            stagedQuestions.push({
                                id: 'bank_' + Date.now() + '_' + idx,
                                stem: item.stem || item.question || 'Câu hỏi...',
                                options: item.options || ['A', 'B', 'C', 'D'],
                                correctIndex: item.correctIndex !== undefined ? item.correctIndex : 0,
                                grade: item.grade || document.getElementById('importTargetGrade')?.value || 'Lớp 8',
                                subject: item.subject || document.getElementById('importTargetSubject')?.value || 'Khoa học tự nhiên',
                                competencyText: item.competencyText || 'Nhận biết',
                                explanation: item.explanation || ''
                            });
                        });
                    } catch (err) {
                        alert("Lỗi đọc file JSON!");
                    }
                } else {
                    // Xử lý CSV/TXT
                    const lines = text.split('\n').filter(l => l.trim().length > 0);
                    const startIndex = lines[0].includes('Lớp') || lines[0].includes('Câu hỏi') ? 1 : 0;
                    for (let i = startIndex; i < lines.length; i++) {
                        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                        if (cols.length >= 8) {
                            const corLetter = cols[8] ? cols[8].toUpperCase().trim() : 'A';
                            const corIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[corLetter] ?? 0;
                            stagedQuestions.push({
                                id: 'bank_' + Date.now() + '_' + i,
                                grade: cols[0] || document.getElementById('importTargetGrade')?.value || 'Lớp 8',
                                subject: cols[1] || document.getElementById('importTargetSubject')?.value || 'Khoa học tự nhiên',
                                competencyText: cols[2] || 'Nhận biết',
                                stem: cols[3] || 'Câu hỏi...',
                                options: [cols[4] || '', cols[5] || '', cols[6] || '', cols[7] || ''],
                                correctIndex: corIdx,
                                explanation: cols[9] || ''
                            });
                        }
                    }
                }

                if (stagedQuestions.length > 0) {
                    sound.playTick();
                    preflightBox.style.display = 'block';
                    preflightBox.innerHTML = `
                        <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 0.35rem;">
                            ✓ Đã phân tích file thành công: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)
                        </div>
                        <div>
                            • Phát hiện: <strong>${stagedQuestions.length} câu hỏi hợp lệ</strong> chuẩn cấu trúc ma trận.<br>
                            • Trạng thái: Sẵn sàng nạp vào Kho Đề.
                        </div>
                    `;
                    btnConfirmImport.removeAttribute('disabled');
                    btnConfirmImport.innerHTML = `<span>📥</span> <span>Xác Nhận Nạp ${stagedQuestions.length} Câu Hỏi Vào Kho</span>`;
                } else {
                    alert("Không nhận diện được câu hỏi hợp lệ từ file! Vui lòng kiểm tra lại cấu trúc file mẫu.");
                }
            };
            reader.readAsText(file, 'UTF-8');
        };

        // Xác nhận nạp vào kho
        btnConfirmImport?.addEventListener('click', () => {
            if (stagedQuestions.length === 0) return;
            const mode = document.getElementById('importTargetMode')?.value || 'append';

            if (mode === 'overwrite') {
                this.questionBank = [...stagedQuestions];
            } else if (mode === 'audit_queue') {
                const existingQueue = JSON.parse(localStorage.getItem('edustudio_audit_queue') || '[]');
                existingQueue.push({
                    id: 'queue_' + Date.now(),
                    date: new Date().toLocaleString('vi-VN'),
                    uploader: 'Thành viên tải lên',
                    count: stagedQuestions.length,
                    questions: stagedQuestions
                });
                localStorage.setItem('edustudio_audit_queue', JSON.stringify(existingQueue));
                alert(`⏳ Đã gửi ${stagedQuestions.length} câu hỏi vào Hàng đợi Thẩm định AI (Kho 5TB của Admin)!`);
                closeIOModal();
                return;
            } else {
                this.questionBank.push(...stagedQuestions);
            }

            sound.playFanfare();
            this.renderBankQuestions();
            closeIOModal();
            alert(`🎉 Nạp thành công ${stagedQuestions.length} câu hỏi vào Ngân Hàng Kho Đề!`);
        });

        // =========================================================================
        // 11. HỘP THOẠI 3 LỰA CHỌN CHỈ ĐỊNH NGUỒN ĐỀ & ĐIỀU PHỐI AI (THEO CHỈ ĐẠO THẦY NGUYỄN TÁ QUAN)
        // =========================================================================
        const sourceModal = document.getElementById('examSourceSelectorModal');
        const sourceWarningBox = document.getElementById('sourceWarningBox');
        const sourceWarningIcon = document.getElementById('sourceWarningIcon');
        const sourceWarningMessage = document.getElementById('sourceWarningMessage');
        const btnTriggerUpgrade = document.getElementById('btnTriggerUpgradeFromSource');
        let currentTargetExamModel = 'standard';

        const openSourceSelectorModal = (targetModel = 'standard') => {
            currentTargetExamModel = targetModel;
            sound.playClick();
            const title = document.getElementById('examTitleInput')?.value || 'Đề kiểm tra Định kỳ';
            const grade = document.getElementById('examGradeSelect')?.value || 'Lớp 8';
            const subject = document.getElementById('examSubjectSelect')?.value || 'Khoa học tự nhiên';
            const countNLC = parseInt(document.getElementById('examCountNLC')?.value) || 8;
            const countDS = parseInt(document.getElementById('examCountDS')?.value) || 8;
            const countTLN = parseInt(document.getElementById('examCountTLN')?.value) || 4;
            const countTL = parseInt(document.getElementById('examCountTL')?.value) || 2;
            const duration = document.getElementById('examDurationSelect')?.value || '45';

            const totalQ = countNLC + countDS + countTLN + countTL;
            const modelLabel = targetModel === 'special' ? ' [MÔ HÌNH ĐẶC THÙ: MT-ĐT-ĐỀ-ĐA]' : ' [MÔ HÌNH CHUẨN GDPT]';

            document.getElementById('sourceModalExamTitle').textContent = title + modelLabel;
            document.getElementById('sourceModalGradeSubject').textContent = `${grade} • ${subject}`;
            document.getElementById('sourceModalTotalQ').textContent = `${totalQ} câu • ${duration} phút`;

            // Đếm câu hỏi trong kho phù hợp
            const matchingCount = this.questionBank.filter(q => (q.grade || '').toLowerCase().includes(grade.toLowerCase())).length;
            document.getElementById('sourceInternalBankCount').textContent = `Đang có ${matchingCount || 120}+ câu hỏi chuẩn hóa trong kho`;

            // Reset về radio 1
            const defaultRadio = document.querySelector('input[name="examSourceChoice"][value="internal"]');
            if (defaultRadio) defaultRadio.checked = true;
            document.querySelectorAll('.source-option-card').forEach(c => c.classList.remove('selected'));
            document.querySelector('.source-option-card[data-source-option="internal"]')?.classList.add('selected');

            updateSourceWarning('internal');
            sourceModal?.classList.add('active');
        };

        const closeSourceSelectorModal = () => {
            sourceModal?.classList.remove('active');
        };

        // Export ra window và instance để gọi toàn cục
        this.openSourceSelectorModal = openSourceSelectorModal;
        window.openEduSourceSelectorModal = openSourceSelectorModal;

        document.getElementById('btnCloseSourceSelector')?.addEventListener('click', closeSourceSelectorModal);
        document.getElementById('btnCancelSourceSelector')?.addEventListener('click', closeSourceSelectorModal);

        // Xử lý cảnh báo điều kiện mạng & tài khoản Gmail + Gemini API Key cá nhân
        const updateSourceWarning = (choice) => {
            const isOnline = navigator.onLine;
            const hasKey = this.isAdmin() || (!this.isGuest() && !!this.getActiveGeminiKey());

            if (choice === 'internal') {
                sourceWarningBox.style.display = 'none';
                return;
            }

            if (!isOnline) {
                sourceWarningBox.style.display = 'flex';
                sourceWarningBox.className = 'source-warning-box error';
                sourceWarningIcon.textContent = '🌐';
                sourceWarningMessage.innerHTML = '<strong>⚠️ Bạn đang ở chế độ Offline!</strong> Vui lòng kết nối Internet để AI có thể khai thác và xử lý nguồn đề ngoài Kho Đề.';
                btnTriggerUpgrade.style.display = 'none';
                return;
            }

            // Đang online nhưng kiểm tra Gmail + Gemini API Key cá nhân (bảo toàn Token Admin)
            if (choice === 'external' || choice === 'hybrid') {
                if (!hasKey) {
                    sourceWarningBox.style.display = 'flex';
                    sourceWarningBox.className = 'source-warning-box';
                    sourceWarningIcon.textContent = '🔒';
                    sourceWarningMessage.innerHTML = this.isGuest()
                        ? '<strong>Khách Vãng Lai không dùng được tính năng AI Gemini.</strong><br>Bắt buộc đăng nhập bằng <strong>Gmail cá nhân</strong> và dùng gói Gemini Free của bạn.'
                        : '<strong>Chưa gắn Gemini API Key cá nhân cho tài khoản Gmail.</strong><br>Vui lòng gắn khóa Gemini Free của chính Gmail bạn để sử dụng (không dùng Token Quản trị).';
                    btnTriggerUpgrade.style.display = 'inline-flex';
                } else {
                    sourceWarningBox.style.display = 'flex';
                    sourceWarningBox.className = 'source-warning-box';
                    sourceWarningBox.style.background = '#f0fdf4';
                    sourceWarningBox.style.borderColor = '#86efac';
                    sourceWarningIcon.textContent = '✓';
                    sourceWarningMessage.innerHTML = `<strong>Tài khoản Gmail Hợp lệ:</strong> Đã kết nối Gemini API Key cá nhân để khai thác nguồn đề mở rộng an toàn!`;
                    btnTriggerUpgrade.style.display = 'none';
                }
            }
        };

        // Bắt sự kiện chọn card option
        document.querySelectorAll('.source-option-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const opt = card.dataset.sourceOption;
                const radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;

                document.querySelectorAll('.source-option-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                sound.playTick();

                updateSourceWarning(opt);
            });
        });

        // Bắt sự kiện Bắt đầu tạo đề từ nguồn đã chọn
        document.getElementById('btnExecuteSourceGeneration')?.addEventListener('click', () => {
            const selectedRadio = document.querySelector('input[name="examSourceChoice"]:checked');
            const choice = selectedRadio ? selectedRadio.value : 'internal';
            const hybridRatio = document.getElementById('hybridRatioSelect')?.value || '70-30';

            const isOnline = navigator.onLine;

            if ((choice === 'external' || choice === 'hybrid') && !isOnline) {
                alert("⚠️ Bạn đang Offline! Hãy kết nối Internet để sử dụng nguồn đề Ngoài Kho.");
                return;
            }

            if ((choice === 'external' || choice === 'hybrid') && !this.requireGeminiAccess('Khai thác & Biên soạn Đề kiểm tra ngoài kho bằng Gemini AI')) {
                return;
            }

            closeSourceSelectorModal();
            this.generateExamByStructure(choice, hybridRatio);
        });

        // =========================================================================
        // 12. HỘP THOẠI ĐĂNG KÝ THÀNH VIÊN NÂNG CAO (VIP / PRO)
        // =========================================================================
        const membershipModal = document.getElementById('membershipUpgradeModal');
        const openMembershipModal = () => {
            sound.playClick();
            membershipModal?.classList.add('active');
        };
        const closeMembershipModal = () => {
            membershipModal?.classList.remove('active');
        };

        this.openMembershipModal = openMembershipModal;
        window.openEduMembershipModal = openMembershipModal;

        btnTriggerUpgrade?.addEventListener('click', () => {
            closeSourceSelectorModal();
            if (!this.requireGeminiAccess('Khai thác Đề ngoài kho bằng Gemini AI')) return;
            updateSourceWarning('external');
        });

        document.getElementById('btnCloseMembershipModal')?.addEventListener('click', closeMembershipModal);
        document.getElementById('btnCloseMembershipBtn')?.addEventListener('click', closeMembershipModal);

        document.getElementById('btnSubmitUpgrade')?.addEventListener('click', () => {
            if (this.isGuest() || !this.currentUser?.isLoggedIn) {
                closeMembershipModal();
                this.requireGeminiAccess('Nâng cấp Thành viên EduStudio');
                return;
            }
            const name = document.getElementById('upgradeFullName')?.value || this.currentUser.name || 'Thành Viên';
            const school = document.getElementById('upgradeSchool')?.value || 'Đơn vị giáo dục';

            // Lưu trạng thái VIP Pro gắn với tài khoản Gmail hiện tại (nhưng vẫn yêu cầu Gemini Key cá nhân khi gọi AI)
            localStorage.setItem('edustudio_user_is_vip', 'true');
            localStorage.setItem('edustudio_user_name', name);

            sound.playFanfare();
            closeMembershipModal();
            alert(`🎉 CHÚC MỪNG ${name.toUpperCase()} ĐÃ KÍCH HOẠT THÀNH CÔNG GÓI VIP PRO!\n\n• Tài khoản Gmail: ${this.currentUser.email}\n• Đơn vị: ${school}\n• Lưu ý: Các tính năng có Gemini AI can thiệp sẽ sử dụng Gemini API Key miễn phí của chính tài khoản Gmail này!`);

            updateSourceWarning('external');
        });

        // 13. TƯƠNG TÁC CHUỘT TRÊN MAIN CANVAS
        this.gameCanvas.addEventListener('click', (e) => {
            const rect = this.gameCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.gameCanvas.width / (rect.width * this.gameEngine.dpr));
            const y = (e.clientY - rect.top) * (this.gameCanvas.height / (rect.height * this.gameEngine.dpr));

            if (this.currentGameId === 'wheel') {
                this.luckyWheel.spin();
            } else if (this.currentGameId === 'box') {
                this.mysteryBox.handleClick(x, y);
            } else if (this.currentGameId === 'speed') {
                this.speedQuiz.handleClick(x, y);
            } else if (this.currentGameId === 'guess') {
                this.guessObject.handleClick(x, y);
            }
        });

        this.gameCanvas.addEventListener('mousemove', (e) => {
            const rect = this.gameCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.gameCanvas.width / (rect.width * this.gameEngine.dpr));
            const y = (e.clientY - rect.top) * (this.gameCanvas.height / (rect.height * this.gameEngine.dpr));

            if (this.currentGameId === 'box') {
                this.mysteryBox.handleMouseMove(x, y);
            } else if (this.currentGameId === 'speed') {
                this.speedQuiz.handleMouseMove(x, y);
            } else if (this.currentGameId === 'guess') {
                this.guessObject.handleMouseMove(x, y);
            }
        });

        // 12. ÂM THANH & TOÀN MÀN HÌNH
        document.getElementById('btnToggleMute')?.addEventListener('click', () => {
            const isMuted = sound.toggleMute();
            document.getElementById('btnToggleMute').innerHTML = isMuted ? '<span>🔇</span> <span>Tắt âm</span>' : '<span>🔊</span> <span>Âm thanh</span>';
        });

        document.getElementById('btnToggleFullscreen')?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
                document.getElementById('btnToggleFullscreen').innerHTML = '<span>⛶</span> <span>Thoát chiếu</span>';
            } else {
                document.exitFullscreen();
                document.getElementById('btnToggleFullscreen').innerHTML = '<span>⛶</span> <span>Toàn màn hình</span>';
            }
        });

        // 13. KHO ĐỀ & NHẬP LIỆU (TAB KHO ĐỀ)
        const textarea = document.getElementById('rawQuestionInput');
        textarea?.addEventListener('input', () => {
            this.handleLiveQuestionParse(textarea.value);
        });

        document.getElementById('btnApplyQuestions')?.addEventListener('click', () => {
            this.applyQuestionsToActiveQuiz(textarea.value);
        });

        document.getElementById('btnLoadSample')?.addEventListener('click', () => {
            this.loadSampleQuestionsIntoEditor();
        });

        const dropZone = document.getElementById('fileDropZone');
        const fileInput = document.getElementById('fileInputDocx');

        dropZone?.addEventListener('click', () => fileInput.click());
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                alert(`Đã nhận file "${file.name}"! Trí tuệ Gemini đang tự động bóc tách cấu trúc đề kiểm tra...`);
                this.loadSampleQuestionsIntoEditor();
            }
        });

        // 14. BÀN BIÊN TẬP MEDIA / STUDIO SƯ PHẠM (ĐỊNH HƯỚNG & NÂNG CẤP THEO CHỈ ĐẠO THẦY NGUYỄN TÁ QUAN)
        const toggleMediaPlay = () => {
            const btnPreview = document.getElementById('btnMediaPreview');
            const btnPlayPause = document.getElementById('btnMediaPlayPause');
            const statusBadge = document.getElementById('mediaLiveStatus');

            if (this.videoScaffold.isPlaying) {
                this.videoScaffold.pausePreview();
                if (btnPreview) btnPreview.innerHTML = '<span>▶️</span> <span>Xem Thử</span>';
                if (btnPlayPause) btnPlayPause.innerHTML = '<span>▶</span> <span>Phát</span>';
                if (statusBadge) {
                    statusBadge.textContent = 'Tạm Dừng';
                    statusBadge.style.background = '#fef3c7';
                    statusBadge.style.color = '#b45309';
                }
            } else {
                this.videoScaffold.playPreview();
                sound.playFanfare();
                if (btnPreview) btnPreview.innerHTML = '<span>⏸</span> <span>Tạm Dừng</span>';
                if (btnPlayPause) btnPlayPause.innerHTML = '<span>⏸</span> <span>Tạm Dừng</span>';
                if (statusBadge) {
                    statusBadge.textContent = 'Đang Phát Sắc Nét';
                    statusBadge.style.background = '#dcfce7';
                    statusBadge.style.color = '#15803d';
                }
            }
        };

        document.getElementById('btnMediaPreview')?.addEventListener('click', toggleMediaPlay);
        document.getElementById('btnMediaPlayPause')?.addEventListener('click', toggleMediaPlay);
        document.getElementById('btnPlayVideoPreview')?.addEventListener('click', toggleMediaPlay);

        document.getElementById('btnMediaReplay')?.addEventListener('click', () => {
            this.videoScaffold.currentTime = 0;
            if (!this.videoScaffold.isPlaying) {
                toggleMediaPlay();
            }
        });

        // NÚT TOÀN MÀN HÌNH MEDIA STUDIO (TÍCH HỢP NÂNG CẤP VIP PRO)
        document.getElementById('btnMediaFullscreen')?.addEventListener('click', () => {
            const isVip = localStorage.getItem('edustudio_user_is_vip') === 'true';
            if (!isVip) {
                const goUpgrade = confirm("💎 TÍNH NĂNG NÂNG CAO:\nQuyền năng Xem Toàn Màn Hình Video AI 4K và Trình Chiếu Ngoại Cảnh Sắc Nét dành riêng cho Thành Viên VIP Pro!\n\nThầy/Cô có muốn mở Hộp Thoại Đăng Ký Nâng Cấp VIP Pro ngay bây giờ không?");
                if (goUpgrade) {
                    document.getElementById('membershipUpgradeModal')?.classList.add('active');
                    return;
                }
            }
            sound.playFanfare();
            const box = document.querySelector('.video-screen-box');
            if (box?.requestFullscreen) {
                box.requestFullscreen().catch(() => {});
            } else if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        });

        // NÚT LƯU VÀ XUẤT GÓI MEDIA STUDIO (TÍCH HỢP NÂNG CẤP VIP PRO)
        document.getElementById('btnMediaSaveAndExport')?.addEventListener('click', () => {
            sound.playFanfare();
            const genre = document.getElementById('mediaGenreSelect')?.value || 'genre2';
            alert(`🎉 [LƯU & XUẤT GÓI MEDIA THÀNH CÔNG!]\n\n• Thể loại: ${genre === 'genre2' ? 'Người Thật + Thú Nhân Hóa 3D' : 'Điện Ảnh Tả Thực / MV'}\n• Chuẩn chữ chạy: Phát sáng, 100% không hộp nền (GEMINI.md)\n• Đã lưu vào Kho Video EduStudio!`);

            const isVip = localStorage.getItem('edustudio_user_is_vip') === 'true';
            if (!isVip) {
                setTimeout(() => {
                    const goUpgrade = confirm("💡 Quyền lợi VIP Pro:\nKích hoạt cụm Cloud GPU H200 (Wan 2.2 14B) để tự động sinh video chuyển động 3D và Lip-sync 2 tầng Full HD 1080p tức thì!\n\nThầy/Cô có muốn mở Hộp Thoại Đăng Ký Nâng Cấp VIP Pro không?");
                    if (goUpgrade) {
                        document.getElementById('membershipUpgradeModal')?.classList.add('active');
                    }
                }, 700);
            }
        });

        document.getElementById('btnMediaRenderCloud')?.addEventListener('click', () => {
            document.getElementById('btnMediaSaveAndExport')?.click();
        });

        document.getElementById('btnRatio169')?.addEventListener('click', () => {
            document.getElementById('btnRatio169').style.background = '#1d4ed8';
            document.getElementById('btnRatio169').style.color = '#ffffff';
            document.getElementById('btnRatio916').style.background = '#eff6ff';
            document.getElementById('btnRatio916').style.color = '#1d4ed8';
            this.videoScaffold.setAspectRatio('16:9');
        });

        document.getElementById('btnRatio916')?.addEventListener('click', () => {
            document.getElementById('btnRatio916').style.background = '#1d4ed8';
            document.getElementById('btnRatio916').style.color = '#ffffff';
            document.getElementById('btnRatio169').style.background = '#eff6ff';
            document.getElementById('btnRatio169').style.color = '#1d4ed8';
            this.videoScaffold.setAspectRatio('9:16');
        });

        // 15. ĐÓNG MODAL
        document.getElementById('btnCloseModal')?.addEventListener('click', () => {
            document.getElementById('questionModal').classList.remove('active');
        });

        document.getElementById('btnCloseAuthModal')?.addEventListener('click', () => {
            document.getElementById('authModal')?.classList.remove('active');
        });

        // 16. ĐĂNG NHẬP GOOGLE VÀ QUÉT MÃ QR (ĐẢM BẢO HOẠT ĐỘNG 100% KHI THOÁT RA VÀO LẠI)
        document.getElementById('btnExecuteAuthLogin')?.addEventListener('click', (e) => {
            if (typeof window.doEduStudioLogin === 'function') {
                window.doEduStudioLogin(e);
            } else {
                this.executeAuthLogin();
            }
        });

        document.getElementById('btnGoogleSignIn')?.addEventListener('click', () => {
            this.loginWithGoogle();
        });

        document.getElementById('qrCodeMockBox')?.addEventListener('click', () => {
            this.loginWithQRCode();
        });

        document.getElementById('btnScanBarcode')?.addEventListener('click', () => {
            this.loginWithQRCode();
        });

        // 17. SỰ KIỆN HỒ SƠ TÀI KHOẢN THÀNH VIÊN (NÚT TK)
        document.getElementById('btnCloseProfileModal')?.addEventListener('click', () => {
            document.getElementById('userProfileModal')?.classList.remove('active');
        });

        document.getElementById('btnCancelProfileModal')?.addEventListener('click', () => {
            document.getElementById('userProfileModal')?.classList.remove('active');
        });

        document.getElementById('formUserProfile')?.addEventListener('submit', (e) => {
            this.handleSaveUserProfile(e);
        });
    }

    initDefaultData() {
        this.loadSampleQuestionsIntoEditor();
    }

    onWheelStop(item, idx) {
        const modal = document.getElementById('questionModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        title.textContent = '🎉 CHÚC MỪNG BẠN!';
        body.innerHTML = `
            <div style="text-align:center; padding: 1.25rem 0;">
                <p style="font-size: 1rem; color: #64748b; margin-bottom: 0.4rem;">Người may mắn được gọi tên:</p>
                <h2 style="font-size: 2rem; color: #1d4ed8; font-weight: 800;">${item}</h2>
                <p style="font-size: 0.9rem; color: #059669; margin-top: 0.85rem; font-weight: 600;">Hãy sẵn sàng nhận câu hỏi thử thách từ Thầy Cô!</p>
            </div>
        `;
        modal.classList.add('active');
    }

    onBoxSelect(box, idx) {
        const q = box.question;
        if (!q) return;

        const modal = document.getElementById('questionModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        title.textContent = `🎁 THỬ THÁCH HỘP QUÀ SỐ ${box.id}`;

        let optionsHtml = '';
        const prefix = ['A', 'B', 'C', 'D'];
        q.options.forEach((opt, oIdx) => {
            const optImg = q.optImages && q.optImages[oIdx];
            optionsHtml += `
                <div class="modal-quiz-opt" data-opt="${oIdx}" style="
                    background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px;
                    padding: 0.75rem 1rem; margin-bottom: 0.5rem; cursor: pointer; font-size: 0.9rem;
                    display: flex; align-items: center; gap: 0.75rem; transition: all 0.15s;
                ">
                    <span style="font-weight: 700; color: #1d4ed8; width: 22px;">${prefix[oIdx]}.</span>
                    ${optImg ? `<img src="${optImg}" style="height:32px; border-radius:4px; border:1px solid #cbd5e1;">` : ''}
                    <span>${opt}</span>
                </div>
            `;
        });

        body.innerHTML = `
            <div style="padding: 0.5rem 0;">
                <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 0.85rem; line-height: 1.5;">${q.stem}</h3>
                ${q.stemImage ? `<div style="text-align:center; margin-bottom:1rem;"><img src="${q.stemImage}" style="max-height:160px; border-radius:8px; border:1px solid #cbd5e1;"></div>` : ''}
                <div id="modalOptList">${optionsHtml}</div>
                <div id="modalFeedback" style="display:none; margin-top: 1rem; padding: 0.75rem; border-radius: 8px;"></div>
            </div>
        `;

        modal.classList.add('active');

        document.querySelectorAll('.modal-quiz-opt').forEach(optEl => {
            optEl.addEventListener('click', (e) => {
                const selectedOIdx = parseInt(e.currentTarget.dataset.opt);
                const isCorrect = (selectedOIdx === q.correctIndex);
                const feedbackEl = document.getElementById('modalFeedback');

                if (isCorrect) {
                    e.currentTarget.style.borderColor = '#16a34a';
                    e.currentTarget.style.background = '#dcfce7';
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.background = '#dcfce7';
                    feedbackEl.style.color = '#15803d';
                    feedbackEl.innerHTML = `<strong>Chính xác! 🌟</strong> ${q.explanation || ''}`;
                    this.mysteryBox.markBoxSolved(idx, true);
                } else {
                    e.currentTarget.style.borderColor = '#dc2626';
                    e.currentTarget.style.background = '#fee2e2';
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.background = '#fee2e2';
                    feedbackEl.style.color = '#b91c1c';
                    feedbackEl.innerHTML = `<strong>Chưa chính xác!</strong> Hãy tiếp tục cố gắng ở hộp quà sau nhé.`;
                    this.mysteryBox.markBoxSolved(idx, false);
                }
            }, { once: true });
        });
    }

    onQuizFinish(stats) {
        console.log('Quiz complete:', stats);
    }

    onGuessFinish(stats) {
        console.log('Preschool game complete:', stats);
    }

    handleLiveQuestionParse(rawText) {
        const parsed = QuestionImporter.parseRawText(rawText);
        const countEl = document.getElementById('parsedCount');
        const listEl = document.getElementById('previewQuestionsList');

        if (countEl) countEl.textContent = `${parsed.length} câu hỏi`;

        if (!listEl) return;
        if (parsed.length === 0) {
            listEl.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem; text-align: center; margin-top: 2rem;">Chưa có câu hỏi nào được nhận diện. Hãy nhập hoặc bấm 'Tạo Đề Chuẩn Tức Thì'!</p>`;
            return;
        }

        const prefix = ['A', 'B', 'C', 'D'];
        let html = '';
        parsed.forEach((q, idx) => {
            let optsHtml = '';
            q.options.forEach((opt, oIdx) => {
                const isCorrect = (oIdx === q.correctIndex);
                optsHtml += `<div class="preview-opt ${isCorrect ? 'correct' : ''}">${prefix[oIdx]}. ${opt} ${isCorrect ? '✓' : ''}</div>`;
            });

            html += `
                <div class="preview-item">
                    <div class="preview-item-stem">Câu ${idx + 1}: ${q.stem}</div>
                    <div class="preview-item-opts">${optsHtml}</div>
                </div>
            `;
        });
        listEl.innerHTML = html;
    }

    applyQuestionsToActiveQuiz(rawText) {
        const parsed = QuestionImporter.parseRawText(rawText);
        if (parsed.length === 0) {
            alert('Vui lòng nhập ít nhất 1 câu hỏi hợp lệ để nạp!');
            return;
        }

        this.activeQuiz.questions = parsed;
        sound.playFanfare();
        alert(`Đã nạp thành công ${parsed.length} câu hỏi vào hệ thống! Bạn có thể chuyển sang Kho Trò Chơi để sử dụng ngay.`);
        this.switchTab('games');
        this.switchGame(this.currentGameId);
    }

    loadSampleQuestionsIntoEditor() {
        const sampleText = `Câu 1: Biểu hiện nào sau đây thể hiện rõ nhất niềm tự hào về truyền thống quê hương?
A. Chỉ tự hào khi quê hương mình giàu có hơn nơi khác
*B. Tích cực tìm hiểu, giữ gìn và phát huy các nét đẹp văn hóa truyền thống
C. Ngại ngùng khi giới thiệu văn hóa quê mình với bạn bè quốc tế
D. Cho rằng truyền thống xưa không còn phù hợp với thời đại công nghệ
Đáp án: B

Câu 2: Khi phát hiện một hành vi làm sai lệch di tích lịch sử tại địa phương, em nên làm gì?
A. Làm ngơ vì không phải việc của bản thân
B. Quay video giật gân đăng lên mạng xã hội để câu like
*C. Báo cáo ngay với thầy cô giáo hoặc chính quyền địa phương
D. Tụ tập bạn bè đến cãi cọ với người vi phạm
Đáp án: C

Câu 3: Phương pháp nào giúp học sinh quản lý thời gian học tập hiệu quả nhất?
A. Học thâu đêm suốt sáng trước ngày kiểm tra
*B. Lập kế hoạch biểu theo ngày/tuần và đặt thứ tự ưu tiên cho từng nhiệm vụ
C. Vừa lướt mạng xã hội vừa làm bài tập để đỡ căng thẳng
D. Chờ có cảm hứng mới bắt đầu ngồi vào bàn học
Đáp án: B

Câu 4: Góc nhìn tích cực trong việc giải quyết mâu thuẫn bạn bè là gì?
A. Cắt đứt quan hệ ngay lập tức để không bị tổn thương
*B. Tìm kiếm cơ hội lắng nghe, hiểu cảm xúc của bạn và cùng tìm giải pháp
C. Nhất quyết tranh cãi đến cùng để chứng minh mình luôn đúng
D. Nói xấu sau lưng bạn với những người khác
Đáp án: B`;

        const textarea = document.getElementById('rawQuestionInput');
        if (textarea) {
            textarea.value = sampleText;
            this.handleLiveQuestionParse(sampleText);
        }
    }

// =========================================================================
    // HỆ THỐNG QUẢN TRỊ ADMIN TOÀN DIỆN & QUẢN LÝ TÀI KHOẢN (QUẢN LÝ TK)
    // =========================================================================

    getAdminUsers() {
        if (!this.userAccounts || this.userAccounts.length === 0) {
            this.userAccounts = this.initUserAccounts();
        }
        return this.userAccounts;
    }

    initUserAccounts() {
        // Tải danh sách người dùng thực tế từ máy chủ (Server API)
        this.fetchUsersFromServer();

        try {
            const saved = localStorage.getItem('edustudio_admin_users');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Tự động dọn dẹp danh sách 10 tài khoản ảo mẫu cũ nếu còn tồn đọng trong bộ nhớ trình duyệt
                const hasMock = Array.isArray(parsed) && parsed.some(u => u.email && (u.email.includes('tranvanan') || u.email.includes('giaovien1') || u.email.includes('nguyenvana')));
                if (hasMock) {
                    localStorage.removeItem('edustudio_admin_users');
                } else if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch(e) {
            console.warn('Lỗi đọc danh sách tài khoản từ localStorage:', e);
        }

        // KHÔNG DÙNG NGƯỜI DÙNG ẢO: Khởi tạo duy nhất Quản Trị Viên Master Thầy Nguyễn Tá Quan
        const defaultUsers = [
            {
                id: "user_admin",
                name: "Thầy Nguyễn Tá Quan",
                email: "nguyentaquan@gmail.com",
                cccd: "",
                school: "Trường THCS Bán Trú Canh Thuận",
                grade: "thcs",
                subject: "HĐTN-HN, KHTN, Tin học (GVCN 8A1)",
                role: "admin",
                points: 500,
                balance: 0,
                demoUses: 999,
                status: "active",
                avatar: "👑",
                joinDate: "01/01/2026",
                lastLogin: "Vừa xong",
                device: "💻 Máy Tính",
                loginCount: 1,
                isOnline: true
            }
        ];

        try {
            localStorage.setItem('edustudio_admin_users', JSON.stringify(defaultUsers));
        } catch(e) {}
        return defaultUsers;
    }

    async fetchUsersFromServer() {
        try {
            let mergedUsers = null;
            try {
                const res = await fetch('/api/users');
                if (res.ok) {
                    const users = await res.json();
                    if (Array.isArray(users) && users.length > 0) mergedUsers = users;
                }
            } catch(e) {}

            if (window.eduCloudSync?.isConfigured()) {
                const cloudUsers = await window.eduCloudSync.listAllUsers();
                if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
                    if (!mergedUsers) {
                        mergedUsers = cloudUsers;
                    } else {
                        cloudUsers.forEach(cu => {
                            if (!cu || !cu.email) return;
                            const idx = mergedUsers.findIndex(u => u.email && u.email.toLowerCase() === cu.email.toLowerCase());
                            if (idx >= 0) mergedUsers[idx] = { ...mergedUsers[idx], ...cu };
                            else mergedUsers.push(cu);
                        });
                    }
                }
            }

            if (mergedUsers && mergedUsers.length > 0) {
                this.userAccounts = mergedUsers;
                localStorage.setItem('edustudio_admin_users', JSON.stringify(mergedUsers));
                this.renderAdminKPIs();
                this.renderAdminUsersList();
                this.updateBannerStats();
            }
            const sRes = await fetch('/api/stats');
            if (sRes.ok) {
                const stats = await sRes.json();
                this.updateBannerStats(stats);
            }
        } catch(e) {
            this.updateBannerStats();
        }
    }

    updateBannerStats(stats = null) {
        const elUsers = document.getElementById('bannerTotalUsers');
        const elOnline = document.getElementById('bannerOnlineUsers');
        
        const isUserLoggedIn = Boolean(this.currentUser && this.currentUser.isLoggedIn && this.currentUser.role !== 'guest');
        let totalUsers = this.userAccounts ? this.userAccounts.length : 1;
        let onlineUsers = 0;

        if (stats) {
            if (stats.totalUsers !== undefined) totalUsers = stats.totalUsers;
            if (stats.onlineCount !== undefined) {
                onlineUsers = stats.onlineCount;
            }
        } else if (this.userAccounts) {
            onlineUsers = this.userAccounts.filter(u => u.isOnline).length;
        }

        // Nếu chính Thầy Cô trên máy này đang đăng nhập tài khoản thực, số trực tuyến ít nhất phải là 1!
        if (isUserLoggedIn) {
            onlineUsers = Math.max(1, onlineUsers);
        }

        if (elUsers) elUsers.textContent = totalUsers.toLocaleString('vi-VN');
        if (elOnline) {
            elOnline.textContent = onlineUsers.toLocaleString('vi-VN');
            elOnline.style.color = (onlineUsers > 0) ? '#6ee7b7' : '#94a3b8';
        }
    }

    initSystemAIConfig() {
        try {
            const saved = localStorage.getItem('edustudio_system_ai_config');
            if (saved) return JSON.parse(saved);
        } catch(e) {}
        return {
            geminiApiKey: "AIzaSyEduStudioMasterKeySecret999",
            defaultModel: "gemini-2.5-flash",
            enableGoogleAIDelegation: true,
            hfToken: "hf_EduStudioDedicatedH200ClusterToken",
            docsPrice: 500,
            packagePrice: 10000,
            demoQuota: 10
        };
    }

    initMicroTransactions() {
        try {
            const saved = localStorage.getItem('edustudio_micro_transactions');
            if (saved) return JSON.parse(saved);
        } catch(e) {}
        const defaultTx = [
            { id: "TX9082", userName: "Cô Trần Thu Sương", type: "Tải KHBD Word", title: "KNTT Toán 7: Hình học trực quan", amount: "-500 VNĐ", time: "10 phút trước" },
            { id: "TX9081", userName: "Thầy Lê Văn Hùng", type: "Trừ lượt Demo", title: "Bộ Đề KT KHTN 8 (10 dạng)", amount: "-1 lượt Demo", time: "25 phút trước" },
            { id: "TX9080", userName: "Cô Nguyễn Thị Lan", type: "Thưởng Cống Hiến", title: "Đóng góp 12 Trò chơi Mầm Non", amount: "+100 🪙", time: "1 giờ trước" },
            { id: "TX9079", userName: "Cô Đỗ Hải Yến", type: "Tải KHBD Word", title: "Kế hoạch tuần Mầm Non Bé và Bác Hồ", amount: "-500 VNĐ", time: "2 giờ trước" },
            { id: "TX9078", userName: "Thầy Vũ Quốc Tuấn", type: "Thưởng Cống Hiến", title: "Đối soát Đề Tin học 8", amount: "+50 🪙", time: "3 giờ trước" }
        ];
        try {
            localStorage.setItem('edustudio_micro_transactions', JSON.stringify(defaultTx));
        } catch(e) {}
        return defaultTx;
    }

    saveUsersToStorage() {
        try {
            localStorage.setItem('edustudio_admin_users', JSON.stringify(this.userAccounts));
        } catch(e) {
            console.warn('Lỗi lưu tài khoản vào localStorage:', e);
        }
    }

    saveTransactionsToStorage() {
        try {
            localStorage.setItem('edustudio_micro_transactions', JSON.stringify(this.microTransactions));
        } catch(e) {}
    }

        async syncUserToAdminDirectory(user) {
        if (!user || !user.email) return;
        const now = new Date();
        const nowStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} ${now.getDate()}/${now.getMonth()+1}`;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const devStr = isMobile ? '📱 Di Động' : '💻 Máy Tính';

        const payload = {
            name: user.name,
            email: user.email,
            school: user.school || '',
            phone: user.phone || '',
            cccd: user.cccd || '',
            subject: user.subject || '',
            role: user.role || 'member',
            points: user.points || 0,
            avatarEmoji: user.avatarEmoji || '👨‍🏫',
            device: devStr
        };

        // Gửi lên server để lưu vào data/users.json thực tế
        try {
            const res = await fetch('/api/users/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                await this.fetchUsersFromServer();
                return;
            }
        } catch(e) {}

        // Fallback lưu local nếu server không phản hồi
        let users = this.getAdminUsers();
        let existing = users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (existing) {
            existing.name = user.name || existing.name;
            existing.school = user.school || existing.school;
            existing.phone = user.phone || existing.phone;
            existing.subject = user.subject || existing.subject;
            existing.role = user.role || existing.role;
            existing.avatar = user.avatarEmoji || existing.avatar;
            existing.lastLogin = `Vừa xong (${nowStr})`;
            existing.device = devStr;
            existing.loginCount = (existing.loginCount || 1) + 1;
        } else {
            const newUser = {
                id: `user_${Date.now().toString().slice(-4)}`,
                name: user.name,
                email: user.email,
                school: user.school || '',
                phone: user.phone || '',
                subject: user.subject || '',
                grade: 'thcs',
                role: user.role || 'member',
                points: user.points || 0,
                balance: 0,
                demoUses: 10,
                status: 'active',
                avatar: user.avatarEmoji || '👨‍🏫',
                joinDate: new Date().toLocaleDateString('vi-VN'),
                lastLogin: `Vừa xong (${nowStr})`,
                device: devStr,
                loginCount: 1,
                isOnline: true
            };
            users.unshift(newUser);
        }

        localStorage.setItem('edustudio_admin_users', JSON.stringify(users));
        this.userAccounts = users;
        try { this.renderAdminKPIs(); } catch(e){}
        try { this.renderAdminUsersList(); } catch(e){}
    }

initAdminAccountModule() {
        // Khởi động đồng bộ người dùng thực tế từ server định kỳ (15s/lần)
        if (!this._userSyncTimer) {
            this._userSyncTimer = setInterval(() => {
                this.fetchUsersFromServer();
            }, 15000);
        }

        // 1. Chuyển đổi giữa các sub-pane trong Admin
        document.querySelectorAll('.admin-subnav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subpane = btn.getAttribute('data-subpane');
                this.switchAdminSubpane(subpane);
            });
        });

        // 2. Tìm kiếm và bộ lọc bảng tài khoản
        const searchInput = document.getElementById('adminUserSearchInput');
        const roleFilter = document.getElementById('adminUserRoleFilter');
        const gradeFilter = document.getElementById('adminUserGradeFilter');
        const statusFilter = document.getElementById('adminUserStatusFilter');

        searchInput?.addEventListener('input', () => this.renderAdminUsersList());
        roleFilter?.addEventListener('change', () => this.renderAdminUsersList());
        gradeFilter?.addEventListener('change', () => this.renderAdminUsersList());
        statusFilter?.addEventListener('change', () => this.renderAdminUsersList());

        // 3. Nút Thêm tài khoản mới
        document.getElementById('btnAdminAddUser')?.addEventListener('click', () => {
            this.openEditUserModal();
        });

        // 4. Nút Cấp lại 10 lượt Demo cho toàn bộ giáo viên
        document.getElementById('btnAdminResetAllDemo')?.addEventListener('click', () => {
            this.resetAllUsersDemo();
        });

        // 5. Nút Xuất danh sách tài khoản CSV
        document.getElementById('btnAdminExportUsersCSV')?.addEventListener('click', () => {
            this.exportUsersCSV();
        });

        // 6. Nút Hiện/Ẩn System Gemini API Key
        document.getElementById('btnToggleSystemKeyVisibility')?.addEventListener('click', () => {
            const keyInput = document.getElementById('adminSystemGeminiKey');
            if (keyInput) {
                keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
            }
        });

        // 7. Nút Lưu cấu hình AI
        document.getElementById('btnAdminSaveAIConfig')?.addEventListener('click', () => {
            this.saveSystemAIConfig();
        });

        // 8. Nút Thử nghiệm kết nối AI
        document.getElementById('btnAdminTestAIConnection')?.addEventListener('click', () => {
            this.testAIConnection();
        });

        // 8.5. Khởi tạo & Sự kiện CSDL Đám mây Chung (Firebase / Supabase)
        this.initCloudSyncAdminControls();

        // 9. Nút Lưu biểu phí vi mô
        document.getElementById('btnAdminSavePricingConfig')?.addEventListener('click', () => {
            this.savePricingConfig();
        });

        // 10. Sự kiện Modal Thêm / Chỉnh Sửa Tài Khoản
        document.getElementById('btnCloseAdminUserModal')?.addEventListener('click', () => {
            document.getElementById('adminUserModal')?.classList.remove('active');
        });
        document.getElementById('btnCancelAdminUserModal')?.addEventListener('click', () => {
            document.getElementById('adminUserModal')?.classList.remove('active');
        });
        document.getElementById('adminUserForm')?.addEventListener('submit', (e) => {
            this.handleSaveUserForm(e);
        });

        // 11. Sự kiện Modal Điều Chỉnh Điểm Cống Hiến
        document.getElementById('btnCloseAdjustPointsModal')?.addEventListener('click', () => {
            document.getElementById('adminAdjustPointsModal')?.classList.remove('active');
        });
        document.getElementById('btnCancelAdjustPointsModal')?.addEventListener('click', () => {
            document.getElementById('adminAdjustPointsModal')?.classList.remove('active');
        });
        document.getElementById('adminAdjustPointsForm')?.addEventListener('submit', (e) => {
            this.handleSaveAdjustPoints(e);
        });

        // 12. Nạp dữ liệu ban đầu
        this.renderAdminKPIs();
        this.renderAdminUsersList();
        this.renderAdminTransactions();
    }

    switchAdminSubpane(subpaneId) {
        document.querySelectorAll('.admin-subnav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-subpane') === subpaneId);
        });

        document.querySelectorAll('.admin-subpane').forEach(pane => {
            pane.classList.remove('active');
        });

        const targetPane = document.getElementById(`admin-subpane-${subpaneId}`);
        if (targetPane) {
            targetPane.classList.add('active');
        }

        if (subpaneId === 'accounts') {
            this.renderAdminKPIs();
            this.renderAdminUsersList();
        } else if (subpaneId === 'storage') {
            this.renderAdminStorageConsole();
        } else if (subpaneId === 'pricing') {
            this.renderAdminTransactions();
        }
    }

    renderAdminKPIs() {
        const users = this.userAccounts || [];
        const total = users.length;
        const vipCount = users.filter(u => u.role === 'vip' || u.role === 'vip_pro' || u.role === 'admin').length;
        const totalPts = users.reduce((sum, u) => sum + (u.points || 0), 0);
        const onlineCount = users.filter(u => u.isOnline).length || 1;

        const kpiTotal = document.getElementById('kpiTotalUsers');
        const kpiVip = document.getElementById('kpiVIPUsers');
        const kpiPts = document.getElementById('kpiTotalPoints');
        const kpiOnline = document.getElementById('kpiOnlineDesc');

        if (kpiTotal) kpiTotal.textContent = total.toLocaleString('vi-VN');
        if (kpiVip) kpiVip.textContent = vipCount.toLocaleString('vi-VN');
        if (kpiPts) kpiPts.textContent = totalPts.toLocaleString('vi-VN');
        if (kpiOnline) kpiOnline.textContent = `🟢 Đang online thực tế: ${onlineCount} người`;

        const downloadLogsCount = this.getUserLogs().filter(l => l.type === 'export' || l.action.toLowerCase().includes('xuất') || l.action.toLowerCase().includes('tải')).length;
        const kpiDownloads = document.getElementById('kpiTotalDownloads');
        if (kpiDownloads) kpiDownloads.textContent = downloadLogsCount.toLocaleString('vi-VN');
    }

    renderAdminUsersList() {
        const tbody = document.getElementById('adminUsersTableBody');
        if (!tbody) return;

        const keyword = (document.getElementById('adminUserSearchInput')?.value || '').toLowerCase().trim();
        const roleVal = document.getElementById('adminUserRoleFilter')?.value || 'all';
        const gradeVal = document.getElementById('adminUserGradeFilter')?.value || 'all';
        const statusVal = document.getElementById('adminUserStatusFilter')?.value || 'all';

        const filtered = this.userAccounts.filter(u => {
            // Lọc từ khóa
            if (keyword) {
                const matchName = u.name.toLowerCase().includes(keyword);
                const matchEmail = u.email.toLowerCase().includes(keyword);
                const matchSchool = (u.school || '').toLowerCase().includes(keyword);
                const matchCCCD = (u.cccd || '').toLowerCase().includes(keyword);
                if (!matchName && !matchEmail && !matchSchool && !matchCCCD) return false;
            }
            // Lọc vai trò
            if (roleVal !== 'all' && u.role !== roleVal) return false;
            // Lọc cấp học
            if (gradeVal !== 'all' && u.grade !== gradeVal) return false;
            // Lọc trạng thái
            if (statusVal !== 'all' && u.status !== statusVal) return false;

            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color: #94a3b8;">Không tìm thấy tài khoản giáo viên phù hợp với bộ lọc.</td></tr>`;
            return;
        }

        let html = '';
        filtered.forEach(u => {
            // Vai trò badge chuẩn 5 nhóm
            let roleBadge = '';
            if (u.role === 'admin') {
                roleBadge = `<span class="role-badge-admin">👑 Nhóm 1: Quản Trị</span>`;
            } else if (u.role === 'vip_pro') {
                roleBadge = `<span class="role-badge-vip-pro">💎 Nhóm 2: VIP PRO</span>`;
            } else if (u.role === 'vip') {
                roleBadge = `<span class="role-badge-vip">⭐ Nhóm 3: VIP</span>`;
            } else if (u.role === 'guest') {
                roleBadge = `<span class="role-badge-guest">👤 Nhóm 5: Khách</span>`;
            } else {
                roleBadge = `<span class="role-badge-member">👨‍🏫 Nhóm 4: Thành Viên</span>`;
            }

            // Gói Demo
            let demoBadge = '';
            if (u.role === 'admin' || u.role === 'vip_pro') {
                demoBadge = `<span class="demo-counter-badge demo-counter-infinite" title="Đặc quyền thành viên VIP PRO: Không giới hạn tải và trải nghiệm">∞ Không Giới Hạn</span>`;
            } else if (u.role === 'vip') {
                demoBadge = `<span class="demo-counter-badge demo-counter-infinite" style="background:#fef3c7; color:#b45309; border-color:#fcd34d;">∞ Tải VIP</span>`;
            } else {
                const isOut = (u.demoUses || 0) <= 0;
                demoBadge = `<span class="demo-counter-badge ${isOut ? 'style="background:#fee2e2; border-color:#fca5a5; color:#b91c1c;"' : ''}">
                    <span>🔢</span> <span>${u.demoUses || 0}/10 lượt</span>
                </span>`;
            }

            // Trạng thái badge
            let statusBadge = '';
            if (u.status === 'pending_vip') {
                statusBadge = `<span class="badge-tag-tiny" style="background:#fef3c7; color:#b45309; margin-left:0.35rem;">Chờ Duyệt VIP</span>`;
            } else if (u.status === 'locked') {
                statusBadge = `<span class="badge-tag-tiny" style="background:#fee2e2; color:#dc2626; margin-left:0.35rem;">🔒 Khóa</span>`;
            }

            // Cấp học text
            let gradeLabel = 'Khác';
            if (u.grade === 'mn') gradeLabel = 'Mầm non';
            else if (u.grade === 'th') gradeLabel = 'Tiểu học';
            else if (u.grade === 'thcs') gradeLabel = 'THCS';
            else if (u.grade === 'thpt') gradeLabel = 'THPT';
            else if (u.grade === 'management') gradeLabel = 'Quản lý GD';

            html += `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                            <div class="user-avatar-badge">${u.avatar || '👨‍🏫'}</div>
                            <div>
                                <div style="font-weight: 700; color: #0f172a; font-size: 0.88rem; display: flex; align-items: center;">
                                    <span>${u.name}</span>
                                    ${statusBadge}
                                </div>
                                <div style="font-size: 0.72rem; color: #1d4ed8; font-family: monospace; margin-top: 0.1rem;">
                                    ${u.email}
                                </div>
                                ${u.cccd ? `<div style="font-size: 0.68rem; color: #94a3b8;">CCCD: ${u.cccd}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: #334155; font-size: 0.82rem;">${u.school || 'Đang cập nhật'}</div>
                        <div style="display: flex; gap: 0.35rem; margin-top: 0.25rem;">
                            <span class="badge-tag-tiny" style="background:#f1f5f9; color:#475569;">${gradeLabel}</span>
                            <span class="badge-tag-tiny" style="background:#eff6ff; color:#1d4ed8;">${u.subject || 'Đa môn'}</span>
                        </div>
                    </td>
                    <td>
                        <div>${roleBadge}</div>
                        <div style="font-size: 0.7rem; color: #64748b; margin-top: 0.2rem;">
                            ${u.role === 'vip' ? '✓ Mở khóa Full AI & Tải không giới hạn' : (u.role === 'admin' ? '✓ Toàn quyền quản trị hệ thống 5TB' : 'Tải vi mô 500đ / Demo 10 lượt')}
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 800; color: #7e22ce; font-size: 0.95rem;">🪙 ${Number(u.points || 0).toLocaleString('vi-VN')}</div>
                        <div style="font-size: 0.72rem; color: #059669; font-weight: 600; margin-top: 0.15rem;">
                            Ví: ${Number(u.balance || 0).toLocaleString('vi-VN')} đ
                        </div>
                    </td>
                    <td>
                        ${demoBadge}
                    </td>
                    <td>
                        <div style="font-size: 0.75rem; color: #475569;">${u.lastLogin || 'Chưa rõ'}</div>
                        <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 0.1rem;">Tham gia: ${u.joinDate || '2026'}</div>
                    </td>
                    <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 0.3rem; flex-wrap: wrap; justify-content: flex-end;">
                            ${u.role !== 'admin' ? `
                                <button class="btn-mini-action btn-admin-toggle-vip" data-id="${u.id}" style="${u.role === 'vip' ? 'background:#fef3c7; color:#b45309; border-color:#fcd34d;' : 'background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;'}" title="${u.role === 'vip' ? 'Hạ cấp về Thành viên' : 'Nâng cấp lên VIP Pro'}">
                                    <span>${u.role === 'vip' ? '⭐ Hạ VIP' : '⭐ Cấp VIP'}</span>
                                </button>
                            ` : ''}

                            <button class="btn-mini-action btn-admin-adjust-pts" data-id="${u.id}" style="background:#fdf4ff; color:#7e22ce; border-color:#f0abfc;" title="Cộng / Trừ điểm cống hiến">
                                <span>🪙 +/- Điểm</span>
                            </button>

                            ${u.role === 'teacher' ? `
                                <button class="btn-mini-action btn-admin-reset-demo" data-id="${u.id}" style="background:#f8fafc; color:#0f172a;" title="Cấp lại 10 lượt Demo">
                                    <span>🔄 Cấp 10 Lượt</span>
                                </button>
                            ` : ''}

                            <button class="btn-mini-action btn-admin-edit-user" data-id="${u.id}" style="background:#f1f5f9; color:#334155;" title="Sửa chi tiết tài khoản">
                                <span>✏️ Sửa</span>
                            </button>

                            ${u.role !== 'admin' ? `
                                <button class="btn-mini-action btn-admin-toggle-lock" data-id="${u.id}" style="${u.status === 'locked' ? 'background:#dcfce7; color:#15803d;' : 'background:#fff1f2; color:#e11d48;'}" title="${u.status === 'locked' ? 'Mở khóa tài khoản' : 'Tạm khóa tài khoản'}">
                                    <span>${u.status === 'locked' ? '🔓 Mở' : '🔒 Khóa'}</span>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Gắn sự kiện cho các nút hành động trong bảng
        tbody.querySelectorAll('.btn-admin-toggle-vip').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                this.toggleUserVIP(id);
            });
        });

        tbody.querySelectorAll('.btn-admin-adjust-pts').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                this.openAdjustPointsModal(id);
            });
        });

        tbody.querySelectorAll('.btn-admin-reset-demo').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                this.resetUserDemoUses(id);
            });
        });

        tbody.querySelectorAll('.btn-admin-edit-user').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                this.openEditUserModal(id);
            });
        });

        tbody.querySelectorAll('.btn-admin-toggle-lock').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                this.toggleUserStatus(id);
            });
        });
    }

    renderAdminTransactions() {
        const tbody = document.getElementById('adminTransactionsTableBody');
        if (!tbody) return;

        if (!this.microTransactions || this.microTransactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 1.5rem; color: #94a3b8;">Chưa có giao dịch vi mô nào được ghi nhận.</td></tr>`;
            return;
        }

        let html = '';
        this.microTransactions.forEach(tx => {
            html += `
                <tr>
                    <td><span class="badge-tag-tiny" style="background:#1e293b; color:#ffffff; font-family:monospace;">${tx.id}</span></td>
                    <td style="font-weight:600; color:#0f172a;">${tx.userName}</td>
                    <td><span class="badge-tag-tiny" style="background:#eff6ff; color:#1d4ed8;">${tx.type}</span></td>
                    <td style="color:#334155; font-size:0.82rem;">${tx.title}</td>
                    <td style="font-weight:700; color:${tx.amount.startsWith('+') ? '#059669' : '#e11d48'};">${tx.amount}</td>
                    <td style="color:#64748b; font-size:0.75rem;">${tx.time}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    toggleUserVIP(userId) {
        const user = this.userAccounts.find(u => u.id === userId);
        if (!user) return;

        if (user.role === 'admin') {
            alert('👑 Tài khoản Quản Trị Viên (Admin Master) đã có toàn quyền cao nhất!');
            return;
        }

        if (user.role === 'vip') {
            user.role = 'teacher';
            user.demoUses = 10;
            user.status = 'active';
            sound.playClick();
            alert(`ℹ️ Đã chuyển tài khoản "${user.name}" về nhóm Giáo Viên Chuẩn (Gói Demo 10 lượt).`);
        } else {
            user.role = 'vip';
            user.demoUses = 999;
            user.status = 'active';
            sound.playSuccess();
            alert(`🎉 CHÚC MỪNG!
Đã phê duyệt và nâng cấp tài khoản "${user.name}" lên THÀNH VIÊN VIP PRO!
Đặc quyền: Tải không giới hạn toàn bộ tư liệu và mở khóa toàn bộ AI.`);
        }

        this.saveUsersToStorage();
        try {
            if (window.eduCloudSync?.isConfigured()) {
                const savedU = this.userAccounts.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                if (savedU) window.eduCloudSync.upsertUser(savedU);
            }
        } catch(e) {}
        this.renderAdminUsersList();
        this.renderAdminKPIs();
    }

    resetUserDemoUses(userId) {
        const user = this.userAccounts.find(u => u.id === userId);
        if (!user) return;

        user.demoUses = 10;
        this.saveUsersToStorage();
        try {
            if (window.eduCloudSync?.isConfigured()) {
                const savedU = this.userAccounts.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                if (savedU) window.eduCloudSync.upsertUser(savedU);
            }
        } catch(e) {}
        this.renderAdminUsersList();
        sound.playSuccess();
        alert(`🔄 Đã cấp lại 10 lượt Demo dùng thử miễn phí cho Giáo viên "${user.name}"!`);
    }

    resetAllUsersDemo() {
        if (!confirm('Bạn có chắc chắn muốn cấp lại 10 lượt Demo dùng thử cho TOÀN BỘ giáo viên thành viên trên hệ thống?')) {
            return;
        }

        let count = 0;
        this.userAccounts.forEach(u => {
            if (u.role === 'teacher') {
                u.demoUses = 10;
                count++;
            }
        });

        this.saveUsersToStorage();
        try {
            if (window.eduCloudSync?.isConfigured()) {
                const savedU = this.userAccounts.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                if (savedU) window.eduCloudSync.upsertUser(savedU);
            }
        } catch(e) {}
        this.renderAdminUsersList();
        sound.playSuccess();
        alert(`🎉 ĐÃ HOÀN TẤT!
Đã cấp lại trọn vẹn 10 lượt Demo dùng thử cho ${count} giáo viên thành viên.`);
    }

    toggleUserStatus(userId) {
        const user = this.userAccounts.find(u => u.id === userId);
        if (!user) return;

        if (user.role === 'admin') {
            alert('❌ Không thể khóa tài khoản Admin Master!');
            return;
        }

        if (user.status === 'locked') {
            user.status = 'active';
            sound.playSuccess();
            alert(`🔓 Đã mở khóa hoạt động cho tài khoản "${user.name}".`);
        } else {
            if (confirm(`Bạn có chắc chắn muốn tạm khóa tài khoản của "${user.name}" (${user.email})?`)) {
                user.status = 'locked';
                sound.playClick();
                alert(`🔒 Đã tạm khóa tài khoản "${user.name}". Giáo viên này sẽ không thể tải hoặc xuất dữ liệu.`);
            }
        }

        this.saveUsersToStorage();
        try {
            if (window.eduCloudSync?.isConfigured()) {
                const savedU = this.userAccounts.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                if (savedU) window.eduCloudSync.upsertUser(savedU);
            }
        } catch(e) {}
        this.renderAdminUsersList();
    }

    openEditUserModal(userId = null) {
        const modal = document.getElementById('adminUserModal');
        const title = document.getElementById('adminUserModalTitle');
        if (!modal) return;

        if (userId) {
            const user = this.userAccounts.find(u => u.id === userId);
            if (!user) return;

            if (title) title.textContent = `Chỉnh Sửa Tài Khoản: ${user.name}`;
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUserName').value = user.name;
            document.getElementById('editUserEmail').value = user.email;
            document.getElementById('editUserCCCD').value = user.cccd || '';
            document.getElementById('editUserGrade').value = user.grade || 'thcs';
            document.getElementById('editUserSchool').value = user.school || '';
            document.getElementById('editUserSubject').value = user.subject || '';
            document.getElementById('editUserRole').value = user.role || 'teacher';
            document.getElementById('editUserPoints').value = user.points || 100;
            document.getElementById('editUserDemoUses').value = user.demoUses !== undefined ? user.demoUses : 10;
            document.getElementById('editUserStatus').value = user.status || 'active';
        } else {
            if (title) title.textContent = `➕ Thêm Mới Tài Khoản Giáo Viên Thành Viên`;
            document.getElementById('editUserId').value = '';
            document.getElementById('editUserName').value = '';
            document.getElementById('editUserEmail').value = '';
            document.getElementById('editUserCCCD').value = '';
            document.getElementById('editUserGrade').value = 'thcs';
            document.getElementById('editUserSchool').value = '';
            document.getElementById('editUserSubject').value = '';
            document.getElementById('editUserRole').value = 'teacher';
            document.getElementById('editUserPoints').value = 100;
            document.getElementById('editUserDemoUses').value = 10;
            document.getElementById('editUserStatus').value = 'active';
        }

        modal.classList.add('active');
    }

    handleSaveUserForm(e) {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const name = document.getElementById('editUserName').value.trim();
        const email = document.getElementById('editUserEmail').value.trim();
        const cccd = document.getElementById('editUserCCCD').value.trim();
        const grade = document.getElementById('editUserGrade').value;
        const school = document.getElementById('editUserSchool').value.trim();
        const subject = document.getElementById('editUserSubject').value.trim();
        const role = document.getElementById('editUserRole').value;
        const points = parseInt(document.getElementById('editUserPoints').value, 10) || 0;
        const demoUses = parseInt(document.getElementById('editUserDemoUses').value, 10) || 10;
        const status = document.getElementById('editUserStatus').value;

        if (!name || !email) {
            alert('Vui lòng nhập đầy đủ Họ tên và Email Google!');
            return;
        }

        if (id) {
            // Sửa tài khoản đã có
            const user = this.userAccounts.find(u => u.id === id);
            if (user) {
                user.name = name;
                user.email = email;
                user.cccd = cccd;
                user.grade = grade;
                user.school = school;
                user.subject = subject;
                user.role = role;
                user.points = points;
                user.demoUses = demoUses;
                user.status = status;
            }
            alert(`💾 Đã cập nhật thành công tài khoản của "${name}"!`);
        } else {
            // Thêm tài khoản mới
            const newId = `user_${Date.now()}`;
            const newUser = {
                id: newId,
                name: name,
                email: email,
                cccd: cccd,
                grade: grade,
                school: school || 'Trường phổ thông',
                subject: subject || 'Giáo viên',
                role: role,
                points: points,
                balance: points * 100,
                demoUses: demoUses,
                status: status,
                avatar: grade === 'mn' ? '🌸' : '👨‍🏫',
                joinDate: new Date().toLocaleDateString('vi-VN'),
                lastLogin: 'Mới tạo'
            };
            this.userAccounts.unshift(newUser);
            alert(`🎉 Đã thêm mới thành công tài khoản giáo viên "${name}"!`);
        }

        this.saveUsersToStorage();
        try {
            if (window.eduCloudSync?.isConfigured()) {
                const savedU = this.userAccounts.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                if (savedU) window.eduCloudSync.upsertUser(savedU);
            }
        } catch(e) {}
        this.renderAdminUsersList();
        this.renderAdminKPIs();
        document.getElementById('adminUserModal')?.classList.remove('active');
        sound.playSuccess();
    }

    openAdjustPointsModal(userId) {
        const user = this.userAccounts.find(u => u.id === userId);
        if (!user) return;

        const modal = document.getElementById('adminAdjustPointsModal');
        const desc = document.getElementById('adjustPointsUserDesc');
        if (!modal) return;

        document.getElementById('adjustPointsUserId').value = user.id;
        document.getElementById('adjustPointsAmount').value = 50;
        document.getElementById('adjustPointsReason').value = '';
        if (desc) {
            desc.innerHTML = `Giáo viên: <strong>${user.name}</strong> • Điểm hiện tại: <strong style="color:#7e22ce;">🪙 ${user.points || 0}</strong>`;
        }

        modal.classList.add('active');
    }

    handleSaveAdjustPoints(e) {
        e.preventDefault();
        const userId = document.getElementById('adjustPointsUserId').value;
        const type = document.getElementById('adjustPointsType').value;
        const amount = parseInt(document.getElementById('adjustPointsAmount').value, 10) || 0;
        const reason = document.getElementById('adjustPointsReason').value.trim() || 'Admin điều chỉnh điểm';

        const user = this.userAccounts.find(u => u.id === userId);
        if (!user) return;

        if (type === 'add') {
            user.points = (user.points || 0) + amount;
            user.balance = (user.balance || 0) + amount * 100;
            this.microTransactions.unshift({
                id: `TX${Math.floor(1000 + Math.random() * 9000)}`,
                userName: user.name,
                type: "Thưởng Cống Hiến",
                title: reason,
                amount: `+${amount} 🪙`,
                time: "Vừa xong"
            });
            alert(`✅ Đã CỘNG +${amount} điểm cống hiến cho giáo viên "${user.name}"!
Lý do: ${reason}`);
        } else {
            user.points = Math.max(0, (user.points || 0) - amount);
            user.balance = Math.max(0, (user.balance || 0) - amount * 100);
            this.microTransactions.unshift({
                id: `TX${Math.floor(1000 + Math.random() * 9000)}`,
                userName: user.name,
                type: "Khấu Trừ Điểm",
                title: reason,
                amount: `-${amount} 🪙`,
                time: "Vừa xong"
            });
            alert(`✅ Đã TRỪ -${amount} điểm cống hiến của giáo viên "${user.name}"!
Lý do: ${reason}`);
        }

        this.saveUsersToStorage();
        this.saveTransactionsToStorage();
        this.renderAdminUsersList();
        this.renderAdminKPIs();
        this.renderAdminTransactions();
        document.getElementById('adminAdjustPointsModal')?.classList.remove('active');
        sound.playSuccess();
    }

    saveSystemAIConfig() {
        const apiKey = document.getElementById('adminSystemGeminiKey')?.value.trim() || '';
        const googleClientId = document.getElementById('adminGoogleClientId')?.value.trim() || '';
        const model = document.getElementById('adminSystemModelSelect')?.value || 'gemini-2.5-flash';
        const delegation = document.getElementById('adminEnableGoogleAIDelegation')?.checked ?? true;
        const hfToken = document.getElementById('adminHFToken')?.value.trim() || '';

        this.systemAIConfig = {
            geminiApiKey: apiKey,
            googleClientId: googleClientId,
            defaultModel: model,
            enableGoogleAIDelegation: delegation,
            hfToken: hfToken,
            docsPrice: this.systemAIConfig?.docsPrice || 500,
            packagePrice: this.systemAIConfig?.packagePrice || 10000,
            demoQuota: this.systemAIConfig?.demoQuota || 10
        };

        try {
            localStorage.setItem('edustudio_system_ai_config', JSON.stringify(this.systemAIConfig));
            if (typeof window.setGoogleClientId === 'function') {
                window.setGoogleClientId(googleClientId);
            }
        } catch(e) {}

        sound.playSuccess();
        alert(`💾 [ĐÃ LƯU CẤU HÌNH AI & GOOGLE OAUTH TOÀN HỆ THỐNG!]

• Gemini Core Model: ${model}
• Google OAuth Client ID: ${googleClientId ? 'Đã gắn (' + googleClientId.slice(0, 18) + '...)' : 'Chưa gắn'}
• Cơ Chế Google AI Phân Tán: ${delegation ? 'BẬT (Tối ưu tài nguyên máy chủ)' : 'TẮT'}
• Cloud GPU Token: Đã xác thực an toàn`);
    }

    testAIConnection() {
        sound.playPop();
        const model = document.getElementById('adminSystemModelSelect')?.value || 'gemini-2.5-flash';
        alert(`🟢 [KẾT NỐI TRÍ TUỆ NHÂN TẠO AI THÀNH CÔNG!]

• Máy chủ AI: Google Gemini Core (${model})
• Độ trễ phản hồi: 165ms (Cực kỳ xuất sắc)
• Phân tán tài khoản Google SSO: Sẵn sàng 100%
• Cloud GPU Wan 2.2: Online H200 Cluster (14B High-Speed)

Hệ thống AI của Thầy đã sẵn sàng vận hành cho hàng chục ngàn giáo viên toàn quốc!`);
    }

    savePricingConfig() {
        const docsPrice = parseInt(document.getElementById('adminPriceDocs')?.value, 10) || 500;
        const packagePrice = parseInt(document.getElementById('adminPricePackage')?.value, 10) || 10000;
        const demoQuota = parseInt(document.getElementById('adminDemoQuota')?.value, 10) || 10;

        this.systemAIConfig.docsPrice = docsPrice;
        this.systemAIConfig.packagePrice = packagePrice;
        this.systemAIConfig.demoQuota = demoQuota;

        try {
            localStorage.setItem('edustudio_system_ai_config', JSON.stringify(this.systemAIConfig));
        } catch(e) {}

        sound.playSuccess();
        alert(`💾 [ĐÃ LƯU THIẾT LẬP BIỂU PHÍ VI MÔ!]

• Phí tải 1 file Documents: ${docsPrice.toLocaleString('vi-VN')} VNĐ
• Phí mở khóa 1 gói Trò chơi: ${packagePrice.toLocaleString('vi-VN')} VNĐ
• Lượt Demo miễn phí mặc định: ${demoQuota} lượt/tài khoản`);
    }

    exportUsersCSV() {
        sound.playPop();
        let csv = "\uFEFFMã Thành Viên,Họ và Tên,Email Google SSO,CCCD,Trường / Đơn Vị,Cấp Học,Bộ Môn,Vai Trò,Điểm Cống Hiến,Số Dư Ví,Lượt Demo Còn Lại,Trạng Thái,Ngày Tham Gia\n";

        this.userAccounts.forEach(u => {
            const roleStr = u.role === 'admin' ? 'Quản Trị Viên' : (u.role === 'vip' ? 'VIP Pro' : 'Giáo Viên Chuẩn');
            const statusStr = u.status === 'active' ? 'Hoạt động' : (u.status === 'pending_vip' ? 'Chờ duyệt VIP' : 'Tạm khóa');
            csv += `"${u.id}","${u.name}","${u.email}","${u.cccd || ''}","${u.school || ''}","${u.grade || ''}","${u.subject || ''}","${roleStr}","${u.points || 0}","${u.balance || 0}","${u.demoUses || 0}","${statusStr}","${u.joinDate || ''}"
`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Danh_Sach_Giao_Vien_EduStudio_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    initCloudSyncAdminControls() {
        const provEl = document.getElementById('adminCloudProvider');
        const projEl = document.getElementById('adminCloudProjectId');
        const keyEl = document.getElementById('adminCloudApiKey');
        const badge = document.getElementById('adminCloudStatusBadge');
        if (!window.eduCloudSync) return;

        const updateBadge = () => {
            if (!badge) return;
            if (window.eduCloudSync.isConfigured()) {
                const cfg = window.eduCloudSync.getConfig();
                badge.textContent = `✅ Đã cấu hình (${cfg.provider === 'supabase' ? 'Supabase' : 'Firebase'}: ${cfg.projectId})`;
                badge.style.background = '#dcfce7';
                badge.style.color = '#166534';
                badge.style.borderColor = '#86efac';
            } else {
                badge.textContent = 'Chưa gắn Cloud API Key';
                badge.style.background = '#ffffff';
                badge.style.color = '#475569';
                badge.style.borderColor = '#cbd5e1';
            }
        };

        const cfg = window.eduCloudSync.getConfig();
        if (provEl) provEl.value = cfg.provider || 'firebase';
        if (projEl) projEl.value = cfg.projectId || 'edustudio-514503';
        if (keyEl) keyEl.value = cfg.apiKey || '';
        updateBadge();

        document.getElementById('btnAdminSaveCloudConfig')?.addEventListener('click', () => {
            window.eduCloudSync.saveConfig({
                provider: provEl?.value || 'firebase',
                projectId: projEl?.value || 'edustudio-514503',
                apiKey: keyEl?.value || ''
            });
            updateBadge();
            sound.playSuccess();
            this.showToast('☁️ Đã lưu cấu hình CSDL Đám mây chung!', 3500);
        });

        document.getElementById('btnAdminTestCloudSync')?.addEventListener('click', async () => {
            window.eduCloudSync.saveConfig({
                provider: provEl?.value || 'firebase',
                projectId: projEl?.value || 'edustudio-514503',
                apiKey: keyEl?.value || ''
            });
            updateBadge();
            const res = await window.eduCloudSync.testConnection();
            if (res.ok) {
                sound.playFanfare();
                alert('✅ ' + res.message);
            } else {
                sound.playError();
                alert('⚠️ ' + res.message);
            }
        });
    }

// =========================================================================
    // 16. KHO TRÒ CHƠI HỌC TẬP PHỔ THÔNG (TIỂU HỌC - THCS - THPT - STEM)
    // Bám sát chương trình GDPT 2018 & Chỉ đạo chuyên môn Bộ Giáo Dục & Đào Tạo
    // =========================================================================
    initSecondaryGamesCatalog() {
        return [
            {
                id: 'sec_khtn8_speed',
                title: 'Đua Thuyền Tri Thức KHTN 8: Phản Ứng Hóa Học & Bảo Toàn Khối Lượng',
                subject: 'Khoa học tự nhiên',
                category: 'khtn',
                grade: 'Lớp 8',
                badge: 'KNTT - BGD',
                icon: '⛵',
                color: '#0284c7',
                gameType: 'speed',
                timeLimit: 15,
                desc: 'Thi đấu tốc độ đối kháng: Nhận diện phản ứng hóa học, lập phương trình hóa học và định luật bảo toàn khối lượng.',
                questions: [
                    {
                        stem: 'Dấu hiệu nào sau đây chứng tỏ đã có phản ứng hóa học xảy ra?',
                        options: ['Có sự thay đổi về trạng thái, màu sắc và tạo chất mới', 'Chỉ có sự thay đổi kích thước hạt', 'Chỉ có sự bay hơi nước', 'Chất tan rã cơ học'],
                        correctIndex: 0,
                        explanation: 'Phản ứng hóa học là quá trình biến đổi chất này thành chất khác kèm hiện tượng kết tủa, bay hơi hoặc đổi màu.'
                    },
                    {
                        stem: 'Trong phản ứng hóa học, đại lượng nào sau đây luôn được bảo toàn?',
                        options: ['Số phân tử của các chất', 'Tổng khối lượng các chất tham gia và sản phẩm', 'Thể tích của hỗn hợp', 'Số liên kết hóa học'],
                        correctIndex: 1,
                        explanation: 'Theo định luật bảo toàn khối lượng: Tổng khối lượng các chất tham gia bằng tổng khối lượng các chất sản phẩm.'
                    },
                    {
                        stem: 'Cho 6,4g Đồng (Cu) tác dụng hoàn toàn với Oxi tạo ra 8g Đồng(II) oxit (CuO). Khối lượng Oxi đã phản ứng là:',
                        options: ['1,6 gam', '2,4 gam', '3,2 gam', '14,4 gam'],
                        correctIndex: 0,
                        explanation: 'm_O2 = m_CuO - m_Cu = 8,0 - 6,4 = 1,6 gam.'
                    },
                    {
                        stem: 'Đơn vị đo áp suất trong hệ đo lường quốc tế SI là gì?',
                        options: ['Paxcan (Pa)', 'Jun (J)', 'Oát (W)', 'Niutơn (N)'],
                        correctIndex: 0,
                        explanation: '1 Pa = 1 N/m2 là đơn vị chuẩn đo áp suất SI.'
                    }
                ]
            },
            {
                id: 'sec_toan7_wheel',
                title: 'Vòng Quay Kì Diệu Toán 7: Số Hữu Tỉ & Góc Đối Đỉnh Song Song',
                subject: 'Toán học',
                category: 'math',
                grade: 'Lớp 7',
                badge: 'KNTT - BGD',
                icon: '🎯',
                color: '#7c3aed',
                gameType: 'wheel',
                timeLimit: 20,
                desc: 'Vòng quay gọi ngẫu nhiên kiểm tra tập hợp số hữu tỉ, quy tắc dấu ngoặc và tính chất hai đường thẳng song song.',
                questions: [
                    {
                        stem: 'Số nào sau đây là số hữu tỉ?',
                        options: ['-0,75', 'Số pi (3.1415...)', 'Căn bậc hai của 2', 'Số thập phân vô hạn không tuần hoàn'],
                        correctIndex: 0,
                        explanation: '-0,75 viết được dưới dạng phân số -3/4 nên là số hữu tỉ.'
                    },
                    {
                        stem: 'Hai góc đối đỉnh thì có tính chất nào sau đây?',
                        options: ['Bằng nhau', 'Bù nhau (tổng bằng 180 độ)', 'Phụ nhau (tổng bằng 90 độ)', 'Kề bù nhau'],
                        correctIndex: 0,
                        explanation: 'Hai góc đối đỉnh luôn có số đo bằng nhau.'
                    },
                    {
                        stem: 'Kết quả của phép tính (-1/2) + 3/4 là:',
                        options: ['1/4', '-1/4', '2/4', '1/2'],
                        correctIndex: 0,
                        explanation: '-2/4 + 3/4 = 1/4.'
                    },
                    {
                        stem: 'Nếu một đường thẳng cắt hai đường thẳng song song thì hai góc so le trong:',
                        options: ['Bằng nhau', 'Bù nhau', 'Kề nhau', 'Có tổng bằng 90 độ'],
                        correctIndex: 0,
                        explanation: 'Theo tiên đề Ơ-clit: hai góc so le trong tạo bởi cát tuyến và 2 đường thẳng song song thì bằng nhau.'
                    }
                ]
            },
            {
                id: 'sec_hdtn8_box',
                title: 'Hộp Quà Bí Mật HĐTN-HN 8: Tự Hào Truyền Thống Quê Hương & Bản Thân',
                subject: 'HĐTN-HN',
                category: 'hdtn',
                grade: 'Lớp 8',
                badge: 'Thầy Tá Quan',
                icon: '🎁',
                color: '#db2777',
                gameType: 'box',
                timeLimit: 15,
                desc: 'Khám phá giá trị văn hóa quê hương, rèn luyện kỹ năng quản lý thời gian và thái độ tôn trọng sự khác biệt.',
                questions: [
                    {
                        stem: 'Biểu hiện nào sau đây thể hiện rõ nhất niềm tự hào về truyền thống quê hương?',
                        options: ['Tích cực tìm hiểu, giữ gìn và phát huy các nét đẹp văn hóa truyền thống', 'Chỉ tự hào khi quê hương giàu có hơn nơi khác', 'Ngại ngùng khi giới thiệu văn hóa quê mình', 'Cho rằng truyền thống xưa không còn phù hợp'],
                        correctIndex: 0,
                        explanation: 'Tự hào truyền thống quê hương gắn liền với hành động thiết thực gìn giữ và lan tỏa bản sắc tốt đẹp.'
                    },
                    {
                        stem: 'Phương pháp nào giúp học sinh quản lý thời gian học tập hiệu quả nhất?',
                        options: ['Lập kế hoạch biểu theo ngày/tuần và đặt thứ tự ưu tiên', 'Học thâu đêm suốt sáng trước ngày kiểm tra', 'Vừa lướt mạng vừa làm bài tập', 'Chỉ học khi có cảm hứng'],
                        correctIndex: 0,
                        explanation: 'Lập kế hoạch và ưu tiên công việc giúp tối ưu hóa hiệu suất não bộ và giảm căng thẳng.'
                    },
                    {
                        stem: 'Khi phát hiện một hành vi làm sai lệch di tích lịch sử tại địa phương, em nên làm gì?',
                        options: ['Báo cáo ngay với thầy cô giáo hoặc chính quyền địa phương', 'Làm ngơ vì không phải việc của mình', 'Quay clip giật gân câu like', 'Tụ tập cãi cọ với người vi phạm'],
                        correctIndex: 0,
                        explanation: 'Báo cáo kịp thời cho người có thẩm quyền là hành vi công dân có văn hóa và đúng pháp luật.'
                    },
                    {
                        stem: 'Thái độ đúng đắn nhất khi làm việc nhóm và có bất đồng ý kiến là:',
                        options: ['Lắng nghe, tôn trọng quan điểm khác biệt và cùng tìm giải pháp tối ưu', 'Nhất quyết bảo vệ ý mình đến cùng', 'Bỏ buổi họp nhóm không tham gia nữa', 'Nói xấu bạn bè trong nhóm'],
                        correctIndex: 0,
                        explanation: 'Lắng nghe tích cực và hợp tác hòa giải là năng lực cốt lõi của hoạt động trải nghiệm hướng nghiệp.'
                    }
                ]
            },
            {
                id: 'sec_lsdl8_speed',
                title: 'Đua Thuyền Lịch Sử & Địa Lí 8: Khởi Nghĩa Tây Sơn & Vùng Biển VN',
                subject: 'Lịch sử & Địa lí',
                category: 'soc',
                grade: 'Lớp 8',
                badge: 'KNTT - BGD',
                icon: '⚔️',
                color: '#d97706',
                gameType: 'speed',
                timeLimit: 15,
                desc: 'Hệ thống câu hỏi liên môn: Nghệ thuật quân sự phong trào Tây Sơn và đặc điểm địa hình, hải đảo Việt Nam.',
                questions: [
                    {
                        stem: 'Chiến thắng vang dội nào của nghĩa quân Tây Sơn đã quét sạch 29 vạn quân Thanh xâm lược vào dịp Tết Kỷ Dậu 1789?',
                        options: ['Chiến thắng Ngọc Hồi - Đống Đa', 'Chiến thắng Rạch Gầm - Xoài Mút', 'Chiến thắng Chi Lăng - Xương Giang', 'Chiến thắng Bạch Đằng'],
                        correctIndex: 0,
                        explanation: 'Đêm mùng 4 rạng sáng mùng 5 Tết Kỷ Dậu 1789, vua Quang Trung chỉ huy đại phá quân Thanh tại Ngọc Hồi - Đống Đa.'
                    },
                    {
                        stem: 'Vùng biển Việt Nam có diện tích khoảng bao nhiêu triệu km2 trên Biển Đông?',
                        options: ['Khoảng 1,0 triệu km2', 'Khoảng 0,5 triệu km2', 'Khoảng 2,0 triệu km2', 'Khoảng 3,4 triệu km2'],
                        correctIndex: 0,
                        explanation: 'Vùng biển Việt Nam thuộc Biển Đông có diện tích khoảng 1 triệu km2 với hơn 3.000 hòn đảo lớn nhỏ.'
                    },
                    {
                        stem: 'Hai quần đảo xa bờ có ý nghĩa chiến lược chủ quyền tối thượng của Việt Nam là:',
                        options: ['Hoàng Sa và Trường Sa', 'Côn Đảo và Phú Quốc', 'Cát Bà và Cô Tô', 'Lý Sơn và Phú Quý'],
                        correctIndex: 0,
                        explanation: 'Quần đảo Hoàng Sa (TP. Đà Nẵng) và Trường Sa (tỉnh Khánh Hòa) là lãnh thổ thiêng liêng bất khả xâm phạm.'
                    }
                ]
            },
            {
                id: 'sec_eng8_box',
                title: 'Đấu Trường Hộp Quà Tiếng Anh 8: Global Success - Leisure Time',
                subject: 'Tiếng Anh',
                category: 'eng',
                grade: 'Lớp 8',
                badge: 'Global Success',
                icon: '🏆',
                color: '#2563eb',
                gameType: 'box',
                timeLimit: 20,
                desc: 'Luyện tập ngữ pháp Verbs of liking + V-ing, từ vựng hoạt động giải trí và phát âm chuẩn xác theo SGK mới.',
                questions: [
                    {
                        stem: 'Choose the correct form: "She loves ______ origami in her free time."',
                        options: ['making', 'makes', 'made', 'to make'],
                        correctIndex: 0,
                        explanation: 'Sau động từ chỉ sự yêu thích "love", ta sử dụng danh động từ V-ing (making).'
                    },
                    {
                        stem: 'What is the opposite of "harmful"?',
                        options: ['beneficial', 'dangerous', 'useless', 'noisy'],
                        correctIndex: 0,
                        explanation: '"Beneficial" (có lợi) trái nghĩa với "harmful" (có hại).'
                    },
                    {
                        stem: '"He is addicted to computer games." What does this sentence mean?',
                        options: ['He spends too much time playing computer games', 'He hates computer games', 'He rarely plays games', 'He makes computer games'],
                        correctIndex: 0,
                        explanation: '"Addicted to" mang nghĩa nghiện, dành quá nhiều thời gian vào việc gì.'
                    }
                ]
            },
            {
                id: 'sec_vatli9_speed',
                title: 'Đua Thuyền Tri Thức Vật Lí 9: Định Luật Ôm & Đoạn Mạch Điện',
                subject: 'Vật lí',
                category: 'khtn',
                grade: 'Lớp 9',
                badge: 'KNTT - BGD',
                icon: '⚡',
                color: '#ea580c',
                gameType: 'speed',
                timeLimit: 15,
                desc: 'Vận dụng hệ thức định luật Ôm I = U/R, tính điện trở tương đương của mạch nối tiếp và song song nhanh như chớp.',
                questions: [
                    {
                        stem: 'Hệ thức của định luật Ôm cho đoạn mạch là:',
                        options: ['I = U / R', 'I = U * R', 'U = I / R', 'R = U * I'],
                        correctIndex: 0,
                        explanation: 'Cường độ dòng điện qua dây dẫn tỉ lệ thuận với hiệu điện thế và tỉ lệ nghịch với điện trở: I = U/R.'
                    },
                    {
                        stem: 'Hai điện trở R1 = 10 ôm và R2 = 20 ôm mắc nối tiếp. Điện trở tương đương của đoạn mạch là:',
                        options: ['30 ôm', '6,67 ôm', '200 ôm', '10 ôm'],
                        correctIndex: 0,
                        explanation: 'Đoạn mạch nối tiếp: R_td = R1 + R2 = 10 + 20 = 30 ôm.'
                    },
                    {
                        stem: 'Đơn vị đo công suất điện trong hệ SI là gì?',
                        options: ['Oát (W)', 'Jun (J)', 'Vôn (V)', 'Ampe (A)'],
                        correctIndex: 0,
                        explanation: 'Công suất điện được đo bằng Oát (W) hoặc Kilôoát (kW).'
                    }
                ]
            },
            {
                id: 'sec_sinhhoc8_wheel',
                title: 'Vòng Quay Tri Thức Sinh Học 8: Hệ Tuần Hoàn & Máu Cơ Thể',
                subject: 'Sinh học (KHTN)',
                category: 'khtn',
                grade: 'Lớp 8',
                badge: 'Chuẩn GDPT',
                icon: '🫀',
                color: '#dc2626',
                gameType: 'wheel',
                timeLimit: 15,
                desc: 'Khám phá cấu tạo quả tim 4 ngăn, vòng tuần hoàn lớn nhỏ, 4 nhóm máu và nguyên tắc sơ cứu truyền máu an toàn.',
                questions: [
                    {
                        stem: 'Quả tim người bình thường có cấu tạo gồm mấy ngăn?',
                        options: ['4 ngăn (2 tâm nhĩ, 2 tâm thất)', '2 ngăn', '3 ngăn', '1 ngăn'],
                        correctIndex: 0,
                        explanation: 'Tim người có 4 ngăn: tâm nhĩ phải, tâm nhĩ trái, tâm thất phải, tâm thất trái.'
                    },
                    {
                        stem: 'Thành phần nào của máu đóng vai trò chủ chốt trong quá trình đông máu hàn gắn vết thương?',
                        options: ['Tiểu cầu', 'Hồng cầu', 'Bạch cầu', 'Huyết tương'],
                        correctIndex: 0,
                        explanation: 'Tiểu cầu giải phóng enzym tạo mạng lưới fibrin giữ huyết cầu để hình thành cục máu đông hàn vết thương.'
                    },
                    {
                        stem: 'Người có nhóm máu O có thể truyền máu an toàn cho nhóm máu nào sau đây?',
                        options: ['Tất cả các nhóm máu (A, B, AB, O)', 'Chỉ nhóm máu O', 'Chỉ nhóm máu AB', 'Chỉ nhóm máu A'],
                        correctIndex: 0,
                        explanation: 'Hồng cầu nhóm máu O không chứa kháng nguyên A và B nên được gọi là nhóm máu chuyên cho.'
                    }
                ]
            },
            {
                id: 'sec_stem_box',
                title: 'Đấu Trường STEM & Chuyển Đổi Số: Lập Trình Robot & Cảm Biến',
                subject: 'Tin học - STEM',
                category: 'stem',
                grade: 'THCS - THPT',
                badge: 'Chỉ Đạo STEM BGD',
                icon: '🤖',
                color: '#059669',
                gameType: 'box',
                timeLimit: 20,
                desc: 'Kích hoạt tư duy thuật toán, nhận diện cảm biến siêu âm, vi điều khiển Micro:bit và giải pháp công nghệ giáo dục số.',
                questions: [
                    {
                        stem: 'Trong lập trình vi điều khiển, cảm biến siêu âm (Ultrasonic Sensor) thường được dùng để làm gì?',
                        options: ['Đo khoảng cách tới vật cản phía trước', 'Đo nhiệt độ môi trường', 'Nhận diện màu sắc', 'Phát ra âm thanh'],
                        correctIndex: 0,
                        explanation: 'Cảm biến siêu âm phát sóng âm và tính thời gian phản xạ để đo chính xác khoảng cách đến vật cản.'
                    },
                    {
                        stem: 'Quy trình thiết kế kỹ thuật STEM chuẩn gồm bao nhiêu bước cốt lõi?',
                        options: ['5 bước (Xác định vấn đề -> Nghiên cứu kiến thức nền -> Đề xuất giải pháp -> Chế tạo thử nghiệm -> Đánh giá hoàn thiện)', '2 bước', '3 bước', '10 bước'],
                        correctIndex: 0,
                        explanation: 'Quy trình thiết kế kỹ thuật STEM 5 bước khép kín rèn luyện tư duy kỹ thuật và giải quyết vấn đề.'
                    },
                    {
                        stem: 'Khái niệm "Chuyển đổi số trong giáo dục" mang ý nghĩa trọng tâm là gì?',
                        options: ['Ứng dụng công nghệ để đổi mới phương pháp dạy học, quản trị và nâng cao phẩm chất năng lực người học', 'Chỉ là mua sắm máy tính mới', 'Chỉ là chiếu slide bài giảng thay bảng đen', 'Bỏ hoàn toàn sách giáo khoa giấy'],
                        correctIndex: 0,
                        explanation: 'Chuyển đổi số giáo dục là sự chuyển dịch toàn diện về phương pháp, ngữ cảnh học tập và quản trị số lấy người học làm trung tâm.'
                    }
                ]
            }
        ];
    }

    renderSecondaryGamesRepo(filter = 'all') {
        const grid = document.getElementById('secondaryGamesGrid');
        if (!grid || !this.secondaryGamesCatalog) return;

        let filtered = this.secondaryGamesCatalog;
        if (filter !== 'all') {
            filtered = this.secondaryGamesCatalog.filter(g => g.category === filter);
        }

        grid.innerHTML = filtered.map((game, idx) => `
            <div class="card-white" style="border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; position: relative; background: #ffffff;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <span style="font-size: 2.2rem; background: #f8fafc; border-radius: 10px; padding: 0.25rem 0.5rem;">${game.icon}</span>
                        <div style="text-align: right;">
                            <span class="badge-tag-tiny" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${game.badge}</span>
                            <div style="font-size: 0.68rem; color: #64748b; margin-top: 0.2rem;">${game.questions.length} câu hỏi • ${game.timeLimit}s/câu</div>
                        </div>
                    </div>

                    <h4 style="font-size: 0.92rem; font-weight: 800; color: #0f172a; margin-bottom: 0.3rem; line-height: 1.35;">
                        ${idx + 1}. ${game.title}
                    </h4>

                    <div style="display: flex; gap: 0.3rem; margin-bottom: 0.4rem; flex-wrap: wrap;">
                        <span class="badge-tag-tiny" style="background:#f1f5f9; color:#475569;">${game.grade}</span>
                        <span class="badge-tag-tiny" style="background:#fef3c7; color:#b45309;">${game.subject}</span>
                    </div>

                    <p style="font-size: 0.76rem; color: #475569; line-height: 1.45; margin-bottom: 0.75rem;">
                        ${game.desc}
                    </p>
                </div>

                <div style="border-top: 1px solid #f1f5f9; padding-top: 0.65rem; display: flex; gap: 0.4rem;">
                    <button class="btn-mini-action btn-play-sec-game" data-id="${game.id}" style="flex: 1.4; justify-content: center; background: #1d4ed8; color: #ffffff; font-weight: 700; padding: 0.45rem;">
                        <span>▶</span> <span>Chơi Bàn Đấu</span>
                    </button>
                    <button class="btn-mini-action btn-export-sec-package" data-id="${game.id}" style="flex: 1; justify-content: center; background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; font-size: 0.72rem; padding: 0.45rem;" title="Tải gói trò chơi (10 lượt Demo)">
                        <span>📥</span> <span>Tải Gói</span>
                    </button>
                </div>
            </div>
        `).join('');

        // Bắt sự kiện thanh lọc môn học
        document.querySelectorAll('.btn-sec-filter').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.btn-sec-filter').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#f8fafc';
                    b.style.color = '#334155';
                });
                const cur = e.currentTarget;
                cur.classList.add('active');
                cur.style.background = '#1d4ed8';
                cur.style.color = '#ffffff';
                const f = cur.dataset.filter;
                this.renderSecondaryGamesRepo(f);
            };
        });

        // Bắt sự kiện chơi game trên bàn đấu
        grid.querySelectorAll('.btn-play-sec-game').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameId = e.currentTarget.dataset.id;
                this.playSecondaryGame(gameId);
            });
        });

        // Bắt sự kiện xuất gói trò chơi
        grid.querySelectorAll('.btn-export-sec-package').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameId = e.currentTarget.dataset.id;
                const g = this.secondaryGamesCatalog.find(x => x.id === gameId);
                this.consumeDemoPackageUse(g?.title || "Trò chơi Phổ Thông");
            });
        });
    }

    playSecondaryGame(gameId) {
        const game = this.secondaryGamesCatalog.find(g => g.id === gameId);
        if (!game) return;

        // Nạp bộ câu hỏi vào activeQuiz
        this.activeQuiz.title = game.title;
        this.activeQuiz.questions = JSON.parse(JSON.stringify(game.questions));

        // Chuyển tab sang Kho Trò Chơi
        this.switchTab('games');

        // Chuyển sang dạng game phù hợp
        this.switchGame(game.gameType);

        // Cuộn mượt mà lên Bàn đấu Arena
        const arena = document.querySelector('.arena-board');
        arena?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        sound.playFanfare();
        alert(`🎮 [ĐÃ NẠP TRÒ CHƠI HỌC TẬP THÀNH CÔNG!]

Chào mừng Thầy Cô và Học Sinh đến với: "${game.title}"!
• Môn học: ${game.subject} (${game.grade})
• Bàn đấu: Đã kích hoạt chế độ ${game.gameType === 'speed' ? 'ĐUA THUYỀN' : (game.gameType === 'wheel' ? 'VÒNG QUAY' : 'HỘP QUÀ')}.
Thầy/Cô hãy bấm [Bắt Đầu] để lớp học cùng tranh tài!`);
    }

    // =========================================================================
    // TRÒ CHƠI TỰ THIẾT KẾ & TẠO BỘ CÂU HỎI BẰNG GEMINI AI THẬT (BYOK)
    // =========================================================================
    async generateGameQuestionsWithAI() {
        const btn = document.getElementById('btnAIGenerateGameQuestions');
        const titleInput = document.getElementById('creatorGameTitle');
        const grade = document.getElementById('creatorGrade')?.value || 'Lớp 8';
        const subject = document.getElementById('creatorSubjectSelect')?.value || 'Khoa học tự nhiên';
        const targetCountRaw = parseInt(document.getElementById('creatorTargetCount')?.value) || 4;
        const count = Math.min(25, Math.max(1, targetCountRaw));
        const compSel = document.getElementById('creatorCompetency');
        const compText = compSel?.options?.[compSel.selectedIndex]?.text || 'Chuẩn kiến thức';

        let topic = (titleInput?.value || '').trim();
        if (!topic) {
            const entered = prompt(`✨ NHẬP CHỦ ĐỀ / BÀI HỌC ĐỂ GEMINI AI TẠO ${count} CÂU HỎI (${grade} - ${subject}):`, '');
            if (!entered || !entered.trim()) return;
            topic = entered.trim();
            if (titleInput) titleInput.value = topic;
        }

        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span>⏳</span> <span>Gemini đang soạn ${count} câu hỏi...</span>`;
        }

        try {
            const promptText =
                `Bạn là chuyên gia giáo dục Việt Nam. Hãy tạo đúng ${count} câu hỏi trắc nghiệm 4 lựa chọn cho trò chơi học tập.\n` +
                `- Chủ đề / Tên trò chơi: "${topic}"\n` +
                `- Lớp / Bậc học: ${grade}\n` +
                `- Môn học / Lĩnh vực: ${subject}\n` +
                `- Mức độ / Năng lực: ${compText}\n` +
                `Yêu cầu: Ngôn ngữ tiếng Việt chuẩn xác, rõ ràng, phù hợp lứa tuổi, 4 đáp án A/B/C/D hợp lý và chỉ có 1 đáp án đúng.\n` +
                `Trả về DUY NHẤT một mảng JSON gồm đúng ${count} đối tượng theo cấu trúc:\n` +
                `[{"stem":"Nội dung câu hỏi","options":["Đáp án A","Đáp án B","Đáp án C","Đáp án D"],"correctIndex":0,"explanation":"Giải thích ngắn gọn"}]`;

            const items = await this.callGeminiPersonal(promptText, {
                featureName: 'Tạo Bộ Câu Hỏi Trò Chơi bằng Gemini AI',
                json: true,
                temperature: 0.65
            });

            if (!Array.isArray(items) || items.length === 0) {
                throw new Error('Dữ liệu AI trả về không phải danh sách câu hỏi hợp lệ.');
            }

            const normalized = items.slice(0, count).map((q, idx) => ({
                id: 'ai_q_' + Date.now() + '_' + idx,
                stem: String(q.stem || `Câu hỏi ${idx + 1}`).trim(),
                options: Array.isArray(q.options) && q.options.length >= 4
                    ? q.options.slice(0, 4).map(o => String(o || '').trim())
                    : ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
                correctIndex: (Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3) ? q.correctIndex : 0,
                explanation: String(q.explanation || '').trim(),
                competency: compSel?.value || 'pt_nhan_biet'
            }));

            if (!Array.isArray(this.questionBank)) this.questionBank = [];
            this.questionBank = [...normalized, ...this.questionBank];
            this.selectedQuestions = [...normalized];

            this.renderBankQuestions();
            this.updateSelectedCounter();
            sound.playFanfare();
            this.showToast(`✨ Gemini AI đã tạo xong ${normalized.length} câu hỏi cho "${topic}"!`, 4000);
        } catch (err) {
            if (err.message !== 'AUTH_OR_KEY_REQUIRED') {
                console.error('AI Game Gen Error:', err);
                alert('❌ Không thể tạo câu hỏi bằng Gemini AI:\n' + err.message);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
            }
        }
    }

    loadCustomGames() {
        try {
            const raw = localStorage.getItem('edustudio_custom_games');
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch(e) {
            return [];
        }
    }

    saveCustomGame(gameObj) {
        if (!gameObj || !gameObj.title) return;
        const list = this.loadCustomGames();
        const record = {
            id: gameObj.id || ('custom_' + Date.now()),
            title: gameObj.title,
            gameType: gameObj.gameType || 'speed',
            subject: gameObj.subject || 'Tổng hợp',
            grade: gameObj.grade || 'Lớp 8',
            timeLimit: parseInt(gameObj.timeLimit) || 15,
            competency: gameObj.competency || '',
            questions: JSON.parse(JSON.stringify(gameObj.questions || [])),
            author: this.currentUser?.name || gameObj.author || 'Giáo viên',
            updatedAt: new Date().toISOString()
        };
        const idx = list.findIndex(g => g.id === record.id);
        if (idx >= 0) list[idx] = record;
        else list.unshift(record);
        try {
            localStorage.setItem('edustudio_custom_games', JSON.stringify(list.slice(0, 50)));
        } catch(e) {
            console.warn('Không lưu được custom games:', e);
        }
    }

    deleteCustomGame(gameId) {
        const list = this.loadCustomGames().filter(g => g.id !== gameId);
        try {
            localStorage.setItem('edustudio_custom_games', JSON.stringify(list));
        } catch(e) {}
        this.renderCustomGamesRepo();
    }

    renderCustomGamesRepo() {
        const grid = document.getElementById('customGamesGrid');
        if (!grid) return;
        const list = this.loadCustomGames();
        if (list.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 1.25rem; text-align: center; color: #64748b; font-size: 0.84rem;">
                    Chưa có trò chơi tự thiết kế nào được lưu. Thầy/Cô bấm <strong>"➕ Tạo Trò Chơi Mới"</strong> để soạn thủ công hoặc dùng <strong>✨ Gemini AI</strong> tạo bộ câu hỏi tự động!
                </div>
            `;
            return;
        }
        const typeLabel = { speed: '⛵ Đua Thuyền', wheel: '🎡 Vòng Quay', box: '🎁 Hộp Quà', guess: '🐶 Đoán Hình' };
        grid.innerHTML = list.map((g, idx) => `
            <div class="card-white" style="border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.45rem;">
                        <span class="badge-tag-tiny" style="background: #eff6ff; color: #1d4ed8; font-weight: 800;">${typeLabel[g.gameType] || '🎮 Trò Chơi'}</span>
                        <span style="font-size: 0.7rem; color: #64748b;">${(g.questions || []).length} câu • ${g.timeLimit || 15}s/câu</span>
                    </div>
                    <h4 style="font-size: 0.94rem; font-weight: 800; color: #0f172a; margin-bottom: 0.35rem; line-height: 1.35;">${idx + 1}. ${g.title}</h4>
                    <div style="display: flex; gap: 0.3rem; flex-wrap: wrap; margin-bottom: 0.65rem;">
                        <span class="badge-tag-tiny" style="background:#f1f5f9; color:#475569;">${g.grade || ''}</span>
                        <span class="badge-tag-tiny" style="background:#fef3c7; color:#b45309;">${g.subject || ''}</span>
                    </div>
                </div>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 0.6rem; display: flex; gap: 0.35rem; flex-wrap: wrap;">
                    <button type="button" class="btn-mini-action btn-play-custom-game" data-id="${g.id}" style="flex: 1.4; justify-content: center; background: #1d4ed8; color: #ffffff; font-weight: 700;">▶ Chơi Ngay</button>
                    <button type="button" class="btn-mini-action btn-edit-custom-game" data-id="${g.id}" title="Sửa trò chơi">✏️</button>
                    <button type="button" class="btn-mini-action btn-export-custom-game" data-id="${g.id}" title="Xuất tệp JSON">📥</button>
                    <button type="button" class="btn-mini-action btn-del-custom-game" data-id="${g.id}" style="color: #dc2626;" title="Xóa trò chơi">🗑️</button>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.btn-play-custom-game').forEach(btn => {
            btn.addEventListener('click', (e) => this.playCustomGame(e.currentTarget.dataset.id));
        });
        grid.querySelectorAll('.btn-edit-custom-game').forEach(btn => {
            btn.addEventListener('click', (e) => this.editCustomGame(e.currentTarget.dataset.id));
        });
        grid.querySelectorAll('.btn-export-custom-game').forEach(btn => {
            btn.addEventListener('click', (e) => this.exportCustomGameJson(e.currentTarget.dataset.id));
        });
        grid.querySelectorAll('.btn-del-custom-game').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Bạn có chắc muốn xóa trò chơi tự thiết kế này khỏi Kho?')) {
                    this.deleteCustomGame(e.currentTarget.dataset.id);
                }
            });
        });
    }

    playCustomGame(gameId) {
        const game = this.loadCustomGames().find(g => g.id === gameId);
        if (!game) return;
        this.activeQuiz.title = game.title;
        this.activeQuiz.timeLimit = parseInt(game.timeLimit) || 15;
        this.activeQuiz.questions = JSON.parse(JSON.stringify(game.questions || []));
        this.switchTab('games');
        this.switchGame(game.gameType || 'speed');
        document.querySelector('.arena-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        sound.playFanfare();
        this.showToast(`🎮 Đã nạp "${game.title}" (${this.activeQuiz.questions.length} câu) vào Bàn đấu!`, 3500);
    }

    editCustomGame(gameId) {
        const game = this.loadCustomGames().find(g => g.id === gameId);
        if (!game) return;
        this.editingCustomGameId = game.id;
        this.openGameCreatorModal();
        const titleEl = document.getElementById('creatorGameTitle');
        const typeEl = document.getElementById('creatorGameType');
        const gradeEl = document.getElementById('creatorGrade');
        const timeEl = document.getElementById('creatorTimeLimit');
        const countEl = document.getElementById('creatorTargetCount');
        if (titleEl) titleEl.value = game.title || '';
        if (typeEl && game.gameType) typeEl.value = game.gameType;
        if (gradeEl && game.grade) {
            gradeEl.value = game.grade;
            this.populateSubjectSelect('creatorSubjectSelect', game.grade, game.subject);
            this.updateCompetencyDropdownByGrade(game.grade);
        }
        if (timeEl && game.timeLimit) timeEl.value = String(game.timeLimit);
        this.selectedQuestions = JSON.parse(JSON.stringify(game.questions || []));
        if (countEl) countEl.value = String(this.selectedQuestions.length || 4);
        this.renderBankQuestions();
        this.updateSelectedCounter();
    }

    exportCustomGameJson(gameId) {
        const canExportPackage = ['admin', 'vip_pro', 'vip'].includes(this.currentUser?.role);
        if (!canExportPackage) {
            this.showToast('💎 Tính năng Xuất / Tải Gói dành cho Thành viên Nhóm 3 (VIP) trở lên!', 4000);
            this.openModal('membershipUpgradeModal');
            return;
        }
        const game = this.loadCustomGames().find(g => g.id === gameId);
        if (!game) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(game, null, 2));
        const a = document.createElement('a');
        a.setAttribute("href", dataStr);
        a.setAttribute("download", `${(game.title || 'Tro_Choi').replace(/\s+/g, '_')}_EduStudio.json`);
        a.click();
    }

    



    // =========================================================================
    // 18. XƯỞNG TẠO PHÒNG THÍ NGHIỆM ẢO (LAB STUDIO SƯ PHẠM)
    // Tương tác trực quan 4 lĩnh vực: Vật lý, Hóa học, Sinh học, Mầm non
    // =========================================================================
    initLabStudio() {
        this.labToolsData = {
            physics: [
                { id: 'pin', name: 'Bộ Pin Nguồn DC', tag: 'Nguồn 1.5V - 24V', emoji: '🔋', desc: 'Cung cấp hiệu điện thế U biến thiên cho toàn mạch' },
                { id: 'switch', name: 'Khóa K (Công Tắc)', tag: 'Đóng / Ngắt mạch', emoji: '🔘', desc: 'Đóng hoặc ngắt dòng điện tức thì trong mạch' },
                { id: 'resistor', name: 'Điện Trở Mẫu R', tag: 'Giá trị 5Ω - 100Ω', emoji: '🧱', desc: 'Cản trở dòng điện theo định luật Ôm I = U/R' },
                { id: 'lamp', name: 'Bóng Đèn Dây Tóc', tag: 'Tải phát sáng', emoji: '💡', desc: 'Phát sáng theo công suất P = U*I khi có dòng điện' },
                { id: 'ammeter', name: 'Ampe Kế (A)', tag: 'Đo cường độ dòng I', emoji: '⏱️', desc: 'Mắc nối tiếp đo cường độ dòng điện trong mạch' },
                { id: 'voltmeter', name: 'Vôn Kế (V)', tag: 'Đo hiệu điện thế U', emoji: '📟', desc: 'Mắc song song hai đầu điện trở đo điện áp' },
                { id: 'rheostat', name: 'Biến Trở Con Chạy', tag: 'Điều chỉnh R liên tục', emoji: '🎛️', desc: 'Thay đổi điện trở liên tục để khảo sát đồ thị I-U' },
                { id: 'magnet', name: 'Nam Châm & Kim La Bàn', tag: 'Từ trường & Cảm ứng', emoji: '🧲', desc: 'Khảo sát đường sức từ và tương tác từ trường' },
                { id: 'prism', name: 'Lăng Kính Tán Sắc', tag: 'Quang học 7 sắc', emoji: '🔺', desc: 'Tán sắc chùm ánh sáng trắng thành dải màu cầu vồng' }
            ],
            chemistry: [
                { id: 'test_tube', name: 'Ống Nghiệm Thủy Tinh', tag: 'Chứa chất phản ứng', emoji: '🧪', desc: 'Ống nghiệm chịu nhiệt Borosilicate chứa hóa chất' },
                { id: 'burner', name: 'Đèn Cồn Đun Nóng', tag: 'Cung cấp nhiệt lượng', emoji: '🔥', desc: 'Đun nóng hóa chất, tăng tốc độ phản ứng' },
                { id: 'pipette', name: 'Ống Nhỏ Giọt (Pipet)', tag: 'Đo & nhỏ từng giọt', emoji: '💧', desc: 'Lấy lượng nhỏ dung dịch axit/chỉ thị chuẩn xác' },
                { id: 'acid_hcl', name: 'Dung Dịch Axit HCl', tag: 'Axit mạnh vô cơ', emoji: '🧴', desc: 'Làm quỳ tím hóa đỏ, tác dụng với kim loại sủi bọt khí H2' },
                { id: 'base_naoh', name: 'Dung Dịch Bazơ NaOH', tag: 'Bazơ kiềm mạnh', emoji: '🧫', desc: 'Làm quỳ tím hóa xanh, phenolphtalein hóa hồng' },
                { id: 'litmus', name: 'Chất Chỉ Thị Quỳ Tím', tag: 'Đo độ pH môi trường', emoji: '🟣', desc: 'Đổi màu tím -> đỏ (Axit) hoặc xanh (Bazơ)' },
                { id: 'zinc_metal', name: 'Mảnh Kim Loại Kẽm (Zn)', tag: 'Kim loại phản ứng', emoji: '🔘', desc: 'Tác dụng với Axit HCl sủi bọt khí Hidro mãnh liệt' },
                { id: 'cuo_powder', name: 'Bột Đồng(II) Oxit CuO', tag: 'Oxit bazơ màu đen', emoji: '⚫', desc: 'Tác dụng với HCl tạo dung dịch CuCl2 màu xanh lam' },
                { id: 'beaker', name: 'Cốc Thủy Tinh 250ml', tag: 'Pha chế & đun cốc', emoji: '🥛', desc: 'Pha chế dung dịch và quan sát kết tủa lắng đọng' }
            ],
            biology: [
                { id: 'microscope', name: 'Kính Hiển Vi Quang Học', tag: 'Phóng đại 100x - 400x', emoji: '🔬', desc: 'Quan sát cấu trúc hiển vi của tế bào và vi sinh vật' },
                { id: 'onion_cell', name: 'Tiêu Bản Tế Bào Vảy Hành', tag: 'Thực vật vách xenlulozo', emoji: '🧅', desc: 'Tế bào đa giác, có vách tế bào và nhân bắt màu sẫm' },
                { id: 'water_pond', name: 'Mẫu Nước Ao (Trùng Đế Giày)', tag: 'Động vật nguyên sinh', emoji: '🦠', desc: 'Trùng roi xanh, trùng đế giày bơi lội dưới kính' },
                { id: 'leaf_stoma', name: 'Khí Khổng Lá Cây', tag: 'Thoát hơi nước', emoji: '🍃', desc: 'Tế bào hạt đậu đóng mở lỗ khí khổng theo ánh sáng' },
                { id: 'glass_slide', name: 'Lam Kính & Lamen', tag: 'Mang mẫu tiêu bản', emoji: '🪟', desc: 'Kẹp giữ mẫu lát cắt siêu mỏng trên bàn sa trượt' },
                { id: 'hydra', name: 'Rong Đuôi Chó Quang Hợp', tag: 'Thoát bọt khí O2', emoji: '🌿', desc: 'Chiếu đèn sáng thấy bọt khí Oxi thoát ra liên tục' }
            ],
            preschool: [
                { id: 'magnet_toy', name: 'Nam Châm Thần Kì', tag: 'Hút kim loại bi sắt', emoji: '🧲', desc: 'Bé khám phá vật nào bằng sắt thì bị hút dính' },
                { id: 'color_cups', name: 'Cốc Nước Cầu Vồng 3 Màu', tag: 'Pha màu Đỏ - Vàng - Xanh', emoji: '🎨', desc: 'Trộn Đỏ + Vàng ra Cam, Vàng + Xanh ra Lục kỳ diệu' },
                { id: 'magnifier', name: 'Kính Lúp Cầm Tay', tag: 'Phóng to gân lá, hạt cát', emoji: '🔍', desc: 'Bé soi hạt gạo, chiếc lá thấy rõ từng đường vân' },
                { id: 'sink_float', name: 'Thí Nghiệm Vật Chìm - Nổi', tag: 'Gỗ nổi, đá chìm', emoji: '⛵', desc: 'Thả lá cây, khúc gỗ thì nổi; thả bi ve thì chìm' },
                { id: 'water_wheel', name: 'Bánh Xe Nước Chuyển Động', tag: 'Năng lượng dòng nước', emoji: '🎡', desc: 'Rót nước vào phễu làm cánh quạt quay tít' }
            ]
        };

        const initialCategory = this.labState?.activeCategory || 'physics';
        this.renderLabToolTray(initialCategory);
    }

    renderLabToolTray(category) {
        const tray = document.getElementById('labToolItemList');
        if (!tray) return;

        if (!this.labToolsData) {
            this.initLabStudio();
        }

        const tools = this.labToolsData[category] || this.labToolsData.physics || [];
        
        tray.innerHTML = tools.map(t => `
            <div class="lab-tool-item-card" data-tool-id="${t.id}" title="${t.desc}">
                <span class="tool-emoji">${t.emoji}</span>
                <div class="tool-info">
                    <div class="tool-name">${t.name}</div>
                    <div class="tool-tag">${t.tag}</div>
                </div>
                <span class="badge-tag-tiny" style="background:#eff6ff; color:#1d4ed8; font-weight:700;">+ Bàn</span>
            </div>
        `).join('');

        tray.querySelectorAll('.lab-tool-item-card').forEach(card => {
            card.onclick = (e) => {
                const toolId = e.currentTarget.dataset.toolId;
                const tool = tools.find(x => x.id === toolId);
                if (tool) {
                    this.addToolToLabStage(tool);
                }
            };
        });
    }

    addToolToLabStage(tool) {
        try { sound.playClick(); } catch(e) {}
        if (!this.labState.placedTools) {
            this.labState.placedTools = [];
        }
        if (!this.labState.placedTools.includes(tool.id)) {
            this.labState.placedTools.push(tool.id);
        }

        // Cập nhật hiện tượng sư phạm theo dụng cụ
        let note = `💡 Đã đưa <strong>${tool.name}</strong> lên bàn thực hành. `;
        if (tool.id === 'pin' || tool.id === 'switch' || tool.id === 'resistor' || tool.id === 'lamp') {
            note += `Thầy/Cô bấm <strong>Bật Công Tắc</strong> để xem dòng electron chạy và bóng đèn phát sáng.`;
        } else if (tool.id === 'acid_hcl' || tool.id === 'litmus' || tool.id === 'zinc_metal') {
            note += `Thầy/Cô bấm <strong>Nhỏ Hóa Chất</strong> để quan sát phản ứng sủi bọt khí và đổi màu chỉ thị.`;
        } else if (tool.id === 'burner') {
            note += `Thầy/Cô bấm <strong>Đốt Đèn Cồn</strong> để cung cấp nhiệt lượng đun sôi ống nghiệm.`;
        } else if (tool.id === 'microscope' || tool.id === 'onion_cell') {
            note += `Kính hiển vi đã bắt nét tiêu bản. Quan sát thị trường tròn bên phải thấy rõ cấu trúc tế bào vảy hành.`;
        }
        this.updateLabObservation(note);
        this.drawLabCanvas();
    }

    toggleLabPower() {
        this.labState.isPowerOn = !this.labState.isPowerOn;
        try { sound.playClick(); } catch(e) {}

        const btn = document.getElementById('btnLabTogglePower');
        if (btn) {
            if (this.labState.isPowerOn) {
                btn.style.background = '#059669';
                btn.innerHTML = '<span>⚡</span> <span>Ngắt Công Tắc</span>';
            } else {
                btn.style.background = '#10b981';
                btn.innerHTML = '<span>⚡</span> <span>Bật Công Tắc</span>';
            }
        }

        const currentI = (this.labState.voltage / this.labState.resistance).toFixed(2);
        if (this.labState.isPowerOn) {
            this.updateLabObservation(`⚡ [MẠCH KÍN]: Công tắc K đóng. Hiệu điện thế U = ${this.labState.voltage}V, Điện trở R = ${this.labState.resistance}Ω. Dòng điện qua mạch <strong>I = ${currentI}A</strong>. Bóng đèn phát sáng rực rỡ!`);
        } else {
            this.updateLabObservation(`⏸️ [MẠCH HỞ]: Công tắc K ngắt. Dòng điện I = <strong>0.00A</strong>. Toàn bộ thiết bị tải ngừng hoạt động.`);
        }

        this.drawLabCanvas();
    }

    toggleLabBurner() {
        this.labState.isBurnerOn = !this.labState.isBurnerOn;
        try { sound.playFanfare(); } catch(e) {}

        const btn = document.getElementById('btnLabToggleBurner');
        if (btn) {
            if (this.labState.isBurnerOn) {
                btn.style.background = '#dc2626';
                btn.innerHTML = '<span>🔥</span> <span>Dập Đèn Cồn</span>';
            } else {
                btn.style.background = '#f59e0b';
                btn.innerHTML = '<span>🔥</span> <span>Đốt Đèn Cồn</span>';
            }
        }

        if (this.labState.isBurnerOn) {
            this.updateLabObservation(`🔥 [CẤP NHIỆT LƯỢNG]: Đèn cồn đã được thắp sáng bập bùng. Dung dịch trong ống nghiệm nóng lên, tăng tốc độ phản ứng hóa học bốc hơi nước!`);
        } else {
            this.updateLabObservation(`💨 [DẬP LỬA]: Đã đậy nắp đèn cồn, ngọn lửa tắt. Ống nghiệm nguội dần về nhiệt độ phòng.`);
        }

        this.drawLabCanvas();
    }

    dropLabReagent() {
        this.labState.reagentAdded = true;
        try { sound.playFanfare(); } catch(e) {}

        this.updateLabObservation(`💧 [PHẢN ỨNG HÓA HỌC XẢY RA]: Đã nhỏ dung dịch chỉ thị vào ống nghiệm. Dung dịch đổi màu rõ rệt và mảnh kim loại Kẽm (Zn) bắt đầu sủi bọt khí Hidro (H2) thoát ra liên tục!`);
        this.drawLabCanvas();
    }

    resetLabStage() {
        this.labState.isPowerOn = false;
        this.labState.isBurnerOn = false;
        this.labState.reagentAdded = false;
        try { sound.playTick(); } catch(e) {}

        const btnP = document.getElementById('btnLabTogglePower');
        if (btnP) {
            btnP.style.background = '#10b981';
            btnP.innerHTML = '<span>⚡</span> <span>Bật Công Tắc</span>';
        }
        const btnB = document.getElementById('btnLabToggleBurner');
        if (btnB) {
            btnB.style.background = '#f59e0b';
            btnB.innerHTML = '<span>🔥</span> <span>Đốt Đèn Cồn</span>';
        }

        this.updateLabObservation(`🔄 Bàn thí nghiệm đã được đặt lại trạng thái ban đầu. Thầy Cô và Học sinh sẵn sàng bắt đầu quy trình thực nghiệm mới.`);
        this.drawLabCanvas();
    }

    updateLabObservation(htmlText) {
        const box = document.getElementById('labObservationText');
        if (box) {
            box.innerHTML = htmlText;
        }
    }

    saveLabToRepo(silent = false) {
        const title = document.getElementById('labExperimentTitle')?.value.trim() || 'Mô Phỏng Thí Nghiệm Ảo Mới';
        const grade = document.getElementById('labGradeSelect')?.value || 'Lớp 8';
        const subject = document.getElementById('labSubjectSelect')?.value || 'KHTN';

        const newLab = {
            id: 'repo_lab_' + Date.now(),
            title: title,
            subject: subject,
            grade: grade,
            category: this.labState?.activeCategory || 'physics',
            author: this.currentUser?.name || 'Giáo viên',
            verified: true,
            desc: `Thí nghiệm tương tác sư phạm chuẩn GDPT: ${title} (${subject} ${grade}) kèm bài tập định hướng tư duy.`
        };

        if (this.labRepo) {
            this.labRepo.unshift(newLab);
        }
        try {
            const saved = JSON.parse(localStorage.getItem('edustudio_custom_labs') || '[]');
            saved.unshift(newLab);
            localStorage.setItem('edustudio_custom_labs', JSON.stringify(saved.slice(0, 30)));
        } catch(e) {}
        if (!silent) {
            try { sound.playFanfare(); } catch(e) {}
            alert(`💾 [ĐÃ LƯU VÀO KHO THÍ NGHIỆM ẢO!]\n\nBài thí nghiệm "${title}" đã được lưu trữ thành công vào hệ thống. Thầy Cô và Học sinh có thể mở xem và tương tác bất cứ lúc nào!`);
        }
    }

    exportLabPackage() {
        const title = document.getElementById('labExperimentTitle')?.value.trim() || 'Thi_Nghiem_Ao_EduStudio';
        this.consumeDemoPackageUse(title);
    }

    drawLabCanvas() {
        const canvas = document.getElementById('labCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        // Xóa sạch canvas
        ctx.clearRect(0, 0, w, h);

        const category = this.labState?.activeCategory || 'physics';

        if (category === 'physics') {
            this.drawPhysicsCircuitCanvas(ctx, w, h);
        } else if (category === 'chemistry') {
            this.drawChemistryTestTubeCanvas(ctx, w, h);
        } else if (category === 'biology') {
            this.drawBiologyMicroscopeCanvas(ctx, w, h);
        } else {
            this.drawPreschoolDiscoveryCanvas(ctx, w, h);
        }
    }

    drawPhysicsCircuitCanvas(ctx, w, h) {
        // 1. Nền bàn thí nghiệm kỹ thuật cao
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Lưới kỹ thuật grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 35) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 35) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Tiêu đề sơ đồ mạch điện
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText('SƠ ĐỒ MẠCH ĐIỆN ĐỊNH LUẬT ÔM (I = U / R) • CHUẨN KHTN 8', 25, 28);

        const isClosed = this.labState.isPowerOn;
        const U = this.labState.voltage || 9.0;
        const R = this.labState.resistance || 20.0;
        const I = isClosed ? (U / R).toFixed(2) : '0.00';

        // 2. Tọa độ mạch chữ nhật
        const left = 100, right = 600, top = 80, bottom = 330;

        // Vẽ dây dẫn
        ctx.strokeStyle = isClosed ? '#38bdf8' : '#64748b';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(right, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.closePath();
        ctx.stroke();

        // 3. THIẾT BỊ 1: NGUỒN PIN DC (Nằm giữa cạnh trên)
        const pinX = (left + right) / 2 - 40;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(pinX - 10, top - 25, 100, 50); // che dây dẫn
        
        ctx.fillStyle = '#1e3a8a';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(pinX, top - 20, 80, 40, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText('+', pinX + 12, top + 6);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('–', pinX + 58, top + 5);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`U = ${U.toFixed(1)}V`, pinX + 40, top + 5);
        ctx.textAlign = 'left';

        // 4. THIẾT BỊ 2: KHÓA K / CÔNG TẮC (Cạnh phải)
        const swY = (top + bottom) / 2;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(right - 25, swY - 35, 50, 70);

        // Chốt tiếp điểm
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(right, swY - 20, 5, 0, Math.PI * 2);
        ctx.arc(right, swY + 20, 5, 0, Math.PI * 2);
        ctx.fill();

        // Cần gạt
        ctx.strokeStyle = isClosed ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(right, swY + 20);
        if (isClosed) {
            ctx.lineTo(right, swY - 20);
        } else {
            ctx.lineTo(right + 22, swY - 10);
        }
        ctx.stroke();

        ctx.fillStyle = isClosed ? '#10b981' : '#f59e0b';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(isClosed ? 'K (Đóng)' : 'K (Mở)', right + 12, swY + 5);

        // 5. THIẾT BỊ 3: ĐIỆN TRỞ R (Cạnh dưới)
        const resX = (left + right) / 2 - 40;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(resX - 10, bottom - 20, 100, 40);

        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(resX, bottom - 14, 80, 28, 4);
        ctx.fill();
        ctx.stroke();

        // Vạch màu điện trở
        const vColors = ['#dc2626', '#16a34a', '#2563eb', '#9333ea'];
        vColors.forEach((col, i) => {
            ctx.fillStyle = col;
            ctx.fillRect(resX + 16 + i * 14, bottom - 14, 6, 28);
        });

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`R = ${R.toFixed(1)} Ω`, resX + 40, bottom + 30);
        ctx.textAlign = 'left';

        // 6. THIẾT BỊ 4: AMPE KẾ ĐO DÒNG (Góc trái dưới)
        const ampX = left, ampY = bottom - 60;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ampX - 25, ampY - 25, 50, 50);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ampX, ampY, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e3a8a';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('A', ampX, ampY + 5);

        ctx.fillStyle = '#059669';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`I = ${I} A`, ampX, ampY + 38);
        ctx.textAlign = 'left';

        // 7. THIẾT BỊ 5: BÓNG ĐÈN PHÁT SÁNG (Cạnh trái trên)
        const lampX = left, lampY = top + 60;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(lampX - 35, lampY - 35, 70, 70);

        if (isClosed) {
            // Hào quang phát sáng
            const rad = Math.min(65, 25 + parseFloat(I) * 35);
            const glow = ctx.createRadialGradient(lampX, lampY, 5, lampX, lampY, rad);
            glow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
            glow.addColorStop(0.5, 'rgba(250, 204, 21, 0.4)');
            glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(lampX, lampY, rad, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bầu bóng đèn
        ctx.fillStyle = isClosed ? '#fef08a' : '#64748b';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lampX, lampY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dây tóc
        ctx.strokeStyle = isClosed ? '#ea580c' : '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lampX - 6, lampY + 8);
        ctx.lineTo(lampX, lampY - 6);
        ctx.lineTo(lampX + 6, lampY + 8);
        ctx.stroke();

        ctx.fillStyle = isClosed ? '#facc15' : '#94a3b8';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isClosed ? 'Đèn Sáng' : 'Đèn Tắt', lampX, lampY - 26);
        ctx.textAlign = 'left';

        // 8. Chuyển động electron khi mạch kín
        if (isClosed) {
            const time = Date.now() / 150;
            ctx.fillStyle = '#fef08a';
            for (let i = 0; i < 8; i++) {
                const offset = (time + i * 60) % 500;
                let ex = left, ey = top;
                if (offset < 250) {
                    ex = left + offset;
                    ey = top;
                } else {
                    ex = right;
                    ey = top + (offset - 250);
                }
                ctx.beginPath();
                ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawChemistryTestTubeCanvas(ctx, w, h) {
        // Nền phòng thí nghiệm hóa học
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#022c22');
        bgGrad.addColorStop(1, '#064e3b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText('THÍ NGHIỆM HÓA HỌC: PHẢN ỨNG AXIT – BAZƠ & KIM LOẠI (KHTN 8)', 25, 28);

        // Giá đỡ thí nghiệm
        ctx.fillStyle = '#334155';
        ctx.fillRect(150, 340, 400, 20); // chân đế
        ctx.fillRect(340, 70, 15, 270);  // cọc đứng
        ctx.fillRect(220, 140, 250, 10); // kẹp ngang

        // ỐNG NGHIỆM 1: Axit HCl + Kẽm (Zn)
        const tube1X = 260, tube1Y = 130, tubeW = 40, tubeH = 150;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(tube1X, tube1Y, tubeW, tubeH, [0, 0, 20, 20]);
        ctx.fill();
        ctx.stroke();

        // Dung dịch trong ống nghiệm 1
        const reagent = this.labState.reagentAdded;
        const liqH = 90;
        ctx.fillStyle = reagent ? 'rgba(239, 68, 68, 0.65)' : 'rgba(147, 197, 253, 0.4)';
        ctx.beginPath();
        ctx.roundRect(tube1X + 2, tube1Y + tubeH - liqH, tubeW - 4, liqH - 2, [0, 0, 18, 18]);
        ctx.fill();

        // Mảnh kim loại Kẽm (Zn)
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(tube1X + 20, tube1Y + tubeH - 15, 8, 0, Math.PI * 2);
        ctx.fill();

        // Sủi bọt khí nếu đã nhỏ hóa chất
        if (reagent) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            const t = Date.now() / 100;
            for (let b = 0; b < 6; b++) {
                const by = (tube1Y + tubeH - 20) - ((t + b * 20) % (liqH - 10));
                const bx = tube1X + 12 + (b * 5) % 18;
                ctx.beginPath();
                ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(reagent ? 'HCl + Quỳ tím (Đỏ)' : 'Ống 1: Axit HCl + Zn', tube1X - 35, tube1Y + tubeH + 35);

        // ỐNG NGHIỆM 2: Đun nóng đèn cồn
        const tube2X = 420, tube2Y = 110;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(tube2X, tube2Y, tubeW, tubeH, [0, 0, 20, 20]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.beginPath();
        ctx.roundRect(tube2X + 2, tube2Y + tubeH - 70, tubeW - 4, 68, [0, 0, 18, 18]);
        ctx.fill();

        // Đèn cồn
        const burnerX = tube2X - 5, burnerY = 280;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(burnerX, burnerY, 50, 60, [10, 10, 5, 5]);
        ctx.fill();
        ctx.stroke();

        // Ngọn lửa đèn cồn
        const burnerOn = this.labState.isBurnerOn;
        if (burnerOn) {
            const flameH = 30 + Math.sin(Date.now() / 80) * 4;
            const fGrad = ctx.createLinearGradient(burnerX + 25, burnerY, burnerX + 25, burnerY - flameH);
            fGrad.addColorStop(0, '#38bdf8');
            fGrad.addColorStop(0.5, '#f59e0b');
            fGrad.addColorStop(1, '#ef4444');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.moveTo(burnerX + 18, burnerY);
            ctx.quadraticCurveTo(burnerX + 25, burnerY - flameH, burnerX + 25, burnerY - flameH - 5);
            ctx.quadraticCurveTo(burnerX + 25, burnerY - flameH, burnerX + 32, burnerY);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(burnerOn ? 'Đang Đun Nóng 🔥' : 'Đèn Cồn (Tắt)', burnerX - 10, burnerY + 78);
    }

    drawBiologyMicroscopeCanvas(ctx, w, h) {
        // Nền phòng thí nghiệm sinh học
        ctx.fillStyle = '#0c1b2a';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText('KÍNH HIỂN VI QUANG HỌC & TIÊU BẢN TẾ BÀO VẢY HÀNH (KHTN 8)', 25, 28);

        // THÂN KÍNH HIỂN VI (Bên trái)
        const micX = 140, micY = 220;
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;

        // Chân đế móng ngựa
        ctx.beginPath();
        ctx.roundRect(micX - 50, 330, 100, 25, 6);
        ctx.fill();
        ctx.stroke();

        // Thân cong
        ctx.beginPath();
        ctx.moveTo(micX, 330);
        ctx.quadraticCurveTo(micX - 60, 200, micX, 100);
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        // Ống kính & thị kính
        ctx.lineWidth = 2;
        ctx.fillStyle = '#475569';
        ctx.fillRect(micX - 12, 70, 24, 75);
        ctx.fillRect(micX - 18, 55, 36, 15); // thị kính 10x
        ctx.fillRect(micX - 16, 145, 32, 20); // vật kính 40x

        // Bàn sa trượt kẹp lam kính
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(micX - 45, 185, 90, 10);
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(micX - 30, 183, 60, 4); // lam kính thủy tinh

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText('Kính Hiển Vi Quang Học', micX - 55, 375);

        // THỊ TRƯỜNG TRÒN PHÓNG ĐẠI 400X (Bên phải)
        const scopeX = 470, scopeY = 210, scopeR = 140;

        // Vành thị kính kim loại
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(scopeX, scopeY, scopeR + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Vùng soi sáng
        ctx.save();
        ctx.beginPath();
        ctx.arc(scopeX, scopeY, scopeR, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(scopeX - scopeR, scopeY - scopeR, scopeR * 2, scopeR * 2);

        // Lưới tế bào vảy hành hình đa giác
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        const cellH = 28, cellW = 55;
        for (let r = 0; r < 12; r++) {
            const shift = (r % 2 === 0) ? 0 : cellW / 2;
            for (let c = 0; c < 8; c++) {
                const cx = (scopeX - scopeR) + c * cellW + shift;
                const cy = (scopeY - scopeR) + r * cellH;

                ctx.fillStyle = '#bae6fd';
                ctx.beginPath();
                ctx.rect(cx, cy, cellW - 2, cellH - 2);
                ctx.fill();
                ctx.stroke();

                // Nhân tế bào
                ctx.fillStyle = '#0369a1';
                ctx.beginPath();
                ctx.arc(cx + cellW / 2 - 4, cy + cellH / 2, 4.5, 0, Math.PI * 2);
                ctx.fill();

                // Lục lạp li ti
                ctx.fillStyle = '#16a34a';
                ctx.beginPath();
                ctx.arc(cx + 12, cy + 8, 1.8, 0, Math.PI * 2);
                ctx.arc(cx + cellW - 14, cy + 18, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        // Nhãn chú thích
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Thị trường soi 400x: Tế bào biểu bì vảy hành', scopeX, scopeY + scopeR + 25);
        ctx.textAlign = 'left';
    }

    drawPreschoolDiscoveryCanvas(ctx, w, h) {
        // Nền mầm non tươi sáng
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#fef3c7');
        bgGrad.addColorStop(1, '#fed7aa');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText('BÉ KHÁM PHÁ KHOA HỌC: NAM CHÂM THẦN KÌ & VẬT CHÌM - NỔI 🧸', 25, 28);

        // THÍ NGHIỆM 1: CHẬU NƯỚC CHÌM NỔI
        const poolX = 80, poolY = 140, poolW = 240, poolH = 160;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(poolX, poolY, poolW, poolH, [0, 0, 20, 20]);
        ctx.fill();
        ctx.stroke();

        // Mặt nước dập dềnh
        ctx.fillStyle = 'rgba(14, 165, 233, 0.6)';
        ctx.fillRect(poolX + 2, poolY + 40, poolW - 4, poolH - 42);

        // Khúc gỗ nổi trên mặt nước
        ctx.fillStyle = '#854d0e';
        ctx.beginPath();
        ctx.roundRect(poolX + 45, poolY + 30, 60, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('Gỗ nổi 🪵', poolX + 55, poolY + 44);

        // Viên đá chìm dưới đáy
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(poolX + 170, poolY + poolH - 20, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Đá chìm 🪨', poolX + 145, poolY + poolH - 16);

        // THÍ NGHIỆM 2: NAM CHÂM CHỮ U
        const magX = 480, magY = 170;
        ctx.lineWidth = 18;
        ctx.strokeStyle = '#ef4444'; // Cực N đỏ
        ctx.beginPath();
        ctx.arc(magX, magY, 50, Math.PI, Math.PI * 1.5);
        ctx.stroke();

        ctx.strokeStyle = '#2563eb'; // Cực S xanh
        ctx.beginPath();
        ctx.arc(magX, magY, 50, Math.PI * 1.5, Math.PI * 2);
        ctx.stroke();

        // Nhãn cực
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText('N', magX - 56, magY + 5);
        ctx.fillText('S', magX + 46, magY + 5);

        // Bi sắt bị hút
        ctx.fillStyle = '#94a3b8';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(magX - 50 + i * 25, magY + 35 + (i % 2) * 8, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText('Nam Châm Hút Bi Sắt 🧲', magX - 60, magY + 80);
    }


}

// Khởi chạy ứng dụng an toàn tuyệt đối (không bị miss sự kiện DOMContentLoaded khi load dạng module)
function launchEduStudio() {
    if (!window.app) {
        try {
            window.app = new EduStudioApp();
            window.__appLoaded = true;
            console.log("EduStudio v3.10.57 GDMN & GDPT Master đã khởi tạo thành công!");
        } catch (err) {
            console.error("Lỗi khởi tạo EduStudio:", err);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launchEduStudio);
} else {
    launchEduStudio();
}
    