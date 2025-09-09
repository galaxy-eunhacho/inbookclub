// 책 상세 페이지 기능

let currentBook = null;

// URL에서 책 ID 가져오기
function getBookIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// 특정 책 정보 가져오기
async function getBookById(bookId) {
    // main.js에서 로딩된 데이터 사용
    if (typeof booksData !== 'undefined' && booksData.length > 0) {
        return booksData.find(book => book.id === bookId);
    }
    
    // 직접 데이터 로딩이 필요한 경우
    try {
        console.log('📚 책 데이터 직접 로딩...');
        const books = await loadBooksForDetail();
        return books.find(book => book.id === bookId);
    } catch (error) {
        console.error('❌ 책 데이터 로딩 실패:', error);
        return null;
    }
}

// 상세 페이지용 책 데이터 로딩
async function loadBooksForDetail() {
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
        console.error('상세 페이지 책 데이터 로딩 실패:', error);
        return [];
    }
}

// 책 상세 정보 렌더링
function renderBookDetail(book) {
    const container = document.getElementById('book-detail');
    if (!container || !book) {
        if (container) {
            container.innerHTML = '<div class="no-results">책 정보를 찾을 수 없습니다.</div>';
        }
        return;
    }
    
    // 평균 별점과 리뷰 데이터 가져오기
    const reviews = getBookReviews(book.id);
    const ratings = reviews.filter(r => r.rating > 0).map(r => r.rating);
    const averageRating = ratings.length > 0 ? 
        (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : 0;
    
    // 별점 표시 생성
    function generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) stars += '★';
        if (hasHalfStar) stars += '☆';
        for (let i = 0; i < emptyStars; i++) stars += '☆';
        
        return stars;
    }
    
    const bookHtml = `
        <div class="book-detail-content">
            <div class="book-detail-cover">
                <img src="${book.cover}.jpg" alt="${book.title}" class="detail-book-cover"
                     onerror="tryAlternativeCoverDetail(this, '${book.cover}')">
            </div>
            <div class="book-detail-info">
                <h1>${book.title}</h1>
                <h2>${book.author}</h2>
                
                <div class="book-meta">
                    ${book.period ? `
                    <div class="meta-item">
                        <span class="meta-label">기간:</span>
                        <span class="meta-value">${book.period}</span>
                    </div>
                    ` : ''}
                    
                    <div class="meta-item">
                        <span class="meta-label">살롱:</span>
                        <span class="salon-badge ${book.salon}">${book.salon}</span>
                    </div>
                    
                    ${book.topics && book.topics.length > 0 ? `
                    <div class="meta-item">
                        <span class="meta-label">주제:</span>
                        <div class="topic-tags">
                            ${book.topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${book.year ? `
                    <div class="meta-item">
                        <span class="meta-label">출판:</span>
                        <span class="meta-value">${book.year}년</span>
                    </div>
                    ` : ''}
                    
                    ${book.isbn ? `
                    <div class="meta-item">
                        <span class="meta-label">ISBN:</span>
                        <span class="meta-value">${book.isbn}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${book.description ? `
                <div class="book-description">
                    ${book.description.split('\n').map(line => `<p>${line}</p>`).join('')}
                </div>
                ` : ''}
                
                <div class="rating-section">
                    <div class="average-rating">
                        <span class="stars">${generateStars(averageRating)}</span>
                        <span>${averageRating.toFixed(1)}</span>
                    </div>
                    <div class="rating-text">
                        ${ratings.length > 0 ? 
                            `${ratings.length}명이 평가한 평균 별점` : 
                            '아직 평가가 없습니다'
                        }
                    </div>
                </div>
                
                ${book.link ? `
                <div class="buy-section">
                    <a href="${book.link}" target="_blank" class="buy-btn">더 알아보기</a>
                    <div class="commission-notice">
                        위 링크로 구입할 경우 일정액의 수수료를 제공받으며<br>
                        이는 인북클럽 운영 및 아카이브 제작에 큰 도움이 됩니다.
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    container.innerHTML = bookHtml;
    
    // 페이지 제목 업데이트
    document.title = `${book.title} - 인북클럽`;
}

// 리뷰 목록 렌더링
function renderReviews(bookId) {
    const container = document.getElementById('reviews-list');
    if (!container) return;
    
    const reviews = getBookReviews(bookId);
    const textReviews = reviews.filter(review => review.text && review.text.trim());
    
    if (textReviews.length === 0) {
        container.innerHTML = '<div class="no-reviews">아직 리뷰가 없습니다.</div>';
        return;
    }
    
    const reviewsHtml = textReviews.map(review => `
        <div class="review-item">
            <div class="review-header">
                <span class="reviewer-name">${review.name || '익명'}</span>
                ${review.rating > 0 ? 
                    `<span class="review-rating">${'★'.repeat(Math.floor(review.rating))}${review.rating % 1 >= 0.5 ? '☆' : ''}${'☆'.repeat(5 - Math.ceil(review.rating))} ${review.rating.toFixed(1)}</span>` : 
                    ''
                }
            </div>
            <div class="review-text">${review.text}</div>
        </div>
    `).join('');
    
    container.innerHTML = reviewsHtml;
}

// 검색 기능 (상세 페이지에서)
function initializeBookDetailSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (!searchInput || !searchBtn) return;
    
    const performSearch = (searchTerm) => {
        if (searchTerm.trim()) {
            window.location.href = `index.html?search=${encodeURIComponent(searchTerm.trim())}`;
        }
    };
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
    
    searchBtn.addEventListener('click', () => {
        performSearch(searchInput.value);
    });
}

// 뒤로 가기 버튼 추가
function addBackButton() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    const backButton = document.createElement('button');
    backButton.innerHTML = '← 목록으로 돌아가기';
    backButton.className = 'back-btn';
    backButton.style.cssText = `
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        margin-bottom: 20px;
        transition: background 0.2s;
    `;
    
    backButton.addEventListener('mouseover', () => {
        backButton.style.background = '#5a6268';
    });
    
    backButton.addEventListener('mouseout', () => {
        backButton.style.background = '#6c757d';
    });
    
    backButton.addEventListener('click', () => {
        // 이전 페이지가 인북클럽 사이트인 경우 뒤로가기, 아니면 메인으로
        if (document.referrer && document.referrer.includes(window.location.hostname)) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    });
    
    container.insertBefore(backButton, container.firstChild);
}

// 상세 페이지용 대체 표지 이미지 시도 함수
function tryAlternativeCoverDetail(imgElement, basePath) {
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
            imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjMzMCIgdmlld0JveD0iMCAwIDI1MCAzMzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTAiIGhlaWdodD0iMzMwIiBmaWxsPSIjZjBmMGYwIi8+Cjx0ZXh0IHg9IjEyNSIgeT0iMTY1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjE2Ij7su4jsmrDspJE8L3RleHQ+Cjwvc3ZnPg==';
            imgElement.onerror = null;
        }
    }
    
    tryNextExtension();
}

// 페이지 초기화
async function initializeBookDetail() {
    console.log('📖 책 상세 페이지 초기화 시작');
    
    const bookId = getBookIdFromURL();
    if (!bookId) {
        console.log('❌ 책 ID가 없습니다');
        const container = document.getElementById('book-detail');
        if (container) {
            container.innerHTML = '<div class="no-results">잘못된 접근입니다.</div>';
        }
        return;
    }
    
    console.log(`📚 책 ID: ${bookId} 정보 로딩...`);
    
    try {
        const book = await getBookById(bookId);
        
        if (!book) {
            console.log('❌ 책을 찾을 수 없습니다');
            const container = document.getElementById('book-detail');
            if (container) {
                container.innerHTML = '<div class="no-results">책 정보를 찾을 수 없습니다.</div>';
            }
            return;
        }
        
        currentBook = book;
        console.log(`✅ 책 정보 로딩 완료: ${book.title}`);
        
        // 책 상세 정보 렌더링
        renderBookDetail(book);
        
        // 리뷰 렌더링
        renderReviews(book.id);
        
        // 검색 기능 초기화
        initializeBookDetailSearch();
        
        // 뒤로 가기 버튼 추가
        addBackButton();
        
        console.log('✅ 책 상세 페이지 초기화 완료');
        
    } catch (error) {
        console.error('❌ 책 상세 페이지 초기화 중 오류:', error);
        const container = document.getElementById('book-detail');
        if (container) {
            container.innerHTML = '<div class="no-results">오류가 발생했습니다.<br>페이지를 새로고침 해주세요.</div>';
        }
    }
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBookDetail);
} else {
    initializeBookDetail();
}