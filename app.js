// Constants
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'; 
const MAX_RESULTS = 20;

// State Management
let state = {
  library: [],
  wishlist: [],
  searchResults: [], 
  currentBook: null 
};

// Load saved data from localStorage
function loadSavedData() {
  const savedLibrary = localStorage.getItem('bookshelf_library'); 
  const savedWishlist = localStorage.getItem('bookshelf_wishlist');
  
  if (savedLibrary) state.library = JSON.parse(savedLibrary);
  if (savedWishlist) state.wishlist = JSON.parse(savedWishlist);
  
  updateStats();
  renderLibrary();
  renderWishlist();
}

// Save data to localStorage
function saveData() {
  localStorage.setItem('bookshelf_library', JSON.stringify(state.library));
  localStorage.setItem('bookshelf_wishlist', JSON.stringify(state.wishlist));
}

// Search Books
async function searchBooks(query, category = 'all', sortBy = 'relevance') {
  const spinner = document.getElementById('loadingSpinner');
  spinner.classList.remove('d-none');
  
  try {
    let url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}`;
    
    if (category !== 'all') {
      url += `+subject:${category}`;
    }
    
    url += `&orderBy=${sortBy}&maxResults=${MAX_RESULTS}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    state.searchResults = data.items?.map(formatBookData) || [];
    renderSearchResults();
  } catch (error) {
    console.error('Error searching books:', error);
    showAlert('Error searching books. Please try again.', 'danger');
  } finally {
    spinner.classList.add('d-none');
  }
}

// Format book data
function formatBookData(book) {
  const volumeInfo = book.volumeInfo;
  return {
    id: book.id,
    title: volumeInfo.title,
    authors: volumeInfo.authors || ['Unknown Author'],
    description: volumeInfo.description || 'No description available',
    categories: volumeInfo.categories || ['Uncategorized'],
    pageCount: volumeInfo.pageCount,
    publishedDate: volumeInfo.publishedDate,
    thumbnail: volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover',
    previewLink: volumeInfo.previewLink
  };
}

// Render Functions
function renderSearchResults() {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = state.searchResults.map(book => createBookCard(book, 'search')).join('');
}

function renderLibrary() {
  const container = document.getElementById('libraryContainer');
  const filter = document.getElementById('libraryFilter').value;
  
  let books = state.library;
  if (filter !== 'all') {
    books = books.filter(book => book.status === filter);
  }
  
  container.innerHTML = books.map(book => createBookCard(book, 'library')).join('');
}

function renderWishlist() {
  const container = document.getElementById('wishlistContainer');
  container.innerHTML = state.wishlist.map(book => createBookCard(book, 'wishlist')).join('');
}

function createBookCard(book, type) {
  const isLibrary = type === 'library';
  const isWishlist = type === 'wishlist';
  
  return `
    <div class="col-md-3">
      <div class="card book-card h-100 shadow-sm">
        ${isLibrary ? `
          <div class="reading-status">
            <span class="badge bg-${book.status === 'completed' ? 'success' : 'primary'}">
              ${book.status === 'completed' ? 'Completed' : 'Reading'}
            </span>
          </div>
        ` : ''}
        <img src="${book.thumbnail}" class="card-img-top book-cover p-2" alt="${book.title}">
        <div class="card-body">
          <h5 class="card-title book-title">${book.title}</h5>
          <p class="card-text book-authors text-muted">${book.authors.join(', ')}</p>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <button 
              onclick="showBookDetails('${book.id}')"
              class="btn btn-outline-primary btn-sm"
            >
              Details
            </button>
            ${isLibrary || isWishlist ? `
              <button 
                onclick="removeBook('${book.id}', '${type}')"
                class="btn btn-outline-danger btn-sm"
              >
                Remove
              </button>
            ` : ''}
          </div>
          ${isLibrary && book.status === 'reading' ? `
            <div class="progress book-progress">
              <div 
                class="progress-bar" 
                role="progressbar" 
                style="width: ${book.progress || 0}%"
                aria-valuenow="${book.progress || 0}" 
                aria-valuemin="0" 
                aria-valuemax="100"
              ></div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Book Management
function showBookDetails(bookId) {
  const book = findBook(bookId);
  if (!book) return;
  
  state.currentBook = book;
  
  document.getElementById('modalBookCover').src = book.thumbnail;
  document.getElementById('modalBookTitle').textContent = book.title;
  document.getElementById('modalBookAuthors').textContent = book.authors.join(', ');
  document.getElementById('modalBookCategory').textContent = book.categories[0];
  document.getElementById('modalBookPages').textContent = `${book.pageCount || '?'} pages`;
  document.getElementById('modalBookDescription').textContent = book.description;
  
  new bootstrap.Modal(document.getElementById('bookModal')).show();
}

function findBook(bookId) {
  return state.searchResults.find(b => b.id === bookId) ||
         state.library.find(b => b.id === bookId) ||
         state.wishlist.find(b => b.id === bookId);
}

function saveToLibrary() {
  if (!state.currentBook) return;
  
  const status = document.getElementById('readingStatus').value;
  const book = { ...state.currentBook, status, progress: 0 };
  
  if (status === 'wishlist') {
    if (!state.wishlist.find(b => b.id === book.id)) {
      state.wishlist.push(book);
    }
  } else {
    if (!state.library.find(b => b.id === book.id)) {
      state.library.push(book);
    }
  }
  
  saveData();
  updateStats();
  renderLibrary();
  renderWishlist();
  
  bootstrap.Modal.getInstance(document.getElementById('bookModal')).hide();
  showAlert('Book saved successfully!', 'success');
}

function removeBook(bookId, type) {
  if (type === 'library') {
    state.library = state.library.filter(book => book.id !== bookId);
  } else if (type === 'wishlist') {
    state.wishlist = state.wishlist.filter(book => book.id !== bookId);
  }
  
  saveData();
  updateStats();
  renderLibrary();
  renderWishlist();
  
  showAlert('Book removed successfully!', 'success');
}

function updateStats() {
  document.getElementById('totalBooks').textContent = state.library.length;
  document.getElementById('readingNow').textContent = 
    state.library.filter(book => book.status === 'reading').length;
  document.getElementById('wishlist').textContent = state.wishlist.length;
}

// Utility Functions
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 3000);
}

// Event Listeners
document.getElementById('searchButton').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value;
  const category = document.getElementById('filterCategory').value;
  const sortBy = document.getElementById('sortBy').value;
  if (query.trim()) {
    searchBooks(query, category, sortBy);
  }
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('searchButton').click();
  }
});

document.getElementById('saveToLibrary').addEventListener('click', saveToLibrary);

document.getElementById('libraryFilter').addEventListener('change', renderLibrary);

// Initialize

loadSavedData();



