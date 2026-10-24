// store.js - Quản lý trạng thái ứng dụng và tự động đồng bộ LocalStorage/SessionStorage
const AppStore = {
    state: {
        currentScreen: sessionStorage.getItem('current_screen') || 'screen-home',
        selectedProfileId: localStorage.getItem('current_profile_id') || null,
        selectedRoleId: null,
        activeQId: 1,
        analysisDone: false,
        analysisData: null, // Lưu cục JSON kết quả phân tích
        user: {
            streakDays: 0,        
            currentXp: 0,         
            currentStageIndex: 0,
            hasWateredToday: false 
        },
        stages: [
            { id: 1, name: 'Hạt giống', xpRequired: 1000 },
            { id: 2, name: 'Nảy mầm', xpRequired: 2500 },
            { id: 3, name: 'Phát triển thân', xpRequired: 5000 },
            { id: 4, name: 'Phân cành', xpRequired: 8000 },
            { id: 5, name: 'Ra lá', xpRequired: 12000 },
            { id: 6, name: 'Kết trái', xpRequired: 18000 }
        ],
        gapDetails: []
    },

    // Cập nhật và lưu màn hình hiện tại vào sessionStorage
    setScreen(screenId) {
        this.state.currentScreen = screenId;
        sessionStorage.setItem('current_screen', screenId);
    },

    // Lưu trạng thái và kết quả phân tích vào localStorage
    setAnalysisResult(data) {
        this.state.analysisDone = true;
        this.state.analysisData = data;
        const pid = localStorage.getItem('current_profile_id') || this.state.selectedProfileId;
        if (pid && data) {
            localStorage.setItem(`has_analyzed_${pid}`, 'true');
            localStorage.setItem(`analysis_data_${pid}`, JSON.stringify(data));
        }
    },

    // Khôi phục toàn bộ trạng thái khi tải lại trang (F5)
    restoreState() {
        const pid = localStorage.getItem('current_profile_id');
        const isLoggedIn = pid && pid !== 'null' && pid !== 'undefined' && String(pid).trim() !== '';

        if (isLoggedIn) {
            this.state.selectedProfileId = pid;
            const analyzed = localStorage.getItem(`has_analyzed_${pid}`);
            if (analyzed === 'true') {
                this.state.analysisDone = true;
                const savedData = localStorage.getItem(`analysis_data_${pid}`);
                if (savedData) {
                    try {
                        this.state.analysisData = JSON.parse(savedData);
                    } catch (e) {
                        console.error("Lỗi đọc dữ liệu phân tích cũ", e);
                    }
                }
            }
        }

        // Khôi phục đúng màn hình (Tab) người dùng đang đứng
        const savedScreen = sessionStorage.getItem('current_screen') || 'screen-home';
        this.state.currentScreen = savedScreen;
    }
};

// Khởi chạy khôi phục ngay khi nạp file
AppStore.restoreState();