const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const TMDB_API_KEY = 'e1c2d36ee8147a69c3b3c4b0949b1f8e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

let currentPage = 1;
let currentCategory = 'popular';
let searchQuery = '';
let isLoading = false;

const moviesGrid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const btnPopular = document.getElementById('btnPopular');
const btnTop = document.getElementById('btnTop');
const btnFavorites = document.getElementById('btnFavorites');

function getFavorites() {
  const favorites = localStorage.getItem('movieFavorites');
  return favorites ? JSON.parse(favorites) : [];
}

function saveFavorite(movie) {
  const favorites = getFavorites();
  const index = favorites.findIndex(m => m.id === movie.id);
  
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(movie);
  }
  
  localStorage.setItem('movieFavorites', JSON.stringify(favorites));
  return index === -1;
}

function isFavorite(movieId) {
  return getFavorites().some(m => m.id === movieId);
}

function openInRutube(title) {
  const searchUrl = `https://rutube.ru/search/?query=${encodeURIComponent(title)}`;
  window.open(searchUrl, '_blank');
}

async function fetchMovies(category = 'popular', page = 1) {
  const endpoint = category === 'popular' 
    ? '/movie/popular' 
    : '/movie/top_rated';
  
  const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=ru-RU&page=${page}`;
  const response = await fetch(CORS_PROXY + encodeURIComponent(url));
  
  if (!response.ok) throw new Error('Ошибка загрузки');
  return response.json();
}

async function searchMovies(query, page = 1) {
  const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=ru-RU&query=${encodeURIComponent(query)}&page=${page}`;
  const response = await fetch(CORS_PROXY + encodeURIComponent(url));
  
  if (!response.ok) throw new Error('Ошибка поиска');
  return response.json();
}

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  
  const posterPath = movie.poster_path 
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}` 
    : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect fill="%231a1a1a" width="400" height="600"/%3E%3Ctext fill="%238a857d" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Courier Prime, monospace"%3ENo Image%3C/text%3E%3C/svg%3E';
  
  const genres = movie.genre_ids?.slice(0, 2).map(id => {
    const genreMap = { 28: 'Боевик', 12: 'Приключения', 16: 'Анимация', 35: 'Комедия', 80: 'Криминал', 99: 'Документальный', 18: 'Драма', 10751: 'Семейный', 14: 'Фэнтези', 36: 'Исторический', 27: 'Ужасы', 10402: 'Мюзикл', 9648: 'Детектив', 10749: 'Мелодрама', 878: 'Фантастика', 10770: 'ТВ', 53: 'Триллер', 10752: 'Военный', 37: 'Вестерн' };
    return genreMap[id] || '';
  }).filter(Boolean).join(' / ') || '';

  const favActive = isFavorite(movie.id) ? 'active' : '';

  card.innerHTML = `
    <img src="${posterPath}" alt="${movie.title}" class="movie-poster" loading="lazy">
    <div class="movie-info">
      <h3 class="movie-title">${movie.title}</h3>
      <div class="movie-meta">
        <span class="movie-year">${movie.release_date?.split('-')[0] || '—'}</span>
        <span class="movie-rating">
          <svg class="rating-icon" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          ${movie.vote_average?.toFixed(1) || '—'}
        </span>
      </div>
      <div class="movie-genres">${genres}</div>
      <div class="movie-actions">
        <button class="action-btn favorite ${favActive}" data-id="${movie.id}">
          ${favActive ? '★ В избранном' : '☆ В избранное'}
        </button>
        <button class="action-btn watch-rutube" data-title="${movie.title}">
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
    openInRutube(movie.title);
  });

  return card;
}

async function loadMovies() {
  if (isLoading) return;
  
  isLoading = true;
  moviesGrid.innerHTML = '<div class="loading">Загрузка</div>';

  try {
    let data;
    
    if (currentCategory === 'favorites') {
      const favorites = getFavorites();
      if (favorites.length === 0) {
        moviesGrid.innerHTML = '<div class="error">Нет избранных фильмов</div>';
        isLoading = false;
        return;
      }
      data = { results: favorites };
    } else if (searchQuery) {
      data = await searchMovies(searchQuery, currentPage);
    } else {
      data = await fetchMovies(currentCategory === 'popular' ? 'popular' : 'top', currentPage);
    }

    moviesGrid.innerHTML = '';
    
    data.results.forEach((movie, index) => {
      const card = createMovieCard(movie);
      card.style.animationDelay = `${index * 0.05}s`;
      moviesGrid.appendChild(card);
    });

  } catch (error) {
    console.error('Error:', error);
    moviesGrid.innerHTML = '<div class="error">Произошла ошибка. Попробуйте позже.</div>';
  }
  
  isLoading = false;
}

function setActiveButton(activeBtn) {
  [btnPopular, btnTop, btnFavorites].forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');
}

btnPopular.addEventListener('click', () => {
  currentCategory = 'popular';
  searchQuery = '';
  searchInput.value = '';
  currentPage = 1;
  setActiveButton(btnPopular);
  loadMovies();
});

btnTop.addEventListener('click', () => {
  currentCategory = 'top';
  searchQuery = '';
  searchInput.value = '';
  currentPage = 1;
  setActiveButton(btnTop);
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

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  if (searchQuery.length > 2 || searchQuery.length === 0) {
    [btnPopular, btnTop, btnFavorites].forEach(btn => btn.classList.remove('active'));
    currentPage = 1;
    loadMovies();
  }
});

window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500 && !isLoading && currentCategory !== 'favorites') {
    currentPage++;
    loadMoreMovies();
  }
});

async function loadMoreMovies() {
  if (isLoading) return;
  
  isLoading = true;

  try {
    let data;
    
    if (searchQuery) {
      data = await searchMovies(searchQuery, currentPage);
    } else {
      data = await fetchMovies(currentCategory === 'popular' ? 'popular' : 'top', currentPage);
    }

    data.results.forEach((movie, index) => {
      const card = createMovieCard(movie);
      card.style.animationDelay = `${index * 0.05}s`;
      moviesGrid.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading more movies:', error);
  }
  
  isLoading = false;
}

loadMovies();
