// 인증 관련 설정
const SALON_PASSWORDS = {
    '문학살롱': 'munhak2025',
    '자기경영살롱': 'growth2025',
    '그림책살롱': 'picturebook2025',
    '고전살롱': 'classic2025',
    '소울살롱': 'soul2025',
    '인문살롱': 'inmun2025',
    '인라이팅': 'writing2025'
};

const ADMIN_PASSWORD = 'inbook_admin_2024';

// 살롱 로그인 상태 관리
let currentSalon = null;
let adminLoggedIn = false;

// 살롱 인증
function authenticateSalon(salon, password) {
    console.log(`🔐 ${salon} 인증 시도...`);
    
    if (!SALON_PASSWORDS[salon]) {
        console.log('❌ 존재하지 않는 살롱');
        return false;
    }
    
    if (SALON_PASSWORDS[salon] === password) {
        currentSalon = salon;
        console.log(`✅ ${salon} 인증 성공`);
        
        // 세션에 저장
        sessionStorage.setItem('currentSalon', salon);
        sessionStorage.setItem('salonLoginTime', new Date().getTime());
        
        return true;
    }
    
    console.log('❌ 잘못된 패스워드');
    return false;
}

// 관리자 인증
function authenticateAdmin(password) {
    console.log('🔐 관리자 인증 시도...');
    
    if (ADMIN_PASSWORD === password) {
        adminLoggedIn = true;
        console.log('✅ 관리자 인증 성공');
        
        // 세션에 저장
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminLoginTime', new Date().getTime());
        
        return true;
    }
    
    console.log('❌ 잘못된 관리자 패스워드');
    return false;
}

// 살롱 로그아웃
function logoutSalon() {
    console.log('🚪 살롱 로그아웃');
    currentSalon = null;
    sessionStorage.removeItem('currentSalon');
    sessionStorage.removeItem('salonLoginTime');
}

// 관리자 로그아웃
function logoutAdmin() {
    console.log('🚪 관리자 로그아웃');
    adminLoggedIn = false;
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminLoginTime');
}

// 세션 확인 (살롱)
function checkSalonSession() {
    const salon = sessionStorage.getItem('currentSalon');
    const loginTime = sessionStorage.getItem('salonLoginTime');
    
    if (!salon || !loginTime) return false;
    
    // 세션 유효 시간: 24시간
    const sessionDuration = 24 * 60 * 60 * 1000;
    const currentTime = new Date().getTime();
    
    if (currentTime - parseInt(loginTime) > sessionDuration) {
        console.log('⏰ 살롱 세션 만료');
        logoutSalon();
        return false;
    }
    
    currentSalon = salon;
    console.log(`✅ ${salon} 세션 유효`);
    return true;
}

// 세션 확인 (관리자)
function checkAdminSession() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    const loginTime = sessionStorage.getItem('adminLoginTime');
    
    if (isLoggedIn !== 'true' || !loginTime) return false;
    
    // 세션 유효 시간: 2시간
    const sessionDuration = 2 * 60 * 60 * 1000;
    const currentTime = new Date().getTime();
    
    if (currentTime - parseInt(loginTime) > sessionDuration) {
        console.log('⏰ 관리자 세션 만료');
        logoutAdmin();
        return false;
    }
    
    adminLoggedIn = true;
    console.log('✅ 관리자 세션 유효');
    return true;
}

// 현재 살롱 정보 반환
function getCurrentSalon() {
    return currentSalon;
}

// 관리자 로그인 상태 확인
function isAdminLoggedIn() {
    return adminLoggedIn;
}

// 권한 확인 함수들
function hasReviewPermission(salon = null) {
    if (!currentSalon) return false;
    return salon ? currentSalon === salon : true;
}

function hasAdminPermission() {
    return adminLoggedIn;
}

// 로그인 상태 UI 업데이트 (리뷰 페이지용)
function updateReviewLoginUI() {
    const loginSection = document.getElementById('login-section');
    const reviewSection = document.getElementById('review-section');
    const loggedSalonSpan = document.getElementById('logged-salon');
    
    if (!loginSection || !reviewSection || !loggedSalonSpan) return;
    
    if (checkSalonSession()) {
        loginSection.style.display = 'none';
        reviewSection.style.display = 'block';
        loggedSalonSpan.textContent = currentSalon;
    } else {
        loginSection.style.display = 'block';
        reviewSection.style.display = 'none';
    }
}

// 로그인 상태 UI 업데이트 (관리자 페이지용)
function updateAdminLoginUI() {
    const loginSection = document.getElementById('admin-login');
    const adminPanel = document.getElementById('admin-panel');
    
    if (!loginSection || !adminPanel) return;
    
    if (checkAdminSession()) {
        loginSection.style.display = 'none';
        adminPanel.style.display = 'block';
    } else {
        loginSection.style.display = 'block';
        adminPanel.style.display = 'none';
    }
}

// 리뷰 페이지 로그인 이벤트 설정
function initializeReviewAuth() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const salonSelect = document.getElementById('salon-select');
    const passwordInput = document.getElementById('salon-password');
    
    if (!loginBtn || !logoutBtn || !salonSelect || !passwordInput) return;
    
    // 로그인 버튼 클릭
    loginBtn.addEventListener('click', () => {
        const selectedSalon = salonSelect.value;
        const password = passwordInput.value;
        
        if (!selectedSalon) {
            alert('살롱을 선택해주세요.');
            return;
        }
        
        if (!password) {
            alert('패스워드를 입력해주세요.');
            return;
        }
        
        if (authenticateSalon(selectedSalon, password)) {
            updateReviewLoginUI();
            passwordInput.value = '';
            
            // 책 목록 로딩
            if (typeof loadReviewBooks === 'function') {
                loadReviewBooks();
            }
        } else {
            alert('잘못된 패스워드입니다.');
            passwordInput.value = '';
        }
    });
    
    // 로그아웃 버튼 클릭
    logoutBtn.addEventListener('click', () => {
        logoutSalon();
        updateReviewLoginUI();
        salonSelect.value = '';
    });
    
    // 엔터 키로 로그인
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });
    
    // 초기 상태 설정
    updateReviewLoginUI();
}

// 관리자 페이지 로그인 이벤트 설정
function initializeAdminAuth() {
    const loginBtn = document.getElementById('admin-login-btn');
    const logoutBtn = document.getElementById('admin-logout');
    const passwordInput = document.getElementById('admin-password');
    
    if (!loginBtn || !passwordInput) return;
    
    // 로그인 버튼 클릭
    loginBtn.addEventListener('click', () => {
        const password = passwordInput.value;
        
        if (!password) {
            alert('패스워드를 입력해주세요.');
            return;
        }
        
        if (authenticateAdmin(password)) {
            updateAdminLoginUI();
            passwordInput.value = '';
            
            // 관리자 패널 초기화
            if (typeof initializeAdminPanel === 'function') {
                initializeAdminPanel();
            }
        } else {
            alert('잘못된 패스워드입니다.');
            passwordInput.value = '';
        }
    });
    
    // 로그아웃 버튼 클릭
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logoutAdmin();
            updateAdminLoginUI();
        });
    }
    
    // 엔터 키로 로그인
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });
    
    // 초기 상태 설정
    updateAdminLoginUI();
}

// 페이지별 초기화
function initializeAuth() {
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('review.html')) {
        initializeReviewAuth();
    } else if (currentPage.includes('admin.html')) {
        initializeAdminAuth();
    }
}

// 자동 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}