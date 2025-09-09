// 관리자 페이지 기능

let adminBooks = [];
let filteredAdminBooks = [];
let editingBook = null;

// 관리자용 책 데이터 로딩
async function loadBooksForAdmin() {
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
        console.error('관리자용 책 데이터 로딩 실패:', error);
        return [];
    }
}

// 관리자 패널 초기화
async function initializeAdminPanel() {
    console.log('🔧 관리자 패널 초기화 시작');
    
    try {
        await loadAdminBooks();
        initializeBookForm();
        initializeAdminSearch();
        initializeEditModal();
        
        console.log('✅ 관리자 패널 초기화 완료');
    } catch (error) {
        console.error('❌ 관리자 패널 초기화 실패:', error);
    }
}

// 관리자용 책 목록 로딩
async function loadAdminBooks() {
    console.log('📚 관리자용 책 목록 로딩...');
    
    try {
        adminBooks = await loadBooksForAdmin();
        
        // 리뷰 데이터와 병합
        adminBooks = mergeReviewData(adminBooks);
        filteredAdminBooks = [...adminBooks];
        
        console.log(`✅ ${adminBooks.length}권의 책을 로딩했습니다.`);
        renderAdminBookList();
        
    } catch (error) {
        console.error('❌ 관리자용 책 목록 로딩 실패:', error);
        showAdminLoadError();
    }
}

// 관리자 책 목록 렌더링
function renderAdminBookList(books = filteredAdminBooks) {
    const container = document.getElementById('admin-book-list');
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
            <div class="admin-book-item">
                <img src="${book.cover}.jpg" alt="${book.title}" class="admin-book-cover"
                     onerror="tryAlternativeCoverAdmin(this, '${book.cover}')">
                <div class="admin-book-info">
                    <div class="admin-book-title">${book.title}</div>
                    <div class="admin-book-author">${book.author}</div>
                    <div class="admin-book-salon">${book.salon}</div>
                    ${averageRating > 0 ? 
                        `<div class="admin-book-rating">⭐ ${averageRating.toFixed(1)} (${ratings.length}개)</div>` :
                        '<div class="admin-book-rating">리뷰 없음</div>'
                    }
                </div>
                <div class="admin-book-actions">
                    <button class="edit-btn" onclick="openEditModal('${book.id}')">수정</button>
                    <button class="delete-btn" onclick="confirmDeleteBook('${book.id}')">삭제</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = booksHtml;
}

// 책 등록 폼 초기화
function initializeBookForm() {
    const form = document.getElementById('book-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!hasAdminPermission()) {
            alert('관리자 권한이 필요합니다.');
            return;
        }
        
        await addNewBook();
    });
}

// 새 책 추가
async function addNewBook() {
    console.log('📝 새 책 등록 시작');
    
    const formData = getBookFormData();
    if (!validateBookData(formData)) return;
    
    try {
        // 새 ID 생성
        const newId = generateBookId();
        
        const newBook = {
            id: newId,
            ...formData,
            topics: parseTopics(formData.topics),
            cover: await handleCoverUpload(formData.cover, formData.title)
        };
        
        // 로컬 데이터에 추가
        adminBooks.push(newBook);
        filteredAdminBooks = [...adminBooks];
        
        // 로컬스토리지에 백업
        localStorage.setItem('booksBackup', JSON.stringify(adminBooks));
        
        console.log(`✅ 새 책 등록 완료: ${newBook.title}`);
        
        // UI 업데이트
        renderAdminBookList();
        clearBookForm();
        
        alert('책이 성공적으로 등록되었습니다!');
        
    } catch (error) {
        console.error('❌ 책 등록 실패:', error);
        alert('책 등록 중 오류가 발생했습니다.');
    }
}

// 폼 데이터 가져오기
function getBookFormData() {
    return {
        title: document.getElementById('book-title')?.value.trim() || '',
        author: document.getElementById('book-author')?.value.trim() || '',
        salon: document.getElementById('book-salon')?.value || '',
        topics: document.getElementById('book-topics')?.value.trim() || '',
        period: document.getElementById('book-period')?.value.trim() || '',
        description: document.getElementById('book-description')?.value.trim() || '',
        isbn: document.getElementById('book-isbn')?.value.trim() || '',
        price: parseInt(document.getElementById('book-price')?.value) || 0,
        year: parseInt(document.getElementById('book-year')?.value) || new Date().getFullYear(),
        link: document.getElementById('book-link')?.value.trim() || '',
        cover: document.getElementById('book-cover')?.files[0] || null
    };
}

// 책 데이터 유효성 검사
function validateBookData(data) {
    if (!data.title) {
        alert('책제목을 입력해주세요.');
        return false;
    }
    
    if (!data.author) {
        alert('저자를 입력해주세요.');
        return false;
    }
    
    if (!data.salon) {
        alert('살롱을 선택해주세요.');
        return false;
    }
    
    return true;
}

// 새 책 ID 생성
function generateBookId() {
    return `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 표지 이미지 업로드 처리
async function handleCoverUpload(coverFile, title) {
    if (!coverFile) {
        return generateCoverPath(title);
    }
    
    try {
        // 실제 파일 업로드는 서버가 없으므로 시뮬레이션
        // 실제로는 book archive 폴더에 저장되어야 함
        const fileName = `${title.replace(/[^\w\s가-힣]/g, '').trim()}.${coverFile.name.split('.').pop()}`;
        const filePath = `book archive/${fileName}`;
        
        console.log(`📷 표지 이미지 업로드 시뮬레이션: ${filePath}`);
        
        return filePath;
    } catch (error) {
        console.error('❌ 표지 업로드 실패:', error);
        return generateCoverPath(title);
    }
}

// 폼 초기화
function clearBookForm() {
    const form = document.getElementById('book-form');
    if (form) {
        form.reset();
    }
}

// 수정 모달 열기
function openEditModal(bookId) {
    const book = adminBooks.find(b => b.id === bookId);
    if (!book) {
        console.error('❌ 책을 찾을 수 없습니다:', bookId);
        return;
    }
    
    editingBook = book;
    
    // 폼에 기존 데이터 채우기
    fillEditForm(book);
    
    // 모달 표시
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.style.display = 'block';
    }
    
    console.log(`✏️ ${book.title} 수정 모달 열림`);
}

// 수정 폼에 데이터 채우기
function fillEditForm(book) {
    const fields = [
        { id: 'edit-book-title', value: book.title },
        { id: 'edit-book-author', value: book.author },
        { id: 'edit-book-salon', value: book.salon },
        { id: 'edit-book-topics', value: Array.isArray(book.topics) ? book.topics.join(', ') : book.topics },
        { id: 'edit-book-period', value: book.period },
        { id: 'edit-book-description', value: book.description },
        { id: 'edit-book-isbn', value: book.isbn },
        { id: 'edit-book-price', value: book.price },
        { id: 'edit-book-year', value: book.year },
        { id: 'edit-book-link', value: book.link }
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.value = field.value || '';
        }
    });
    
    // 현재 표지 이미지 표시
    const currentCover = document.getElementById('current-cover');
    if (currentCover) {
        currentCover.innerHTML = `
            <p>현재 표지:</p>
            <img src="${book.cover}.jpg" alt="${book.title}" 
                 onerror="tryAlternativeCoverCurrentAdmin(this, '${book.cover}')"
                 style="max-width: 100px; height: auto; border-radius: 5px;">
        `;
    }
}

// 수정 모달 이벤트 초기화
function initializeEditModal() {
    const modal = document.getElementById('edit-modal');
    const closeBtn = modal?.querySelector('.close');
    const editForm = document.getElementById('edit-book-form');
    const deleteBtn = document.getElementById('delete-book');
    
    // 모달 닫기
    if (closeBtn) {
        closeBtn.addEventListener('click', closeEditModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEditModal();
            }
        });
    }
    
    // 수정 폼 제출
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateBook();
        });
    }
    
    // 삭제 버튼
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (editingBook) {
                confirmDeleteBook(editingBook.id);
            }
        });
    }
}

// 수정 모달 닫기
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    editingBook = null;
}

// 책 정보 업데이트
async function updateBook() {
    if (!editingBook || !hasAdminPermission()) {
        alert('권한이 없습니다.');
        return;
    }
    
    console.log(`✏️ ${editingBook.title} 정보 업데이트 시작`);
    
    try {
        const formData = getEditFormData();
        if (!validateBookData(formData)) return;
        
        // 표지 이미지 처리
        let coverPath = editingBook.cover;
        if (formData.cover) {
            coverPath = await handleCoverUpload(formData.cover, formData.title);
        }
        
        // 책 정보 업데이트
        const updatedBook = {
            ...editingBook,
            ...formData,
            topics: parseTopics(formData.topics),
            cover: coverPath
        };
        
        // 배열에서 업데이트
        const index = adminBooks.findIndex(b => b.id === editingBook.id);
        if (index !== -1) {
            adminBooks[index] = updatedBook;
            filteredAdminBooks = [...adminBooks];
        }
        
        // 로컬스토리지 업데이트
        localStorage.setItem('booksBackup', JSON.stringify(adminBooks));
        
        console.log(`✅ ${updatedBook.title} 정보 업데이트 완료`);
        
        // UI 업데이트
        renderAdminBookList();
        closeEditModal();
        
        alert('책 정보가 성공적으로 수정되었습니다!');
        
    } catch (error) {
        console.error('❌ 책 정보 업데이트 실패:', error);
        alert('책 정보 수정 중 오류가 발생했습니다.');
    }
}

// 수정 폼 데이터 가져오기
function getEditFormData() {
    return {
        title: document.getElementById('edit-book-title')?.value.trim() || '',
        author: document.getElementById('edit-book-author')?.value.trim() || '',
        salon: document.getElementById('edit-book-salon')?.value || '',
        topics: document.getElementById('edit-book-topics')?.value.trim() || '',
        period: document.getElementById('edit-book-period')?.value.trim() || '',
        description: document.getElementById('edit-book-description')?.value.trim() || '',
        isbn: document.getElementById('edit-book-isbn')?.value.trim() || '',
        price: parseInt(document.getElementById('edit-book-price')?.value) || 0,
        year: parseInt(document.getElementById('edit-book-year')?.value) || new Date().getFullYear(),
        link: document.getElementById('edit-book-link')?.value.trim() || '',
        cover: document.getElementById('edit-book-cover')?.files[0] || null
    };
}

// 책 삭제 확인
function confirmDeleteBook(bookId) {
    const book = adminBooks.find(b => b.id === bookId);
    if (!book) {
        console.error('❌ 책을 찾을 수 없습니다:', bookId);
        return;
    }
    
    const confirmMessage = `"${book.title}" 책을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
    if (confirm(confirmMessage)) {
        deleteBook(bookId);
    }
}

// 책 삭제
function deleteBook(bookId) {
    if (!hasAdminPermission()) {
        alert('관리자 권한이 필요합니다.');
        return;
    }
    
    console.log(`🗑️ 책 삭제: ${bookId}`);
    
    try {
        // 배열에서 제거
        adminBooks = adminBooks.filter(book => book.id !== bookId);
        filteredAdminBooks = [...adminBooks];
        
        // 로컬스토리지 업데이트
        localStorage.setItem('booksBackup', JSON.stringify(adminBooks));
        
        // 리뷰 데이터도 삭제
        const reviews = JSON.parse(localStorage.getItem('bookReviews') || '{}');
        delete reviews[bookId];
        localStorage.setItem('bookReviews', JSON.stringify(reviews));
        
        console.log(`✅ 책 삭제 완료: ${bookId}`);
        
        // UI 업데이트
        renderAdminBookList();
        closeEditModal();
        
        alert('책이 성공적으로 삭제되었습니다.');
        
    } catch (error) {
        console.error('❌ 책 삭제 실패:', error);
        alert('책 삭제 중 오류가 발생했습니다.');
    }
}

// 관리자 검색 기능
function initializeAdminSearch() {
    const searchInput = document.getElementById('admin-search');
    if (!searchInput) return;
    
    const performSearch = (searchTerm) => {
        if (!searchTerm.trim()) {
            filteredAdminBooks = [...adminBooks];
        } else {
            const term = searchTerm.toLowerCase();
            filteredAdminBooks = adminBooks.filter(book => 
                book.title.toLowerCase().includes(term) ||
                book.author.toLowerCase().includes(term) ||
                book.salon.toLowerCase().includes(term)
            );
        }
        renderAdminBookList();
    };
    
    // 실시간 검색
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });
    
    // 엔터 키 검색
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
}

// 오류 상태 표시
function showAdminLoadError() {
    const container = document.getElementById('admin-book-list');
    if (container) {
        container.innerHTML = `
            <div class="no-results">
                책 목록을 불러올 수 없습니다.<br>
                네트워크 연결을 확인하고 다시 시도해주세요.
            </div>
        `;
    }
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const editModal = document.getElementById('edit-modal');
        if (editModal && editModal.style.display === 'block') {
            closeEditModal();
        }
    }
});

// 관리자용 대체 표지 이미지 시도 함수
function tryAlternativeCoverAdmin(imgElement, basePath) {
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
            imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTA1IiB2aWV3Qm94PSIwIDAgODAgMTA1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iMTA1IiBmaWxsPSIjZjBmMGYwIi8+Cjx0ZXh0IHg9IjQwIiB5PSI1MiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSI4Ij7su4jsmrDspJE8L3RleHQ+Cjwvc3ZnPg==';
            imgElement.onerror = null;
        }
    }
    
    tryNextExtension();
}

// 현재 표지용 대체 이미지 함수
function tryAlternativeCoverCurrentAdmin(imgElement, basePath) {
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
            // 모든 확장자 실패 시 숨기기
            imgElement.style.display = 'none';
            imgElement.onerror = null;
        }
    }
    
    tryNextExtension();
}

// 전역 함수로 노출 (HTML onclick에서 사용)
window.openEditModal = openEditModal;
window.confirmDeleteBook = confirmDeleteBook;