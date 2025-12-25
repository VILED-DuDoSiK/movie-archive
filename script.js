const OMDb_API_KEY = 'b9a5e69d';
const OMDb_BASE_URL = 'https://www.omdbapi.com';

let currentPage = 1;
let currentCategory = 'popular';
let searchQuery = '';
let isLoading = false;

const moviesGrid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const btnPopular = document.getElementById('btnPopular');
const btnTop = document.getElementById('btnTop');
const btnFavorites = document.getElementById('btnFavorites');

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
      const url = `${OMDb_BASE_URL}/?s=${keyword}&type=movie&page=1&apikey=${OMDb_API_KEY}`;
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

async function fetchMovieDetails(imdbID) {
  try {
    const url = `${OMDb_BASE_URL}/?i=${imdbID}&apikey=${OMDb_API_KEY}`;
    const response = await fetchWithTimeout(url);
    return await response.json();
  } catch (e) {
    return null;
  }
}

async function fetchMoviesWithDetails(keywords) {
  const movies = await fetchMoviesByKeywords(keywords);
  
  const moviesWithDetails = await Promise.all(
    movies.slice(0, 20).map(async (movie) => {
      const details = await fetchMovieDetails(movie.imdbID);
      return { ...movie, ...details };
    })
  );
  
  return moviesWithDetails;
}

async function fetchPopularMovies() {
  const queries = ['avengers', 'star', 'war', 'love', 'dark'];
  return await fetchMoviesWithDetails(queries);
}

async function fetchTopMovies() {
  const queries = ['godfather', 'shawshank', 'inception', 'matrix', 'pulp'];
  return await fetchMoviesWithDetails(queries);
}

async function searchMovies(query, page = 1) {
  const url = `${OMDb_BASE_URL}/?s=${encodeURIComponent(query)}&type=movie&page=${page}&apikey=${OMDb_API_KEY}`;
  
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  
  if (data.Response === 'False' || !data.Search) return { Search: [] };
  
  const moviesWithDetails = await Promise.all(
    data.Search.slice(0, 20).map(async (movie) => {
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

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  
  const posterPath = movie.Poster && movie.Poster !== 'N/A' 
    ? movie.Poster 
    : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect fill="%231a1a1a" width="400" height="600"/%3E%3Ctext fill="%238a857d" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Courier Prime, monospace"%3ENo Image%3C/text%3E%3C/svg%3E';
  
  const rating = movie.imdbRating && movie.imdbRating !== 'N/A' ? movie.imdbRating : '—';
  const year = movie.Year && movie.Year !== 'N/A' ? movie.Year : '—';
  const genre = movie.Genre ? movie.Genre.split(',').slice(0, 2).join(' / ') : (movie.Type === 'movie' ? 'Фильм' : 'Сериал');
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
      const data = await searchMovies(searchQuery, currentPage);
      movies = data.Search || [];
    } else if (currentCategory === 'popular') {
      movies = await fetchPopularMovies();
    } else if (currentCategory === 'top') {
      movies = await fetchTopMovies();
    }

    moviesGrid.innerHTML = '';
    
    if (!movies || !Array.isArray(movies) || movies.length === 0) {
      moviesGrid.innerHTML = '<div class="error">Фильмы не найдены</div>';
      isLoading = false;
      return;
    }
    
    movies.forEach((movie, index) => {
      const card = createMovieCard(movie);
      card.style.animationDelay = `${index * 0.05}s`;
      moviesGrid.appendChild(card);
    });

  } catch (error) {
    console.error('Error:', error);
    moviesGrid.innerHTML = '<div class="error">Произошла ошибка: ' + error.message + '</div>';
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

let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchQuery = e.target.value.trim();
  
  searchTimeout = setTimeout(() => {
    if (searchQuery.length > 2 || searchQuery.length === 0) {
      [btnPopular, btnTop, btnFavorites].forEach(btn => btn.classList.remove('active'));
      currentPage = 1;
      loadMovies();
    }
  }, 500);
});

loadMovies();
