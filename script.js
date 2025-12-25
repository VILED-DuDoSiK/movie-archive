const OMDb_API_KEY = 'b9a5e69d';
const OMDb_BASE_URL = 'https://www.omdbapi.com';
const MOVIES_JSON_URL = 'movies.json';

let currentPage = 1;
let currentCategory = 'archive';
let searchQuery = '';
let isLoading = false;
let allMovies = [];
let filteredMovies = [];
let itemsPerPage = 24;
let currentDisplayPage = 1;

const moviesGrid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const btnArchive = document.getElementById('btnArchive');
const btnFavorites = document.getElementById('btnFavorites');
const btnResetFilters = document.getElementById('btnResetFilters');
const btnLoadMore = document.getElementById('btnLoadMore');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const resultsInfo = document.getElementById('resultsInfo');
const pagination = document.getElementById('pagination');
const itemsPerPageSelect = document.getElementById('itemsPerPage');
const progressContainer = document.getElementById('progressContainer');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');

const filterGenre = document.getElementById('filterGenre');
const filterCountry = document.getElementById('filterCountry');
const filterYearFrom = document.getElementById('filterYearFrom');
const filterYearTo = document.getElementById('filterYearTo');
const filterType = document.getElementById('filterType');
const filterRatingFrom = document.getElementById('filterRatingFrom');
const filterRatingTo = document.getElementById('filterRatingTo');
const filterSort = document.getElementById('filterSort');

async function loadMoviesFromJSON() {
  try {
    const response = await fetch(MOVIES_JSON_URL);
    const data = await response.json();
    
    if (data.movies && Array.isArray(data.movies)) {
      console.log(`Загружено ${data.movies.length} фильмов из JSON`);
      return data.movies;
    }
    
    return [];
  } catch (e) {
    console.error('Ошибка загрузки movies.json:', e);
    return null;
  }
}

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function fetchMoviesByKeywords(keywords) {
  const movies = [];
  
  for (const keyword of keywords) {
    try {
      const url = `${OMDb_BASE_URL}/?s=${encodeURIComponent(keyword)}&apikey=${OMDb_API_KEY}`;
      const response = await fetchWithTimeout(url);
      const data = await response.json();
      
      if (data && data.Search && Array.isArray(data.Search)) {
        movies.push(...data.Search);
      }
    } catch (e) {
      console.error(`Error fetching ${keyword}:`, e);
    }
  }
  
  return [...new Map(movies.map(m => [m.imdbID, m])).values()];
}

async function fetchMoviesByGenre(genre, page = 1) {
  const movies = [];
  const commonWords = ['movie', 'film', 'story', 'tale', 'chronicle'];
  
  for (const word of commonWords) {
    try {
      const url = `${OMDb_BASE_URL}/?s=${encodeURIComponent(word)}&apikey=${OMDb_API_KEY}`;
      const response = await fetchWithTimeout(url);
      const data = await response.json();
      
      if (data && data.Search && Array.isArray(data.Search)) {
        const detailsPromises = data.Search.slice(0, 10).map(movie => fetchMovieDetails(movie.imdbID));
        const detailsResults = await Promise.all(detailsPromises);
        
        const filteredByGenre = detailsResults.filter(movie => 
          movie && movie.Genre && movie.Genre.toLowerCase().includes(genre.toLowerCase())
        );
        
        movies.push(...filteredByGenre);
      }
    } catch (e) {
      console.error(`Error fetching ${genre} with ${word}:`, e);
    }
  }
  
  return movies;
}

async function fetchMovieDetails(imdbID) {
  try {
    const url = `${OMDb_BASE_URL}/?i=${imdbID}&apikey=${OMDb_API_KEY}`;
    const response = await fetchWithTimeout(url);
    return await response.json();
  } catch (e) {
    return null;
  }
}

async function fetchPopularMovies() {
  const searchKeywords = [
    'avengers', 'star', 'war', 'love', 'dark', 'action', 'drama', 'thriller', 
    'comedy', 'horror', 'breaking', 'game', 'walking', 'friends', 'office',
    'adventure', 'fantasy', 'scifi', 'crime', 'mystery', 'romance', 
    'western', 'documentary', 'animation', 'family', 'biography', 'history', 
    'music', 'sport', 'musical', 'news'
  ];
  
  const movies = await fetchMoviesByKeywords(searchKeywords);
  const detailsMovies = await Promise.all(
    movies.slice(0, 150).map(m => fetchMovieDetails(m.imdbID))
  );
  return detailsMovies.filter(m => m !== null);
}

async function fetchTopMovies() {
  const topKeywords = [
    'godfather', 'shawshank', 'inception', 'matrix', 'pulp', 'fight', 'forrest',
    'dark', 'interstellar', 'parasite', 'breaking', 'wire', 'sopranos',
    'twin', 'goodfellas', 'pianist', 'schindler', 'casablanca', 'citizen',
    'vertigo', 'psycho', 'rear', 'north', 'vertigo'
  ];
  const searchMovies = await fetchMoviesByKeywords(topKeywords);
  const detailsMovies = await Promise.all(
    searchMovies.slice(0, 150).map(m => fetchMovieDetails(m.imdbID))
  );
  return detailsMovies.filter(m => m !== null);
}

async function loadMoreMovies() {
  if (isLoading) return;
  
  btnLoadMore.disabled = true;
  btnLoadMore.textContent = 'Загрузка...';
  isLoading = true;

  try {
    const moreKeywords = ['movie', 'film', 'cinema', 'picture', 'show'];
    const newMovies = await fetchMoviesByKeywords(moreKeywords);
    
    const detailsNewMovies = await Promise.all(
      newMovies.slice(0, 50).map(m => fetchMovieDetails(m.imdbID))
    );
    
    const validMovies = detailsNewMovies.filter(m => m !== null);
    
    if (validMovies.length > 0) {
      const newIds = new Set(allMovies.map(m => m.imdbID));
      const uniqueNewMovies = validMovies.filter(m => !newIds.has(m.imdbID));
      
      allMovies = [...allMovies, ...uniqueNewMovies];
      populateFilters(allMovies);
      applyFilters();
    }
    
    btnLoadMore.textContent = 'Загрузить ещё';
    btnLoadMore.disabled = false;
  } catch (error) {
    console.error('Error loading more movies:', error);
    btnLoadMore.textContent = 'Ошибка загрузки';
    btnLoadMore.disabled = false;
  }
  
  isLoading = false;
}

function updateLoadingProgress(current, total) {
  if (searchQuery || currentCategory === 'favorites') {
    progressContainer.classList.add('hidden');
    return;
  }
  
  progressContainer.classList.remove('hidden');
  const percentage = Math.round((current / total) * 100);
  
  progressText.textContent = `Загрузка...`;
  progressPercent.textContent = `${percentage}%`;
  progressFill.style.width = `${percentage}%`;
}

function hideProgressBar() {
  progressContainer.classList.add('hidden');
}

async function searchMovies(query, page = 1) {
  const url = `${OMDb_BASE_URL}/?s=${encodeURIComponent(query)}&apikey=${OMDb_API_KEY}`;
  
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  
  if (data.Response === 'False' || !data.Search) return { Search: [] };
  
  const moviesWithDetails = await Promise.all(
    data.Search.map(async (movie) => {
      const details = await fetchMovieDetails(movie.imdbID);
      return { ...movie, ...details };
    })
  );
  
  return { Search: moviesWithDetails };
}

function getFavorites() {
  const favorites = localStorage.getItem('movieFavorites');
  return favorites ? JSON.parse(favorites) : [];
}

function saveFavorite(movie) {
  const favorites = getFavorites();
  const index = favorites.findIndex(m => m.imdbID === movie.imdbID);
  
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(movie);
  }
  
  localStorage.setItem('movieFavorites', JSON.stringify(favorites));
  return index === -1;
}

function isFavorite(imdbID) {
  return getFavorites().some(m => m.imdbID === imdbID);
}

function openInRutube(title) {
  const searchUrl = `https://rutube.ru/search/?query=${encodeURIComponent(title)}`;
  window.open(searchUrl, '_blank');
}

function extractGenres(movies) {
  const genreSet = new Set();
  movies.forEach(movie => {
    if (movie.Genre) {
      movie.Genre.split(',').forEach(g => genreSet.add(g.trim()));
    }
  });
  return Array.from(genreSet).sort();
}

function extractCountries(movies) {
  const countrySet = new Set();
  movies.forEach(movie => {
    if (movie.Country) {
      movie.Country.split(',').forEach(c => countrySet.add(c.trim()));
    }
  });
  return Array.from(countrySet).sort();
}

function extractYears(movies) {
  const yearSet = new Set();
  movies.forEach(movie => {
    if (movie.Year) {
      const year = parseInt(movie.Year);
      if (!isNaN(year)) {
        yearSet.add(year);
      }
    }
  });
  return Array.from(yearSet).sort((a, b) => b - a);
}

function populateFilters(movies) {
  const genres = extractGenres(movies);
  const countries = extractCountries(movies);
  const years = extractYears(movies);

  const currentGenre = filterGenre.value;
  const currentCountry = filterCountry.value;
  const currentYearFrom = filterYearFrom.value;
  const currentYearTo = filterYearTo.value;

  filterGenre.innerHTML = '<option value="">Все жанры</option>';
  genres.forEach(genre => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    if (genre === currentGenre) option.selected = true;
    filterGenre.appendChild(option);
  });

  filterCountry.innerHTML = '<option value="">Все страны</option>';
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    if (country === currentCountry) option.selected = true;
    filterCountry.appendChild(option);
  });

  filterYearFrom.innerHTML = '<option value="">От</option>';
  filterYearTo.innerHTML = '<option value="">До</option>';
  years.forEach(year => {
    const optFrom = document.createElement('option');
    optFrom.value = year;
    optFrom.textContent = year;
    if (year.toString() === currentYearFrom) optFrom.selected = true;
    filterYearFrom.appendChild(optFrom);

    const optTo = document.createElement('option');
    optTo.value = year;
    optTo.textContent = year;
    if (year.toString() === currentYearTo) optTo.selected = true;
    filterYearTo.appendChild(optTo);
  });
}

function applyFilters() {
  filteredMovies = [...allMovies];

  if (filterGenre.value) {
    filteredMovies = filteredMovies.filter(m => 
      m.Genre && m.Genre.includes(filterGenre.value)
    );
  }

  if (filterCountry.value) {
    filteredMovies = filteredMovies.filter(m => 
      m.Country && m.Country.includes(filterCountry.value)
    );
  }

  if (filterYearFrom.value) {
    filteredMovies = filteredMovies.filter(m => 
      m.Year && parseInt(m.Year) >= parseInt(filterYearFrom.value)
    );
  }

  if (filterYearTo.value) {
    filteredMovies = filteredMovies.filter(m => 
      m.Year && parseInt(m.Year) <= parseInt(filterYearTo.value)
    );
  }

  if (filterType.value) {
    const typeLower = filterType.value.toLowerCase();
    filteredMovies = filteredMovies.filter(m => 
      m.Type && m.Type.toLowerCase() === typeLower
    );
  }

  if (filterRatingFrom.value) {
    filteredMovies = filteredMovies.filter(m => 
      m.imdbRating && parseFloat(m.imdbRating) >= parseFloat(filterRatingFrom.value)
    );
  }

  if (filterRatingTo.value) {
    filteredMovies = filteredMovies.filter(m => 
      m.imdbRating && parseFloat(m.imdbRating) <= parseFloat(filterRatingTo.value)
    );
  }

  const sortValue = filterSort.value;
  if (sortValue === 'year-desc') {
    filteredMovies.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
  } else if (sortValue === 'year-asc') {
    filteredMovies.sort((a, b) => parseInt(a.Year) - parseInt(b.Year));
  } else if (sortValue === 'rating-desc') {
    filteredMovies.sort((a, b) => parseFloat(b.imdbRating || 0) - parseFloat(a.imdbRating || 0));
  } else if (sortValue === 'rating-asc') {
    filteredMovies.sort((a, b) => parseFloat(a.imdbRating || 0) - parseFloat(b.imdbRating || 0));
  } else if (sortValue === 'title-asc') {
    filteredMovies.sort((a, b) => a.Title.localeCompare(b.Title, 'ru'));
  } else if (sortValue === 'title-desc') {
    filteredMovies.sort((a, b) => b.Title.localeCompare(a.Title, 'ru'));
  }

  currentDisplayPage = 1;
  renderMovies();
  renderPagination();
  updateResultsInfo(filteredMovies.length);
}

function updateResultsInfo(count) {
  if (currentCategory === 'favorites') {
    resultsInfo.textContent = `Избранные фильмы: ${count}`;
  } else if (searchQuery) {
    resultsInfo.textContent = `Результаты поиска: ${count}`;
  } else {
    resultsInfo.textContent = `Найдено фильмов: ${count}`;
  }
}

function renderMovies() {
  const start = (currentDisplayPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const moviesToRender = filteredMovies.slice(start, end);
  
  moviesGrid.innerHTML = '';
  
  if (!moviesToRender || moviesToRender.length === 0) {
    moviesGrid.innerHTML = '<div class="error">Фильмы не найдены</div>';
    pagination.innerHTML = '';
    return;
  }
  
  moviesToRender.forEach((movie, index) => {
    const card = createMovieCard(movie);
    card.style.animationDelay = `${index * 0.05}s`;
    moviesGrid.appendChild(card);
  });
}

function renderPagination() {
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';
  
  html += `<button ${currentDisplayPage === 1 ? 'disabled' : ''} onclick="changePage(1)">«</button>`;
  html += `<button ${currentDisplayPage === 1 ? 'disabled' : ''} onclick="changePage(${currentDisplayPage - 1})">‹</button>`;

  const startPage = Math.max(1, currentDisplayPage - 2);
  const endPage = Math.min(totalPages, currentDisplayPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="${i === currentDisplayPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }

  html += `<button ${currentDisplayPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentDisplayPage + 1})">›</button>`;
  html += `<button ${currentDisplayPage === totalPages ? 'disabled' : ''} onclick="changePage(${totalPages})">»</button>`;

  pagination.innerHTML = html;
}

window.changePage = function(page) {
  currentDisplayPage = page;
  renderMovies();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  
  const posterPath = movie.Poster && movie.Poster !== 'N/A' 
    ? movie.Poster 
    : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect fill="%231a1a1a" width="400" height="600"/%3E%3Ctext fill="%238a857d" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Courier Prime, monospace"%3ENo Image%3C/text%3E%3C/svg%3E';
  
  const rating = movie.imdbRating && movie.imdbRating !== 'N/A' ? movie.imdbRating : '—';
  const year = movie.Year && movie.Year !== 'N/A' ? movie.Year : '—';
  const genre = movie.Genre ? movie.Genre.split(',').slice(0, 2).join(' / ') : (movie.Type === 'movie' ? 'Фильм' : movie.Type === 'series' ? 'Сериал' : movie.Type);
  const favActive = isFavorite(movie.imdbID) ? 'active' : '';

  card.innerHTML = `
    <img src="${posterPath}" alt="${movie.Title}" class="movie-poster" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%231a1a1a%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%238a857d%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22Courier Prime, monospace%22%3ENo Image%3C/text%3E%3C/svg%3E'">
    <div class="movie-info">
      <h3 class="movie-title">${movie.Title}</h3>
      <div class="movie-meta">
        <span class="movie-year">${year}</span>
        <span class="movie-rating">
          <svg class="rating-icon" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          ${rating}
        </span>
      </div>
      <div class="movie-genres">${genre}</div>
      <div class="movie-actions">
        <button class="action-btn favorite ${favActive}" data-id="${movie.imdbID}">
          ${favActive ? '★ В избранном' : '☆ В избранное'}
        </button>
        <button class="action-btn watch-rutube" data-title="${movie.Title}">
          ▶ Смотреть
        </button>
      </div>
    </div>
  `;

  card.querySelector('.favorite').addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const added = saveFavorite(movie);
    btn.classList.toggle('active');
    btn.textContent = added ? '★ В избранном' : '☆ В избранное';
  });

  card.querySelector('.watch-rutube').addEventListener('click', (e) => {
    e.stopPropagation();
    openInRutube(movie.Title);
  });

  return card;
}

async function loadMovies() {
  if (isLoading) return;
  
  isLoading = true;
  moviesGrid.innerHTML = '<div class="loading">Загрузка</div>';
  pagination.innerHTML = '';
  loadMoreContainer.style.display = 'none';
  
  if (!searchQuery && currentCategory !== 'favorites') {
    progressContainer.classList.remove('hidden');
    progressText.textContent = 'Загрузка фильмов...';
    progressPercent.textContent = '0%';
    progressFill.style.width = '0%';
  }

  try {
    let movies;
    
    if (currentCategory === 'favorites') {
      movies = getFavorites() || [];
      if (movies.length === 0) {
        moviesGrid.innerHTML = '<div class="error">Нет избранных фильмов</div>';
        isLoading = false;
        return;
      }
    } else if (searchQuery) {
      updateLoadingProgress(50, 100);
      const data = await searchMovies(searchQuery, currentPage);
      movies = data.Search || [];
      updateLoadingProgress(100, 100);
      hideProgressBar();
    } else if (currentCategory === 'archive') {
      // Пытаемся загрузить из movies.json
      updateLoadingProgress(10, 100);
      const moviesFromJSON = await loadMoviesFromJSON();
      
      if (moviesFromJSON && moviesFromJSON.length > 0) {
        updateLoadingProgress(100, 100);
        movies = moviesFromJSON;
        console.log(`Используем локальный архив: ${movies.length} фильмов`);
      } else {
        // Если JSON пуст или недоступен, загружаем из API
        updateLoadingProgress(20, 100);
        console.log('JSON не найден или пуст, загружаем из API...');
        movies = await fetchPopularMovies();
      }
      hideProgressBar();
    }

    allMovies = movies;
    populateFilters(allMovies);
    applyFilters();

    if (currentCategory !== 'favorites' && !searchQuery) {
      loadMoreContainer.style.display = 'block';
    }

  } catch (error) {
    console.error('Error:', error);
    moviesGrid.innerHTML = '<div class="error">Произошла ошибка: ' + error.message + '</div>';
    hideProgressBar();
  }
  
  isLoading = false;
}

function setActiveButton(activeBtn) {
  [btnArchive, btnFavorites].forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');
}

function resetFilters() {
  filterGenre.value = '';
  filterCountry.value = '';
  filterYearFrom.value = '';
  filterYearTo.value = '';
  filterType.value = '';
  filterRatingFrom.value = '';
  filterRatingTo.value = '';
  filterSort.value = 'default';
  applyFilters();
}

btnArchive.addEventListener('click', () => {
  currentCategory = 'archive';
  searchQuery = '';
  searchInput.value = '';
  currentPage = 1;
  setActiveButton(btnArchive);
  loadMovies();
});

btnFavorites.addEventListener('click', () => {
  currentCategory = 'favorites';
  searchQuery = '';
  searchInput.value = '';
  currentPage = 1;
  setActiveButton(btnFavorites);
  loadMovies();
});

btnResetFilters.addEventListener('click', resetFilters);
btnLoadMore.addEventListener('click', loadMoreMovies);

[filterGenre, filterCountry, filterYearFrom, filterYearTo, filterType, filterRatingFrom, filterRatingTo, filterSort].forEach(filter => {
  filter.addEventListener('change', applyFilters);
});

itemsPerPageSelect.addEventListener('change', (e) => {
  itemsPerPage = parseInt(e.target.value);
  currentDisplayPage = 1;
  renderMovies();
  renderPagination();
});

let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchQuery = e.target.value.trim();
  
  searchTimeout = setTimeout(() => {
    if (searchQuery.length > 2 || searchQuery.length === 0) {
      [btnArchive, btnFavorites].forEach(btn => btn.classList.remove('active'));
      currentPage = 1;
      loadMovies();
    }
  }, 500);
});

loadMovies();
