// 리뷰 페이지 기능

let reviewBooks = [];
let filteredReviewBooks = [];
let currentReviewBook = null;
let selectedRating = 0;

// 리뷰용 책 데이터 로딩
async function loadBooksForReview() {
    try {
        // 1순위: Google Sheets CSV (있다면)
        if (typeof CSV_URL !== 'undefined') {
            try {
                const response = await fetch(CSV_URL);
                if (response.ok) {
                    const csvText = await response.text();
                    if (typeof parseCSV === 'function') {
                        const books = parseCSV(csvText);
                        if (books && Array.isArray(books) && books.length > 0) {
                            return books;
                        }
                    }
                }
            } catch (error) {
                console.log('CSV 로딩 실패, 다음 단계 시도');
            }
        }
        
        // 2순위: LocalStorage 백업
        const backup = localStorage.getItem('booksBackup');
        if (backup) {
            const books = JSON.parse(backup);
            if (books && Array.isArray(books) && books.length > 0) {
                return books;
            }
        }
        
        // 3순위: JSON 파일
        const response = await fetch('data/books.json');
        if (response.ok) {
            const books = await response.json();
            if (books && Array.isArray(books) && books.length > 0) {
                return books;
            }
        }
        
        // 기본 데이터 반환
        return [];
    } catch (error) {
        console.error('리뷰용 책 데이터 로딩 실패:', error);
        return [];
    }
}

// 리뷰용 책 목록 로딩
async function loadReviewBooks() {
    console.log('📚 리뷰용 책 목록 로딩 시작...');
    
    try {
        // 리뷰용 책 데이터 로딩
        reviewBooks = await loadBooksForReview();
        
        if (reviewBooks.length === 0) {
            console.log('⚠️ 로딩된 책 데이터가 없습니다.');
            showNoBooks();
            return;
        }
        
        // 리뷰 데이터와 병합
        reviewBooks = mergeReviewData(reviewBooks);
        filteredReviewBooks = [...reviewBooks];
        
        console.log(`✅ ${reviewBooks.length}권의 책을 로딩했습니다.`);
        renderReviewBooks();
        
    } catch (error) {
        console.error('❌ 리뷰용 책 목록 로딩 실패:', error);
        showLoadError();
    }
}

// 리뷰용 책 목록 렌더링
function renderReviewBooks(books = filteredReviewBooks) {
    const container = document.getElementById('book-list');
    if (!container) return;
    
    if (books.length === 0) {
        container.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
        return;
    }
    
    const booksHtml = books.map(book => {
        const reviews = getBookReviews(book.id);
        const ratings = reviews.filter(r => r.rating > 0).map(r => r.rating);
        const averageRating = ratings.length > 0 ? 
            (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : 0;
        
        return `
            <div class="review-book-card" onclick="openReviewModal('${book.id}')">
                <img src="${book.cover}.jpg" alt="${book.title}" class="review-book-cover"
                     onerror="tryAlternativeCoverReview(this, '${book.cover}')">
                <div class="review-book-title">${book.title}</div>
                <div class="review-book-author">${book.author}</div>
                ${averageRating > 0 ? 
                    `<div class="current-rating">⭐ ${averageRating.toFixed(1)}</div>` : 
                    '<div class="current-rating">⭐ 0.0</div>'
                }
                <div class="review-count">${ratings.length}개의 평가</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = booksHtml;
}

// 리뷰 모달 열기
function openReviewModal(bookId) {
    const book = reviewBooks.find(b => b.id === bookId);
    if (!book) {
        console.error('❌ 책을 찾을 수 없습니다:', bookId);
        return;
    }
    
    currentReviewBook = book;
    
    // 모달 표시
    const modal = document.getElementById('review-modal');
    if (!modal) return;
    
    // 책 정보 표시
    const bookInfo = document.getElementById('modal-book-info');
    if (bookInfo) {
        bookInfo.innerHTML = `
            <img src="${book.cover}.jpg" alt="${book.title}" class="modal-book-cover"
                 onerror="tryAlternativeCoverModal(this, '${book.cover}')">
            <div class="modal-book-title">${book.title}</div>
            <div class="modal-book-author">${book.author}</div>
        `;
    }
    
    // 별점 초기화
    resetStarRating();
    
    // 폼 초기화
    const nameInput = document.getElementById('reviewer-name');
    const textInput = document.getElementById('review-text');
    if (nameInput) nameInput.value = '';
    if (textInput) textInput.value = '';
    updateCharCount();
    
    modal.style.display = 'block';
    
    console.log(`📝 ${book.title} 리뷰 모달 열림`);
}

// 리뷰 모달 닫기
function closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentReviewBook = null;
    selectedRating = 0;
    console.log('📝 리뷰 모달 닫힘');
}

// 별점 시스템 초기화
function initializeStarRating() {
    const stars = document.querySelectorAll('.star');
    const ratingDisplay = document.getElementById('rating-display');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            const rating = parseFloat(star.getAttribute('data-rating'));
            selectedRating = rating;
            updateStarDisplay(rating);
            
            if (ratingDisplay) {
                ratingDisplay.textContent = rating.toFixed(1);
            }
            
            console.log(`⭐ 별점 선택: ${rating}`);
        });
        
        star.addEventListener('mouseover', () => {
            const rating = parseFloat(star.getAttribute('data-rating'));
            updateStarDisplay(rating);
        });
    });
    
    // 마우스가 별점 영역을 벗어나면 선택된 별점으로 복원
    const starRating = document.getElementById('star-rating');
    if (starRating) {
        starRating.addEventListener('mouseleave', () => {
            updateStarDisplay(selectedRating);
        });
    }
}

// 별점 표시 업데이트
function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        const starRating = parseFloat(star.getAttribute('data-rating'));
        if (starRating <= rating) {
            star.classList.add('active');
            star.textContent = '★';
        } else {
            star.classList.remove('active');
            star.textContent = '☆';
        }
    });
}

// 별점 초기화
function resetStarRating() {
    selectedRating = 0;
    updateStarDisplay(0);
    const ratingDisplay = document.getElementById('rating-display');
    if (ratingDisplay) {
        ratingDisplay.textContent = '0.0';
    }
}

// 글자 수 카운터 업데이트
function updateCharCount() {
    const textInput = document.getElementById('review-text');
    const charCount = document.getElementById('char-count');
    
    if (textInput && charCount) {
        const currentLength = textInput.value.length;
        charCount.textContent = currentLength;
        
        // 100자 초과 시 색상 변경
        if (currentLength > 100) {
            charCount.style.color = '#dc3545';
        } else {
            charCount.style.color = '#999';
        }
    }
}

// 리뷰 제출
function submitReview() {
    if (!currentReviewBook) {
        alert('책 정보가 없습니다.');
        return;
    }
    
    if (!getCurrentSalon()) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    if (selectedRating === 0) {
        alert('별점을 선택해주세요.');
        return;
    }
    
    const nameInput = document.getElementById('reviewer-name');
    const textInput = document.getElementById('review-text');
    
    const reviewData = {
        name: nameInput ? nameInput.value.trim() || '익명' : '익명',
        text: textInput ? textInput.value.trim() : '',
        rating: selectedRating,
        salon: getCurrentSalon(),
        timestamp: new Date().toISOString()
    };
    
    // 글자 수 체크
    if (reviewData.text.length > 100) {
        alert('리뷰는 100자 이하로 작성해주세요.');
        return;
    }
    
    try {
        // 리뷰 저장
        addBookReview(currentReviewBook.id, reviewData);
        
        console.log(`✅ ${currentReviewBook.title} 리뷰 등록 완료:`, reviewData);
        
        alert('리뷰가 성공적으로 등록되었습니다!');
        
        // 모달 닫기
        closeReviewModal();
        
        // 책 목록 새로고침
        reviewBooks = mergeReviewData(reviewBooks);
        renderReviewBooks();
        
    } catch (error) {
        console.error('❌ 리뷰 등록 실패:', error);
        alert('리뷰 등록 중 오류가 발생했습니다.');
    }
}

// 리뷰 검색 기능
function initializeReviewSearch() {
    const searchInput = document.getElementById('review-search');
    const searchBtn = document.getElementById('review-search-btn');
    
    if (!searchInput) return;
    
    const performSearch = (searchTerm) => {
        if (!searchTerm.trim()) {
            filteredReviewBooks = [...reviewBooks];
        } else {
            const term = searchTerm.toLowerCase();
            filteredReviewBooks = reviewBooks.filter(book => 
                book.title.toLowerCase().includes(term) ||
                book.author.toLowerCase().includes(term)
            );
        }
        renderReviewBooks();
    };
    
    // 실시간 검색
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });
    
    // 검색 버튼 클릭
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value);
        });
    }
    
    // 엔터 키 검색
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
}

// 모달 이벤트 설정
function initializeModalEvents() {
    const modal = document.getElementById('review-modal');
    const closeBtn = document.querySelector('.close');
    const submitBtn = document.getElementById('submit-review');
    const textInput = document.getElementById('review-text');
    
    // 모달 닫기 - X 버튼
    if (closeBtn) {
        closeBtn.addEventListener('click', closeReviewModal);
    }
    
    // 모달 닫기 - 배경 클릭
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeReviewModal();
            }
        });
    }
    
    // 리뷰 제출
    if (submitBtn) {
        submitBtn.addEventListener('click', submitReview);
    }
    
    // 글자 수 카운터
    if (textInput) {
        textInput.addEventListener('input', updateCharCount);
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            closeReviewModal();
        }
    });
}

// 오류 상태 표시
function showLoadError() {
    const container = document.getElementById('book-list');
    if (container) {
        container.innerHTML = `
            <div class="no-results">
                책 목록을 불러올 수 없습니다.<br>
                네트워크 연결을 확인하고 다시 시도해주세요.
            </div>
        `;
    }
}

function showNoBooks() {
    const container = document.getElementById('book-list');
    if (container) {
        container.innerHTML = '<div class="no-results">등록된 책이 없습니다.</div>';
    }
}

// 리뷰 페이지 초기화
async function initializeReview() {
    console.log('📝 리뷰 페이지 초기화 시작');
    
    // 인증 상태 확인 및 UI 업데이트
    updateReviewLoginUI();
    
    // 로그인된 상태라면 책 목록 로딩
    if (getCurrentSalon()) {
        await loadReviewBooks();
    }
    
    // 이벤트 리스너 설정
    initializeStarRating();
    initializeModalEvents();
    initializeReviewSearch();
    
    console.log('✅ 리뷰 페이지 초기화 완료');
}

// 리뷰 페이지용 대체 표지 이미지 시도 함수
function tryAlternativeCoverReview(imgElement, basePath) {
    const extensions = ['jfif', 'jpeg', 'png'];
    let currentExtension = 0;
    
    function tryNextExtension() {
        if (currentExtension < extensions.length) {
            imgElement.src = `${basePath}.${extensions[currentExtension]}`;
            currentExtension++;
            
            imgElement.onerror = () => {
                setTimeout(tryNextExtension, 100);
            };
            
            imgElement.onload = () => {
                imgElement.onerror = null;
                imgElement.onload = null;
            };
        } else {
            // 모든 확장자 실패 시 기본 이미지
            imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEzMCIgdmlld0JveD0iMCAwIDEwMCAxMzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTMwIiBmaWxsPSIjZjBmMGYwIi8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+7Yed7ZWY7J20PC90ZXh0Pgo8L3N2Zz4=';
            imgElement.onerror = null;
        }
    }
    
    tryNextExtension();
}

// 모달용 대체 표지 이미지 시도 함수
function tryAlternativeCoverModal(imgElement, basePath) {
    const extensions = ['jfif', 'jpeg', 'png'];
    let currentExtension = 0;
    
    function tryNextExtension() {
        if (currentExtension < extensions.length) {
            imgElement.src = `${basePath}.${extensions[currentExtension]}`;
            currentExtension++;
            
            imgElement.onerror = () => {
                setTimeout(tryNextExtension, 100);
            };
            
            imgElement.onload = () => {
                imgElement.onerror = null;
                imgElement.onload = null;
            };
        } else {
            // 모든 확장자 실패 시 기본 이미지
            imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDEyMCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjZjBmMGYwIi8+Cjx0ZXh0IHg9IjYwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMiI+7Yed7ZWY7J20PC90ZXh0Pgo8L3N2Zz4=';
            imgElement.onerror = null;
        }
    }
    
    tryNextExtension();
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReview);
} else {
    initializeReview();
}