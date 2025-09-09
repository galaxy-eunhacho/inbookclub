// CSV URL과 데이터 관리
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQ4S-9xfQojsr1iCzk_AmIZD8sjU1pVjcSNCXeT-aLpyVQVMsxIrUqTRIOHf85kH6aRXxFQjg8YzOe/pub?output=csv';

let booksData = [];
let filteredBooks = [];
let activeFilters = {
    salon: null,
    topic: null,
    search: ''
};

// 우선순위 기반 데이터 로딩
async function loadBooks() {
    console.log('📚 책 데이터 로딩 시작...');
    
    try {
        // 1순위: Google Sheets CSV
        console.log('🌐 Google Sheets CSV 로딩 시도...');
        const response = await fetch(CSV_URL);
        if (response.ok) {
            const csvText = await response.text();
            const books = parseCSV(csvText);
            if (books && Array.isArray(books) && books.length > 0) {
                console.log(`✅ Google Sheets에서 ${books.length}권의 책을 성공적으로 로드했습니다.`);
                
                // LocalStorage에 백업 저장
                localStorage.setItem('booksBackup', JSON.stringify(books));
                localStorage.setItem('lastUpdate', new Date().toISOString());
                
                return books;
            }
        }
        console.log('⚠️ Google Sheets CSV 로딩 실패');
    } catch (error) {
        console.log('❌ Google Sheets CSV 로딩 중 오류:', error.message);
    }
    
    try {
        // 2순위: LocalStorage 백업
        console.log('💾 LocalStorage 백업 데이터 확인 중...');
        const backup = localStorage.getItem('booksBackup');
        if (backup) {
            const books = JSON.parse(backup);
            if (books && Array.isArray(books) && books.length > 0) {
                console.log(`✅ LocalStorage 백업에서 ${books.length}권의 책을 로드했습니다.`);
                return books;
            }
        }
        console.log('⚠️ LocalStorage 백업 데이터 없음');
    } catch (error) {
        console.log('❌ LocalStorage 백업 로딩 중 오류:', error.message);
    }
    
    try {
        // 3순위: JSON 파일 (로컬 백업)
        console.log('📄 로컬 JSON 파일 로딩 시도...');
        const response = await fetch('data/books.json');
        if (response.ok) {
            const books = await response.json();
            if (books && Array.isArray(books) && books.length > 0) {
                console.log(`✅ JSON 파일에서 ${books.length}권의 책을 로드했습니다.`);
                
                // LocalStorage에 백업 저장
                localStorage.setItem('booksBackup', JSON.stringify(books));
                localStorage.setItem('lastUpdate', new Date().toISOString());
                
                return books;
            }
        }
        console.log('⚠️ JSON 파일 로딩 실패 또는 빈 데이터');
    } catch (error) {
        console.log('❌ JSON 파일 로딩 중 오류:', error.message);
    }
    
    // 모든 데이터 소스 로딩 실패
    console.log('❌ 모든 데이터 소스 로딩 실패');
    return [];
}

// 강화된 CSV 파싱 (한글/영문 헤더 지원)
function parseCSV(csvText) {
    console.log('🔍 CSV 파싱 시작...');
    
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        console.log('❌ CSV 데이터가 비어있거나 헤더만 있습니다.');
        return [];
    }
    
    // 실제 헤더 행 찾기 (비어있지 않은 첫 번째 행)
    let headerLineIndex = 0;
    let headers = [];
    
    for (let i = 0; i < lines.length; i++) {
        const parsedLine = parseCSVLine(lines[i]);
        if (parsedLine.some(cell => cell && cell.trim() && 
            (cell.includes('책제목') || cell.includes('title') || cell.includes('저자') || cell.includes('author')))) {
            headerLineIndex = i;
            headers = parsedLine;
            break;
        }
    }
    
    console.log(`📋 헤더 행 인덱스: ${headerLineIndex}, 감지된 헤더:`, headers);
    
    if (headers.length === 0) {
        console.log('❌ 유효한 헤더를 찾을 수 없습니다.');
        return [];
    }
    
    // 헤더 매핑 (한글/영문 모두 지원)
    const headerMap = {
        number: findHeader(headers, ['번호', 'number', 'num', 'id']),
        title: findHeader(headers, ['책제목', 'title', '제목', 'book_title']),
        author: findHeader(headers, ['저자', 'author', '작가', 'writer']),
        salon: findHeader(headers, ['살롱', 'salon', '살롱명', 'salon_name']),
        period: findHeader(headers, ['기간', 'period', '읽은기간', 'reading_period']),
        topics: findHeader(headers, ['주제태그', 'topics', '태그', 'tags', 'topic']),
        description: findHeader(headers, ['3줄소개', 'description', '소개', 'intro', '설명']),
        isbn: findHeader(headers, ['ISBN', 'isbn']),
        price: findHeader(headers, ['가격', 'price', '정가']),
        year: findHeader(headers, ['출판연도', 'year', '연도', 'publish_year']),
        link: findHeader(headers, ['구매링크', 'link', 'url', 'buy_link']),
        cover: findHeader(headers, ['표지', 'cover', '표지경로', 'cover_path', '이미지'])
    };
    
    console.log('🗺️ 헤더 매핑:', headerMap);
    
    const books = [];
    
    // 데이터 행 파싱 (실제 헤더 행 다음부터 시작)
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        // 불완전한 행이나 빈 행 스킵
        if (values.length < 2 || !values.some(v => v && v.trim())) continue;
        
        const bookNumber = getValue(values, headerMap.number);
        const actualBookNumber = bookNumber && bookNumber.trim() ? bookNumber.trim() : (i - headerLineIndex);
        
        const book = {
            id: `book_${i}`,
            number: actualBookNumber,
            title: getValue(values, headerMap.title) || `책 ${i}`,
            author: getValue(values, headerMap.author) || '작자미상',
            salon: getValue(values, headerMap.salon) || '',
            period: getValue(values, headerMap.period) || '',
            topics: parseTopics(getValue(values, headerMap.topics) || ''),
            description: getValue(values, headerMap.description) || '',
            isbn: getValue(values, headerMap.isbn) || '',
            price: parseInt(getValue(values, headerMap.price)) || 0,
            year: parseInt(getValue(values, headerMap.year)) || new Date().getFullYear(),
            link: getValue(values, headerMap.link) || '',
            cover: `inbook-archive/book${actualBookNumber}`,
            rating: 0,
            reviewCount: 0
        };
        
        // 디버깅용 로그  
        if (books.length < 5) {
            console.log(`📖 책 ${books.length + 1}:`, {
                title: book.title,
                author: book.author,
                salon: book.salon,
                number: actualBookNumber,
                cover: book.cover,
                rawValues: values
            });
        }
        
        // 헤더 행이나 빈 데이터 스킵
        if (!book.title.trim() || 
            book.title === `책 ${i}` || 
            book.title.toLowerCase().includes('책제목') ||
            book.title.toLowerCase().includes('title') ||
            !book.author.trim() ||
            book.author.toLowerCase().includes('저자') ||
            book.author.toLowerCase().includes('author')) {
            continue;
        }
        
        books.push(book);
    }
    
    console.log(`✅ ${books.length}권의 책을 성공적으로 파싱했습니다.`);
    console.log('📖 파싱된 책 샘플:', books.slice(0, 3));
    
    return books;
}

// CSV 라인 파싱 (쉼표와 따옴표 처리)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // 다음 따옴표 스킵
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// 헤더 찾기 함수
function findHeader(headers, candidates) {
    for (const candidate of candidates) {
        const index = headers.findIndex(h => 
            h.toLowerCase().includes(candidate.toLowerCase()) ||
            candidate.toLowerCase().includes(h.toLowerCase())
        );
        if (index !== -1) return index;
    }
    return -1;
}

// 값 가져오기 함수
function getValue(values, index) {
    if (index === -1 || index >= values.length) return '';
    return values[index].replace(/^["']|["']$/g, '').trim();
}

// 주제 태그 파싱
function parseTopics(topicsStr) {
    if (!topicsStr) return [];
    return topicsStr.split(/[,;|]/)
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0);
}

// 표지 이미지 경로 생성
function generateCoverPath(title) {
    // 책제목에서 특수문자 제거하고 정리
    const cleanTitle = title.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '').trim();
    return `inbook-archive/${cleanTitle}`;
}

// 표지 경로 처리 (CSV에서 오는 경로든 자동 생성이든 inbook-archive로 통일)
function processCoverPath(csvCoverPath, title) {
    // CSV에서 표지 경로가 제공된 경우
    if (csvCoverPath && csvCoverPath.trim()) {
        const coverPath = csvCoverPath.trim();
        
        // 이미 inbook-archive로 시작하는 경우 그대로 사용
        if (coverPath.startsWith('inbook-archive/')) {
            // 확장자가 있으면 제거
            return coverPath.replace(/\.(jpg|jpeg|jfif|png)$/i, '');
        }
        
        // 다른 폴더 경로면 inbook-archive로 변경
        const fileName = coverPath.split('/').pop().replace(/\.(jpg|jpeg|jfif|png)$/i, '');
        return `inbook-archive/${fileName}`;
    }
    
    // CSV에 표지 경로가 없으면 제목으로 자동 생성
    return generateCoverPath(title);
}

// 리뷰 데이터 로딩 및 병합
function mergeReviewData(books) {
    books.forEach(book => {
        const reviews = getBookReviews(book.id);
        if (reviews && reviews.length > 0) {
            const ratings = reviews.map(r => r.rating).filter(r => r > 0);
            if (ratings.length > 0) {
                book.rating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
                book.reviewCount = ratings.length;
            }
        }
    });
    return books;
}

// 책 목록 렌더링
function renderBooks(books = filteredBooks) {
    const grid = document.getElementById('book-grid');
    if (!grid) return;
    
    console.log(`🎨 렌더링할 책 개수: ${books.length}`);
    if (books.length > 0 && books.length < 5) {
        console.log('🎨 렌더링할 첫 번째 책들:', books);
    }
    
    if (books.length === 0) {
        grid.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
        return;
    }
    
    const booksHtml = books.map(book => `
        <div class="book-card salon-${book.salon.replace(/\s+/g, '')}" onclick="openBookDetail('${book.id}')">
            <img src="${book.cover}.jpg" alt="${book.title}" class="book-cover" 
                 onerror="tryAlternativeCover(this, '${book.cover}')">
            <div class="book-title">${book.title}</div>
            <div class="book-author">${book.author}</div>
            <div class="book-salon">${book.salon}</div>
            ${book.reviewCount > 0 ? 
                `<div class="book-rating">⭐ ${book.rating.toFixed(1)} (${book.reviewCount})</div>` : 
                '<div class="book-rating">리뷰 없음</div>'
            }
        </div>
    `).join('');
    
    grid.innerHTML = booksHtml;
}

// 대체 표지 이미지 시도하는 함수
function tryAlternativeCover(imgElement, basePath) {
    const extensions = ['jfif', 'jpeg', 'png'];
    let currentExtension = 0;
    
    console.log(`🖼️ 이미지 로딩 실패: ${basePath}.jpg, 대체 확장자 시도 중...`);
    
    function tryNextExtension() {
        if (currentExtension < extensions.length) {
            const newSrc = `${basePath}.${extensions[currentExtension]}`;
            console.log(`🔄 시도 중: ${newSrc}`);
            imgElement.src = newSrc;
            currentExtension++;
            
            imgElement.onerror = () => {
                setTimeout(tryNextExtension, 100);
            };
            
            imgElement.onload = () => {
                console.log(`✅ 이미지 로딩 성공: ${newSrc}`);
                imgElement.onerror = null;
                imgElement.onload = null;
            };
        } else {
            // 모든 확장자 실패 시 기본 이미지
            console.log(`❌ 모든 확장자 실패, 기본 이미지 사용: ${basePath}`);
            imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDEyMCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjZjBmMGYwIi8+Cjx0ZXh0IHg9IjYwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMiI+7Yed7ZWY7J20PC90ZXh0Pgo8L3N2Zz4=';
            imgElement.onerror = null;
        }
    }
    
    tryNextExtension();
}


// 책 상세 페이지로 이동
function openBookDetail(bookId) {
    window.location.href = `book-detail.html?id=${bookId}`;
}

// 필터링 함수
function filterBooks() {
    filteredBooks = booksData.filter(book => {
        // 살롱 필터
        if (activeFilters.salon && book.salon !== activeFilters.salon) {
            return false;
        }
        
        // 주제 필터
        if (activeFilters.topic && !book.topics.some(topic => 
            topic.includes(activeFilters.topic) || activeFilters.topic.includes(topic)
        ) && !book.period.includes(activeFilters.topic)) {
            return false;
        }
        
        // 검색 필터
        if (activeFilters.search) {
            const searchTerm = activeFilters.search.toLowerCase();
            return book.title.toLowerCase().includes(searchTerm) ||
                   book.author.toLowerCase().includes(searchTerm) ||
                   book.salon.toLowerCase().includes(searchTerm);
        }
        
        return true;
    });
    
    renderBooks();
    updateActiveFilters();
}

// 활성 필터 표시 업데이트
function updateActiveFilters() {
    const container = document.getElementById('active-filters');
    if (!container) return;
    
    const filters = [];
    
    if (activeFilters.salon) {
        filters.push(`
            <span class="filter-tag">
                ${activeFilters.salon}
                <span class="remove" onclick="removeSalonFilter()">×</span>
            </span>
        `);
    }
    
    if (activeFilters.topic) {
        filters.push(`
            <span class="filter-tag">
                ${activeFilters.topic}
                <span class="remove" onclick="removeTopicFilter()">×</span>
            </span>
        `);
    }
    
    if (activeFilters.search) {
        filters.push(`
            <span class="filter-tag">
                "${activeFilters.search}"
                <span class="remove" onclick="removeSearchFilter()">×</span>
            </span>
        `);
    }
    
    container.innerHTML = filters.join('');
}

// 필터 제거 함수들
function removeSalonFilter() {
    activeFilters.salon = null;
    document.querySelectorAll('.salon-tag.active').forEach(tag => {
        tag.classList.remove('active');
    });
    filterBooks();
}

function removeTopicFilter() {
    activeFilters.topic = null;
    document.querySelectorAll('.topic-btn.active').forEach(btn => {
        btn.classList.remove('active');
    });
    filterBooks();
}

function removeSearchFilter() {
    activeFilters.search = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    filterBooks();
}

function clearAllFilters() {
    activeFilters = { salon: null, topic: null, search: '' };
    
    // UI 상태 초기화
    document.querySelectorAll('.salon-tag.active, .topic-btn.active').forEach(el => {
        el.classList.remove('active');
    });
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    filterBooks();
}

// 검색 기능
function performSearch(searchTerm) {
    activeFilters.search = searchTerm;
    filterBooks();
    
    // URL 파라미터 업데이트 (검색 결과 공유 가능)
    if (searchTerm) {
        const url = new URL(window.location);
        url.searchParams.set('search', searchTerm);
        window.history.replaceState({}, '', url);
    } else {
        const url = new URL(window.location);
        url.searchParams.delete('search');
        window.history.replaceState({}, '', url);
    }
}

// URL 파라미터에서 검색어 로딩
function loadSearchFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');
    if (searchTerm) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = searchTerm;
            performSearch(searchTerm);
        }
    }
}

// 리뷰 데이터 관리 함수들
function getBookReviews(bookId) {
    const reviews = JSON.parse(localStorage.getItem('bookReviews') || '{}');
    return reviews[bookId] || [];
}

function addBookReview(bookId, review) {
    const reviews = JSON.parse(localStorage.getItem('bookReviews') || '{}');
    if (!reviews[bookId]) reviews[bookId] = [];
    reviews[bookId].push({
        ...review,
        id: Date.now(),
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('bookReviews', JSON.stringify(reviews));
}

// 이벤트 리스너 설정
function initializeEventListeners() {
    // 검색 기능
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            performSearch(e.target.value.trim());
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(e.target.value.trim());
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            if (searchInput) {
                performSearch(searchInput.value.trim());
            }
        });
    }
    
    // 살롱 태그 클릭
    document.querySelectorAll('.salon-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const salon = tag.getAttribute('data-salon');
            
            // 이미 선택된 살롱이면 해제
            if (activeFilters.salon === salon) {
                activeFilters.salon = null;
                tag.classList.remove('active');
            } else {
                // 다른 살롱 태그들 비활성화
                document.querySelectorAll('.salon-tag.active').forEach(t => {
                    t.classList.remove('active');
                });
                
                activeFilters.salon = salon;
                tag.classList.add('active');
            }
            
            filterBooks();
        });
    });
    
    // 주제 버튼 클릭
    document.querySelectorAll('.topic-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const topic = btn.getAttribute('data-topic');
            
            // 이미 선택된 주제면 해제
            if (activeFilters.topic === topic) {
                activeFilters.topic = null;
                btn.classList.remove('active');
            } else {
                // 다른 주제 버튼들 비활성화
                document.querySelectorAll('.topic-btn.active').forEach(b => {
                    b.classList.remove('active');
                });
                
                activeFilters.topic = topic;
                btn.classList.add('active');
            }
            
            filterBooks();
        });
    });
    
    // 전체 보기 버튼
    const clearBtn = document.getElementById('clear-filter');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
}

// 초기화 함수
async function initialize() {
    console.log('🚀 인북클럽 플랫폼 초기화 시작');
    
    try {
        // 책 데이터 로딩
        booksData = await loadBooks();
        
        if (booksData.length === 0) {
            console.log('⚠️ 로딩된 책 데이터가 없습니다.');
            const grid = document.getElementById('book-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="no-results">
                        <p>📚 책 데이터를 준비 중입니다...</p>
                        <p style="font-size: 14px; color: #999; margin-top: 10px;">
                            잠시 후 다시 시도해주세요.<br>
                            브라우저를 새로고침하면 데이터가 표시될 수 있습니다.
                        </p>
                        <button onclick="window.location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            새로고침
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        // 리뷰 데이터와 병합
        booksData = mergeReviewData(booksData);
        filteredBooks = [...booksData];
        
        // 이벤트 리스너 설정
        initializeEventListeners();
        
        // URL에서 검색어 로딩
        loadSearchFromURL();
        
        // 초기 렌더링
        renderBooks();
        
        console.log('✅ 인북클럽 플랫폼 초기화 완료');
        console.log(`📚 총 ${booksData.length}권의 책이 로딩되었습니다.`);
        
    } catch (error) {
        console.error('❌ 초기화 중 오류 발생:', error);
        const grid = document.getElementById('book-grid');
        if (grid) {
            grid.innerHTML = '<div class="no-results">오류가 발생했습니다.<br>페이지를 새로고침 해주세요.</div>';
        }
    }
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}