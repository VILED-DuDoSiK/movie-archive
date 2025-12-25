// Скрипт для генерации movies.json из OMDb API
// Запускать локально: node generate-movies.js

const OMDb_API_KEY = 'b9a5e69d';
const OMDb_BASE_URL = 'https://www.omdbapi.com';
const OUTPUT_FILE = 'movies.json';

// Ключевые слова для поиска фильмов
const SEARCH_KEYWORDS = [
  'avengers', 'star', 'war', 'love', 'dark', 'action', 'drama', 'thriller', 
  'comedy', 'horror', 'breaking', 'game', 'walking', 'friends', 'office',
  'adventure', 'fantasy', 'scifi', 'crime', 'mystery', 'romance', 
  'western', 'documentary', 'animation', 'family', 'biography', 'history',
  'music', 'sport', 'musical', 'news'
];

async function fetchWithTimeout(url, timeout = 15000) {
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
  const batchSize = 10;
  
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    console.log(`Обработка пакета ${Math.floor(i / batchSize) + 1}/${Math.ceil(keywords.length / batchSize)}...`);
    
    const results = await Promise.allSettled(
      batch.map(async (keyword) => {
        try {
          const url = `${OMDb_BASE_URL}/?s=${encodeURIComponent(keyword)}&apikey=${OMDb_API_KEY}`;
          const response = await fetchWithTimeout(url);
          const data = await response.json();
          return data.Search || [];
        } catch (e) {
          console.error(`Ошибка загрузки ${keyword}:`, e.message);
          return [];
        }
      })
    );
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        movies.push(...result.value);
      }
    });
    
    // Пауза для избежания rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Дедупликация по IMDb ID
  return [...new Map(movies.map(m => [m.imdbID, m])).values()];
}

async function fetchMovieDetails(imdbIDs) {
  const batchSize = 20;
  const allDetails = [];
  
  for (let i = 0; i < imdbIDs.length; i += batchSize) {
    const batch = imdbIDs.slice(i, i + batchSize);
    console.log(`Загрузка деталей ${i + 1}-${Math.min(i + batchSize, imdbIDs.length)}/${imdbIDs.length}...`);
    
    const results = await Promise.allSettled(
      batch.map(async (imdbID) => {
        try {
          const url = `${OMDb_BASE_URL}/?i=${imdbID}&apikey=${OMDb_API_KEY}`;
          const response = await fetchWithTimeout(url);
          return await response.json();
        } catch (e) {
          console.error(`Ошибка загрузки деталей для ${imdbID}:`, e.message);
          return null;
        }
      })
    );
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value && result.value.imdbID) {
        allDetails.push(result.value);
      }
    });
    
    // Пауза
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return allDetails;
}

async function generateMoviesDatabase() {
  console.log('Начало генерации базы фильмов...');
  console.log('Это может занять несколько минут...\n');
  
  // Этап 1: Поиск фильмов по ключевым словам
  console.log('\n=== Этап 1: Поиск фильмов ===');
  const foundMovies = await fetchMoviesByKeywords(SEARCH_KEYWORDS);
  console.log(`Найдено фильмов: ${foundMovies.length}`);
  
  // Этап 2: Загрузка деталей для фильмов
  console.log('\n=== Этап 2: Загрузка деталей ===');
  const imdbIDs = foundMovies.map(m => m.imdbID);
  const moviesWithDetails = await fetchMovieDetails(imdbIDs);
  console.log(`Загружено деталей: ${moviesWithDetails.length}`);
  
  // Этап 3: Сохранение в JSON
  console.log('\n=== Этап 3: Сохранение в файл ===');
  const output = {
    lastUpdated: new Date().toISOString(),
    totalCount: moviesWithDetails.length,
    movies: moviesWithDetails
  };
  
  const fs = require('fs');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nСохранено в ${OUTPUT_FILE}:`);
  console.log(`  - Всего фильмов: ${output.totalCount}`);
  console.log(`  - Дата обновления: ${output.lastUpdated}`);
  console.log('\nГотово!');
}

if (require.main === module) {
  generateMoviesDatabase().catch(console.error);
} else {
  console.log('Этот скрипт должен запускаться с Node.js:');
  console.log('  node generate-movies.js');
}
